/**
 * فیگورهای برداری نمونه برای سوالات.
 * در حالت واقعی، `src` یک URL از سرور رسانه است (مثلاً /media/questions/q-123/fig1.png).
 * اینجا برای دمو، SVG به data-URI تبدیل می‌شود تا بدون بک‌اند هم کار کند.
 */
import type { QuestionImage } from "@/types";

const svgToDataUri = (svg: string) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.replace(/\s+/g, " ").trim())}`;

const wrap = (w: number, h: number, body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" font-family="Vazirmatn, Arial, sans-serif">
    <rect width="${w}" height="${h}" fill="#ffffff"/>
    ${body}
  </svg>`;

const S = { stroke: "#1e293b", sw: 2, accent: "#4f46e5", muted: "#94a3b8", red: "#e11d48" };

/* ---------- گراف ساده (۵ رأس) ---------- */
const graphSvg = wrap(
  320,
  220,
  `
  <g stroke="${S.stroke}" stroke-width="${S.sw}">
    <line x1="60" y1="60" x2="160" y2="40"/><line x1="160" y1="40" x2="260" y2="60"/>
    <line x1="60" y1="60" x2="100" y2="170"/><line x1="160" y1="40" x2="100" y2="170"/>
    <line x1="160" y1="40" x2="220" y2="170"/><line x1="260" y1="60" x2="220" y2="170"/>
    <line x1="100" y1="170" x2="220" y2="170"/>
  </g>
  <g fill="${S.accent}" stroke="#fff" stroke-width="3">
    <circle cx="60" cy="60" r="16"/><circle cx="160" cy="40" r="16"/><circle cx="260" cy="60" r="16"/>
    <circle cx="100" cy="170" r="16"/><circle cx="220" cy="170" r="16"/>
  </g>
  <g fill="#fff" font-size="14" font-weight="bold" text-anchor="middle" dominant-baseline="central">
    <text x="60" y="60">A</text><text x="160" y="40">B</text><text x="260" y="60">C</text>
    <text x="100" y="170">D</text><text x="220" y="170">E</text>
  </g>`
);

/* ---------- مدار منطقی (AND/OR/NOT) ---------- */
const logicSvg = wrap(
  360,
  200,
  `
  <g stroke="${S.stroke}" stroke-width="${S.sw}" fill="none">
    <!-- inputs -->
    <line x1="20" y1="50" x2="90" y2="50"/><line x1="20" y1="80" x2="90" y2="80"/>
    <line x1="20" y1="140" x2="90" y2="140"/>
    <!-- AND gate -->
    <path d="M90 35 h30 a30 30 0 0 1 0 60 h-30 z"/>
    <!-- NOT gate -->
    <path d="M90 125 l40 15 l-40 15 z"/><circle cx="134" cy="140" r="4"/>
    <!-- wires to OR -->
    <line x1="150" y1="65" x2="200" y2="65"/><line x1="200" y1="65" x2="200" y2="95"/><line x1="200" y1="95" x2="222" y2="95"/>
    <line x1="138" y1="140" x2="200" y2="140"/><line x1="200" y1="140" x2="200" y2="115"/><line x1="200" y1="115" x2="222" y2="115"/>
    <!-- OR gate -->
    <path d="M215 80 q15 25 0 50 q40 0 60 -25 q-20 -25 -60 -25 z"/>
    <line x1="275" y1="105" x2="330" y2="105"/>
  </g>
  <g font-size="16" fill="${S.stroke}" font-style="italic">
    <text x="4" y="55">A</text><text x="4" y="85">B</text><text x="4" y="145">C</text><text x="334" y="110">F</text>
  </g>`
);

