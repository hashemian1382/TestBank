import type { Lesson, Question } from "@/types";
import { plainText } from "./utils";
import { catalogNameKey } from "./catalog";

export const isLessonPublished = (lesson: Lesson) => lesson.status !== "draft";
export const sortLessons = (lessons: Lesson[]) => [...lessons].sort((a, b) =>
  (a.order ?? 0) - (b.order ?? 0) || a.title.localeCompare(b.title, "fa"));
export const readingMinutes = (content: string) => Math.max(1, Math.ceil(plainText(content).trim().split(/\s+/).filter(Boolean).length / 180));
export const lessonMatches = (lesson: Lesson, search: string, extra: string[] = []) =>
  catalogNameKey([lesson.title, lesson.summary ?? "", ...(lesson.tags ?? []), ...extra].join(" ")).includes(catalogNameKey(search));

/** Direct associations first, then topic recommendations, without duplicate links. */
export function relatedLessons(question: Question, lessons: Lesson[], admin = false): Lesson[] {
  const visible = lessons.filter((l) => admin || isLessonPublished(l));
  const direct = (question.lessonIds ?? []).flatMap((id) => visible.filter((l) => l.id === id));
  const ids = new Set(direct.map((l) => l.id));
  return [...direct, ...sortLessons(visible.filter((l) => !ids.has(l.id) && question.topicIds.includes(l.topicId)))];
}
