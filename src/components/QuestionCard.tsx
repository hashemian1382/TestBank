import { Bookmark, BookOpen, Check, ChevronDown, ChevronUp, Clock, FolderPlus, ImageIcon, Lock, X } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import type { Question } from "@/types";
import { cn, DIFFICULTY_COLOR, DIFFICULTY_LABEL, OPTION_LABELS, toFa } from "@/lib/utils";
import { relatedLessons } from "@/lib/lessons";
import { useApp } from "@/store/AppContext";
import { Badge, Button, Card } from "./ui";
import { RichText } from "./RichText";
import { CollectionPicker } from "./CollectionPicker";

interface Props {
  question: Question;
  index?: number;
  /** حالت‌های نمایش */
  mode?: "browse" | "review";
  /** پاسخ کاربر برای حالت review */
  selectedIndex?: number | null;
  showAnswerByDefault?: boolean;
  compact?: boolean;
  /** انتخاب چندتایی (برای ساخت آزمون/مجموعه) */
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
  extraActions?: React.ReactNode;
}

export function QuestionMeta({ question, className }: { question: Question; className?: string }) {
  const { catalog } = useApp();
  const source = catalog.sourceById.get(question.sourceId);
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {question.subjectIds.map((sid) => (
        <Badge key={sid} tone="brand">
          {catalog.subjectById.get(sid)?.emoji} {catalog.subjectById.get(sid)?.title}
        </Badge>
      ))}
      {question.topicIds.slice(0, 2).map((tid) => (
        <Badge key={tid}>{catalog.topicById.get(tid)?.title}</Badge>
      ))}
      {question.topicIds.length > 2 && <Badge>+{toFa(question.topicIds.length - 2)}</Badge>}
      <span className={cn("inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium ring-1", DIFFICULTY_COLOR[question.difficulty])}>{DIFFICULTY_LABEL[question.difficulty]}</span>
      {source && <Badge tone="amber">{source.title}</Badge>}
      {question.images.length > 0 && (
        <Badge tone="sky">
          <ImageIcon className="h-3 w-3" /> تصویر
        </Badge>
      )}
    </div>
  );
}

