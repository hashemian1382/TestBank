/**
 * مدل‌های دامنه (Domain Models)
 * این تایپ‌ها قرارداد بین فرانت‌اند و بک‌اند هستند.
 * نام فیلدها به‌صورت camelCase است؛ در لایه‌ی سرویس HTTP می‌توان آن‌ها را به snake_case جنگو نگاشت کرد.
 */

export type ID = string;

/** حوزه‌ی امتحانی (کنکور) */
export type ExamDomainId = "cs-msc" | "riazi" | "tajrobi" | "ensani";

export interface ExamDomain {
  id: ExamDomainId;
  title: string;
  shortTitle: string;
  description: string;
  /** کلاس رنگ tailwind مثل "indigo" */
  color: string;
  emoji: string;
}

/** درس */
export interface Subject {
  id: ID;
  title: string;
  /** یک درس می‌تواند بین چند حوزه مشترک باشد (مثل شیمی ریاضی/تجربی) */
  domainIds: ExamDomainId[];
  description: string;
  /** قیمت به تومان */
  price: number;
  /** درصد تخفیف فعال (۰ تا ۱۰۰) */
  discountPercent: number;
  emoji: string;
  isActive: boolean;
}

/** مبحث (زیرمجموعه‌ی درس) */
export interface Topic {
  id: ID;
  subjectId: ID;
  title: string;
  order: number;
  /** عنوان‌های قبلی؛ برای تشخیص ورودی‌های قدیمی پس از تغییر نام/ادغام */
  aliases?: string[];
  /** شناسه‌های ادغام‌شده؛ برای ارجاع‌های قدیمی */
  mergedIds?: ID[];
}

/** منبع سوال */
export type SourceKind = "konkur" | "azmoon" | "talifi" | "book";
export interface Source {
  id: ID;
  title: string;
  kind: SourceKind;
  year?: number;
}

/**
 * تصویر سوال/پاسخ/درسنامه
 * `src` می‌تواند URL نسبی (مثلاً "/media/q/123.png") باشد که در `resolveMediaUrl` به آدرس کامل تبدیل می‌شود،
 * یا URL مطلق / data-URI.
 * در متن‌ها با `[[img:ID]]` ارجاع داده می‌شود.
 */
export interface QuestionImage {
  id: ID;
  src: string;
  alt: string;
  caption?: string;
  /** حداکثر عرض نمایش (px) */
  width?: number;
}

export type Difficulty = 1 | 2 | 3; // آسان، متوسط، دشوار

