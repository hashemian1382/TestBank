import { Copy, Download, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { Question, QuestionFilter } from "@/types";
import { QuestionMeta } from "@/components/QuestionCard";
import { QuestionFilters } from "@/components/QuestionFilters";
import { Badge, Button, Card, ConfirmDialog, PageHeader } from "@/components/ui";
import { emptyFilter } from "@/lib/questionFilter";
import { applyQuestionFilter } from "@/lib/questionFilter";
import { downloadJson } from "@/lib/download";
import { plainText, toFa } from "@/lib/utils";
import { api } from "@/services";
import { useApp } from "@/store/AppContext";
import { QuestionEditor } from "./QuestionEditor";

export default function AdminQuestions() {
  const { catalog, refreshCatalog, toast } = useApp();
  const [filter, setFilter] = useState<QuestionFilter>(emptyFilter);
  const [editing, setEditing] = useState<Question | null | "new">(null);
  const [del, setDel] = useState<Question | null>(null);
  const [limit, setLimit] = useState(25);

  const list = useMemo(() => applyQuestionFilter(catalog.questions, filter, { subjects: catalog.subjects, includeInactive: true }), [catalog.questions, catalog.subjects, filter]);

  const completeSubjectIds = (q: Question) => [...new Set([...q.subjectIds, ...q.topicIds.flatMap((id) => {
    const topic = catalog.topicById.get(id); return topic ? [topic.subjectId] : [];
  })])];
  const exportJson = () => {
    const rows = list.map((q) => ({
      subjects: completeSubjectIds(q),
      topics: q.topicIds,
      stem: q.stem,
      options: q.options,
      correct: q.correctIndex + 1,
      explanation: q.explanation,
      difficulty: q.difficulty,
      source: q.sourceId,
      tags: q.tags,
      images: q.images,
      estimatedSeconds: q.estimatedSeconds,
      lessonIds: q.lessonIds ?? [],
      isActive: q.isActive,
    }));
    downloadJson(rows, `questions-${Date.now()}.json`);
    if (list.some((q) => completeSubjectIds(q).length !== q.subjectIds.length)) toast("در خروجی، درسِ مباحث میان‌درسی قدیمی هم افزوده شد تا ورود مجدد معتبر باشد؛ اصل سوال‌ها تغییر نکرد", "info");
  };

  const duplicate = async (q: Question) => {
    const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = q;
    void _id;
    void _c;
    void _u;
    try {
      await api.admin.createQuestion({ ...rest, subjectIds: completeSubjectIds(q), stem: `${rest.stem}\n(کپی)` });
      await refreshCatalog();
      toast("کپی سوال ساخته شد", "success");
    } catch (error) { toast(error instanceof Error ? error.message : "کپی انجام نشد", "error"); }
  };

  return (
    <div>
      <PageHeader
        title="مدیریت سوالات"
        description={`${toFa(catalog.questions.length)} سوال در بانک`}
        actions={
          <>
            <Button variant="outline" icon={<Download className="h-4 w-4" />} onClick={exportJson}>
              خروجی JSON
            </Button>
            <Link to="/admin/import">
              <Button variant="outline" icon={<Upload className="h-4 w-4" />}>
                ورود گروهی
              </Button>
            </Link>
            <Button icon={<Plus className="h-4 w-4" />} onClick={() => setEditing("new")}>
              سوال جدید
            </Button>
          </>
        }
      />
      <QuestionFilters value={filter} onChange={setFilter} resultCount={list.length} personal={false} compact />

      <Card className="mt-4 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500">
            <tr>
              <th className="px-4 py-3 text-right font-medium">شناسه</th>
              <th className="px-4 py-3 text-right font-medium">صورت سوال</th>
              <th className="hidden px-4 py-3 text-right font-medium md:table-cell">دسته‌بندی</th>
              <th className="px-4 py-3 text-right font-medium">وضعیت</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {list.slice(0, limit).map((q) => (
              <tr key={q.id} className="hover:bg-slate-50/60">
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{q.id}</td>
                <td className="max-w-xs px-4 py-3">
                  <div className="line-clamp-2 text-slate-800">{plainText(q.stem)}</div>
                </td>
                <td className="hidden px-4 py-3 md:table-cell">
                  <QuestionMeta question={q} />
                </td>
                <td className="px-4 py-3">{q.isActive ? <Badge tone="emerald">فعال</Badge> : <Badge tone="rose">غیرفعال</Badge>}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => setEditing(q)} className="rounded-lg p-2 text-slate-500 hover:bg-brand-50 hover:text-brand-700" title="ویرایش">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => duplicate(q)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" title="کپی">
                      <Copy className="h-4 w-4" />
                    </button>
                    <button onClick={() => setDel(q)} className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600" title="حذف">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                  سوالی یافت نشد
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {limit < list.length && (
          <div className="border-t border-slate-100 p-3 text-center">
            <Button variant="ghost" size="sm" onClick={() => setLimit((l) => l + 25)}>
              نمایش بیشتر ({toFa(list.length - limit)} باقی‌مانده)
            </Button>
          </div>
        )}
      </Card>

      {editing && <QuestionEditor key={editing === "new" ? "new" : editing.id} open onClose={() => setEditing(null)} initial={editing === "new" ? undefined : editing} />}
      <ConfirmDialog
        open={!!del}
        onClose={() => setDel(null)}
        danger
        title="حذف سوال"
        message={`سوال ${del?.id} برای همیشه حذف شود؟ این سوال از مجموعه‌ها و آزمون‌های کاربران نیز حذف می‌شود.`}
        confirmText="حذف"
        onConfirm={async () => {
          if (!del) return;
          await api.admin.deleteQuestion(del.id);
          await refreshCatalog();
          toast("سوال حذف شد", "info");
        }}
      />
    </div>
  );
}
