import { BookOpen, Copy, Download, Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { Lesson } from "@/types";
import { Badge, Button, Card, ConfirmDialog, EmptyState, PageHeader, SearchInput, Select } from "@/components/ui";
import { lessonMatches, sortLessons } from "@/lib/lessons";
import { downloadJson } from "@/lib/download";
import { toFa } from "@/lib/utils";
import { api } from "@/services";
import { useApp } from "@/store/AppContext";
import { LessonEditor } from "./LessonEditor";

export default function AdminLessons() {
  const { catalog, refreshCatalog, toast } = useApp();
  const [search, setSearch] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [status, setStatus] = useState("");
  const [editing, setEditing] = useState<Lesson | "new" | null>(null);
  const [deleting, setDeleting] = useState<Lesson | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [limit, setLimit] = useState(20);
  const topics = subjectId ? catalog.topicsBySubject.get(subjectId) ?? [] : catalog.topics;
  const lessons = useMemo(() => sortLessons(catalog.lessons.filter((lesson) => {
    const topic = catalog.topicById.get(lesson.topicId);
    const subject = topic && catalog.subjectById.get(topic.subjectId);
    return (!subjectId || topic?.subjectId === subjectId) && (!topicId || lesson.topicId === topicId)
      && (!status || (lesson.status ?? "published") === status) && lessonMatches(lesson, search, [topic?.title ?? "", subject?.title ?? ""]);
  })), [catalog, subjectId, topicId, status, search]);
  const links = (id: string) => catalog.questions.filter((q) => q.lessonIds?.includes(id)).length;
  const duplicate = async (lesson: Lesson) => {
    if (busy) return;
    setBusy(lesson.id);
    try {
      await api.admin.createLesson({ ...lesson, title: `${lesson.title} (کپی)`, status: "draft" });
      await refreshCatalog(); toast("نسخه‌ی مستقل به‌صورت پیش‌نویس ساخته شد؛ اتصال سوال‌ها کپی نشد", "success");
    } catch (error) { toast(error instanceof Error ? error.message : "کپی انجام نشد", "error"); }
    finally { setBusy(null); }
  };
  return (
    <div>
      <PageHeader title="مدیریت درسنامه‌ها" description="از مفهوم تا تسلط؛ نگارش، سازمان‌دهی و انتشار محتوای آموزشی برای هر مبحث."
        actions={<>
          <Button variant="outline" icon={<Download className="h-4 w-4" />} disabled={!lessons.length} onClick={() => downloadJson({ version: 1, lessons }, `lessons-${Date.now()}.json`)}>خروجی JSON</Button>
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => setEditing("new")}>درسنامه جدید</Button>
        </>} />
      <div className="mb-5 flex flex-wrap gap-2">
        <Badge tone="brand">{toFa(catalog.lessons.length)} درسنامه</Badge>
        <Badge tone="emerald">{toFa(catalog.lessons.filter((l) => l.status !== "draft").length)} منتشرشده</Badge>
        <Badge tone="amber">{toFa(catalog.lessons.filter((l) => l.status === "draft").length)} پیش‌نویس</Badge>
      </div>
      <Card className="mb-5 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5"><span className="block text-sm font-medium text-slate-700">جستجو</span><SearchInput value={search} onChange={(value) => { setSearch(value); setLimit(20); }} placeholder="عنوان، خلاصه، برچسب یا مبحث..." /></div>
        <Select label="فیلتر درس" value={subjectId} onChange={(e) => { setSubjectId(e.target.value); setTopicId(""); setLimit(20); }}>
          <option value="">همه‌ی درس‌ها</option>{catalog.subjects.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
        </Select>
        <Select label="فیلتر مبحث" value={topicId} onChange={(e) => { setTopicId(e.target.value); setLimit(20); }}>
          <option value="">همه‌ی مباحث</option>{topics.map((t) => <option key={t.id} value={t.id}>{t.title}{!subjectId ? ` • ${catalog.subjectById.get(t.subjectId)?.title}` : ""}</option>)}
        </Select>
        <Select label="فیلتر وضعیت" value={status} onChange={(e) => { setStatus(e.target.value); setLimit(20); }}>
          <option value="">همه‌ی وضعیت‌ها</option><option value="published">منتشرشده</option><option value="draft">پیش‌نویس</option>
        </Select>
      </Card>
      <div className="mb-3 text-xs text-slate-500">{toFa(lessons.length)} درسنامه مطابق فیلترها</div>
      {!lessons.length ? <EmptyState icon={<BookOpen className="h-6 w-6" />} title="درسنامه‌ای یافت نشد" description="فیلترها را تغییر دهید یا اولین درسنامه‌ی این مبحث را بنویسید." action={<Button onClick={() => setEditing("new")}>نوشتن درسنامه</Button>} /> :
        <div className="grid gap-4 md:grid-cols-2">
          {lessons.slice(0, limit).map((lesson) => {
            const topic = catalog.topicById.get(lesson.topicId);
            return <Card key={lesson.id} className="flex min-w-0 flex-col p-5">
              <div className="mb-3 flex flex-wrap items-center gap-2"><Badge tone="brand">{topic && catalog.subjectById.get(topic.subjectId)?.title}</Badge><Badge tone={lesson.status === "draft" ? "amber" : "emerald"}>{lesson.status === "draft" ? "پیش‌نویس" : "منتشرشده"}</Badge></div>
              <h2 className="font-bold leading-7 text-slate-900">{lesson.title}</h2>
              <p className="mt-1 text-xs text-slate-500">{topic?.title ?? "مبحث ناموجود"}</p>
              {lesson.summary && <p className="mt-2 line-clamp-2 text-sm leading-7 text-slate-600">{lesson.summary}</p>}
              <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-400"><span>{toFa(lesson.readingMinutes)} دقیقه مطالعه</span><span>{toFa(lesson.images.length)} تصویر</span><span>{toFa(links(lesson.id))} اتصال مستقیم به سوال</span></div>
              <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                <Button size="sm" variant="outline" onClick={() => setEditing(lesson)} icon={<Pencil className="h-3.5 w-3.5" />}>ویرایش</Button>
                <Link to={`/app/lessons/${lesson.id}`} className="inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs text-slate-600 hover:bg-slate-100"><Eye className="h-3.5 w-3.5" />مشاهده</Link>
                <Button size="sm" variant="ghost" disabled={!!busy} loading={busy === lesson.id} onClick={() => duplicate(lesson)} icon={<Copy className="h-3.5 w-3.5" />}>کپی</Button>
                <Button size="sm" variant="ghost" className="mr-auto text-rose-600" onClick={() => setDeleting(lesson)} icon={<Trash2 className="h-3.5 w-3.5" />}>حذف</Button>
              </div>
            </Card>;
          })}
        </div>}
      {lessons.length > limit && <div className="mt-5 text-center"><Button variant="outline" onClick={() => setLimit((value) => value + 20)}>نمایش بیشتر</Button></div>}
      {editing && <LessonEditor key={editing === "new" ? "new" : editing.id} onClose={() => setEditing(null)} initial={editing === "new" ? undefined : editing} defaultTopicId={topicId || undefined} />}
      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} title="حذف درسنامه" danger confirmText="حذف درسنامه"
        message={`درسنامه‌ی «${deleting?.title}» حذف شود؟ ${toFa(deleting ? links(deleting.id) : 0)} اتصال مستقیم به سوال برداشته می‌شود؛ خود سوال‌ها و نتایج آزمون حذف نمی‌شوند.`}
        onConfirm={async () => { if (!deleting) return; await api.admin.deleteLesson(deleting.id); await refreshCatalog(); toast("درسنامه حذف و اتصال‌ها پاک‌سازی شد", "success"); }} />
    </div>
  );
}
