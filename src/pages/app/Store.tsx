import { Check, CreditCard, ShieldCheck, ShoppingCart, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { Subject } from "@/types";
import { Badge, Button, Card, Chip, Modal, PageHeader } from "@/components/ui";
import { cn, formatNumber, formatPrice, toFa } from "@/lib/utils";
import { api, ApiError } from "@/services";
import { useApp } from "@/store/AppContext";

export const finalPrice = (s: Subject) => Math.round(s.price * (1 - s.discountPercent / 100));

export default function Store() {
  const { user, catalog, setUser, toast, refreshUserData } = useApp();
  const [domain, setDomain] = useState<string>("all");
  const [target, setTarget] = useState<Subject | null>(null);
  const [step, setStep] = useState<"confirm" | "paying" | "done">("confirm");
  const [topupOpen, setTopupOpen] = useState(false);

  const subjects = useMemo(() => catalog.subjects.filter((s) => s.isActive && (domain === "all" || s.domainIds.includes(domain as Subject["domainIds"][number]))), [catalog.subjects, domain]);
  const qCount = (sid: string) => catalog.questions.filter((q) => q.subjectIds.includes(sid)).length;

  const buy = async () => {
    if (!target) return;
    setStep("paying");
    try {
      await new Promise((r) => setTimeout(r, 900)); // شبیه‌سازی درگاه پرداخت
      const { user: u } = await api.purchaseSubject(target.id);
      setUser(u);
      await refreshUserData();
      setStep("done");
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "خطا در پرداخت", "error");
      setStep("confirm");
    }
  };

  const close = () => {
    setTarget(null);
    setStep("confirm");
  };

  return (
    <div>
      <PageHeader
        title="فروشگاه درس‌ها"
        description="با خرید هر درس، تمام تست‌های آن (با پاسخ تشریحی و درسنامه) به بانک شخصی شما اضافه می‌شود."
        actions={
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
            <Wallet className="h-4 w-4 text-brand-600" />
            <span className="text-sm">
              اعتبار: <b>{formatNumber(user?.balance ?? 0)}</b> تومان
            </span>
            <Button size="sm" variant="secondary" onClick={() => setTopupOpen(true)}>
              افزایش
            </Button>
          </div>
        }
      />

      <div className="mb-5 flex flex-wrap gap-2">
        <Chip active={domain === "all"} onClick={() => setDomain("all")}>
          همه
        </Chip>
        {catalog.domains.map((d) => (
          <Chip key={d.id} active={domain === d.id} onClick={() => setDomain(d.id)}>
            {d.emoji} {d.shortTitle}
          </Chip>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {subjects.map((s) => {
          const owned = user?.purchasedSubjectIds.includes(s.id) || user?.role === "admin";
          const price = finalPrice(s);
          return (
            <Card key={s.id} className={cn("flex flex-col p-5 transition hover:shadow-md", owned && "border-emerald-200 bg-emerald-50/30")}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-2xl">{s.emoji}</div>
                <div className="flex flex-wrap justify-end gap-1">
                  {s.domainIds.map((d) => (
                    <Badge key={d} tone="slate">
                      {catalog.domainById.get(d)?.shortTitle}
                    </Badge>
                  ))}
                </div>
              </div>
              <h3 className="mt-3 font-bold text-slate-900">{s.title}</h3>
              <p className="mt-1 line-clamp-2 text-xs leading-6 text-slate-500">{s.description}</p>
              <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
                <span>{toFa(qCount(s.id))} تست</span>
                <span>•</span>
                <span>{toFa(catalog.topicsBySubject.get(s.id)?.length ?? 0)} مبحث</span>
                {s.domainIds.length > 1 && (
                  <>
                    <span>•</span>
                    <span className="text-brand-600">مشترک {toFa(s.domainIds.length)} حوزه</span>
                  </>
                )}
              </div>
              <div className="mt-auto flex items-center justify-between pt-4">
                <div>
                  {s.discountPercent > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 line-through">{formatNumber(s.price)}</span>
                      <Badge tone="rose">{toFa(s.discountPercent)}٪ تخفیف</Badge>
                    </div>
                  )}
                  <div className="text-base font-black text-slate-900">{formatPrice(price)}</div>
                </div>
                {owned ? (
                  <Link to={`/app/bank?subject=${s.id}`}>
                    <Button variant="success" size="sm" icon={<Check className="h-3.5 w-3.5" />}>
                      مشاهده تست‌ها
                    </Button>
                  </Link>
                ) : (
                  <Button size="sm" onClick={() => setTarget(s)} icon={<ShoppingCart className="h-3.5 w-3.5" />}>
                    خرید
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* purchase modal */}
      <Modal open={!!target} onClose={close} title={step === "done" ? "خرید موفق" : "تأیید خرید"} size="sm">
        {target && step !== "done" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
              <span className="text-3xl">{target.emoji}</span>
              <div>
                <div className="font-bold text-slate-900">{target.title}</div>
                <div className="text-xs text-slate-500">{toFa(qCount(target.id))} تست با پاسخ تشریحی</div>
              </div>
            </div>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">قیمت</dt>
                <dd>{formatNumber(target.price)} تومان</dd>
              </div>
              {target.discountPercent > 0 && (
                <div className="flex justify-between text-rose-600">
                  <dt>تخفیف ({toFa(target.discountPercent)}٪)</dt>
                  <dd>− {formatNumber(target.price - finalPrice(target))} تومان</dd>
                </div>
              )}
              <div className="flex justify-between border-t border-slate-100 pt-2 font-bold">
                <dt>مبلغ قابل پرداخت</dt>
                <dd>{formatNumber(finalPrice(target))} تومان</dd>
              </div>
              <div className="flex justify-between text-xs text-slate-500">
                <dt>اعتبار فعلی شما</dt>
                <dd className={cn((user?.balance ?? 0) < finalPrice(target) && "text-rose-600")}>{formatNumber(user?.balance ?? 0)} تومان</dd>
              </div>
            </dl>
            {(user?.balance ?? 0) < finalPrice(target) ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-6 text-amber-800">
                اعتبار شما کافی نیست. ابتدا کیف پول را شارژ کنید یا از طریق{" "}
                <Link to="/app/referral" className="font-bold underline">
                  دعوت دوستان
                </Link>{" "}
                اعتبار رایگان بگیرید.
                <Button
                  size="sm"
                  className="mt-2 w-full"
                  onClick={() => {
                    close();
                    setTopupOpen(true);
                  }}
                >
                  شارژ کیف پول
                </Button>
              </div>
            ) : (
              <Button className="w-full" size="lg" loading={step === "paying"} onClick={buy} icon={<CreditCard className="h-4 w-4" />}>
                {step === "paying" ? "در حال اتصال به درگاه..." : "پرداخت از کیف پول"}
              </Button>
            )}
            <p className="flex items-center justify-center gap-1 text-[11px] text-slate-400">
              <ShieldCheck className="h-3.5 w-3.5" /> پرداخت شبیه‌سازی‌شده — در نسخه‌ی نهایی به درگاه بانکی متصل می‌شود.
            </p>
          </div>
        )}
        {target && step === "done" && (
          <div className="py-4 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <Check className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">درس «{target.title}» فعال شد 🎉</h3>
            <p className="mt-1 text-sm text-slate-500">تست‌های این درس هم‌اکنون در بانک تست شما در دسترس است.</p>
            <div className="mt-5 flex gap-2">
              <Button variant="outline" className="flex-1" onClick={close}>
                ادامه‌ی خرید
              </Button>
              <Link to={`/app/bank?subject=${target.id}`} className="flex-1">
                <Button className="w-full">مشاهده تست‌ها</Button>
              </Link>
            </div>
          </div>
        )}
      </Modal>

      <TopupModal open={topupOpen} onClose={() => setTopupOpen(false)} />
    </div>
  );
}

export function TopupModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { setUser, toast } = useApp();
  const [amount, setAmount] = useState(300000);
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    try {
      await new Promise((r) => setTimeout(r, 800));
      const { user } = await api.topUp(amount);
      setUser(user);
      toast(`${formatNumber(amount)} تومان به کیف پول اضافه شد`, "success");
      onClose();
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open={open} onClose={onClose} title="افزایش اعتبار کیف پول" size="sm">
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          {[200000, 300000, 500000, 1000000, 2000000, 5000000].map((a) => (
            <button key={a} onClick={() => setAmount(a)} className={cn("rounded-xl border p-3 text-sm font-medium transition", amount === a ? "border-brand-600 bg-brand-50 text-brand-700" : "border-slate-200 hover:border-brand-300")}>
              {formatNumber(a)}
            </button>
          ))}
        </div>
        <Button className="w-full" size="lg" loading={busy} onClick={go} icon={<CreditCard className="h-4 w-4" />}>
          پرداخت {formatNumber(amount)} تومان
        </Button>
        <p className="text-center text-[11px] text-slate-400">درگاه پرداخت شبیه‌سازی‌شده است.</p>
      </div>
    </Modal>
  );
}
