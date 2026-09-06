import { Bold, Code2, Heading2, ImagePlus, List, ListOrdered, Plus, Quote, Sigma, Table2, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import type { QuestionImage } from "@/types";
import { Button, ConfirmDialog, Input, Textarea } from "./ui";
import { toFa, uid } from "@/lib/utils";
import { resolveMediaUrl } from "@/services/config";
import { useApp } from "@/store/AppContext";
import { isSafeImageSrc } from "@/services/contentValidation";

export function TagInput({ tags, onChange }: { tags: string[]; onChange: (tags: string[]) => void }) {
  const [value, setValue] = useState("");
  const add = () => {
    const additions = value.split(/[,،]/).map((tag) => tag.trim()).filter(Boolean);
    onChange([...new Set([...tags, ...additions])]); setValue("");
  };
  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium text-slate-700">برچسب‌ها</span>
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 p-2">
        {tags.map((tag) => <span key={tag} className="inline-flex items-center gap-1 rounded-lg bg-brand-50 px-2 py-1 text-xs text-brand-700">
          {tag}<button type="button" aria-label={`حذف برچسب ${tag}`} onClick={() => onChange(tags.filter((t) => t !== tag))} className="px-1">×</button>
        </span>)}
        <input aria-label="برچسب جدید" value={value} onChange={(e) => setValue(e.target.value)} onBlur={() => { if (value.trim()) add(); }}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === "," || e.key === "،") { e.preventDefault(); add(); } }}
          placeholder="برچسب + Enter" className="h-8 min-w-0 flex-1 bg-transparent px-2 text-xs outline-none" />
      </div>
    </div>
  );
}

const LESSON_TEMPLATE = `## هدف‌های یادگیری
- در پایان این درسنامه می‌توانید ...

## مفاهیم پایه
توضیح مفاهیم به زبان ساده و دقیق.

## مثال حل‌شده
صورت مثال و راه‌حل مرحله‌به‌مرحله.

> **نکته‌ی تستی:** نکته‌ی کلیدی این مبحث.

## اشتباه‌های رایج
- یک اشتباه رایج و راه پیشگیری از آن.

## جمع‌بندی
مهم‌ترین نکات و فرمول‌ها.
`;

