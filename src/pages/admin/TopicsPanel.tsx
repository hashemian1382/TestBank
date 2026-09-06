import { Check, ChevronDown, ChevronUp, Merge, Pencil, Plus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import type { Subject, Topic, TopicMergePreview } from "@/types";
import { Badge, Button, ConfirmDialog, Input, Modal } from "@/components/ui";
import { toFa } from "@/lib/utils";
import { api } from "@/services";
import { useApp } from "@/store/AppContext";

function RenameTopic({ topic, onClose }: { topic: Topic; onClose: () => void }) {
  const { refreshCatalog, toast } = useApp();
  const [title, setTitle] = useState(topic.title);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await api.admin.updateTopic(topic.id, { title }); await refreshCatalog();
      toast("نام مبحث در تمام ارجاع‌ها به‌روز شد", "success"); onClose();
    } catch (error) { toast(error instanceof Error ? error.message : "ویرایش انجام نشد", "error"); }
    finally { setBusy(false); }
  };
  return <Modal open onClose={onClose} locked={busy} title="ویرایش نام مبحث" footer={<>
    <Button variant="ghost" disabled={busy} onClick={onClose}>انصراف</Button>
    <Button loading={busy} disabled={!title.trim()} onClick={save}>ذخیره نام مبحث</Button>
  </>}>
    <Input label="نام مبحث" value={title} disabled={busy} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void save(); } }} />
    <p className="mt-3 text-xs leading-7 text-slate-500">شناسه‌ی مبحث ثابت می‌ماند؛ نام جدید در سوال‌ها، درسنامه‌ها، فیلترها و نتایج آزمون نمایش داده می‌شود. نام قبلی در ورود گروهی همچنان به همین مبحث اشاره می‌کند. برای یکی‌کردن چند مبحث، از «ادغام» استفاده کنید.</p>
  </Modal>;
}

