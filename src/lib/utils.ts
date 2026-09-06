import type { AttemptAnswer, AttemptResult, Difficulty, ID, Question } from "@/types";

export { cn } from "@/utils/cn";

const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

/** تبدیل ارقام لاتین به فارسی */
export const toFa = (v: number | string): string => String(v).replace(/\d/g, (d) => FA_DIGITS[Number(d)]);

/** تبدیل ارقام فارسی/عربی به لاتین (برای ورودی‌ها) */
export const toEn = (v: string): string =>
  v.replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d))).replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));

export const formatNumber = (n: number): string => toFa(new Intl.NumberFormat("en-US").format(Math.round(n)));

export const formatPrice = (n: number, label = "تومان"): string => (n === 0 ? "رایگان" : `${formatNumber(n)} ${label}`);

export const formatDuration = (seconds: number): string => {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (x: number) => String(x).padStart(2, "0");
  return toFa(h > 0 ? `${pad(h)}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`);
};

export const formatDate = (iso: string): string =>
  new Intl.DateTimeFormat("fa-IR", { year: "numeric", month: "long", day: "numeric" }).format(new Date(iso));

export const formatDateTime = (iso: string): string =>
  new Intl.DateTimeFormat("fa-IR", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

export const relativeTime = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "همین الان";
  if (m < 60) return `${toFa(m)} دقیقه پیش`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${toFa(h)} ساعت پیش`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${toFa(d)} روز پیش`;
  return formatDate(iso);
};

export const uid = (prefix = "id"): string => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const nowIso = (): string => new Date().toISOString();

export const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export const sample = <T,>(arr: T[], n: number): T[] => shuffle(arr).slice(0, n);

export const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

export const DIFFICULTY_LABEL: Record<Difficulty, string> = { 1: "آسان", 2: "متوسط", 3: "دشوار" };
export const DIFFICULTY_COLOR: Record<Difficulty, string> = {
  1: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  2: "bg-amber-50 text-amber-700 ring-amber-200",
  3: "bg-rose-50 text-rose-700 ring-rose-200",
};

export const OPTION_LABELS = ["۱", "۲", "۳", "۴"];

export const generateReferralCode = (name: string): string => {
  const base = name
    .replace(/[^a-zA-Z]/g, "")
    .toUpperCase()
    .slice(0, 4);
  const rand = Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
  return `${base || "TB"}${rand}${Math.floor(10 + Math.random() * 89)}`;
};

/** محاسبه‌ی نتیجه‌ی آزمون (درصد کنکوری با نمره منفی) */
export const computeResult = (questions: Pick<Question, "id" | "subjectIds" | "topicIds" | "correctIndex">[], answers: Record<ID, AttemptAnswer>, negativeMarking: boolean): AttemptResult => {
  type Bucket = { correct: number; wrong: number; blank: number; percent: number };
  const mk = (): Bucket => ({ correct: 0, wrong: 0, blank: 0, percent: 0 });
  const total = mk();
  const bySubject: Record<ID, Bucket> = {};
  const byTopic: Record<ID, Bucket> = {};

  const bump = (b: Bucket, key: keyof Omit<Bucket, "percent">) => {
    b[key] += 1;
  };

  for (const qn of questions) {
    const a = answers[qn.id];
    const key: keyof Omit<Bucket, "percent"> = a?.selectedIndex == null ? "blank" : a.selectedIndex === qn.correctIndex ? "correct" : "wrong";
    bump(total, key);
    for (const sid of new Set(qn.subjectIds)) bump((bySubject[sid] ||= mk()), key);
    for (const tid of new Set(qn.topicIds)) bump((byTopic[tid] ||= mk()), key);
  }

  const pct = (b: Bucket) => {
    const n = b.correct + b.wrong + b.blank;
    if (n === 0) return 0;
    const score = negativeMarking ? b.correct - b.wrong / 3 : b.correct;
    return Math.max(-33.33, Math.round((score / n) * 10000) / 100);
  };
  total.percent = pct(total);
  Object.values(bySubject).forEach((b) => (b.percent = pct(b)));
  Object.values(byTopic).forEach((b) => (b.percent = pct(b)));

  const rawPercent = Math.round((total.correct / Math.max(1, questions.length)) * 10000) / 100;
  return { ...total, rawPercent, bySubject, byTopic };
};

export const percentColor = (p: number) => (p >= 70 ? "text-emerald-600" : p >= 40 ? "text-amber-600" : "text-rose-600");
export const percentBg = (p: number) => (p >= 70 ? "bg-emerald-500" : p >= 40 ? "bg-amber-500" : "bg-rose-500");

export const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};

/** استخراج متن خام (بدون LaTeX) برای جستجو */
export const plainText = (s: string) => s.replace(/\$\$?[^$]*\$\$?/g, " ").replace(/\[\[img:[^\]]+\]\]/g, " ").replace(/<[^>]+>/g, " ").replace(/[*#>`_]/g, "");
