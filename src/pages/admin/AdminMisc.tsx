import { BookOpen, Database, Gift, Library, Pencil, Plus, RefreshCw, Save, Shield, Trash2, Users, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { Source, SourceKind, User } from "@/types";
import { Avatar, Badge, Button, Card, ConfirmDialog, Input, Modal, PageHeader, Select, StatCard } from "@/components/ui";
import { formatDate, formatNumber, toFa } from "@/lib/utils";
import { api } from "@/services";
import { useApp } from "@/store/AppContext";

/* ============================ Overview ============================ */
export function AdminOverview() {
  const { catalog, refreshCatalog, toast, logout } = useApp();
  const [users, setUsers] = useState<User[]>([]);
  const [settings, setSettings] = useState(catalog.settings);
  const [reset, setReset] = useState(false);
  useEffect(() => {
    api.admin.getUsers().then(setUsers);
  }, []);
  useEffect(() => setSettings(catalog.settings), [catalog.settings]);

  const withImages = catalog.questions.filter((q) => q.images.length).length;
  const revenue = users.reduce((s, u) => s + u.purchasedSubjectIds.reduce((x, sid) => x + (catalog.subjectById.get(sid)?.price ?? 0), 0), 0);

  return (
    <div>
      <PageHeader title="پنل مدیریت" description="نمای کلی سامانه" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="کاربران" value={toFa(users.length)} icon={<Users className="h-5 w-5" />} tone="violet" />
        <StatCard label="سوالات" value={toFa(catalog.questions.length)} icon={<Library className="h-5 w-5" />} hint={`${toFa(withImages)} سوال تصویردار`} />
        <StatCard label="درس / مبحث" value={`${toFa(catalog.subjects.length)} / ${toFa(catalog.topics.length)}`} icon={<BookOpen className="h-5 w-5" />} tone="sky" />
        <StatCard label="فروش تجمعی" value={formatNumber(revenue)} icon={<Wallet className="h-5 w-5" />} tone="emerald" hint="تومان (قیمت پایه)" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="mb-3 font-bold text-slate-900">سوالات به تفکیک حوزه</h3>
          <div className="space-y-2">
            {catalog.domains.map((d) => {
              const sids = new Set(catalog.subjects.filter((s) => s.domainIds.includes(d.id)).map((s) => s.id));
              const n = catalog.questions.filter((q) => q.subjectIds.some((s) => sids.has(s))).length;
              return (
                <div key={d.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                  <span>
                    {d.emoji} {d.shortTitle}
                  </span>
                  <span className="font-bold">{toFa(n)} سوال</span>
                </div>
              );
            })}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {[
              ["/admin/questions", "مدیریت سوالات"],
              ["/admin/import", "ورود گروهی"],
              ["/admin/catalog", "درس‌ها و مباحث"],
              ["/admin/users", "کاربران"],
            ].map(([to, l]) => (
              <Link key={to} to={to}>
                <Button variant="outline" size="sm" className="w-full">
                  {l}
                </Button>
              </Link>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="mb-3 flex items-center gap-2 font-bold text-slate-900">
            <Gift className="h-4 w-4 text-brand-600" /> تنظیمات پاداش‌ها
          </h3>
          <div className="space-y-3">
            <Input label="پاداش هر دعوت موفق (تومان)" type="number" ltr value={settings.referralBonus} onChange={(e) => setSettings({ ...settings, referralBonus: Number(e.target.value) })} />
            <Input label="هدیه‌ی ثبت‌نام (تومان)" type="number" ltr value={settings.signupBonus} onChange={(e) => setSettings({ ...settings, signupBonus: Number(e.target.value) })} />
            <Button
              icon={<Save className="h-4 w-4" />}
              onClick={async () => {
                await api.admin.updateSettings(settings);
                await refreshCatalog();
                toast("تنظیمات ذخیره شد", "success");
              }}
            >
              ذخیره‌ی تنظیمات
            </Button>
          </div>
          <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4">
            <div className="flex items-center gap-2 text-sm font-bold text-rose-700">
              <Database className="h-4 w-4" /> داده‌های نمایشی
            </div>
            <p className="mt-1 text-xs text-rose-600">بازنشانی، همه‌ی تغییرات محلی (کاربران، خریدها، سوالات اضافه‌شده) را پاک و داده‌های اولیه را بازمی‌گرداند.</p>
            <Button variant="danger" size="sm" className="mt-3" icon={<RefreshCw className="h-3.5 w-3.5" />} onClick={() => setReset(true)}>
              بازنشانی داده‌ها
            </Button>
          </div>
        </Card>
      </div>
      <ConfirmDialog
        open={reset}
        onClose={() => setReset(false)}
        danger
        title="بازنشانی داده‌ها"
        message="همه‌ی داده‌ها به حالت اولیه برمی‌گردند و از حساب خارج می‌شوید. ادامه می‌دهید؟"
        confirmText="بازنشانی"
        onConfirm={async () => {
          await api.admin.resetDemoData();
          await logout();
          window.location.hash = "#/";
          window.location.reload();
        }}
      />
    </div>
  );
}

/* ============================ Sources ============================ */
const KIND_LABEL: Record<SourceKind, string> = { konkur: "کنکور سراسری/ارشد", azmoon: "آزمون آزمایشی", talifi: "تألیفی", book: "کتاب" };

export function AdminSources() {
  const { catalog, refreshCatalog, toast } = useApp();
  const [modal, setModal] = useState<Source | "new" | null>(null);
  const [form, setForm] = useState<Omit<Source, "id">>({ title: "", kind: "konkur", year: 1404 });
  const [del, setDel] = useState<Source | null>(null);
  const count = (id: string) => catalog.questions.filter((q) => q.sourceId === id).length;
  const openModal = (s: Source | "new") => {
    setForm(s === "new" ? { title: "", kind: "konkur", year: 1404 } : { title: s.title, kind: s.kind, year: s.year });
    setModal(s);
  };
  const save = async () => {
    if (!form.title.trim()) return;
    if (modal === "new") await api.admin.createSource(form);
    else if (modal) await api.admin.updateSource(modal.id, form);
    await refreshCatalog();
    toast("ذخیره شد", "success");
    setModal(null);
  };
  return (
    <div>
      <PageHeader
        title="منابع سوالات"
        description="کنکورها، آزمون‌های آزمایشی، کتاب‌ها و تألیفی"
        actions={
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => openModal("new")}>
            منبع جدید
          </Button>
        }
      />
      <Card className="divide-y divide-slate-100">
        {catalog.sources.map((s) => (
          <div key={s.id} className="flex items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <div className="font-medium text-slate-800">{s.title}</div>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                <Badge>{KIND_LABEL[s.kind]}</Badge>
                {s.year && <span>سال {toFa(s.year)}</span>}
                <span className="font-mono">{s.id}</span>
              </div>
            </div>
            <span className="text-xs text-slate-500">{toFa(count(s.id))} سوال</span>
            <button onClick={() => openModal(s)} className="rounded-lg p-2 text-slate-500 hover:bg-brand-50 hover:text-brand-700">
              <Pencil className="h-4 w-4" />
            </button>
            <button onClick={() => setDel(s)} className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </Card>
      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal === "new" ? "منبع جدید" : "ویرایش منبع"}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModal(null)}>
              انصراف
            </Button>
            <Button onClick={save}>ذخیره</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input label="عنوان" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="مثلاً کنکور سراسری تجربی ۱۴۰۴" />
          <Select label="نوع" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as SourceKind })}>
            {Object.entries(KIND_LABEL).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </Select>
          <Input label="سال (اختیاری)" type="number" ltr value={form.year ?? ""} onChange={(e) => setForm({ ...form, year: e.target.value ? Number(e.target.value) : undefined })} />
        </div>
      </Modal>
      <ConfirmDialog
        open={!!del}
        onClose={() => setDel(null)}
        danger
        title="حذف منبع"
        message={`منبع «${del?.title}» حذف شود؟`}
        confirmText="حذف"
        onConfirm={async () => {
          if (!del) return;
          try {
            await api.admin.deleteSource(del.id);
            await refreshCatalog();
          } catch (e) {
            toast((e as Error).message, "error");
          }
        }}
      />
    </div>
  );
}

/* ============================ Users ============================ */
export function AdminUsers() {
  const { catalog, toast, user: me } = useApp();
  const [users, setUsers] = useState<User[]>([]);
  const [credit, setCredit] = useState<User | null>(null);
  const [amount, setAmount] = useState(100000);
  const load = () => api.admin.getUsers().then(setUsers);
  useEffect(() => {
    load();
  }, []);
  const setRole = async (u: User, role: User["role"]) => {
    await api.admin.updateUser(u.id, { role });
    await load();
    toast("نقش کاربر تغییر کرد", "success");
  };
  return (
    <div>
      <PageHeader title="کاربران" description={`${toFa(users.length)} کاربر ثبت‌نام‌شده`} />
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500">
            <tr>
              <th className="px-4 py-3 text-right font-medium">کاربر</th>
              <th className="hidden px-4 py-3 text-right font-medium sm:table-cell">نقش</th>
              <th className="px-4 py-3 text-right font-medium">اعتبار</th>
              <th className="hidden px-4 py-3 text-right font-medium md:table-cell">درس‌ها</th>
              <th className="hidden px-4 py-3 text-right font-medium lg:table-cell">کد دعوت</th>
              <th className="hidden px-4 py-3 text-right font-medium lg:table-cell">عضویت</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50/60">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Avatar name={u.fullName} size="sm" />
                    <div>
                      <div className="font-medium text-slate-800">{u.fullName}</div>
                      <div className="ltr-input text-xs text-slate-500">{u.email}</div>
                    </div>
                  </div>
                </td>
                <td className="hidden px-4 py-3 sm:table-cell">
                  {u.role === "admin" ? (
                    <Badge tone="rose">
                      <Shield className="h-3 w-3" /> مدیر
                    </Badge>
                  ) : (
                    <Badge>کاربر</Badge>
                  )}
                </td>
                <td className="px-4 py-3 font-medium">{formatNumber(u.balance)}</td>
                <td className="hidden px-4 py-3 md:table-cell">
                  <div className="flex flex-wrap gap-1">
                    {u.purchasedSubjectIds.slice(0, 3).map((s) => (
                      <Badge key={s} tone="brand">
                        {catalog.subjectById.get(s)?.title}
                      </Badge>
                    ))}
                    {u.purchasedSubjectIds.length > 3 && <Badge>+{toFa(u.purchasedSubjectIds.length - 3)}</Badge>}
                  </div>
                </td>
                <td className="hidden px-4 py-3 font-mono text-xs lg:table-cell">{u.referralCode}</td>
                <td className="hidden px-4 py-3 text-xs text-slate-500 lg:table-cell">{formatDate(u.createdAt)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Button size="sm" variant="outline" onClick={() => setCredit(u)} icon={<Wallet className="h-3.5 w-3.5" />}>
                      اعتبار
                    </Button>
                    {u.id !== me?.id && (
                      <Button size="sm" variant="ghost" onClick={() => setRole(u, u.role === "admin" ? "user" : "admin")}>
                        {u.role === "admin" ? "سلب مدیریت" : "ارتقا به مدیر"}
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Modal
        open={!!credit}
        onClose={() => setCredit(null)}
        title={`تغییر اعتبار ${credit?.fullName ?? ""}`}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCredit(null)}>
              انصراف
            </Button>
            <Button
              onClick={async () => {
                if (!credit) return;
                await api.admin.updateUser(credit.id, { balance: Math.max(0, credit.balance + amount) });
                await load();
                toast("اعتبار به‌روز شد", "success");
                setCredit(null);
              }}
            >
              اعمال
            </Button>
          </>
        }
      >
        <p className="mb-3 text-sm text-slate-600">
          اعتبار فعلی: <b>{formatNumber(credit?.balance ?? 0)}</b> تومان
        </p>
        <Input label="مبلغ (منفی برای کسر)" type="number" ltr value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
      </Modal>
    </div>
  );
}
