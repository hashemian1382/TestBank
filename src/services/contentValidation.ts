import type { Lesson, LessonInput, Question, QuestionImage, QuestionInput, Source, Subject, Topic } from "@/types";
import { catalogNameKey, cleanTitle, unique } from "@/lib/catalog";
import { nowIso, uid } from "@/lib/utils";
import { ApiError } from "./api";

export interface CatalogData {
  subjects: Subject[];
  topics: Topic[];
  sources: Source[];
  lessons: Lesson[];
  questions: Question[];
}

export const topicHasTitle = (topic: Topic, title: string): boolean =>
  [topic.title, ...(topic.aliases ?? [])].some((name) => catalogNameKey(name) === catalogNameKey(title));

export function validateTopicTitle(db: Pick<CatalogData, "subjects" | "topics">, subjectId: string, title: string, excludeIds: string[] = []) {
  if (!db.subjects.some((s) => s.id === subjectId)) throw new ApiError("درس انتخاب‌شده وجود ندارد");
  if (typeof title !== "string" || !catalogNameKey(title)) throw new ApiError("نام مبحث نمی‌تواند خالی باشد");
  const collision = db.topics.find((t) => t.subjectId === subjectId && !excludeIds.includes(t.id) && topicHasTitle(t, title));
  if (collision) throw new ApiError(`این نام به مبحث «${collision.title}» تعلق دارد؛ برای یکی‌کردن، از ادغام استفاده کنید`);
  return cleanTitle(title);
}

export function stringList(value: unknown, label: string, required = false): string[] {
  if (!Array.isArray(value) || value.some((v) => typeof v !== "string" || !v.trim()) || (required && !value.length)) {
    throw new ApiError(`${label} باید آرایه‌ای از متن‌های غیرخالی باشد`);
  }
  return unique(value.map((v: string) => v.trim()));
}

/** URL اجرایی/HTML مجاز نیست؛ SVGهای seed فقط در تگ img نمایش داده می‌شوند. */
export function isSafeImageSrc(src: string): boolean {
  if (!src || /[\u0000-\u001f\u007f]/.test(src)) return false;
  if (/^https?:\/\//i.test(src)) {
    try { const url = new URL(src); return !!url.hostname && !url.username && !url.password; } catch { return false; }
  }
  if (/^data:image\/(png|jpe?g|gif|webp|avif|svg\+xml)(;[^,]*)?,/i.test(src)) return true;
  return !/^[a-z][a-z\d+.-]*:/i.test(src) && !src.startsWith("//") && !src.includes("\\");
}

export function validateImages(value: unknown): QuestionImage[] {
  if (!Array.isArray(value)) throw new ApiError("تصاویر باید آرایه باشند");
  const ids = new Set<string>();
  return value.map((image: QuestionImage) => {
    if (!image || typeof image.id !== "string" || !/^[\w-]+$/.test(image.id) || ids.has(image.id)) {
      throw new ApiError("شناسه‌ی تصاویر باید یکتا و شامل حروف لاتین، عدد، خط تیره یا زیرخط باشد");
    }
    ids.add(image.id);
    if (typeof image.src !== "string" || !isSafeImageSrc(image.src.trim())) throw new ApiError(`آدرس تصویر «${image.id}» معتبر نیست`);
    if (typeof image.alt !== "string" || (image.caption !== undefined && typeof image.caption !== "string")) throw new ApiError("متن جایگزین و زیرنویس تصویر باید متن باشند");
    if (image.width !== undefined && (!Number.isFinite(image.width) || image.width <= 0)) throw new ApiError("عرض تصویر باید مثبت باشد");
    return { ...image, src: image.src.trim() };
  });
}

