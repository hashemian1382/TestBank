# لایه‌ی سرویس (اتصال به بک‌اند)

UI فقط از طریق `api` (نمونه‌ی `BankApi` در `api.ts`) با داده کار می‌کند. هیچ کامپوننتی مستقیماً به localStorage یا داده‌های seed دسترسی ندارد.

## اتصال به جنگو / DRF

1. فایل `.env` بسازید:
   ```
   VITE_USE_MOCK_API=false
   VITE_API_BASE_URL=https://api.example.com/v1
   VITE_MEDIA_BASE_URL=https://media.example.com
   ```
2. کلاس `HttpApi implements BankApi` بنویسید (fetch/axios + توکن JWT در هدر). نگاشت پیشنهادی endpointها کنار هر متد در `api.ts` کامنت شده است.
3. در `index.ts` بر اساس `USE_MOCK_API` بین `LocalApi` و `HttpApi` سوئیچ کنید.

## نکات

- **تصاویر:** فیلد `src` در `QuestionImage` می‌تواند مسیر نسبی (`/media/q/123.png`) باشد؛ `resolveMediaUrl` آن را با `MEDIA_BASE_URL` ترکیب می‌کند. در متن‌ها با `[[img:ID]]` ارجاع داده می‌شود.
- **فیلتر سوالات:** منطق فیلتر در `lib/questionFilter.ts` خالص است و همان `QuestionFilter` را می‌توان به query-string تبدیل و به سرور فرستاد.
- **نتیجه‌ی آزمون:** `computeResult` در کلاینت است، اما سرور باید همین محاسبه را برای اعتبار انجام دهد (نمره‌ی منفی ۱/۳).
- **ورود گروهی:** فرمت `BulkQuestionRow` هم برای UI و هم برای endpoint `POST /admin/questions/bulk` مناسب است.
- **نام فیلدها:** camelCase؛ در `HttpApi` می‌توانید با یک تابع `snakeToCamel` پاسخ‌های DRF را تبدیل کنید.