function MergeTopics({ subject, topics, onClose, onMerged }: { subject: Subject; topics: Topic[]; onClose: () => void; onMerged: () => void }) {
  const { refreshCatalog, refreshUserData, toast } = useApp();
  const [title, setTitle] = useState(topics[0]?.title ?? "");
  const [preview, setPreview] = useState<TopicMergePreview | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const running = useRef(false);
  const input = { subjectId: subject.id, topicIds: topics.map((t) => t.id), title };
  const act = async (commit: boolean) => {
    if (running.current || (commit && !accepted)) return;
    running.current = true; setBusy(true);
    try {
      if (!commit) { setPreview(await api.admin.previewTopicMerge(input)); setAccepted(false); }
      else {
        const result = await api.admin.mergeTopics(input);
        await Promise.all([refreshCatalog(), refreshUserData()]);
        toast(`مباحث در «${result.targetTopic.title}» ادغام شدند؛ ${toFa(result.affectedQuestions)} سوال و ${toFa(result.affectedLessons)} درسنامه به‌روز شد`, "success");
        onMerged(); onClose();
      }
    } catch (error) { toast(error instanceof Error ? error.message : "ادغام انجام نشد", "error"); }
    finally { running.current = false; setBusy(false); }
  };
  return <Modal open onClose={onClose} locked={busy} title="ادغام مباحث" size="lg" footer={<>
    <Button variant="ghost" disabled={busy} onClick={onClose}>انصراف</Button>
    {preview && <Button variant="outline" disabled={busy} onClick={() => setPreview(null)}>تغییر نام مقصد</Button>}
    <Button loading={busy} disabled={preview ? !accepted : !title.trim()} icon={<Merge className="h-4 w-4" />} onClick={() => act(!!preview)}>{preview ? "تأیید و ادغام مباحث" : "بررسی اثر ادغام"}</Button>
  </>}>
    <div className="space-y-4">
      <p className="text-sm text-slate-600">ادغام {toFa(topics.length)} مبحث در درس <b>{subject.title}</b></p>
      <div className="flex flex-wrap gap-2">{topics.map((t) => <Badge key={t.id}>{t.title}</Badge>)}</div>
      <Input label="نام مبحث نهایی" value={title} disabled={busy || !!preview} onChange={(e) => setTitle(e.target.value)} hint="نام تازه بنویسید یا نام یکی از مباحث انتخابی را نگه دارید." />
      {!preview && <p className="rounded-xl bg-sky-50 p-3 text-xs leading-7 text-sky-800">فقط مباحث همین درس ادغام می‌شوند. اگر نام مقصد متعلق به مبحث دیگری است، آن مبحث را هم در انتخاب‌ها قرار دهید. در مرحله‌ی بعد، اثر تغییر روی داده‌های همه‌ی کاربران را می‌بینید.</p>}
      {preview && <>
        <div className="rounded-xl border border-brand-200 bg-brand-50/50 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-brand-900"><Check className="h-4 w-4" />مبحث نهایی: {preview.targetTopic.title}</div>
          <dl className="grid grid-cols-2 gap-3 text-xs">
            {([ ["سوال", preview.affectedQuestions], ["درسنامه", preview.affectedLessons], ["قالب آزمون", preview.affectedTemplates], ["اجرای آزمون", preview.affectedAttempts] ] as const).map(([label, count]) => <div key={label} className="rounded-lg bg-white px-3 py-2"><dt className="text-slate-500">{label}</dt><dd className="mt-1 text-lg font-bold text-slate-900">{toFa(count)}</dd></div>)}
          </dl>
        </div>
        <ul className="list-inside list-disc space-y-1 text-xs leading-7 text-slate-600">
          <li>سوال‌ها و درسنامه‌ها حذف نمی‌شوند؛ فقط مبحث آن‌ها تغییر می‌کند.</li>
          <li>ارجاع‌های تکراری حذف و آمار مبحثی آزمون‌ها بدون دوباره‌شماری بازسازی می‌شود.</li>
          <li>نمره‌ی کل، پاسخ‌ها، زمان‌ها، مجموعه‌ها و نشان‌ها دست‌نخورده باقی می‌مانند.</li>
          <li>شناسه‌ها و نام‌های قدیمی هنگام ورود گروهی به مبحث نهایی هدایت می‌شوند.</li>
        </ul>
        <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-7 text-amber-900">
          <input type="checkbox" className="mt-2 h-4 w-4 shrink-0 accent-brand-600" checked={accepted} disabled={busy} onChange={(e) => setAccepted(e.target.checked)} />
          می‌دانم دسته‌بندی‌های قبلی یکی می‌شوند و بازگردانی خودکار ندارند؛ ادغام را تأیید می‌کنم.
        </label>
      </>}
    </div>
  </Modal>;
}