/* ---------- مدار الکتریکی (مقاومت‌ها) ---------- */
const circuitSvg = wrap(
  340,
  200,
  `
  <g stroke="${S.stroke}" stroke-width="${S.sw}" fill="none">
    <rect x="40" y="40" width="260" height="120"/>
    <!-- battery on left -->
    <rect x="30" y="85" width="20" height="30" fill="#fff" stroke="none"/>
    <line x1="34" y1="90" x2="46" y2="90" stroke-width="4"/><line x1="37" y1="100" x2="43" y2="100"/>
    <line x1="34" y1="108" x2="46" y2="108" stroke-width="4"/><line x1="37" y1="116" x2="43" y2="116"/>
    <!-- R1 top -->
    <rect x="130" y="30" width="60" height="20" fill="#fff"/>
    <!-- R2, R3 parallel on right -->
    <line x1="300" y1="70" x2="260" y2="70"/><line x1="300" y1="130" x2="260" y2="130"/>
    <rect x="250" y="70" width="20" height="60" fill="#fff" stroke="none"/>
    <rect x="290" y="80" width="20" height="40" fill="#fff"/>
    <rect x="250" y="80" width="20" height="40" fill="#fff"/>
    <line x1="260" y1="70" x2="260" y2="80"/><line x1="260" y1="120" x2="260" y2="130"/>
  </g>
  <g font-size="14" fill="${S.stroke}">
    <text x="145" y="25">R₁=4Ω</text><text x="222" y="104">R₂=6Ω</text><text x="312" y="104" font-size="12">R₃=3Ω</text>
    <text x="4" y="80">12V</text>
  </g>`
);

/* ---------- نمودار تابع درجه دو ---------- */
const parabolaSvg = wrap(
  320,
  240,
  `
  <g stroke="${S.muted}" stroke-width="1">
    <line x1="20" y1="180" x2="300" y2="180"/><line x1="160" y1="20" x2="160" y2="230"/>
  </g>
  <g fill="${S.stroke}" font-size="12">
    <text x="292" y="196">x</text><text x="166" y="30">y</text>
    <text x="100" y="196">-1</text><text x="248" y="196">3</text><text x="166" y="140" >-3</text>
  </g>
  <path d="M 60 40 Q 160 320 260 40" fill="none" stroke="${S.accent}" stroke-width="3"/>
  <g fill="${S.red}">
    <circle cx="110" cy="180" r="4"/><circle cx="210" cy="180" r="4"/><circle cx="160" cy="135" r="4"/>
  </g>`
);

/* ---------- مثلث با ارتفاع ---------- */
const triangleSvg = wrap(
  320,
  220,
  `
  <polygon points="40,180 280,180 200,40" fill="#eef2ff" stroke="${S.stroke}" stroke-width="2"/>
  <line x1="200" y1="40" x2="200" y2="180" stroke="${S.accent}" stroke-width="2" stroke-dasharray="6 4"/>
  <rect x="188" y="168" width="12" height="12" fill="none" stroke="${S.stroke}" stroke-width="1.5"/>
  <g font-size="16" fill="${S.stroke}" font-style="italic">
    <text x="24" y="200">A</text><text x="284" y="200">B</text><text x="196" y="30">C</text><text x="196" y="200">H</text>
  </g>
  <g font-size="13" fill="${S.muted}">
    <text x="105" y="120">13</text><text x="245" y="120">15</text><text x="150" y="205">14</text>
  </g>`
);

/* ---------- نمودار v-t ---------- */
const vtSvg = wrap(
  340,
  220,
  `
  <g stroke="${S.muted}" stroke-width="1">
    <line x1="40" y1="180" x2="320" y2="180"/><line x1="40" y1="20" x2="40" y2="180"/>
    <line x1="40" y1="60" x2="320" y2="60" stroke-dasharray="4 4"/>
  </g>
  <polyline points="40,180 120,60 200,60 300,180" fill="none" stroke="${S.accent}" stroke-width="3"/>
  <g font-size="12" fill="${S.stroke}">
    <text x="20" y="64">20</text><text x="10" y="30">v(m/s)</text><text x="300" y="200">t(s)</text>
    <text x="116" y="196">4</text><text x="196" y="196">8</text><text x="296" y="196">13</text>
  </g>`
);

/* ---------- درخت دودویی ---------- */
const treeSvg = wrap(
  320,
  220,
  `
  <g stroke="${S.stroke}" stroke-width="2">
    <line x1="160" y1="40" x2="90" y2="100"/><line x1="160" y1="40" x2="230" y2="100"/>
    <line x1="90" y1="100" x2="50" y2="170"/><line x1="90" y1="100" x2="130" y2="170"/>
    <line x1="230" y1="100" x2="270" y2="170"/>
  </g>
  <g fill="#fff" stroke="${S.accent}" stroke-width="3">
    <circle cx="160" cy="40" r="18"/><circle cx="90" cy="100" r="18"/><circle cx="230" cy="100" r="18"/>
    <circle cx="50" cy="170" r="18"/><circle cx="130" cy="170" r="18"/><circle cx="270" cy="170" r="18"/>
  </g>
  <g fill="${S.stroke}" font-size="15" font-weight="bold" text-anchor="middle" dominant-baseline="central">
    <text x="160" y="40">50</text><text x="90" y="100">30</text><text x="230" y="100">70</text>
    <text x="50" y="170">20</text><text x="130" y="170">40</text><text x="270" y="170">80</text>
  </g>`
);

