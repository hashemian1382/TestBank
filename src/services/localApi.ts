import type {
  AppSettings,
  AttemptAnswer,
  BlueprintRule,
  BulkImportResult,
  BulkQuestionRow,
  Collection,
  ExamAttempt,
  ExamTemplate,
  ID,
  Lesson,
  Question,
  QuestionFilter,
  Referral,
  Source,
  Subject,
  Topic,
  Transaction,
  User,
} from "@/types";
import { DEFAULT_SETTINGS, DOMAINS, LESSONS, QUESTIONS, SEED_USERS, SOURCES, SUBJECTS, TOPICS } from "@/data";
import { computeResult, generateReferralCode, nowIso, sample, sleep, uid } from "@/lib/utils";
import { applyQuestionFilter, buildAnswerStateMap } from "@/lib/questionFilter";
import { ApiError, type BankApi } from "./api";
import { MOCK_LATENCY_MS, SESSION_KEY, STORAGE_KEY } from "./config";

interface StoredUser extends User {
  password: string;
}

interface DB {
  version: number;
  users: StoredUser[];
  subjects: Subject[];
  topics: Topic[];
  sources: Source[];
  questions: Question[];
  lessons: Lesson[];
  collections: Collection[];
  examTemplates: ExamTemplate[];
  attempts: ExamAttempt[];
  transactions: Transaction[];
  referrals: Referral[];
  settings: AppSettings;
  /** token -> userId */
  sessions: Record<string, ID>;
}

const seedDb = (): DB => ({
  version: 2,
  users: SEED_USERS.map((u) => ({ ...u })),
  subjects: structuredClone(SUBJECTS),
  topics: structuredClone(TOPICS),
  sources: structuredClone(SOURCES),
  questions: structuredClone(QUESTIONS),
  lessons: structuredClone(LESSONS),
  collections: [
    {
      id: "col-demo-1",
      userId: "u-demo",
      title: "سوالات سخت الگوریتم",
      description: "تست‌هایی که باید دوباره مرور کنم",
      color: "violet",
      questionIds: ["q-dsa-001", "q-dsa-005", "q-dsa-007"],
      createdAt: "2025-02-01T08:00:00.000Z",
      updatedAt: "2025-02-01T08:00:00.000Z",
    },
  ],
  examTemplates: [],
  attempts: [],
  transactions: [
    { id: "tx-1", userId: "u-demo", type: "signup-bonus", amount: 50000, description: "هدیه‌ی ثبت‌نام", createdAt: "2025-01-10T08:00:00.000Z" },
    { id: "tx-2", userId: "u-demo", type: "topup", amount: 900000, description: "افزایش اعتبار", createdAt: "2025-01-11T08:00:00.000Z" },
    { id: "tx-3", userId: "u-demo", type: "purchase", amount: -207200, description: "خرید درس ساختمان داده‌ها و طراحی الگوریتم‌ها", createdAt: "2025-01-11T08:05:00.000Z" },
    { id: "tx-4", userId: "u-demo", type: "purchase", amount: -219000, description: "خرید درس سیستم عامل", createdAt: "2025-01-11T08:06:00.000Z" },
    { id: "tx-5", userId: "u-demo", type: "referral-bonus", amount: 200000, description: "پاداش دعوت از علی رضایی", createdAt: "2025-01-20T08:00:00.000Z" },
    { id: "tx-6", userId: "u-demo", type: "purchase", amount: -242100, description: "خرید درس فیزیک (ریاضی)", createdAt: "2025-01-22T08:00:00.000Z" },
    { id: "tx-7", userId: "u-demo", type: "purchase", amount: -259000, description: "خرید درس شیمی", createdAt: "2025-01-25T08:00:00.000Z" },
    { id: "tx-8", userId: "u-demo", type: "topup", amount: 127300, description: "افزایش اعتبار", createdAt: "2025-02-01T08:00:00.000Z" },
  ],
  referrals: [{ id: "ref-1", referrerUserId: "u-demo", referredUserId: "u-ali", referredName: "علی رضایی", bonus: 200000, createdAt: "2025-01-20T08:00:00.000Z" }],
  settings: { ...DEFAULT_SETTINGS },
  sessions: {},
});

