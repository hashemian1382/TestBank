import type { Question } from "@/types";

/** رشته‌ی خام برای نوشتن راحت LaTeX بدون escape کردن بک‌اسلش */
export const r = String.raw;

type Required = Pick<Question, "id" | "subjectIds" | "topicIds" | "stem" | "options" | "correctIndex" | "explanation" | "sourceId">;
type Optional = Partial<Omit<Question, keyof Required>>;

const SEED_DATE = "2025-01-15T08:00:00.000Z";

/** سازنده‌ی سوال با مقادیر پیش‌فرض */
export const q = (p: Required & Optional): Question => ({
  difficulty: 2,
  tags: [],
  images: [],
  estimatedSeconds: 90,
  isActive: true,
  createdAt: SEED_DATE,
  updatedAt: SEED_DATE,
  ...p,
});
