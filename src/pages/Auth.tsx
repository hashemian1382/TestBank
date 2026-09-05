import { ArrowLeft, Gift, KeyRound, Mail, Phone, Shield, User as UserIcon } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Logo } from "@/components/layout/AppShell";
import { Button, Input } from "@/components/ui";
import { formatNumber } from "@/lib/utils";
import { api, ApiError } from "@/services";
import { useApp } from "@/store/AppContext";

export default function Auth() {
  const [params, setParams] = useSearchParams();
  const mode = params.get("mode") === "register" ? "register" : "login";
  const navigate = useNavigate();
  const { setUser, toast, catalog } = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", password: "", referralCode: params.get("ref") ?? "" });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const session = mode === "login" ? await api.login({ email: form.email, password: form.password }) : await api.register({ ...form, phone: form.phone || undefined, referralCode: form.referralCode || undefined });
      setUser(session.user);
      toast(mode === "login" ? `خوش آمدید ${session.user.fullName} 👋` : "ثبت‌نام با موفقیت انجام شد 🎉", "success");
      const next = params.get("next");
      navigate(next && next.startsWith("/") ? next : session.user.role === "admin" ? "/admin" : "/app");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "خطایی رخ داد");
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (role: "user" | "admin") => {
    setForm((f) => ({ ...f, email: role === "admin" ? "admin@testbank.ir" : "demo@testbank.ir", password: "123456" }));
    setParams((p) => {
      p.set("mode", "login");
      return p;
    });
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* form side */}
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <div className="flex items-center justify-between">
          <Logo />
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand-600">
            بازگشت به خانه <ArrowLeft className="h-4 w-4" />
          </Link>
        </div>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          <div className="mb-6 flex rounded-xl bg-slate-100 p-1">
            {(["login", "register"] as const).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setParams((p) => {
                    p.set("mode", m);
                    return p;
                  });
                  setError(null);
                }}
                className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${mode === m ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
              >
                {m === "login" ? "ورود" : "ثبت‌نام"}
              </button>
            ))}
          </div>
          <h1 className="text-2xl font-black text-slate-900">{mode === "login" ? "خوش برگشتید!" : "حساب کاربری بسازید"}</h1>
          <p className="mt-1 text-sm text-slate-500">{mode === "login" ? "برای ادامه وارد حساب خود شوید." : `با ثبت‌نام ${formatNumber(catalog.settings.signupBonus || 50000)} تومان اعتبار هدیه بگیرید.`}</p>

          <form onSubmit={submit} className="mt-6 space-y-4 animate-fade-up" key={mode}>
            {mode === "register" && <Input label="نام و نام خانوادگی" required value={form.fullName} onChange={set("fullName")} icon={<UserIcon className="h-4 w-4" />} placeholder="مثلاً سارا محمدی" />}
            <Input label="ایمیل" type="email" required ltr value={form.email} onChange={set("email")} icon={<Mail className="h-4 w-4" />} placeholder="you@example.com" />
            {mode === "register" && <Input label="شماره موبایل (اختیاری)" ltr value={form.phone} onChange={set("phone")} icon={<Phone className="h-4 w-4" />} placeholder="09xxxxxxxxx" />}
            <Input label="رمز عبور" type="password" required ltr value={form.password} onChange={set("password")} icon={<KeyRound className="h-4 w-4" />} placeholder="••••••" hint={mode === "register" ? "حداقل ۶ کاراکتر" : undefined} />
            {mode === "register" && (
              <Input label="کد دعوت (اختیاری)" ltr value={form.referralCode} onChange={set("referralCode")} icon={<Gift className="h-4 w-4" />} placeholder="مثلاً SARA2025" hint="اگر دوستی شما را دعوت کرده، کدش را وارد کنید تا او پاداش بگیرد." className="uppercase" />
            )}
            {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
            <Button type="submit" size="lg" className="w-full" loading={loading}>
              {mode === "login" ? "ورود به حساب" : "ایجاد حساب"}
            </Button>
          </form>

          <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
            <div className="mb-2 text-xs font-semibold text-slate-600">حساب‌های نمایشی (رمز: 123456)</div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => fillDemo("user")} icon={<UserIcon className="h-3.5 w-3.5" />}>
                کاربر دمو
              </Button>
              <Button variant="outline" size="sm" className="flex-1" onClick={() => fillDemo("admin")} icon={<Shield className="h-3.5 w-3.5" />}>
                مدیر دمو
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* visual side */}
      <div className="relative hidden overflow-hidden bg-slate-900 lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-brand-600/40 via-slate-900 to-slate-900" />
        <div className="absolute -bottom-20 -left-20 h-96 w-96 rounded-full bg-violet-600/30 blur-3xl animate-blob" />
        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <div />
          <div>
            <blockquote className="text-3xl font-black leading-relaxed">«موفقیت در کنکور حاصل تمرین درست است، نه تمرین زیاد.»</blockquote>
            <div className="mt-10 grid grid-cols-3 gap-4">
              {[
                ["۴", "حوزه امتحانی"],
                ["۲۹", "درس تخصصی"],
                ["∞", "آزمون ترکیبی"],
              ].map(([v, l]) => (
                <div key={l} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
                  <div className="text-2xl font-black">{v}</div>
                  <div className="text-xs text-white/60">{l}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="text-xs text-white/40">تست‌بانک — تمرین هوشمند برای کنکور</div>
        </div>
      </div>
    </div>
  );
}
