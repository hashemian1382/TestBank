import { ArrowDownLeft, ArrowUpRight, Check, Copy, Gift, Share2, Users, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import type { Referral as ReferralT, Transaction } from "@/types";
import { Button, Card, EmptyState, PageHeader, StatCard } from "@/components/ui";
import { cn, copyToClipboard, formatDateTime, formatNumber, toFa } from "@/lib/utils";
import { api } from "@/services";
import { useApp } from "@/store/AppContext";
import { TopupModal } from "./Store";

export default function Referral() {
  const { user, catalog, toast } = useApp();
  const [referrals, setReferrals] = useState<ReferralT[]>([]);
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  useEffect(() => {
    api.getReferrals().then(setReferrals);
  }, [user]);
  if (!user) return null;
  const link = `${window.location.origin}${window.location.pathname}#/auth?mode=register&ref=${user.referralCode}`;
  const total = referrals.reduce((s, r) => s + r.bonus, 0);

  const copy = async (what: "code" | "link") => {
    const ok = await copyToClipboard(what === "code" ? user.referralCode : link);
    if (ok) {
      setCopied(what);
      toast("کپی شد", "success");
      setTimeout(() => setCopied(null), 2000);
    }
  };
  const share = async () => {
    const text = `با کد دعوت ${user.referralCode} در تست‌بانک ثبت‌نام کن و ${formatNumber(catalog.settings.signupBonus)} تومان اعتبار هدیه بگیر!\n${link}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "دعوت به تست‌بانک", text });
      } catch {
        /* cancelled */
      }
    } else copy("link");
  };

  return (
    <div>
      <PageHeader title="دعوت از دوستان" description={`به ازای هر دوستی که با کد شما ثبت‌نام کند، ${formatNumber(catalog.settings.referralBonus)} تومان اعتبار می‌گیرید.`} />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="دعوت‌های موفق" value={toFa(referrals.length)} icon={<Users className="h-5 w-5" />} tone="violet" />
        <StatCard label="اعتبار کسب‌شده" value={`${formatNumber(total)}`} icon={<Gift className="h-5 w-5" />} tone="emerald" hint="تومان" />
        <StatCard label="اعتبار فعلی" value={`${formatNumber(user.balance)}`} icon={<Wallet className="h-5 w-5" />} hint="تومان" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl bg-gradient-to-br from-brand-600 via-violet-600 to-fuchsia-600 p-6 text-white">
          <div className="text-sm text-white/80">کد دعوت اختصاصی شما</div>
          <div className="mt-3 flex items-center gap-2">
            <div className="flex-1 rounded-xl bg-slate-900/40 px-4 py-3 text-center font-mono text-2xl font-black tracking-[0.3em]">{user.referralCode}</div>
            <button onClick={() => copy("code")} className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 transition hover:bg-white/25">
              {copied === "code" ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
            </button>
          </div>
          <div className="mt-4 text-xs text-white/70">لینک دعوت</div>
          <div className="mt-1 flex items-center gap-2">
            <div className="ltr-input flex-1 truncate rounded-lg bg-white/10 px-3 py-2 text-xs">{link}</div>
            <Button size="sm" className="bg-white text-brand-700 hover:bg-slate-100" onClick={() => copy("link")} icon={copied === "link" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}>
              کپی
            </Button>
          </div>
          <Button className="mt-4 w-full bg-white/15 hover:bg-white/25" onClick={share} icon={<Share2 className="h-4 w-4" />}>
            اشتراک‌گذاری
          </Button>
        </div>

        <Card className="p-5">
          <h3 className="mb-3 font-bold text-slate-900">چطور کار می‌کند؟</h3>
          <ol className="space-y-3 text-sm text-slate-600">
            {[
              "کد یا لینک دعوت را برای دوستتان بفرستید.",
              `دوستتان هنگام ثبت‌نام کد را وارد می‌کند و ${formatNumber(catalog.settings.signupBonus)} تومان هدیه می‌گیرد.`,
              `بلافاصله ${formatNumber(catalog.settings.referralBonus)} تومان به کیف پول شما اضافه می‌شود.`,
              "با اعتبارتان از فروشگاه درس بخرید. بدون سقف دعوت!",
            ].map((t, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">{toFa(i + 1)}</span>
                <span className="leading-6">{t}</span>
              </li>
            ))}
          </ol>
        </Card>
      </div>

      <Card className="mt-6 p-5">
        <h3 className="mb-3 font-bold text-slate-900">دعوت‌شده‌ها</h3>
        {referrals.length === 0 ? (
          <EmptyState icon={<Users className="h-6 w-6" />} title="هنوز کسی را دعوت نکرده‌اید" description="اولین دعوت‌تان را همین حالا بفرستید." />
        ) : (
          <div className="divide-y divide-slate-100">
            {referrals.map((r) => (
              <div key={r.id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <div className="font-medium text-slate-800">{r.referredName}</div>
                  <div className="text-xs text-slate-500">{formatDateTime(r.createdAt)}</div>
                </div>
                <span className="font-bold text-emerald-600">+{formatNumber(r.bonus)} تومان</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

export function WalletPage() {
  const { user } = useApp();
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [topup, setTopup] = useState(false);
  useEffect(() => {
    api.getTransactions().then(setTxs);
  }, [user]);
  const labels: Record<Transaction["type"], string> = { purchase: "خرید", "referral-bonus": "پاداش دعوت", topup: "افزایش اعتبار", "signup-bonus": "هدیه ثبت‌نام" };
  return (
    <div>
      <PageHeader
        title="کیف پول"
        description="اعتبار و تراکنش‌های شما"
        actions={
          <Button onClick={() => setTopup(true)} icon={<Wallet className="h-4 w-4" />}>
            افزایش اعتبار
          </Button>
        }
      />
      <div className="rounded-3xl bg-slate-900 p-6 text-white">
        <div className="text-sm text-white/60">اعتبار فعلی</div>
        <div className="mt-1 text-4xl font-black">
          {formatNumber(user?.balance ?? 0)} <span className="text-base font-normal text-white/60">تومان</span>
        </div>
      </div>
      <Card className="mt-6 divide-y divide-slate-100">
        {txs.length === 0 && <div className="p-8 text-center text-sm text-slate-500">تراکنشی ثبت نشده است.</div>}
        {txs.map((t) => (
          <div key={t.id} className="flex items-center gap-3 p-4">
            <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", t.amount > 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600")}>{t.amount > 0 ? <ArrowDownLeft className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}</div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-slate-800">{t.description}</div>
              <div className="text-xs text-slate-500">
                {labels[t.type]} • {formatDateTime(t.createdAt)}
              </div>
            </div>
            <div className={cn("font-bold", t.amount > 0 ? "text-emerald-600" : "text-rose-600")}>
              {t.amount > 0 ? "+" : "−"}
              {formatNumber(Math.abs(t.amount))}
            </div>
          </div>
        ))}
      </Card>
      <TopupModal open={topup} onClose={() => setTopup(false)} />
    </div>
  );
}
