import { Eye, ImagePlus, Plus, Trash2, Upload } from "lucide-react";
import { useMemo, useState } from "react";
import type { Difficulty, Question, QuestionImage, QuestionInput } from "@/types";
import { QuestionCard } from "@/components/QuestionCard";
import { Button, Chip, Input, Modal, Select, Textarea, Toggle } from "@/components/ui";
import { cn, DIFFICULTY_LABEL, toFa, uid } from "@/lib/utils";
import { api, ApiError } from "@/services";
import { useApp } from "@/store/AppContext";

const blank = (sourceId: string): QuestionInput => ({
  subjectIds: [],
  topicIds: [],
  stem: "",
  options: ["", "", "", ""],
  correctIndex: 0,
  explanation: "",
  difficulty: 2,
  sourceId,
  tags: [],
  images: [],
  estimatedSeconds: 90,
  isActive: true,
});

export function QuestionEditor({ open, onClose, initial }: { open: boolean; onClose: () => void; initial?: Question }) {
  const { catalog, refreshCatalog, toast } = useApp();
  const [form, setForm] = useState<QuestionInput>(() => (initial ? { ...initial } : blank(catalog.sources[0]?.id ?? "")));
  const [tagInput, setTagInput] = useState("");
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof QuestionInput>(k: K, v: QuestionInput[K]) => setForm((f) => ({ ...f, [k]: v }));

  const topics = useMemo(() => form.subjectIds.flatMap((s) => catalog.topicsBySubject.get(s) ?? []), [form.subjectIds, catalog.topicsBySubject]);
  const previewQ: Question = { ...form, id: initial?.id ?? "preview", createdAt: "", updatedAt: "" };

  const addImage = (img?: Partial<QuestionImage>) => set("images", [...form.images, { id: `img-${form.images.length + 1}-${uid("x").slice(-4)}`, src: "", alt: "", ...img }]);
  const updateImage = (i: number, patch: Partial<QuestionImage>) => set("images", form.images.map((im, j) => (j === i ? { ...im, ...patch } : im)));
  const uploadFile = (i: number, file: File) => {
    // در نسخه‌ی متصل به بک‌اند: فایل به /media/upload ارسال و URL برگشتی در src قرار می‌گیرد.
    const reader = new FileReader();
    reader.onload = () => updateImage(i, { src: String(reader.result), alt: form.images[i].alt || file.name });
    reader.readAsDataURL(file);
  };
  const insertPlaceholder = (id: string) => set("stem", `${form.stem}\n[[img:${id}]]`);

  const save = async () => {
    if (!form.subjectIds.length) return toast("حداقل یک درس انتخاب کنید", "error");
    if (!form.topicIds.length) return toast("حداقل یک مبحث انتخاب کنید", "error");
    if (!form.stem.trim()) return toast("صورت سوال خالی است", "error");
    if (form.options.some((o) => !o.trim())) return toast("همه‌ی گزینه‌ها را پر کنید", "error");
    setBusy(true);
    try {
      if (initial) await api.admin.updateQuestion(initial.id, form);
      else await api.admin.createQuestion(form);
      await refreshCatalog();
      toast(initial ? "سوال ویرایش شد" : "سوال اضافه شد", "success");
      onClose();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "خطا", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? `ویرایش سوال ${initial.id}` : "سوال جدید"}
      size="xl"
      footer={
        <>
          <Button variant="ghost" onClick={() => setPreview((p) => !p)} icon={<Eye className="h-4 w-4" />}>
            {preview ? "بازگشت به فرم" : "پیش‌نمایش"}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            انصراف
          </Button>
          <Button onClick={save} loading={busy}>
            ذخیره
          </Button>
        </>
      }
    >
      {preview ? (
        <QuestionCard question={previewQ} showAnswerByDefault />
      ) : (
        <div className="space-y-5">
          {/* subjects & topics */}
          <div>
            <div className="mb-1.5 text-sm font-medium text-slate-700">درس(ها)</div>
            <div className="flex flex-wrap gap-1.5">
              {catalog.subjects.map((s) => (
                <Chip key={s.id} active={form.subjectIds.includes(s.id)} onClick={() => set("subjectIds", form.subjectIds.includes(s.id) ? form.subjectIds.filter((x) => x !== s.id) : [...form.subjectIds, s.id])}>
                  {s.emoji} {s.title}
                </Chip>
              ))}
            </div>
          </div>
          {topics.length > 0 && (
            <div>
              <div className="mb-1.5 text-sm font-medium text-slate-700">مبحث(ها)</div>
              <div className="flex flex-wrap gap-1.5">
                {topics.map((t) => (
                  <Chip key={t.id} active={form.topicIds.includes(t.id)} onClick={() => set("topicIds", form.topicIds.includes(t.id) ? form.topicIds.filter((x) => x !== t.id) : [...form.topicIds, t.id])}>
                    {t.title}
                  </Chip>
                ))}
              </div>
            </div>
          )}

          <Textarea label="صورت سوال (LaTeX با $...$ و $$...$$، تصویر با [[img:ID]])" rows={5} value={form.stem} onChange={(e) => set("stem", e.target.value)} />

          <div className="grid gap-3 sm:grid-cols-2">
            {form.options.map((o, i) => (
              <div key={i} className="flex items-start gap-2">
                <button
                  onClick={() => set("correctIndex", i)}
                  className={cn("mt-7 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition", form.correctIndex === i ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-emerald-100")}
                  title="علامت‌گذاری به‌عنوان پاسخ صحیح"
                >
                  {toFa(i + 1)}
                </button>
                <div className="flex-1">
                  <Input label={`گزینه ${toFa(i + 1)}${form.correctIndex === i ? " (صحیح)" : ""}`} value={o} onChange={(e) => set("options", form.options.map((x, j) => (j === i ? e.target.value : x)) as Question["options"])} />
                </div>
              </div>
            ))}
          </div>

          <Textarea label="پاسخ تشریحی" rows={6} value={form.explanation} onChange={(e) => set("explanation", e.target.value)} />

          <div className="grid gap-3 sm:grid-cols-4">
            <Select label="سطح" value={form.difficulty} onChange={(e) => set("difficulty", Number(e.target.value) as Difficulty)}>
              {([1, 2, 3] as Difficulty[]).map((d) => (
                <option key={d} value={d}>
                  {DIFFICULTY_LABEL[d]}
                </option>
              ))}
            </Select>
            <Select label="منبع" value={form.sourceId} onChange={(e) => set("sourceId", e.target.value)}>
              {catalog.sources.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </Select>
            <Input label="زمان پیشنهادی (ثانیه)" type="number" ltr value={form.estimatedSeconds} onChange={(e) => set("estimatedSeconds", Number(e.target.value))} />
            <div className="pt-6">
              <Toggle checked={form.isActive} onChange={(v) => set("isActive", v)} label="فعال" />
            </div>
          </div>

          {/* tags */}
          <div>
            <div className="mb-1.5 text-sm font-medium text-slate-700">برچسب‌ها</div>
            <div className="flex flex-wrap items-center gap-1.5">
              {form.tags.map((t) => (
                <span key={t} className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs">
                  #{t}
                  <button onClick={() => set("tags", form.tags.filter((x) => x !== t))} className="text-slate-400 hover:text-rose-600">
                    ×
                  </button>
                </span>
              ))}
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && tagInput.trim()) {
                    e.preventDefault();
                    if (!form.tags.includes(tagInput.trim())) set("tags", [...form.tags, tagInput.trim()]);
                    setTagInput("");
                  }
                }}
                placeholder="برچسب + Enter"
                className="h-8 rounded-lg border border-slate-200 px-2 text-xs focus:outline-none"
              />
            </div>
          </div>

          {/* images */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">تصاویر</span>
              <Button size="sm" variant="outline" icon={<ImagePlus className="h-3.5 w-3.5" />} onClick={() => addImage()}>
                افزودن تصویر
              </Button>
            </div>
            <div className="space-y-2">
              {form.images.map((im, i) => (
                <div key={i} className="grid gap-2 rounded-xl border border-slate-200 p-3 sm:grid-cols-[80px_1fr_1fr_auto]">
                  <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-lg bg-slate-50">{im.src ? <img src={im.src} alt={im.alt} className="max-h-full max-w-full" /> : <ImagePlus className="h-6 w-6 text-slate-300" />}</div>
                  <div className="space-y-2">
                    <Input label="شناسه (برای [[img:ID]])" ltr value={im.id} onChange={(e) => updateImage(i, { id: e.target.value })} />
                    <Input label="آدرس (URL یا مسیر /media/...)" ltr value={im.src.startsWith("data:") ? "(فایل آپلودشده)" : im.src} onChange={(e) => updateImage(i, { src: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Input label="متن جایگزین" value={im.alt} onChange={(e) => updateImage(i, { alt: e.target.value })} />
                    <Input label="زیرنویس" value={im.caption ?? ""} onChange={(e) => updateImage(i, { caption: e.target.value })} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-lg border border-slate-200 px-2 text-xs hover:bg-slate-50">
                      <Upload className="h-3.5 w-3.5" /> فایل
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadFile(i, e.target.files[0])} />
                    </label>
                    <Button size="sm" variant="ghost" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => insertPlaceholder(im.id)}>
                      درج در متن
                    </Button>
                    <Button size="sm" variant="ghost" className="text-rose-600" icon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => set("images", form.images.filter((_, j) => j !== i))} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
