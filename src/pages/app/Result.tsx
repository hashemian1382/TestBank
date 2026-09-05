import { ArrowRight, Check, Clock, Minus, RotateCcw, Trophy, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { QuestionCard } from "@/components/QuestionCard";
import { Button, Card, Chip, EmptyState, PageHeader, ProgressBar } from "@/components/ui";
import { cn, formatDuration, percentBg, percentColor, toFa } from "@/lib/utils";
import { useApp } from "@/store/AppContext";
import { StartExamModal } from "./ExamStartModal";

type Filter = "all" | "correct" | "wrong" | "blank" | "flagged";

export default function Result() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const { userData, catalog } = useApp();
  const attempt = userData.attempts.find((a) => a.id === attemptId);
  const [filter, setFilter] = useState<Filter>("all");
  const [retry, setRetry] = useState(false);

  const rows = useMemo(() => {
    if (!attempt) return [];
    return attempt.questionIds
      .map((qid, i) => {
        const q = catalog.questionById.get(qid);
        if (!q) return null;
        const a = attempt.answers[qid];
        const state: Exclude<Filter, "all" | "flagged"> = a?.selectedIndex == null ? "blank" : a.selectedIndex === q.correctIndex ? "correct" : "wrong";
        return { q, a, i, state };
      })
      .filter(Boolean) as { q: NonNullable<ReturnType<typeof catalog.questionById.get>>; a: (typeof attempt.answers)[string] | undefined; i: number; state: "correct" | "wrong" | "blank" }[];
  }, [attempt, catalog.questionById]);

  if (!attempt || !attempt.result) return <EmptyState title="نتیجه یافت نشد" action={<Button onClick={() => navigate("/app/exams")}>بازگشت</Button>} />;
  const r = attempt.result;
  const shown = rows.filter((x) => filter === "all" || (filter === "flagged" ? x.a?.flagged : x.state === filter));
  const avgTime = rows.length ? Math.round(attempt.elapsedSeconds / rows.length) : 0;
  const wrongIds = rows.filter((x) => x.state !== "correct").map((x) => x.q.id);

  const message = r.percent >= 80 ? "عالی! تسلط بسیار خوبی دارید 🏆" : r.percent >= 60 ? "خوب بود! کمی تمرین بیشتر لازم است 💪" : r.percent >= 40 ? "متوسط؛ روی مباحث ضعیف تمرکز کنید 📚" : "نیاز به مرور جدی دارید؛ درسنامه‌ها را بخوانید 🔍";

  return (
    <div>
      <Link to="/app/exams" className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand-600">
        <ArrowRight className="h-4 w-4" /> آزمون‌های من
      </Link>
      <PageHeader
        title={`نتیجه: ${attempt.title}`}
        description={message}
        actions={
          <>
            {wrongIds.length > 0 && (
              <Button variant="outline" icon={<RotateCcw className="h-4 w-4" />} onClick={() => setRetry(true)}>
                تمرین مجدد غلط‌ها و نزده‌ها ({toFa(wrongIds.length)})
              </Button>
            )}
            <Button onClick={() => navigate("/app/exams/new")}>آزمون جدید</Button>
          </>
        }
      />

      {/* summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="flex flex-col items-center justify-center p-6 md:row-span-2">
          <div className="relative flex h-36 w-36 items-center justify-center">
            <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="#e2e8f0" strokeWidth="10" />
              <circle cx="50" cy="50" r="42" fill="none" className={percentColor(r.percent)} stroke="currentColor" strokeWidth="10" strokeLinecap="round" strokeDasharray={`${(Math.max(0, r.percent) / 100) * 264} 264`} />
            </svg>
            <div className="text-center">
              <div className={cn("text-3xl font-black", percentColor(r.percent))}>{toFa(r.percent.toFixed(1))}٪</div>
              <div className="text-[11px] text-slate-500">{attempt.negativeMarking ? "با نمره‌ی منفی" : "بدون نمره‌ی منفی"}</div>
            </div>
          </div>
          <Trophy className={cn("mt-2 h-6 w-6", percentColor(r.percent))} />
          {attempt.negativeMarking && <div className="mt-1 text-xs text-slate-500">درصد خام: {toFa(r.rawPercent.toFixed(1))}٪</div>}
        </Card>
        <Stat icon={<Check className="h-5 w-5" />} label="درست" value={toFa(r.correct)} tone="bg-emerald-500" />
        <Stat icon={<X className="h-5 w-5" />} label="غلط" value={toFa(r.wrong)} tone="bg-rose-500" />
        <Stat icon={<Minus className="h-5 w-5" />} label="بدون پاسخ" value={toFa(r.blank)} tone="bg-slate-400" />
        <Stat icon={<Clock className="h-5 w-5" />} label="زمان کل" value={formatDuration(attempt.elapsedSeconds)} tone="bg-sky-500" />
        <Stat icon={<Clock className="h-5 w-5" />} label="میانگین هر سوال" value={formatDuration(avgTime)} tone="bg-violet-500" />
        <Card className="p-4">
          <div className="text-xs text-slate-500">دقت (درست از پاسخ‌داده‌ها)</div>
          <div className="text-xl font-bold text-slate-900">{toFa(r.correct + r.wrong ? Math.round((r.correct / (r.correct + r.wrong)) * 100) : 0)}٪</div>
        </Card>
      </div>

      {/* by subject & topic */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="mb-3 font-bold text-slate-900">عملکرد به تفکیک درس</h3>
          <div className="space-y-3">
            {Object.entries(r.bySubject).map(([sid, b]) => (
              <div key={sid}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>
                    {catalog.subjectById.get(sid)?.emoji} {catalog.subjectById.get(sid)?.title}
                  </span>
                  <span className={cn("font-bold", percentColor(b.percent))}>{toFa(b.percent.toFixed(1))}٪</span>
                </div>
                <ProgressBar value={Math.max(0, b.percent)} color={percentBg(b.percent)} />
                <div className="mt-0.5 text-[11px] text-slate-400">
                  {toFa(b.correct)} درست • {toFa(b.wrong)} غلط • {toFa(b.blank)} نزده
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <h3 className="mb-3 font-bold text-slate-900">عملکرد به تفکیک مبحث</h3>
          <div className="max-h-72 space-y-2.5 overflow-y-auto pl-1">
            {Object.entries(r.byTopic)
              .sort((a, b) => a[1].percent - b[1].percent)
              .map(([tid, b]) => (
                <div key={tid} className="flex items-center gap-3 text-sm">
                  <span className="w-40 shrink-0 truncate text-slate-700">{catalog.topicById.get(tid)?.title}</span>
                  <ProgressBar value={Math.max(0, b.percent)} color={percentBg(b.percent)} className="flex-1" />
                  <span className={cn("w-12 text-left text-xs font-bold", percentColor(b.percent))}>{toFa(Math.round(b.percent))}٪</span>
                  <Link to={`/app/bank?topic=${tid}`} className="text-[11px] text-brand-600 hover:underline">
                    تمرین
                  </Link>
                </div>
              ))}
          </div>
        </Card>
      </div>

      {/* review */}
      <div className="mt-8">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-bold text-slate-900">مرور سوالات</h2>
          <div className="mr-auto flex flex-wrap gap-1.5">
            {(
              [
                ["all", `همه (${toFa(rows.length)})`],
                ["correct", `درست (${toFa(r.correct)})`],
                ["wrong", `غلط (${toFa(r.wrong)})`],
                ["blank", `نزده (${toFa(r.blank)})`],
                ["flagged", `علامت‌دار (${toFa(rows.filter((x) => x.a?.flagged).length)})`],
              ] as const
            ).map(([k, l]) => (
              <Chip key={k} active={filter === k} onClick={() => setFilter(k)}>
                {l}
              </Chip>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          {shown.map(({ q, a, i, state }) => (
            <div key={q.id} className="relative">
              <div className={cn("absolute -right-1 top-4 z-10 h-8 w-1.5 rounded-full", state === "correct" ? "bg-emerald-500" : state === "wrong" ? "bg-rose-500" : "bg-slate-300")} />
              <QuestionCard question={q} index={i} mode="review" selectedIndex={a?.selectedIndex ?? null} extraActions={a?.timeSpent ? <span className="text-[11px] text-slate-400">زمان شما: {formatDuration(a.timeSpent)}</span> : undefined} />
            </div>
          ))}
          {shown.length === 0 && <EmptyState title="سوالی در این دسته نیست" />}
        </div>
      </div>

      {retry && <StartExamModal open={retry} onClose={() => setRetry(false)} title={`تمرین مجدد: ${attempt.title}`} questionIds={wrongIds} sourceType="quick" />}
    </div>
  );
}

function Stat({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: string }) {
  return (
    <Card className="flex items-center gap-3 p-4">
      <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl text-white", tone)}>{icon}</div>
      <div>
        <div className="text-xs text-slate-500">{label}</div>
        <div className="text-xl font-bold text-slate-900">{value}</div>
      </div>
    </Card>
  );
}
