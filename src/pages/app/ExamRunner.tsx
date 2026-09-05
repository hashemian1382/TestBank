import { AlertTriangle, ChevronLeft, ChevronRight, Flag, Send, Timer, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { AttemptAnswer, ExamAttempt, ID } from "@/types";
import { RichText } from "@/components/RichText";
import { Button, ConfirmDialog, EmptyState, Spinner } from "@/components/ui";
import { cn, formatDuration, OPTION_LABELS, toFa } from "@/lib/utils";
import { api } from "@/services";
import { useApp } from "@/store/AppContext";

export default function ExamRunner() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const { catalog, refreshUserData, toast } = useApp();
  const [attempt, setAttempt] = useState<ExamAttempt | null | undefined>(undefined);
  const [answers, setAnswers] = useState<Record<ID, AttemptAnswer>>({});
  const [current, setCurrent] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const lastTick = useRef(Date.now());
  const finishing = useRef(false);

  useEffect(() => {
    api.getAttempts().then((list) => {
      const a = list.find((x) => x.id === attemptId) ?? null;
      setAttempt(a);
      if (a) {
        setAnswers(a.answers);
        setElapsed(a.elapsedSeconds);
        if (a.status === "finished") navigate(`/app/results/${a.id}`, { replace: true });
      }
    });
  }, [attemptId, navigate]);

  const questions = useMemo(() => (attempt ? (attempt.questionIds.map((id) => catalog.questionById.get(id)).filter(Boolean) as NonNullable<ReturnType<typeof catalog.questionById.get>>[]) : []), [attempt, catalog.questionById]);
  const q = questions[current];
  const totalSeconds = attempt?.durationMinutes ? attempt.durationMinutes * 60 : null;
  const remaining = totalSeconds !== null ? totalSeconds - elapsed : null;

  const finish = useCallback(async () => {
    if (!attempt || finishing.current) return;
    finishing.current = true;
    try {
      await api.finishAttempt(attempt.id, answers, elapsed);
      await refreshUserData();
      navigate(`/app/results/${attempt.id}`, { replace: true });
    } catch {
      finishing.current = false;
      toast("خطا در ثبت آزمون", "error");
    }
  }, [attempt, answers, elapsed, navigate, refreshUserData, toast]);

  // timer
  useEffect(() => {
    if (!attempt) return;
    lastTick.current = Date.now();
    const t = setInterval(() => {
      const now = Date.now();
      const delta = Math.round((now - lastTick.current) / 1000);
      lastTick.current = now;
      setElapsed((e) => e + delta);
      setAnswers((a) => {
        const qid = attempt.questionIds[current];
        const prev = a[qid] ?? { questionId: qid, selectedIndex: null, timeSpent: 0, flagged: false };
        return { ...a, [qid]: { ...prev, timeSpent: prev.timeSpent + delta } };
      });
    }, 1000);
    return () => clearInterval(t);
  }, [attempt, current]);

  // autosave every 10s (با ref تا اینتروال با هر تغییر state ریست نشود)
  const latest = useRef({ answers, elapsed });
  latest.current = { answers, elapsed };
  useEffect(() => {
    if (!attempt) return;
    const t = setInterval(() => api.saveAttemptProgress(attempt.id, latest.current.answers, latest.current.elapsed).catch(() => {}), 10000);
    return () => clearInterval(t);
  }, [attempt]);

  // time over
  useEffect(() => {
    if (remaining !== null && remaining <= 0 && attempt && !finishing.current) {
      toast("زمان آزمون به پایان رسید", "info");
      finish();
    }
  }, [remaining, attempt, finish, toast]);

  // keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!q) return;
      if (["1", "2", "3", "4"].includes(e.key)) select(Number(e.key) - 1);
      if (e.key === "ArrowLeft") setCurrent((c) => Math.min(questions.length - 1, c + 1));
      if (e.key === "ArrowRight") setCurrent((c) => Math.max(0, c - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, questions.length]);

  const select = (i: number) => {
    if (!q) return;
    setAnswers((a) => {
      const prev = a[q.id] ?? { questionId: q.id, selectedIndex: null, timeSpent: 0, flagged: false };
      return { ...a, [q.id]: { ...prev, selectedIndex: prev.selectedIndex === i ? null : i } };
    });
  };
  const toggleFlag = () => {
    if (!q) return;
    setAnswers((a) => {
      const prev = a[q.id] ?? { questionId: q.id, selectedIndex: null, timeSpent: 0, flagged: false };
      return { ...a, [q.id]: { ...prev, flagged: !prev.flagged } };
    });
  };

  if (attempt === undefined) return <Spinner />;
  if (!attempt || !q) return <EmptyState title="آزمون یافت نشد" action={<Button onClick={() => navigate("/app/exams")}>بازگشت</Button>} />;

  const answered = Object.values(answers).filter((a) => a.selectedIndex !== null).length;
  const flagged = Object.values(answers).filter((a) => a.flagged).length;
  const urgent = remaining !== null && remaining < 60;

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-slate-50">
      {/* top bar */}
      <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
        <button
          onClick={() => setConfirmExit(true)}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          title="خروج موقت (پیشرفت ذخیره می‌شود)"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold text-slate-900">{attempt.title}</div>
          <div className="text-xs text-slate-500">
            سوال {toFa(current + 1)} از {toFa(questions.length)} • {toFa(answered)} پاسخ‌داده‌شده
          </div>
        </div>
        <div className={cn("flex items-center gap-2 rounded-xl px-3 py-1.5 font-mono text-sm font-bold", remaining === null ? "bg-slate-100 text-slate-700" : urgent ? "animate-pulse bg-rose-100 text-rose-700" : "bg-brand-50 text-brand-700")}>
          <Timer className="h-4 w-4" />
          {remaining === null ? formatDuration(elapsed) : formatDuration(Math.max(0, remaining))}
        </div>
        <Button size="sm" variant="success" icon={<Send className="h-3.5 w-3.5" />} onClick={() => setConfirmFinish(true)}>
          پایان آزمون
        </Button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* question */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl px-4 py-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7 animate-fade-up" key={q.id}>
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-sm font-bold text-white">{toFa(current + 1)}</span>
                  <span className="text-xs text-slate-500">{q.subjectIds.map((s) => catalog.subjectById.get(s)?.title).join(" / ")}</span>
                </div>
                <button onClick={toggleFlag} className={cn("inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition", answers[q.id]?.flagged ? "bg-amber-100 text-amber-700" : "text-slate-500 hover:bg-slate-100")}>
                  <Flag className={cn("h-3.5 w-3.5", answers[q.id]?.flagged && "fill-current")} /> {answers[q.id]?.flagged ? "علامت‌دار" : "علامت‌گذاری"}
                </button>
              </div>
              <RichText text={q.stem} images={q.images} className="text-base leading-9 text-slate-800" />
              <div className="mt-5 grid gap-2.5">
                {q.options.map((opt, i) => {
                  const picked = answers[q.id]?.selectedIndex === i;
                  return (
                    <button key={i} onClick={() => select(i)} className={cn("flex items-start gap-3 rounded-xl border-2 p-3.5 text-right text-[15px] transition", picked ? "border-brand-600 bg-brand-50" : "border-slate-200 bg-white hover:border-brand-300")}>
                      <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm font-bold", picked ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600")}>{OPTION_LABELS[i]}</span>
                      <RichText text={opt} inline className="leading-8" />
                    </button>
                  );
                })}
              </div>
              {answers[q.id]?.selectedIndex != null && (
                <button onClick={() => select(answers[q.id].selectedIndex!)} className="mt-3 text-xs text-slate-500 hover:text-rose-600">
                  پاک کردن پاسخ
                </button>
              )}
            </div>

            <div className="mt-4 flex items-center justify-between">
              <Button variant="outline" disabled={current === 0} onClick={() => setCurrent((c) => c - 1)} icon={<ChevronRight className="h-4 w-4" />}>
                قبلی
              </Button>
              <span className="text-xs text-slate-400">کلیدهای ۱ تا ۴ برای انتخاب گزینه، ← → برای جابه‌جایی</span>
              {current < questions.length - 1 ? (
                <Button onClick={() => setCurrent((c) => c + 1)}>
                  بعدی <ChevronLeft className="h-4 w-4" />
                </Button>
              ) : (
                <Button variant="success" onClick={() => setConfirmFinish(true)}>
                  پایان آزمون
                </Button>
              )}
            </div>
          </div>
        </main>

        {/* navigator */}
        <aside className="hidden w-64 shrink-0 overflow-y-auto border-r border-slate-200 bg-white p-4 lg:block">
          <div className="mb-3 text-xs font-semibold text-slate-500">پاسخ‌نامه</div>
          <div className="grid grid-cols-5 gap-1.5">
            {questions.map((qq, i) => {
              const a = answers[qq.id];
              return (
                <button
                  key={qq.id}
                  onClick={() => setCurrent(i)}
                  className={cn(
                    "relative flex h-9 items-center justify-center rounded-lg text-xs font-bold transition",
                    i === current ? "ring-2 ring-brand-600 ring-offset-1" : "",
                    a?.selectedIndex != null ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  )}
                >
                  {toFa(i + 1)}
                  {a?.flagged && <span className="absolute -top-1 -left-1 h-2.5 w-2.5 rounded-full bg-amber-400" />}
                </button>
              );
            })}
          </div>
          <div className="mt-4 space-y-1.5 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded bg-brand-600" /> پاسخ‌داده ({toFa(answered)})
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded bg-slate-200" /> بدون پاسخ ({toFa(questions.length - answered)})
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-amber-400" /> علامت‌دار ({toFa(flagged)})
            </div>
          </div>
        </aside>
      </div>

      {/* mobile navigator */}
      <div className="flex gap-1 overflow-x-auto border-t border-slate-200 bg-white px-3 py-2 lg:hidden">
        {questions.map((qq, i) => (
          <button key={qq.id} onClick={() => setCurrent(i)} className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold", i === current ? "ring-2 ring-brand-600" : "", answers[qq.id]?.selectedIndex != null ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600")}>
            {toFa(i + 1)}
          </button>
        ))}
      </div>

      <ConfirmDialog
        open={confirmFinish}
        onClose={() => setConfirmFinish(false)}
        title="پایان آزمون"
        message={`${toFa(answered)} سوال از ${toFa(questions.length)} را پاسخ داده‌اید${questions.length - answered > 0 ? ` و ${toFa(questions.length - answered)} سوال بی‌پاسخ است` : ""}. آزمون ثبت شود؟`}
        confirmText="ثبت و مشاهده‌ی نتیجه"
        onConfirm={finish}
      />
      <ConfirmDialog
        open={confirmExit}
        onClose={() => setConfirmExit(false)}
        title="خروج از آزمون"
        message="پیشرفت شما ذخیره می‌شود و می‌توانید بعداً از بخش «آزمون‌های من» ادامه دهید."
        confirmText="خروج"
        onConfirm={async () => {
          await api.saveAttemptProgress(attempt.id, answers, elapsed);
          await refreshUserData();
          navigate("/app/exams");
        }}
      />
      {urgent && (
        <div className="pointer-events-none fixed bottom-16 left-1/2 -translate-x-1/2 rounded-xl bg-rose-600 px-4 py-2 text-sm text-white shadow-lg lg:bottom-4">
          <AlertTriangle className="ml-1 inline h-4 w-4" /> کمتر از یک دقیقه باقی مانده!
        </div>
      )}
    </div>
  );
}