class LocalStore {
  private db: DB;
  constructor() {
    this.db = this.load();
  }
  private load(): DB {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as DB;
        if (parsed.version === 2) return parsed;
      }
    } catch {
      /* ignore */
    }
    const fresh = seedDb();
    this.persist(fresh);
    return fresh;
  }
  private persist(db = this.db) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    } catch (e) {
      console.warn("persist failed", e);
    }
  }
  get(): DB {
    return this.db;
  }
  mutate<T>(fn: (db: DB) => T): T {
    const out = fn(this.db);
    this.persist();
    return out;
  }
  reset() {
    this.db = seedDb();
    this.persist();
  }
}

const store = new LocalStore();

const publicUser = (u: StoredUser): User => {
  const { password: _pw, ...rest } = u;
  void _pw;
  return structuredClone(rest);
};

const clone = <T,>(x: T): T => structuredClone(x);

export class LocalApi implements BankApi {
  private currentToken: string | null = localStorage.getItem(SESSION_KEY);

  private async delay() {
    await sleep(MOCK_LATENCY_MS);
  }

  private requireUser(): StoredUser {
    const db = store.get();
    const uid_ = this.currentToken ? db.sessions[this.currentToken] : undefined;
    const u = uid_ ? db.users.find((x) => x.id === uid_) : undefined;
    if (!u) throw new ApiError("ابتدا وارد حساب کاربری شوید", 401);
    return u;
  }
  private requireAdmin(): StoredUser {
    const u = this.requireUser();
    if (u.role !== "admin") throw new ApiError("دسترسی غیرمجاز", 403);
    return u;
  }
  private setSession(userId: ID) {
    const token = uid("tok");
    store.mutate((db) => {
      db.sessions[token] = userId;
    });
    this.currentToken = token;
    localStorage.setItem(SESSION_KEY, token);
    return token;
  }

  /* ---------- Auth ---------- */
  async login({ email, password }: { email: string; password: string }) {
    await this.delay();
    const u = store.get().users.find((x) => x.email.toLowerCase() === email.trim().toLowerCase());
    if (!u || u.password !== password) throw new ApiError("ایمیل یا رمز عبور اشتباه است");
    const token = this.setSession(u.id);
    return { token, user: publicUser(u) };
  }

  async register(input: { fullName: string; email: string; phone?: string; password: string; referralCode?: string }) {
    await this.delay();
    const db = store.get();
    if (db.users.some((x) => x.email.toLowerCase() === input.email.trim().toLowerCase())) throw new ApiError("این ایمیل قبلاً ثبت شده است");
    if (input.password.length < 6) throw new ApiError("رمز عبور باید حداقل ۶ کاراکتر باشد");

    let referrer: StoredUser | undefined;
    if (input.referralCode?.trim()) {
      referrer = db.users.find((x) => x.referralCode.toLowerCase() === input.referralCode!.trim().toLowerCase());
      if (!referrer) throw new ApiError("کد دعوت معتبر نیست");
    }

    const user: StoredUser = {
      id: uid("u"),
      fullName: input.fullName.trim(),
      email: input.email.trim().toLowerCase(),
      phone: input.phone?.trim(),
      role: "user",
      avatarSeed: input.email,
      balance: db.settings.signupBonus,
      referralCode: generateReferralCode(input.email),
      referredByUserId: referrer?.id,
      purchasedSubjectIds: [],
      bookmarkedQuestionIds: [],
      createdAt: nowIso(),
      password: input.password,
    };

    store.mutate((d) => {
      d.users.push(user);
      if (d.settings.signupBonus > 0)
        d.transactions.push({ id: uid("tx"), userId: user.id, type: "signup-bonus", amount: d.settings.signupBonus, description: "هدیه‌ی ثبت‌نام", createdAt: nowIso() });
      if (referrer) {
        const ref = d.users.find((x) => x.id === referrer!.id)!;
        ref.balance += d.settings.referralBonus;
        d.transactions.push({
          id: uid("tx"),
          userId: ref.id,
          type: "referral-bonus",
          amount: d.settings.referralBonus,
          description: `پاداش دعوت از ${user.fullName}`,
          createdAt: nowIso(),
        });
        d.referrals.push({ id: uid("ref"), referrerUserId: ref.id, referredUserId: user.id, referredName: user.fullName, bonus: d.settings.referralBonus, createdAt: nowIso() });
      }
    });

    const token = this.setSession(user.id);
    return { token, user: publicUser(user) };
  }