/* ---------- DFA ---------- */
const dfaSvg = wrap(
  360,
  180,
  `
  <defs><marker id="ar" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto"><path d="M0,0 L0,6 L9,3 z" fill="${S.stroke}"/></marker></defs>
  <g stroke="${S.stroke}" stroke-width="2" fill="none" marker-end="url(#ar)">
    <line x1="20" y1="90" x2="52" y2="90"/>
    <line x1="98" y1="90" x2="162" y2="90"/>
    <line x1="208" y1="90" x2="272" y2="90"/>
    <path d="M 70 68 a 18 18 0 1 1 8 -2"/>
    <path d="M 290 68 a 18 18 0 1 1 8 -2"/>
    <path d="M 240 106 q -50 50 -100 0"/>
  </g>
  <g fill="#fff" stroke="${S.accent}" stroke-width="3">
    <circle cx="75" cy="90" r="22"/><circle cx="185" cy="90" r="22"/><circle cx="295" cy="90" r="22"/>
    <circle cx="295" cy="90" r="16"/>
  </g>
  <g fill="${S.stroke}" font-size="14" text-anchor="middle" dominant-baseline="central">
    <text x="75" y="90">q₀</text><text x="185" y="90">q₁</text><text x="295" y="90">q₂</text>
    <text x="130" y="78">1</text><text x="240" y="78">1</text><text x="75" y="42">0</text><text x="295" y="42">0,1</text><text x="190" y="140">0</text>
  </g>`
);

/* ---------- سلول گیاهی/جانوری ساده ---------- */
const cellSvg = wrap(
  320,
  220,
  `
  <ellipse cx="160" cy="110" rx="140" ry="90" fill="#fef3c7" stroke="${S.stroke}" stroke-width="2"/>
  <ellipse cx="150" cy="105" rx="45" ry="35" fill="#c7d2fe" stroke="${S.stroke}" stroke-width="2"/>
  <circle cx="150" cy="105" r="10" fill="${S.accent}"/>
  <ellipse cx="240" cy="80" rx="22" ry="12" fill="#fecaca" stroke="${S.stroke}" stroke-width="1.5" transform="rotate(-30 240 80)"/>
  <ellipse cx="80" cy="150" rx="22" ry="12" fill="#fecaca" stroke="${S.stroke}" stroke-width="1.5" transform="rotate(20 80 150)"/>
  <path d="M 200 140 q 20 10 10 30 q -10 20 15 25" fill="none" stroke="${S.stroke}" stroke-width="1.5"/>
  <g font-size="12" fill="${S.stroke}" text-anchor="middle">
    <text x="150" y="160">۱</text><text x="240" y="60">۲</text><text x="80" y="180">۳</text><text x="235" y="205">۴</text>
  </g>`
);

/* ---------- نمودار میله‌ای آمار ---------- */
const barSvg = wrap(
  320,
  200,
  `
  <g stroke="${S.muted}"><line x1="40" y1="170" x2="300" y2="170"/><line x1="40" y1="20" x2="40" y2="170"/></g>
  <g fill="${S.accent}">
    <rect x="60" y="110" width="36" height="60"/><rect x="120" y="70" width="36" height="100"/>
    <rect x="180" y="50" width="36" height="120"/><rect x="240" y="130" width="36" height="40"/>
  </g>
  <g font-size="12" fill="${S.stroke}" text-anchor="middle">
    <text x="78" y="186">۱۲</text><text x="138" y="186">۱۴</text><text x="198" y="186">۱۶</text><text x="258" y="186">۱۸</text>
    <text x="78" y="104">۳</text><text x="138" y="64">۵</text><text x="198" y="44">۶</text><text x="258" y="124">۲</text>
    <text x="20" y="30">فراوانی</text><text x="290" y="200">نمره</text>
  </g>`
);

