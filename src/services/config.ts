/**
 * پیکربندی اتصال به بک‌اند.
 * برای اتصال به جنگو کافی است:
 *   1) VITE_API_BASE_URL و VITE_MEDIA_BASE_URL را در .env تنظیم کنید
 *   2) VITE_USE_MOCK_API=false
 *   3) HttpApi را در services/index.ts پیاده‌سازی/فعال کنید (قرارداد در services/api.ts)
 */
const env = (import.meta as unknown as { env: Record<string, string | undefined> }).env ?? {};

export const API_BASE_URL: string = env.VITE_API_BASE_URL ?? "/api";
export const MEDIA_BASE_URL: string = env.VITE_MEDIA_BASE_URL ?? "";
export const USE_MOCK_API: boolean = env.VITE_USE_MOCK_API !== "false";

/** تأخیر شبیه‌سازی‌شده‌ی شبکه در حالت mock (میلی‌ثانیه) */
export const MOCK_LATENCY_MS = 120;

/** کلید ذخیره‌ی داده‌های محلی */
export const STORAGE_KEY = "testbank.db.v2";
export const SESSION_KEY = "testbank.session.v2";

/**
 * تبدیل آدرس تصویر به URL قابل نمایش.
 * - data: و http(s): بدون تغییر
 * - مسیر نسبی مثل "/media/..." با MEDIA_BASE_URL ترکیب می‌شود
 */
export const resolveMediaUrl = (src: string): string => {
  if (!src) return "";
  if (/^(data:|blob:|https?:\/\/)/i.test(src)) return src;
  if (!MEDIA_BASE_URL) return src;
  return `${MEDIA_BASE_URL.replace(/\/$/, "")}/${src.replace(/^\//, "")}`;
};