export function TopicsPanel({ subject }: { subject: Subject }) {
  const { catalog, refreshCatalog, toast } = useApp();
  const topics = catalog.topicsBySubject.get(subject.id) ?? [];
  const [newTitle, setNewTitle] = useState("");
  const [editing, setEditing] = useState<Topic | null>(null);
  const [deleting, setDeleting] = useState<Topic | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [merging, setMerging] = useState(false);
  const [busy, setBusy] = useState(false);
  const qCount = (id: string) => catalog.questions.filter((q) => q.topicIds.includes(id)).length;
  const lCount = (id: string) => catalog.lessons.filter((l) => l.topicId === id).length;
  const add = async () => {
    if (!newTitle.trim() || busy) return;
    setBusy(true);
    try {
      await api.admin.createTopic({ subjectId: subject.id, title: newTitle, order: Math.max(0, ...topics.map((t) => t.order)) + 1 });
      setNewTitle(""); await refreshCatalog(); toast("مبحث اضافه شد", "success");
    } catch (error) { toast(error instanceof Error ? error.message : "افزودن مبحث انجام نشد", "error"); }
    finally { setBusy(false); }
  };
  const move = async (topic: Topic, direction: -1 | 1) => {
    if (busy) return;
    const index = topics.findIndex((t) => t.id === topic.id);
    const ids = topics.map((t) => t.id);
    if (!ids[index + direction]) return;
    [ids[index], ids[index + direction]] = [ids[index + direction], ids[index]];
    setBusy(true);
    try { await api.admin.reorderTopics(subject.id, ids); await refreshCatalog(); }
    catch (error) { toast(error instanceof Error ? error.message : "تغییر ترتیب انجام نشد", "error"); }
    finally { setBusy(false); }
  };
  return <div className="space-y-3 border-t border-slate-100 bg-slate-50/60 p-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <span className="text-xs font-semibold text-slate-600">مباحث ({toFa(topics.length)}) • برای ادغام، چند مبحث انتخاب کنید</span>
      {topics.length > 1 && <div className="flex flex-wrap gap-2">
        <Button variant="ghost" size="sm" onClick={() => setSelected(selected.length === topics.length ? [] : topics.map((t) => t.id))}>{selected.length === topics.length ? "لغو انتخاب همه" : "انتخاب همه"}</Button>
        <Button variant="outline" size="sm" icon={<Merge className="h-3.5 w-3.5" />} disabled={selected.length < 2 || busy} onClick={() => setMerging(true)}>ادغام انتخاب‌ها ({toFa(selected.length)})</Button>
      </div>}
    </div>
    {topics.map((topic, index) => <div key={topic.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-100 bg-white px-3 py-2 text-sm">
      <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
        <input type="checkbox" aria-label={`انتخاب مبحث ${topic.title}`} checked={selected.includes(topic.id)} className="h-4 w-4 shrink-0 accent-brand-600" onChange={(e) => setSelected(e.target.checked ? [...selected, topic.id] : selected.filter((id) => id !== topic.id))} />
        <span className="break-words">{topic.title}</span>
      </label>
      <span className="text-[11px] text-slate-400">{toFa(qCount(topic.id))} سوال • {toFa(lCount(topic.id))} درسنامه</span>
      <div className="flex items-center gap-1">
        <button type="button" aria-label={`بالا بردن ${topic.title}`} disabled={busy || index === 0} onClick={() => move(topic, -1)} className="rounded p-1.5 text-slate-400 hover:bg-slate-50 disabled:opacity-30"><ChevronUp className="h-4 w-4" /></button>
        <button type="button" aria-label={`پایین بردن ${topic.title}`} disabled={busy || index === topics.length - 1} onClick={() => move(topic, 1)} className="rounded p-1.5 text-slate-400 hover:bg-slate-50 disabled:opacity-30"><ChevronDown className="h-4 w-4" /></button>
        <button type="button" aria-label={`ویرایش نام ${topic.title}`} onClick={() => setEditing(topic)} className="rounded p-1.5 text-slate-400 hover:bg-brand-50 hover:text-brand-600"><Pencil className="h-4 w-4" /></button>
        <button type="button" aria-label={`حذف مبحث ${topic.title}`} onClick={() => setDeleting(topic)} className="rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
      </div>
    </div>)}
    {!topics.length && <p className="py-2 text-xs text-slate-400">هنوز مبحثی برای این درس ثبت نشده است.</p>}
    <div className="flex items-end gap-2">
      <div className="min-w-0 flex-1"><Input label="مبحث جدید" placeholder="عنوان مبحث جدید..." disabled={busy} value={newTitle} onChange={(e) => setNewTitle(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void add(); } }} /></div>
      <Button disabled={!newTitle.trim()} loading={busy} onClick={add} icon={<Plus className="h-4 w-4" />}>افزودن</Button>
    </div>
    {editing && <RenameTopic topic={editing} onClose={() => setEditing(null)} />}
    {merging && <MergeTopics subject={subject} topics={topics.filter((t) => selected.includes(t.id))} onClose={() => setMerging(false)} onMerged={() => setSelected([])} />}
    <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} danger title="حذف مبحث" confirmText="حذف مبحث"
      message={`مبحث «${deleting?.title}» حذف شود؟ فقط مبحثِ بدون سوال، درسنامه یا سابقه‌ی آزمون قابل حذف است. برای مبحث دارای داده از ادغام استفاده کنید.`}
      onConfirm={async () => { if (!deleting) return; await api.admin.deleteTopic(deleting.id); setSelected((ids) => ids.filter((id) => id !== deleting.id)); await refreshCatalog(); toast("مبحث حذف شد", "success"); }} />
  </div>;
}