export function QuestionCard({ question, index, mode = "browse", selectedIndex, showAnswerByDefault = false, compact, selectable, selected, onToggleSelect, extraActions }: Props) {
  const { ownsQuestion, isBookmarked, toggleBookmark, catalog, user } = useApp();
  const owned = ownsQuestion(question);
  const [showAnswer, setShowAnswer] = useState(showAnswerByDefault);
  const [picked, setPicked] = useState<number | null>(mode === "review" ? (selectedIndex ?? null) : null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const bookmarked = isBookmarked(question.id);
  const lessons = relatedLessons(question, catalog.lessons, user?.role === "admin");
  const [showLessons, setShowLessons] = useState(false);

  const reveal = mode === "review" || showAnswer;

  return (
    <Card data-question-id={question.id} className={cn("overflow-hidden transition", selected && "ring-2 ring-brand-500", !owned && "bg-slate-50/60")}>
      <div className="flex items-start gap-3 p-4 sm:p-5">
        {selectable && (
          <button
            onClick={onToggleSelect}
            className={cn("mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition", selected ? "border-brand-600 bg-brand-600 text-white" : "border-slate-300 bg-white hover:border-brand-400")}
          >
            {selected && <Check className="h-4 w-4" />}
          </button>
        )}
        {index !== undefined && <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-sm font-bold text-white">{toFa(index + 1)}</div>}
        <div className="min-w-0 flex-1">
          <QuestionMeta question={question} className="mb-3" />
          {owned ? (
            <RichText text={question.stem} images={question.images} className="text-[15px] leading-8 text-slate-800" />
          ) : (
            <div className="relative">
              <div className="select-none blur-[5px]">
                <RichText text={question.stem} images={question.images} className="text-[15px] leading-8 text-slate-800" />
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Link to="/app/store" className="flex items-center gap-2 rounded-xl bg-white/90 px-4 py-2 text-sm font-medium text-slate-700 shadow-lg ring-1 ring-slate-200 hover:text-brand-700">
                  <Lock className="h-4 w-4" /> برای مشاهده، درس {catalog.subjectById.get(question.subjectIds[0])?.title} را تهیه کنید
                </Link>
              </div>
            </div>
          )}

          {owned && !compact && (
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {question.options.map((opt, i) => {
                const isCorrect = i === question.correctIndex;
                const isPicked = picked === i;
                let cls = "border-slate-200 bg-white hover:border-brand-300";
                if (reveal) {
                  if (isCorrect) cls = "border-emerald-500 bg-emerald-50 text-emerald-900";
                  else if (isPicked) cls = "border-rose-400 bg-rose-50 text-rose-900";
                  else cls = "border-slate-200 bg-white opacity-80";
                } else if (isPicked) cls = "border-brand-500 bg-brand-50";
                return (
                  <button
                    key={i}
                    disabled={mode === "review"}
                    onClick={() => {
                      setPicked(i);
                      setShowAnswer(true);
                    }}
                    className={cn("flex items-start gap-2.5 rounded-xl border p-3 text-right text-sm transition disabled:cursor-default", cls)}
                  >
                    <span
                      className={cn(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold",
                        reveal && isCorrect ? "bg-emerald-600 text-white" : reveal && isPicked ? "bg-rose-500 text-white" : isPicked ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600"
                      )}
                    >
                      {reveal && isCorrect ? <Check className="h-3.5 w-3.5" /> : reveal && isPicked ? <X className="h-3.5 w-3.5" /> : OPTION_LABELS[i]}
                    </span>
                    <RichText text={opt} images={question.images} inline className="leading-7" />
                  </button>
                );
              })}
            </div>
          )}

          {owned && !compact && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button variant={reveal ? "secondary" : "primary"} size="sm" onClick={() => setShowAnswer((s) => !s)} icon={reveal ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}>
                {reveal ? "پنهان کردن پاسخ" : "نمایش پاسخ تشریحی"}
              </Button>
              {user && (
                <>
                  <Button variant={bookmarked ? "success" : "outline"} size="sm" onClick={() => toggleBookmark(question.id)} icon={<Bookmark className={cn("h-3.5 w-3.5", bookmarked && "fill-current")} />}>
                    {bookmarked ? "نشان‌شده" : "نشان‌گذاری"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setPickerOpen(true)} icon={<FolderPlus className="h-3.5 w-3.5" />}>
                    افزودن به مجموعه
                  </Button>
                </>
              )}
              {lessons.length > 0 && (
                <Button variant="ghost" size="sm" aria-expanded={showLessons} onClick={() => setShowLessons((shown) => !shown)} icon={<BookOpen className="h-3.5 w-3.5" />}>
                  درسنامه‌های مرتبط ({toFa(lessons.length)})
                </Button>
              )}
              <span className="mr-auto inline-flex items-center gap-1 text-[11px] text-slate-400">
                <Clock className="h-3 w-3" /> {toFa(Math.round(question.estimatedSeconds / 60 * 10) / 10)} دقیقه
              </span>
              {extraActions}
            </div>
          )}

          {owned && !compact && showLessons && lessons.length > 0 && (
            <div className="mt-3 space-y-2 rounded-xl border border-brand-100 bg-brand-50/40 p-3" aria-label="درسنامه‌های مرتبط با سوال">
              {lessons.map((lesson) => <Link key={lesson.id} to={`/app/lessons/${lesson.id}`} className="flex flex-wrap items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs leading-6 text-brand-700 hover:bg-brand-50">
                <BookOpen className="h-3.5 w-3.5 shrink-0" /><span className="min-w-0 flex-1">{lesson.title}</span>
                <Badge tone={question.lessonIds?.includes(lesson.id) ? "brand" : "slate"}>{question.lessonIds?.includes(lesson.id) ? "متصل به این سوال" : "پیشنهاد مبحث"}</Badge>
                {lesson.status === "draft" && <Badge tone="amber">پیش‌نویس</Badge>}
              </Link>)}
            </div>
          )}

          {owned && !compact && reveal && (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50/80 to-white p-4 animate-fade-up">
              <div className="mb-2 flex items-center gap-2 text-sm font-bold text-emerald-800">
                <Check className="h-4 w-4" /> پاسخ صحیح: گزینه‌ی {OPTION_LABELS[question.correctIndex]}
              </div>
              <RichText text={question.explanation} images={question.images} className="text-sm leading-8 text-slate-700" />
              {question.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {question.tags.map((t) => (
                    <span key={t} className="rounded-md bg-white px-2 py-0.5 text-[11px] text-slate-500 ring-1 ring-slate-200">
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {pickerOpen && <CollectionPicker open={pickerOpen} onClose={() => setPickerOpen(false)} questionIds={[question.id]} />}
    </Card>
  );
}
