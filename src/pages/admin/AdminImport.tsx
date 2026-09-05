import { AlertCircle, CheckCircle2, FileJson, Upload } from "lucide-react";
import { useState } from "react";
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
  const { refreshCatalog, toast } = useApp();
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<BulkQuestionRow[] | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [result, setResult] = useState<BulkImportResult | null>(null);
  const [busy, setBusy] = useState(false);

  const parse = (t: string) => {
    setText(t);
    setResult(null);
    try {
      const j = JSON.parse(t);
      const arr = Array.isArray(j) ? j : j.questions;
      if (!Array.isArray(arr)) throw new Error("ساختار باید آرایه‌ای از سوالات یا {questions: [...]} باشد");
      setParsed(arr);
      setParseError(null);
    } catch (e) {
      setParsed(null);
      setParseError(t.trim() ? (e as Error).message : null);
    }
  };

  const run = async () => {
    if (!parsed) return;
    setBusy(true);
    try {
      const r = await api.admin.bulkImportQuestions(parsed);
      setResult(r);
      await refreshCatalog();
      toast(`${toFa(r.imported)} سوال وارد شد`, r.errors.length ? "info" : "success");
    } finally {
      setBusy(false);
    }
  };

  const onFile = (f: File) => {
    const reader = new FileReader();
    reader.onload = () => parse(String(reader.result));
    reader.readAsText(f);
  };

  return (
    <div>
      <PageHeader title="ورود گروهی سوالات" description="سوالات را با فرمت JSON به‌صورت یک‌جا اضافه کنید. درس، مبحث و منبع را می‌توانید با شناسه یا عنوان دقیق مشخص کنید." />
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          <Card className="p-4">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm hover:bg-slate-50">
                <Upload className="h-4 w-4" /> انتخاب فایل JSON
                <input type="file" accept=".json,application/json" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
              </label>
              <Button size="sm" variant="ghost" onClick={() => parse(JSON.stringify(SAMPLE, null, 2))} icon={<FileJson className="h-4 w-4" />}>
                بارگذاری نمونه
              </Button>
              {parsed && <span className="mr-auto text-xs text-emerald-600">{toFa(parsed.length)} سوال شناسایی شد</span>}
            </div>
            <Textarea ltr rows={22} value={text} onChange={(e) => parse(e.target.value)} placeholder='[{"subjects": ["cs-os"], "topics": ["زمان‌بندی CPU"], "stem": "...", "options": ["...","...","...","..."], "correct": 1, ...}]' />
            {parseError && (
              <div className="mt-2 flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
                <AlertCircle className="h-4 w-4" /> {parseError}
              </div>
            )}
            <Button className="mt-3 w-full" disabled={!parsed?.length} loading={busy} onClick={run} icon={<Upload className="h-4 w-4" />}>
              وارد کردن {parsed?.length ? toFa(parsed.length) : ""} سوال
            </Button>
          </Card>

          {result && (
            <Card className="p-4">
              <div className="flex items-center gap-2 text-sm font-bold text-emerald-700">
                <CheckCircle2 className="h-5 w-5" /> {toFa(result.imported)} سوال با موفقیت وارد شد
              </div>
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
              <code className="rounded bg-slate-100 px-1">topics</code>: شناسه یا عنوان مبحث (باید متعلق به درس‌های انتخابی باشد).
            </li>
            <li>
              <code className="rounded bg-slate-100 px-1">options</code>: دقیقاً ۴ گزینه. <code className="rounded bg-slate-100 px-1">correct</code>: شماره‌ی گزینه‌ی صحیح (۱ تا ۴).
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
              خروجی JSON از صفحه‌ی «مدیریت سوالات» با همین فرمت سازگار است.
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
