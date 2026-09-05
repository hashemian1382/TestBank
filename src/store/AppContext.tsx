import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { AppSettings, Collection, ExamAttempt, ExamDomain, ExamTemplate, ID, Lesson, Question, Source, Subject, Topic, User } from "@/types";
import { api } from "@/services";
import { SESSION_KEY } from "@/services/config";

/* ------------------------------ Toast ------------------------------ */
export type ToastKind = "success" | "error" | "info";
export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

/* ------------------------------ Catalog ------------------------------ */
export interface Catalog {
  domains: ExamDomain[];
  subjects: Subject[];
  topics: Topic[];
  sources: Source[];
  lessons: Lesson[];
  questions: Question[];
  settings: AppSettings;
  /** نگاشت‌های سریع */
  subjectById: Map<ID, Subject>;
  topicById: Map<ID, Topic>;
  sourceById: Map<ID, Source>;
  questionById: Map<ID, Question>;
  topicsBySubject: Map<ID, Topic[]>;
  lessonsByTopic: Map<ID, Lesson[]>;
  domainById: Map<ID, ExamDomain>;
}

interface UserData {
  collections: Collection[];
  templates: ExamTemplate[];
  attempts: ExamAttempt[];
}

interface AppContextValue {
  booting: boolean;
  user: User | null;
  catalog: Catalog;
  userData: UserData;
  toasts: Toast[];
  toast: (message: string, kind?: ToastKind) => void;
  dismissToast: (id: number) => void;
  setUser: (u: User | null) => void;
  logout: () => Promise<void>;
  refreshCatalog: () => Promise<void>;
  refreshUserData: () => Promise<void>;
  /** helpers */
  ownsQuestion: (q: Question) => boolean;
  ownsSubject: (subjectId: ID) => boolean;
  isBookmarked: (questionId: ID) => boolean;
  toggleBookmark: (questionId: ID) => Promise<void>;
}

const emptyCatalog = (): Catalog => ({
  domains: [],
  subjects: [],
  topics: [],
  sources: [],
  lessons: [],
  questions: [],
  settings: { referralBonus: 0, signupBonus: 0, currencyLabel: "تومان" },
  subjectById: new Map(),
  topicById: new Map(),
  sourceById: new Map(),
  questionById: new Map(),
  topicsBySubject: new Map(),
  lessonsByTopic: new Map(),
  domainById: new Map(),
});

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [booting, setBooting] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [catalog, setCatalog] = useState<Catalog>(emptyCatalog);
  const [userData, setUserData] = useState<UserData>({ collections: [], templates: [], attempts: [] });
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);

  const toast = useCallback((message: string, kind: ToastKind = "info") => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, kind, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);
  const dismissToast = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const refreshCatalog = useCallback(async () => {
    const [domains, subjects, topics, sources, lessons, questions, settings] = await Promise.all([
      api.getDomains(),
      api.getSubjects(),
      api.getTopics(),
      api.getSources(),
      api.getLessons(),
      api.getQuestions({ sort: "newest" }),
      api.getSettings(),
    ]);
    const topicsBySubject = new Map<ID, Topic[]>();
    topics.forEach((t) => topicsBySubject.set(t.subjectId, [...(topicsBySubject.get(t.subjectId) ?? []), t]));
    topicsBySubject.forEach((arr) => arr.sort((a, b) => a.order - b.order));
    const lessonsByTopic = new Map<ID, Lesson[]>();
    lessons.forEach((l) => lessonsByTopic.set(l.topicId, [...(lessonsByTopic.get(l.topicId) ?? []), l]));
    setCatalog({
      domains,
      subjects,
      topics,
      sources,
      lessons,
      questions,
      settings,
      subjectById: new Map(subjects.map((s) => [s.id, s])),
      topicById: new Map(topics.map((t) => [t.id, t])),
      sourceById: new Map(sources.map((s) => [s.id, s])),
      questionById: new Map(questions.map((q) => [q.id, q])),
      topicsBySubject,
      lessonsByTopic,
      domainById: new Map(domains.map((d) => [d.id, d])),
    });
  }, []);

  const refreshUserData = useCallback(async () => {
    if (!user) {
      setUserData({ collections: [], templates: [], attempts: [] });
      return;
    }
    const [collections, templates, attempts] = await Promise.all([api.getCollections(), api.getExamTemplates(), api.getAttempts()]);
    setUserData({ collections, templates, attempts });
  }, [user]);

  // boot: restore session + catalog
  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem(SESSION_KEY);
        if (token) {
          const u = await api.me(token);
          setUser(u);
        }
        await refreshCatalog();
      } finally {
        setBooting(false);
      }
    })();
  }, [refreshCatalog]);

  useEffect(() => {
    refreshUserData();
  }, [refreshUserData]);

  const logout = useCallback(async () => {
    await api.logout();
    setUser(null);
  }, []);

  const ownsSubject = useCallback((subjectId: ID) => !!user && (user.role === "admin" || user.purchasedSubjectIds.includes(subjectId)), [user]);
  const ownsQuestion = useCallback((q: Question) => q.subjectIds.some(ownsSubject), [ownsSubject]);
  const isBookmarked = useCallback((qid: ID) => !!user?.bookmarkedQuestionIds.includes(qid), [user]);
  const toggleBookmark = useCallback(
    async (qid: ID) => {
      if (!user) return;
      const u = await api.toggleBookmark(qid);
      setUser(u);
      toast(u.bookmarkedQuestionIds.includes(qid) ? "سوال نشان‌دار شد" : "نشان سوال برداشته شد", "success");
    },
    [user, toast]
  );

  const value = useMemo<AppContextValue>(
    () => ({ booting, user, catalog, userData, toasts, toast, dismissToast, setUser, logout, refreshCatalog, refreshUserData, ownsQuestion, ownsSubject, isBookmarked, toggleBookmark }),
    [booting, user, catalog, userData, toasts, toast, dismissToast, logout, refreshCatalog, refreshUserData, ownsQuestion, ownsSubject, isBookmarked, toggleBookmark]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
};
