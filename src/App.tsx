import { Bookmark, BookOpen, Database, FileText, FolderHeart, Gift, LayoutDashboard, Library, ListChecks, Shuffle, ShoppingBag, Tag, Upload, Users, Wallet } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { HashRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AppShell, type NavItem } from "@/components/layout/AppShell";
import { Button, Spinner, ToastViewport } from "@/components/ui";
import { AppProvider, useApp } from "@/store/AppContext";
import Landing from "@/pages/Landing";
import Auth from "@/pages/Auth";
import Overview from "@/pages/app/Overview";
import Store from "@/pages/app/Store";
import Bank from "@/pages/app/Bank";
import Collections, { CollectionDetail } from "@/pages/app/Collections";
import ExamBuilder from "@/pages/app/ExamBuilder";
import Exams from "@/pages/app/Exams";
import ExamRunner from "@/pages/app/ExamRunner";
import Result from "@/pages/app/Result";
import Lessons, { LessonDetail } from "@/pages/app/Lessons";
import Referral, { WalletPage } from "@/pages/app/Referral";
import AdminQuestions from "@/pages/admin/AdminQuestions";
import AdminImport from "@/pages/admin/AdminImport";
import AdminLessons from "@/pages/admin/AdminLessons";
import AdminCatalog from "@/pages/admin/AdminCatalog";
import { AdminOverview, AdminSources, AdminUsers } from "@/pages/admin/AdminMisc";

function RequireAuth({ children, admin }: { children: ReactNode; admin?: boolean }) {
  const { user, booting } = useApp();
  const location = useLocation();
  if (booting) return <Spinner className="min-h-screen" />;
  if (!user) return <Navigate to={`/auth?mode=login&next=${encodeURIComponent(location.pathname)}`} replace />;
  if (admin && user.role !== "admin") return <Navigate to="/app" replace />;
  return <>{children}</>;
}

function UserLayout() {
  const { userData } = useApp();
  const nav: NavItem[] = [
    { to: "/app", label: "داشبورد", icon: <LayoutDashboard />, end: true },
    { to: "/app/bank", label: "بانک تست", icon: <Library /> },
    { to: "/app/exams/new", label: "آزمون‌ساز", icon: <Shuffle /> },
    { to: "/app/exams", label: "آزمون‌های من", icon: <ListChecks />, end: true, badge: userData.attempts.filter((a) => a.status === "in-progress").length || undefined },
    { to: "/app/collections", label: "مجموعه‌ها", icon: <FolderHeart /> },
    { to: "/app/bookmarks", label: "نشان‌شده‌ها", icon: <Bookmark /> },
    { to: "/app/lessons", label: "درسنامه‌ها", icon: <BookOpen /> },
    { to: "/app/store", label: "فروشگاه", icon: <ShoppingBag /> },
    { to: "/app/wallet", label: "کیف پول", icon: <Wallet /> },
    { to: "/app/referral", label: "دعوت دوستان", icon: <Gift /> },
  ];
  return <AppShell nav={nav} title="پنل کاربری" />;
}

function AdminLayout() {
  const nav: NavItem[] = [
    { to: "/admin", label: "نمای کلی", icon: <LayoutDashboard />, end: true },
    { to: "/admin/questions", label: "سوالات", icon: <FileText /> },
    { to: "/admin/lessons", label: "درسنامه‌ها", icon: <BookOpen /> },
    { to: "/admin/import", label: "ورود گروهی", icon: <Upload /> },
    { to: "/admin/catalog", label: "درس‌ها و مباحث", icon: <Database /> },
    { to: "/admin/sources", label: "منابع", icon: <Tag /> },
    { to: "/admin/users", label: "کاربران", icon: <Users /> },
  ];
  return <AppShell nav={nav} title="پنل مدیریت" accent="rose" />;
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);
  return null;
}

function DataBoundary({ children }: { children: ReactNode }) {
  const { booting, bootError } = useApp();
  if (booting) return <Spinner className="min-h-screen" />;
  if (bootError) return <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-4 p-6 text-center">
    <h1 className="text-xl font-bold text-slate-900">بارگذاری داده‌ها انجام نشد</h1>
    <p role="alert" className="text-sm leading-8 text-rose-700">{bootError}</p>
    <Button onClick={() => window.location.reload()}>تلاش دوباره</Button>
  </main>;
  return children;
}

export default function App() {
  return (
    <AppProvider>
      <DataBoundary>
      <HashRouter>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/auth" element={<Auth />} />

          <Route
            path="/app"
            element={
              <RequireAuth>
                <UserLayout />
              </RequireAuth>
            }
          >
            <Route index element={<Overview />} />
            <Route path="bank" element={<Bank />} />
            <Route path="bookmarks" element={<Bank bookmarks />} />
            <Route path="store" element={<Store />} />
            <Route path="collections" element={<Collections />} />
            <Route path="collections/:id" element={<CollectionDetail />} />
            <Route path="exams" element={<Exams />} />
            <Route path="exams/new" element={<ExamBuilder />} />
            <Route path="exams/:id/edit" element={<ExamBuilder />} />
            <Route path="results/:attemptId" element={<Result />} />
            <Route path="lessons" element={<Lessons />} />
            <Route path="lessons/:id" element={<LessonDetail />} />
            <Route path="wallet" element={<WalletPage />} />
            <Route path="referral" element={<Referral />} />
          </Route>

          <Route
            path="/app/run/:attemptId"
            element={
              <RequireAuth>
                <ExamRunner />
              </RequireAuth>
            }
          />

          <Route
            path="/admin"
            element={
              <RequireAuth admin>
                <AdminLayout />
              </RequireAuth>
            }
          >
            <Route index element={<AdminOverview />} />
            <Route path="questions" element={<AdminQuestions />} />
            <Route path="lessons" element={<AdminLessons />} />
            <Route path="import" element={<AdminImport />} />
            <Route path="catalog" element={<AdminCatalog />} />
            <Route path="sources" element={<AdminSources />} />
            <Route path="users" element={<AdminUsers />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <ToastViewport />
      </HashRouter>
      </DataBoundary>
    </AppProvider>
  );
}
