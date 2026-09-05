import { Clock, FileText, History, Pencil, Play, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { ExamTemplate } from "@/types";
import { Badge, Button, Card, ConfirmDialog, EmptyState, PageHeader } from "@/components/ui";
import { cn, formatDateTime, percentBg, percentColor, relativeTime, toFa } from "@/lib/utils";
import { api } from "@/services";
import { useApp } from "@/store/AppContext";
import { StartExamModal } from "./ExamStartModal";

export default function Exams() {
  const { userData, refreshUserData, toast } = useApp();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"templates" | "history">("templates");
  const [start, setStart] = useState<ExamTemplate | null>(null);
  const [del, setDel] = useState<{ kind: "template" | "attempt"; id: string } | null>(null);

  return (
    <div>
      <PageHeader
        title="آزمون‌های من"
        description="قالب‌های ذخیره‌شده و تاریخچه‌ی آزمون‌ها"
        actions={
          <Link to="/app/exams/new">
            <Button icon={<Plus className="h-4 w-4" />}>آزمون جدید</Button>
          </Link>
        }
      />
      <div className="mb-5 flex w-fit rounded-xl bg-slate-100 p-1">
        {(
          [
            ["templates", "قالب‌های آزمون", <FileText key="t" className="h-4 w-4" />],
            ["history", "تاریخچه", <History key="h" className="h-4 w-4" />],
          ] as const
        ).map(([k, l, i]) => (
          <button key={k} onClick={() => setTab(k)} className={cn("flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition", tab === k ? "bg-white text-slate-900 shadow-sm" : "text-slate-500")}>
            {i} {l}
          </button>
        ))}
      </div>

      {tab === "templates" &&
        (userData.templates.length === 0 ? (
          <EmptyState icon={<FileText className="h-6 w-6" />} title="قالبی ذخیره نشده" description="در آزمون‌ساز، آزمون بسازید و به‌عنوان قالب ذخیره کنید تا بارها آن را اجرا کنید." action={<Button onClick={() => navigate("/app/exams/new")}>رفتن به آزمون‌ساز</Button>} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {userData.templates.map((t) => {
              const attempts = userData.attempts.filter((a) => a.sourceId === t.id && a.status === "finished");
              const best = attempts.length ? Math.max(...attempts.map((a) => a.result?.percent ?? 0)) : null;
              return (
                <Card key={t.id} className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-slate-900">{t.title}</h3>
                      <div className="mt-1 flex flex-wrap gap-1.5 text-xs text-slate-500">
                        <Badge>{toFa(t.questionIds.length)} سوال</Badge>
                        <Badge>{t.durationMinutes ? `${toFa(t.durationMinutes)} دقیقه` : "بدون زمان"}</Badge>
                        {t.negativeMarking && <Badge tone="amber">نمره منفی</Badge>}
                        {t.blueprint && <Badge tone="violet">ترکیبی</Badge>}
                      </div>
                    </div>
                    {best !== null && (
                      <div className="text-center">
                        <div className={cn("text-lg font-black", percentColor(best))}>{toFa(best.toFixed(1))}٪</div>
                        <div className="text-[10px] text-slate-400">بهترین نتیجه</div>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <Button size="sm" icon={<Play className="h-3.5 w-3.5" />} onClick={() => setStart(t)}>
                      شروع
                    </Button>
                    <Button size="sm" variant="outline" icon={<Pencil className="h-3.5 w-3.5" />} onClick={() => navigate(`/app/exams/${t.id}/edit`)}>
                      ویرایش
                    </Button>
                    <button onClick={() => setDel({ kind: "template", id: t.id })} className="mr-auto rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-2 text-[11px] text-slate-400">
                    {toFa(attempts.length)} بار اجرا شده • ساخته‌شده {relativeTime(t.createdAt)}
                  </div>
                </Card>
              );
            })}
          </div>
        ))}

      {tab === "history" &&
        (userData.attempts.length === 0 ? (
          <EmptyState icon={<History className="h-6 w-6" />} title="هنوز آزمونی نداده‌اید" />
        ) : (
          <Card className="divide-y divide-slate-100">
            {userData.attempts.map((a) => (
              <div key={a.id} className="flex items-center gap-3 p-4">
                <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-sm font-black text-white", a.status === "finished" ? percentBg(a.result?.percent ?? 0) : "bg-slate-400")}>
                  {a.status === "finished" ? `${toFa(Math.round(a.result?.percent ?? 0))}٪` : "…"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-slate-800">{a.title}</div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                    <span>{toFa(a.questionIds.length)} سوال</span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {a.durationMinutes ? `${toFa(a.durationMinutes)} دقیقه` : "بدون زمان"}
                    </span>
                    <span>{formatDateTime(a.startedAt)}</span>
                    {a.status === "finished" && a.result && (
                      <span>
                        <span className="text-emerald-600">{toFa(a.result.correct)} درست</span> / <span className="text-rose-600">{toFa(a.result.wrong)} غلط</span> / {toFa(a.result.blank)} نزده
                      </span>
                    )}
                  </div>
                </div>
                {a.status === "finished" ? (
                  <Link to={`/app/results/${a.id}`}>
                    <Button size="sm" variant="outline">
                      مشاهده‌ی نتیجه
                    </Button>
                  </Link>
                ) : (
                  <Link to={`/app/run/${a.id}`}>
                    <Button size="sm" icon={<Play className="h-3.5 w-3.5" />}>
                      ادامه
                    </Button>
                  </Link>
                )}
                <button onClick={() => setDel({ kind: "attempt", id: a.id })} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </Card>
        ))}

      {start && <StartExamModal open={!!start} onClose={() => setStart(null)} title={start.title} questionIds={start.questionIds} sourceType="template" sourceId={start.id} defaultDuration={start.durationMinutes} defaultNegative={start.negativeMarking} />}
      <ConfirmDialog
        open={!!del}
        onClose={() => setDel(null)}
        danger
        title="حذف"
        message={del?.kind === "template" ? "این قالب آزمون حذف شود؟" : "این آزمون از تاریخچه حذف شود؟"}
        confirmText="حذف"
        onConfirm={async () => {
          if (!del) return;
          if (del.kind === "template") await api.deleteExamTemplate(del.id);
          else await api.deleteAttempt(del.id);
          await refreshUserData();
          toast("حذف شد", "info");
        }}
      />
    </div>
  );
}
