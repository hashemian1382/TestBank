import { beforeEach, describe, expect, it, vi } from "vitest";
import sampleRows from "../examples/bulk-questions.json";
import type { BankApi } from "@/services/api";
import type { AttemptAnswer, BulkQuestionRow, LessonInput, QuestionInput } from "@/types";

vi.mock("@/services/config", async (original) => ({ ...await original<object>(), MOCK_LATENCY_MS: 0 }));

class MemoryStorage implements Storage {
  private items = new Map<string, string>();
  get length() { return this.items.size; }
  key(index: number) { return [...this.items.keys()][index] ?? null; }
  getItem(key: string) { return this.items.get(key) ?? null; }
  setItem(key: string, value: string) { this.items.set(key, String(value)); }
  removeItem(key: string) { this.items.delete(key); }
  clear() { this.items.clear(); }
}
let api: BankApi;
let storage: MemoryStorage;
const key = "testbank.db.v2";
const raw = () => JSON.parse(storage.getItem(key)!);
const reload = async () => { vi.resetModules(); const { LocalApi } = await import("@/services/localApi"); return new LocalApi(); };
const lessonInput = (patch: Partial<LessonInput> = {}): LessonInput => ({
  topicId: "cs-os-t1", title: "درسنامه‌ی آزمایشی", content: "## مفهوم\nمتن آموزشی با $x^2$\n\n## مثال\nمثال کامل", images: [], readingMinutes: 4, status: "published", ...patch,
});
const questionInput = (patch: Partial<QuestionInput> = {}): QuestionInput => ({
  subjectIds: ["cs-os"], topicIds: ["cs-os-t1"], stem: "صورت سوال آزمایشی", options: ["الف", "ب", "ج", "د"], correctIndex: 0,
  explanation: "پاسخ تشریحی", difficulty: 2, sourceId: "src-talifi", tags: [], images: [], estimatedSeconds: 90, isActive: true, ...patch,
});
const row = (patch: Partial<BulkQuestionRow> = {}): BulkQuestionRow => ({
  subjects: ["cs-os"], topics: ["مبحث جدید آزمایشی"], stem: "صورت سوال ورود گروهی", options: ["الف", "ب", "ج", "د"], correct: 1, ...patch,
});

beforeEach(async () => {
  storage = new MemoryStorage(); vi.stubGlobal("localStorage", storage);
  api = await reload();
  await api.login({ email: "admin@testbank.ir", password: "123456" });
});