/* ---------- pipeline diagram ---------- */
const pipelineSvg = wrap(
  360,
  170,
  `
  <g font-size="12" fill="${S.stroke}" text-anchor="middle" dominant-baseline="central">
    ${["IF", "ID", "EX", "MEM", "WB"]
      .map((s, i) => `<rect x="${20 + i * 66}" y="20" width="56" height="30" rx="6" fill="#e0e7ff" stroke="${S.accent}"/><text x="${48 + i * 66}" y="35">${s}</text>`)
      .join("")}
    ${[0, 1, 2]
      .map(
        (r) =>
          `<text x="10" y="${80 + r * 28}" font-size="11">I${r + 1}</text>` +
          [0, 1, 2, 3, 4]
            .map(
              (c) =>
                `<rect x="${20 + (c + r) * 40}" y="${68 + r * 28}" width="36" height="22" rx="4" fill="${c === 2 && r === 1 ? "#fecaca" : "#f1f5f9"}" stroke="${S.muted}"/>`
            )
            .join("")
      )
      .join("")}
  </g>
  <text x="180" y="160" font-size="11" fill="${S.muted}" text-anchor="middle">clock cycles →</text>`
);

/* ---------- زمین‌شناسی: لایه‌های رسوبی و گسل ---------- */
const faultSvg = wrap(
  340,
  200,
  `
  <g stroke="${S.stroke}" stroke-width="1.5">
    <polygon points="20,60 170,60 150,180 20,180" fill="#fde68a"/>
    <polygon points="20,100 165,100 150,180 20,180" fill="#a7f3d0"/>
    <polygon points="20,140 158,140 150,180 20,180" fill="#bfdbfe"/>
    <polygon points="170,90 320,90 320,180 150,180" fill="#fde68a"/>
    <polygon points="165,130 320,130 320,180 150,180" fill="#a7f3d0"/>
    <polygon points="158,165 320,165 320,180 150,180" fill="#bfdbfe"/>
    <line x1="175" y1="40" x2="150" y2="180" stroke="${S.red}" stroke-width="3"/>
  </g>
  <g font-size="12" fill="${S.stroke}">
    <text x="60" y="45">بلوک A</text><text x="230" y="75">بلوک B</text>
  </g>`
);

export const FIGURES = {
  graph: { id: "fig-graph", src: svgToDataUri(graphSvg), alt: "گراف ساده با ۵ رأس", caption: "شکل ۱: گراف G" },
  logic: { id: "fig-logic", src: svgToDataUri(logicSvg), alt: "مدار منطقی با گیت‌های AND، NOT و OR", caption: "شکل: مدار ترکیبی" },
  circuit: { id: "fig-circuit", src: svgToDataUri(circuitSvg), alt: "مدار الکتریکی با سه مقاومت", caption: "شکل: مدار مقاومتی" },
  parabola: { id: "fig-parabola", src: svgToDataUri(parabolaSvg), alt: "نمودار سهمی", caption: "نمودار تابع f" },
  triangle: { id: "fig-triangle", src: svgToDataUri(triangleSvg), alt: "مثلث ABC با ارتفاع CH", caption: "شکل: مثلث ABC" },
  vt: { id: "fig-vt", src: svgToDataUri(vtSvg), alt: "نمودار سرعت-زمان", caption: "نمودار سرعت-زمان متحرک" },
  tree: { id: "fig-tree", src: svgToDataUri(treeSvg), alt: "درخت جستجوی دودویی", caption: "شکل: درخت دودویی" },
  dfa: { id: "fig-dfa", src: svgToDataUri(dfaSvg), alt: "ماشین حالت متناهی قطعی", caption: "شکل: DFA با سه حالت" },
  cell: { id: "fig-cell", src: svgToDataUri(cellSvg), alt: "شکل سلول با اندامک‌های شماره‌گذاری‌شده", caption: "شکل: سلول جانوری" },
  bar: { id: "fig-bar", src: svgToDataUri(barSvg), alt: "نمودار میله‌ای فراوانی نمرات", caption: "نمودار فراوانی" },
  pipeline: { id: "fig-pipeline", src: svgToDataUri(pipelineSvg), alt: "نمودار خط لوله پنج مرحله‌ای", caption: "شکل: اجرای دستورات در پایپلاین" },
  fault: { id: "fig-fault", src: svgToDataUri(faultSvg), alt: "برش زمین‌شناسی با گسل", caption: "شکل: مقطع زمین‌شناسی" },
} satisfies Record<string, QuestionImage>;

export type FigureKey = keyof typeof FIGURES;
export const fig = (k: FigureKey, width = 340): QuestionImage => ({ ...FIGURES[k], width });
