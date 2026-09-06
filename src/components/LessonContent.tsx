import { useId, useMemo } from "react";
import type { LessonInput } from "@/types";
import { RichText } from "./RichText";
import { richHeadings } from "@/lib/richText";
import { plainText } from "@/lib/utils";

/** Shared preview/reader: headings, formulas and media have identical output. */
export function LessonContent({ lesson }: { lesson: Pick<LessonInput, "content" | "images" | "summary"> }) {
  const prefix = useId();
  const headings = useMemo(() => richHeadings(lesson.content), [lesson.content]);
  return (
    <div className="min-w-0 space-y-5">
      {lesson.summary && <p className="rounded-xl border-r-4 border-brand-400 bg-brand-50/70 p-4 text-sm leading-8 text-brand-900">{lesson.summary}</p>}
      {headings.length > 1 && (
        <nav aria-label="فهرست درسنامه" className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
          <div className="mb-2 text-sm font-bold text-slate-900">در این درسنامه می‌خوانید</div>
          <ol className="grid gap-1 sm:grid-cols-2">
            {headings.map((heading) => (
              <li key={heading.index}>
                <button type="button" onClick={() => {
                  const element = document.getElementById(`${prefix}-${heading.index}`);
                  element?.scrollIntoView({ behavior: "smooth", block: "start" });
                  element?.focus({ preventScroll: true });
                }} className="w-full rounded-lg px-2 py-1 text-right text-xs leading-6 text-brand-700 hover:bg-brand-50">
                  {plainText(heading.text)}
                </button>
              </li>
            ))}
          </ol>
        </nav>
      )}
      <RichText text={lesson.content} images={lesson.images} headingIdPrefix={prefix} className="text-[15px] leading-9 text-slate-800" />
      {!lesson.content.trim() && <p className="py-10 text-center text-sm text-slate-400">محتوای درسنامه اینجا نمایش داده می‌شود.</p>}
    </div>
  );
}
