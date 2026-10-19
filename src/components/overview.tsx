"use client";
import Link from "next/link";
import { useState } from "react";
import {
  FolderOpen,
  CalendarDays,
  Users,
  Wallet,
  Plus,
  ArrowUpLeft,
  Clock,
  ChevronLeft,
  FileText,
  ScanLine,
  Sparkles,
  BookOpen,
} from "lucide-react";
import { PowerAlerts } from "./power-alerts";
import { useStore } from "./provider";
import { CaseEditor, HearingEditor, ClientEditor } from "./editors";
import { SectionTitle, Empty, Badge } from "./ui";
import { balance, day, time, money, Hearing } from "@/lib/types";
export function HearingRow({ item }: { item: Hearing }) {
  const { data } = useStore();
  const c = data.cases.find((c) => c.id === item.case_id);
  return (
    <Link href={`/cases/${item.case_id}`} className="hearing-row">
      <div className="date-tile">
        <b>
          {new Date(item.starts_at).toLocaleDateString("ar-EG", {
            day: "numeric",
          })}
        </b>
        <span>
          {new Date(item.starts_at).toLocaleDateString("ar-EG", {
            month: "short",
          })}
        </span>
      </div>
      <div className="row-main">
        <strong>{item.court}</strong>
        <span>
          {c?.title} · {item.purpose}
        </span>
        <small>
          <Clock size={12} />
          {time(item.starts_at)}
        </small>
      </div>
      <ChevronLeft size={17} />
    </Link>
  );
}
export function Overview() {
  const { data, profile, office } = useStore();
  const [now] = useState(() => Date.now()),
    [modal, setModal] = useState("");
  const upcoming = data.hearings
    .filter(
      (h) => new Date(h.starts_at) >= new Date(new Date().setHours(0, 0, 0, 0)),
    )
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const week = upcoming.filter(
    (h) => new Date(h.starts_at).getTime() < now + 7 * 86400000,
  ).length;
  const stats = [
    {
      title: "القضايا النشطة",
      value: data.cases.filter((c) => c.status !== "closed").length,
      Icon: FolderOpen,
      href: "/cases",
      caption: "ملفات قيد المتابعة",
    },
    {
      title: "جلسات الأسبوع",
      value: week,
      Icon: CalendarDays,
      href: "/hearings",
      caption: "مواعيدك القادمة",
    },
    {
      title: "العملاء",
      value: data.clients.length,
      Icon: Users,
      href: "/clients",
      caption: "في مكتبك القانوني",
    },
    {
      title: "المستحقات",
      value: money(data.clients.reduce((s, c) => s + balance(data, c.id), 0)),
      Icon: Wallet,
      href: "/clients",
      caption: "إجمالي المتبقي · ج.م",
    },
  ];
  return (
    <>
      <div className="welcome">
        <div>
          <p className="eyebrow">
            {day(new Date().toISOString(), {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
          <h1>
            أهلًا، أستاذ {profile.full_name.split(" ")[0]}{" "}
            <span className="gold-dot" />
          </h1>
          <p>إليك ملخص أعمال مكتبك اليوم.</p>
        </div>
        <div className="welcome-actions">
          {(!office.member ||
            (office.permissions.includes("cases") &&
              office.permissions.includes("write"))) && (
            <button
              className="button primary"
              disabled={!data.clients.length}
              title={!data.clients.length ? "أضف موكلًا أولًا" : undefined}
              onClick={() => setModal("case")}
            >
              <Plus size={16} />
              قضية جديدة
            </button>
          )}
          {(!office.member ||
            (office.permissions.includes("clients") &&
              office.permissions.includes("write"))) && (
            <button className="button" onClick={() => setModal("client")}>
              <Users size={16} />
              إضافة موكل
            </button>
          )}
          {(!office.member ||
            (office.permissions.includes("hearings") &&
              office.permissions.includes("write"))) && (
            <button
              className="button"
              disabled={!data.cases.length}
              title={!data.cases.length ? "أضف قضية أولًا" : undefined}
              onClick={() => setModal("hearing")}
            >
              <CalendarDays size={16} />
              تسجيل جلسة
            </button>
          )}
        </div>
      </div>
      <PowerAlerts />
      <div className="stats-grid">
        {stats.map(({ title, value, Icon, href, caption }) => (
          <Link className="stat-card" href={href} key={title}>
            <div className="stat-top">
              <span>{title}</span>
              <Icon size={21} />
            </div>
            <strong>{value}</strong>
            <small>
              {caption}
              <ArrowUpLeft size={14} />
            </small>
          </Link>
        ))}
      </div>
      <div className="dashboard-grid">
        <section className="panel">
          <SectionTitle title="الجلسات القادمة" href="/hearings" />
          {upcoming.length ? (
            upcoming.slice(0, 4).map((h) => <HearingRow key={h.id} item={h} />)
          ) : (
            <Empty
              title="لا توجد جلسات قادمة"
              text="أضف موعد الجلسة التالية لتتابعها هنا."
            />
          )}
          <button
            className="button full quiet"
            onClick={() => setModal("hearing")}
          >
            <Plus size={16} />
            إضافة موعد
          </button>
        </section>
        <section className="panel">
          <SectionTitle title="أحدث القضايا" href="/cases" />
          {data.cases.length ? (
            data.cases.slice(0, 4).map((c) => (
              <Link href={`/cases/${c.id}`} className="case-mini" key={c.id}>
                <div className="mini-icon">
                  <FolderOpen size={19} />
                </div>
                <div className="row-main">
                  <strong>{c.title}</strong>
                  <span>
                    {data.clients.find((x) => x.id === c.client_id)?.name} ·{" "}
                    {c.number}
                  </span>
                </div>
                <Badge status={c.status} />
              </Link>
            ))
          ) : (
            <Empty title="ابدأ بأول قضية" />
          )}
        </section>
      </div>
      <SectionTitle title="وصول سريع" />
      <div className="quick-grid">
        {[
          {
            Icon: ScanLine,
            title: "مسح مستند",
            description: "صوّر أوراقك وأضفها للقضية",
            href: "/scanner",
          },
          {
            Icon: BookOpen,
            title: "مرجع القانون المصري",
            description: "ابحث في القوانين والمواد",
            href: "/library",
          },
          {
            Icon: Sparkles,
            title: "المساعد القانوني",
            description: "راجع ملفاتك بمساعدة الذكاء الاصطناعي",
            href: "/assistant",
          },
          {
            Icon: FileText,
            title: "كل المستندات",
            description: "ملفات قضاياك في مكان واحد",
            href: "/documents",
          },
        ].map(({ Icon, title, description, href }) => (
          <Link href={href} className="quick-card" key={href}>
            <Icon size={23} />
            <strong>{title}</strong>
            <span>{description}</span>
            <ChevronLeft size={15} />
          </Link>
        ))}
      </div>
      {modal === "case" && <CaseEditor onClose={() => setModal("")} />}{" "}
      {modal === "client" && <ClientEditor onClose={() => setModal("")} />}{" "}
      {modal === "hearing" && <HearingEditor onClose={() => setModal("")} />}
    </>
  );
}
