"use client";
import Link from "next/link";
import { useState } from "react";
import { useStore } from "./provider";
import { day, time, money } from "@/lib/types";
import { Empty } from "./ui";
import { SharePdf } from "./share-pdf";
export function CaseHub({
  id,
  onHearing,
  onNote,
  onDocuments,
  onExpense,
}: {
  id: string;
  onHearing: () => void;
  onNote: () => void;
  onDocuments: () => void;
  onExpense: () => void;
}) {
  const { data, office, openDocument, setError } = useStore();
  const [all, setAll] = useState(false);
  const c = data.cases.find((c) => c.id === id);
  if (!c) return null;
  const can = (feature: string) =>
    !office.member || office.permissions.includes(feature);
  const write = (feature: string) =>
    can(feature) && (!office.member || office.permissions.includes("write"));
  const hearings = data.hearings
    .filter((h) => h.case_id === id)
    .toSorted((a, b) => a.starts_at.localeCompare(b.starts_at));
  const next = hearings.find((h) => new Date(h.starts_at) >= new Date());
  const notes = data.notes
    .filter((n) => n.case_id === id)
    .toSorted((a, b) => b.created_at.localeCompare(a.created_at));
  const docs = data.documents
    .filter((d) => d.case_id === id)
    .toSorted((a, b) => b.created_at.localeCompare(a.created_at));
  const events = [
    {
      id: c.id,
      date: c.created_at,
      title: "إنشاء ملف القضية",
      detail: c.number,
    },
    ...hearings.map((h) => ({
      id: h.id,
      date: h.created_at,
      title: "تسجيل جلسة",
      detail: `${day(h.starts_at)} · ${time(h.starts_at)} · ${h.purpose}`,
    })),
    ...notes.map((n) => ({
      id: n.id,
      date: n.created_at,
      title: "إضافة ملاحظة",
      detail: n.body,
    })),
    ...docs.map((d) => ({
      id: d.id,
      date: d.created_at,
      title: "إرفاق مستند",
      detail: d.name,
    })),
    ...(can("payments")
      ? data.expenses
          .filter((e) => e.case_id === id)
          .map((e) => ({
            id: e.id,
            date: e.created_at,
            title: "تسجيل مصروف",
            detail: `${e.description} · ${money(e.amount)} ج.م · ${e.billing === "client" ? "على الموكل" : "على المكتب"}`,
          }))
      : []),
  ].toSorted((a, b) => b.date.localeCompare(a.date));
  return (
    <>
      <div className="case-quick-actions" aria-label="إجراءات القضية">
        {write("hearings") && (
          <button className="button primary" onClick={onHearing}>
            تسجيل جلسة
          </button>
        )}
        {write("notes") && (
          <button className="button" onClick={onNote}>
            ملاحظة سريعة
          </button>
        )}
        {write("documents") && (
          <button className="button" onClick={onDocuments}>
            إرفاق مستند
          </button>
        )}
        {write("payments") && (
          <button className="button" onClick={onExpense}>
            تسجيل مصروف للقضية
          </button>
        )}
      </div>
      <div className="panel case-hub-context">
        <Link href={`/clients/${c.client_id}`}>
          الموكل:{" "}
          {data.clients.find((x) => x.id === c.client_id)?.name ??
            "حساب الموكل"}
        </Link>
        <span>المحكمة: {c.court}</span>
        {c.district_court && <span>المحكمة الجزئية: {c.district_court}</span>}
      </div>
      <div className="case-hub-grid">
        {can("hearings") && (
          <section className="panel">
            <h2>الجلسة القادمة</h2>
            {next ? (
              <>
                <strong>
                  {day(next.starts_at)} · {time(next.starts_at)}
                </strong>
                <p>{next.court}</p>
                <p className="hint">{next.purpose}</p>
              </>
            ) : (
              <p className="hint">لم تُسجل جلسة قادمة.</p>
            )}
          </section>
        )}
        {can("notes") && (
          <section className="panel">
            <h2>آخر ملاحظة</h2>
            <p className="case-latest-note">
              {notes[0]?.body ?? "لا توجد ملاحظات بعد."}
            </p>
            {notes[0] && (
              <small className="hint">{day(notes[0].created_at)}</small>
            )}
          </section>
        )}
        {can("documents") && (
          <section className="panel">
            <div className="section-title">
              <h2>أحدث المستندات ({docs.length})</h2>
            </div>
            {docs.slice(0, 2).map((d) => (
              <div className="hub-document" key={d.id}>
                <button
                  className="text-button"
                  onClick={() =>
                    void openDocument(d.id).catch((e) => setError(e.message))
                  }
                >
                  {d.name}
                </button>
                <SharePdf paths={[d.path]} name={d.name} />
              </div>
            ))}
            {!docs.length && <p className="hint">لم تُرفق مستندات بعد.</p>}
          </section>
        )}
      </div>
      <section className="panel case-timeline">
        <div className="section-title">
          <h2>السجل الزمني للقضية</h2>
          {events.length > 8 && (
            <button className="text-button" onClick={() => setAll(!all)}>
              {all ? "عرض أقل" : `عرض الكل (${events.length})`}
            </button>
          )}
        </div>
        <ol>
          {events.slice(0, all ? undefined : 8).map((e, i) => (
            <li key={`${e.title}-${e.id}-${i}`}>
              <time>{day(e.date)}</time>
              <div>
                <strong>{e.title}</strong>
                <p>{e.detail}</p>
              </div>
            </li>
          ))}
        </ol>
        {!events.length && <Empty title="لا توجد أحداث" />}
      </section>
    </>
  );
}