  async me(token: string) {
    const db = store.get();
    const id = db.sessions[token];
    const u = db.users.find((x) => x.id === id);
    if (u) this.currentToken = token;
    return u ? publicUser(u) : null;
  }

  async logout() {
    if (this.currentToken) {
      const t = this.currentToken;
      store.mutate((db) => {
        delete db.sessions[t];
      });
    }
    this.currentToken = null;
    localStorage.removeItem(SESSION_KEY);
  }

  async updateProfile(patch: Partial<Pick<User, "fullName" | "phone">>) {
    await this.delay();
    const u = this.requireUser();
    return store.mutate((db) => {
      const x = db.users.find((y) => y.id === u.id)!;
      Object.assign(x, patch);
      return publicUser(x);
    });
  }

  /* ---------- Catalog ---------- */
  async getDomains() {
    return clone(DOMAINS);
  }
  async getSubjects() {
    return clone(store.get().subjects);
  }
  async getTopics() {
    return clone(store.get().topics);
  }
  async getSources() {
    return clone(store.get().sources);
  }
  async getLessons() {
    return clone(store.get().lessons);
  }
  async getSettings() {
    return clone(store.get().settings);
  }

  /* ---------- Questions ---------- */
  async getQuestions(filter: QuestionFilter = {}) {
    await this.delay();
    const db = store.get();
    const user = this.currentToken ? db.users.find((u) => u.id === db.sessions[this.currentToken!]) : undefined;
    const qById = (id: ID) => db.questions.find((x) => x.id === id);
    const list = applyQuestionFilter(db.questions, filter, {
      subjects: db.subjects,
      purchasedSubjectIds: user?.purchasedSubjectIds,
      bookmarkedQuestionIds: user?.bookmarkedQuestionIds,
      answerStates: user ? buildAnswerStateMap(db.attempts.filter((a) => a.userId === user.id), qById) : undefined,
    });
    return clone(list);
  }

  async getQuestion(id: ID) {
    const q = store.get().questions.find((x) => x.id === id);
    return q ? clone(q) : null;
  }

  async pickByBlueprint(rules: BlueprintRule[], ownedOnly: boolean) {
    await this.delay();
    const db = store.get();
    const user = this.requireUser();
    const picked: Question[] = [];
    const used = new Set<ID>();
    for (const rule of rules) {
      let pool = db.questions.filter((q) => q.isActive && q.subjectIds.includes(rule.subjectId) && !used.has(q.id));
      if (ownedOnly) pool = pool.filter((q) => q.subjectIds.some((s) => user.purchasedSubjectIds.includes(s)));
      if (rule.topicIds.length) pool = pool.filter((q) => q.topicIds.some((t) => rule.topicIds.includes(t)));
      if (rule.difficulties.length) pool = pool.filter((q) => rule.difficulties.includes(q.difficulty));
      const chosen = sample(pool, rule.count);
      chosen.forEach((q) => used.add(q.id));
      picked.push(...chosen);
    }
    return clone(picked);
  }