describe("lesson authoring and direct question links", () => {
  it("creates, edits, publishes and retains full rich content through reload", async () => {
    const created = await api.admin.createLesson(lessonInput({ status: "draft", summary: "هدف", tags: ["تست"], order: 4 }));
    expect(created.id).toBeTruthy(); expect(created.createdAt).toBeTruthy();
    const updated = await api.admin.updateLesson(created.id, { title: "عنوان ویرایش‌شده", status: "published" });
    expect(updated.createdAt).toBe(created.createdAt);
    api = await reload();
    expect((await api.getLessons()).find((l) => l.id === created.id)).toEqual(updated);
  });
  it("allows empty drafts, not empty published lessons", async () => {
    const draft = await api.admin.createLesson(lessonInput({ content: "", status: "draft" }));
    await expect(api.admin.updateLesson(draft.id, { status: "published" })).rejects.toThrow("محتوا");
    expect((await api.getLessons()).find((l) => l.id === draft.id)?.status).toBe("draft");
  });
  it("hides drafts from normal users and anonymous catalog reads", async () => {
    const draft = await api.admin.createLesson(lessonInput({ status: "draft" }));
    const published = await api.admin.createLesson(lessonInput());
    await api.logout();
    expect((await api.getLessons()).map((l) => l.id)).not.toContain(draft.id);
    await api.login({ email: "demo@testbank.ir", password: "123456" });
    expect((await api.getLessons()).map((l) => l.id)).toContain(published.id);
    expect((await api.getLessons()).map((l) => l.id)).not.toContain(draft.id);
    await expect(api.admin.createLesson(lessonInput())).rejects.toMatchObject({ status: 403 });
  });
  it("atomically adds several existing/new lessons to a new question", async () => {
    const existing = await api.admin.createLesson(lessonInput());
    const q = await api.admin.createQuestion({ ...questionInput({ lessonIds: [existing.id, existing.id] }), newLessons: [lessonInput({ title: "جدید ۱" }), lessonInput({ title: "جدید ۲" })] });
    expect(q.lessonIds).toHaveLength(3);
    expect(q.lessonIds?.[0]).toBe(existing.id);
    const lessons = await api.getLessons();
    expect(q.lessonIds?.every((id) => lessons.some((l) => l.id === id))).toBe(true);
    expect(raw().questions.find((v: { id: string }) => v.id === q.id)).not.toHaveProperty("newLessons");
    api = await reload(); expect((await api.getQuestion(q.id))?.lessonIds).toEqual(q.lessonIds);
  });
  it("attaches new/existing lessons on edit, preserves ids, removes only the link", async () => {
    const q = await api.admin.createQuestion(questionInput());
    const linked = await api.admin.updateQuestion(q.id, { newLessons: [lessonInput()] });
    expect(linked.id).toBe(q.id); expect(linked.createdAt).toBe(q.createdAt);
    expect(linked.lessonIds).toHaveLength(1);
    await api.admin.updateQuestion(q.id, { lessonIds: [] });
    expect((await api.getLessons()).some((l) => l.id === linked.lessonIds![0])).toBe(true);
  });
  it("rolls back both question and pending lessons on invalid data", async () => {
    const before = storage.getItem(key);
    await expect(api.admin.createQuestion({ ...questionInput({ options: ["", "ب", "ج", "د"] }), newLessons: [lessonInput()] })).rejects.toThrow();
    expect(storage.getItem(key)).toBe(before);
    expect((await api.getLessons()).some((l) => l.title === "درسنامه‌ی آزمایشی")).toBe(false);
    const q = await api.admin.createQuestion(questionInput());
    const nextBefore = storage.getItem(key);
    await expect(api.admin.updateQuestion(q.id, { newLessons: [lessonInput(), lessonInput({ topicId: "missing" })] })).rejects.toThrow();
    expect(storage.getItem(key)).toBe(nextBefore);
  });
  it("rejects missing/cross-subject lessons and incompatible lesson moves", async () => {
    const foreign = await api.admin.createLesson(lessonInput({ topicId: "cs-dsa-t1" }));
    await expect(api.admin.createQuestion(questionInput({ lessonIds: [foreign.id] }))).rejects.toThrow("درسنامه");
    await expect(api.admin.createQuestion(questionInput({ lessonIds: ["missing"] }))).rejects.toThrow("درسنامه");
    const lesson = await api.admin.createLesson(lessonInput());
    const q = await api.admin.createQuestion(questionInput({ lessonIds: [lesson.id] }));
    await expect(api.admin.updateLesson(lesson.id, { topicId: "cs-dsa-t1" })).rejects.toThrow("متصل");
    await api.admin.updateQuestion(q.id, { subjectIds: ["cs-os", "cs-dsa"] });
    await expect(api.admin.updateLesson(lesson.id, { topicId: "cs-dsa-t1" })).resolves.toHaveProperty("topicId", "cs-dsa-t1");
  });
  it("deleting a lesson unlinks all questions, including inactive ones, without deleting them", async () => {
    const lesson = await api.admin.createLesson(lessonInput());
    const active = await api.admin.createQuestion(questionInput({ lessonIds: [lesson.id] }));
    const inactive = await api.admin.createQuestion(questionInput({ lessonIds: [lesson.id], isActive: false }));
    await api.admin.deleteLesson(lesson.id);
    for (const id of [active.id, inactive.id]) expect((await api.getQuestion(id))?.lessonIds).toEqual([]);
    expect((await api.getLessons()).some((l) => l.id === lesson.id)).toBe(false);
  });
  it.each([
    { title: " " }, { topicId: "missing" }, { readingMinutes: 0 }, { readingMinutes: 1.5 }, { order: -1 },
    { images: [{ id: "a", src: "javascript:alert(1)", alt: "" }] },
    { images: [{ id: "a", src: "data:text/html,bad", alt: "" }] },
    { content: "[[img:missing]]" },
    { images: [{ id: "a", src: "/a.png", alt: "" }, { id: "a", src: "/b.png", alt: "" }] },
  ])("validates lesson input and leaves storage unchanged: %j", async (patch) => {
    const before = storage.getItem(key);
    await expect(api.admin.createLesson(lessonInput(patch))).rejects.toThrow();
    expect(storage.getItem(key)).toBe(before);
  });
  it("stores image captions, widths and formula/table content without losing formatting", async () => {
    const input = lessonInput({ content: "## تصویر\n[[img:example]]\n\n$$\\frac{a}{b}$$\n\n| A | B |\n|---|---|\n| یک | دو |", images: [{ id: "example", src: "data:image/png;base64,abc", alt: "شکل", caption: "شرح شکل", width: 640 }] });
    const created = await api.admin.createLesson(input);
    expect(created.content).toBe(input.content); expect(created.images).toEqual(input.images);
  });
});

