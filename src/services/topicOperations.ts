import type { ExamAttempt, ExamTemplate, TopicMergeInput, TopicMergePreview, TopicMergeResult } from "@/types";
import { unique } from "@/lib/catalog";
import { computeResult, nowIso } from "@/lib/utils";
import { ApiError } from "./api";
import { topicHasTitle, validateTopicTitle, type CatalogData } from "./contentValidation";

export interface TopicData extends CatalogData {
  examTemplates: ExamTemplate[];
  attempts: ExamAttempt[];
}

export function planTopicMerge(db: TopicData, input: TopicMergeInput): TopicMergePreview {
  if (!Array.isArray(input.topicIds) || unique(input.topicIds).length < 2) throw new ApiError("حداقل دو مبحث متفاوت انتخاب کنید");
  const sourceTopics = unique(input.topicIds).map((id) => {
    const topic = db.topics.find((t) => t.id === id);
    if (!topic) throw new ApiError("یکی از مباحث انتخابی دیگر وجود ندارد؛ صفحه را به‌روز کنید");
    if (topic.subjectId !== input.subjectId) throw new ApiError("فقط مباحثِ یک درس قابل ادغام هستند");
    return topic;
  }).sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  const title = validateTopicTitle(db, input.subjectId, input.title, input.topicIds);
  if (input.targetTopicId && !input.topicIds.includes(input.targetTopicId)) throw new ApiError("مبحث مقصد باید در انتخاب‌ها باشد");
  const target = (input.targetTopicId && sourceTopics.find((t) => t.id === input.targetTopicId))
    || sourceTopics.find((t) => topicHasTitle(t, title)) || sourceTopics[0];
  const ids = new Set(sourceTopics.flatMap((t) => [t.id, ...(t.mergedIds ?? [])]));
  const questions = db.questions.filter((q) => q.topicIds.some((id) => ids.has(id)));
  const questionIds = new Set(questions.map((q) => q.id));
  const affectedAttempts = db.attempts.filter((a) => a.questionIds.some((id) => questionIds.has(id))
    || a.resultQuestions?.some((q) => q.topicIds.some((id) => ids.has(id)))
    || Object.keys(a.result?.byTopic ?? {}).some((id) => ids.has(id)));
  for (const attempt of affectedAttempts) {
    if (!attempt.result) continue;
    const snapshotIds = new Set((attempt.resultQuestions ?? db.questions).map((q) => q.id));
    if (attempt.questionIds.some((id) => !snapshotIds.has(id))) {
      throw new ApiError(`جزئیات سوال‌های آزمون قدیمی «${attempt.title}» کامل نیست. برای جلوگیری از تغییر آمار به‌صورت حدسی، ابتدا این سابقه را از نسخه‌ی پشتیبان بازیابی کنید`);
    }
  }
  return {
    targetTopic: { ...target, title, order: Math.min(...sourceTopics.map((t) => t.order)) },
    sourceTopics,
    affectedQuestions: questions.length,
    affectedLessons: db.lessons.filter((l) => ids.has(l.topicId)).length,
    affectedTemplates: db.examTemplates.filter((e) => e.blueprint?.some((r) => r.topicIds.some((id) => ids.has(id)))).length,
    affectedAttempts: affectedAttempts.length,
  };
}

/** Called inside LocalStore.mutate. No partial changes can escape a failed transaction. */
export function applyTopicMerge(db: TopicData, input: TopicMergeInput): TopicMergeResult {
  const preview = planTopicMerge(db, input);
  const before = structuredClone(preview);
  const targetId = preview.targetTopic.id;
  const ids = new Set(preview.sourceTopics.flatMap((t) => [t.id, ...(t.mergedIds ?? [])]));
  const remap = (refs: string[]) => unique(refs.map((id) => ids.has(id) ? targetId : id));
  // Capture legacy attempts before remapping. New attempts already have stable grading snapshots.
  for (const attempt of db.attempts) {
    if (attempt.result && !attempt.resultQuestions) {
      attempt.resultQuestions = db.questions.filter((q) => attempt.questionIds.includes(q.id))
        .map(({ id, subjectIds, topicIds, correctIndex }) => ({ id, subjectIds: [...subjectIds], topicIds: [...topicIds], correctIndex }));
    }
  }
  const target = db.topics.find((t) => t.id === targetId)!;
  Object.assign(target, preview.targetTopic, {
    aliases: unique(preview.sourceTopics.flatMap((t) => [t.title, ...(t.aliases ?? [])])).filter((name) => name !== input.title.trim()),
    mergedIds: unique([...ids]).filter((id) => id !== targetId),
  });
  db.topics = db.topics.filter((t) => !ids.has(t.id) || t.id === targetId);
  for (const q of db.questions) {
    if (q.topicIds.some((id) => ids.has(id))) { q.topicIds = remap(q.topicIds); q.updatedAt = nowIso(); }
  }
  for (const lesson of db.lessons) {
    if (ids.has(lesson.topicId)) { lesson.topicId = targetId; lesson.updatedAt = nowIso(); }
  }
  for (const template of db.examTemplates) {
    template.blueprint?.forEach((rule) => { rule.topicIds = remap(rule.topicIds); });
  }
  for (const attempt of db.attempts) {
    const touched = attempt.resultQuestions?.some((q) => q.topicIds.some((id) => ids.has(id)))
      || Object.keys(attempt.result?.byTopic ?? {}).some((id) => ids.has(id));
    attempt.resultQuestions?.forEach((q) => { q.topicIds = remap(q.topicIds); });
    if (!attempt.result || !touched) continue;
    const newBucket = computeResult(attempt.resultQuestions ?? [], attempt.answers, attempt.negativeMarking).byTopic[targetId];
    // Never sum old buckets: a question tagged with two merged topics must count only once.
    ids.forEach((id) => { delete attempt.result!.byTopic[id]; });
    if (newBucket) attempt.result.byTopic[targetId] = newBucket;
    // All overall scores, bySubject, answers, timings and question order remain unchanged.
  }
  return { ...before, targetTopic: structuredClone(target), removedTopicIds: preview.sourceTopics.filter((t) => t.id !== targetId).map((t) => t.id) };
}