  /* ---------- Store & wallet ---------- */
  async purchaseSubject(subjectId: ID) {
    await this.delay();
    const u = this.requireUser();
    return store.mutate((db) => {
      const user = db.users.find((x) => x.id === u.id)!;
      const subject = db.subjects.find((s) => s.id === subjectId);
      if (!subject) throw new ApiError("درس یافت نشد", 404);
      if (user.purchasedSubjectIds.includes(subjectId)) throw new ApiError("این درس قبلاً خریداری شده است");
      const price = Math.round(subject.price * (1 - subject.discountPercent / 100));
      if (user.balance < price) throw new ApiError("اعتبار کیف پول کافی نیست");
      user.balance -= price;
      user.purchasedSubjectIds.push(subjectId);
      const transaction: Transaction = { id: uid("tx"), userId: user.id, type: "purchase", amount: -price, description: `خرید درس ${subject.title}`, createdAt: nowIso() };
      db.transactions.push(transaction);
      return { user: publicUser(user), transaction };
    });
  }

  async topUp(amount: number) {
    await this.delay();
    const u = this.requireUser();
    if (amount <= 0) throw new ApiError("مبلغ نامعتبر است");
    return store.mutate((db) => {
      const user = db.users.find((x) => x.id === u.id)!;
      user.balance += amount;
      const transaction: Transaction = { id: uid("tx"), userId: user.id, type: "topup", amount, description: "افزایش اعتبار (پرداخت شبیه‌سازی‌شده)", createdAt: nowIso() };
      db.transactions.push(transaction);
      return { user: publicUser(user), transaction };
    });
  }

