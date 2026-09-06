import type { BulkImportResult, BulkQuestionRow, BulkTopicRef, Question, Subject, Topic } from "@/types";
import { catalogNameKey, cleanTitle, unique } from "@/lib/catalog";
import { nowIso, uid } from "@/lib/utils";
import { ApiError } from "./api";
import { stringList, topicHasTitle, validateQuestion, type CatalogData } from "./contentValidation";

function resolveSubject(db: CatalogData, ref: string): Subject {
  const byId = db.subjects.find((s) => s.id === ref.trim());
  if (byId) return byId;
  const matches = db.subjects.filter((s) => catalogNameKey(s.title) === catalogNameKey(ref));
  if (matches.length !== 1) throw new ApiError(`درس «${ref}» ${matches.length ? "مبهم است؛ از شناسه استفاده کنید" : "وجود ندارد"}`);
  return matches[0];
}

/** هر ردیف ابتدا کاملاً اعتبارسنجی می‌شود؛ مبحثِ ردیف نامعتبر هرگز ذخیره نمی‌شود. */
export function importQuestionRows(db: CatalogData, rows: BulkQuestionRow[]): BulkImportResult {
  if (!Array.isArray(rows)) throw new ApiError("ورودی باید آرایه‌ای از سوالات باشد");
  const result: BulkImportResult = { imported: 0, createdTopics: [], errors: [] };
  rows.forEach((row, index) => {
    try {
      if (!row || typeof row !== "object" || Array.isArray(row)) throw new ApiError("هر ردیف باید یک شیء سوال باشد");
      const subjects = stringList(row.subjects, "درس‌ها", true).map((ref) => resolveSubject(db, ref));
      const subjectIds = unique(subjects.map((s) => s.id));
      if (!Array.isArray(row.topics) || !row.topics.length) throw new ApiError("حداقل یک مبحث مشخص کنید");
      const pending: Topic[] = [];
      const resolveTopic = (ref: BulkTopicRef): string[] => {
        let title: string;
        let scopes = subjectIds;
        if (typeof ref === "string") {
          title = ref.trim();
          const byId = db.topics.find((t) => t.id === title || t.mergedIds?.includes(title));
          if (byId) {
            if (!subjectIds.includes(byId.subjectId)) throw new ApiError(`مبحث «${byId.title}» متعلق به درس‌های این سوال نیست`);
            return [byId.id];
          }
        } else if (ref && typeof ref === "object" && typeof ref.subject === "string" && typeof ref.title === "string") {
          const subject = resolveSubject(db, ref.subject);
          if (!subjectIds.includes(subject.id)) throw new ApiError("درسِ مبحث باید در subjects سوال هم انتخاب شده باشد");
          scopes = [subject.id];
          title = ref.title.trim();
        } else {
          throw new ApiError("مبحث باید نام/شناسه یا شیء {subject, title} باشد");
        }
        if (!catalogNameKey(title)) throw new ApiError("نام مبحث نمی‌تواند خالی باشد");
        return scopes.map((subjectId) => {
          const allTopics = [...db.topics, ...pending];
          const matches = allTopics.filter((t) => t.subjectId === subjectId && topicHasTitle(t, title));
          if (matches.length > 1) throw new ApiError(`نام مبحث «${title}» تکراری است؛ از شناسه استفاده کنید یا ابتدا مباحث را ادغام کنید`);
          if (matches[0]) return matches[0].id;
          const topic: Topic = {
            id: uid("topic"), subjectId, title: cleanTitle(title),
            order: Math.max(0, ...allTopics.filter((t) => t.subjectId === subjectId).map((t) => t.order)) + 1,
          };
          pending.push(topic);
          return topic.id;
        });
      };
      const topicIds = unique(row.topics.flatMap(resolveTopic));
      if (typeof row.correct !== "number" || !Number.isInteger(row.correct)) throw new ApiError("شماره‌ی گزینه‌ی صحیح باید عدد صحیح باشد");
      if (row.correctBase !== undefined && row.correctBase !== 0 && row.correctBase !== 1) throw new ApiError("correctBase فقط می‌تواند ۰ یا ۱ باشد");
      // Backwards compatibility: bare 0 used to mean the first answer. All other bare numbers are 1-based.
      const base = row.correctBase ?? (row.correct === 0 ? 0 : 1);
      const correctIndex = row.correct - base;
      if (correctIndex < 0 || correctIndex > 3) throw new ApiError(base ? "گزینه‌ی صحیح باید بین ۱ تا ۴ باشد" : "گزینه‌ی صحیح صفرمبنا باید بین ۰ تا ۳ باشد");
      if (row.source !== undefined && (typeof row.source !== "string" || !row.source.trim())) throw new ApiError("منبع باید شناسه یا عنوان غیرخالی باشد");
      const source = row.source
        ? db.sources.find((s) => s.id === row.source!.trim()) ?? db.sources.find((s) => catalogNameKey(s.title) === catalogNameKey(row.source!))
        : db.sources.find((s) => s.id === "src-talifi") ?? db.sources.find((s) => s.kind === "talifi");
      if (!source) throw new ApiError("منبع مشخص‌شده یا منبع پیش‌فرض تألیفی وجود ندارد");
      const input = validateQuestion({ ...db, topics: [...db.topics, ...pending] }, {
        subjectIds, topicIds, lessonIds: row.lessonIds ?? [], stem: row.stem,
        options: row.options as Question["options"], correctIndex,
        explanation: row.explanation ?? "", difficulty: row.difficulty ?? 2, sourceId: source.id,
        tags: row.tags ?? [], images: row.images ?? [], estimatedSeconds: row.estimatedSeconds ?? 90,
        isActive: row.isActive ?? true,
      });
      const question: Question = { ...input, id: uid("q"), createdAt: nowIso(), updatedAt: nowIso() };
      db.topics.push(...pending);
      db.questions.push(question);
      result.createdTopics.push(...pending);
      result.imported++;
    } catch (error) {
      result.errors.push({ row: index + 1, message: error instanceof Error ? error.message : "ساختار سوال معتبر نیست" });
    }
  });
  return result;
}