describe("bulk import: auto topics and transactional per-row validation", () => {
  it("creates once per normalized Persian title and gives increasing order", async () => {
    const order = Math.max(...(await api.getTopics()).filter((t) => t.subjectId === "cs-os").map((t) => t.order));
    const result = await api.admin.bulkImportQuestions([row({ topics: ["  يادگيري‌ كلي  "] }), row({ topics: ["یادگیری کلی", "یادگیری کلی"] }), row({ topics: ["عنوان دیگر"] })]);
    expect(result.imported).toBe(3); expect(result.errors).toEqual([]); expect(result.createdTopics).toHaveLength(2);
    expect(result.createdTopics.map((t) => t.order)).toEqual([order + 1, order + 2]);
    expect(raw().questions.slice(-3).map((q: { topicIds: string[] }) => q.topicIds.length)).toEqual([1, 1, 1]);
  });
  it("reuses existing topic names/ids and normalizes subject names", async () => {
    const topic = (await api.getTopics()).find((t) => t.subjectId === "cs-os")!;
    const result = await api.admin.bulkImportQuestions([row({ subjects: ["سيستم عامل"], topics: [topic.title] }), row({ topics: [topic.id] })]);
    expect(result.imported).toBe(2); expect(result.createdTopics).toHaveLength(0);
  });
  it("creates unscoped names in every selected subject; scoped refs affect one subject only", async () => {
    const result = await api.admin.bulkImportQuestions([
      row({ subjects: ["cs-os", "cs-dsa"], topics: ["مبحث مشترک"] }),
      row({ subjects: ["cs-os", "cs-dsa"], topics: [{ subject: "cs-os", title: "فقط سیستم عامل" }, "cs-dsa-t1"] }),
    ]);
    expect(result.imported).toBe(2); expect(result.createdTopics).toHaveLength(3);
    expect(raw().questions.slice(-2).map((q: { topicIds: string[] }) => q.topicIds.length)).toEqual([2, 2]);
    expect(result.createdTopics.filter((t) => t.title === "فقط سیستم عامل").map((t) => t.subjectId)).toEqual(["cs-os"]);
  });
  it("does not leave auto-created topics from failed rows; errors are 1-based", async () => {
    const result = await api.admin.bulkImportQuestions([
      row({ topics: ["یتیم نشود"], options: ["bad"] }),
      row({ topics: ["مبحث درست"] }),
      row({ topics: ["این هم یتیم نشود"], source: "missing" }),
    ]);
    expect(result.imported).toBe(1); expect(result.errors.map((e) => e.row)).toEqual([1, 3]);
    expect(result.createdTopics.map((t) => t.title)).toEqual(["مبحث درست"]);
    expect((await api.getTopics()).some((t) => t.title.includes("یتیم"))).toBe(false);
  });
  it.each([
    null, [], { topics: [] }, { topics: [""] }, { topics: ["cs-dsa-t1"] }, { subjects: ["درس ناموجود"] },
    { topics: [17] }, { topics: [{ subject: "cs-dsa", title: "bad" }] }, { options: ["", "a", "b", "c"] },
    { correct: 1.5 }, { correct: 5 }, { correct: true }, { difficulty: 4 }, { tags: "bad" },
    { estimatedSeconds: -4 }, { correctBase: 2 }, { images: "bad" }, { lessonIds: ["missing"] },
  ])("reports malformed rows without crashing or creating orphan topics: %j", async (patch) => {
    const input = patch === null || Array.isArray(patch) ? patch : { ...row(), ...patch };
    const beforeTopics = await api.getTopics();
    const result = await api.admin.bulkImportQuestions([input as BulkQuestionRow]);
    expect(result.imported).toBe(0); expect(result.errors).toHaveLength(1); expect(result.createdTopics).toEqual([]);
    expect(await api.getTopics()).toEqual(beforeTopics);
  });
  it("honors explicit answer bases, preserving legacy bare zero", async () => {
    await api.admin.bulkImportQuestions([row({ correct: 1 }), row({ correct: 4 }), row({ correct: 0, correctBase: 0 }), row({ correct: 1, correctBase: 0 }), row({ correct: 3, correctBase: 0 }), row({ correct: 0 })]);
    expect(raw().questions.slice(-6).map((q: { correctIndex: number }) => q.correctIndex)).toEqual([0, 3, 0, 1, 3, 0]);
  });
  it("round-trips direct lesson ids and inactive state through bulk JSON", async () => {
    const lesson = await api.admin.createLesson(lessonInput());
    const result = await api.admin.bulkImportQuestions([row({ lessonIds: [lesson.id], isActive: false })]);
    expect(result.imported).toBe(1);
    const last = raw().questions.at(-1); expect(last.lessonIds).toEqual([lesson.id]); expect(last.isActive).toBe(false);
    expect((await api.getQuestions({ includeInactive: true })).some((q) => q.id === last.id)).toBe(true);
    expect((await api.getQuestions()).some((q) => q.id === last.id)).toBe(false);
  });
});

