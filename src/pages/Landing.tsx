import { ArrowLeft, BookOpen, Check, FolderHeart, Gift, ImageIcon, LayoutDashboard, Shuffle, Sigma, Sparkles, Timer, TrendingUp, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { Logo } from "@/components/layout/AppShell";
import { RichText } from "@/components/RichText";
import { Button } from "@/components/ui";
import { formatNumber, toFa } from "@/lib/utils";
import { useApp } from "@/store/AppContext";

const FEATURES = [
  { icon: <Sigma />, title: "پشتیبانی کامل LaTeX", desc: "فرمول‌ها، ماتریس‌ها، جدول‌ها و تصاویر؛ همه دقیق و خوانا نمایش داده می‌شوند." },
  { icon: <BookOpen />, title: "پاسخ تشریحی + درسنامه", desc: "هر تست با پاسخ کامل و درسنامه‌ی مبحث مرتبط همراه است." },
  { icon: <Shuffle />, title: "آزمون‌ساز ترکیبی", desc: "تعداد مشخصی سوال از هر درس یا مبحث؛ با زمان‌بندی و نمره‌ی منفی کنکوری." },
  { icon: <FolderHeart />, title: "مجموعه و نشان‌گذاری", desc: "سوالات را نشان‌دار کنید یا در مجموعه‌های شخصی دسته‌بندی کنید." },
  { icon: <TrendingUp />, title: "تحلیل عملکرد", desc: "درصد هر درس و مبحث، نقاط قوت و ضعف و پیشرفت در طول زمان." },
  { icon: <Gift />, title: "کد دعوت", desc: "با دعوت هر دوست، ۲۰۰ هزار تومان اعتبار هدیه بگیرید." },
];

export default function Landing() {
  const { user, catalog } = useApp();
  const stats = [
    { label: "سوال با پاسخ تشریحی", value: formatNumber(catalog.questions.length) },
    { label: "درس تخصصی", value: toFa(catalog.subjects.length) },
    { label: "مبحث", value: toFa(catalog.topics.length) },
    { label: "حوزه‌ی امتحانی", value: toFa(catalog.domains.length) },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* NAV */}
      <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <Logo />
          <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
            <a href="#features" className="hover:text-brand-600">
              امکانات
            </a>
            <a href="#domains" className="hover:text-brand-600">
              حوزه‌ها
            </a>
            <a href="#demo" className="hover:text-brand-600">
              نمونه تست
            </a>
            <a href="#referral" className="hover:text-brand-600">
              کد دعوت
            </a>
          </nav>
          <div className="flex items-center gap-2">
            {user ? (
              <Link to={user.role === "admin" ? "/admin" : "/app"}>
                <Button icon={<LayoutDashboard className="h-4 w-4" />}>داشبورد</Button>
              </Link>
            ) : (
              <>
                <Link to="/auth?mode=login">
                  <Button variant="ghost">ورود</Button>
                </Link>
                <Link to="/auth?mode=register">
                  <Button>شروع رایگان</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-24 right-1/4 h-96 w-96 rounded-full bg-brand-200/50 blur-3xl animate-blob" />
          <div className="absolute top-40 left-10 h-72 w-72 rounded-full bg-violet-200/50 blur-3xl animate-blob" style={{ animationDelay: "4s" }} />
          <div className="absolute bottom-0 right-10 h-72 w-72 rounded-full bg-sky-200/40 blur-3xl animate-blob" style={{ animationDelay: "8s" }} />
        </div>
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
              <Sparkles className="h-3.5 w-3.5" /> بانک تست هوشمند نسل جدید
            </span>
            <h1 className="mt-5 text-4xl font-black leading-[1.3] text-slate-900 sm:text-5xl lg:text-[3.4rem]">
              تمرین هدفمند برای
              <span className="bg-gradient-to-l from-brand-600 to-violet-600 bg-clip-text text-transparent"> کنکوری که می‌خواهی</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-9 text-slate-600">
              هزاران تست طبقه‌بندی‌شده برای کنکور ارشد کامپیوتر، ریاضی، تجربی و انسانی؛ با پاسخ تشریحی، درسنامه، آزمون‌ساز ترکیبی و تحلیل دقیق عملکرد.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to={user ? "/app" : "/auth?mode=register"}>
                <Button size="lg" icon={<ArrowLeft className="h-5 w-5" />}>
                  {user ? "ورود به داشبورد" : "ثبت‌نام و دریافت ۵۰ هزار تومان هدیه"}
                </Button>
              </Link>
              <a href="#demo">
                <Button size="lg" variant="outline">
                  مشاهده‌ی نمونه تست
                </Button>
              </a>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500">
              {["بدون نیاز به کارت بانکی", "پرداخت درس‌به‌درس", "دسترسی دائمی"].map((t) => (
                <span key={t} className="inline-flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-emerald-500" /> {t}
                </span>
              ))}
            </div>
          </div>

          <div className="relative animate-fade-up" style={{ animationDelay: "0.15s" }}>
            <div className="glass relative rounded-3xl border border-white/60 p-5 shadow-2xl shadow-brand-100 animate-float">
              <div className="mb-3 flex items-center justify-between">
                <span className="rounded-lg bg-brand-50 px-2 py-1 text-xs font-medium text-brand-700">🌳 ساختمان داده‌ها و طراحی الگوریتم‌ها</span>
                <span className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2 py-1 text-xs text-white">
                  <Timer className="h-3 w-3" /> ۰۱:۳۰
                </span>
              </div>
              <RichText text={String.raw`مرتبه‌ی اجرایی رابطه‌ی بازگشتی $T(n) = 2T\left(\frac{n}{2}\right) + n\log n$ کدام است؟`} className="text-[15px] font-medium text-slate-800" />
              <div className="mt-3 grid grid-cols-2 gap-2">
                {[String.raw`$\Theta(n\log n)$`, String.raw`$\Theta(n\log^2 n)$`, String.raw`$\Theta(n^2)$`, String.raw`$\Theta(n)$`].map((o, i) => (
                  <div key={i} className={`flex items-center gap-2 rounded-xl border p-2.5 text-sm ${i === 1 ? "border-emerald-500 bg-emerald-50" : "border-slate-200 bg-white"}`}>
                    <span className={`flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold ${i === 1 ? "bg-emerald-600 text-white" : "bg-slate-100"}`}>{toFa(i + 1)}</span>
                    <RichText text={o} inline />
                  </div>
                ))}
              </div>
              <div className="mt-3 rounded-xl bg-emerald-50 p-3 text-xs leading-6 text-emerald-900">
                <b>پاسخ تشریحی:</b> <RichText text={String.raw`حالت دوم قضیه‌ی اصلی با $k=1$ نتیجه می‌دهد $T(n)=\Theta(n\log^{2}n)$`} inline />
              </div>
            </div>
            <div className="absolute -bottom-6 -right-4 hidden rounded-2xl border border-slate-100 bg-white p-3 shadow-xl sm:block">
              <div className="text-[11px] text-slate-500">درصد آخرین آزمون</div>
              <div className="text-2xl font-black text-emerald-600">۷۳٫۳٪</div>
            </div>
            <div className="absolute -top-6 -left-4 hidden rounded-2xl border border-slate-100 bg-white p-3 shadow-xl sm:block">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
                <ImageIcon className="h-4 w-4 text-sky-500" /> پشتیبانی از تصویر و شکل
              </div>
            </div>
          </div>
        </div>

        {/* stats */}
        <div className="border-y border-slate-100 bg-slate-50/70">
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-8 sm:px-6 md:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-3xl font-black text-slate-900">{s.value}</div>
                <div className="mt-1 text-sm text-slate-500">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DOMAINS */}
      <section id="domains" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-black text-slate-900">چهار حوزه، یک پلتفرم</h2>
          <p className="mt-2 text-slate-500">درس‌ها و مباحث دقیقاً مطابق سرفصل‌های رسمی هر آزمون</p>
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {catalog.domains.map((d) => {
            const subs = catalog.subjects.filter((s) => s.domainIds.includes(d.id));
            const grad = { indigo: "from-indigo-500 to-violet-600", sky: "from-sky-500 to-cyan-600", emerald: "from-emerald-500 to-teal-600", amber: "from-amber-400 to-orange-500" }[d.color] ?? "from-slate-500 to-slate-700";
            return (
              <div key={d.id} className="group rounded-3xl border border-slate-200 bg-white p-6 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/60">
                <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br text-2xl text-white shadow-lg ${grad}`}>{d.emoji}</div>
                <h3 className="text-lg font-bold text-slate-900">{d.shortTitle}</h3>
                <p className="mt-1 text-sm text-slate-500">{d.description}</p>
                <ul className="mt-4 space-y-1.5">
                  {subs.slice(0, 5).map((s) => (
                    <li key={s.id} className="flex items-center gap-2 text-sm text-slate-600">
                      <span className="text-base">{s.emoji}</span> {s.title}
                    </li>
                  ))}
                  {subs.length > 5 && <li className="text-xs text-brand-600">و {toFa(subs.length - 5)} درس دیگر...</li>}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="bg-slate-900 py-20 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-black">هر آنچه برای تمرین حرفه‌ای نیاز دارید</h2>
            <p className="mt-2 text-slate-400">طراحی‌شده برای داوطلبانی که وقتشان ارزشمند است</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:bg-white/10">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/20 text-brand-300 [&>svg]:h-5 [&>svg]:w-5">{f.icon}</div>
                <h3 className="font-bold">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-7 text-slate-400">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DEMO */}
      <section id="demo" className="mx-auto max-w-5xl px-4 py-20 sm:px-6">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-black text-slate-900">نمایش دقیق فرمول، جدول و تصویر</h2>
          <p className="mt-2 text-slate-500">نمونه‌ای از یک پاسخ تشریحی در تست‌بانک</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg sm:p-8">
          <RichText
            text={String.raw`**سوال:** اگر $X\sim \text{Poisson}(\lambda)$ و $E[X^2] = 6$ باشد، $\lambda$ کدام است؟

**پاسخ:** می‌دانیم برای توزیع پواسون $E[X] = \text{Var}(X) = \lambda$، بنابراین:
$$E[X^2] = \text{Var}(X) + \left(E[X]\right)^2 = \lambda + \lambda^2 = 6 \;\Rightarrow\; \lambda^2 + \lambda - 6 = 0 \;\Rightarrow\; (\lambda+3)(\lambda-2) = 0$$
چون $\lambda > 0$، پاسخ $\lambda = 2$ است.

| توزیع | $E[X]$ | $\text{Var}(X)$ |
|---|---|---|
| برنولی $(p)$ | $p$ | $p(1-p)$ |
| دوجمله‌ای $(n,p)$ | $np$ | $np(1-p)$ |
| پواسون $(\lambda)$ | $\lambda$ | $\lambda$ |
| هندسی $(p)$ | $\frac{1}{p}$ | $\frac{1-p}{p^2}$ |

> **نکته:** واریانس و میانگین پواسون برابرند؛ این خاصیت در تست‌های ارشد بارها استفاده شده است.`}
          />
        </div>
      </section>

      {/* REFERRAL */}
      <section id="referral" className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-brand-600 via-violet-600 to-fuchsia-600 p-8 text-white sm:p-12">
          <div className="absolute -left-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
          <div className="relative grid items-center gap-8 md:grid-cols-2">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
                <Users className="h-3.5 w-3.5" /> برنامه‌ی دعوت از دوستان
              </span>
              <h2 className="mt-4 text-3xl font-black leading-tight">به ازای هر دوست، {formatNumber(catalog.settings.referralBonus || 200000)} تومان اعتبار</h2>
              <p className="mt-3 leading-8 text-white/80">کد دعوت اختصاصی‌تان را به اشتراک بگذارید. هر بار که کسی با کد شما ثبت‌نام کند، اعتبار به کیف پول شما اضافه می‌شود و می‌توانید با آن درس بخرید.</p>
              <Link to={user ? "/app/referral" : "/auth?mode=register"} className="mt-6 inline-block">
                <Button size="lg" className="bg-white text-brand-700 hover:bg-slate-100">
                  {user ? "مشاهده‌ی کد دعوت من" : "همین حالا شروع کنید"}
                </Button>
              </Link>
            </div>
            <div className="rounded-2xl bg-white/10 p-6 backdrop-blur">
              <div className="text-sm text-white/70">کد دعوت نمونه</div>
              <div className="mt-2 rounded-xl bg-slate-900/40 p-4 text-center font-mono text-2xl font-bold tracking-[0.3em]">SARA2025</div>
              <div className="mt-4 space-y-2 text-sm">
                {["دوستتان ثبت‌نام می‌کند و ۵۰ هزار تومان هدیه می‌گیرد", "شما ۲۰۰ هزار تومان اعتبار می‌گیرید", "بدون سقف تعداد دعوت"].map((t) => (
                  <div key={t} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-300" /> {t}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-100 py-8 text-center text-sm text-slate-500">
        <Logo className="mb-3 justify-center" />
        © {toFa(1404)} تست‌بانک — تمامی حقوق محفوظ است.
      </footer>
    </div>
  );
}
