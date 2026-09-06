import { X, Check, AlertCircle, Info, Search, Loader2 } from "lucide-react";
import { forwardRef, useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { useApp } from "@/store/AppContext";

/* ------------------------------ Button ------------------------------ */
type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline" | "success";
type Size = "sm" | "md" | "lg" | "icon";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
}

const variants: Record<Variant, string> = {
  primary: "bg-brand-600 text-white hover:bg-brand-700 shadow-sm shadow-brand-200 disabled:bg-brand-300",
  secondary: "bg-slate-100 text-slate-800 hover:bg-slate-200",
  ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
  danger: "bg-rose-600 text-white hover:bg-rose-700",
  outline: "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300",
  success: "bg-emerald-600 text-white hover:bg-emerald-700",
};
const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-xs gap-1.5 rounded-lg",
  md: "h-10 px-4 text-sm gap-2 rounded-xl",
  lg: "h-12 px-6 text-base gap-2 rounded-xl",
  icon: "h-9 w-9 rounded-lg",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant = "primary", size = "md", loading, icon, children, disabled, ...props }, ref) => (
  <button
    ref={ref}
    disabled={disabled || loading}
    className={cn(
      "inline-flex items-center justify-center font-medium transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2",
      variants[variant],
      sizes[size],
      className
    )}
    {...props}
  >
    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
    {children}
  </button>
));
Button.displayName = "Button";

/* ------------------------------ Inputs ------------------------------ */
export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  ltr?: boolean;
  icon?: ReactNode;
}
export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, label, hint, error, ltr, icon, id, ...props }, ref) => (
  <label className="block space-y-1.5">
    {label && <span className="block text-sm font-medium text-slate-700">{label}</span>}
    <div className="relative">
      {icon && <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400">{icon}</span>}
      <input
        ref={ref}
        id={id}
        className={cn(
          "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 placeholder:text-slate-400 transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:bg-slate-50",
          icon && "pr-10",
          ltr && "ltr-input",
          error && "border-rose-400 focus:border-rose-500 focus:ring-rose-100",
          className
        )}
        {...props}
      />
    </div>
    {error ? <span className="block text-xs text-rose-600">{error}</span> : hint ? <span className="block text-xs text-slate-500">{hint}</span> : null}
  </label>
));
Input.displayName = "Input";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  ltr?: boolean;
}
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, label, hint, ltr, ...props }, ref) => (
  <label className="block space-y-1.5">
    {label && <span className="block text-sm font-medium text-slate-700">{label}</span>}
    <textarea
      ref={ref}
      className={cn(
        "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100",
        ltr && "ltr-input font-mono text-xs",
        className
      )}
      {...props}
    />
    {hint && <span className="block text-xs text-slate-500">{hint}</span>}
  </label>
));
Textarea.displayName = "Textarea";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
}
export const Select = forwardRef<HTMLSelectElement, SelectProps>(({ className, label, children, ...props }, ref) => (
  <label className="block space-y-1.5">
    {label && <span className="block text-sm font-medium text-slate-700">{label}</span>}
    <select
      ref={ref}
      className={cn("h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100", className)}
      {...props}
    >
      {children}
    </select>
  </label>
));
Select.displayName = "Select";

export function SearchInput({ value, onChange, placeholder = "جستجو..." }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute inset-y-0 right-3 my-auto h-4 w-4 text-slate-400" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-xl border border-slate-200 bg-white pr-9 pl-3 text-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
      />
      {value && (
        <button onClick={() => onChange("")} className="absolute inset-y-0 left-2 my-auto flex h-6 w-6 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100">
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

export function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-right transition hover:bg-slate-50">
      <span>
        <span className="block text-sm font-medium text-slate-800">{label}</span>
        {description && <span className="block text-xs text-slate-500">{description}</span>}
      </span>
      <span className={cn("relative h-6 w-11 shrink-0 rounded-full transition", checked ? "bg-brand-600" : "bg-slate-300")}>
        <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", checked ? "left-0.5" : "left-[22px]")} />
      </span>
    </button>
  );
}

/* ------------------------------ Card / Badge ------------------------------ */
export function Card({ className, children, ...props }: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("rounded-2xl border border-slate-200/80 bg-white shadow-sm", className)} {...props}>
      {children}
    </div>
  );
}

export function Badge({ className, children, tone = "slate" }: { className?: string; children: ReactNode; tone?: "slate" | "brand" | "emerald" | "amber" | "rose" | "sky" | "violet" }) {
  const tones = {
    slate: "bg-slate-100 text-slate-700",
    brand: "bg-brand-50 text-brand-700",
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    rose: "bg-rose-50 text-rose-700",
    sky: "bg-sky-50 text-sky-700",
    violet: "bg-violet-50 text-violet-700",
  };
  return <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium leading-5", tones[tone], className)}>{children}</span>;
}

export function Chip({ active, onClick, children, className }: { active?: boolean; onClick?: () => void; children: ReactNode; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition",
        active ? "border-brand-600 bg-brand-600 text-white shadow-sm" : "border-slate-200 bg-white text-slate-600 hover:border-brand-300 hover:text-brand-700",
        className
      )}
    >
      {children}
    </button>
  );
}

