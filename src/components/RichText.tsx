import katex from "katex";
import { createElement, memo, useMemo, type ReactNode } from "react";
import type { QuestionImage } from "@/types";
import { resolveMediaUrl } from "@/services/config";
import { parseRichBlocks } from "@/lib/richText";
import { cn } from "@/lib/utils";

/**
 * RichText: رندر متن با پشتیبانی از
 *  - LaTeX درون‌خطی $...$ و نمایشی $$...$$
 *  - تصویر با [[img:ID]] (از آرایه‌ی images)
 *  - مارک‌داون سبک: **bold**, `code`, #### heading, - list, 1. list, > quote, | table |
 *  - <span class="ltr">...</span> برای متن انگلیسی
 */

interface Props {
  text: string;
  images?: QuestionImage[];
  className?: string;
  /** حالت فشرده برای گزینه‌ها */
  inline?: boolean;
  headingIdPrefix?: string;
}

const renderTex = (tex: string, display: boolean) => {
  try {
    return katex.renderToString(tex, { throwOnError: false, displayMode: display, strict: "ignore", trust: false });
  } catch {
    return `<code>${tex.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!)}</code>`;
  }
};

/* ---------- inline parsing ---------- */
const INLINE_RE = /(\$[^$\n]+?\$|\*\*[^*]+?\*\*|`[^`]+?`|<span class="ltr">[\s\S]*?<\/span>)/g;

const renderInline = (s: string, keyPrefix: string): ReactNode[] => {
  const parts = s.split(INLINE_RE);
  return parts.map((part, i) => {
    const key = `${keyPrefix}-${i}`;
    if (!part) return null;
    if (part.startsWith("$") && part.endsWith("$") && part.length > 2) {
      return <span key={key} dangerouslySetInnerHTML={{ __html: renderTex(part.slice(1, -1), false) }} />;
    }
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={key}>{renderInline(part.slice(2, -2), key)}</strong>;
    if (part.startsWith("`") && part.endsWith("`")) return <code key={key}>{part.slice(1, -1)}</code>;
    if (part.startsWith('<span class="ltr">')) {
      const inner = part.replace(/^<span class="ltr">/, "").replace(/<\/span>$/, "");
      return (
        <span key={key} className="ltr">
          {renderInline(inner, key)}
        </span>
      );
    }
    return <span key={key}>{part}</span>;
  });
};

/* ---------- block parsing ---------- */

function Figure({ img }: { img: QuestionImage }) {
  return (
    <figure>
      <img src={resolveMediaUrl(img.src)} alt={img.alt} loading="lazy" style={img.width ? { maxWidth: img.width, width: "100%" } : undefined} />
      {img.caption && <figcaption>{img.caption}</figcaption>}
    </figure>
  );
}

export const RichText = memo(function RichText({ text, images = [], className, inline, headingIdPrefix }: Props) {
  const content = useMemo(() => {
    if (inline) {
      // در حالت inline: فقط متن یک‌خطی؛ اما اگر display math یا تصویر داشت، fallback به block
      if (!/\$\$|\[\[img:/.test(text)) return <span>{renderInline(text, "i")}</span>;
    }
    const blocks = parseRichBlocks(text);
    const imgMap = new Map(images.map((im) => [im.id, im]));
    return blocks.map((b, idx) => {
      const key = `b${idx}`;
      switch (b.type) {
        case "math":
          return <div key={key} dangerouslySetInnerHTML={{ __html: renderTex(b.tex, true) }} />;
        case "img": {
          const im = imgMap.get(b.id);
          return im ? <Figure key={key} img={im} /> : <div key={key} className="my-2 rounded-lg border border-dashed border-rose-300 bg-rose-50 p-2 text-center text-xs text-rose-600">تصویر «{b.id}» یافت نشد</div>;
        }
        case "h":
          return createElement(`h${Math.max(2, b.level)}`, { key, id: headingIdPrefix ? `${headingIdPrefix}-${idx}` : undefined, tabIndex: headingIdPrefix ? -1 : undefined }, renderInline(b.text, key));
        case "quote":
          return (
            <blockquote key={key} className="my-2 rounded-lg border-r-4 border-amber-400 bg-amber-50/70 px-3 py-2 text-sm text-amber-900">
              {renderInline(b.text, key)}
            </blockquote>
          );
        case "ul":
          return (
            <ul key={key}>
              {b.items.map((it, j) => (
                <li key={j}>{renderInline(it, `${key}-${j}`)}</li>
              ))}
            </ul>
          );
        case "ol":
          return (
            <ol key={key}>
              {b.items.map((it, j) => (
                <li key={j}>{renderInline(it, `${key}-${j}`)}</li>
              ))}
            </ol>
          );
        case "table":
          return (
            <div key={key} className="overflow-x-auto">
              <table>
                <tbody>
                  {b.rows.map((row, ri) => (
                    <tr key={ri} className={ri === 0 ? "bg-slate-50 font-semibold" : ""}>
                      {row.map((c, ci) => (ri === 0 ? <th key={ci}>{renderInline(c, `${key}-${ri}-${ci}`)}</th> : <td key={ci}>{renderInline(c, `${key}-${ri}-${ci}`)}</td>))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        case "code":
          return (
            <pre key={key}>
              <code>{b.text}</code>
            </pre>
          );
        default:
          return (
            <p key={key}>
              {b.text.split("\n").map((ln, li, arr) => (
                <span key={li}>
                  {renderInline(ln, `${key}-${li}`)}
                  {li < arr.length - 1 && <br />}
                </span>
              ))}
            </p>
          );
      }
    });
  }, [text, images, inline, headingIdPrefix]);

  return inline && !/\$\$|\[\[img:/.test(text) ? <span className={cn("rich-text", className)}>{content}</span> : <div className={cn("rich-text", className)}>{content}</div>;
});
