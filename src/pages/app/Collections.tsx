import { ArrowRight, FolderHeart, Pencil, Play, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { Collection } from "@/types";
import { COLLECTION_COLORS, collectionColorClass } from "@/components/CollectionPicker";
import { QuestionCard } from "@/components/QuestionCard";
import { Button, Card, ConfirmDialog, EmptyState, Input, Modal, PageHeader, Textarea } from "@/components/ui";
import { cn, relativeTime, toFa } from "@/lib/utils";
import { api } from "@/services";
import { useApp } from "@/store/AppContext";
import { StartExamModal } from "./ExamStartModal";

function CollectionForm({ open, onClose, initial }: { open: boolean; onClose: () => void; initial?: Collection }) {
  const { refreshUserData, toast } = useApp();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [color, setColor] = useState<string>(initial?.color ?? "violet");
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!title.trim()) return;
    setBusy(true);
    try {
      if (initial) await api.updateCollection(initial.id, { title, description, color });
      else await api.createCollection({ title, description, color });
      await refreshUserData();
      toast(initial ? "مجموعه ویرایش شد" : "مجموعه ساخته شد", "success");
      onClose();
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? "ویرایش مجموعه" : "مجموعه‌ی جدید"}
      size="sm"
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
        <Input label="عنوان" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثلاً مرور شب کنکور" autoFocus />
        <Textarea label="توضیح (اختیاری)" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        <div>
          <div className="mb-1.5 text-sm font-medium text-slate-700">رنگ</div>
          <div className="flex gap-2">
            {COLLECTION_COLORS.map((c) => (
              <button key={c} onClick={() => setColor(c)} className={cn("h-8 w-8 rounded-full ring-offset-2 transition", collectionColorClass(c), color === c && "ring-2 ring-slate-800")} />
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default function Collections() {
  const { userData } = useApp();
  const [formOpen, setFormOpen] = useState(false);
  return (
    <div>
      <PageHeader
        title="مجموعه‌های من"
        description="سوالات را دسته‌بندی کنید و هر مجموعه را به‌صورت آزمون حل کنید"
        actions={
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => setFormOpen(true)}>
            مجموعه‌ی جدید
          </Button>
        }
      />
      {userData.collections.length === 0 ? (
        <EmptyState icon={<FolderHeart className="h-6 w-6" />} title="هنوز مجموعه‌ای نساخته‌اید" description="از بانک تست، سوالات را انتخاب و به مجموعه اضافه کنید." action={<Button onClick={() => setFormOpen(true)}>ساخت اولین مجموعه</Button>} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {userData.collections.map((c) => (
            <Link key={c.id} to={`/app/collections/${c.id}`}>
              <Card className="group h-full p-5 transition hover:-translate-y-0.5 hover:shadow-md">
                <div className={cn("mb-3 flex h-10 w-10 items-center justify-center rounded-xl text-white", collectionColorClass(c.color))}>
                  <FolderHeart className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-slate-900 group-hover:text-brand-700">{c.title}</h3>
                {c.description && <p className="mt-1 line-clamp-2 text-xs text-slate-500">{c.description}</p>}
                <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                  <span>{toFa(c.questionIds.length)} سوال</span>
                  <span>{relativeTime(c.updatedAt)}</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
      {formOpen && <CollectionForm open={formOpen} onClose={() => setFormOpen(false)} />}
    </div>
  );
}

export function CollectionDetail() {
  const { id } = useParams();
  const { userData, catalog, refreshUserData, toast } = useApp();
  const navigate = useNavigate();
  const col = userData.collections.find((c) => c.id === id);
  const [edit, setEdit] = useState(false);
  const [del, setDel] = useState(false);
  const [start, setStart] = useState(false);

  if (!col) return <EmptyState title="مجموعه یافت نشد" action={<Button onClick={() => navigate("/app/collections")}>بازگشت</Button>} />;
  const questions = col.questionIds.map((q) => catalog.questionById.get(q)).filter(Boolean) as NonNullable<ReturnType<typeof catalog.questionById.get>>[];

  const remove = async (qid: string) => {
    await api.removeFromCollection(col.id, qid);
    await refreshUserData();
    toast("سوال از مجموعه حذف شد", "info");
  };

  return (
    <div>
      <Link to="/app/collections" className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand-600">
        <ArrowRight className="h-4 w-4" /> همه‌ی مجموعه‌ها
      </Link>
      <PageHeader
        title={col.title}
        description={col.description || `${toFa(questions.length)} سوال`}
        actions={
          <>
            <Button variant="outline" icon={<Pencil className="h-4 w-4" />} onClick={() => setEdit(true)}>
              ویرایش
            </Button>
            <Button variant="outline" className="text-rose-600 hover:bg-rose-50" icon={<Trash2 className="h-4 w-4" />} onClick={() => setDel(true)}>
              حذف
            </Button>
            <Button icon={<Play className="h-4 w-4" />} disabled={questions.length === 0} onClick={() => setStart(true)}>
              حل به‌صورت آزمون
            </Button>
          </>
        }
      />
      {questions.length === 0 ? (
        <EmptyState title="این مجموعه خالی است" description="از بانک تست سوالات را به این مجموعه اضافه کنید." action={<Button onClick={() => navigate("/app/bank")}>رفتن به بانک تست</Button>} />
      ) : (
        <div className="space-y-4">
          {questions.map((q, i) => (
            <QuestionCard
              key={q.id}
              question={q}
              index={i}
              extraActions={
                <Button size="sm" variant="ghost" className="text-rose-600" icon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => remove(q.id)}>
                  حذف از مجموعه
                </Button>
              }
            />
          ))}
        </div>
      )}
      {edit && <CollectionForm open={edit} onClose={() => setEdit(false)} initial={col} />}
      <ConfirmDialog
        open={del}
        onClose={() => setDel(false)}
        danger
        title="حذف مجموعه"
        message={`آیا از حذف مجموعه‌ی «${col.title}» مطمئن هستید؟ سوالات از بانک حذف نمی‌شوند.`}
        confirmText="حذف"
        onConfirm={async () => {
          await api.deleteCollection(col.id);
          await refreshUserData();
          navigate("/app/collections");
        }}
      />
      {start && <StartExamModal open={start} onClose={() => setStart(false)} title={col.title} questionIds={col.questionIds} sourceType="collection" sourceId={col.id} />}
    </div>
  );
}
