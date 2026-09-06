import type { ExamAttempt, ID, Question, QuestionFilter, Subject } from "@/types";
import { plainText } from "./utils";

export type AnswerState = "correct" | "wrong" | "blank";

/** آخرین وضعیت پاسخ کاربر به هر سوال بر اساس آزمون‌های پایان‌یافته */
export const buildAnswerStateMap = (attempts: ExamAttempt[], questionById: (id: ID) => Question | undefined): Map<ID, AnswerState> => {
  const state = new Map<ID, AnswerState>();
  [...attempts]
    .filter((a) => a.status === "finished")
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt))
    .forEach((a) => {
      for (const qid of a.questionIds) {
        const qn = questionById(qid);
        if (!qn) continue;
        const ans = a.answers[qid];
        state.set(qid, ans?.selectedIndex == null ? "blank" : ans.selectedIndex === qn.correctIndex ? "correct" : "wrong");
      }
    });
  return state;
};

export interface FilterContext {
  subjects: Subject[];
  includeInactive?: boolean;
  purchasedSubjectIds?: ID[];
  bookmarkedQuestionIds?: ID[];
  answerStates?: Map<ID, AnswerState>;
}

/** اعمال فیلتر روی لیست سوالات — منطق یکسان در کلاینت و سرور mock */
export const applyQuestionFilter = (questions: Question[], filter: QuestionFilter, ctx: FilterContext): Question[] => {
  let list = questions.filter((q) => q.isActive || ctx.includeInactive);

  if (filter.ownedOnly && ctx.purchasedSubjectIds) list = list.filter((q) => q.subjectIds.some((s) => ctx.purchasedSubjectIds!.includes(s)));
  if (filter.bookmarkedOnly && ctx.bookmarkedQuestionIds) list = list.filter((q) => ctx.bookmarkedQuestionIds!.includes(q.id));
  if (filter.domainIds?.length) {
    const subjIds = new Set(ctx.subjects.filter((s) => s.domainIds.some((d) => filter.domainIds!.includes(d))).map((s) => s.id));
    list = list.filter((q) => q.subjectIds.some((s) => subjIds.has(s)));
  }
  if (filter.subjectIds?.length) list = list.filter((q) => q.subjectIds.some((s) => filter.subjectIds!.includes(s)));
  if (filter.topicIds?.length) list = list.filter((q) => q.topicIds.some((t) => filter.topicIds!.includes(t)));
  if (filter.sourceIds?.length) list = list.filter((q) => filter.sourceIds!.includes(q.sourceId));
  if (filter.difficulties?.length) list = list.filter((q) => filter.difficulties!.includes(q.difficulty));
  if (filter.tags?.length) list = list.filter((q) => q.tags.some((t) => filter.tags!.includes(t)));
  if (filter.hasImage) list = list.filter((q) => q.images.length > 0);
  if (filter.search?.trim()) {
    const s = filter.search.trim().toLowerCase();
    list = list.filter((q) => [q.stem, ...q.options, q.explanation, ...q.tags, q.id].some((t) => plainText(t).toLowerCase().includes(s) || t.toLowerCase().includes(s)));
  }
  if (filter.answerState && filter.answerState !== "any" && ctx.answerStates) {
    const st = ctx.answerStates;
    list = list.filter((q) => (filter.answerState === "unseen" ? !st.has(q.id) : st.get(q.id) === filter.answerState));
  }
  switch (filter.sort) {
    case "oldest":
      list = [...list].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      break;
    case "difficulty-asc":
      list = [...list].sort((a, b) => a.difficulty - b.difficulty);
      break;
    case "difficulty-desc":
      list = [...list].sort((a, b) => b.difficulty - a.difficulty);
      break;
    case "newest":
      list = [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      break;
    default:
      break;
  }
  return list;
};

export const emptyFilter = (): QuestionFilter => ({
  search: "",
  domainIds: [],
  subjectIds: [],
  topicIds: [],
  sourceIds: [],
  difficulties: [],
  tags: [],
  hasImage: false,
  bookmarkedOnly: false,
  ownedOnly: false,
  answerState: "any",
  sort: "newest",
});

export const countActiveFilters = (f: QuestionFilter): number =>
  [f.domainIds?.length, f.subjectIds?.length, f.topicIds?.length, f.sourceIds?.length, f.difficulties?.length, f.tags?.length, f.hasImage ? 1 : 0, f.bookmarkedOnly ? 1 : 0, f.answerState && f.answerState !== "any" ? 1 : 0].reduce<number>(
    (a, b) => a + (b ? 1 : 0),
    0
  );
