export type RichBlock =
  | { type: "p"; text: string }
  | { type: "h"; text: string; level: number }
  | { type: "math"; tex: string }
  | { type: "img"; id: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "quote"; text: string }
  | { type: "table"; rows: string[][] }
  | { type: "code"; text: string };

export const parseRichBlocks = (raw: string): RichBlock[] => {
  // Protect fenced code before extracting display mathematics.
  const tokens: RichBlock[] = [];
  let marker = "@@RICH_BLOCK_";
  while (raw.includes(marker)) marker = `_${marker}`;
  const text = raw.replace(/```[^\n]*\n[\s\S]*?(?:```|$)|\$\$([\s\S]+?)\$\$/g, (full, tex: string | undefined) => {
    tokens.push(tex !== undefined ? { type: "math", tex: tex.trim() }
      : { type: "code", text: full.replace(/^```[^\n]*\n/, "").replace(/```$/, "").trimEnd() });
    return `\n${marker}${tokens.length - 1}@@\n`;
  });
  const lines = text.split("\n");
  const blocks: RichBlock[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const t = line.trim();
    if (!t) {
      i++;
      continue;
    }
    const m = t.match(new RegExp(`^${marker}(\\d+)@@$`));
    if (m) {
      blocks.push(tokens[Number(m[1])]);
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
      blocks.push({ type: "h", text: t.replace(/^#{1,6}\s/, ""), level: t.match(/^#+/)![0].length });
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
      if (!nt || nt.startsWith(marker) || /^(\[\[img:|#{1,6}\s|>|\||[-*]\s|\d+[.)]\s|```)/.test(nt)) break;
      buf.push(nt);
      i++;
    }
    blocks.push({ type: "p", text: buf.join("\n") });
  }
  return blocks;
};


export const richHeadings = (text: string) => parseRichBlocks(text).flatMap((block, index) =>
  block.type === "h" ? [{ text: block.text, level: block.level, index }] : []);
