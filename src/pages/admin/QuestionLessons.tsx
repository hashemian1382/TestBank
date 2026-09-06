import { BookOpen, Pencil, Plus, X } from "lucide-react";
import { useState } from "react";
import type { LessonInput } from "@/types";
import { Badge, Button, SearchInput } from "@/components/ui";
import { lessonMatches, sortLessons } from "@/lib/lessons";
import { toFa, uid } from "@/lib/utils";
import { useApp } from "@/store/AppContext";
import { LessonEditor } from "./LessonEditor";

export interface PendingLesson { key: string; input: LessonInput }

export function QuestionLessons({ subjectIds, topicIds, lessonIds, onChange, pending, onPendingChange }: {
  subjectIds: string[]; topicIds: string[]; lessonIds: string[]; onChange: (ids: string[]) => void;
  pending: PendingLesson[]; onPendingChange: (lessons: PendingLesson[]) => void;
}) {
  const { catalog } = useApp();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<PendingLesson | "new" | null>(null);
  const available = sortLessons(catalog.lessons.filter((l) => {
    const topic = catalog.topicById.get(l.topicId);
    return topic && subjectIds.includes(topic.subjectId) && lessonMatches(l, search, [topic.title]);
  }));
  return <section className="space-y-3 rounded-xl border border-brand-200 bg-brand-50/30 p-4" aria-label="درسنامه‌های سوال">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="inline-flex items-center gap-2 text-sm font-bold text-slate-900"><BookOpen className="h-4 w-4 text-brand-600" />درسنامه‌های این سوال <Badge tone="brand">{toFa(lessonIds.length + pending.length)}</Badge></h3>
      <Button size="sm" variant="outline" disabled={!subjectIds.length} onClick={() => setEditing("new")} icon={<Plus className="h-3.5 w-3.5" />}>ساخت درسنامه برای سوال</Button>
    </div>
    <p className="text-xs leading-6 text-slate-500">یک یا چند درسنامه از درس‌های انتخاب‌شده متصل کنید، یا درسنامه‌ی تازه بسازید. اتصال مستقیم در کنار پیشنهادهای خودکار مبحث نمایش داده می‌شود. پیش‌نویس‌ها تا زمان انتشار فقط برای مدیر قابل مشاهده‌اند.</p>
    {(lessonIds.length > 0 || pending.length > 0) && <div className="space-y-2">
      {lessonIds.map((id) => {
        const lesson = catalog.lessonById.get(id);
        return <div key={id} className="flex items-center gap-2 rounded-lg border border-brand-100 bg-white px-3 py-2 text-xs">
          <span className="min-w-0 flex-1">{lesson?.title ?? `درسنامه‌ی ناموجود: ${id}`}</span>
          {lesson?.status === "draft" && <Badge tone="amber">پیش‌نویس</Badge>}
          <button type="button" aria-label={`قطع اتصال ${lesson?.title ?? id}`} className="rounded p-1 text-slate-400 hover:text-rose-600" onClick={() => onChange(lessonIds.filter((x) => x !== id))}><X className="h-4 w-4" /></button>
        </div>;
      })}
      {pending.map((lesson) => <div key={lesson.key} className="flex items-center gap-2 rounded-lg border border-dashed border-brand-300 bg-white px-3 py-2 text-xs">
        <span className="min-w-0 flex-1">{lesson.input.title}</span><Badge tone="sky">جدید • همراه سوال ذخیره می‌شود</Badge>
        <button type="button" aria-label={`ویرایش ${lesson.input.title}`} onClick={() => setEditing(lesson)} className="p-1 text-brand-600"><Pencil className="h-4 w-4" /></button>
        <button type="button" aria-label={`حذف درسنامه جدید ${lesson.input.title}`} onClick={() => onPendingChange(pending.filter((x) => x.key !== lesson.key))} className="p-1 text-rose-500"><X className="h-4 w-4" /></button>
      </div>)}
    </div>}
    {!subjectIds.length ? <p className="py-2 text-xs text-amber-700">ابتدا درس سوال را انتخاب کنید.</p> : <>
      <SearchInput value={search} onChange={setSearch} placeholder="جستجوی درسنامه‌ی موجود در درس‌های سوال..." />
      <div className="max-h-52 space-y-1 overflow-y-auto" aria-label="درسنامه‌های موجود">
        {available.map((lesson) => <label key={lesson.id} className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-2 hover:bg-white">
          <input type="checkbox" className="mt-1 h-4 w-4 shrink-0 accent-brand-600" checked={lessonIds.includes(lesson.id)}
            onChange={(e) => onChange(e.target.checked ? [...lessonIds, lesson.id] : lessonIds.filter((id) => id !== lesson.id))} />
          <span className="min-w-0 flex-1"><span className="block text-xs leading-6 text-slate-800">{lesson.title}</span><span className="text-[11px] text-slate-400">{catalog.topicById.get(lesson.topicId)?.title} • {lesson.status === "draft" ? "پیش‌نویس" : "منتشرشده"}</span></span>
        </label>)}
        {!available.length && <p className="py-4 text-center text-xs text-slate-500">درسنامه‌ای با این شرایط نیست؛ می‌توانید درسنامه‌ی جدید بسازید.</p>}
      </div>
    </>}
    {editing && <LessonEditor key={editing === "new" ? "new" : editing.key} initial={editing === "new" ? undefined : editing.input} onClose={() => setEditing(null)}
      allowedSubjectIds={subjectIds} defaultTopicId={topicIds[0] ?? catalog.topicsBySubject.get(subjectIds[0])?.[0]?.id}
      onCommit={(input) => onPendingChange(editing === "new" ? [...pending, { key: uid("pending"), input }] : pending.map((l) => l.key === editing.key ? { ...l, input } : l))} />}
  </section>;
}
