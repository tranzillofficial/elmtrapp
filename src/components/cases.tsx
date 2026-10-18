"use client";
import { useState, useRef } from "react";
import Link from "next/link";
import {
  Plus,
  ChevronLeft,
  CalendarDays,
  UserRound,
  MapPin,
  FileText,
  Upload,
  ScanLine,
  ArrowRight,
  Pencil,
  Trash2,
  StickyNote,
  Download,
} from "lucide-react";
import { useStore } from "./provider";
import { CaseEditor, HearingEditor } from "./editors";
import {
  Badge,
  Empty,
  SearchBox,
  SectionTitle,
  IconButton,
  Form,
  Field,
} from "./ui";
import { day, time, money, Hearing } from "@/lib/types";
import { HearingRow } from "./overview";
export function Cases() {
  const { data } = useStore();
  const [search, setSearch] = useState(""),
    [filter, setFilter] = useState("all"),
    [add, setAdd] = useState(false);
  const rows = data.cases.filter(
    (c) =>
      (filter === "all" || c.status === filter) &&
      `${c.title} ${c.number} ${data.clients.find((x) => x.id === c.client_id)?.name ?? ""}`.includes(
        search,
      ),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>القضايا</h1>
          <p>ملفاتك القانونية، منظمة وفي متناولك.</p>
        </div>
        <button
          className="button primary"
          onClick={() => setAdd(true)}
          disabled={!data.clients.length}
        >
          <Plus size={18} />
          قضية جديدة
        </button>
      </div>
      {!data.clients.length && (
        <p className="alert">
          أضف عميلًا من قسم <Link href="/clients">العملاء</Link> قبل إنشاء قضية.
        </p>
      )}
      <div className="toolbar">
        <SearchBox
          value={search}
          onChange={setSearch}
          placeholder="ابحث عن قضية أو عميل أو رقم قضية"
        />
        <div className="segments">
          {[
            ["all", "الكل"],
            ["active", "متداولة"],
            ["postponed", "مؤجلة"],
            ["closed", "مغلقة"],
          ].map(([v, l]) => (
            <button
              key={v}
              className={filter === v ? "selected" : ""}
              onClick={() => setFilter(v)}
            >
              {l}
            </button>
          ))}
        </div>
      </div>
      <p className="result-count">{rows.length} قضايا</p>
      <div className="case-grid">
        {rows.map((c) => (
          <Link href={`/cases/${c.id}`} className="panel case-card" key={c.id}>
            <div className="case-card-top">
              <span className="case-number">{c.number}</span>
              <Badge status={c.status} />
            </div>
            <h2>{c.title}</h2>
            <p>
              <UserRound size={15} />
              {data.clients.find((x) => x.id === c.client_id)?.name}
            </p>
            <p>
              <MapPin size={15} />
              {c.court}
            </p>
            <div className="case-card-bottom">
              <span>
                <CalendarDays size={14} />
                {day(c.created_at)}
              </span>
              <ChevronLeft size={17} />
            </div>
          </Link>
        ))}
      </div>
      {!rows.length && (
        <Empty
          title="لا توجد قضايا مطابقة"
          text="جرّب تغيير البحث أو أضف قضية جديدة."
        />
      )}
      {add && <CaseEditor onClose={() => setAdd(false)} />}
    </>
  );
}
export function downloadCalendar(h: Hearing, title: string) {
  const date = (s: string) =>
    new Date(s).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const escape = (s: string) =>
    s
      .replace(/\\/g, "\\\\")
      .replace(/\n/g, "\\n")
      .replace(/,/g, "\\,")
      .replace(/;/g, "\\;");
  const text = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//elmtrapp//Legal Calendar//AR",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${h.id}@elmtrapp`,
    `DTSTAMP:${date(new Date().toISOString())}`,
    `DTSTART:${date(h.starts_at)}`,
    `DTEND:${date(new Date(new Date(h.starts_at).getTime() + 3600000).toISOString())}`,
    `SUMMARY:${escape(title + " — " + h.purpose)}`,
    `LOCATION:${escape(h.court)}`,
    `DESCRIPTION:${escape(h.notes)}`,
    "BEGIN:VALARM",
    `TRIGGER:-PT${h.reminder_minutes}M`,
    "ACTION:DISPLAY",
    "DESCRIPTION:جلسة قادمة",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const url = URL.createObjectURL(
    new Blob([text], { type: "text/calendar;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "hearing.ics";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function CaseDetail({ id }: { id: string }) {
  const { data, save, remove, upload, openDocument, setError } = useStore();
  const [tab, setTab] = useState("details"),
    [edit, setEdit] = useState(false),
    [hearing, setHearing] = useState<Hearing | "new" | null>(null),
    [uploading, setUploading] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const c = data.cases.find((x) => x.id === id);
  if (!c)
    return (
      <Empty
        title="القضية غير موجودة"
        action={<Link href="/cases">العودة للقضايا</Link>}
      />
    );
  const client = data.clients.find((x) => x.id === c.client_id);
  const hearings = data.hearings
    .filter((h) => h.case_id === id)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const next = hearings.find((h) => new Date(h.starts_at) > new Date());
  const docs = data.documents.filter((d) => d.case_id === id);
  const notes = data.notes.filter((n) => n.case_id === id);
  return (
    <>
      <div className="page-heading">
        <div>
          <Link className="back-link" href="/cases">
            <ArrowRight size={16} />
            القضايا
          </Link>
          <h1>{c.title}</h1>
          <p>رقم القضية: {c.number}</p>
        </div>
        <div className="actions">
          <Badge status={c.status} />
          <IconButton label="تعديل القضية" onClick={() => setEdit(true)}>
            <Pencil size={17} />
          </IconButton>
        </div>
      </div>
      <div className="detail-layout">
        <section className="panel detail-main">
          <div className="case-facts">
            <Link href={`/clients/${c.client_id}`}>
              <UserRound size={19} />
              <span>
                <small>العميل</small>
                <b>{client?.name}</b>
              </span>
            </Link>
            <div>
              <MapPin size={19} />
              <span>
                <small>المحكمة</small>
                <b>{c.court}</b>
              </span>
            </div>
          </div>
          <div className="tabs" role="tablist">
            {[
              ["details", "التفاصيل"],
              ["hearings", "الجلسات"],
              ["documents", "المستندات"],
            ].map(([v, l]) => (
              <button
                role="tab"
                aria-selected={tab === v}
                key={v}
                onClick={() => setTab(v)}
              >
                {l}
                {v === "documents" && <span>{docs.length}</span>}
              </button>
            ))}
          </div>
          {tab === "details" && (
            <>
              <SectionTitle title="ملخص القضية" />
              <p className="prose">{c.summary || "لم يُضف ملخص بعد."}</p>
              {c.opponent && <p className="muted">الخصم: {c.opponent}</p>}
              {next && (
                <div className="next-hearing">
                  <CalendarDays size={24} />
                  <div>
                    <strong>الجلسة القادمة</strong>
                    <p>
                      {day(next.starts_at)} · {time(next.starts_at)}
                    </p>
                    <small>{next.court}</small>
                  </div>
                  <IconButton
                    label="إضافة الجلسة للتقويم"
                    onClick={() => downloadCalendar(next, c.title)}
                  >
                    <Download size={17} />
                  </IconButton>
                </div>
              )}
              <SectionTitle title="ملاحظات القضية" />
              {notes.map((n) => (
                <div className="note" key={n.id}>
                  <StickyNote size={17} />
                  <div>
                    <p>{n.body}</p>
                    <small>{day(n.created_at)}</small>
                  </div>
                  <IconButton
                    label="حذف الملاحظة"
                    onClick={async () => {
                      if (confirm("حذف هذه الملاحظة؟"))
                        try {
                          await remove("notes", n.id);
                        } catch (e) {
                          setError(String(e));
                        }
                    }}
                  >
                    <Trash2 size={15} />
                  </IconButton>
                </div>
              ))}
              <Form
                resetOnSuccess
                label="إضافة ملاحظة"
                onSubmit={async (f) => {
                  await save("notes", {
                    case_id: id,
                    body: String(f.get("body")),
                  });
                }}
              >
                <Field label="ملاحظة جديدة">
                  <textarea
                    name="body"
                    required
                    placeholder="اكتب ملاحظاتك على القضية..."
                    maxLength={10000}
                  />
                </Field>
              </Form>
            </>
          )}
          {tab === "hearings" && (
            <>
              <SectionTitle
                title="سجل الجلسات"
                action={
                  <button
                    className="text-button"
                    onClick={() => setHearing("new")}
                  >
                    <Plus size={16} />
                    إضافة جلسة
                  </button>
                }
              />
              {hearings.map((h) => (
                <div key={h.id}>
                  <HearingRow item={h} />
                  <div className="small-actions">
                    <button
                      className="text-button"
                      onClick={() => downloadCalendar(h, c.title)}
                    >
                      <Download size={14} />
                      تقويم الجهاز
                    </button>
                    <button
                      className="text-button"
                      onClick={() => setHearing(h)}
                    >
                      <Pencil size={14} />
                      تعديل
                    </button>
                    <button
                      className="text-button danger"
                      onClick={async () => {
                        if (confirm("حذف هذا الموعد؟"))
                          try {
                            await remove("hearings", h.id);
                          } catch (e) {
                            setError(String(e));
                          }
                      }}
                    >
                      حذف
                    </button>
                  </div>
                </div>
              ))}
              {!hearings.length && <Empty title="لم تُسجل جلسات بعد" />}
            </>
          )}
          {tab === "documents" && (
            <>
              <SectionTitle title={`المستندات المرفقة (${docs.length})`} />
              <div className="actions">
                <button
                  className="button"
                  disabled={uploading}
                  onClick={() => input.current?.click()}
                >
                  <Upload size={16} />
                  {uploading ? "جارٍ الرفع..." : "رفع مستند"}
                </button>
                <Link className="button primary" href={`/scanner?case=${id}`}>
                  <ScanLine size={16} />
                  مسح بالكاميرا
                </Link>
              </div>
              <input
                ref={input}
                className="sr-only"
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={async (e) => {
                  const files = Array.from(e.target.files ?? []);
                  setUploading(true);
                  try {
                    for (const file of files) await upload(id, file);
                  } catch (e) {
                    setError(
                      e instanceof Error ? e.message : "تعذر رفع المستند",
                    );
                  } finally {
                    setUploading(false);
                    e.target.value = "";
                  }
                }}
              />
              <div className="document-list">
                {docs.map((d) => (
                  <button
                    className="document-row"
                    key={d.id}
                    onClick={() =>
                      void openDocument(d.id).catch((e) => setError(e.message))
                    }
                  >
                    <FileText size={24} />
                    <span>
                      <strong>{d.name}</strong>
                      <small>
                        {(d.size / 1024).toFixed(0)} KB · {day(d.created_at)}
                      </small>
                    </span>
                    <ChevronLeft size={16} />
                  </button>
                ))}
              </div>
              {!docs.length && (
                <Empty
                  title="لم تُرفق مستندات بعد"
                  text="ارفع مستندًا من جهازك أو استخدم الكاميرا لمسح الأوراق."
                />
              )}
            </>
          )}
        </section>
        <aside className="detail-aside">
          <section className="panel">
            <SectionTitle title="بيانات الملف" />
            <dl className="data-list">
              <div>
                <dt>تاريخ الإنشاء</dt>
                <dd>{day(c.created_at)}</dd>
              </div>
              <div>
                <dt>أتعاب القضية</dt>
                <dd>{money(c.fee)} ج.م</dd>
              </div>
              <div>
                <dt>الجلسات</dt>
                <dd>{hearings.length}</dd>
              </div>
              <div>
                <dt>المستندات</dt>
                <dd>{docs.length}</dd>
              </div>
            </dl>
            <Link className="button full" href={`/clients/${c.client_id}`}>
              عرض حساب العميل <ChevronLeft size={15} />
            </Link>
          </section>
          <Link href={`/assistant?case=${id}`} className="assistant-promo">
            <strong>رؤية أوضح لملف قضيتك</strong>
            <span>ناقش تفاصيل القضية مع المساعد القانوني</span>
            <b>
              فتح المساعد <ChevronLeft size={15} />
            </b>
          </Link>
        </aside>
      </div>
      {edit && <CaseEditor item={c} onClose={() => setEdit(false)} />}{" "}
      {hearing && (
        <HearingEditor
          item={hearing === "new" ? undefined : hearing}
          caseId={id}
          onClose={() => setHearing(null)}
        />
      )}
    </>
  );
}
