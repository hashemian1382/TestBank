import { test, expect, type Page } from "@playwright/test";
import type { Lesson, Question, Topic } from "../../src/types";

const dbKey = "testbank.db.v2";
async function login(page: Page, role = "admin") {
  await page.goto("/#/auth?mode=login");
  await page.getByRole("button", { name: role === "admin" ? "مدیر دمو" : "کاربر دمو", exact: true }).click();
  await page.getByRole("button", { name: "ورود به حساب", exact: true }).click();
  await expect(page).toHaveURL(role === "admin" ? /#\/admin$/ : /#\/app$/);
}
const readDb = (page: Page) => page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), dbKey);
async function newLesson(page: Page, title: string, topicId = "cs-os-t1", publish = true) {
  await page.goto("/#/admin/lessons");
  await page.getByRole("button", { name: "درسنامه جدید", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "درسنامه‌ی جدید", exact: true });
  await dialog.getByLabel("عنوان درسنامه", { exact: true }).fill(title);
  await dialog.getByRole("combobox", { name: "درس درسنامه", exact: true }).selectOption("cs-os");
  await dialog.getByRole("combobox", { name: "مبحث درسنامه", exact: true }).selectOption(topicId);
  await dialog.getByLabel("خلاصه و هدف درسنامه").fill("مفهوم، مثال و نکته‌های تستی");
  await dialog.getByLabel("محتوای درسنامه", { exact: true }).fill("## مفهوم پایه\nمتن با **تأکید** و $x^2$.\n\n## مثال حل‌شده\n$$\\frac{a}{b}$$\n\n| عنوان | مقدار |\n|---|---|\n| مورد | ۲ |");
  if (publish) await dialog.getByLabel("وضعیت انتشار").selectOption("published");
  return dialog;
}
async function openQuestion(page: Page) {
  await page.goto("/#/admin/questions");
  await page.getByRole("button", { name: "سوال جدید", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "سوال جدید", exact: true });
  await dialog.getByRole("button", { name: /سیستم عامل/ }).click();
  const topic = (await readDb(page)).topics.find((t: Topic) => t.id === "cs-os-t1") as Topic;
  await dialog.getByRole("button", { name: topic.title, exact: true }).click();
  return dialog;
}
async function fillQuestion(page: Page, stem: string) {
  const dialog = await openQuestion(page);
  await dialog.getByLabel(/^صورت سوال/).fill(stem);
  for (const [index, digit] of ["۱", "۲", "۳", "۴"].entries()) await dialog.getByLabel(new RegExp(`^گزینه ${digit}`)).fill(`پاسخ ${index + 1}`);
  await dialog.getByLabel("پاسخ تشریحی", { exact: true }).fill("توضیح کامل پاسخ درست");
  return dialog;
}
async function importRows(page: Page, rows: unknown[]) {
  await page.goto("/#/admin/import");
  await page.getByLabel("JSON سوالات").fill(JSON.stringify(rows));
  await page.getByRole("button", { name: /^وارد کردن/ }).click();
  await expect(page.getByText(/سوال با موفقیت وارد شد/)).toBeVisible();
}
const row = (topics: unknown[], stem = "سوال ورود گروهی") => ({ subjects: ["cs-os"], topics, stem, options: ["الف", "ب", "ج", "د"], correct: 1 });

// A runtime exception is a failure even when the visible part of a flow happens to work.
test.beforeEach(async ({ page }) => { page.on("pageerror", (error) => { throw new Error(`Browser runtime error: ${error.message}`); }); });

