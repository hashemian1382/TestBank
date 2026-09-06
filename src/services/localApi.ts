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
  LessonInput,
  QuestionSaveInput,
  QuestionPatch,
  TopicMergeInput,
  Question,
  QuestionFilter,
  Referral,
  Source,
  Subject,
  Topic,
  Transaction,
  User,
} from "@/types";
import { unique, catalogNameKey } from "@/lib/catalog";
import { insertLesson, validateLesson, validateQuestion, validateTopicTitle } from "./contentValidation";
import { importQuestionRows } from "./bulkImport";
import { applyTopicMerge, planTopicMerge } from "./topicOperations";
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
  version: 3,
  users: structuredClone(SEED_USERS),
  subjects: structuredClone(SUBJECTS),
  topics: structuredClone(TOPICS),
  sources: structuredClone(SOURCES),
  questions: structuredClone(QUESTIONS).map((q) => ({ ...q, lessonIds: q.lessonIds ?? [] })),
  lessons: structuredClone(LESSONS).map((l) => ({ ...l, status: l.status ?? "published", summary: l.summary ?? "", tags: l.tags ?? [], order: l.order ?? 0 })),
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

/** The storage key stays v2 deliberately: upgrading never resets an existing database. */
class LocalStore {
  private db?: DB;
  private lastSerialized?: string | null;
  private readStorage(): string | null {
    let raw: string | null;
    try { raw = localStorage.getItem(STORAGE_KEY); }
    catch { throw new ApiError("دسترسی به حافظه‌ی مرورگر ممکن نیست؛ ذخیره‌سازی را در تنظیمات مرورگر فعال کنید", 500); }
    return raw;
  }
  private load(raw: string | null): DB {
    if (raw) {
      let parsed: DB;
      try { parsed = JSON.parse(raw) as DB; }
      catch { throw new ApiError("داده‌ی محلی خوانده نشد. داده‌ها پاک نشده‌اند؛ پیش از بازیابی از آن‌ها نسخه‌ی پشتیبان بگیرید", 500); }
      if (![2, 3].includes(parsed.version) || ![parsed.questions, parsed.lessons, parsed.topics, parsed.subjects,
        parsed.sources, parsed.users, parsed.attempts, parsed.examTemplates, parsed.collections].every(Array.isArray)) {
        throw new ApiError("نسخه یا ساختار داده‌ی محلی پشتیبانی نمی‌شود. داده‌های موجود بدون تغییر باقی مانده‌اند", 500);
      }
      parsed.questions.forEach((q) => { q.lessonIds = unique(q.lessonIds ?? []); });
      parsed.lessons.forEach((l) => {
        l.status ??= "published"; l.summary ??= ""; l.tags ??= []; l.order ??= 0;
      });
      parsed.attempts.forEach((a) => {
        if (a.result && !a.resultQuestions) {
          a.resultQuestions = parsed.questions.filter((q) => a.questionIds.includes(q.id))
            .map(({ id, subjectIds, topicIds, correctIndex }) => ({ id, subjectIds: [...subjectIds], topicIds: [...topicIds], correctIndex }));
        }
      });
      parsed.version = 3;
      // Persist with the next successful mutation; a full quota must not destroy v2 data.
      this.lastSerialized = raw;
      return parsed;
    }
    const fresh = seedDb();
    this.persist(fresh);
    return fresh;
  }
  private persist(db: DB) {
    try {
      const serialized = JSON.stringify(db);
      localStorage.setItem(STORAGE_KEY, serialized);
      this.lastSerialized = serialized;
    }
    catch {
      throw new ApiError("ذخیره انجام نشد؛ فضای ذخیره‌سازی مرورگر کافی نیست یا دسترسی مسدود است. حجم تصاویر را کم کنید یا از آدرس تصویر استفاده کنید. داده‌های قبلی تغییر نکرده‌اند", 507);
    }
  }
  get(): DB {
    const raw = this.readStorage();
    // Pick up edits from other tabs instead of overwriting them with a stale in-memory copy.
    if (!this.db || raw !== this.lastSerialized) this.db = this.load(raw);
    return this.db;
  }
  mutate<T>(fn: (db: DB) => T): T {
    const draft = structuredClone(this.get());
    const result = fn(draft);
    this.persist(draft); // Commit to memory only after durable storage succeeded.
    this.db = draft;
    return structuredClone(result);
  }
  reset() {
    const fresh = seedDb();
    this.persist(fresh);
    this.db = fresh;
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
  private currentToken: string | null = (() => {
    try { return localStorage.getItem(SESSION_KEY); } catch { return null; }
  })();

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
    const db = store.get();
    const user = this.currentToken ? db.users.find((u) => u.id === db.sessions[this.currentToken!]) : undefined;
    return clone(db.lessons.filter((l) => l.status !== "draft" || user?.role === "admin"));
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
    const canonicalFilter = { ...filter, topicIds: filter.topicIds?.map((id) => db.topics.find((t) => t.id === id || t.mergedIds?.includes(id))?.id ?? id) };
    const list = applyQuestionFilter(db.questions, canonicalFilter, {
      subjects: db.subjects,
      includeInactive: filter.includeInactive === true && user?.role === "admin",
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
      a.resultQuestions = qs.map(({ id, subjectIds, topicIds, correctIndex }) => ({ id, subjectIds: [...subjectIds], topicIds: [...topicIds], correctIndex }));
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
        Object.assign(s, patch, { id });
        return clone(s);
      });
    },
    deleteSubject: async (id: ID) => {
      this.requireAdmin();
      store.mutate((db) => {
        if (db.questions.some((q) => q.subjectIds.includes(id))) throw new ApiError("این درس دارای سوال است؛ ابتدا سوالات را منتقل یا حذف کنید");
        const topicIds = new Set(db.topics.filter((t) => t.subjectId === id).map((t) => t.id));
        if (db.lessons.some((l) => topicIds.has(l.topicId)) || db.examTemplates.some((e) => e.blueprint?.some((r) => r.subjectId === id))
          || db.attempts.some((a) => a.result?.bySubject[id] || a.resultQuestions?.some((q) => q.subjectIds.includes(id)))) {
          throw new ApiError("این درس دارای درسنامه یا سابقه‌ی آزمون است؛ به‌جای حذف، آن را غیرفعال کنید");
        }
        db.subjects = db.subjects.filter((s) => s.id !== id);
        db.topics = db.topics.filter((t) => t.subjectId !== id);
      });
    },