export function validateLesson(db: Pick<CatalogData, "topics">, input: LessonInput): LessonInput {
  if (!db.topics.some((t) => t.id === input.topicId)) throw new ApiError("مبحث درسنامه معتبر نیست");
  if (typeof input.title !== "string" || !input.title.trim()) throw new ApiError("عنوان درسنامه الزامی است");
  if (typeof input.content !== "string") throw new ApiError("محتوای درسنامه باید متن باشد");
  const status = input.status ?? "draft";
  if (status !== "draft" && status !== "published") throw new ApiError("وضعیت درسنامه معتبر نیست");
  if (status === "published" && !input.content.trim()) throw new ApiError("برای انتشار، محتوای درسنامه را بنویسید");
  if (!Number.isInteger(input.readingMinutes) || input.readingMinutes < 1) throw new ApiError("زمان مطالعه باید یک عدد صحیح مثبت باشد");
  if (input.order !== undefined && (!Number.isInteger(input.order) || input.order < 0)) throw new ApiError("ترتیب نمایش باید عدد صحیح نامنفی باشد");
  if (input.summary !== undefined && typeof input.summary !== "string") throw new ApiError("خلاصه باید متن باشد");
  const images = validateImages(input.images);
  const missing = [...input.content.matchAll(/\[\[img:([^\]]+)\]\]/g)].find((m) => !images.some((im) => im.id === m[1]));
  if (missing) throw new ApiError(`تصویر «${missing[1]}» در محتوا استفاده شده ولی تعریف نشده است`);
  return {
    topicId: input.topicId, title: cleanTitle(input.title), content: input.content.trim(),
    images, readingMinutes: input.readingMinutes, summary: (input.summary ?? "").trim(),
    tags: stringList(input.tags ?? [], "برچسب‌ها"), status, order: input.order ?? 0,
  };
}

export function insertLesson(db: CatalogData, input: LessonInput): Lesson {
  const lesson: Lesson = { ...validateLesson(db, input), id: uid("les"), createdAt: nowIso(), updatedAt: nowIso() };
  db.lessons.push(lesson);
  return lesson;
}

export function validateQuestion(db: CatalogData, input: QuestionInput, previous?: Question): QuestionInput {
  const subjectIds = stringList(input.subjectIds, "درس‌ها", true);
  if (subjectIds.some((id) => !db.subjects.some((s) => s.id === id))) throw new ApiError("درس سوال معتبر نیست");
  const topicIds = stringList(input.topicIds, "مباحث", true);
  // The original seed includes cross-subject prerequisite tags (e.g. q-ai-003).
  // Preserve existing valid references on content-only edits; never silently change ownership.
  const sameSubjects = previous && previous.subjectIds.length === subjectIds.length && previous.subjectIds.every((id) => subjectIds.includes(id));
  if (topicIds.some((id) => !db.topics.some((t) => t.id === id && (subjectIds.includes(t.subjectId) || (sameSubjects && previous.topicIds.includes(id)))))) {
    throw new ApiError("مباحث جدید باید متعلق به درس‌های انتخاب‌شده باشند");
  }
  if (typeof input.stem !== "string" || !input.stem.trim()) throw new ApiError("صورت سوال خالی است");
  if (!Array.isArray(input.options) || input.options.length !== 4 || input.options.some((o) => typeof o !== "string" || !o.trim())) throw new ApiError("باید دقیقاً ۴ گزینه‌ی غیرخالی وجود داشته باشد");
  if (!Number.isInteger(input.correctIndex) || input.correctIndex < 0 || input.correctIndex > 3) throw new ApiError("گزینه‌ی صحیح نامعتبر است");
  if (![1, 2, 3].includes(input.difficulty)) throw new ApiError("سطح سوال باید ۱، ۲ یا ۳ باشد");
  if (typeof input.explanation !== "string") throw new ApiError("پاسخ تشریحی باید متن باشد");
  if (!Number.isInteger(input.estimatedSeconds) || input.estimatedSeconds <= 0) throw new ApiError("زمان پیشنهادی باید یک عدد صحیح مثبت باشد");
  if (typeof input.isActive !== "boolean") throw new ApiError("وضعیت فعال بودن سوال باید true یا false باشد");
  if (!db.sources.some((s) => s.id === input.sourceId)) throw new ApiError("منبع سوال معتبر نیست");
  const lessonIds = stringList(input.lessonIds ?? [], "درسنامه‌ها");
  if (lessonIds.some((id) => {
    const lesson = db.lessons.find((l) => l.id === id);
    const topic = lesson && db.topics.find((t) => t.id === lesson.topicId);
    return !topic || !subjectIds.includes(topic.subjectId);
  })) throw new ApiError("درسنامه‌های متصل باید موجود و متعلق به یکی از درس‌های سوال باشند");
  return {
    subjectIds, topicIds, lessonIds, stem: input.stem.trim(), options: input.options.map((o) => o.trim()) as Question["options"],
    correctIndex: input.correctIndex, explanation: input.explanation, difficulty: input.difficulty, sourceId: input.sourceId,
    tags: stringList(input.tags, "برچسب‌ها"), images: validateImages(input.images),
    estimatedSeconds: input.estimatedSeconds, isActive: input.isActive,
  };
}
