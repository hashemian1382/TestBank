import type { BankApi } from "./api";
import { USE_MOCK_API } from "./config";
import { LocalApi } from "./localApi";

/**
 * نمونه‌ی سراسری API.
 * برای اتصال به بک‌اند واقعی، یک کلاس HttpApi با همین قرارداد (BankApi) بنویسید
 * و در اینجا بر اساس USE_MOCK_API انتخاب کنید. UI هیچ تغییری نیاز نخواهد داشت.
 */
const createApi = (): BankApi => {
  if (!USE_MOCK_API) {
    console.warn("[api] HttpApi هنوز پیاده‌سازی نشده؛ از LocalApi استفاده می‌شود.");
  }
  return new LocalApi();
};

export const api: BankApi = createApi();
export { ApiError } from "./api";
export type { BankApi } from "./api";
export { resolveMediaUrl } from "./config";
