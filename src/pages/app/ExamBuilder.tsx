import { ArrowDown, ArrowUp, Check, Layers, ListFilter, Play, Plus, Save, Search, Shuffle, Trash2, Wand2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import type { BlueprintRule, Difficulty, ID, Question, QuestionFilter } from "@/types";
import { QuestionMeta } from "@/components/QuestionCard";
import { QuestionFilters } from "@/components/QuestionFilters";
import { RichText } from "@/components/RichText";
import { Badge, Button, Card, Chip, Input, Modal, PageHeader, SearchInput, Select, Toggle } from "@/components/ui";
import { useFilteredQuestions } from "@/hooks/useFilteredQuestions";
import { emptyFilter } from "@/lib/questionFilter";
import { cn, DIFFICULTY_LABEL, plainText, sample, shuffle, toFa, uid } from "@/lib/utils";
import { api } from "@/services";
import { useApp } from "@/store/AppContext";
import { StartExamModal } from "./ExamStartModal";

type Mode = "blueprint" | "filter";

export default function ExamBuilder() {
  const { id: templateId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { catalog, user, userData, ownsSubject, refreshUserData, toast } = useApp();
  const preset: ID[] | undefined = (location.state as { questionIds?: ID[] } | null)?.questionIds;
  const template = templateId ? userData.templates.find((t) => t.id === templateId) : undefined;

  const [mode, setMode] = useState<Mode>("blueprint");
  const [title, setTitle] = useState(template?.title ?? (preset ? "آزمون از سوالات انتخابی" : ""));
  const [durationOn, setDurationOn] = useState(template ? template.durationMinutes !== null : true);
  const [duration, setDuration] = useState(template?.durationMinutes ?? 30);
  const [negative, setNegative] = useState(template?.negativeMarking ?? true);
  const [questionIds, setQuestionIds] = useState<ID[]>(template?.questionIds ?? preset ?? []);
  const [rules, setRules] = useState<BlueprintRule[]>(template?.blueprint ?? []);
  const [filter, setFilter] = useState<QuestionFilter>({ ...emptyFilter(), ownedOnly: user?.role !== "admin" });
  const [filterCount, setFilterCount] = useState(10);
  const [generating, setGenerating] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [startOpen, setStartOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (template) {
      setTitle(template.title);
      setQuestionIds(template.questionIds);
      setRules(template.blueprint ?? []);
      setDurationOn(template.durationMinutes !== null);
      setDuration(template.durationMinutes ?? 30);
      setNegative(template.negativeMarking);
    }
  }, [template]);

  const ownedSubjects = useMemo(() => catalog.subjects.filter((s) => s.isActive && ownsSubject(s.id)), [catalog.subjects, ownsSubject]);
  const filtered = useFilteredQuestions(filter);
  const questions = questionIds.map((q) => catalog.questionById.get(q)).filter(Boolean) as Question[];
  const totalMinutes = Math.round(questions.reduce((s, q) => s + q.estimatedSeconds, 0) / 60);

  /* ---------- blueprint ---------- */
  const addRule = () => {
    const first = ownedSubjects[0];
    if (!first) return toast("ابتدا حداقل یک درس تهیه کنید", "error");
    setRules((r) => [...r, { id: uid("rule"), subjectId: first.id, topicIds: [], count: 5, difficulties: [] }]);
  };
  const updateRule = (id: ID, patch: Partial<BlueprintRule>) => setRules((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const availableFor = (rule: BlueprintRule) =>
    catalog.questions.filter(
      (q) => q.subjectIds.includes(rule.subjectId) && (rule.topicIds.length === 0 || q.topicIds.some((t) => rule.topicIds.includes(t))) && (rule.difficulties.length === 0 || rule.difficulties.includes(q.difficulty))
    ).length;
  const ruleTotal = rules.reduce((s, r) => s + Math.min(r.count, availableFor(r)), 0);

  const generateFromBlueprint = async () => {
    if (!rules.length) return toast("حداقل یک قانون اضافه کنید", "error");
    setGenerating(true);
    try {
      const picked = await api.pickByBlueprint(rules, user?.role !== "admin");
      setQuestionIds(picked.map((q) => q.id));
      if (!title) setTitle(`آزمون ترکیبی ${rules.map((r) => catalog.subjectById.get(r.subjectId)?.title).filter(Boolean).slice(0, 3).join("، ")}`);
      toast(`${toFa(picked.length)} سوال انتخاب شد`, "success");
    } finally {
      setGenerating(false);
    }
  };

  const generateFromFilter = () => {
    const picked = sample(filtered, filterCount);
    setQuestionIds(picked.map((q) => q.id));
    if (!title) setTitle(filter.subjectIds?.length ? `آزمون ${filter.subjectIds.map((s) => catalog.subjectById.get(s)?.title).join("، ")}` : "آزمون تصادفی");
    toast(`${toFa(picked.length)} سوال انتخاب شد`, "success");
  };

  /* ---------- list editing ---------- */
  const move = (i: number, dir: -1 | 1) =>
    setQuestionIds((ids) => {
      const n = [...ids];
      const j = i + dir;
      if (j < 0 || j >= n.length) return ids;
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });
  const remove = (id: ID) => setQuestionIds((ids) => ids.filter((x) => x !== id));

  const save = async () => {
    if (!title.trim()) return toast("عنوان آزمون را وارد کنید", "error");
    if (!questionIds.length) return toast("آزمون بدون سوال قابل ذخیره نیست", "error");
    setSaving(true);
    try {
      const payload = { title: title.trim(), description: "", questionIds, durationMinutes: durationOn ? duration : null, negativeMarking: negative, shuffleQuestions: false, blueprint: rules.length ? rules : undefined };
      if (template) await api.updateExamTemplate(template.id, payload);
      else await api.createExamTemplate(payload);
      await refreshUserData();
      toast("آزمون ذخیره شد", "success");
      navigate("/app/exams");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader title={template ? "ویرایش آزمون" : "آزمون‌ساز"} description="آزمون ترکیبی با تعداد مشخص سوال از هر درس یا مبحث بسازید، سپس سوالات را به‌دلخواه ویرایش کنید." />

      <div className="grid gap-6 lg:grid-cols-5">
        {/* ---------- source ---------- */}
        <div className="space-y-4 lg:col-span-3">
          <div className="flex rounded-xl bg-slate-100 p-1">
            {(
              [
                ["blueprint", "ترکیبی (بلوپرینت)", <Layers key="l" className="h-4 w-4" />],
                ["filter", "از فیلتر", <ListFilter key="f" className="h-4 w-4" />],
              ] as const
            ).map(([m, label, icon]) => (
              <button key={m} onClick={() => setMode(m)} className={cn("flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold transition", mode === m ? "bg-white text-slate-900 shadow-sm" : "text-slate-500")}>
                {icon} {label}
              </button>
            ))}
          </div>

          {mode === "blueprint" && (
            <Card className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900">قوانین انتخاب سوال</h3>
                  <p className="text-xs text-slate-500">برای هر درس/مبحث تعداد و سطح سوال را مشخص کنید.</p>
                </div>
                <Button size="sm" variant="outline" icon={<Plus className="h-3.5 w-3.5" />} onClick={addRule}>
                  افزودن قانون
                </Button>
              </div>
              {rules.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                  هنوز قانونی تعریف نشده. مثلاً: «۱۰ سوال از سیستم عامل (زمان‌بندی + حافظه مجازی)، ۵ سوال دشوار از الگوریتم».
                </div>
              )}
              <div className="space-y-3">
                {rules.map((rule, idx) => {
                  const topics = catalog.topicsBySubject.get(rule.subjectId) ?? [];
                  const avail = availableFor(rule);
                  return (
                    <div key={rule.id} className="rounded-xl border border-slate-200 p-3">
                      <div className="mb-2 flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-900 text-xs font-bold text-white">{toFa(idx + 1)}</span>
                        <Select value={rule.subjectId} onChange={(e) => updateRule(rule.id, { subjectId: e.target.value, topicIds: [] })} className="flex-1">
                          {ownedSubjects.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.emoji} {s.title}
                            </option>
                          ))}
                        </Select>
                        <Input type="number" min={1} max={50} value={rule.count} onChange={(e) => updateRule(rule.id, { count: Math.max(1, Number(e.target.value)) })} className="w-20 text-center" ltr />
                        <span className="text-xs text-slate-500">سوال</span>
                        <button onClick={() => setRules((r) => r.filter((x) => x.id !== rule.id))} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <Chip active={rule.topicIds.length === 0} onClick={() => updateRule(rule.id, { topicIds: [] })}>
                          همه‌ی مباحث
                        </Chip>
                        {topics.map((t) => (
                          <Chip key={t.id} active={rule.topicIds.includes(t.id)} onClick={() => updateRule(rule.id, { topicIds: rule.topicIds.includes(t.id) ? rule.topicIds.filter((x) => x !== t.id) : [...rule.topicIds, t.id] })}>
                            {t.title}
                          </Chip>
                        ))}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <span className="text-xs text-slate-500">سطح:</span>
                        {([1, 2, 3] as Difficulty[]).map((d) => (
                          <Chip key={d} active={rule.difficulties.includes(d)} onClick={() => updateRule(rule.id, { difficulties: rule.difficulties.includes(d) ? rule.difficulties.filter((x) => x !== d) : [...rule.difficulties, d] })}>
                            {DIFFICULTY_LABEL[d]}
                          </Chip>
                        ))}
                        <span className={cn("mr-auto text-xs", avail < rule.count ? "text-rose-600" : "text-slate-500")}>
                          {toFa(avail)} سوال موجود{avail < rule.count && " (کمتر از درخواست)"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
              {rules.length > 0 && (
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-sm text-slate-600">
                    مجموع: <b>{toFa(ruleTotal)}</b> سوال
                  </span>
                  <Button onClick={generateFromBlueprint} loading={generating} icon={<Wand2 className="h-4 w-4" />}>
                    تولید سوالات
                  </Button>
                </div>
              )}
            </Card>
          )}

          {mode === "filter" && (
            <Card className="p-4">
              <QuestionFilters value={filter} onChange={setFilter} resultCount={filtered.length} compact ownedOnlyOptions={user?.role !== "admin"} />
              <div className="mt-4 flex items-center gap-3">
                <span className="text-sm text-slate-600">تعداد سوال:</span>
                <Input type="number" min={1} max={filtered.length || 1} value={filterCount} onChange={(e) => setFilterCount(Number(e.target.value))} className="w-24 text-center" ltr />
                <Button className="mr-auto" onClick={generateFromFilter} disabled={filtered.length === 0} icon={<Shuffle className="h-4 w-4" />}>
                  انتخاب تصادفی {toFa(Math.min(filterCount, filtered.length))} سوال
                </Button>
              </div>
            </Card>
          )}
        </div>

        {/* ---------- settings ---------- */}
        <div className="space-y-4 lg:col-span-2">
          <Card className="space-y-3 p-4">
            <h3 className="font-bold text-slate-900">تنظیمات آزمون</h3>
            <Input label="عنوان آزمون" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثلاً آزمون جامع هفته‌ی سوم" />
            <Toggle checked={durationOn} onChange={setDurationOn} label="زمان‌دار" description={`زمان پیشنهادی: ${toFa(totalMinutes || 0)} دقیقه`} />
            {durationOn && (
              <div className="flex items-center gap-2">
                <Input type="number" min={1} value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="w-24 text-center" ltr />
                <span className="text-sm text-slate-500">دقیقه</span>
                <Button size="sm" variant="ghost" onClick={() => setDuration(Math.max(1, totalMinutes))}>
                  پیشنهادی
                </Button>
              </div>
            )}
            <Toggle checked={negative} onChange={setNegative} label="نمره‌ی منفی کنکوری" />
          </Card>

          <Card className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-bold text-slate-900">خلاصه</h3>
              <Badge tone="brand">{toFa(questions.length)} سوال</Badge>
            </div>
            <SummaryBySubject questions={questions} />
            <div className="mt-4 space-y-2">
              <Button className="w-full" size="lg" disabled={questions.length === 0} onClick={() => setStartOpen(true)} icon={<Play className="h-4 w-4" />}>
                شروع آزمون
              </Button>
              <Button className="w-full" variant="outline" loading={saving} disabled={questions.length === 0} onClick={save} icon={<Save className="h-4 w-4" />}>
                {template ? "ذخیره‌ی تغییرات" : "ذخیره به‌عنوان قالب آزمون"}
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* ---------- question list ---------- */}
      <Card className="mt-6 p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h3 className="font-bold text-slate-900">سوالات آزمون</h3>
          <span className="text-xs text-slate-500">ترتیب را تغییر دهید، حذف کنید یا سوال جدید اضافه کنید.</span>
          <div className="mr-auto flex gap-2">
            <Button size="sm" variant="outline" icon={<Shuffle className="h-3.5 w-3.5" />} disabled={questions.length < 2} onClick={() => setQuestionIds((ids) => shuffle(ids))}>
              به‌هم‌ریختن
            </Button>
            <Button size="sm" variant="outline" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setAddOpen(true)}>
              افزودن سوال
            </Button>
            {questions.length > 0 && (
              <Button size="sm" variant="ghost" className="text-rose-600" icon={<X className="h-3.5 w-3.5" />} onClick={() => setQuestionIds([])}>
                پاک کردن
              </Button>
            )}
          </div>
        </div>
        {questions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">هنوز سوالی انتخاب نشده است.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {questions.map((q, i) => (
              <div key={q.id} className="flex items-start gap-3 py-3">
                <div className="flex flex-col items-center gap-0.5">
                  <button onClick={() => move(i, -1)} disabled={i === 0} className="rounded p-0.5 text-slate-400 hover:text-brand-600 disabled:opacity-30">
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 text-xs font-bold text-white">{toFa(i + 1)}</span>
                  <button onClick={() => move(i, 1)} disabled={i === questions.length - 1} className="rounded p-0.5 text-slate-400 hover:text-brand-600 disabled:opacity-30">
                    <ArrowDown className="h-4 w-4" />
                  </button>
                </div>
                <div className="min-w-0 flex-1">
                  <QuestionMeta question={q} className="mb-1.5" />
                  <div className="line-clamp-2 text-sm text-slate-700">
                    <RichText text={plainText(q.stem).slice(0, 220)} inline />
                  </div>
                </div>
                <button onClick={() => remove(q.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {addOpen && <AddQuestionModal open={addOpen} onClose={() => setAddOpen(false)} existing={questionIds} onAdd={(ids) => setQuestionIds((x) => [...x, ...ids.filter((i) => !x.includes(i))])} />}
      {startOpen && <StartExamModal open={startOpen} onClose={() => setStartOpen(false)} title={title || "آزمون"} questionIds={questionIds} sourceType={template ? "template" : "quick"} sourceId={template?.id} defaultDuration={durationOn ? duration : null} defaultNegative={negative} />}
    </div>
  );
}

export function SummaryBySubject({ questions }: { questions: Question[] }) {
  const { catalog } = useApp();
  const map = new Map<string, number>();
  questions.forEach((q) => map.set(q.subjectIds[0], (map.get(q.subjectIds[0]) ?? 0) + 1));
  if (!map.size) return <p className="text-xs text-slate-400">—</p>;
  return (
    <div className="space-y-1.5">
      {[...map.entries()].map(([sid, n]) => (
        <div key={sid} className="flex items-center justify-between text-sm">
          <span className="text-slate-700">
            {catalog.subjectById.get(sid)?.emoji} {catalog.subjectById.get(sid)?.title}
          </span>
          <span className="text-xs text-slate-500">{toFa(n)} سوال</span>
        </div>
      ))}
    </div>
  );
}

function AddQuestionModal({ open, onClose, existing, onAdd }: { open: boolean; onClose: () => void; existing: ID[]; onAdd: (ids: ID[]) => void }) {
  const { user } = useApp();
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<Set<ID>>(new Set());
  const list = useFilteredQuestions({ ...emptyFilter(), ownedOnly: user?.role !== "admin", search }).filter((q) => !existing.includes(q.id)).slice(0, 40);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="افزودن سوال به آزمون"
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            انصراف
          </Button>
          <Button
            disabled={picked.size === 0}
            onClick={() => {
              onAdd([...picked]);
              onClose();
            }}
            icon={<Check className="h-4 w-4" />}
          >
            افزودن {picked.size > 0 && toFa(picked.size)} سوال
          </Button>
        </>
      }
    >
      <SearchInput value={search} onChange={setSearch} placeholder="جستجو در سوالات..." />
      <div className="mt-3 max-h-[50vh] space-y-2 overflow-y-auto">
        {list.map((q) => (
          <button
            key={q.id}
            onClick={() =>
              setPicked((s) => {
                const n = new Set(s);
                if (n.has(q.id)) n.delete(q.id);
                else n.add(q.id);
                return n;
              })
            }
            className={cn("flex w-full items-start gap-3 rounded-xl border p-3 text-right transition", picked.has(q.id) ? "border-brand-500 bg-brand-50" : "border-slate-200 hover:border-brand-300")}
          >
            <span className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border", picked.has(q.id) ? "border-brand-600 bg-brand-600 text-white" : "border-slate-300")}>{picked.has(q.id) && <Check className="h-3 w-3" />}</span>
            <span className="min-w-0 flex-1">
              <QuestionMeta question={q} className="mb-1" />
              <span className="line-clamp-2 text-sm text-slate-700">{plainText(q.stem).slice(0, 200)}</span>
            </span>
          </button>
        ))}
        {list.length === 0 && (
          <div className="py-8 text-center text-sm text-slate-500">
            <Search className="mx-auto mb-2 h-6 w-6 text-slate-300" /> سوالی یافت نشد
          </div>
        )}
      </div>
    </Modal>
  );
}