describe("topic rename, merge and ordering across all data", () => {
  const create = async (title: string, subjectId = "cs-os") => api.admin.createTopic({ title, subjectId, order: 100 });
  it("renames without changing ids, reuses the old name in subsequent import, blocks collisions", async () => {
    const t = await create("عنوان قدیم");
    const q = await api.admin.createQuestion(questionInput({ topicIds: [t.id] }));
    const renamed = await api.admin.updateTopic(t.id, { title: "عنوان جدید" });
    expect(renamed.id).toBe(t.id); expect(renamed.aliases).toContain("عنوان قدیم");
    expect((await api.getQuestion(q.id))?.topicIds).toEqual([t.id]);
    const imported = await api.admin.bulkImportQuestions([row({ topics: ["عنوان قدیم"] })]);
    expect(imported.createdTopics).toEqual([]); expect(raw().questions.at(-1).topicIds).toEqual([t.id]);
    await expect(create("عنوان قدیم")).rejects.toThrow("ادغام");
    const second = await create("متفاوت");
    await expect(api.admin.updateTopic(second.id, { title: "عنوان جدید" })).rejects.toThrow("ادغام");
    await expect(api.admin.updateTopic(second.id, { title: " " })).rejects.toThrow();
  });
  it("merges questions, lessons, templates and all users' exam buckets without double counting or score changes", async () => {
    const a = await create("ترجمه"); const b = await create("تعریب"); const c = await create("معنی");
    const other = await create("مستقل");
    const lesson = await api.admin.createLesson(lessonInput({ topicId: c.id }));
    const both = await api.admin.createQuestion(questionInput({ topicIds: [a.id, b.id, other.id], lessonIds: [lesson.id] }));
    const q2 = await api.admin.createQuestion(questionInput({ topicIds: [c.id], correctIndex: 1, isActive: false }));
    await api.login({ email: "demo@testbank.ir", password: "123456" });
    const template = await api.createExamTemplate({ title: "قالب", description: "", questionIds: [both.id, q2.id], durationMinutes: 10, negativeMarking: true, shuffleQuestions: false,
      blueprint: [{ id: "rule", subjectId: "cs-os", topicIds: [a.id, b.id, c.id, other.id], count: 2, difficulties: [1, 2, 3] }] });
    const collection = await api.createCollection({ title: "مجموعه", description: "", color: "violet" });
    await api.addToCollection(collection.id, [both.id]); await api.toggleBookmark(both.id);
    const attempt = await api.startAttempt({ sourceType: "template", sourceId: template.id, title: "آزمون", questionIds: [both.id, q2.id], durationMinutes: 10, negativeMarking: true });
    const answers: Record<string, AttemptAnswer> = {
      [both.id]: { questionId: both.id, selectedIndex: 0, timeSpent: 10, flagged: true },
      [q2.id]: { questionId: q2.id, selectedIndex: 0, timeSpent: 20, flagged: false },
    };
    const finished = await api.finishAttempt(attempt.id, answers, 30);
    await api.startAttempt({ sourceType: "quick", title: "در جریان", questionIds: [both.id], durationMinutes: null, negativeMarking: false });
    await api.login({ email: "admin@testbank.ir", password: "123456" });
    // A later answer-key edit must not change historical grades during a taxonomy merge.
    await api.admin.updateQuestion(both.id, { correctIndex: 3 });
    const input = { subjectId: "cs-os", topicIds: [a.id, b.id, c.id], title: "ترجمه و تعریب و معنا", targetTopicId: b.id };
    const preview = await api.admin.previewTopicMerge(input);
    expect(preview).toMatchObject({ affectedQuestions: 2, affectedLessons: 1, affectedTemplates: 1, affectedAttempts: 2 });
    const snapshotBeforePreview = storage.getItem(key);
    await api.admin.previewTopicMerge(input); expect(storage.getItem(key)).toBe(snapshotBeforePreview);
    const merged = await api.admin.mergeTopics(input);
    expect(merged.targetTopic.id).toBe(b.id);
    expect(merged.removedTopicIds).toEqual(expect.arrayContaining([a.id, c.id]));
    expect((await api.getQuestion(both.id))?.topicIds).toEqual([b.id, other.id]);
    expect((await api.getQuestion(q2.id))?.topicIds).toEqual([b.id]);
    expect((await api.getQuestion(both.id))?.lessonIds).toEqual([lesson.id]);
    expect((await api.getLessons()).find((l) => l.id === lesson.id)?.topicId).toBe(b.id);
    const db = raw(); const final = db.attempts.find((v: { id: string }) => v.id === finished.id);
    expect(final.answers).toEqual(finished.answers); expect(final.elapsedSeconds).toBe(30); expect(final.questionIds).toEqual(finished.questionIds);
    expect(final.result).toMatchObject({ correct: finished.result!.correct, wrong: finished.result!.wrong, percent: finished.result!.percent, bySubject: finished.result!.bySubject });
    expect(final.result.byTopic[b.id]).toEqual({ correct: 1, wrong: 1, blank: 0, percent: 33.33 });
    expect(final.result.byTopic[a.id]).toBeUndefined(); expect(final.result.byTopic[c.id]).toBeUndefined();
    expect(final.result.byTopic[other.id]).toEqual(finished.result!.byTopic[other.id]);
    expect(db.examTemplates.find((v: { id: string }) => v.id === template.id).blueprint[0].topicIds).toEqual([b.id, other.id]);
    expect(db.collections.find((v: { id: string }) => v.id === collection.id).questionIds).toEqual([both.id]);
    expect(db.users.find((u: { id: string }) => u.id === "u-demo").bookmarkedQuestionIds).toContain(both.id);
    api = await reload(); expect((await api.getQuestion(both.id))?.topicIds).toEqual([b.id, other.id]);
    const oldImport = await api.admin.bulkImportQuestions([row({ topics: [a.id, "معنی", "ترجمه"] })]);
    expect(oldImport.createdTopics).toEqual([]); expect(oldImport.imported).toBe(1); expect(raw().questions.at(-1).topicIds).toEqual([b.id]);
  });
  it("preserves chained merge aliases and can use an existing selected name as destination", async () => {
    const a = await create("نام اول"); const b = await create("نام دوم"); const c = await create("نام سوم");
    await api.admin.mergeTopics({ subjectId: "cs-os", topicIds: [a.id, b.id], title: b.title });
    const merged = await api.admin.mergeTopics({ subjectId: "cs-os", topicIds: [b.id, c.id], title: c.title });
    expect(merged.targetTopic.id).toBe(c.id);
    expect(merged.targetTopic.mergedIds).toEqual(expect.arrayContaining([a.id, b.id]));
    const result = await api.admin.bulkImportQuestions([row({ topics: [a.id, "نام اول", b.id] })]);
    expect(result.createdTopics).toEqual([]); expect(raw().questions.at(-1).topicIds).toEqual([c.id]);
  });
  it("rejects cross-subject/missing/single topics and unselected destination collisions atomically", async () => {
    const a = await create("اول"); const b = await create("دوم"); const external = await create("مقصد بیرونی"); const foreign = await create("بیگانه", "cs-dsa");
    for (const topicIds of [[a.id], [a.id, a.id], [a.id, "missing"], [a.id, foreign.id]]) {
      const before = storage.getItem(key);
      await expect(api.admin.mergeTopics({ subjectId: "cs-os", topicIds, title: "نهایی" })).rejects.toThrow();
      expect(storage.getItem(key)).toBe(before);
    }
    await expect(api.admin.mergeTopics({ subjectId: "cs-os", topicIds: [a.id, b.id], title: external.title })).rejects.toThrow("ادغام");
    await expect(api.admin.mergeTopics({ subjectId: "cs-os", topicIds: [a.id, b.id], title: "نهایی", targetTopicId: external.id })).rejects.toThrow();
  });
  it("blocks deletion of referenced topics/subjects, allows empty topic deletion and atomic reordering", async () => {
    const topic = await create("خالی"); await api.admin.deleteTopic(topic.id);
    expect((await api.getTopics()).some((t) => t.id === topic.id)).toBe(false);
    const referenced = await create("با درسنامه"); await api.admin.createLesson(lessonInput({ topicId: referenced.id }));
    await expect(api.admin.deleteTopic(referenced.id)).rejects.toThrow("ادغام");
    await expect(api.admin.deleteSubject("cs-os")).rejects.toThrow();
    const ids = (await api.getTopics()).filter((t) => t.subjectId === "cs-os").map((t) => t.id).reverse();
    expect((await api.admin.reorderTopics("cs-os", ids)).map((t) => t.id)).toEqual(ids);
    await expect(api.admin.reorderTopics("cs-os", ids.slice(1))).rejects.toThrow();
  });
});