export interface Question {
  id: ID;
  /** یک سوال می‌تواند به چند درس تعلق داشته باشد (مثلاً فیزیک ریاضی و فیزیک تجربی) */
  subjectIds: ID[];
  topicIds: ID[];
  /** اتصال مستقیم به درسنامه‌ها؛ نبودن این فیلد در داده‌های قدیمی معادل [] است. */
  lessonIds?: ID[];
  /** متن صورت سوال (پشتیبانی از LaTeX با $...$ و $$...$$ و تصویر با [[img:ID]]) */
  stem: string;
  options: [string, string, string, string];
  /** اندیس گزینه‌ی صحیح (۰ تا ۳) */
  correctIndex: number;
  /** پاسخ تشریحی */
  explanation: string;
  difficulty: Difficulty;
  sourceId: ID;
  tags: string[];
  images: QuestionImage[];
  /** زمان پیشنهادی به ثانیه */
  estimatedSeconds: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type LessonStatus = "draft" | "published";

/** درسنامه (از طریق مبحث به درس وصل است) */
export interface Lesson {
  id: ID;
  topicId: ID;
  title: string;
  content: string;
  images: QuestionImage[];
  readingMinutes: number;
  summary?: string;
  tags?: string[];
  /** درسنامه‌های قدیمی بدون این فیلد منتشرشده محسوب می‌شوند. */
  status?: LessonStatus;
  order?: number;
  createdAt?: string;
  updatedAt?: string;
}

export type LessonInput = Omit<Lesson, "id" | "createdAt" | "updatedAt">;

/* -------------------- کاربر و داده‌های کاربر -------------------- */

export type UserRole = "user" | "admin";

export interface User {
  id: ID;
  fullName: string;
  email: string;
  phone?: string;
  role: UserRole;
  avatarSeed: string;
  /** اعتبار کیف پول به تومان */
  balance: number;
  referralCode: string;
  referredByUserId?: ID;
  purchasedSubjectIds: ID[];
  bookmarkedQuestionIds: ID[];
  createdAt: string;
}

export interface Collection {
  id: ID;
  userId: ID;
  title: string;
  description: string;
  color: string;
  questionIds: ID[];
  createdAt: string;
  updatedAt: string;
}

/** قانون بلوپرینت آزمون ترکیبی: تعداد سوال از یک درس یا مبحث */
export interface BlueprintRule {
  id: ID;
  subjectId: ID;
  /** اگر خالی باشد از کل درس انتخاب می‌شود */
  topicIds: ID[];
  count: number;
  difficulties: Difficulty[];
}

export interface ExamTemplate {
  id: ID;
  userId: ID;
  title: string;
  description: string;
  questionIds: ID[];
  /** دقیقه؛ null = بدون زمان */
  durationMinutes: number | null;
  /** نمره‌ی منفی (کنکوری: هر ۳ غلط یک درست) */
  negativeMarking: boolean;
  shuffleQuestions: boolean;
  blueprint?: BlueprintRule[];
  createdAt: string;
}

export type AttemptStatus = "in-progress" | "finished";

export interface AttemptAnswer {
  questionId: ID;
  selectedIndex: number | null;
  /** ثانیه‌ای که روی این سوال صرف شده */
  timeSpent: number;
  flagged: boolean;
}

export interface AttemptResult {
  correct: number;
  wrong: number;
  blank: number;
  /** درصد کنکوری با/بدون نمره‌ی منفی */
  percent: number;
  rawPercent: number;
  bySubject: Record<ID, { correct: number; wrong: number; blank: number; percent: number }>;
  byTopic: Record<ID, { correct: number; wrong: number; blank: number; percent: number }>;
}

export interface ExamAttempt {
  id: ID;
  userId: ID;
  /** آزمون از روی قالب یا مجموعه ساخته شده */
  sourceType: "template" | "collection" | "quick";
  sourceId?: ID;
  title: string;
  questionIds: ID[];
  answers: Record<ID, AttemptAnswer>;
  durationMinutes: number | null;
  negativeMarking: boolean;
  status: AttemptStatus;
  startedAt: string;
  finishedAt?: string;
  elapsedSeconds: number;
  result?: AttemptResult;
  /** تصویر سبک از دسته‌بندی و پاسخ صحیح هنگام اتمام؛ برای بازطبقه‌بندی بدون تغییر نمره. */
  resultQuestions?: Pick<Question, "id" | "subjectIds" | "topicIds" | "correctIndex">[];
}

export type TransactionType = "purchase" | "referral-bonus" | "topup" | "signup-bonus";

export interface Transaction {
  id: ID;
  userId: ID;
  type: TransactionType;
  /** مثبت = واریز، منفی = برداشت */
  amount: number;
  description: string;
  createdAt: string;
}

export interface Referral {
  id: ID;
  referrerUserId: ID;
  referredUserId: ID;
  referredName: string;
  bonus: number;
  createdAt: string;
}

/** تنظیمات سراسری قابل تغییر توسط ادمین */
export interface AppSettings {
  referralBonus: number;
  signupBonus: number;
  currencyLabel: string;
}

/* -------------------- فیلتر سوالات -------------------- */

export interface QuestionFilter {
  search?: string;
  /** فقط مدیر: سوالات غیرفعال هم برگردانده شوند. */
  includeInactive?: boolean;
  domainIds?: ExamDomainId[];
  subjectIds?: ID[];
  topicIds?: ID[];
  sourceIds?: ID[];
  difficulties?: Difficulty[];
  tags?: string[];
  hasImage?: boolean;
  bookmarkedOnly?: boolean;
  /** فقط سوالات درس‌های خریداری شده */
  ownedOnly?: boolean;
  /** وضعیت پاسخ کاربر در آزمون‌های قبلی */
  answerState?: "any" | "correct" | "wrong" | "blank" | "unseen";
  sort?: "newest" | "oldest" | "difficulty-asc" | "difficulty-desc";
}

/* -------------------- ورودی‌های API -------------------- */

export interface RegisterInput {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
  referralCode?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthSession {
  token: string;
  user: User;
}

export type QuestionInput = Omit<Question, "id" | "createdAt" | "updatedAt">;
/** درسنامه‌های جدید و سوال در یک تراکنش ذخیره می‌شوند. */
export type QuestionSaveInput = QuestionInput & { newLessons?: LessonInput[] };
export type QuestionPatch = Partial<QuestionInput> & { newLessons?: LessonInput[] };

/** عنوان بدون scope روی همه‌ی درس‌های سوال اعمال می‌شود؛ شیء برای scope صریح است. */
export type BulkTopicRef = string | { subject: string; title: string };

export interface TopicMergeInput {
  subjectId: ID;
  topicIds: ID[];
  title: string;
  /** در صورت تعیین باید یکی از مباحث انتخابی باشد؛ در غیر این صورت خودکار انتخاب می‌شود. */
  targetTopicId?: ID;
}

export interface TopicMergePreview {
  targetTopic: Topic;
  sourceTopics: Topic[];
  affectedQuestions: number;
  affectedLessons: number;
  affectedTemplates: number;
  affectedAttempts: number;
}

export interface TopicMergeResult extends TopicMergePreview {
  removedTopicIds: ID[];
}

/** فرمت ورود گروهی سوالات (JSON) */
export interface BulkQuestionRow {
  subjects: string[]; // شناسه یا عنوان درس
  topics: BulkTopicRef[]; // شناسه، عنوان یا { subject, title }
  stem: string;
  options: string[];
  correct: number; // ۱ تا ۴؛ برای ورودی صفرمبنا correctBase را صریح تعیین کنید.
  correctBase?: 0 | 1;
  explanation?: string;
  difficulty?: Difficulty;
  source?: string; // شناسه یا عنوان منبع
  tags?: string[];
  images?: QuestionImage[];
  estimatedSeconds?: number;
  lessonIds?: ID[];
  isActive?: boolean;
}

export interface BulkImportResult {
  imported: number;
  createdTopics: Topic[];
  errors: { row: number; message: string }[];
}
