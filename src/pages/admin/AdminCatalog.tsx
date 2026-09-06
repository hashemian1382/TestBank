import { ChevronDown, ChevronUp, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import type { ExamDomainId, Subject } from "@/types";
import { Badge, Button, Card, Chip, ConfirmDialog, Input, Modal, PageHeader, Textarea, Toggle } from "@/components/ui";
import { cn, formatNumber, toFa } from "@/lib/utils";
import { api, ApiError } from "@/services";
import { TopicsPanel } from "./TopicsPanel";
import { useApp } from "@/store/AppContext";

type SubjectForm = Omit<Subject, "id">;
const emptySubject = (): SubjectForm => ({ title: "", domainIds: [], description: "", price: 150000, discountPercent: 0, emoji: "📘", isActive: true });

function SubjectModal({ open, onClose, initial }: { open: boolean; onClose: () => void; initial?: Subject }) {
  const { catalog, refreshCatalog, toast } = useApp();
  const [form, setForm] = useState<SubjectForm>(() => (initial ? { ...initial } : emptySubject()));
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof SubjectForm>(k: K, v: SubjectForm[K]) => setForm((f) => ({ ...f, [k]: v }));
  const save = async () => {
    if (!form.title.trim() || !form.domainIds.length) return toast("عنوان و حداقل یک حوزه الزامی است", "error");
    setBusy(true);
    try {
      if (initial) await api.admin.updateSubject(initial.id, form);
      else await api.admin.createSubject(form);
      await refreshCatalog();
      toast("ذخیره شد", "success");
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
      title={initial ? "ویرایش درس" : "درس جدید"}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            انصراف
          </Button>
          <Button onClick={save} loading={busy}>
            ذخیره
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-[70px_1fr] gap-3">
          <Input label="ایموجی" value={form.emoji} onChange={(e) => set("emoji", e.target.value)} className="text-center text-xl" />
          <Input label="عنوان درس" value={form.title} onChange={(e) => set("title", e.target.value)} />
        </div>
        <div>
          <div className="mb-1.5 text-sm font-medium text-slate-700">حوزه‌های امتحانی (می‌تواند مشترک باشد)</div>
          <div className="flex flex-wrap gap-1.5">
            {catalog.domains.map((d) => (
              <Chip key={d.id} active={form.domainIds.includes(d.id)} onClick={() => set("domainIds", form.domainIds.includes(d.id) ? form.domainIds.filter((x) => x !== d.id) : [...form.domainIds, d.id as ExamDomainId])}>
                {d.emoji} {d.shortTitle}
              </Chip>
            ))}
          </div>
        </div>
        <Textarea label="توضیح" rows={2} value={form.description} onChange={(e) => set("description", e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="قیمت (تومان)" type="number" ltr value={form.price} onChange={(e) => set("price", Number(e.target.value))} />
          <Input label="درصد تخفیف" type="number" ltr min={0} max={100} value={form.discountPercent} onChange={(e) => set("discountPercent", Math.min(100, Math.max(0, Number(e.target.value))))} />
        </div>
        <Toggle checked={form.isActive} onChange={(v) => set("isActive", v)} label="فعال (قابل خرید و نمایش)" />
      </div>
    </Modal>
  );
}

export default function AdminCatalog() {
  const { catalog, refreshCatalog, toast } = useApp();
  const [domain, setDomain] = useState<string>("all");
  const [modal, setModal] = useState<Subject | "new" | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [del, setDel] = useState<Subject | null>(null);
  const subjects = catalog.subjects.filter((s) => domain === "all" || s.domainIds.includes(domain as ExamDomainId));
  const qCount = (sid: string) => catalog.questions.filter((q) => q.subjectIds.includes(sid)).length;

  return (
    <div>
      <PageHeader
        title="درس‌ها و مباحث"
        description="مدیریت حوزه‌ها، درس‌ها، مباحث و قیمت‌گذاری"
        actions={
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => setModal("new")}>
            درس جدید
          </Button>
        }
      />
      <div className="mb-4 flex flex-wrap gap-1.5">
        <Chip active={domain === "all"} onClick={() => setDomain("all")}>
          همه ({toFa(catalog.subjects.length)})
        </Chip>
        {catalog.domains.map((d) => (
          <Chip key={d.id} active={domain === d.id} onClick={() => setDomain(d.id)}>
            {d.emoji} {d.shortTitle} ({toFa(catalog.subjects.filter((s) => s.domainIds.includes(d.id)).length)})
          </Chip>
        ))}
      </div>
      <div className="space-y-3">
        {subjects.map((s) => (
          <Card key={s.id} data-subject-id={s.id} className={cn("overflow-hidden", !s.isActive && "opacity-60")}>
            <div className="flex flex-wrap items-center gap-3 p-4">
              <span className="text-2xl">{s.emoji}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-slate-900">{s.title}</span>
                  {s.domainIds.map((d) => (
                    <Badge key={d}>{catalog.domainById.get(d)?.shortTitle}</Badge>
                  ))}
                  {!s.isActive && <Badge tone="rose">غیرفعال</Badge>}
                </div>
                <div className="mt-0.5 text-xs text-slate-500">
                  {toFa(catalog.topicsBySubject.get(s.id)?.length ?? 0)} مبحث • {toFa(qCount(s.id))} سوال • <span className="font-mono">{s.id}</span>
                </div>
              </div>
              <div className="text-left">
                <div className="font-bold text-slate-900">{formatNumber(s.price)} تومان</div>
                {s.discountPercent > 0 && <div className="text-xs text-rose-600">{toFa(s.discountPercent)}٪ تخفیف</div>}
              </div>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="outline" onClick={() => setExpanded(expanded === s.id ? null : s.id)}>
                  مباحث {expanded === s.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </Button>
                <button aria-label={`ویرایش درس ${s.title}`} onClick={() => setModal(s)} className="rounded-lg p-2 text-slate-500 hover:bg-brand-50 hover:text-brand-700">
                  <Pencil className="h-4 w-4" />
                </button>
                <button aria-label={`حذف درس ${s.title}`} onClick={() => setDel(s)} className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            {expanded === s.id && <TopicsPanel subject={s} />}
          </Card>
        ))}
      </div>
      {modal && <SubjectModal key={modal === "new" ? "new" : modal.id} open onClose={() => setModal(null)} initial={modal === "new" ? undefined : modal} />}
      <ConfirmDialog
        open={!!del}
        onClose={() => setDel(null)}
        danger
        title="حذف درس"
        message={`درس «${del?.title}» و همه‌ی مباحث آن حذف شود؟ (اگر سوال داشته باشد، حذف ممکن نیست)`}
        confirmText="حذف"
        onConfirm={async () => {
          if (!del) return;
          try {
            await api.admin.deleteSubject(del.id);
            await refreshCatalog();
            toast("درس حذف شد", "info");
          } catch (e) {
            toast(e instanceof ApiError ? e.message : "خطا", "error");
          }
        }}
      />
    </div>
  );
}