    createTopic: async (input: Omit<Topic, "id">) => {
      this.requireAdmin();
      return store.mutate((db) => {
        const title = validateTopicTitle(db, input.subjectId, input.title);
        if (!Number.isFinite(input.order) || input.order < 0) throw new ApiError("ترتیب مبحث معتبر نیست");
        const t: Topic = { id: uid("topic"), subjectId: input.subjectId, title, order: input.order };
        db.topics.push(t);
        return clone(t);
      });
    },
    updateTopic: async (id: ID, patch: Partial<Pick<Topic, "title" | "order">>) => {
      this.requireAdmin();
      return store.mutate((db) => {
        const topic = db.topics.find((x) => x.id === id);
        if (!topic) throw new ApiError("مبحث یافت نشد", 404);
        if (patch.title !== undefined) {
          const title = validateTopicTitle(db, topic.subjectId, patch.title, [id]);
          if (catalogNameKey(topic.title) !== catalogNameKey(title)) topic.aliases = unique([...(topic.aliases ?? []), topic.title]);
          topic.title = title;
        }
        if (patch.order !== undefined) {
          if (!Number.isFinite(patch.order) || patch.order < 0) throw new ApiError("ترتیب مبحث معتبر نیست");
          topic.order = patch.order;
        }
        return clone(topic);
      });
    },
    reorderTopics: async (subjectId: ID, topicIds: ID[]) => {
      this.requireAdmin();
      return store.mutate((db) => {
        const topics = db.topics.filter((t) => t.subjectId === subjectId);
        if (topics.length !== topicIds.length || unique(topicIds).length !== topics.length || topics.some((t) => !topicIds.includes(t.id))) {
          throw new ApiError("فهرست مباحث تغییر کرده است؛ دوباره تلاش کنید");
        }
        topics.forEach((t) => { t.order = topicIds.indexOf(t.id) + 1; });
        return topics.sort((a, b) => a.order - b.order);
      });
    },
    previewTopicMerge: async (input: TopicMergeInput) => {
      this.requireAdmin();
      return clone(planTopicMerge(store.get(), input));
    },
    mergeTopics: async (input: TopicMergeInput) => {
      this.requireAdmin();
      return store.mutate((db) => applyTopicMerge(db, input));
    },
    deleteTopic: async (id: ID) => {
      this.requireAdmin();
      store.mutate((db) => {
        if (!db.topics.some((t) => t.id === id)) throw new ApiError("مبحث یافت نشد", 404);
        if (db.questions.some((q) => q.topicIds.includes(id)) || db.lessons.some((l) => l.topicId === id)
          || db.examTemplates.some((e) => e.blueprint?.some((r) => r.topicIds.includes(id)))
          || db.attempts.some((a) => a.result?.byTopic[id] || a.resultQuestions?.some((q) => q.topicIds.includes(id)))) {
          throw new ApiError("مبحثِ دارای سوال، درسنامه یا سابقه‌ی آزمون قابل حذف نیست؛ از ادغام استفاده کنید");
        }
        db.topics = db.topics.filter((t) => t.id !== id);
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
        Object.assign(s, patch, { id });
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

    createQuestion: async (input: QuestionSaveInput) => {
      this.requireAdmin();
      return store.mutate((db) => {
        if (input.newLessons !== undefined && !Array.isArray(input.newLessons)) throw new ApiError("درسنامه‌های جدید باید آرایه باشند");
        const lessons = (input.newLessons ?? []).map((l) => insertLesson(db, l));
        const valid = validateQuestion(db, { ...input, lessonIds: [...(input.lessonIds ?? []), ...lessons.map((l) => l.id)] });
        const question: Question = { ...valid, id: uid("q"), createdAt: nowIso(), updatedAt: nowIso() };
        db.questions.push(question);
        return clone(question);
      });
    },
    updateQuestion: async (id: ID, patch: QuestionPatch) => {
      this.requireAdmin();
      return store.mutate((db) => {
        const question = db.questions.find((x) => x.id === id);
        if (!question) throw new ApiError("سوال یافت نشد", 404);
        if (patch.newLessons !== undefined && !Array.isArray(patch.newLessons)) throw new ApiError("درسنامه‌های جدید باید آرایه باشند");
        const lessons = (patch.newLessons ?? []).map((l) => insertLesson(db, l));
        const valid = validateQuestion(db, { ...question, ...patch, lessonIds: [...(patch.lessonIds ?? question.lessonIds ?? []), ...lessons.map((l) => l.id)] }, question);
        Object.assign(question, valid, { updatedAt: nowIso() });
        return clone(question);
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
      return store.mutate((db) => importQuestionRows(db, rows));
    },

    createLesson: async (input: LessonInput) => {
      this.requireAdmin();
      return store.mutate((db) => insertLesson(db, input));
    },
    updateLesson: async (id: ID, patch: Partial<LessonInput>) => {
      this.requireAdmin();
      return store.mutate((db) => {
        const lesson = db.lessons.find((x) => x.id === id);
        if (!lesson) throw new ApiError("درسنامه یافت نشد", 404);
        const valid = validateLesson(db, { ...lesson, ...patch });
        const subjectId = db.topics.find((t) => t.id === valid.topicId)!.subjectId;
        if (db.questions.some((q) => q.lessonIds?.includes(id) && !q.subjectIds.includes(subjectId))) {
          throw new ApiError("این درسنامه به سوالی از درس قبلی متصل است؛ ابتدا اتصال را بردارید یا مبحثی از همان درس انتخاب کنید");
        }
        Object.assign(lesson, valid, { updatedAt: nowIso() });
        return clone(lesson);
      });
    },
    deleteLesson: async (id: ID) => {
      this.requireAdmin();
      store.mutate((db) => {
        if (!db.lessons.some((l) => l.id === id)) throw new ApiError("درسنامه یافت نشد", 404);
        db.lessons = db.lessons.filter((l) => l.id !== id);
        db.questions.forEach((q) => {
          if (q.lessonIds?.includes(id)) { q.lessonIds = q.lessonIds.filter((ref) => ref !== id); q.updatedAt = nowIso(); }
        });
      });
    },

    resetDemoData: async () => {
      this.requireAdmin();
      store.reset();
      this.currentToken = null;
      localStorage.removeItem(SESSION_KEY);
    },
  };
}
