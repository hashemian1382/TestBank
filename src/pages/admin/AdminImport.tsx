import { AlertCircle, CheckCircle2, FileJson, Upload } from "lucide-react";
import { useRef, useState } from "react";
import type { BulkImportResult, BulkQuestionRow } from "@/types";
import { Button, Card, PageHeader, Textarea } from "@/components/ui";
import { toFa } from "@/lib/utils";
import { api } from "@/services";
import { useApp } from "@/store/AppContext";

const SAMPLE: BulkQuestionRow[] = [
  {
    subjects: ["cs-os"],
    topics: ["زمان‌بندی CPU"],
    stem: "در الگوریتم Round Robin با کوانتوم بسیار بزرگ، رفتار زمان‌بند به کدام الگوریتم نزدیک می‌شود؟",
    options: ["FCFS", "SJF", "Priority", "Multilevel Queue"],
    correct: 1,
    explanation: "با کوانتوم بزرگ، هر فرآیند تا پایان اجرا می‌شود و RR معادل **FCFS** خواهد بود.",
    difficulty: 1,
    source: "src-talifi",
    tags: ["زمان‌بندی", "RR"],
  },
  {
    subjects: ["r-physics", "t-physics"],
    topics: ["r-physics-t10", "t-physics-t8"],
    stem: "متحرکی با شتاب ثابت $a = 2\\ \\text{m/s}^2$ از حال سکون شروع به حرکت می‌کند. پس از $5$ ثانیه چند متر جابه‌جا شده است؟\n[[img:fig1]]",
    options: ["$25$", "$50$", "$10$", "$20$"],
    correct: 1,
    explanation: "$$x = \\frac{1}{2}at^2 = \\frac{1}{2}(2)(25) = 25\\ \\text{m}$$",
    difficulty: 1,
    source: "تألیفی تست‌بانک",
    tags: ["حرکت‌شناسی"],
    images: [{ id: "fig1", src: "/media/questions/sample/fig1.png", alt: "نمودار حرکت", caption: "شکل ۱" }],
    estimatedSeconds: 60,
  },
];

