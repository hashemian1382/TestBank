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

## قراردادهای افزوده‌شده: درسنامه و مباحث

همه‌ی ورودی‌ها و خروجی‌ها در `src/types/index.ts` تعریف شده‌اند؛ UI همچنان داده را از `api` می‌خواند و می‌نویسد. فایل‌های اعتبارسنجی/رندر، توابع مشترک و بدون دسترسی مستقل به حافظه هستند.

### درسنامه

- `LessonInput`: `topicId`, `title`, `content`, `images`, `readingMinutes` و `summary`, `tags`, `status`, `order`.
- `status`: `draft | published`. در seed/داده‌ی قدیمی، نبودن status معادل published است؛ در ایجاد جدید پیش‌فرض draft است.
- `createdAt` و `updatedAt` سمت سرویس تولید می‌شوند. شناسه با patch قابل تغییر نیست.
- `GET /catalog/lessons` برای غیرمدیر پیش‌نویس برنمی‌گرداند. کنترل مالکیت محتوای پولی باید در HttpApi/سرور واقعی انجام شود.
- `POST/PATCH/DELETE /admin/lessons[/:id]`: حذف باید اتصال‌ها را در `questions.lessonIds` پاک کند. انتقال به درس دیگر وقتی سوالی از درس قبلی متصل است باید رد شود.

### اتصال سوال و درسنامه

`Question.lessonIds?: ID[]` اتصال مستقیم است؛ پیشنهاد خودکار مبحث مستقل از آن باقی می‌ماند.

```ts
createQuestion(input: QuestionSaveInput): Promise<Question>
updateQuestion(id: ID, patch: QuestionPatch): Promise<Question>
```

هر دو ورودی می‌توانند `newLessons?: LessonInput[]` داشته باشند. سرور باید در **یک تراکنش**:

1. درسنامه‌های تازه را اعتبارسنجی و شناسه تولید کند؛
2. شناسه‌ها را به `lessonIds` سوال اضافه کند؛
3. وجود درس/مبحث/منبع، گزینه‌ها و تعلق درسنامه‌ها به درس‌های سوال را بررسی کند؛
4. تمام تغییرات را commit کند، یا هیچ‌کدام را ثبت نکند.

فیلد `newLessons` در مدل ذخیره‌شده‌ی Question قرار نمی‌گیرد. `id` و `createdAt` قابل patch نیستند. برای مبحث پیش‌نیاز میان‌درسی در داده‌های قدیمی، ویرایش بدون تغییر درس‌ها می‌تواند همان ارجاع موجود را حفظ کند؛ این استثنا اجازه‌ی افزودن ارجاع ناسازگار تازه را نمی‌دهد.

### مباحث

```ts
updateTopic(id, { title?, order? })
reorderTopics(subjectId, topicIds)
previewTopicMerge({ subjectId, topicIds, title, targetTopicId? })
mergeTopics({ subjectId, topicIds, title, targetTopicId? })
```

Endpointهای پیشنهادی:

- `PATCH /admin/topics/:id`
- `POST /admin/topics/reorder`
- `POST /admin/topics/merge-preview`
- `POST /admin/topics/merge`

`TopicMergePreview` تعداد unique سوال‌ها/درسنامه‌ها/قالب‌ها/اجراهای آزمون را همراه مباحث مبدأ و مقصد برمی‌گرداند. `TopicMergeResult` علاوه بر آن `removedTopicIds` دارد. عملیات merge باید دوباره اعتبارسنجی شود؛ preview قفل داده نیست.

در ادغام، تمام سوال‌ها (حتی غیرفعال)، درسنامه‌ها، blueprintها و snapshotهای نتیجه‌ی همه‌ی کاربران به مقصد اشاره می‌کنند. آرایه‌ی topicIds deduplicate می‌شود. `result.byTopic` باید از جزئیات سوال‌ها بازسازی شود؛ **جمع bucketهای قدیمی غلط است** چون یک سوال می‌تواند چند مبحثِ ادغام‌شونده داشته باشد. نمره‌ی کل و `bySubject` ثابت می‌مانند.

نام‌های قدیمی در `Topic.aliases` و شناسه‌های قدیمی در `Topic.mergedIds` نگه داشته می‌شوند. یکتایی عنوان در هر درس باید عنوان‌ها و aliasها را با یک normalization واحد بررسی کند. نام جدیدِ برخوردکننده با مبحث انتخاب‌نشده باید رد شود، نه آنکه بی‌اجازه آن مبحث هم ادغام شود.

### ورود گروهی

`BulkTopicRef` یکی از این‌هاست:

- شناسه‌ی مبحث موجود (فقط همان مبحث؛ باید به یکی از درس‌های سوال تعلق داشته باشد)؛
- عنوان ساده (در **هر درس انتخابی** resolve-or-create)؛
- `{ subject: "شناسه یا نام درس", title: "عنوان مبحث" }` برای scope صریح.

`BulkImportResult`: `imported`, `createdTopics: Topic[]`, `errors: { row, message }[]`؛ شماره‌ی ردیف از ۱ است. در backend از savepoint برای هر ردیف استفاده کنید تا ردیف خراب نه سوال و نه مبحث بسازد. درس ناموجود ساخته نمی‌شود. منبع صریح نامعتبر، گزینه/زمان/سطح نامعتبر و نام مبحث خالی خطای واقعی‌اند.

### ذخیره‌ی نتایج و مهاجرت

`ExamAttempt.resultQuestions` تصویر سبک `{id, subjectIds, topicIds, correctIndex}[]` هنگام پایان آزمون است. برای نسخه‌ی ۲ این اطلاعات از سوال‌های موجود تکمیل می‌شود؛ اگر اطلاعات تاریخی از قبل از بین رفته باشند قابل اختراع نیستند. LocalApi ادغام با سابقه‌ی فاقد جزئیات لازم را متوقف می‌کند.

نسخه‌ی داخلی DB برابر ۳ است ولی کلید localStorage همان `testbank.db.v2` می‌ماند. مهاجرت فقط افزایشی است؛ نسخه/JSON نامعتبر نباید موجب reseed و از دست رفتن داده شود. LocalStore ابتدا clone می‌کند، سپس persist، سپس نسخه‌ی درون حافظه را عوض می‌کند. خطای سهمیه با `ApiError` و status داخلی `507` به UI می‌رسد.

`getQuestions({includeInactive:true})` فقط برای مدیر موثر است؛ فیلتر عادی همچنان سوال‌های غیرفعال را کنار می‌گذارد. محدودیت نقش‌ها در LocalApi/React جای امنیت سمت سرور را نمی‌گیرد.