describe("persistence, migration and regression checks", () => {
  it("does not report success or change memory/storage when quota is exceeded", async () => {
    const before = storage.getItem(key); const topics = await api.getTopics(); const lessons = await api.getLessons();
    const fail = vi.spyOn(storage, "setItem").mockImplementation(() => { throw new DOMException("full", "QuotaExceededError"); });
    await expect(api.admin.bulkImportQuestions([row()])).rejects.toMatchObject({ status: 507 });
    await expect(api.admin.createQuestion({ ...questionInput(), newLessons: [lessonInput()] })).rejects.toMatchObject({ status: 507 });
    expect(storage.getItem(key)).toBe(before); expect(await api.getTopics()).toEqual(topics); expect(await api.getLessons()).toEqual(lessons);
    fail.mockRestore(); const result = await api.admin.bulkImportQuestions([row()]); expect(result.imported).toBe(1);
  });
  it("migrates v2 in place, preserves users/sessions/custom content/settings and does not reseed", async () => {
    const q = await api.admin.createQuestion(questionInput()); const l = await api.admin.createLesson(lessonInput());
    const old = raw(); old.version = 2;
    old.questions.forEach((v: { lessonIds?: string[] }) => { delete v.lessonIds; });
    old.lessons.forEach((v: { status?: string; tags?: string[]; order?: number; summary?: string }) => { delete v.status; delete v.tags; delete v.order; delete v.summary; });
    old.settings.referralBonus = 123; storage.setItem(key, JSON.stringify(old));
    api = await reload();
    const newQuestion = await api.getQuestion(q.id); expect(newQuestion?.lessonIds).toEqual([]);
    expect((await api.getLessons()).find((v) => v.id === l.id)?.status).toBe("published");
    expect((await api.getSettings()).referralBonus).toBe(123);
    const token = storage.getItem("testbank.session.v2")!; expect((await api.me(token))?.role).toBe("admin");
    await api.admin.updateLesson(l.id, { title: "بعد از مهاجرت" });
    expect(raw().version).toBe(3); expect(raw().users).toEqual(old.users); expect(raw().sessions).toEqual(old.sessions);
  });
  it("invalid stored JSON is not silently replaced or erased", async () => {
    storage.setItem(key, "broken data"); api = await reload();
    await expect(api.getTopics()).rejects.toThrow("پاک نشده"); expect(storage.getItem(key)).toBe("broken data");
  });
  it("public returned objects are detached from storage", async () => {
    const topic = (await api.getTopics())[0]; topic.title = "outside mutation";
    expect((await api.getTopics())[0].title).not.toBe(topic.title);
    const lesson = await api.admin.createLesson(lessonInput()); lesson.title = "mutated";
    expect((await api.getLessons()).find((v) => v.id === lesson.id)?.title).not.toBe("mutated");
  });
  it("keeps wallet, purchases, collections, bookmarks and exam flows working", async () => {
    const session = await api.login({ email: "demo@testbank.ir", password: "123456" });
    const { user } = await api.topUp(1000000); expect(user.balance).toBe(session.user.balance + 1000000);
    const purchase = await api.purchaseSubject("cs-ai"); expect(purchase.user.purchasedSubjectIds).toContain("cs-ai");
    const questions = await api.pickByBlueprint([{ id: "r", subjectId: "cs-os", topicIds: [], count: 3, difficulties: [] }], true);
    expect(questions.length).toBe(3); expect(new Set(questions.map((q) => q.id)).size).toBe(3);
    const col = await api.createCollection({ title: "رگرسیون", description: "", color: "violet" });
    await api.addToCollection(col.id, questions.map((q) => q.id));
    expect((await api.getCollections()).find((c) => c.id === col.id)?.questionIds).toHaveLength(3);
    const attempt = await api.startAttempt({ sourceType: "collection", sourceId: col.id, title: "رگرسیون", questionIds: questions.map((q) => q.id), durationMinutes: null, negativeMarking: false });
    const answers = { [questions[0].id]: { questionId: questions[0].id, selectedIndex: questions[0].correctIndex, timeSpent: 10, flagged: false } };
    await api.saveAttemptProgress(attempt.id, answers, 10);
    const finished = await api.finishAttempt(attempt.id, answers, 10);
    expect(finished.result).toMatchObject({ correct: 1, wrong: 0, blank: 2, percent: 33.33 });
    expect(finished.resultQuestions).toHaveLength(3);
    await expect(api.admin.mergeTopics({ subjectId: "cs-os", topicIds: ["cs-os-t1", "cs-os-t2"], title: "bad" })).rejects.toMatchObject({ status: 403 });
  });
});

