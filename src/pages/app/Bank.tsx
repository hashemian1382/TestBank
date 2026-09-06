import { Bookmark, CheckSquare, FolderPlus, Library, Play, Square, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { ID, QuestionFilter } from "@/types";
import { CollectionPicker } from "@/components/CollectionPicker";
import { QuestionCard } from "@/components/QuestionCard";
import { QuestionFilters } from "@/components/QuestionFilters";
import { Button, EmptyState, PageHeader } from "@/components/ui";
import { useFilteredQuestions } from "@/hooks/useFilteredQuestions";
import { emptyFilter } from "@/lib/questionFilter";
import { toFa } from "@/lib/utils";
import { useApp } from "@/store/AppContext";

const PAGE = 10;

export default function Bank({ bookmarks = false }: { bookmarks?: boolean }) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user, catalog } = useApp();
  const [filter, setFilter] = useState<QuestionFilter>(() => ({
    ...emptyFilter(),
    ownedOnly: !bookmarks,
    bookmarkedOnly: bookmarks,
    subjectIds: params.get("subject") ? [params.get("subject")!] : [],
    topicIds: params.get("topic") ? [params.get("topic")!] : [],
    answerState: (params.get("answerState") as QuestionFilter["answerState"]) ?? "any",
  }));
  const [showAll, setShowAll] = useState(false);
  const [selected, setSelected] = useState<Set<ID>>(new Set());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [limit, setLimit] = useState(PAGE);

  useEffect(() => {
    setFilter((f) => ({ ...f, ownedOnly: !showAll && !bookmarks }));
  }, [showAll, bookmarks]);

  useEffect(() => {
    setFilter((previous) => {
      const topicIds = previous.topicIds?.map((id) => catalog.topicById.get(id)?.id ?? id);
      return topicIds?.some((id, index) => id !== previous.topicIds?.[index]) ? { ...previous, topicIds: [...new Set(topicIds)] } : previous;
    });
  }, [catalog.topicById]);

  useEffect(() => setLimit(PAGE), [filter]);

  const questions = useFilteredQuestions(filter);
  const visible = useMemo(() => questions.slice(0, limit), [questions, limit]);
  const allVisibleSelected = visible.length > 0 && visible.every((q) => selected.has(q.id));

  const toggle = (id: ID) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const startQuick = () => {
    navigate("/app/exams/new", { state: { questionIds: [...selected] } });
  };

  return (
    <div>
      <PageHeader
        title={bookmarks ? "سوالات نشان‌شده" : "بانک تست"}
        description={bookmarks ? "سوالاتی که برای مرور بعدی نشان کرده‌اید" : "تمام تست‌های درس‌های شما با فیلترهای پیشرفته"}
        actions={
          !bookmarks && user?.role !== "admin" ? (
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
              <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} className="h-4 w-4 accent-brand-600" />
              نمایش درس‌های خریداری‌نشده
            </label>
          ) : null
        }
      />

      <QuestionFilters value={filter} onChange={setFilter} resultCount={questions.length} ownedOnlyOptions={!showAll && !bookmarks && user?.role !== "admin"} />

      {/* bulk bar */}
      <div className="sticky top-14 z-10 my-4 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white/90 px-3 py-2 backdrop-blur lg:top-2">
        <button
          onClick={() => setSelected(allVisibleSelected ? new Set() : new Set(visible.map((q) => q.id)))}
          className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-brand-700"
        >
          {allVisibleSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />} انتخاب همه‌ی نمایش‌داده‌شده‌ها
        </button>
        {selected.size > 0 && (
          <>
            <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">{toFa(selected.size)} انتخاب‌شده</span>
            <div className="mr-auto flex items-center gap-2">
              <Button size="sm" variant="outline" icon={<FolderPlus className="h-3.5 w-3.5" />} onClick={() => setPickerOpen(true)}>
                افزودن به مجموعه
              </Button>
              <Button size="sm" icon={<Play className="h-3.5 w-3.5" />} onClick={startQuick}>
                ساخت آزمون از انتخاب‌ها
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())} icon={<X className="h-3.5 w-3.5" />} />
            </div>
          </>
        )}
      </div>

      {questions.length === 0 ? (
        <EmptyState
          icon={bookmarks ? <Bookmark className="h-6 w-6" /> : <Library className="h-6 w-6" />}
          title="سوالی یافت نشد"
          description={bookmarks ? "با کلیک روی «نشان‌گذاری» در هر سوال، آن را اینجا ذخیره کنید." : "فیلترها را تغییر دهید یا درس جدیدی از فروشگاه تهیه کنید."}
          action={
            !bookmarks && (
              <Button variant="outline" onClick={() => navigate("/app/store")}>
                رفتن به فروشگاه
              </Button>
            )
          }
        />
      ) : (
        <div className="space-y-4">
          {visible.map((q, i) => (
            <QuestionCard key={q.id} question={q} index={i} selectable selected={selected.has(q.id)} onToggleSelect={() => toggle(q.id)} />
          ))}
          {limit < questions.length && (
            <div className="text-center">
              <Button variant="outline" onClick={() => setLimit((l) => l + PAGE)}>
                نمایش {toFa(Math.min(PAGE, questions.length - limit))} سوال بیشتر ({toFa(questions.length - limit)} باقی‌مانده)
              </Button>
            </div>
          )}
        </div>
      )}

      {pickerOpen && (
        <CollectionPicker
          open={pickerOpen}
          onClose={() => {
            setPickerOpen(false);
            setSelected(new Set());
          }}
          questionIds={[...selected]}
        />
      )}
    </div>
  );
}