export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 px-6 py-14 text-center">
      {icon && <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm">{icon}</div>}
      <h3 className="text-base font-semibold text-slate-800">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({ label, value, icon, tone = "brand", hint }: { label: string; value: ReactNode; icon: ReactNode; tone?: "brand" | "emerald" | "amber" | "rose" | "sky" | "violet"; hint?: string }) {
  const tones = {
    brand: "from-brand-500 to-indigo-600",
    emerald: "from-emerald-500 to-teal-600",
    amber: "from-amber-400 to-orange-500",
    rose: "from-rose-500 to-pink-600",
    sky: "from-sky-500 to-cyan-600",
    violet: "from-violet-500 to-purple-600",
  };
  return (
    <Card className="flex items-center gap-4 p-4">
      <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md", tones[tone])}>{icon}</div>
      <div className="min-w-0">
        <div className="text-xs text-slate-500">{label}</div>
        <div className="truncate text-xl font-bold text-slate-900">{value}</div>
        {hint && <div className="text-[11px] text-slate-400">{hint}</div>}
      </div>
    </Card>
  );
}

export function ProgressBar({ value, className, color }: { value: number; className?: string; color?: string }) {
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-slate-100", className)}>
      <div className={cn("h-full rounded-full transition-all", color ?? "bg-brand-600")} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

/* ------------------------------ Modal ------------------------------ */
const modalStack: string[] = [];
let previousBodyOverflow = "";

export function Modal({ open, onClose, title, children, footer, size = "md", locked = false }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; size?: "sm" | "md" | "lg" | "xl"; locked?: boolean }) {
  const id = useId();
  const panel = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  const lockedRef = useRef(locked);
  closeRef.current = onClose;
  lockedRef.current = locked;
  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    if (!modalStack.length) previousBodyOverflow = document.body.style.overflow;
    modalStack.push(id);
    document.body.style.overflow = "hidden";
    const frame = requestAnimationFrame(() => {
      if (!panel.current?.contains(document.activeElement)) panel.current?.focus();
    });
    const onKey = (event: KeyboardEvent) => {
      if (modalStack[modalStack.length - 1] !== id || event.defaultPrevented) return;
      if (event.key === "Escape") {
        event.preventDefault();
        if (!lockedRef.current) closeRef.current();
      }
      if (event.key === "Tab" && panel.current) {
        const elements = [...panel.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex="0"]')]
          .filter((el) => el.getClientRects().length > 0);
        const first = elements[0]; const last = elements[elements.length - 1];
        if (!first) { event.preventDefault(); panel.current.focus(); }
        else if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && (document.activeElement === last || document.activeElement === panel.current)) { event.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKey);
      const index = modalStack.indexOf(id);
      if (index >= 0) modalStack.splice(index, 1);
      if (!modalStack.length) document.body.style.overflow = previousBodyOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [open, id]);
  if (!open) return null;
  const close = () => { if (!locked) onClose(); };
  const widths = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-6xl" };
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={close}>
      <div ref={panel} role="dialog" aria-modal="true" aria-labelledby={`${id}-title`} tabIndex={-1}
        className={cn("flex max-h-[92dvh] w-full min-w-0 flex-col rounded-t-2xl bg-white shadow-2xl outline-none animate-fade-up sm:rounded-2xl", widths[size])} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <h3 id={`${id}-title`} className="text-base font-bold text-slate-900">{title}</h3>
          <button type="button" aria-label="بستن" disabled={locked} onClick={close} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 px-5 py-3">{footer}</div>}
      </div>
    </div>, document.body
  );
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmText = "تأیید", danger }: { open: boolean; onClose: () => void; onConfirm: () => void | Promise<void>; title: string; message: string; confirmText?: string; danger?: boolean }) {
  const { toast } = useApp();
  const [busy, setBusy] = useState(false);
  const running = useRef(false);
  const confirm = async () => {
    if (running.current) return;
    running.current = true; setBusy(true);
    try { await onConfirm(); onClose(); }
    catch (error) { toast(error instanceof Error ? error.message : "عملیات انجام نشد", "error"); }
    finally { running.current = false; setBusy(false); }
  };
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm" locked={busy} footer={<>
      <Button variant="ghost" disabled={busy} onClick={onClose}>انصراف</Button>
      <Button variant={danger ? "danger" : "primary"} loading={busy} onClick={confirm}>{confirmText}</Button>
    </>}>
      <p className="text-sm leading-7 text-slate-600">{message}</p>
    </Modal>
  );
}

/* ------------------------------ Toasts ------------------------------ */
export function ToastViewport() {
  const { toasts, dismissToast } = useApp();
  const icons = { success: <Check className="h-4 w-4" />, error: <AlertCircle className="h-4 w-4" />, info: <Info className="h-4 w-4" /> };
  const tones = { success: "bg-emerald-600", error: "bg-rose-600", info: "bg-slate-800" };
  return (
    <div className="pointer-events-none fixed bottom-4 left-1/2 z-[100] flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4">
      {toasts.map((t) => (
        <div key={t.id} role={t.kind === "error" ? "alert" : "status"} className={cn("pointer-events-auto flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-white shadow-lg animate-fade-up", tones[t.kind])}>
          {icons[t.kind]}
          <span className="flex-1">{t.message}</span>
          <button onClick={() => dismissToast(t.id)} className="opacity-70 hover:opacity-100">
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center py-16", className)}>
      <Loader2 className="h-7 w-7 animate-spin text-brand-600" />
    </div>
  );
}

export function Avatar({ name, size = "md", className }: { name: string; size?: "sm" | "md" | "lg"; className?: string }) {
  const sizes = { sm: "h-8 w-8 text-xs", md: "h-10 w-10 text-sm", lg: "h-16 w-16 text-xl" };
  const initials = name.trim().split(/\s+/).slice(0, 2).map((s) => s[0]).join("");
  return <div className={cn("flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-violet-600 font-bold text-white", sizes[size], className)}>{initials}</div>;
}
