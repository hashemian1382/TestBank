import { Filter, ImageIcon, RotateCcw, Bookmark } from "lucide-react";
import { useMemo } from "react";
import type { Difficulty, ExamDomainId, QuestionFilter } from "@/types";
import { countActiveFilters, emptyFilter } from "@/lib/questionFilter";
import { cn, DIFFICULTY_LABEL, toFa } from "@/lib/utils";
import { useApp } from "@/store/AppContext";
import { Button, Chip, SearchInput, Select } from "./ui";

interface Props {
  value: QuestionFilter;
  onChange: (f: QuestionFilter) => void;
  resultCount?: number;
  /** نمایش فیلترهای شخصی (نشان‌شده‌ها، وضعیت پاسخ) */
  personal?: boolean;
  /** محدود کردن گزینه‌های درس به درس‌های خریداری‌شده */
  ownedOnlyOptions?: boolean;
  compact?: boolean;
}

const toggleIn = <T,>(arr: T[] | undefined, v: T): T[] => (arr?.includes(v) ? arr.filter((x) => x !== v) : [...(arr ?? []), v]);

export function QuestionFilters({ value, onChange, resultCount, personal = true, ownedOnlyOptions = false, compact }: Props) {
  const { catalog, user, ownsSubject } = useApp();
  const set = (patch: Partial<QuestionFilter>) => onChange({ ...value, ...patch });

  const subjects = useMemo(() => {
    let list = catalog.subjects.filter((s) => s.isActive);
    if (ownedOnlyOptions) list = list.filter((s) => ownsSubject(s.id));
    if (value.domainIds?.length) list = list.filter((s) => s.domainIds.some((d) => value.domainIds!.includes(d)));
    return list;
  }, [catalog.subjects, ownedOnlyOptions, ownsSubject, value.domainIds]);

  const topics = useMemo(() => (value.subjectIds?.length ? value.subjectIds.flatMap((sid) => catalog.topicsBySubject.get(sid) ?? []) : []), [catalog.topicsBySubject, value.subjectIds]);

  const tags = useMemo(() => {
    const counts = new Map<string, number>();
    catalog.questions.forEach((q) => q.tags.forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1)));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 18);
  }, [catalog.questions]);

  const active = countActiveFilters(value);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex-1">
          <SearchInput value={value.search ?? ""} onChange={(v) => set({ search: v })} placeholder="جستجو در صورت سوال، گزینه‌ها، پاسخ یا برچسب..." />
        </div>
        <div className="flex items-center gap-2">
          <Select value={value.sort ?? "newest"} onChange={(e) => set({ sort: e.target.value as QuestionFilter["sort"] })} className="w-40">
            <option value="newest">جدیدترین</option>
            <option value="oldest">قدیمی‌ترین</option>
            <option value="difficulty-asc">آسان به دشوار</option>
            <option value="difficulty-desc">دشوار به آسان</option>
          </Select>
          {active > 0 && (
            <Button variant="ghost" size="sm" onClick={() => onChange({ ...emptyFilter(), ownedOnly: value.ownedOnly, search: value.search })} icon={<RotateCcw className="h-3.5 w-3.5" />}>
              حذف فیلترها ({toFa(active)})
            </Button>
          )}
        </div>
      </div>

      <div className={cn("space-y-3 rounded-2xl border border-slate-200 bg-white p-4", compact && "p-3")}>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <Filter className="h-3.5 w-3.5" /> فیلترها
          {resultCount !== undefined && <span className="mr-auto rounded-full bg-brand-50 px-2 py-0.5 text-brand-700">{toFa(resultCount)} سوال</span>}
        </div>

        <Row label="حوزه">
          {catalog.domains.map((d) => (
            <Chip key={d.id} active={value.domainIds?.includes(d.id)} onClick={() => set({ domainIds: toggleIn(value.domainIds, d.id as ExamDomainId), subjectIds: [], topicIds: [] })}>
              {d.emoji} {d.shortTitle}
            </Chip>
          ))}
        </Row>

        <Row label="درس">
          {subjects.map((s) => (
            <Chip key={s.id} active={value.subjectIds?.includes(s.id)} onClick={() => set({ subjectIds: toggleIn(value.subjectIds, s.id), topicIds: [] })} className={cn(!ownsSubject(s.id) && user && "opacity-70")}>
              {s.emoji} {s.title}
            </Chip>
          ))}
          {subjects.length === 0 && <span className="text-xs text-slate-400">درسی یافت نشد</span>}
        </Row>

        {topics.length > 0 && (
          <Row label="مبحث">
            {topics.map((t) => (
              <Chip key={t.id} active={value.topicIds?.includes(t.id)} onClick={() => set({ topicIds: toggleIn(value.topicIds, t.id) })}>
                {t.title}
              </Chip>
            ))}
          </Row>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <Row label="سطح">
            {([1, 2, 3] as Difficulty[]).map((d) => (
              <Chip key={d} active={value.difficulties?.includes(d)} onClick={() => set({ difficulties: toggleIn(value.difficulties, d) })}>
                {DIFFICULTY_LABEL[d]}
              </Chip>
            ))}
            <Chip active={!!value.hasImage} onClick={() => set({ hasImage: !value.hasImage })}>
              <ImageIcon className="h-3 w-3" /> دارای تصویر
            </Chip>
          </Row>
          {personal && user && (
            <Row label="شخصی">
              <Chip active={!!value.bookmarkedOnly} onClick={() => set({ bookmarkedOnly: !value.bookmarkedOnly })}>
                <Bookmark className="h-3 w-3" /> نشان‌شده‌ها
              </Chip>
              {(["any", "correct", "wrong", "blank", "unseen"] as const).map((s) => (
                <Chip key={s} active={(value.answerState ?? "any") === s} onClick={() => set({ answerState: s })}>
                  {{ any: "همه", correct: "درست زده‌ام", wrong: "غلط زده‌ام", blank: "نزده‌ام", unseen: "ندیده‌ام" }[s]}
                </Chip>
              ))}
            </Row>
          )}
        </div>

        {!compact && (
          <>
            <Row label="منبع">
              {catalog.sources.map((s) => (
                <Chip key={s.id} active={value.sourceIds?.includes(s.id)} onClick={() => set({ sourceIds: toggleIn(value.sourceIds, s.id) })}>
                  {s.title}
                </Chip>
              ))}
            </Row>
            <Row label="برچسب">
              {tags.map(([t, n]) => (
                <Chip key={t} active={value.tags?.includes(t)} onClick={() => set({ tags: toggleIn(value.tags, t) })}>
                  #{t} <span className="opacity-60">({toFa(n)})</span>
                </Chip>
              ))}
            </Row>
          </>
        )}
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start">
      <span className="w-14 shrink-0 pt-1 text-xs font-medium text-slate-500">{label}</span>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}
