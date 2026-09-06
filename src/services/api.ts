import type {
  AppSettings,
  AttemptAnswer,
  AuthSession,
  BlueprintRule,
  BulkImportResult,
  BulkQuestionRow,
  Collection,
  ExamAttempt,
  ExamDomain,
  ExamTemplate,
  ID,
  Lesson,
  LoginInput,
  Question,
  QuestionFilter,
  QuestionSaveInput,
  QuestionPatch,
  LessonInput,
  TopicMergeInput,
  TopicMergePreview,
  TopicMergeResult,
  Referral,
  RegisterInput,
  Source,
  Subject,
  Topic,
  Transaction,
  User,
} from "@/types";

/**
 * قرارداد API — تنها نقطه‌ی تماس UI با داده.
 * هر متد معادل یک endpoint در بک‌اند است (نام endpoint پیشنهادی در کامنت آمده).
 * پیاده‌سازی فعلی: LocalApi (localStorage). پیاده‌سازی آینده: HttpApi (fetch به جنگو/DRF).
 */
export interface BankApi {
  /* ---------- Auth: /auth/* ---------- */
  login(input: LoginInput): Promise<AuthSession>; // POST /auth/login
  register(input: RegisterInput): Promise<AuthSession>; // POST /auth/register
  me(token: string): Promise<User | null>; // GET /auth/me
  logout(): Promise<void>; // POST /auth/logout
  updateProfile(patch: Partial<Pick<User, "fullName" | "phone">>): Promise<User>; // PATCH /auth/me

  /* ---------- Catalog: /catalog/* ---------- */
  getDomains(): Promise<ExamDomain[]>; // GET /catalog/domains
  getSubjects(): Promise<Subject[]>; // GET /catalog/subjects
  getTopics(): Promise<Topic[]>; // GET /catalog/topics
  getSources(): Promise<Source[]>; // GET /catalog/sources
  getLessons(): Promise<Lesson[]>; // GET /catalog/lessons
  getSettings(): Promise<AppSettings>; // GET /settings

  /* ---------- Questions: /questions/* ---------- */
  getQuestions(filter?: QuestionFilter): Promise<Question[]>; // GET /questions?...
  getQuestion(id: ID): Promise<Question | null>; // GET /questions/:id
  /** انتخاب تصادفی بر اساس بلوپرینت (سرور می‌تواند بهینه انجام دهد) */
  pickByBlueprint(rules: BlueprintRule[], ownedOnly: boolean): Promise<Question[]>; // POST /questions/pick

  /* ---------- Store & wallet: /store/*, /wallet/* ---------- */
  purchaseSubject(subjectId: ID): Promise<{ user: User; transaction: Transaction }>; // POST /store/purchase
  topUp(amount: number): Promise<{ user: User; transaction: Transaction }>; // POST /wallet/topup
  getTransactions(): Promise<Transaction[]>; // GET /wallet/transactions
  getReferrals(): Promise<Referral[]>; // GET /referrals

  /* ---------- Bookmarks: /bookmarks ---------- */
  toggleBookmark(questionId: ID): Promise<User>; // POST /bookmarks/toggle

  /* ---------- Collections: /collections ---------- */
  getCollections(): Promise<Collection[]>;
  createCollection(input: Pick<Collection, "title" | "description" | "color">): Promise<Collection>;
  updateCollection(id: ID, patch: Partial<Collection>): Promise<Collection>;
  deleteCollection(id: ID): Promise<void>;
  addToCollection(id: ID, questionIds: ID[]): Promise<Collection>;
  removeFromCollection(id: ID, questionId: ID): Promise<Collection>;

  /* ---------- Exam templates: /exams ---------- */
  getExamTemplates(): Promise<ExamTemplate[]>;
  createExamTemplate(input: Omit<ExamTemplate, "id" | "userId" | "createdAt">): Promise<ExamTemplate>;
  updateExamTemplate(id: ID, patch: Partial<ExamTemplate>): Promise<ExamTemplate>;
  deleteExamTemplate(id: ID): Promise<void>;

  /* ---------- Attempts: /attempts ---------- */
  getAttempts(): Promise<ExamAttempt[]>;
  startAttempt(input: Pick<ExamAttempt, "sourceType" | "sourceId" | "title" | "questionIds" | "durationMinutes" | "negativeMarking">): Promise<ExamAttempt>;
  saveAttemptProgress(id: ID, answers: Record<ID, AttemptAnswer>, elapsedSeconds: number): Promise<ExamAttempt>;
  finishAttempt(id: ID, answers: Record<ID, AttemptAnswer>, elapsedSeconds: number): Promise<ExamAttempt>;
  deleteAttempt(id: ID): Promise<void>;

  /* ---------- Admin: /admin/* ---------- */
  admin: {
    getUsers(): Promise<User[]>;
    updateUser(id: ID, patch: Partial<User>): Promise<User>;
    updateSettings(patch: Partial<AppSettings>): Promise<AppSettings>;

    createSubject(input: Omit<Subject, "id">): Promise<Subject>;
    updateSubject(id: ID, patch: Partial<Subject>): Promise<Subject>;
    deleteSubject(id: ID): Promise<void>;

    createTopic(input: Omit<Topic, "id">): Promise<Topic>;
    updateTopic(id: ID, patch: Partial<Pick<Topic, "title" | "order">>): Promise<Topic>;
    reorderTopics(subjectId: ID, topicIds: ID[]): Promise<Topic[]>;
    previewTopicMerge(input: TopicMergeInput): Promise<TopicMergePreview>;
    mergeTopics(input: TopicMergeInput): Promise<TopicMergeResult>; // POST /admin/topics/merge (atomic)
    deleteTopic(id: ID): Promise<void>;

    createSource(input: Omit<Source, "id">): Promise<Source>;
    updateSource(id: ID, patch: Partial<Source>): Promise<Source>;
    deleteSource(id: ID): Promise<void>;

    createQuestion(input: QuestionSaveInput): Promise<Question>;
    updateQuestion(id: ID, patch: QuestionPatch): Promise<Question>;
    deleteQuestion(id: ID): Promise<void>;
    bulkImportQuestions(rows: BulkQuestionRow[]): Promise<BulkImportResult>;

    createLesson(input: LessonInput): Promise<Lesson>;
    updateLesson(id: ID, patch: Partial<LessonInput>): Promise<Lesson>;
    deleteLesson(id: ID): Promise<void>;

    resetDemoData(): Promise<void>;
  };
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status = 400
  ) {
    super(message);
    this.name = "ApiError";
  }
}
