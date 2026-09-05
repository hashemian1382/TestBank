import { BookOpen, ChevronLeft, LogOut, Menu, Shield, Wallet, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { cn, formatNumber } from "@/lib/utils";
import { useApp } from "@/store/AppContext";
import { Avatar } from "../ui";

export interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  end?: boolean;
  badge?: number;
}

export function Logo({ dark, className }: { dark?: boolean; className?: string }) {
  return (
    <Link to="/" className={cn("flex items-center gap-2", className)}>
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-600 text-white shadow-md shadow-brand-200">
        <BookOpen className="h-5 w-5" />
      </span>
      <span className={cn("text-lg font-extrabold tracking-tight", dark ? "text-white" : "text-slate-900")}>
        تست‌<span className="text-brand-600">بانک</span>
      </span>
    </Link>
  );
}

export function AppShell({ nav, title, accent = "brand" }: { nav: NavItem[]; title: string; accent?: "brand" | "rose" }) {
  const { user, logout } = useApp();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const doLogout = async () => {
    await logout();
    navigate("/");
  };

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-5 py-5">
        <Logo />
        <button className="lg:hidden" onClick={() => setOpen(false)}>
          <X className="h-5 w-5 text-slate-500" />
        </button>
      </div>
      <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{title}</div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3">
        {nav.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                isActive ? (accent === "rose" ? "bg-rose-50 text-rose-700" : "bg-brand-50 text-brand-700") : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )
            }
          >
            <span className="[&>svg]:h-[18px] [&>svg]:w-[18px]">{n.icon}</span>
            <span className="flex-1">{n.label}</span>
            {n.badge ? <span className="rounded-full bg-brand-600 px-1.5 text-[10px] font-bold text-white">{formatNumber(n.badge)}</span> : null}
            <ChevronLeft className="h-4 w-4 opacity-0 transition group-hover:opacity-40" />
          </NavLink>
        ))}
      </nav>
      {user && (
        <div className="border-t border-slate-100 p-3">
          {user.role === "admin" && (
            <NavLink to={accent === "rose" ? "/app" : "/admin"} className="mb-2 flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800">
              <Shield className="h-4 w-4" /> {accent === "rose" ? "رفتن به پنل کاربر" : "رفتن به پنل مدیریت"}
            </NavLink>
          )}
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-2.5">
            <Avatar name={user.fullName} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-slate-800">{user.fullName}</div>
              <div className="flex items-center gap-1 text-[11px] text-slate-500">
                <Wallet className="h-3 w-3" /> {formatNumber(user.balance)} تومان
              </div>
            </div>
            <button onClick={doLogout} title="خروج" className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* desktop sidebar */}
      <aside className="fixed inset-y-0 right-0 z-30 hidden w-64 border-l border-slate-200 bg-white lg:block">{sidebar}</aside>
      {/* mobile sidebar */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 right-0 w-72 bg-white shadow-2xl animate-fade-up">{sidebar}</aside>
        </div>
      )}
      {/* topbar mobile */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur lg:hidden">
        <Logo />
        <button onClick={() => setOpen(true)} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100">
          <Menu className="h-5 w-5" />
        </button>
      </header>
      <main className="lg:mr-64">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
