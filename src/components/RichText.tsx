import katex from "katex";
import { memo, useMemo, type ReactNode } from "react";
import type { QuestionImage } from "@/types";
import { resolveMediaUrl } from "@/services";
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
}

const renderTex = (tex: string, display: boolean) => {
  try {
    return katex.renderToString(tex, { throwOnError: false, displayMode: display, strict: "ignore", trust: false });
  } catch {
    return `<code>${tex}</code>`;
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
type Block =
  | { type: "p"; text: string }
  | { type: "h"; text: string }
  | { type: "math"; tex: string }
  | { type: "img"; id: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "quote"; text: string }
  | { type: "table"; rows: string[][] }
  | { type: "code"; text: string };

const parseBlocks = (raw: string): Block[] => {
  // extract display math first
  const mathStore: string[] = [];
  const text = raw.replace(/\$\$([\s\S]+?)\$\$/g, (_, tex: string) => {
    mathStore.push(tex.trim());
    return `\n@@MATH${mathStore.length - 1}@@\n`;
  });
  const lines = text.split("\n");
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const t = line.trim();
    if (!t) {
      i++;
      continue;
    }
    const m = t.match(/^@@MATH(\d+)@@$/);
    if (m) {
      blocks.push({ type: "math", tex: mathStore[Number(m[1])] });
      i++;
      continue;
    }
    const img = t.match(/^\[\[img:([^\]]+)\]\]$/);
    if (img) {
      blocks.push({ type: "img", id: img[1] });
      i++;
      continue;
    }
    if (t.startsWith("```")) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) buf.push(lines[i++]);
      i++;
      blocks.push({ type: "code", text: buf.join("\n") });
      continue;
    }
    if (/^#{1,6}\s/.test(t)) {
      blocks.push({ type: "h", text: t.replace(/^#{1,6}\s/, "") });
      i++;
      continue;
    }
    if (t.startsWith(">")) {
      const buf: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) buf.push(lines[i++].trim().replace(/^>\s?/, ""));
      blocks.push({ type: "quote", text: buf.join(" ") });
      continue;
    }
    if (t.startsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        const row = lines[i].trim();
        i++;
        if (/^\|[\s:-]+\|/.test(row) && !/[^\s|:-]/.test(row)) continue; // separator
        rows.push(
          row
            .replace(/^\||\|$/g, "")
            .split("|")
            .map((c) => c.trim())
        );
      }
      blocks.push({ type: "table", rows });
      continue;
    }
    if (/^[-*]\s/.test(t)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s/.test(lines[i].trim())) items.push(lines[i++].trim().replace(/^[-*]\s/, ""));
      blocks.push({ type: "ul", items });
      continue;
    }
    if (/^\d+[.)]\s/.test(t)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+[.)]\s/.test(lines[i].trim())) items.push(lines[i++].trim().replace(/^\d+[.)]\s/, ""));
      blocks.push({ type: "ol", items });
      continue;
    }
    // paragraph: merge consecutive plain lines
    const buf: string[] = [t];
    i++;
    while (i < lines.length) {
      const nt = lines[i].trim();
      if (!nt || /^(@@MATH\d+@@|\[\[img:|#{1,6}\s|>|\||[-*]\s|\d+[.)]\s|```)/.test(nt)) break;
      buf.push(nt);
      i++;
    }
    blocks.push({ type: "p", text: buf.join("\n") });
  }
  return blocks;
};

function Figure({ img }: { img: QuestionImage }) {
  return (
    <figure>
      <img src={resolveMediaUrl(img.src)} alt={img.alt} loading="lazy" style={img.width ? { maxWidth: img.width, width: "100%" } : undefined} />
      {img.caption && <figcaption>{img.caption}</figcaption>}
    </figure>
  );
}

export const RichText = memo(function RichText({ text, images = [], className, inline }: Props) {
  const content = useMemo(() => {
    if (inline) {
      // در حالت inline: فقط متن یک‌خطی؛ اما اگر display math یا تصویر داشت، fallback به block
      if (!/\$\$|\[\[img:/.test(text)) return <span>{renderInline(text, "i")}</span>;
    }
    const blocks = parseBlocks(text);
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
          return <h4 key={key}>{renderInline(b.text, key)}</h4>;
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
  }, [text, images, inline]);

  return inline ? <span className={cn("rich-text", className)}>{content}</span> : <div className={cn("rich-text", className)}>{content}</div>;
});
