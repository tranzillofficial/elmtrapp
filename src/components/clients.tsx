"use client";
import { Expenses } from "./expenses";
import { AccountReport } from "./account-report";
import { ClientFiles } from "./client-files";
import { useState } from "react";
import Link from "next/link";
import {
  Plus,
  Phone,
  IdCard,
  MapPin,
  ChevronLeft,
  Pencil,
  ArrowRight,
  Wallet,
  UserRound,
  Trash2,
} from "lucide-react";
import { useStore } from "./provider";
import { ClientEditor, PaymentEditor, CaseEditor } from "./editors";
import { SearchBox, Empty, SectionTitle, IconButton, Badge } from "./ui";
import {
  balance,
  paid,
  totalFees,
  money,
  day,
  Payment,
  accountLabel,
} from "@/lib/types";
export function Clients() {
  const { data } = useStore();
  const [search, setSearch] = useState(""),
    [add, setAdd] = useState(false);
  const rows = data.clients.filter((c) =>
    `${c.name} ${c.phone} ${c.national_id ?? ""}`.includes(search),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>العملاء</h1>
          <p>علاقات موثوقة وحسابات واضحة.</p>
        </div>
        <button className="button primary" onClick={() => setAdd(true)}>
          <Plus size={18} />
          إضافة عميل
        </button>
      </div>
      <SearchBox
        value={search}
        onChange={setSearch}
        placeholder="ابحث بالاسم أو الهاتف أو الرقم القومي"
      />
      <p className="result-count">{rows.length} عملاء</p>
      <div className="client-grid">
        {rows.map((c) => (
          <Link
            href={`/clients/${c.id}`}
            className="panel client-card"
            key={c.id}
          >
            <div className="client-card-head">
              <span className="avatar">{c.name[0]}</span>
              <div>
                <h2>{c.name}</h2>
                <span dir="ltr">{c.phone || "لم يُضف هاتف"}</span>
              </div>
              <ChevronLeft size={17} />
            </div>
            <div className="client-card-account">
              <span>
                {accountLabel(balance(data, c.id))}
                <strong>
                  {money(Math.abs(balance(data, c.id)))} <small>ج.م</small>
                </strong>
              </span>
              <span>
                القضايا
                <strong>
                  {data.cases.filter((x) => x.client_id === c.id).length}
                </strong>
              </span>
            </div>
          </Link>
        ))}
      </div>
      {!rows.length && <Empty title="لا يوجد عملاء مطابقون" />}
      {add && <ClientEditor onClose={() => setAdd(false)} />}
    </>
  );
}
export function ClientDetail({ id }: { id: string }) {
  const { data, remove, setError, office } = useStore();
  const [report, setReport] = useState(false);
  const [edit, setEdit] = useState(false),
    [payment, setPayment] = useState<Payment | "new" | null>(null),
    [newCase, setNewCase] = useState(false);
  const c = data.clients.find((x) => x.id === id);
  if (!c)
    return (
      <Empty
        title="العميل غير موجود"
        action={<Link href="/clients">العودة للعملاء</Link>}
      />
    );
  const cases = data.cases.filter((x) => x.client_id === id);
  const payments = data.payments
    .filter((x) => x.client_id === id)
    .sort((a, b) => b.paid_at.localeCompare(a.paid_at));
  return (
    <>
      <div className="page-heading">
        <div>
          <Link className="back-link" href="/clients">
            <ArrowRight size={16} />
            العملاء
          </Link>
          <h1>حساب العميل</h1>
        </div>
        <IconButton label="تعديل بيانات العميل" onClick={() => setEdit(true)}>
          <Pencil size={18} />
        </IconButton>
      </div>
      <div className="detail-layout">
        <section className="panel">
          <div className="client-profile">
            <div className="avatar large">{c.name[0]}</div>
            <div>
              <h2>{c.name}</h2>
              {c.phone && (
                <a dir="ltr" href={`tel:${c.phone}`}>
                  <Phone size={14} />
                  {c.phone}
                </a>
              )}
              {c.national_id && (
                <p className="client-national-id">
                  <IdCard size={14} />
                  <span>
                    الرقم القومي: <bdi>{c.national_id}</bdi>
                  </span>
                </p>
              )}
              {c.address && (
                <p>
                  <MapPin size={14} />
                  {c.address}
                </p>
              )}
            </div>
          </div>
          <div className="account-stats">
            {[
              ["إجمالي المستحقات", totalFees(data, id)],
              ["المدفوع", paid(data, id)],
              [accountLabel(balance(data, id)), Math.abs(balance(data, id))],
            ].map(([l, v]) => (
              <div key={l}>
                <span>{l}</span>
                <strong>{money(Number(v))}</strong>
                <small>ج.م</small>
              </div>
            ))}
          </div>
          <button
            className="button primary full"
            onClick={() => setPayment("new")}
          >
            <Wallet size={17} />
            تسجيل دفعة
          </button>
          {(!office.member ||
            ["clients", "cases", "payments"].every((p) =>
              office.permissions.includes(p),
            )) && (
            <button
              className="button full account-report-button"
              onClick={() => setReport(true)}
            >
              تصدير أو طباعة كشف حساب PDF
            </button>
          )}
          <SectionTitle title="سجل المدفوعات" />
          {payments.length ? (
            <div className="payment-list">
              {payments.map((p) => (
                <div className="payment-row" key={p.id}>
                  <div className="mini-icon green">
                    <Wallet size={17} />
                  </div>
                  <div className="row-main">
                    <strong>
                      {p.kind === "advance" ? "دفعة مقدمة" : "دفعة سداد"} ·{" "}
                      {p.method}
                    </strong>
                    <span>{day(p.paid_at)}</span>
                    {p.notes && <small>{p.notes}</small>}
                  </div>
                  <strong className="amount">
                    {money(p.amount)} <small>ج.م</small>
                  </strong>
                  <IconButton
                    label="تعديل الدفعة"
                    onClick={() => setPayment(p)}
                  >
                    <Pencil size={15} />
                  </IconButton>
                  <IconButton
                    label="حذف الدفعة"
                    onClick={async () => {
                      if (confirm("حذف هذه الدفعة وإعادة المبلغ للمتبقي؟"))
                        try {
                          await remove("payments", p.id);
                        } catch (e) {
                          setError(
                            e instanceof Error ? e.message : "تعذر حذف الدفعة",
                          );
                        }
                    }}
                  >
                    <Trash2 size={15} />
                  </IconButton>
                </div>
              ))}
            </div>
          ) : (
            <Empty title="لا توجد دفعات مسجلة" />
          )}
        </section>
        <aside>
          <Expenses clientId={id} />
          <ClientFiles id={id} />
          <section className="panel">
            <SectionTitle
              title={`القضايا المرتبطة (${cases.length})`}
              action={
                <button
                  className="text-button"
                  onClick={() => setNewCase(true)}
                >
                  <Plus size={15} />
                  إضافة
                </button>
              }
            />
            {cases.map((x) => (
              <Link href={`/cases/${x.id}`} className="linked-case" key={x.id}>
                <div>
                  <strong>{x.title}</strong>
                  <span>{x.number}</span>
                </div>
                <Badge status={x.status} />
              </Link>
            ))}
            {!cases.length && <Empty title="لا توجد قضايا مرتبطة" />}
          </section>
          {c.notes && (
            <section className="panel">
              <SectionTitle title="ملاحظات العميل" />
              <p className="prose">{c.notes}</p>
            </section>
          )}
          <p className="hint inline-icon">
            <UserRound size={14} />
            الدفعات تخص الحساب بالكامل، ولا تُربط بقضية محددة.
          </p>
        </aside>
      </div>
      {report && <AccountReport id={id} onClose={() => setReport(false)} />}
      {edit && <ClientEditor item={c} onClose={() => setEdit(false)} />}{" "}
      {payment && (
        <PaymentEditor
          clientId={id}
          item={payment === "new" ? undefined : payment}
          onClose={() => setPayment(null)}
        />
      )}{" "}
      {newCase && (
        <CaseEditor clientId={id} onClose={() => setNewCase(false)} />
      )}
    </>
  );
}