test("professional lesson editor, live preview, image, publish, edit and reload", async ({ page }) => {
  await login(page);
  const title = "درسنامه‌ی جامع زمان‌بندی";
  const dialog = await newLesson(page, title);
  await dialog.getByLabel("برچسب جدید").fill("سیستم عامل");
  await dialog.getByLabel("برچسب جدید").press("Enter");
  await dialog.getByRole("button", { name: "نگارش و پیش‌نمایش", exact: true }).click();
  await expect(dialog.getByLabel("پیش‌نمایش زنده").locator(".katex")).toHaveCount(2);
  await expect(dialog.getByRole("navigation", { name: "فهرست درسنامه" })).toBeVisible();
  await dialog.locator("summary").filter({ hasText: "تصاویر و شکل‌ها" }).click();
  await dialog.getByLabel("بارگذاری تصویر درسنامه").setInputFiles({ name: "figure.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=", "base64") });
  await dialog.getByLabel("زیرنویس تصویر").fill("شکل آزمایشی");
  await dialog.getByRole("button", { name: "درج در محتوا", exact: true }).click();
  await expect(dialog.getByLabel("پیش‌نمایش زنده").locator("figure")).toHaveCount(1);
  await dialog.getByRole("button", { name: "ذخیره و انتشار", exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
  const stored = (await readDb(page)).lessons.find((l: Lesson) => l.title === title) as Lesson;
  expect(stored.images).toHaveLength(1); expect(stored.tags).toEqual(["سیستم عامل"]);
  await page.reload();
  const card = page.getByRole("heading", { name: title, exact: true }).locator("..");
  await card.getByRole("button", { name: "ویرایش", exact: true }).click();
  const editing = page.getByRole("dialog", { name: "ویرایش درسنامه", exact: true });
  await editing.getByLabel("عنوان درسنامه", { exact: true }).fill(`${title} — ویرایش دوم`);
  await editing.getByRole("button", { name: "ذخیره و انتشار", exact: true }).click();
  await expect(editing).toBeHidden();
  await page.goto(`/#/app/lessons/${stored.id}`);
  await expect(page.getByRole("heading", { name: `${title} — ویرایش دوم`, exact: true })).toBeVisible();
  await expect(page.locator("figure img")).toBeVisible();
  await expect(page.locator(".rich-text table")).toBeVisible();
});

test("existing and inline new lessons attach to a question, appear in the bank and unlink on edit", async ({ page }) => {
  await login(page);
  const stem = "سوال ویژه‌ی اتصال درسنامه";
  const dialog = await fillQuestion(page, stem);
  await dialog.getByRole("checkbox", { name: /الگوریتم‌های جایگزینی صفحه/ }).check();
  await dialog.getByRole("button", { name: "ساخت درسنامه برای سوال", exact: true }).click();
  const lesson = page.getByRole("dialog", { name: "درسنامه‌ی جدید برای سوال", exact: true });
  await lesson.getByLabel("عنوان درسنامه", { exact: true }).fill("درسنامه‌ی اختصاصی سوال");
  await lesson.getByLabel("محتوای درسنامه", { exact: true }).fill("## آموزش\nمحتوای دقیق درسنامه‌ی اختصاصی.");
  await lesson.getByLabel("وضعیت انتشار").selectOption("published");
  await lesson.getByRole("button", { name: "تأیید درسنامه برای سوال", exact: true }).click();
  await expect(lesson).toBeHidden(); await expect(dialog).toBeVisible();
  expect((await readDb(page)).lessons.some((l: Lesson) => l.title === "درسنامه‌ی اختصاصی سوال")).toBe(false);
  await dialog.getByRole("button", { name: "ذخیره", exact: true }).click();
  await expect(dialog).toBeHidden();
  const q = (await readDb(page)).questions.find((q: Question) => q.stem === stem) as Question;
  expect(q.lessonIds).toHaveLength(2);
  await page.goto("/#/app/bank?subject=cs-os");
  const card = page.locator(`[data-question-id="${q.id}"]`);
  await card.getByRole("button", { name: /^درسنامه‌های مرتبط/ }).click();
  await expect(card.getByRole("link", { name: /درسنامه‌ی اختصاصی سوال/ })).toBeVisible();
  await expect(card.getByRole("link", { name: /الگوریتم‌های جایگزینی صفحه/ })).toBeVisible();
  await page.goto("/#/admin/questions");
  await page.getByPlaceholder("جستجو در صورت سوال، گزینه‌ها، پاسخ یا برچسب...").fill(stem);
  await page.getByRole("row").filter({ hasText: stem }).getByRole("button", { name: "ویرایش", exact: true }).click();
  const editor = page.getByRole("dialog", { name: `ویرایش سوال ${q.id}` });
  await editor.getByRole("button", { name: "قطع اتصال الگوریتم‌های جایگزینی صفحه", exact: true }).click();
  await editor.getByRole("button", { name: "ذخیره", exact: true }).click();
  await expect(editor).toBeHidden();
  const data = await readDb(page); expect(data.questions.find((v: Question) => v.id === q.id).lessonIds).toHaveLength(1);
  expect(data.lessons.some((l: Lesson) => l.id === "les-os-t6")).toBe(true);
});

test("nested dialogs: Escape only closes the top layer; cancelled drafts do not create orphan data", async ({ page }) => {
  await login(page);
  const before = await readDb(page);
  const question = await openQuestion(page);
  await question.getByRole("button", { name: "ساخت درسنامه برای سوال", exact: true }).click();
  const lesson = page.getByRole("dialog", { name: "درسنامه‌ی جدید برای سوال", exact: true });
  await lesson.getByLabel("عنوان درسنامه", { exact: true }).fill("نباید ذخیره شود");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(3);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(2);
  expect(await page.evaluate(() => document.body.style.overflow)).toBe("hidden");
  await lesson.getByRole("button", { name: "انصراف", exact: true }).click();
  await page.getByRole("dialog", { name: "تغییرات ذخیره نشده" }).getByRole("button", { name: "خروج بدون ذخیره" }).click();
  await expect(lesson).toBeHidden(); await expect(question).toBeVisible();
  await question.getByRole("button", { name: "انصراف", exact: true }).click();
  await page.getByRole("dialog", { name: "تغییرات ذخیره نشده" }).getByRole("button", { name: "خروج بدون ذخیره" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(await page.evaluate(() => document.body.style.overflow)).toBe("");
  const after = await readDb(page); expect(after.questions.length).toBe(before.questions.length); expect(after.lessons.length).toBe(before.lessons.length);
});

test("bulk import auto-creates normalized/scoped topics, reports invalid rows and prevents repeat submit", async ({ page }) => {
  await login(page);
  await importRows(page, [row(["پردازش‌ موازي"]), row(["پردازش موازی"]), { ...row(["ردیف خراب"]), options: ["bad"] }, row([{ subject: "cs-os", title: "مبحث با محدوده" }])]);
  await expect(page.getByText("۳ سوال با موفقیت وارد شد")).toBeVisible();
  await expect(page.getByRole("heading", { name: "۲ مبحث جدید خودکار ساخته شد" })).toBeVisible();
  await expect(page.getByText(/ردیف ۳: باید دقیقاً/)).toBeVisible();
  await expect(page.getByRole("button", { name: /^وارد کردن/ })).toBeDisabled();
  let db = await readDb(page); expect(db.topics.some((t: Topic) => t.title === "ردیف خراب")).toBe(false);
  await page.getByRole("button", { name: "اصلاح فقط ردیف‌های ناموفق", exact: true }).click();
  const invalid = JSON.parse(await page.getByLabel("JSON سوالات").inputValue()); expect(invalid).toHaveLength(1);
  invalid[0].options = ["الف", "ب", "ج", "د"];
  await page.getByLabel("JSON سوالات").fill(JSON.stringify(invalid));
  await page.getByRole("button", { name: /^وارد کردن/ }).click();
  await expect(page.getByText("۱ سوال با موفقیت وارد شد")).toBeVisible();
  db = await readDb(page); expect(db.topics.some((t: Topic) => t.title === "ردیف خراب")).toBe(true);
});

test("topic merge preview and rename propagate to questions, lessons, filters and old URLs", async ({ page }) => {
  await login(page);
  await importRows(page, [row(["ترجمه", "ترجمه و تعریب"], "سوال ترجمه"), row(["معنی"], "سوال معنا")]);
  const original = await readDb(page);
  const oldTopics = original.topics.filter((t: Topic) => ["ترجمه", "ترجمه و تعریب", "معنی"].includes(t.title) && t.subjectId === "cs-os") as Topic[];
  const lessonDialog = await newLesson(page, "درسنامه‌ی قبل از ادغام", oldTopics[2].id);
  await lessonDialog.getByRole("button", { name: "ذخیره و انتشار", exact: true }).click();
  await expect(lessonDialog).toBeHidden();
  await page.goto("/#/admin/catalog");
  const card = page.locator('[data-subject-id="cs-os"]');
  await card.getByRole("button", { name: "مباحث", exact: true }).click();
  for (const topic of oldTopics) await card.getByRole("checkbox", { name: `انتخاب مبحث ${topic.title}`, exact: true }).check();
  await card.getByRole("button", { name: /^ادغام انتخاب‌ها/ }).click();
  const merge = page.getByRole("dialog", { name: "ادغام مباحث", exact: true });
  await merge.getByLabel("نام مبحث نهایی").fill("ترجمه و تعریب و معنا");
  await merge.getByRole("button", { name: "بررسی اثر ادغام", exact: true }).click();
  await expect(merge.getByText("مبحث نهایی: ترجمه و تعریب و معنا")).toBeVisible();
  await expect(merge.getByRole("button", { name: "تأیید و ادغام مباحث", exact: true })).toBeDisabled();
  await merge.getByRole("checkbox").check();
  await merge.getByRole("button", { name: "تأیید و ادغام مباحث", exact: true }).click();
  await expect(merge).toBeHidden();
  await expect(card.getByRole("checkbox", { name: "انتخاب مبحث ترجمه و تعریب و معنا", exact: true })).toBeVisible();
  await card.getByRole("button", { name: "ویرایش نام ترجمه و تعریب و معنا", exact: true }).click();
  const rename = page.getByRole("dialog", { name: "ویرایش نام مبحث", exact: true });
  await rename.getByLabel("نام مبحث", { exact: true }).fill("ترجمه و معنا — نهایی");
  await rename.getByRole("button", { name: "ذخیره نام مبحث", exact: true }).click();
  await expect(rename).toBeHidden();
  const db = await readDb(page); const final = db.topics.find((t: Topic) => t.title === "ترجمه و معنا — نهایی") as Topic;
  expect(db.lessons.find((l: Lesson) => l.title === "درسنامه‌ی قبل از ادغام").topicId).toBe(final.id);
  expect(db.questions.filter((q: Question) => ["سوال ترجمه", "سوال معنا"].includes(q.stem)).every((q: Question) => q.topicIds.length === 1 && q.topicIds[0] === final.id)).toBe(true);
  const oldId = oldTopics.find((t) => t.id !== final.id)!.id;
  await page.goto(`/#/app/bank?subject=cs-os&topic=${oldId}`);
  await expect(page.getByText("سوال ترجمه", { exact: true })).toBeVisible();
  await expect(page.getByText("سوال معنا", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "ترجمه و معنا — نهایی", exact: true })).toBeVisible();
});

test("draft routes are hidden for users; existing ownership and seeded lesson pages remain usable", async ({ page }) => {
  await login(page);
  const dialog = await newLesson(page, "پیش‌نویس خصوصی", "cs-os-t1", false);
  await dialog.getByRole("button", { name: "ذخیره پیش‌نویس", exact: true }).click();
  await expect(dialog).toBeHidden();
  const draft = (await readDb(page)).lessons.find((l: Lesson) => l.title === "پیش‌نویس خصوصی") as Lesson;
  await login(page, "user");
  await page.goto("/#/app/lessons");
  await expect(page.getByRole("heading", { name: "درسنامه‌ها", exact: true })).toBeVisible();
  await expect(page.getByText("پیش‌نویس خصوصی", { exact: true })).toHaveCount(0);
  await page.goto(`/#/app/lessons/${draft.id}`);
  await expect(page.getByRole("heading", { name: "درسنامه یافت نشد", exact: true })).toBeVisible();
  await page.goto("/#/app/lessons/les-dsa-t1");
  await expect(page.locator(".rich-text table")).toBeVisible();
  await page.goto("/#/app/lessons/les-ai-t3");
  await expect(page.getByText(/برای مطالعه‌ی کامل درسنامه/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "تابع ارزیابی", exact: true })).toHaveCount(0);
  await page.goto("/#/admin/lessons"); await expect(page).toHaveURL(/#\/app$/);
});

test("quota errors leave the editor open and do not commit either new question or inline lesson", async ({ page }) => {
  await login(page);
  const dialog = await fillQuestion(page, "نباید ناقص ذخیره شود");
  await dialog.getByRole("button", { name: "ساخت درسنامه برای سوال", exact: true }).click();
  const lesson = page.getByRole("dialog", { name: "درسنامه‌ی جدید برای سوال", exact: true });
  await lesson.getByLabel("عنوان درسنامه", { exact: true }).fill("درسنامه‌ی تراکنشی");
  await lesson.getByRole("button", { name: "تأیید درسنامه برای سوال", exact: true }).click();
  await expect(lesson).toBeHidden();
  const before = await page.evaluate((key) => localStorage.getItem(key), dbKey);
  await page.evaluate(() => { Storage.prototype.setItem = () => { throw new DOMException("full", "QuotaExceededError"); }; });
  await dialog.getByRole("button", { name: "ذخیره", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("ذخیره انجام نشد");
  await expect(dialog).toBeVisible();
  expect(await page.evaluate((key) => localStorage.getItem(key), dbKey)).toBe(before);
});

test("mobile RTL lesson editor and catalog fit the viewport and close correctly", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  await page.getByRole("button", { name: "باز کردن منو", exact: true }).click();
  await page.getByRole("link", { name: "درسنامه‌ها", exact: true }).click();
  await expect(page.getByRole("heading", { name: "مدیریت درسنامه‌ها", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole("button", { name: "درسنامه جدید", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "درسنامه‌ی جدید", exact: true });
  const bounds = await dialog.boundingBox(); expect(bounds!.width).toBeLessThanOrEqual(390);
  await dialog.getByLabel("عنوان درسنامه", { exact: true }).fill("موبایل");
  await dialog.getByRole("button", { name: "انصراف", exact: true }).click();
  await page.getByRole("dialog", { name: "تغییرات ذخیره نشده" }).getByRole("button", { name: "خروج بدون ذخیره" }).click();
  await expect(dialog).toBeHidden();
  await page.goto("/#/admin/catalog");
  await page.locator('[data-subject-id="cs-os"]').getByRole("button", { name: "مباحث", exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
