import { Check, FolderPlus, Plus } from "lucide-react";
import { useState } from "react";
import type { ID } from "@/types";
import { api } from "@/services";
import { cn, toFa } from "@/lib/utils";
import { useApp } from "@/store/AppContext";
import { Button, Input, Modal } from "./ui";

export const COLLECTION_COLORS = ["violet", "sky", "emerald", "amber", "rose", "slate"] as const;
export const collectionColorClass = (c: string) =>
  ({
    violet: "bg-violet-500",
    sky: "bg-sky-500",
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    rose: "bg-rose-500",
    slate: "bg-slate-500",
  })[c] ?? "bg-slate-500";

export function CollectionPicker({ open, onClose, questionIds }: { open: boolean; onClose: () => void; questionIds: ID[] }) {
  const { userData, refreshUserData, toast } = useApp();
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const add = async (collectionId: ID) => {
    setBusy(collectionId);
    try {
      await api.addToCollection(collectionId, questionIds);
      await refreshUserData();
      toast(`${toFa(questionIds.length)} سوال به مجموعه اضافه شد`, "success");
      onClose();
    } finally {
      setBusy(null);
    }
  };

  const create = async () => {
    if (!title.trim()) return;
    setBusy("new");
    try {
      const c = await api.createCollection({ title: title.trim(), description: "", color: COLLECTION_COLORS[userData.collections.length % COLLECTION_COLORS.length] });
      await api.addToCollection(c.id, questionIds);
      await refreshUserData();
      toast("مجموعه ساخته شد و سوال به آن اضافه شد", "success");
      onClose();
    } finally {
      setBusy(null);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="افزودن به مجموعه" size="sm">
      <div className="space-y-2">
        {userData.collections.map((c) => {
          const already = questionIds.every((q) => c.questionIds.includes(q));
          return (
            <button
              key={c.id}
              disabled={already || busy !== null}
              onClick={() => add(c.id)}
              className={cn("flex w-full items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5 text-right transition hover:border-brand-300 hover:bg-brand-50/40 disabled:opacity-60", already && "bg-emerald-50")}
            >
              <span className={cn("h-3 w-3 rounded-full", collectionColorClass(c.color))} />
              <span className="flex-1">
                <span className="block text-sm font-medium text-slate-800">{c.title}</span>
                <span className="block text-xs text-slate-500">{toFa(c.questionIds.length)} سوال</span>
              </span>
              {already ? <Check className="h-4 w-4 text-emerald-600" /> : <FolderPlus className="h-4 w-4 text-slate-400" />}
            </button>
          );
        })}
        {userData.collections.length === 0 && !creating && <p className="py-3 text-center text-sm text-slate-500">هنوز مجموعه‌ای ندارید.</p>}
        {creating ? (
          <div className="flex items-end gap-2 pt-2">
            <div className="flex-1">
              <Input autoFocus label="نام مجموعه‌ی جدید" value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && create()} placeholder="مثلاً مرور شب کنکور" />
            </div>
            <Button onClick={create} loading={busy === "new"}>
              ایجاد
            </Button>
          </div>
        ) : (
          <Button variant="outline" className="w-full" onClick={() => setCreating(true)} icon={<Plus className="h-4 w-4" />}>
            مجموعه‌ی جدید
          </Button>
        )}
      </div>
    </Modal>
  );
}
