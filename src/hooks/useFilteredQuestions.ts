import { useMemo } from "react";
import type { QuestionFilter } from "@/types";
import { applyQuestionFilter, buildAnswerStateMap } from "@/lib/questionFilter";
import { useApp } from "@/store/AppContext";

/**
 * فیلتر سمت کلاینت روی کاتالوگ بارگذاری‌شده.
 * (در اتصال به بک‌اند، می‌توان همین فیلتر را به api.getQuestions پاس داد و نتیجه را cache کرد.)
 */
export const useFilteredQuestions = (filter: QuestionFilter) => {
  const { catalog, user, userData } = useApp();
  const answerStates = useMemo(() => buildAnswerStateMap(userData.attempts, (id) => catalog.questionById.get(id)), [userData.attempts, catalog.questionById]);
  return useMemo(
    () =>
      applyQuestionFilter(catalog.questions, filter, {
        subjects: catalog.subjects,
        purchasedSubjectIds: user?.role === "admin" ? catalog.subjects.map((s) => s.id) : user?.purchasedSubjectIds,
        bookmarkedQuestionIds: user?.bookmarkedQuestionIds,
        answerStates,
      }),
    [catalog.questions, catalog.subjects, filter, user, answerStates]
  );
};
