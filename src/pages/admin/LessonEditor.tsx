import { BookOpen, Columns2, Eye, PenLine, Save } from "lucide-react";
import { useRef, useState } from "react";
import type { Lesson, LessonInput } from "@/types";
import { Badge, Button, ConfirmDialog, Input, Modal, Select, Textarea } from "@/components/ui";
import { RichTextEditor, TagInput } from "@/components/RichTextEditor";
import { LessonContent } from "@/components/LessonContent";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { readingMinutes } from "@/lib/lessons";
import { toFa } from "@/lib/utils";
import { api } from "@/services";
import { validateLesson } from "@/services/contentValidation";
import { useApp } from "@/store/AppContext";

function toForm(initial?: LessonInput, topicId = ""): LessonInput {
  return {
    topicId: initial?.topicId ?? topicId, title: initial?.title ?? "", content: initial?.content ?? "",
    summary: initial?.summary ?? "", images: structuredClone(initial?.images ?? []), tags: [...(initial?.tags ?? [])],
    status: initial ? initial.status ?? "published" : "draft", readingMinutes: initial?.readingMinutes ?? 1, order: initial?.order ?? 0,
  };
}

/** onCommit queues a lesson inside QuestionEditor; it is NOT persisted before the question. */
export function LessonEditor({ onClose, initial, defaultTopicId, allowedSubjectIds, onCommit }: {
  onClose: () => void; initial?: Lesson | LessonInput; defaultTopicId?: string; allowedSubjectIds?: string[];
  onCommit?: (input: LessonInput) => void | Promise<void>;
}) {
  const { catalog, refreshCatalog, toast } = useApp();
  const [form, setForm] = useState(() => toForm(initial, defaultTopicId));
  const [subjectId, setSubjectId] = useState(catalog.topicById.get(form.topicId)?.subjectId ?? allowedSubjectIds?.[0] ?? "");
  const original = useRef(JSON.stringify(form));
  const [mode, setMode] = useState<"edit" | "split" | "preview">("edit");
  const [autoTime, setAutoTime] = useState(!initial);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const locked = busy || uploading;
  const running = useRef(false);
  const [discard, setDiscard] = useState(false);
  const dirty = JSON.stringify(form) !== original.current;
  useUnsavedChanges(dirty);
  const subjects = catalog.subjects.filter((s) => !allowedSubjectIds || allowedSubjectIds.includes(s.id));
  const topics = catalog.topicsBySubject.get(subjectId) ?? [];
  const set = <K extends keyof LessonInput>(key: K, value: LessonInput[K]) => setForm((f) => ({ ...f, [key]: value }));
  const close = () => { if (!locked) { if (dirty) setDiscard(true); else onClose(); } };
  const save = async () => {
    if (running.current || uploading) return;
    running.current = true; setBusy(true);
    try {
      const valid = validateLesson(catalog, form);
      if (onCommit) await onCommit(valid);
      else {
        if (initial && "id" in initial) await api.admin.updateLesson(initial.id, valid);
        else await api.admin.createLesson(valid);
        await refreshCatalog();
        toast(valid.status === "published" ? "درسنامه ذخیره و منتشر شد" : "پیش‌نویس درسنامه ذخیره شد", "success");
      }
      onClose();
    } catch (error) { toast(error instanceof Error ? error.message : "ذخیره‌ی درسنامه انجام نشد", "error"); }
    finally { running.current = false; setBusy(false); }
  };
  const preview = <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
    <div className="mb-5 space-y-2 border-b border-slate-100 pb-4">
      <Badge tone={form.status === "draft" ? "amber" : "emerald"}>{form.status === "draft" ? "پیش‌نویس • فقط مدیر" : "منتشرشده"}</Badge>
      <h2 className="text-lg font-bold text-slate-900">{form.title || "عنوان درسنامه"}</h2>
      <p className="text-xs text-slate-500">{catalog.subjectById.get(subjectId)?.title} › {catalog.topicById.get(form.topicId)?.title} • {toFa(form.readingMinutes)} دقیقه مطالعه</p>
    </div>
    <LessonContent lesson={form} />
  </div>;
  return (<>
    <Modal open onClose={close} locked={locked} title={initial ? "ویرایش درسنامه" : onCommit ? "درسنامه‌ی جدید برای سوال" : "درسنامه‌ی جدید"} size="xl"
      footer={<>
        <span className="ml-auto text-[11px] text-slate-400">{onCommit ? "ذخیره‌ی نهایی همراه سوال" : "ذخیره در همین مرورگر"}</span>
        <Button variant="ghost" disabled={locked} onClick={close}>انصراف</Button>
        <Button loading={busy} disabled={uploading} icon={<Save className="h-4 w-4" />} onClick={save}>{onCommit ? "تأیید درسنامه برای سوال" : form.status === "draft" ? "ذخیره پیش‌نویس" : "ذخیره و انتشار"}</Button>
      </>}>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1" aria-label="حالت ویرایشگر">
            {([ ["edit", "نگارش", <PenLine className="h-3.5 w-3.5" />], ["split", "نگارش و پیش‌نمایش", <Columns2 className="h-3.5 w-3.5" />], ["preview", "پیش‌نمایش", <Eye className="h-3.5 w-3.5" />] ] as const).map(([key, label, icon]) =>
              <Button key={key} size="sm" variant={mode === key ? "primary" : "ghost"} aria-pressed={mode === key} disabled={locked} onClick={() => setMode(key)} icon={icon}>{label}</Button>)}
          </div>
          <span className="inline-flex items-center gap-1 text-xs text-slate-500"><BookOpen className="h-4 w-4" />{toFa(form.content.length)} نویسه</span>
        </div>
        {onCommit && <p className="rounded-xl bg-sky-50 px-4 py-3 text-xs leading-7 text-sky-800">این درسنامه پس از تأیید، به فرم سوال اضافه می‌شود. سوال و درسنامه با هم ذخیره می‌شوند؛ انصراف از سوال هیچ درسنامه‌ی اضافی در بانک ایجاد نمی‌کند.</p>}
        {mode !== "preview" && <fieldset disabled={locked} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="عنوان درسنامه" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="عنوانی روشن و دقیق برای درسنامه" />
            <div className="grid grid-cols-2 gap-3">
              <Select label="وضعیت انتشار" value={form.status} onChange={(e) => set("status", e.target.value as LessonInput["status"])}>
                <option value="draft">پیش‌نویس (فقط مدیر)</option><option value="published">منتشرشده (قابل مطالعه)</option>
              </Select>
              <Input label="ترتیب در مبحث" type="number" min={0} ltr value={form.order} onChange={(e) => set("order", Number(e.target.value))} />
            </div>
            <Select label="درس درسنامه" value={subjectId} onChange={(e) => { setSubjectId(e.target.value); set("topicId", ""); }}>
              <option value="">انتخاب درس</option>{subjects.map((s) => <option value={s.id} key={s.id}>{s.emoji} {s.title}</option>)}
            </Select>
            <Select label="مبحث درسنامه" value={form.topicId} disabled={!subjectId} onChange={(e) => set("topicId", e.target.value)}>
              <option value="">انتخاب مبحث</option>{topics.map((t) => <option value={t.id} key={t.id}>{t.title}</option>)}
            </Select>
          </div>
          {subjectId && !topics.length && <p className="text-xs text-amber-700">این درس مبحثی ندارد. ابتدا از بخش «درس‌ها و مباحث» یک مبحث ایجاد کنید.</p>}
          <Textarea label="خلاصه و هدف درسنامه" rows={2} value={form.summary} onChange={(e) => set("summary", e.target.value)} placeholder="دانش‌آموز در این درسنامه چه چیزی یاد می‌گیرد؟" />
          <div className="grid items-start gap-4 sm:grid-cols-[1fr_220px]">
            <TagInput tags={form.tags ?? []} onChange={(tags) => set("tags", tags)} />
            <div className="space-y-2">
              <Input label="زمان مطالعه (دقیقه)" type="number" min={1} ltr disabled={autoTime} value={form.readingMinutes} onChange={(e) => set("readingMinutes", Number(e.target.value))} />
              <label className="flex items-center gap-2 text-xs text-slate-500"><input type="checkbox" className="accent-brand-600" checked={autoTime} onChange={(e) => { setAutoTime(e.target.checked); if (e.target.checked) set("readingMinutes", readingMinutes(form.content)); }} />برآورد خودکار از متن</label>
            </div>
          </div>
        </fieldset>}
        {mode === "preview" ? preview : <div className={mode === "split" ? "grid min-w-0 gap-4 lg:grid-cols-2" : "min-w-0"}>
          <fieldset disabled={locked} className="min-w-0"><RichTextEditor onUploadingChange={setUploading} value={form.content} images={form.images} onImagesChange={(images) => set("images", images)}
            onChange={(content) => setForm((f) => ({ ...f, content, ...(autoTime ? { readingMinutes: readingMinutes(content) } : {}) }))} /></fieldset>
          {mode === "split" && <div className="min-w-0 lg:sticky lg:top-0 lg:max-h-[70vh] lg:self-start lg:overflow-y-auto" aria-label="پیش‌نمایش زنده">{preview}</div>}
        </div>}
      </div>
    </Modal>
    <ConfirmDialog open={discard} onClose={() => setDiscard(false)} title="تغییرات ذخیره نشده" message="تغییرات این درسنامه ذخیره نشده‌اند. بدون ذخیره خارج می‌شوید؟" danger confirmText="خروج بدون ذخیره" onConfirm={onClose} />
  </>);
}
