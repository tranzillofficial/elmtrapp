"use client";
import { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Home,
  FolderOpen,
  CalendarDays,
  Users,
  MoreHorizontal,
  BookOpen,
  Sparkles,
  ScanLine,
  FileText,
  Settings as SettingsIcon,
  Menu,
  X,
  Bell,
  Sun,
  Moon,
  ChevronLeft,
  Scale,
  CheckCircle2,
  LoaderCircle,
} from "lucide-react";
import { Provider, useStore } from "./provider";
import { IconButton, Modal, Empty } from "./ui";
import { Overview } from "./overview";
import { Cases, CaseDetail } from "./cases";
import { Clients, ClientDetail } from "./clients";
import { Hearings } from "./hearings";
import { Documents } from "./documents";
import { Scanner } from "./scanner";
import { Library, Assistant } from "./premium";
import { Settings, Auth } from "./settings";
import { day, time } from "@/lib/types";
const navigation = [
  { href: "/", label: "نظرة عامة", short: "الرئيسية", Icon: Home },
  { href: "/cases", label: "القضايا", short: "القضايا", Icon: FolderOpen },
  {
    href: "/hearings",
    label: "الجلسات والمواعيد",
    short: "المواعيد",
    Icon: CalendarDays,
  },
  {
    href: "/clients",
    label: "العملاء والحسابات",
    short: "العملاء",
    Icon: Users,
  },
  { href: "/documents", label: "المستندات", Icon: FileText },
  { href: "/scanner", label: "مسح مستند", Icon: ScanLine },
  { href: "/library", label: "مرجع القانون المصري", Icon: BookOpen, pro: true },
  { href: "/assistant", label: "المساعد القانوني", Icon: Sparkles, pro: true },
  { href: "/settings", label: "الإعدادات", Icon: SettingsIcon },
];
export function App() {
  return (
    <Provider>
      <Shell />
    </Provider>
  );
}
function Shell() {
  const {
    loading,
    demo,
    user,
    profile,
    error,
    notice,
    setError,
    data,
    refresh,
  } = useStore();
  const path = usePathname();
  const [now] = useState(() => Date.now()),
    [theme, setThemeState] = useState("light"),
    [drawer, setDrawer] = useState(false),
    [notifications, setNotifications] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const saved = localStorage.getItem("elmtrapp-theme") ?? "light";
      setThemeState(saved);
      document.documentElement.dataset.theme = saved;
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  const setTheme = (v: string) => {
    setThemeState(v);
    document.documentElement.dataset.theme = v;
    localStorage.setItem("elmtrapp-theme", v);
  };
  const current =
    navigation.find((n) => n.href !== "/" && path.startsWith(n.href)) ??
    navigation[0];
  const selected = (href: string) =>
    href === "/" ? path === "/" : path.startsWith(href);
  if (loading && !user && !demo)
    return (
      <div className="loading-screen">
        <span className="brand">elmtrapp</span>
        <LoaderCircle className="spin" />
        <p>جارٍ تجهيز مكتبك...</p>
      </div>
    );
  if (!demo && !user)
    return (
      <>
        <Auth />
        {error && (
          <div className="auth-error alert error" role="alert">
            {error}
          </div>
        )}
      </>
    );
  const route = path.split("/").filter(Boolean);
  let content: React.ReactNode;
  switch (route[0]) {
    case undefined:
      content = <Overview />;
      break;
    case "cases":
      content = route[1] ? <CaseDetail id={route[1]} /> : <Cases />;
      break;
    case "clients":
      content = route[1] ? <ClientDetail id={route[1]} /> : <Clients />;
      break;
    case "hearings":
      content = <Hearings />;
      break;
    case "documents":
      content = <Documents />;
      break;
    case "scanner":
      content = <Scanner />;
      break;
    case "library":
      content = <Library />;
      break;
    case "assistant":
      content = <Assistant />;
      break;
    case "settings":
      content = <Settings theme={theme} setTheme={setTheme} />;
      break;
    default:
      content = (
        <Empty
          title="الصفحة غير موجودة"
          action={<Link href="/">العودة للرئيسية</Link>}
        />
      );
  }
  const upcoming = data.hearings
    .filter(
      (h) =>
        new Date(h.starts_at) >= new Date() &&
        new Date(h.starts_at).getTime() < now + 7 * 86400000,
    )
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const nav = (
    <>
      <Link href="/" className="brand" onClick={() => setDrawer(false)}>
        elmtrapp<span>مكتبك القانوني في مكان واحد</span>
      </Link>
      <div className="sidebar-label">مساحة العمل</div>
      <nav>
        {navigation.map(({ href, label, Icon, pro }) => (
          <Link
            key={href}
            href={href}
            aria-current={selected(href) ? "page" : undefined}
            className={`nav-item ${selected(href) ? "active" : ""}`}
            onClick={() => setDrawer(false)}
          >
            <Icon size={19} />
            <span>{label}</span>
            {pro && <span className="pro-tag">PRO</span>}
          </Link>
        ))}
      </nav>
      <div className="sidebar-footer">
        <Scale size={23} />
        <strong>
          تركيزك على العدالة.
          <br />
          والتنظيم علينا.
        </strong>
        <span>elmtrapp · مساحة أكثر وضوحًا</span>
      </div>
    </>
  );
  return (
    <div className="app-shell">
      <aside className="sidebar">{nav}</aside>
      {drawer && <Drawer onClose={() => setDrawer(false)}>{nav}</Drawer>}
      <div className="workspace">
        <header className="topbar">
          <div className="desktop-crumb">
            مساحة العمل <ChevronLeft size={14} />
            <strong>{current.label}</strong>
          </div>
          <IconButton label="فتح القائمة" onClick={() => setDrawer(true)}>
            <Menu size={21} />
          </IconButton>
          <Link className="mobile-brand" href="/">
            elmtrapp
          </Link>
          <div className="topbar-actions">
            <IconButton
              label={
                theme === "light" ? "تفعيل الوضع الداكن" : "تفعيل الوضع الفاتح"
              }
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            >
              {theme === "light" ? <Moon size={19} /> : <Sun size={19} />}
            </IconButton>
            <IconButton
              label="التنبيهات"
              onClick={() => setNotifications(true)}
            >
              <Bell size={19} />
              {upcoming.length > 0 && <i className="notification-dot" />}
            </IconButton>
            <Link href="/settings" className="profile-pill">
              <span className="avatar small">{profile.full_name[0]}</span>
              <span>
                <b>أ. {profile.full_name}</b>
                <small>{profile.office_name}</small>
              </span>
            </Link>
          </div>
        </header>
        {demo && (
          <div className="demo-banner">
            <span>
              <i />
              وضع المعاينة{" "}
              <span className="demo-detail">
                · بيانات تجريبية محفوظة في هذا المتصفح
              </span>
            </span>
            <Link href="/settings">
              إعداد حسابك <ChevronLeft size={13} />
            </Link>
          </div>
        )}
        <main className="main-content" key={path}>
          {error && (
            <div className="alert error" role="alert">
              {error}
              <IconButton label="إغلاق الخطأ" onClick={() => setError("")}>
                <X size={16} />
              </IconButton>
              <button className="text-button" onClick={() => void refresh()}>
                إعادة المحاولة
              </button>
            </div>
          )}
          {content}
        </main>
        <footer className="desktop-footer">
          elmtrapp <span>مكتب أكثر تنظيمًا. وقت أكثر لقضاياك.</span>
        </footer>
      </div>
      <nav className="bottom-nav" aria-label="التنقل الرئيسي">
        {navigation.slice(0, 4).map(({ href, short, Icon }) => (
          <Link
            key={href}
            href={href}
            className={selected(href) ? "active" : ""}
            aria-current={selected(href) ? "page" : undefined}
          >
            <Icon size={20} />
            <span>{short}</span>
          </Link>
        ))}
        <button
          className={
            route[0] && !["cases", "clients", "hearings"].includes(route[0])
              ? "active"
              : ""
          }
          onClick={() => setDrawer(true)}
        >
          <MoreHorizontal size={21} />
          <span>المزيد</span>
        </button>
      </nav>
      {notice && (
        <div className="toast" role="status">
          <CheckCircle2 size={18} />
          {notice}
        </div>
      )}
      {notifications && (
        <Modal
          title="جلساتك خلال الأسبوع"
          onClose={() => setNotifications(false)}
        >
          {upcoming.map((h) => (
            <Link
              className="notification-row"
              key={h.id}
              href={`/cases/${h.case_id}`}
              onClick={() => setNotifications(false)}
            >
              <CalendarDays size={19} />
              <span>
                <strong>{h.court}</strong>
                <small>
                  {day(h.starts_at)} · {time(h.starts_at)}
                </small>
              </span>
            </Link>
          ))}
          {!upcoming.length && (
            <Empty title="لا توجد جلسات قادمة هذا الأسبوع" />
          )}
          <p className="hint">
            للتذكير خارج التطبيق، أضف الجلسة لتقويم جهازك من صفحة المواعيد.
          </p>
        </Modal>
      )}
    </div>
  );
}

function Drawer({
  onClose,
  children,
}: {
  onClose: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    const dialog = ref.current;
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="drawer-dialog"
      aria-label="قائمة التنقل"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <aside className="drawer">
        <IconButton label="إغلاق القائمة" onClick={onClose}>
          <X size={20} />
        </IconButton>
        {children}
      </aside>
    </dialog>
  );
}
