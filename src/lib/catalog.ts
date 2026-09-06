/** مقایسه‌ی نام‌های فارسی، بدون حساسیت به ی/ک عربی و فاصله/نیم‌فاصله. */
export const catalogNameKey = (value: string): string => value.normalize("NFKC")
  .replace(/[يى]/g, "ی").replace(/ك/g, "ک")
  .replace(/[\u0640\u064b-\u065f\u0670\u200e\u200f\u202a-\u202e]/g, "")
  .replace(/[\s\u200c\u200d]+/g, " ").trim().toLocaleLowerCase("fa");

export const cleanTitle = (value: string): string => value.trim().replace(/\s+/g, " ");
export const unique = <T,>(items: T[]): T[] => [...new Set(items)];
