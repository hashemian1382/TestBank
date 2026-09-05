import type { AppSettings, Question, User } from "@/types";
import { CS_QUESTIONS } from "./questions-cs";
import { KONKUR_QUESTIONS } from "./questions-konkur";

export { DOMAINS, SUBJECTS, TOPICS, SOURCES } from "./catalog";
export { LESSONS } from "./lessons";
export { FIGURES } from "./figures";

export const QUESTIONS: Question[] = [...CS_QUESTIONS, ...KONKUR_QUESTIONS];

export const DEFAULT_SETTINGS: AppSettings = {
  referralBonus: 200000,
  signupBonus: 50000,
  currencyLabel: "تومان",
};

/** کاربران پیش‌فرض دمو (رمز عبور همه: 123456) */
export const SEED_USERS: (User & { password: string })[] = [
  {
    id: "u-admin",
    fullName: "مدیر سامانه",
    email: "admin@testbank.ir",
    phone: "09120000000",
    role: "admin",
    avatarSeed: "admin",
    balance: 0,
    referralCode: "ADMIN01",
    purchasedSubjectIds: [],
    bookmarkedQuestionIds: [],
    createdAt: "2024-12-01T08:00:00.000Z",
    password: "123456",
  },
  {
    id: "u-demo",
    fullName: "سارا محمدی",
    email: "demo@testbank.ir",
    phone: "09121234567",
    role: "user",
    avatarSeed: "sara",
    balance: 350000,
    referralCode: "SARA2025",
    purchasedSubjectIds: ["cs-dsa", "cs-os", "r-physics", "shimi"],
    bookmarkedQuestionIds: ["q-dsa-001", "q-os-002", "q-phy-002"],
    createdAt: "2025-01-10T08:00:00.000Z",
    password: "123456",
  },
];
