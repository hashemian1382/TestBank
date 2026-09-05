import { ArrowLeft, Bookmark, BookOpen, FolderHeart, Gift, Library, ShoppingBag, Shuffle, Target, Trophy } from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Badge, Button, Card, EmptyState, PageHeader, ProgressBar, StatCard } from "@/components/ui";
import { buildAnswerStateMap } from "@/lib/questionFilter";
import { formatNumber, percentBg, percentColor, relativeTime, toFa } from "@/lib/utils";
import { useApp } from "@/store/AppContext";

export default function Overview() {
  const { user, catalog, userData } = useApp();
  const finished = userData.attempts.filter((a) => a.status === "finished");
  const avg = finished.length ? finished.reduce((s, a) => s + (a.result?.percent ?? 0), 0) / finished.length : 0;
  const ownedSubjects = catalog.subjects.filter((s) => user?.purchasedSubjectIds.includes(s.id));
  const ownedQuestionCount = catalog.questions.filter((q) => q.subjectIds.some((s) => user?.purchasedSubjectIds.includes(s))).length;

  const states = useMemo(() => buildAnswerStateMap(userData.attempts, (id) => catalog.questionById.get(id)), [userData.attempts, catalog.questionById]);
  const seen = states.size;
  const correct = [...states.values()].filter((s) => s === "correct").length;

  const subjectProgress = ownedSubjects.map((s) => {
    const qs = catalog.questions.filter((q) => q.subjectIds.includes(s.id));
    const seenQ = qs.filter((q) => states.has(q.id));
    const corr = seenQ.filter((q) => states.get(q.id) === "correct").length;
    return { subject: s, total: qs.length, seen: seenQ.length, correct: corr };
  });

  const weakTopics = useMemo(() => {
    const agg = new Map<string, { c: number; w: number }>();
    finished.forEach((a) =>
      Object.entries(a.result?.byTopic ?? {}).forEach(([tid, b]) => {
        const x = agg.get(tid) ?? { c: 0, w: 0 };
        x.c += b.correct;
        x.w += b.wrong;
        agg.set(tid, x);
      })
    );
    return [...agg.entries()]
      .filter(([, v]) => v.c + v.w >= 2)
      .map(([tid, v]) => ({ topic: catalog.topicById.get(tid), pct: Math.round((v.c / (v.c + v.w)) * 100) }))
      .filter((x) => x.topic)
      .sort((a, b) => a.pct - b.pct)
      .slice(0, 5);
  }, [finished, catalog.topicById]);

  const hour = new Date().getHours();
  const greet = hour < 12 ? "صبح بخیر" : hour < 18 ? "ظهر بخیر" : "شب بخیر";

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${greet}، ${user?.fullName.split(" ")[0]} 👋`}
        description="خلاصه‌ی فعالیت‌ها و پیشرفت شما"
        actions={
          <Link to="/app/exams/new">
            <Button icon={<Shuffle className="h-4 w-4" />}>ساخت آزمون جدید</Button>
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="سوالات در دسترس" value={formatNumber(ownedQuestionCount)} icon={<Library className="h-5 w-5" />} hint={`${toFa(ownedSubjects.length)} درس خریداری‌شده`} />
        <StatCard label="آزمون‌های انجام‌شده" value={toFa(finished.length)} icon={<Target className="h-5 w-5" />} tone="violet" />
        <StatCard label="میانگین درصد" value={`${toFa(avg.toFixed(1))}٪`} icon={<Trophy className="h-5 w-5" />} tone={avg >= 60 ? "emerald" : "amber"} hint={seen ? `${toFa(correct)} پاسخ درست از ${toFa(seen)}` : undefined} />
        <StatCard label="اعتبار کیف پول" value={`${formatNumber(user?.balance ?? 0)}`} icon={<Gift className="h-5 w-5" />} tone="sky" hint="تومان" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* subject progress */}
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-bold text-slate-900">پیشرفت در درس‌ها</h2>
              <Link to="/app/store" className="text-xs font-medium text-brand-600 hover:underline">
                خرید درس جدید
              </Link>
            </div>
            {subjectProgress.length === 0 ? (
              <EmptyState
                icon={<ShoppingBag className="h-6 w-6" />}
                title="هنوز درسی ندارید"
                description="از فروشگاه، درس‌های مورد نظرتان را تهیه کنید تا تست‌ها به بانک شخصی‌تان اضافه شود."
                action={
                  <Link to="/app/store">
                    <Button>رفتن به فروشگاه</Button>
                  </Link>
                }
              />
            ) : (
              <div className="space-y-4">
                {subjectProgress.map(({ subject, total, seen: sn, correct: cr }) => (
                  <div key={subject.id}>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-800">
                        {subject.emoji} {subject.title}
                      </span>
                      <span className="text-xs text-slate-500">
                        {toFa(sn)} از {toFa(total)} سوال دیده شده{sn > 0 && ` • ${toFa(Math.round((cr / sn) * 100))}٪ درست`}
                      </span>
                    </div>
                    <div className="relative">
                      <ProgressBar value={(sn / Math.max(1, total)) * 100} color="bg-slate-300" />
                      <div className="absolute inset-0">
                        <ProgressBar value={(cr / Math.max(1, total)) * 100} className="bg-transparent" color="bg-emerald-500" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* recent attempts */}
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-bold text-slate-900">آزمون‌های اخیر</h2>
              <Link to="/app/exams" className="text-xs font-medium text-brand-600 hover:underline">
                همه‌ی آزمون‌ها
              </Link>
            </div>
            {userData.attempts.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">هنوز آزمونی نداده‌اید.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {userData.attempts.slice(0, 5).map((a) => (
                  <Link key={a.id} to={a.status === "finished" ? `/app/results/${a.id}` : `/app/run/${a.id}`} className="flex items-center gap-3 py-3 transition hover:bg-slate-50">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold text-white ${a.status === "finished" ? percentBg(a.result?.percent ?? 0) : "bg-slate-400"}`}>
                      {a.status === "finished" ? toFa(Math.round(a.result?.percent ?? 0)) : "…"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-slate-800">{a.title}</div>
                      <div className="text-xs text-slate-500">
                        {toFa(a.questionIds.length)} سوال • {relativeTime(a.startedAt)}
                      </div>
                    </div>
                    {a.status === "in-progress" ? <Badge tone="amber">در حال انجام</Badge> : <span className={`text-sm font-bold ${percentColor(a.result?.percent ?? 0)}`}>{toFa((a.result?.percent ?? 0).toFixed(1))}٪</span>}
                    <ArrowLeft className="h-4 w-4 text-slate-300" />
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          {/* quick actions */}
          <Card className="p-5">
            <h2 className="mb-3 font-bold text-slate-900">دسترسی سریع</h2>
            <div className="grid grid-cols-2 gap-2">
              {[
                { to: "/app/bank", icon: <Library className="h-5 w-5" />, label: "بانک تست" },
                { to: "/app/bookmarks", icon: <Bookmark className="h-5 w-5" />, label: "نشان‌شده‌ها" },
                { to: "/app/collections", icon: <FolderHeart className="h-5 w-5" />, label: "مجموعه‌ها" },
                { to: "/app/lessons", icon: <BookOpen className="h-5 w-5" />, label: "درسنامه‌ها" },
              ].map((x) => (
                <Link key={x.to} to={x.to} className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 p-3 text-xs font-medium text-slate-700 transition hover:border-brand-300 hover:bg-brand-50/50 hover:text-brand-700">
                  {x.icon}
                  {x.label}
                </Link>
              ))}
            </div>
          </Card>

          {/* weak topics */}
          <Card className="p-5">
            <h2 className="mb-3 font-bold text-slate-900">مباحث نیازمند تمرین</h2>
            {weakTopics.length === 0 ? (
              <p className="text-sm text-slate-500">پس از چند آزمون، مباحث ضعیف شما اینجا نمایش داده می‌شود.</p>
            ) : (
              <div className="space-y-3">
                {weakTopics.map(({ topic, pct }) => (
                  <div key={topic!.id}>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="text-slate-700">{topic!.title}</span>
                      <span className={percentColor(pct)}>{toFa(pct)}٪</span>
                    </div>
                    <ProgressBar value={pct} color={percentBg(pct)} />
                  </div>
                ))}
                <Link to="/app/bank?answerState=wrong">
                  <Button variant="outline" size="sm" className="mt-2 w-full">
                    مرور سوالات غلط
                  </Button>
                </Link>
              </div>
            )}
          </Card>

          {/* referral */}
          <div className="rounded-2xl bg-gradient-to-br from-brand-600 to-violet-700 p-5 text-white">
            <Gift className="mb-2 h-6 w-6" />
            <div className="font-bold">دوستانتان را دعوت کنید</div>
            <p className="mt-1 text-xs leading-6 text-white/80">به ازای هر دعوت موفق {formatNumber(catalog.settings.referralBonus)} تومان اعتبار بگیرید.</p>
            <div className="mt-3 rounded-lg bg-white/15 px-3 py-2 text-center font-mono text-lg font-bold tracking-widest">{user?.referralCode}</div>
            <Link to="/app/referral">
              <Button size="sm" className="mt-3 w-full bg-white text-brand-700 hover:bg-slate-100">
                جزئیات و اشتراک‌گذاری
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
