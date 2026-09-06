import { describe, expect, it } from "vitest";
import { parseRichBlocks, richHeadings } from "@/lib/richText";
import { catalogNameKey } from "@/lib/catalog";
import { isSafeImageSrc, validateLesson, validateQuestion } from "@/services/contentValidation";
import { isLessonPublished, relatedLessons } from "@/lib/lessons";
import { LESSONS, QUESTIONS, SUBJECTS, TOPICS, SOURCES } from "@/data";

describe("compatible rich content and lesson resolution", () => {
  it("all original seed questions and lessons remain valid and editable", () => {
    const catalog = { subjects: SUBJECTS, topics: TOPICS, sources: SOURCES, questions: QUESTIONS, lessons: LESSONS };
    for (const question of QUESTIONS) expect(() => validateQuestion(catalog, question, question), question.id).not.toThrow();
    for (const lesson of LESSONS) expect(() => validateLesson(catalog, { ...lesson, status: "published" }), lesson.id).not.toThrow();
  });
  it("parses every original seeded lesson and preserves tables/formulas/images", () => {
    for (const lesson of LESSONS) expect(parseRichBlocks(lesson.content).length).toBeGreaterThan(0);
    const blocks = parseRichBlocks("## الف\n\n### ب\n\n$$x^2$$\n\n[[img:i]]\n\n| a | b |\n|---|---|\n| c | d |");
    expect(blocks.map((b) => b.type)).toEqual(["h", "h", "math", "img", "table"]);
    expect(richHeadings("## الف\nمتن\n### ب").map((h) => h.level)).toEqual([2, 3]);
  });
  it("does not treat code fences as headings or math; marker-looking text remains text", () => {
    expect(parseRichBlocks("```js\n## heading\n$$not math$$\n```\n\n## real").map((b) => b.type)).toEqual(["code", "h"]);
    expect(richHeadings("```\n## no\n```\n## yes")).toHaveLength(1);
    expect(parseRichBlocks("@@MATH0@@\n@@RICH_BLOCK_0@@")[0]).toMatchObject({ type: "p" });
  });
  it("normalizes Persian and Arabic forms conservatively", () => {
    expect(catalogNameKey("  يادگيري‌ كلي ")).toBe(catalogNameKey("یادگیری کلی"));
    expect(catalogNameKey("ترجمه و تعریب")).not.toBe(catalogNameKey("ترجمه"));
  });
  it.each(["javascript:alert(1)", "data:text/html,x", "//example.com/a", "https://user:pass@example.com/a", "vbscript:test", "bad\nurl"])("rejects executable/unsafe image sources: %s", (src) => expect(isSafeImageSrc(src)).toBe(false));
  it.each(["/media/figure.png", "relative.png", "https://example.com/a.png", "data:image/png;base64,abc"])("accepts supported image sources: %s", (src) => expect(isSafeImageSrc(src)).toBe(true));
  it("prefers direct links but preserves old topic recommendations without duplicates or draft leaks", () => {
    const topicLesson = { ...LESSONS[0], id: "topic" };
    const direct = { ...LESSONS[0], id: "direct", topicId: "other" };
    const draft = { ...LESSONS[0], id: "draft", status: "draft" as const };
    const q = { ...QUESTIONS[0], topicIds: [topicLesson.topicId], lessonIds: [direct.id, topicLesson.id, draft.id] };
    expect(relatedLessons(q, [topicLesson, direct, draft]).map((l) => l.id)).toEqual(["direct", "topic"]);
    expect(relatedLessons(q, [topicLesson, direct, draft], true).map((l) => l.id)).toEqual(["direct", "topic", "draft"]);
    expect(relatedLessons({ ...q, lessonIds: undefined }, [topicLesson])).toEqual([topicLesson]);
    expect(isLessonPublished(topicLesson)).toBe(true);
  });
});