  async getTransactions() {
    const u = this.requireUser();
    return clone(store.get().transactions.filter((t) => t.userId === u.id)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getReferrals() {
    const u = this.requireUser();
    return clone(store.get().referrals.filter((r) => r.referrerUserId === u.id));
  }

  /* ---------- Bookmarks ---------- */
  async toggleBookmark(questionId: ID) {
    const u = this.requireUser();
    return store.mutate((db) => {
      const user = db.users.find((x) => x.id === u.id)!;
      const i = user.bookmarkedQuestionIds.indexOf(questionId);
      if (i >= 0) user.bookmarkedQuestionIds.splice(i, 1);
      else user.bookmarkedQuestionIds.push(questionId);
      return publicUser(user);
    });
  }

  /* ---------- Collections ---------- */
  async getCollections() {
    const u = this.requireUser();
    return clone(store.get().collections.filter((c) => c.userId === u.id));
  }
  async createCollection(input: Pick<Collection, "title" | "description" | "color">) {
    await this.delay();
    const u = this.requireUser();
    return store.mutate((db) => {
      const c: Collection = { id: uid("col"), userId: u.id, questionIds: [], createdAt: nowIso(), updatedAt: nowIso(), ...input };
      db.collections.push(c);
      return clone(c);
    });
  }
  async updateCollection(id: ID, patch: Partial<Collection>) {
    const u = this.requireUser();
    return store.mutate((db) => {
      const c = db.collections.find((x) => x.id === id && x.userId === u.id);
      if (!c) throw new ApiError("مجموعه یافت نشد", 404);
      Object.assign(c, patch, { updatedAt: nowIso() });
      return clone(c);
    });
  }
  async deleteCollection(id: ID) {
    const u = this.requireUser();
    store.mutate((db) => {
      db.collections = db.collections.filter((c) => !(c.id === id && c.userId === u.id));
    });
  }
  async addToCollection(id: ID, questionIds: ID[]) {
    const u = this.requireUser();
    return store.mutate((db) => {
      const c = db.collections.find((x) => x.id === id && x.userId === u.id);
      if (!c) throw new ApiError("مجموعه یافت نشد", 404);
      for (const q of questionIds) if (!c.questionIds.includes(q)) c.questionIds.push(q);
      c.updatedAt = nowIso();
      return clone(c);
    });
  }
  async removeFromCollection(id: ID, questionId: ID) {
    const u = this.requireUser();
    return store.mutate((db) => {
      const c = db.collections.find((x) => x.id === id && x.userId === u.id);
      if (!c) throw new ApiError("مجموعه یافت نشد", 404);
      c.questionIds = c.questionIds.filter((q) => q !== questionId);
      c.updatedAt = nowIso();
      return clone(c);
    });
  }

  /* ---------- Exam templates ---------- */
  async getExamTemplates() {
    const u = this.requireUser();
    return clone(store.get().examTemplates.filter((e) => e.userId === u.id));
  }
  async createExamTemplate(input: Omit<ExamTemplate, "id" | "userId" | "createdAt">) {
    await this.delay();
    const u = this.requireUser();
    return store.mutate((db) => {
      const e: ExamTemplate = { ...input, id: uid("exam"), userId: u.id, createdAt: nowIso() };
      db.examTemplates.push(e);
      return clone(e);
    });
  }
  async updateExamTemplate(id: ID, patch: Partial<ExamTemplate>) {
    const u = this.requireUser();
    return store.mutate((db) => {
      const e = db.examTemplates.find((x) => x.id === id && x.userId === u.id);
      if (!e) throw new ApiError("آزمون یافت نشد", 404);
      Object.assign(e, patch);
      return clone(e);
    });
  }
  async deleteExamTemplate(id: ID) {
    const u = this.requireUser();
    store.mutate((db) => {
      db.examTemplates = db.examTemplates.filter((e) => !(e.id === id && e.userId === u.id));
    });
  }

  /* ---------- Attempts ---------- */
  async getAttempts() {
    const u = this.requireUser();
    return clone(store.get().attempts.filter((a) => a.userId === u.id)).sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  }
  async startAttempt(input: Pick<ExamAttempt, "sourceType" | "sourceId" | "title" | "questionIds" | "durationMinutes" | "negativeMarking">) {
    await this.delay();
    const u = this.requireUser();
    if (!input.questionIds.length) throw new ApiError("آزمون بدون سوال قابل شروع نیست");
    return store.mutate((db) => {
      const a: ExamAttempt = { ...input, id: uid("att"), userId: u.id, answers: {}, status: "in-progress", startedAt: nowIso(), elapsedSeconds: 0 };
      db.attempts.push(a);
      return clone(a);
    });
  }
  async saveAttemptProgress(id: ID, answers: Record<ID, AttemptAnswer>, elapsedSeconds: number) {
    const u = this.requireUser();
    return store.mutate((db) => {
      const a = db.attempts.find((x) => x.id === id && x.userId === u.id);
      if (!a) throw new ApiError("آزمون یافت نشد", 404);
      a.answers = answers;
      a.elapsedSeconds = elapsedSeconds;
      return clone(a);
    });
  }
  async finishAttempt(id: ID, answers: Record<ID, AttemptAnswer>, elapsedSeconds: number) {
    await this.delay();
    const u = this.requireUser();
    return store.mutate((db) => {
      const a = db.attempts.find((x) => x.id === id && x.userId === u.id);
      if (!a) throw new ApiError("آزمون یافت نشد", 404);
      const qs = a.questionIds.map((qid) => db.questions.find((q) => q.id === qid)).filter(Boolean) as Question[];
      a.answers = answers;
      a.elapsedSeconds = elapsedSeconds;
      a.status = "finished";
      a.finishedAt = nowIso();
      a.result = computeResult(qs, answers, a.negativeMarking);
      return clone(a);
    });
  }
  async deleteAttempt(id: ID) {
    const u = this.requireUser();
    store.mutate((db) => {
      db.attempts = db.attempts.filter((a) => !(a.id === id && a.userId === u.id));
    });
  }

  /* ---------- Admin ---------- */
  admin = {
    getUsers: async () => {
      this.requireAdmin();
      return store.get().users.map(publicUser);
    },
    updateUser: async (id: ID, patch: Partial<User>) => {
      this.requireAdmin();
      return store.mutate((db) => {
        const u = db.users.find((x) => x.id === id);
        if (!u) throw new ApiError("کاربر یافت نشد", 404);
        Object.assign(u, patch);
        return publicUser(u);
      });
    },
    updateSettings: async (patch: Partial<AppSettings>) => {
      this.requireAdmin();
      return store.mutate((db) => {
        Object.assign(db.settings, patch);
        return clone(db.settings);
      });
    },

    createSubject: async (input: Omit<Subject, "id">) => {
      this.requireAdmin();
      return store.mutate((db) => {
        const s: Subject = { ...input, id: uid("subj") };
        db.subjects.push(s);
        return clone(s);
      });
    },
    updateSubject: async (id: ID, patch: Partial<Subject>) => {
      this.requireAdmin();
      return store.mutate((db) => {
        const s = db.subjects.find((x) => x.id === id);
        if (!s) throw new ApiError("درس یافت نشد", 404);
        Object.assign(s, patch);
        return clone(s);
      });
    },
    deleteSubject: async (id: ID) => {
      this.requireAdmin();
      store.mutate((db) => {
        if (db.questions.some((q) => q.subjectIds.includes(id))) throw new ApiError("این درس دارای سوال است؛ ابتدا سوالات را منتقل یا حذف کنید");
        db.subjects = db.subjects.filter((s) => s.id !== id);
        db.topics = db.topics.filter((t) => t.subjectId !== id);
      });
    },

    createTopic: async (input: Omit<Topic, "id">) => {
      this.requireAdmin();
      return store.mutate((db) => {
        const t: Topic = { ...input, id: uid("topic") };
        db.topics.push(t);
        return clone(t);
      });
    },
    updateTopic: async (id: ID, patch: Partial<Topic>) => {
      this.requireAdmin();
      return store.mutate((db) => {
        const t = db.topics.find((x) => x.id === id);
        if (!t) throw new ApiError("مبحث یافت نشد", 404);
        Object.assign(t, patch);
        return clone(t);
      });
    },
    deleteTopic: async (id: ID) => {
      this.requireAdmin();
      store.mutate((db) => {
        db.topics = db.topics.filter((t) => t.id !== id);
        db.questions.forEach((q) => (q.topicIds = q.topicIds.filter((t) => t !== id)));
      });
    },

    createSource: async (input: Omit<Source, "id">) => {
      this.requireAdmin();
      return store.mutate((db) => {
        const s: Source = { ...input, id: uid("src") };
        db.sources.push(s);
        return clone(s);
      });
    },
    updateSource: async (id: ID, patch: Partial<Source>) => {
      this.requireAdmin();
      return store.mutate((db) => {
        const s = db.sources.find((x) => x.id === id);
        if (!s) throw new ApiError("منبع یافت نشد", 404);
        Object.assign(s, patch);
        return clone(s);
      });
    },
    deleteSource: async (id: ID) => {
      this.requireAdmin();
      store.mutate((db) => {
        if (db.questions.some((q) => q.sourceId === id)) throw new ApiError("این منبع دارای سوال است");
        db.sources = db.sources.filter((s) => s.id !== id);
      });
    },

    createQuestion: async (input: Omit<Question, "id" | "createdAt" | "updatedAt">) => {
      this.requireAdmin();
      return store.mutate((db) => {
        const qn: Question = { ...input, id: uid("q"), createdAt: nowIso(), updatedAt: nowIso() };
        db.questions.push(qn);
        return clone(qn);
      });
    },
    updateQuestion: async (id: ID, patch: Partial<Question>) => {
      this.requireAdmin();
      return store.mutate((db) => {
        const qn = db.questions.find((x) => x.id === id);
        if (!qn) throw new ApiError("سوال یافت نشد", 404);
        Object.assign(qn, patch, { updatedAt: nowIso() });
        return clone(qn);
      });
    },
    deleteQuestion: async (id: ID) => {
      this.requireAdmin();
      store.mutate((db) => {
        db.questions = db.questions.filter((q) => q.id !== id);
        db.collections.forEach((c) => (c.questionIds = c.questionIds.filter((q) => q !== id)));
        db.examTemplates.forEach((e) => (e.questionIds = e.questionIds.filter((q) => q !== id)));
      });
    },
    bulkImportQuestions: async (rows: BulkQuestionRow[]): Promise<BulkImportResult> => {
      this.requireAdmin();
      await this.delay();
      return store.mutate((db) => {
        const errors: BulkImportResult["errors"] = [];
        let imported = 0;
        const findSubject = (ref: string) => db.subjects.find((s) => s.id === ref || s.title === ref.trim());
        const findTopic = (ref: string, subjIds: ID[]) => db.topics.find((t) => (t.id === ref || t.title === ref.trim()) && (subjIds.length === 0 || subjIds.includes(t.subjectId)));
        const findSource = (ref?: string) => (ref ? db.sources.find((s) => s.id === ref || s.title === ref.trim()) : undefined);

        rows.forEach((row, i) => {
          try {
            const subjects = (row.subjects ?? []).map(findSubject);
            if (!subjects.length || subjects.some((s) => !s)) throw new Error("درس نامعتبر");
            const subjIds = subjects.map((s) => s!.id);
            const topics = (row.topics ?? []).map((t) => findTopic(t, subjIds));
            if (!topics.length || topics.some((t) => !t)) throw new Error("مبحث نامعتبر");
            if (!row.stem?.trim()) throw new Error("صورت سوال خالی است");
            if (!Array.isArray(row.options) || row.options.length !== 4) throw new Error("باید دقیقاً ۴ گزینه وجود داشته باشد");
            let correct = Number(row.correct);
            if (correct >= 1 && correct <= 4 && !(correct === 0)) correct = correct - 1; // ورودی ۱..۴
            if (!(correct >= 0 && correct <= 3)) throw new Error("گزینه‌ی صحیح نامعتبر");
            const source = findSource(row.source) ?? db.sources.find((s) => s.id === "src-talifi")!;
            const qn: Question = {
              id: uid("q"),
              subjectIds: subjIds,
              topicIds: topics.map((t) => t!.id),
              stem: row.stem,
              options: row.options as Question["options"],
              correctIndex: correct,
              explanation: row.explanation ?? "",
              difficulty: (row.difficulty ?? 2) as Question["difficulty"],
              sourceId: source.id,
              tags: row.tags ?? [],
              images: row.images ?? [],
              estimatedSeconds: row.estimatedSeconds ?? 90,
              isActive: true,
              createdAt: nowIso(),
              updatedAt: nowIso(),
            };
            db.questions.push(qn);
            imported++;
          } catch (e) {
            errors.push({ row: i + 1, message: (e as Error).message });
          }
        });
        return { imported, errors };
      });
    },

    createLesson: async (input: Omit<Lesson, "id">) => {
      this.requireAdmin();
      return store.mutate((db) => {
        const l: Lesson = { ...input, id: uid("les") };
        db.lessons.push(l);
        return clone(l);
      });
    },
    updateLesson: async (id: ID, patch: Partial<Lesson>) => {
      this.requireAdmin();
      return store.mutate((db) => {
        const l = db.lessons.find((x) => x.id === id);
        if (!l) throw new ApiError("درسنامه یافت نشد", 404);
        Object.assign(l, patch);
        return clone(l);
      });
    },
    deleteLesson: async (id: ID) => {
      this.requireAdmin();
      store.mutate((db) => {
        db.lessons = db.lessons.filter((l) => l.id !== id);
      });
    },

    resetDemoData: async () => {
      store.reset();
      this.currentToken = null;
      localStorage.removeItem(SESSION_KEY);
    },
  };
}
