"use client";
import { useRef } from "react";
import { cairoDate } from "@/lib/power-alerts";
import { Modal } from "./ui";
import { useStore } from "./provider";
import { balance, totalFees, paid, money, day } from "@/lib/types";
export function AccountReport({
  id,
  onClose,
}: {
  id: string;
  onClose: () => void;
}) {
  const { data, profile, office, setError } = useStore();
  const ref = useRef<HTMLDivElement>(null);
  const client = data.clients.find((c) => c.id === id);
  const allowed =
    !office.member ||
    ["clients", "cases", "payments"].every((p) =>
      office.permissions.includes(p),
    );
  if (!client || !allowed)
    return (
      <Modal title="كشف حساب الموكل" onClose={onClose}>
        <p>يلزم الوصول للعملاء والقضايا والدفعات لعرض كشف حساب كامل.</p>
      </Modal>
    );
  const entries = [
    ...(client.opening_balance
      ? [
          {
            id: "opening",
            date: cairoDate(new Date(client.created_at)),
            description: "رصيد افتتاحي مستحق",
            debit: Number(client.opening_balance),
            credit: 0,
            notes: "",
          },
        ]
      : []),
    ...data.cases
      .filter((c) => c.client_id === id)
      .map((c) => ({
        id: c.id,
        date: cairoDate(new Date(c.created_at)),
        description: `أتعاب قضية: ${c.title} (${c.number})`,
        debit: Number(c.fee),
        credit: 0,
        notes: "",
      })),
    ...data.payments
      .filter((p) => p.client_id === id)
      .map((p) => ({
        id: p.id,
        date: cairoDate(new Date(p.paid_at)),
        description: `${p.kind === "advance" ? "دفعة مقدمة" : "دفعة سداد"} · ${p.method}`,
        debit: 0,
        credit: Number(p.amount),
        notes: p.notes,
      })),
  ].toSorted(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      Number(b.credit === 0) - Number(a.credit === 0) ||
      a.id.localeCompare(b.id),
  );
  const rows = withRunningBalance(entries);
  const print = () => {
    const win = window.open("about:blank", "_blank");
    if (!win) {
      setError("اسمح بفتح نافذة الطباعة من المتصفح ثم حاول مجددًا");
      return;
    }
    win.opener = null;
    const doc = win.document;
    doc.documentElement.lang = "ar";
    doc.documentElement.dir = "rtl";
    doc.title = `كشف حساب - ${client.name}`;
    const meta = doc.createElement("meta");
    meta.name = "viewport";
    meta.content = "width=device-width, initial-scale=1";
    doc.head.append(meta);
    const style = doc.createElement("style");
    style.textContent = `body{font:14px Tahoma,Arial,sans-serif;color:#172b38;background:white;margin:24px auto;max-width:950px;padding:0 16px;line-height:1.8}h1{font-size:23px;margin:8px 0}h2{font-size:18px}.statement-summary{display:flex;flex-wrap:wrap;gap:20px;border-block:1px solid #ccc;padding:10px 0}.statement-summary b{display:block}table{width:100%;border-collapse:collapse;margin:18px 0;font-size:12px}th,td{border:1px solid #ccd4d8;padding:8px;text-align:right;overflow-wrap:anywhere}th{background:#edf6f5}thead{display:table-header-group}tr{break-inside:avoid}small{display:block;color:#52636d}.statement-footer{border-top:1px solid #ccc;margin-top:18px}button{padding:10px 16px;font:inherit;cursor:pointer;background:#087f8c;color:white;border:0;border-radius:5px}@page{size:A4;margin:14mm}@media print{body{margin:0;padding:0;max-width:none}.print-toolbar{display:none}}`;
    doc.head.append(style);
    const toolbar = doc.createElement("div");
    toolbar.className = "print-toolbar";
    const hint = doc.createElement("p");
    hint.textContent = "للتصدير PDF، اختر «حفظ بصيغة PDF» من نافذة الطباعة.";
    const button = doc.createElement("button");
    button.textContent = "طباعة / حفظ PDF";
    button.onclick = () => win.print();
    toolbar.append(hint, button);
    doc.body.append(toolbar);
    if (ref.current) doc.body.append(ref.current.cloneNode(true));
    win.focus();
  };
  return (
    <Modal title="كشف حساب الموكل" onClose={onClose}>
      <p className="hint">
        كشف كامل لكل الأتعاب والدفعات المسجلة. من الطباعة اختَر حفظ بصيغة PDF
        لتصدير نسخة.
      </p>
      <button className="button primary" onClick={print}>
        طباعة / حفظ PDF
      </button>
      <div className="statement-preview" ref={ref}>
        <header>
          <p>
            {profile.office_name} · {profile.full_name}
          </p>
          <h1>كشف حساب الموكل</h1>
          <h2>{client.name}</h2>
          {client.phone && (
            <p>
              الهاتف: <bdi>{client.phone}</bdi>
            </p>
          )}
          <p>
            تاريخ الإصدار: {day(new Date().toISOString())} · العملة: جنيه مصري
          </p>
        </header>
        <div className="statement-summary">
          <span>
            إجمالي الأتعاب والرصيد الافتتاحي
            <b>{money(totalFees(data, id))} ج.م</b>
          </span>
          <span>
            إجمالي المدفوع<b>{money(paid(data, id))} ج.م</b>
          </span>
          <span>
            المتبقي<b>{money(balance(data, id))} ج.م</b>
          </span>
        </div>
        <div className="statement-table-wrap">
          <table>
            <thead>
              <tr>
                {["التاريخ", "البيان", "مستحق", "مدفوع", "الرصيد"].map((t) => (
                  <th key={t}>{t}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{day(`${r.date}T12:00:00`)}</td>
                  <td>
                    {r.description}
                    {r.notes && <small>{r.notes}</small>}
                  </td>
                  <td>{money(r.debit)}</td>
                  <td>{money(r.credit)}</td>
                  <td>{money(r.running)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th colSpan={2}>الإجمالي</th>
                <th>{money(totalFees(data, id))}</th>
                <th>{money(paid(data, id))}</th>
                <th>{money(balance(data, id))}</th>
              </tr>
            </tfoot>
          </table>
        </div>
        {!rows.length && <p>لا توجد حركات مالية مسجلة.</p>}
        <p className="statement-footer">
          الدفعات تخص حساب الموكل بالكامل. الأرقام حسب البيانات المسجلة وقت
          إصدار الكشف.
        </p>
      </div>
    </Modal>
  );
}

function withRunningBalance<T extends { debit: number; credit: number }>(
  entries: T[],
) {
  let cents = 0;
  const rows: Array<T & { running: number }> = [];
  for (const entry of entries) {
    cents += Math.round(entry.debit * 100) - Math.round(entry.credit * 100);
    rows.push({ ...entry, running: cents / 100 });
  }
  return rows;
}
