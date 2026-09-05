import type { Question } from "@/types";
import { fig } from "./figures";
import { q, r } from "./question-helpers";

export const CS_QUESTIONS: Question[] = [
  /* ---------------- ساختمان داده و الگوریتم ---------------- */
  q({
    id: "q-dsa-001",
    subjectIds: ["cs-dsa"],
    topicIds: ["cs-dsa-t1"],
    sourceId: "src-cs-1403",
    difficulty: 2,
    tags: ["مرتبه اجرایی", "رابطه بازگشتی"],
    stem: r`مرتبه‌ی اجرایی رابطه‌ی بازگشتی $T(n) = 2T\left(\frac{n}{2}\right) + n\log n$ کدام است؟`,
    options: [r`$\Theta(n\log n)$`, r`$\Theta(n\log^2 n)$`, r`$\Theta(n^2)$`, r`$\Theta(n)$`],
    correctIndex: 1,
    explanation: r`با قضیه‌ی اصلی (Master Theorem) داریم $a=2,\ b=2$ و $f(n)=n\log n$. چون $n^{\log_b a} = n$ و $f(n) = \Theta(n\log^{1} n)$، حالت دوم تعمیم‌یافته با $k=1$ برقرار است:
$$T(n) = \Theta\left(n^{\log_b a}\log^{k+1} n\right) = \Theta(n\log^2 n)$$
**راه دوم (درخت بازگشت):** در سطح $i$ داریم $2^i$ زیرمسئله با اندازه $n/2^i$ و هزینه‌ی هر سطح $n\log(n/2^i) = n(\log n - i)$. مجموع روی $\log n$ سطح:
$$\sum_{i=0}^{\log n} n(\log n - i) = n\cdot\frac{\log n(\log n+1)}{2} = \Theta(n\log^2 n)$$`,
  }),
  q({
    id: "q-dsa-002",
    subjectIds: ["cs-dsa"],
    topicIds: ["cs-dsa-t3"],
    sourceId: "src-cs-1402",
    difficulty: 1,
    tags: ["BST", "پیمایش"],
    images: [fig("tree", 300)],
    stem: r`درخت جستجوی دودویی زیر را در نظر بگیرید. اگر کلید ۶۰ را درج و سپس کلید ۵۰ (ریشه) را حذف کنیم (با جایگزینی از **جانشین inorder**)، ریشه‌ی درخت جدید کدام است؟
[[img:fig-tree]]`,
    options: ["۴۰", "۶۰", "۷۰", "۸۰"],
    correctIndex: 1,
    explanation: r`ابتدا ۶۰ درج می‌شود: $60 > 50 \to$ راست، $60 < 70 \to$ فرزند چپ ۷۰. حالا هنگام حذف ریشه (۵۰)، جانشین inorder آن کوچک‌ترین عنصر زیردرخت راست است که **۶۰** می‌باشد؛ پس ۶۰ جایگزین ریشه می‌شود.
اگر از پیشین inorder استفاده می‌کردیم پاسخ ۴۰ بود؛ به عبارت صورت سوال دقت کنید.`,
  }),
  q({
    id: "q-dsa-003",
    subjectIds: ["cs-dsa"],
    topicIds: ["cs-dsa-t3", "cs-dsa-t1"],
    sourceId: "src-talifi",
    difficulty: 2,
    tags: ["هرم", "Heap"],
    stem: r`ساخت یک هرم (Heap) با $n$ عنصر به روش پایین به بالا (Bottom-Up / Heapify) چه مرتبه‌ای دارد و حداکثر تعداد مقایسه‌ها در بدترین حالت تقریباً چقدر است؟`,
    options: [r`$\Theta(n\log n)$ و $n\log n$`, r`$\Theta(n)$ و $2n$`, r`$\Theta(n)$ و $n\log n$`, r`$\Theta(\log n)$ و $2\log n$`],
    correctIndex: 1,
    explanation: r`هزینه‌ی heapify برای گره‌ای در ارتفاع $h$ برابر $O(h)$ است و تعداد گره‌ها در ارتفاع $h$ حداکثر $\lceil n/2^{h+1}\rceil$ است:
$$\sum_{h=0}^{\lfloor\log n\rfloor} \left\lceil\frac{n}{2^{h+1}}\right\rceil O(h) = O\!\left(n\sum_{h\ge 0}\frac{h}{2^{h}}\right) = O(2n) = O(n)$$
تعداد مقایسه‌ها در بدترین حالت حداکثر $2n$ است (هر گام پایین‌رفتن دو مقایسه دارد).`,
  }),
  q({
    id: "q-dsa-004",
    subjectIds: ["cs-dsa"],
    topicIds: ["cs-dsa-t6"],
    sourceId: "src-cs-1401",
    difficulty: 2,
    tags: ["گراف", "DFS", "BFS"],
    images: [fig("graph", 300)],
    stem: r`در گراف زیر، اگر پیمایش BFS را از رأس $A$ آغاز کنیم و همسایه‌ها به ترتیب الفبایی بررسی شوند، رأس $E$ در چه مرحله‌ای (چندمین رأس) ملاقات می‌شود؟
[[img:fig-graph]]`,
    options: ["سوم", "چهارم", "پنجم", "دوم"],
    correctIndex: 2,
    explanation: r`یال‌های گراف: $AB,\ BC,\ AD,\ BD,\ BE,\ CE,\ DE$.
ترتیب BFS از $A$:
1. $A$ ملاقات می‌شود و وارد صف می‌گردد.
2. از صف $A$ خارج شده و همسایه‌هایش به‌ترتیب الفبایی کشف می‌شوند: $B$ (دوم)، $D$ (سوم).
3. $B$ از صف خارج می‌شود؛ همسایه‌های دیده‌نشده‌ی آن: $C$ (چهارم)، $E$ (**پنجم**).

پس $E$ پنجمین رأس ملاقات‌شده است. ترتیب کامل: $A, B, D, C, E$.
> **نکته:** در DFS با همین قاعده ترتیب $A, B, C, E, D$ می‌شد و $E$ چهارم بود.`,
  }),
  q({
    id: "q-dsa-005",
    subjectIds: ["cs-dsa"],
    topicIds: ["cs-dsa-t8"],
    sourceId: "src-cs-1403",
    difficulty: 3,
    tags: ["برنامه‌نویسی پویا", "LCS"],
    stem: r`طول بزرگ‌ترین زیردنباله‌ی مشترک (LCS) دو رشته‌ی $X = \texttt{ABCBDAB}$ و $Y=\texttt{BDCABA}$ کدام است؟`,
    options: ["۳", "۴", "۵", "۶"],
    correctIndex: 1,
    explanation: r`با جدول برنامه‌نویسی پویا $c[i][j]$:
$$c[i][j] = \begin{cases} 0 & i=0 \lor j=0 \\ c[i-1][j-1]+1 & x_i = y_j \\ \max(c[i-1][j],\ c[i][j-1]) & \text{otherwise}\end{cases}$$
مقدار نهایی $c[7][6] = 4$ است؛ برای مثال زیردنباله‌ی مشترک $\texttt{BCBA}$ یا $\texttt{BDAB}$. این مثال کلاسیک کتاب CLRS است.`,
  }),
  q({
    id: "q-dsa-006",
    subjectIds: ["cs-dsa"],
    topicIds: ["cs-dsa-t5"],
    sourceId: "src-parseh",
    difficulty: 1,
    tags: ["مرتب‌سازی", "پایداری"],
    stem: r`کدام‌یک از الگوریتم‌های مرتب‌سازی زیر **پایدار (Stable)** نیست؟`,
    options: ["مرتب‌سازی ادغامی (Merge Sort)", "مرتب‌سازی درجی (Insertion Sort)", "مرتب‌سازی هرمی (Heap Sort)", "مرتب‌سازی شمارشی (Counting Sort)"],
    correctIndex: 2,
    explanation: r`مرتب‌سازی هرمی به‌دلیل جابه‌جایی ریشه با آخرین عنصر، ترتیب نسبی عناصر برابر را حفظ نمی‌کند و **ناپایدار** است. Merge، Insertion و Counting Sort (در پیاده‌سازی استاندارد) پایدارند. Quick Sort و Selection Sort نیز ناپایدارند.`,
  }),
  q({
    id: "q-dsa-007",
    subjectIds: ["cs-dsa"],
    topicIds: ["cs-dsa-t9", "cs-dsa-t6"],
    sourceId: "src-cs-1402",
    difficulty: 2,
    tags: ["MST", "کراسکال", "پریم"],
    stem: r`در یک گراف همبند وزن‌دار با $n$ رأس و $m$ یال که همه‌ی وزن‌ها **متمایز** هستند، کدام گزاره **نادرست** است؟`,
    options: [
      "درخت پوشای کمینه یکتاست.",
      "یال با کمترین وزن حتماً در MST قرار دارد.",
      "یال با بیشترین وزن هرگز در MST قرار نمی‌گیرد.",
      "کم‌وزن‌ترین یال هر برش (cut) در MST قرار دارد.",
    ],
    correctIndex: 2,
    explanation: r`اگر یال با بیشترین وزن، یک **پل (bridge)** باشد، حتماً در MST قرار می‌گیرد (مثلاً در یک گراف درختی همه‌ی یال‌ها در MST هستند). سایر گزینه‌ها با ویژگی برش (Cut Property) و یکتایی MST با وزن‌های متمایز درست‌اند.`,
  }),

  /* ---------------- سیستم عامل ---------------- */
  q({
    id: "q-os-001",
    subjectIds: ["cs-os"],
    topicIds: ["cs-os-t2"],
    sourceId: "src-cs-1403",
    difficulty: 2,
    tags: ["زمان‌بندی", "SJF"],
    stem: r`چهار فرآیند با زمان ورود ۰ و زمان‌های اجرای $8, 4, 2, 6$ (میلی‌ثانیه) داریم. میانگین زمان انتظار با الگوریتم SJF غیرانحصاری چند میلی‌ثانیه است؟`,
    options: ["۵", "۷", "۶", "۸"],
    correctIndex: 0,
    explanation: r`ترتیب اجرا: $2 \to 4 \to 6 \to 8$. زمان‌های انتظار: $0, 2, 6, 12$.
$$\bar{W} = \frac{0+2+6+12}{4} = 5\ \text{ms}$$`,
  }),
  q({
    id: "q-os-002",
    subjectIds: ["cs-os"],
    topicIds: ["cs-os-t6"],
    sourceId: "src-cs-1402",
    difficulty: 2,
    tags: ["حافظه مجازی", "جایگزینی صفحه", "LRU"],
    stem: r`رشته‌ی مراجعه‌ی صفحات $1,2,3,4,1,2,5,1,2,3,4,5$ با ۳ قاب حافظه داده شده است. تعداد خطاهای صفحه با الگوریتم LRU چقدر است؟`,
    options: ["۹", "۱۰", "۱۲", "۸"],
    correctIndex: 1,
    explanation: r`شبیه‌سازی LRU با ۳ قاب:
| مراجعه | ۱ | ۲ | ۳ | ۴ | ۱ | ۲ | ۵ | ۱ | ۲ | ۳ | ۴ | ۵ |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| خطا؟ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | – | – | ✓ | ✓ | ✓ |

جمعاً **۱۰ خطای صفحه**. (با FIFO نیز ۱۰ و با Optimal برابر ۷ می‌شود.)`,
  }),
  q({
    id: "q-os-003",
    subjectIds: ["cs-os"],
    topicIds: ["cs-os-t4"],
    sourceId: "src-talifi",
    difficulty: 2,
    tags: ["بن‌بست", "الگوریتم بانکدار"],
    stem: r`در سیستمی با $m$ نمونه از یک منبع و $n$ فرآیند، هر فرآیند حداکثر به $k$ نمونه نیاز دارد. شرط کافی برای **عدم وقوع بن‌بست** کدام است؟`,
    options: [r`$n \cdot k < m + n$`, r`$n\cdot k \le m$`, r`$m \ge n$`, r`$k < m$`],
    correctIndex: 0,
    explanation: r`بدترین حالت آن است که هر فرآیند $k-1$ منبع گرفته باشد و همه منتظر باشند. اگر حتی یک منبع اضافه موجود باشد، بن‌بست رخ نمی‌دهد:
$$n(k-1) + 1 \le m \iff nk < m + n$$`,
  }),
  q({
    id: "q-os-004",
    subjectIds: ["cs-os"],
    topicIds: ["cs-os-t3"],
    sourceId: "src-cs-1401",
    difficulty: 3,
    tags: ["سمافور", "همگام‌سازی"],
    stem: r`سه فرآیند $P_1,P_2,P_3$ به‌ترتیب باید عبارت‌های $A$، $B$ و $C$ را چاپ کنند به‌طوری‌که خروجی همیشه $ABC$ باشد. با دو سمافور $S_1=S_2=0$ کدام آرایش صحیح است؟`,
    options: [
      r`$P_1$: print A; signal($S_1$) — $P_2$: wait($S_1$); print B; signal($S_2$) — $P_3$: wait($S_2$); print C`,
      r`$P_1$: wait($S_1$); print A — $P_2$: print B; signal($S_1$) — $P_3$: wait($S_2$); print C`,
      r`$P_1$: print A; wait($S_1$) — $P_2$: signal($S_1$); print B — $P_3$: signal($S_2$); print C`,
      r`$P_1$: signal($S_1$); print A — $P_2$: wait($S_2$); print B — $P_3$: wait($S_1$); print C`,
    ],
    correctIndex: 0,
    explanation: r`برای اجرای ترتیبی، هر فرآیند پس از کارش سمافوری را signal می‌کند که فرآیند بعدی روی آن wait کرده است. گزینه‌ی ۱ زنجیره‌ی $P_1 \to P_2 \to P_3$ را تضمین می‌کند. سایر گزینه‌ها یا بن‌بست می‌دهند یا ترتیب را تضمین نمی‌کنند.`,
  }),

  /* ---------------- مدار منطقی ---------------- */
  q({
    id: "q-logic-001",
    subjectIds: ["cs-logic"],
    topicIds: ["cs-logic-t3", "cs-logic-t2"],
    sourceId: "src-cs-1403",
    difficulty: 1,
    tags: ["گیت", "تابع بول"],
    images: [fig("logic", 340)],
    stem: r`تابع خروجی $F$ در مدار زیر کدام است؟
[[img:fig-logic]]`,
    options: [r`$F = AB + \bar{C}$`, r`$F = (A+B)\bar{C}$`, r`$F = AB\cdot\bar{C}$`, r`$F = \overline{AB} + C$`],
    correctIndex: 0,
    explanation: r`خروجی گیت AND برابر $AB$ و خروجی NOT برابر $\bar{C}$ است. این دو وارد گیت OR می‌شوند:
$$F = AB + \bar{C}$$`,
  }),
  q({
    id: "q-logic-002",
    subjectIds: ["cs-logic"],
    topicIds: ["cs-logic-t2"],
    sourceId: "src-cs-1402",
    difficulty: 2,
    tags: ["K-Map", "ساده‌سازی"],
    stem: r`ساده‌شده‌ی تابع $F(A,B,C,D) = \sum m(0,2,5,7,8,10,13,15)$ به فرم SOP کدام است؟`,
    options: [r`$\bar{B}\bar{D} + BD$`, r`$\bar{B}D + B\bar{D}$`, r`$\bar{A}\bar{D} + AD$`, r`$B \oplus D$`],
    correctIndex: 0,
    explanation: r`روی جدول کارنو، مینترم‌های $0,2,8,10$ چهار گوشه را می‌سازند ($\bar{B}\bar{D}$) و مینترم‌های $5,7,13,15$ بلوک میانی را ($BD$). پس:
$$F = \bar{B}\bar{D} + BD = \overline{B \oplus D}$$
گزینه‌ی ۴ ($B\oplus D$) مکمل پاسخ است.`,
  }),
  q({
    id: "q-logic-003",
    subjectIds: ["cs-logic"],
    topicIds: ["cs-logic-t4", "cs-logic-t5"],
    sourceId: "src-talifi",
    difficulty: 2,
    tags: ["فلیپ‌فلاپ", "شمارنده"],
    stem: r`یک شمارنده‌ی همگام با ۴ فلیپ‌فلاپ JK طراحی شده که از $0$ تا $9$ می‌شمارد و سپس به $0$ برمی‌گردد (شمارنده‌ی دهدهی/BCD). حداقل چند فلیپ‌فلاپ برای ساخت شمارنده‌ای که از $0$ تا $99$ به‌صورت BCD بشمارد لازم است؟`,
    options: ["۷", "۸", "۱۰", "۱۴"],
    correctIndex: 1,
    explanation: r`در BCD هر رقم دهدهی با ۴ بیت نمایش داده می‌شود. برای دو رقم ($0$ تا $99$) به $2\times 4 = 8$ فلیپ‌فلاپ نیاز است. (اگر باینری خالص بود $\lceil\log_2 100\rceil = 7$ کافی بود.)`,
  }),
  q({
    id: "q-logic-004",
    subjectIds: ["cs-logic"],
    topicIds: ["cs-logic-t1"],
    sourceId: "src-cs-1401",
    difficulty: 1,
    tags: ["مکمل ۲", "سیستم اعداد"],
    stem: r`نمایش عدد $-37$ در سیستم مکمل ۲ با ۸ بیت کدام است؟`,
    options: [r`$11011011$`, r`$11011010$`, r`$10100101$`, r`$11100101$`],
    correctIndex: 0,
    explanation: r`$37 = 00100101_2$. مکمل ۱: $11011010$، به‌علاوه‌ی ۱: $11011011$.
راه سریع: $256 - 37 = 219 = 11011011_2$.`,
  }),

  /* ---------------- معماری کامپیوتر ---------------- */
  q({
    id: "q-arch-001",
    subjectIds: ["cs-arch"],
    topicIds: ["cs-arch-t3"],
    sourceId: "src-cs-1403",
    difficulty: 2,
    tags: ["پایپلاین", "افزایش سرعت"],
    images: [fig("pipeline", 340)],
    stem: r`در یک پایپلاین ۵ مرحله‌ای مطابق شکل، $100$ دستور اجرا می‌شود و به‌ازای هر دستور به‌طور میانگین $0.2$ سیکل توقف (stall) داریم. افزایش سرعت (Speedup) نسبت به پردازنده‌ی تک‌سیکلی بدون پایپلاین چقدر است؟
[[img:fig-pipeline]]`,
    options: [r`$\approx 4.03$`, r`$\approx 5$`, r`$\approx 4.17$`, r`$\approx 3.85$`],
    correctIndex: 0,
    explanation: r`تعداد سیکل‌های پایپلاین: $(k-1) + n + n\times 0.2 = 4 + 100 + 20 = 124$.
تعداد سیکل‌های بدون پایپلاین: $n\times k = 500$.
$$S = \frac{500}{124} \approx 4.03$$`,
  }),
  q({
    id: "q-arch-002",
    subjectIds: ["cs-arch"],
    topicIds: ["cs-arch-t4"],
    sourceId: "src-cs-1402",
    difficulty: 2,
    tags: ["کش", "نگاشت"],
    stem: r`حافظه‌ی اصلی $2^{32}$ بایت و کشی با ظرفیت $64\,\text{KB}$، بلاک $64$ بایتی و نگاشت **۴-راهه‌ی انجمنی** داریم. تعداد بیت‌های برچسب (Tag) کدام است؟`,
    options: ["۱۸", "۱۶", "۲۰", "۱۴"],
    correctIndex: 0,
    explanation: r`تعداد بلاک‌ها: $64K/64 = 1024$. تعداد مجموعه‌ها: $1024/4 = 256 = 2^8$ → ۸ بیت اندیس. آفست بلاک: $\log_2 64 = 6$ بیت.
$$\text{Tag} = 32 - 8 - 6 = 18$$`,
  }),
  q({
    id: "q-arch-003",
    subjectIds: ["cs-arch"],
    topicIds: ["cs-arch-t7"],
    sourceId: "src-talifi",
    difficulty: 1,
    tags: ["قانون امدال"],
    stem: r`اگر $40\%$ از زمان اجرای برنامه‌ای را بتوان $4$ برابر سریع‌تر کرد، بیشینه‌ی افزایش سرعت کلی طبق قانون امدال چقدر است؟`,
    options: [r`$1.43$`, r`$1.6$`, r`$2.5$`, r`$1.25$`],
    correctIndex: 0,
    explanation: r`$$S = \frac{1}{(1-f) + \frac{f}{k}} = \frac{1}{0.6 + \frac{0.4}{4}} = \frac{1}{0.7} \approx 1.43$$`,
  }),

  /* ---------------- نظریه زبان‌ها ---------------- */
  q({
    id: "q-theory-001",
    subjectIds: ["cs-theory"],
    topicIds: ["cs-theory-t1"],
    sourceId: "src-cs-1403",
    difficulty: 2,
    tags: ["DFA", "زبان منظم"],
    images: [fig("dfa", 360)],
    stem: r`ماشین DFA زیر روی الفبای $\{0,1\}$ چه زبانی را می‌پذیرد؟
[[img:fig-dfa]]`,
    options: [
      r`رشته‌هایی که شامل زیررشته‌ی $11$ هستند`,
      r`رشته‌هایی که به $11$ ختم می‌شوند`,
      r`رشته‌هایی با تعداد زوج $1$`,
      r`رشته‌هایی که شامل زیررشته‌ی $10$ هستند`,
    ],
    correctIndex: 0,
    explanation: r`از $q_0$ با $1$ به $q_1$ و با $1$ دیگر به حالت پذیرش $q_2$ می‌رویم که با هر ورودی در خودش می‌ماند (حالت تله‌ی پذیرنده). با دیدن $0$ در $q_1$ به $q_0$ برمی‌گردیم. پس به‌محض دیدن دو $1$ متوالی، رشته پذیرفته می‌شود: زبان «شامل $11$».`,
  }),
  q({
    id: "q-theory-002",
    subjectIds: ["cs-theory"],
    topicIds: ["cs-theory-t2", "cs-theory-t3"],
    sourceId: "src-cs-1402",
    difficulty: 2,
    tags: ["لم تزریق", "CFL"],
    stem: r`کدام زبان زیر **مستقل از متن** نیست؟`,
    options: [r`$L=\{a^nb^n \mid n\ge 0\}$`, r`$L=\{ww^R \mid w\in\{a,b\}^*\}$`, r`$L=\{a^nb^nc^n \mid n\ge 0\}$`, r`$L=\{a^ib^j \mid i\ne j\}$`],
    correctIndex: 2,
    explanation: r`زبان $a^nb^nc^n$ نمونه‌ی کلاسیک زبان **حساس به متن** است که با لم تزریق زبان‌های مستقل از متن نشان داده می‌شود CFL نیست (پمپ‌کردن هر بخشی تعادل سه حرف را به‌هم می‌زند). سه زبان دیگر با PDA قابل تشخیص‌اند.`,
  }),
  q({
    id: "q-theory-003",
    subjectIds: ["cs-theory"],
    topicIds: ["cs-theory-t5"],
    sourceId: "src-talifi",
    difficulty: 3,
    tags: ["تصمیم‌پذیری", "قضیه رایس"],
    stem: r`کدام مسئله **تصمیم‌پذیر** است؟`,
    options: [
      r`آیا ماشین تورینگ $M$ روی ورودی تهی توقف می‌کند؟`,
      r`آیا $L(M)$ منظم است؟`,
      r`آیا DFA داده‌شده‌ی $D$ زبان تهی می‌پذیرد؟`,
      r`آیا دو ماشین تورینگ زبان یکسانی دارند؟`,
    ],
    correctIndex: 2,
    explanation: r`تهی‌بودن زبان یک DFA با بررسی دسترس‌پذیری حالت‌های پذیرش از حالت شروع (پیمایش گراف) تصمیم‌پذیر است. گزینه‌های ۱، ۲ و ۴ به ترتیب مسئله‌ی توقف، قضیه‌ی رایس (ویژگی غیربدیهی زبان) و $EQ_{TM}$ هستند که همگی تصمیم‌ناپذیرند.`,
  }),

  /* ---------------- هوش مصنوعی ---------------- */
  q({
    id: "q-ai-001",
    subjectIds: ["cs-ai"],
    topicIds: ["cs-ai-t3"],
    sourceId: "src-cs-1403",
    difficulty: 2,
    tags: ["A*", "هیوریستیک"],
    stem: r`کدام گزاره درباره‌ی الگوریتم $A^*$ با تابع ارزیابی $f(n) = g(n) + h(n)$ **درست** است؟`,
    options: [
      "اگر $h$ قابل‌قبول (admissible) باشد، جستجوی درختی $A^*$ بهینه است.",
      "اگر $h$ سازگار (consistent) باشد، $A^*$ لزوماً بهینه نیست.",
      "$A^*$ با $h(n) = 0$ معادل جستجوی عمق‌اول است.",
      "هیوریستیک سازگار همیشه قابل‌قبول نیست.",
    ],
    correctIndex: 0,
    explanation: r`قابل‌قبول بودن ($h(n)\le h^*(n)$) برای بهینگی جستجوی **درختی** $A^*$ کافی است؛ برای جستجوی گرافی به سازگاری ($h(n) \le c(n,n') + h(n')$) نیاز است. سازگاری ⟹ قابل‌قبولی. با $h=0$، $A^*$ به جستجوی هزینه‌ی یکنواخت (UCS) تبدیل می‌شود نه DFS.`,
  }),
  q({
    id: "q-ai-002",
    subjectIds: ["cs-ai"],
    topicIds: ["cs-ai-t5"],
    sourceId: "src-cs-1401",
    difficulty: 2,
    tags: ["Minimax", "هرس آلفا-بتا"],
    stem: r`در بهترین حالت ترتیب‌بندی گره‌ها، پیچیدگی زمانی جستجوی Minimax با هرس آلفا-بتا برای درختی با ضریب انشعاب $b$ و عمق $d$ کدام است؟`,
    options: [r`$O(b^{d})$`, r`$O(b^{d/2})$`, r`$O(b^{d/4})$`, r`$O(d^{b})$`],
    correctIndex: 1,
    explanation: r`با ترتیب‌بندی ایده‌آل، هرس آلفا-بتا تعداد گره‌های بررسی‌شده را به $O(b^{d/2})$ کاهش می‌دهد؛ یعنی می‌توان با همان هزینه دو برابر عمیق‌تر جستجو کرد. در ترتیب تصادفی حدود $O(b^{3d/4})$ است.`,
  }),
  q({
    id: "q-ai-003",
    subjectIds: ["cs-ai"],
    topicIds: ["cs-ai-t8", "cs-stat-t2"],
    sourceId: "src-talifi",
    difficulty: 2,
    tags: ["بیز ساده", "یادگیری"],
    stem: r`در طبقه‌بند بیز ساده (Naive Bayes) فرض اساسی کدام است؟`,
    options: [
      "ویژگی‌ها به شرط کلاس، از هم مستقل‌اند.",
      "ویژگی‌ها توزیع نرمال دارند.",
      "کلاس‌ها هم‌احتمال‌اند.",
      "ویژگی‌ها کاملاً مستقل از کلاس هستند.",
    ],
    correctIndex: 0,
    explanation: r`فرض «ساده‌لوحانه» استقلال شرطی ویژگی‌هاست:
$$P(x_1,\dots,x_n \mid C) = \prod_{i=1}^{n} P(x_i \mid C)$$
که محاسبه‌ی $P(C\mid \mathbf{x}) \propto P(C)\prod_i P(x_i\mid C)$ را ساده می‌کند.`,
  }),

  /* ---------------- ریاضیات گسسته ---------------- */
  q({
    id: "q-disc-001",
    subjectIds: ["cs-discrete"],
    topicIds: ["cs-discrete-t4"],
    sourceId: "src-cs-1403",
    difficulty: 2,
    tags: ["شمارش", "اصل شمول و عدم شمول"],
    stem: r`تعداد جواب‌های صحیح نامنفی معادله‌ی $x_1 + x_2 + x_3 = 15$ با شرط $x_i \le 6$ کدام است؟`,
    options: ["۱۰", "۲۸", "۴۵", "۱۳۶"],
    correctIndex: 0,
    explanation: r`**روش اول (مکمل‌گیری):** چون سقف هر متغیر $6$ و مجموع سقف‌ها $18$ است، قرار می‌دهیم $y_i = 6 - x_i \ge 0$:
$$y_1 + y_2 + y_3 = 18 - 15 = 3 \Rightarrow \binom{3+2}{2} = \binom{5}{2} = 10$$

**روش دوم (شمول و عدم شمول):** بدون محدودیت $\binom{17}{2} = 136$ جواب داریم. برای نقض شرط یک متغیر ($x_i \ge 7$): $\binom{10}{2} = 45$ و برای دو متغیر: $\binom{3}{2} = 3$؛ سه متغیر ممکن نیست.
$$136 - 3(45) + 3(3) = 136 - 135 + 9 = 10$$
> **نکته‌ی آموزشی:** وقتی مجموع به سقف نزدیک است «مکمل‌گیری» بسیار سریع‌تر است؛ وقتی به کف نزدیک است «شمول و عدم شمول».`,
  }),
  q({
    id: "q-disc-002",
    subjectIds: ["cs-discrete"],
    topicIds: ["cs-discrete-t6"],
    sourceId: "src-cs-1402",
    difficulty: 1,
    tags: ["گراف", "درجه"],
    stem: r`یک گراف ساده با $10$ رأس دارد که درجه‌ی هر رأس آن حداقل $3$ است. کمترین تعداد یال این گراف چقدر است؟`,
    options: ["۱۵", "۳۰", "۱۰", "۲۰"],
    correctIndex: 0,
    explanation: r`طبق لم دست‌دادن $\sum \deg(v) = 2|E|$، پس $2|E| \ge 10\times 3 = 30 \Rightarrow |E|\ge 15$. گراف ۳-منتظم با ۱۰ رأس (مثل گراف پترسن) وجود دارد.`,
  }),
  q({
    id: "q-disc-003",
    subjectIds: ["cs-discrete"],
    topicIds: ["cs-discrete-t5"],
    sourceId: "src-talifi",
    difficulty: 2,
    tags: ["رابطه بازگشتی"],
    stem: r`جواب رابطه‌ی بازگشتی $a_n = 5a_{n-1} - 6a_{n-2}$ با $a_0 = 1,\ a_1 = 4$ کدام است؟`,
    options: [r`$a_n = 2\cdot 3^n - 2^n$`, r`$a_n = 3^n + 2^n$`, r`$a_n = 2^{n+1} - 3^n$`, r`$a_n = 3^{n+1} - 2^{n+1}$`],
    correctIndex: 0,
    explanation: r`معادله‌ی مشخصه: $r^2 - 5r + 6 = 0 \Rightarrow r = 2, 3$. پس $a_n = \alpha 2^n + \beta 3^n$.
از شرایط اولیه: $\alpha + \beta = 1$ و $2\alpha + 3\beta = 4 \Rightarrow \beta = 2,\ \alpha = -1$.
$$a_n = 2\cdot 3^n - 2^n$$`,
  }),

  /* ---------------- جبر خطی ---------------- */
  q({
    id: "q-lin-001",
    subjectIds: ["cs-linear"],
    topicIds: ["cs-linear-t5"],
    sourceId: "src-cs-1403",
    difficulty: 2,
    tags: ["مقدار ویژه"],
    stem: r`مقادیر ویژه‌ی ماتریس $A = \begin{pmatrix} 2 & 1 \\ 1 & 2\end{pmatrix}$ کدام‌اند؟`,
    options: [r`$1, 3$`, r`$2, 2$`, r`$0, 4$`, r`$-1, 3$`],
    correctIndex: 0,
    explanation: r`$$\det(A - \lambda I) = (2-\lambda)^2 - 1 = 0 \Rightarrow \lambda = 1, 3$$
کنترل: مجموع = اثر ماتریس $= 4$ ✓ و حاصل‌ضرب = دترمینان $= 3$ ✓.`,
  }),
  q({
    id: "q-lin-002",
    subjectIds: ["cs-linear"],
    topicIds: ["cs-linear-t3", "cs-linear-t1"],
    sourceId: "src-cs-1401",
    difficulty: 2,
    tags: ["رتبه", "فضای پوچ"],
    stem: r`اگر $A$ ماتریسی $5\times 7$ با رتبه‌ی $3$ باشد، بعد فضای پوچ (Null Space) $A$ و بعد فضای پوچ $A^T$ به‌ترتیب کدام‌اند؟`,
    options: ["۴ و ۲", "۲ و ۴", "۳ و ۳", "۴ و ۳"],
    correctIndex: 0,
    explanation: r`طبق قضیه‌ی رتبه-پوچی: $\dim N(A) = n - r = 7 - 3 = 4$ و $\dim N(A^T) = m - r = 5 - 3 = 2$.`,
  }),

  /* ---------------- آمار و احتمال ---------------- */
  q({
    id: "q-stat-001",
    subjectIds: ["cs-stat"],
    topicIds: ["cs-stat-t2"],
    sourceId: "src-cs-1403",
    difficulty: 2,
    tags: ["قضیه بیز"],
    stem: r`یک آزمایش پزشکی بیماری‌ای با شیوع $1\%$ را با حساسیت $99\%$ و ویژگی $95\%$ تشخیص می‌دهد. اگر نتیجه‌ی آزمایش فردی مثبت باشد، احتمال بیمار بودن او تقریباً چقدر است؟`,
    options: [r`$\approx 17\%$`, r`$\approx 99\%$`, r`$\approx 50\%$`, r`$\approx 5\%$`],
    correctIndex: 0,
    explanation: r`$$P(D\mid +) = \frac{P(+\mid D)P(D)}{P(+\mid D)P(D) + P(+\mid \bar D)P(\bar D)} = \frac{0.99\times 0.01}{0.99\times 0.01 + 0.05\times 0.99} = \frac{0.0099}{0.0594} \approx 0.167$$`,
  }),
  q({
    id: "q-stat-002",
    subjectIds: ["cs-stat"],
    topicIds: ["cs-stat-t6", "cs-stat-t5"],
    sourceId: "src-talifi",
    difficulty: 1,
    tags: ["توزیع پواسون"],
    stem: r`اگر $X\sim \text{Poisson}(\lambda)$ و $E[X^2] = 6$ باشد، $\lambda$ کدام است؟`,
    options: ["۲", "۳", r`$\sqrt{6}$`, "۶"],
    correctIndex: 0,
    explanation: r`$$E[X^2] = \text{Var}(X) + (E[X])^2 = \lambda + \lambda^2 = 6 \Rightarrow \lambda^2+\lambda-6 = 0 \Rightarrow \lambda = 2$$`,
  }),
  q({
    id: "q-stat-003",
    subjectIds: ["cs-stat"],
    topicIds: ["cs-stat-t7"],
    sourceId: "src-cs-1402",
    difficulty: 2,
    tags: ["آمار توصیفی", "میانگین"],
    images: [fig("bar", 300)],
    stem: r`نمودار فراوانی نمرات ۱۶ دانشجو در شکل زیر آمده است. میانگین نمرات چقدر است؟
[[img:fig-bar]]`,
    options: [r`$14.875$`, r`$15.25$`, r`$14.5$`, r`$15$`],
    correctIndex: 0,
    explanation: r`فراوانی‌ها از روی نمودار: $12\to 3,\ 14\to 5,\ 16\to 6,\ 18\to 2$ (جمعاً $16$ نفر).
$$\bar{x} = \frac{\sum f_i x_i}{\sum f_i} = \frac{12(3) + 14(5) + 16(6) + 18(2)}{16} = \frac{36+70+96+36}{16} = \frac{238}{16} = 14.875$$
> **نکته:** مُد داده‌ها $16$ و میانه نیز $16$ است (عنصر هشتم و نهم هر دو $16$ هستند).`,
  }),

  /* ---------------- زبان ---------------- */
  q({
    id: "q-eng-001",
    subjectIds: ["cs-gen-english"],
    topicIds: ["cs-gen-english-t1"],
    sourceId: "src-cs-1403",
    difficulty: 2,
    tags: ["vocabulary"],
    stem: r`<span class="ltr">The committee's decision was so ________ that even its supporters were confused about what had actually been agreed upon.</span>`,
    options: ["ambiguous", "lucid", "unanimous", "tentative"],
    correctIndex: 0,
    explanation: r`**ambiguous** به معنی «مبهم/دوپهلو» با «even its supporters were confused» هم‌خوانی دارد. lucid (روشن) متضاد است؛ unanimous (متفق‌القول) و tentative (آزمایشی) با مفهوم جمله سازگار نیستند.`,
  }),
  q({
    id: "q-eng-002",
    subjectIds: ["cs-tech-english"],
    topicIds: ["cs-tech-english-t2"],
    sourceId: "src-cs-1402",
    difficulty: 2,
    tags: ["reading"],
    stem: r`<span class="ltr">"A race condition occurs when the correctness of a computation depends on the relative timing of concurrent threads." According to this sentence, a race condition is primarily a problem of ________.</span>`,
    options: ["nondeterministic timing", "insufficient memory", "network latency", "compiler optimization"],
    correctIndex: 0,
    explanation: r`جمله می‌گوید صحت محاسبه به «زمان‌بندی نسبی» نخ‌های هم‌زمان وابسته است، یعنی مشکل از **زمان‌بندی غیرقطعی** است.`,
  }),
];