describe("additional data-safety edge cases", () => {
  it("a failed merge on quota leaves taxonomy, lesson links and history unchanged", async () => {
    const q = await api.admin.createQuestion(questionInput({ topicIds: ["cs-os-t1", "cs-os-t2"] }));
    const before = storage.getItem(key);
    const fail = vi.spyOn(storage, "setItem").mockImplementation(() => { throw new Error("full"); });
    await expect(api.admin.mergeTopics({ subjectId: "cs-os", topicIds: ["cs-os-t1", "cs-os-t2"], title: "نهایی" })).rejects.toMatchObject({ status: 507 });
    expect(storage.getItem(key)).toBe(before); expect((await api.getQuestion(q.id))?.topicIds).toEqual(["cs-os-t1", "cs-os-t2"]);
    fail.mockRestore();
  });
  it("reads fresh storage when another tab writes, instead of overwriting its changes", async () => {
    const other = raw(); other.topics.push({ id: "other-tab-topic", subjectId: "cs-os", title: "مبحث تب دیگر", order: 40 });
    storage.setItem(key, JSON.stringify(other));
    await api.admin.createLesson(lessonInput({ topicId: "other-tab-topic" }));
    expect((await api.getTopics()).some((t) => t.id === "other-tab-topic")).toBe(true);
    expect(raw().lessons.at(-1).topicId).toBe("other-tab-topic");
  });
  it("migrates legacy finished attempts and safely reclassifies their topic buckets", async () => {
    const q = await api.admin.createQuestion(questionInput({ topicIds: ["cs-os-t1", "cs-os-t2"] }));
    const attempt = await api.startAttempt({ sourceType: "quick", title: "قدیمی", questionIds: [q.id], durationMinutes: null, negativeMarking: true });
    await api.finishAttempt(attempt.id, {}, 50);
    const legacy = raw(); legacy.version = 2; legacy.attempts.forEach((a: { resultQuestions?: unknown }) => { delete a.resultQuestions; });
    storage.setItem(key, JSON.stringify(legacy)); api = await reload();
    const result = await api.admin.mergeTopics({ subjectId: "cs-os", topicIds: ["cs-os-t1", "cs-os-t2"], title: "یکپارچه" });
    const updated = raw().attempts.find((a: { id: string }) => a.id === attempt.id);
    expect(updated.result.byTopic[result.targetTopic.id]).toEqual({ correct: 0, wrong: 0, blank: 1, percent: 0 });
    expect(updated.result.blank).toBe(1);
  });
  it("does not guess at incomplete legacy history when a question was deleted before snapshots existed", async () => {
    const q = await api.admin.createQuestion(questionInput({ topicIds: ["cs-os-t1", "cs-os-t2"] }));
    const attempt = await api.startAttempt({ sourceType: "quick", title: "قدیمی ناقص", questionIds: [q.id], durationMinutes: null, negativeMarking: true });
    await api.finishAttempt(attempt.id, {}, 50);
    const legacy = raw(); legacy.version = 2; legacy.attempts.forEach((a: { resultQuestions?: unknown }) => { delete a.resultQuestions; });
    legacy.questions = legacy.questions.filter((question: { id: string }) => question.id !== q.id);
    storage.setItem(key, JSON.stringify(legacy)); api = await reload();
    const before = storage.getItem(key);
    await expect(api.admin.mergeTopics({ subjectId: "cs-os", topicIds: ["cs-os-t1", "cs-os-t2"], title: "یکپارچه" })).rejects.toThrow("قدیمی ناقص");
    expect(storage.getItem(key)).toBe(before);
  });
  it("resolves removed topic ids in API filters as well as in bulk input", async () => {
    const q = await api.admin.createQuestion(questionInput({ topicIds: ["cs-os-t1"] }));
    await api.admin.mergeTopics({ subjectId: "cs-os", topicIds: ["cs-os-t1", "cs-os-t2"], targetTopicId: "cs-os-t2", title: "مبحث واحد" });
    expect((await api.getQuestions({ topicIds: ["cs-os-t1"] })).map((item) => item.id)).toContain(q.id);
  });
});

it("preserves the original cross-subject seed tag during content/link edits without changing ownership", async () => {
  const before = await api.getQuestion("q-ai-003");
  const lesson = await api.admin.createLesson(lessonInput({ topicId: "cs-ai-t8" }));
  const updated = await api.admin.updateQuestion("q-ai-003", { lessonIds: [lesson.id] });
  expect(updated.subjectIds).toEqual(before!.subjectIds);
  expect(updated.topicIds).toEqual(before!.topicIds);
  expect(updated.lessonIds).toEqual([lesson.id]);
  await expect(api.admin.updateQuestion(updated.id, { topicIds: [...updated.topicIds, "cs-os-t1"] })).rejects.toThrow();
});

it("the shipped JSON examples import successfully and reuse their new topics", async () => {
  const result = await api.admin.bulkImportQuestions(sampleRows as BulkQuestionRow[]);
  expect(result.imported).toBe(3); expect(result.errors).toEqual([]); expect(result.createdTopics).toHaveLength(2);
});
