import { ArrowRight, BookOpen, Clock, Lock } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { QuestionCard } from "@/components/QuestionCard";
import { RichText } from "@/components/RichText";
import { Button, Card, Chip, EmptyState, PageHeader, SearchInput } from "@/components/ui";
import { cn, toFa } from "@/lib/utils";
import { useApp } from "@/store/AppContext";

export default function Lessons() {
  const { catalog, ownsSubject } = useApp();
  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState<string>("all");
  const subjectsWithLessons = useMemo(() => {
    const ids = new Set(catalog.lessons.map((l) => catalog.topicById.get(l.topicId)?.subjectId).filter(Boolean));
    return catalog.subjects.filter((s) => ids.has(s.id));
  }, [catalog]);
  const lessons = catalog.lessons.filter((l) => {
    const t = catalog.topicById.get(l.topicId);
    if (subject !== "all" && t?.subjectId !== subject) return false;
    if (search && !l.title.includes(search) && !t?.title.includes(search)) return false;
    return true;
  });
  return (
    <div>
      <PageHeader title="درسنامه‌ها" description="خلاصه‌های مفهومی هر مبحث با نکات تستی" />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <SearchInput value={search} onChange={setSearch} placeholder="جستجوی درسنامه..." />
        </div>
      </div>
      <div className="mb-5 flex flex-wrap gap-1.5">
        <Chip active={subject === "all"} onClick={() => setSubject("all")}>
          همه
        </Chip>
        {subjectsWithLessons.map((s) => (
          <Chip key={s.id} active={subject === s.id} onClick={() => setSubject(s.id)}>
            {s.emoji} {s.title}
          </Chip>
        ))}
      </div>
      {lessons.length === 0 ? (
        <EmptyState icon={<BookOpen className="h-6 w-6" />} title="درسنامه‌ای یافت نشد" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {lessons.map((l) => {
            const t = catalog.topicById.get(l.topicId);
            const s = t ? catalog.subjectById.get(t.subjectId) : undefined;
            const owned = s ? ownsSubject(s.id) : false;
            return (
              <Link key={l.id} to={`/app/lessons/${l.id}`}>
                <Card className={cn("group h-full p-5 transition hover:-translate-y-0.5 hover:shadow-md", !owned && "opacity-75")}>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs text-brand-600">
                      {s?.emoji} {s?.title}
                    </span>
                    {!owned && <Lock className="h-4 w-4 text-slate-400" />}
                  </div>
                  <h3 className="font-bold text-slate-900 group-hover:text-brand-700">{l.title}</h3>
                  <p className="mt-1 text-xs text-slate-500">{t?.title}</p>
                  <div className="mt-3 inline-flex items-center gap-1 text-[11px] text-slate-400">
                    <Clock className="h-3 w-3" /> {toFa(l.readingMinutes)} دقیقه مطالعه
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function LessonDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { catalog, ownsSubject } = useApp();
  const lesson = catalog.lessons.find((l) => l.id === id);
  if (!lesson) return <EmptyState title="درسنامه یافت نشد" action={<Button onClick={() => navigate("/app/lessons")}>بازگشت</Button>} />;
  const topic = catalog.topicById.get(lesson.topicId);
  const subject = topic ? catalog.subjectById.get(topic.subjectId) : undefined;
  const owned = subject ? ownsSubject(subject.id) : false;
  const related = catalog.questions.filter((q) => q.topicIds.includes(lesson.topicId)).slice(0, 5);

  return (
    <div>
      <Link to="/app/lessons" className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand-600">
        <ArrowRight className="h-4 w-4" /> همه‌ی درسنامه‌ها
      </Link>
      <PageHeader title={lesson.title} description={`${subject?.emoji ?? ""} ${subject?.title ?? ""} › ${topic?.title ?? ""} • ${toFa(lesson.readingMinutes)} دقیقه مطالعه`} />
      {owned ? (
        <Card className="p-6 sm:p-8">
          <RichText text={lesson.content} images={lesson.images} className="text-[15px] leading-9 text-slate-800" />
        </Card>
      ) : (
        <Card className="relative overflow-hidden p-6 sm:p-8">
          <div className="max-h-64 select-none overflow-hidden blur-[4px]">
            <RichText text={lesson.content} images={lesson.images} />
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-t from-white via-white/90 to-white/40">
            <Lock className="mb-3 h-8 w-8 text-slate-400" />
            <p className="mb-3 text-sm text-slate-600">برای مطالعه‌ی کامل درسنامه، درس «{subject?.title}» را تهیه کنید.</p>
            <Link to="/app/store">
              <Button>رفتن به فروشگاه</Button>
            </Link>
          </div>
        </Card>
      )}
      {related.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-4 text-lg font-bold text-slate-900">تست‌های مرتبط با این مبحث</h2>
          <div className="space-y-4">
            {related.map((q, i) => (
              <QuestionCard key={q.id} question={q} index={i} />
            ))}
          </div>
          <div className="mt-4 text-center">
            <Link to={`/app/bank?topic=${lesson.topicId}`}>
              <Button variant="outline">همه‌ی تست‌های این مبحث</Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