export function RichTextEditor({ value, onChange, images, onImagesChange, onUploadingChange }: {
  value: string; onChange: (text: string) => void; images: QuestionImage[]; onImagesChange: (images: QuestionImage[]) => void; onUploadingChange?: (uploading: boolean) => void;
}) {
  const { toast } = useApp();
  const textarea = useRef<HTMLTextAreaElement>(null);
  const imagesRef = useRef(images); imagesRef.current = images;
  const [deleting, setDeleting] = useState<QuestionImage | null>(null);
  const [uploading, setUploading] = useState(false);
  const insert = (before: string, after = "", placeholder = "") => {
    const field = textarea.current;
    const start = field?.selectionStart ?? value.length;
    const end = field?.selectionEnd ?? value.length;
    const selected = value.slice(start, end) || placeholder;
    onChange(`${value.slice(0, start)}${before}${selected}${after}${value.slice(end)}`);
    requestAnimationFrame(() => { field?.focus(); field?.setSelectionRange(start + before.length, start + before.length + selected.length); });
  };
  const update = (id: string, patch: Partial<QuestionImage>) => onImagesChange(imagesRef.current.map((image) => image.id === id ? { ...image, ...patch } : image));
  const upload = async (file: File) => {
    if (!/^image\/(png|jpeg|gif|webp|avif)$/.test(file.type)) return toast("فایل PNG، JPEG، WebP، GIF یا AVIF انتخاب کنید", "error");
    if (file.size > 1024 * 1024) return toast("حداکثر حجم هر تصویر محلی ۱ مگابایت است؛ برای فایل بزرگ‌تر از آدرس تصویر استفاده کنید", "error");
    setUploading(true); onUploadingChange?.(true);
    try {
      const src = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader(); reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("خواندن تصویر انجام نشد")); reader.readAsDataURL(file);
      });
      onImagesChange([...imagesRef.current, { id: uid("img"), src, alt: file.name, width: 720 }]);
      toast("تصویر اضافه شد؛ با «درج در محتوا» آن را در درسنامه قرار دهید", "success");
    } catch (error) { toast(error instanceof Error ? error.message : "خطا در خواندن تصویر", "error"); }
    finally { setUploading(false); onUploadingChange?.(false); }
  };
  const tools = [
    { label: "تیتر", icon: <Heading2 />, action: () => insert("\n## ", "\n", "عنوان بخش") },
    { label: "زیرتیتر", icon: <Heading2 />, action: () => insert("\n### ", "\n", "عنوان زیربخش") },
    { label: "پررنگ", icon: <Bold />, action: () => insert("**", "**", "متن مهم") },
    { label: "فهرست", icon: <List />, action: () => insert("\n- ", "\n", "نکته‌ی اول") },
    { label: "مراحل", icon: <ListOrdered />, action: () => insert("\n1. ", "\n2. مرحله‌ی دوم\n", "مرحله‌ی اول") },
    { label: "نکته", icon: <Quote />, action: () => insert("\n> **نکته:** ", "\n", "نکته‌ی مهم") },
    { label: "فرمول", icon: <Sigma />, action: () => insert("$", "$", "x^2") },
    { label: "فرمول نمایشی", icon: <Sigma />, action: () => insert("\n$$\n", "\n$$\n", "\\frac{a}{b}") },
    { label: "جدول", icon: <Table2 />, action: () => insert("\n| عنوان | توضیح |\n|---|---|\n| مورد اول | توضیح مورد |\n") },
    { label: "کد", icon: <Code2 />, action: () => insert("\n```\n", "\n```\n", "code") },
    { label: "متن چپ‌به‌راست", icon: <Code2 />, action: () => insert('<span class="ltr">', "</span>", "English text") },
  ];
  return (
    <div className="min-w-0 space-y-4">
      <div className="overflow-hidden rounded-xl border border-slate-200">
        <div role="toolbar" aria-label="ابزارهای نگارش درسنامه" className="flex flex-wrap gap-1 border-b border-slate-200 bg-slate-50 p-2">
          {tools.map((tool) => <button type="button" key={tool.label} onMouseDown={(e) => e.preventDefault()} onClick={tool.action}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] text-slate-600 hover:bg-white hover:text-brand-700 [&_svg]:h-3.5 [&_svg]:w-3.5">{tool.icon}{tool.label}</button>)}
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => insert(`\n${LESSON_TEMPLATE}`)}
            className="mr-auto rounded-lg px-2 py-1.5 text-[11px] font-medium text-brand-700 hover:bg-brand-50">درج الگوی درسنامه</button>
        </div>
        <Textarea ref={textarea} label="محتوای درسنامه" value={value} onChange={(e) => onChange(e.target.value)} rows={20}
          className="min-h-80 resize-y rounded-none border-0 leading-8 focus:ring-0" placeholder="متن درسنامه را بنویسید؛ از نوار ابزار برای تیتر، فرمول، جدول و نکته استفاده کنید." />
        <p className="px-3 pb-3 text-[11px] leading-6 text-slate-500">متن با Markdown سبک ذخیره می‌شود. فرمول: <bdi dir="ltr">$...$</bdi> و <bdi dir="ltr">$$...$$</bdi>. تصویر: <bdi dir="ltr">[[img:ID]]</bdi> در یک خط جداگانه. HTML دلخواه اجرا نمی‌شود.</p>
      </div>
      <details className="rounded-xl border border-slate-200 bg-white p-3" open={images.length > 0 || undefined}>
        <summary className="cursor-pointer text-sm font-semibold text-slate-800">تصاویر و شکل‌ها ({toFa(images.length)})</summary>
        <p className="mt-2 text-xs leading-6 text-slate-500">تصاویر محلی در همین مرورگر ذخیره می‌شوند. برای درسنامه‌های حجیم، آدرس تصویر را وارد کنید. متن جایگزین، زیرنویس و عرض نمایش قابل تنظیم‌اند.</p>
        <div className="my-3 flex flex-wrap gap-2">
          <Button variant="outline" size="sm" icon={<ImagePlus className="h-4 w-4" />} onClick={() => onImagesChange([...images, { id: uid("img"), src: "", alt: "", width: 720 }])}>تصویر با آدرس</Button>
          <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs text-slate-700 hover:bg-slate-50">
            <Upload className="h-3.5 w-3.5" />{uploading ? "در حال خواندن..." : "بارگذاری تصویر"}
            <input aria-label="بارگذاری تصویر درسنامه" type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/avif" disabled={uploading} className="sr-only" onChange={(e) => { if (e.target.files?.[0]) void upload(e.target.files[0]); e.target.value = ""; }} />
          </label>
        </div>
        <div className="space-y-3">
          {images.map((image) => <div key={image.id} className="grid min-w-0 gap-3 rounded-xl border border-slate-200 p-3 sm:grid-cols-[100px_1fr]">
            <div className="flex h-24 items-center justify-center rounded-lg bg-slate-50">
              {isSafeImageSrc(image.src) ? <img src={resolveMediaUrl(image.src)} alt={image.alt} className="max-h-full max-w-full rounded-lg object-contain" /> : <ImagePlus className="h-6 w-6 text-slate-300" />}
            </div>
            <div className="min-w-0 space-y-3">
              <Input label="آدرس تصویر" ltr value={image.src.startsWith("data:") ? "" : image.src} onChange={(e) => update(image.id, { src: e.target.value })} placeholder={image.src.startsWith("data:") ? "فایل محلی بارگذاری شده؛ برای جایگزینی URL وارد کنید" : "https://... یا /media/..."} />
              <div className="grid gap-3 sm:grid-cols-3">
                <Input label="متن جایگزین تصویر" value={image.alt} onChange={(e) => update(image.id, { alt: e.target.value })} />
                <Input label="زیرنویس تصویر" value={image.caption ?? ""} onChange={(e) => update(image.id, { caption: e.target.value })} />
                <Input label="حداکثر عرض (پیکسل)" type="number" min={1} ltr value={image.width ?? ""} onChange={(e) => update(image.id, { width: e.target.value ? Number(e.target.value) : undefined })} />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <code dir="ltr" className="min-w-0 break-all text-[10px] text-slate-400">{image.id}</code>
                <Button size="sm" variant="outline" icon={<Plus className="h-3 w-3" />} onClick={() => insert(`\n[[img:${image.id}]]\n`)}>درج در محتوا</Button>
                <Button size="sm" variant="ghost" className="text-rose-600" icon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => setDeleting(image)}>حذف تصویر</Button>
              </div>
            </div>
          </div>)}
        </div>
      </details>
      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} title="حذف تصویر" danger confirmText="حذف تصویر"
        message="تصویر و ارجاع‌های آن از متن این درسنامه برداشته شوند؟ این تغییر با ذخیره‌ی درسنامه نهایی می‌شود."
        onConfirm={() => { if (!deleting) return; onImagesChange(images.filter((im) => im.id !== deleting.id)); onChange(value.split(`[[img:${deleting.id}]]`).join("")); }} />
    </div>
  );
}