export default function AdminImport() {
  const { catalog, refreshCatalog, toast } = useApp();
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<BulkQuestionRow[] | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [result, setResult] = useState<BulkImportResult | null>(null);
  const [busy, setBusy] = useState(false);
  const running = useRef(false);

  const parse = (t: string) => {
    setText(t);
    setResult(null);
    try {
      const j: unknown = JSON.parse(t.replace(/^\uFEFF/, ""));
      const arr = Array.isArray(j) ? j : j && typeof j === "object" && "questions" in j ? j.questions : undefined;
      if (!Array.isArray(arr)) throw new Error("ساختار باید آرایه‌ای از سوالات یا {questions: [...]} باشد");
      setParsed(arr);
      setParseError(null);
    } catch (e) {
      setParsed(null);
      setParseError(t.trim() ? (e as Error).message : null);
    }
  };

  const run = async () => {
    if (!parsed || running.current || result) return;
    running.current = true;
    setBusy(true);
    try {
      const r = await api.admin.bulkImportQuestions(parsed);
      setResult(r);
      await refreshCatalog();
      toast(`${toFa(r.imported)} سوال وارد شد`, r.errors.length ? "info" : "success");
    } catch (error) {
      toast(error instanceof Error ? error.message : "ورود گروهی انجام نشد", "error");
    } finally {
      running.current = false;
      setBusy(false);
    }
  };

  const onFile = (f: File) => {
    if (busy) return;
    if (f.size > 10 * 1024 * 1024) return toast("فایل بزرگ‌تر از ۱۰ مگابایت است؛ آن را به چند فایل کوچک‌تر تقسیم کنید", "error");
    setBusy(true);
    const reader = new FileReader();
    reader.onload = () => { parse(String(reader.result)); setBusy(false); };
    reader.onerror = () => { toast("خواندن فایل JSON انجام نشد", "error"); setBusy(false); };
    reader.readAsText(f);
  };

  return (
    <div>
      <PageHeader title="ورود گروهی سوالات" description="سوالات را با فرمت JSON به‌صورت یک‌جا اضافه کنید. درس، مبحث و منبع را می‌توانید با شناسه یا عنوان مشخص کنید؛ مباحث ناموجود به‌صورت خودکار ساخته می‌شوند." />
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          <Card className="p-4">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm hover:bg-slate-50">
                <Upload className="h-4 w-4" /> انتخاب فایل JSON
                <input type="file" disabled={busy} accept=".json,application/json" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
              </label>
              <Button size="sm" disabled={busy} variant="ghost" onClick={() => parse(JSON.stringify(SAMPLE, null, 2))} icon={<FileJson className="h-4 w-4" />}>
                بارگذاری نمونه
              </Button>
              {parsed && <span className="mr-auto text-xs text-emerald-600">{toFa(parsed.length)} سوال شناسایی شد</span>}
            </div>
            <Textarea label="JSON سوالات" disabled={busy} ltr rows={22} value={text} onChange={(e) => parse(e.target.value)} placeholder='[{"subjects": ["cs-os"], "topics": ["زمان‌بندی CPU"], "stem": "...", "options": ["...","...","...","..."], "correct": 1, ...}]' />
            {parseError && (
              <div className="mt-2 flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
                <AlertCircle className="h-4 w-4" /> {parseError}
              </div>
            )}
            <Button className="mt-3 w-full" disabled={!parsed?.length || !!result} loading={busy} onClick={run} icon={<Upload className="h-4 w-4" />}>
              وارد کردن {parsed?.length ? toFa(parsed.length) : ""} سوال
            </Button>
          </Card>

          {result && (
            <Card className="p-4">
              <div className="flex items-center gap-2 text-sm font-bold text-emerald-700">
                <CheckCircle2 className="h-5 w-5" /> {toFa(result.imported)} سوال با موفقیت وارد شد
              </div>
              {result.createdTopics.length > 0 && <div className="mt-3 rounded-xl border border-brand-100 bg-brand-50/60 p-3">
                <h3 className="mb-2 text-sm font-semibold text-brand-800">{toFa(result.createdTopics.length)} مبحث جدید خودکار ساخته شد</h3>
                <ul className="max-h-48 space-y-1 overflow-y-auto text-xs leading-6 text-brand-700">{result.createdTopics.map((topic) => <li key={topic.id}>{catalog.subjectById.get(topic.subjectId)?.title} ← {topic.title}</li>)}</ul>
              </div>}
              <p className="mt-2 text-xs leading-6 text-slate-500">برای جلوگیری از ورود تکراری، این ورودی دوباره ثبت نمی‌شود. برای ورود بعدی، متن را ویرایش یا فایل تازه‌ای انتخاب کنید.</p>
              {result.errors.length > 0 && (
                <div className="mt-3">
                  <div className="mb-1 text-sm font-medium text-rose-700">{toFa(result.errors.length)} ردیف با خطا:</div>
                  <ul className="max-h-48 space-y-1 overflow-y-auto text-xs text-rose-600">
                    {result.errors.map((e) => (
                      <li key={e.row}>
                        ردیف {toFa(e.row)}: {e.message}
                      </li>
                    ))}
                  </ul>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => parse(JSON.stringify(result.errors.map((error) => parsed?.[error.row - 1]), null, 2))}>اصلاح فقط ردیف‌های ناموفق</Button>
                </div>
              )}
            </Card>
          )}
        </div>

        <Card className="p-4 text-sm lg:col-span-2">
          <h3 className="mb-2 font-bold text-slate-900">راهنمای فرمت</h3>
          <ul className="space-y-2 text-slate-600">
            <li>
              <code className="rounded bg-slate-100 px-1">subjects</code>: آرایه‌ای از شناسه یا عنوان درس (مثلاً <code className="rounded bg-slate-100 px-1">"cs-os"</code> یا <code className="rounded bg-slate-100 px-1">"سیستم عامل"</code>). چند درس = سوال مشترک.
            </li>
            <li>
              <code className="rounded bg-slate-100 px-1">topics</code>: شناسه یا عنوان مبحث. نام جدید بدون خطا زیر درس سوال ساخته می‌شود و در ردیف‌های بعد دوباره استفاده می‌شود. تفاوت ی/ک عربی و فاصله/نیم‌فاصله باعث تکرار نمی‌شود.
            </li>
            <li>در سوال چنددرسی، عنوان ساده‌ی مبحث در <b>هر یک از درس‌های انتخابی</b> پیدا یا ساخته می‌شود. برای اختصاص فقط به یک درس، شناسه‌ی مبحث یا <code dir="ltr">{'{"subject":"cs-os","title":"مبحث جدید"}'}</code> بنویسید. شناسه‌ی مبحثِ درس دیگر پذیرفته نمی‌شود.</li>
            <li>ردیف نامعتبر نه سوال می‌سازد و نه مبحث. سوال‌های سالم وارد می‌شوند و شماره و دلیل خطای بقیه گزارش می‌شود. نام‌های قدیمی پس از ادغام/ویرایش به مبحث فعلی هدایت می‌شوند.</li>
            <li>
              <code className="rounded bg-slate-100 px-1">options</code>: دقیقاً ۴ گزینه. <code className="rounded bg-slate-100 px-1">correct</code>: شماره‌ی گزینه‌ی صحیح (۱ تا ۴). اگر شماره‌گذاری شما ۰ تا ۳ است، <code dir="ltr">correctBase: 0</code> را در همان ردیف اضافه کنید. صفرِ بدون correctBase نیز برای سازگاری قدیمی به‌عنوان گزینه‌ی اول پذیرفته می‌شود.
            </li>
            <li>
              LaTeX: <code className="rounded bg-slate-100 px-1">$...$</code> درون‌خطی و <code className="rounded bg-slate-100 px-1">$$...$$</code> نمایشی. در JSON بک‌اسلش‌ها را دوبار بنویسید (<code className="rounded bg-slate-100 px-1">\\frac</code>).
            </li>
            <li>
              تصاویر: در <code className="rounded bg-slate-100 px-1">images</code> با <code className="rounded bg-slate-100 px-1">id, src, alt, caption</code> تعریف و در متن با <code className="rounded bg-slate-100 px-1">[[img:ID]]</code> استفاده کنید. <code className="rounded bg-slate-100 px-1">src</code> می‌تواند مسیر نسبی سرور رسانه باشد.
            </li>
            <li>
              <code className="rounded bg-slate-100 px-1">difficulty</code>: ۱ (آسان)، ۲ (متوسط)، ۳ (دشوار). <code className="rounded bg-slate-100 px-1">source</code>: شناسه یا عنوان منبع (پیش‌فرض: تألیفی).
            </li>
            <li>
              <code dir="ltr">lessonIds</code>: شناسه‌های درسنامه‌های موجود برای اتصال مستقیم (از درس‌های سوال). <code dir="ltr">isActive</code>: وضعیت سوال. خروجی JSON صفحه‌ی «مدیریت سوالات» این اتصال‌ها را هم حفظ می‌کند.
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
