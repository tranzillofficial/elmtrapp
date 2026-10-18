"use client";
import { useStore } from "./provider";
import { Field, Form, Modal, str } from "./ui";
import { Case, Client, Hearing, Payment, balance, money } from "@/lib/types";
export function ClientEditor({
  item,
  onClose,
}: {
  item?: Client;
  onClose: () => void;
}) {
  const { save } = useStore();
  return (
    <Modal title={item ? "تعديل العميل" : "إضافة عميل جديد"} onClose={onClose}>
      <Form
        onCancel={onClose}
        onSubmit={async (f) => {
          await save(
            "clients",
            {
              name: str(f, "name"),
              phone: str(f, "phone"),
              email: str(f, "email"),
              address: str(f, "address"),
              notes: str(f, "notes"),
              opening_balance: Number(f.get("opening_balance")),
            },
            item?.id,
          );
          onClose();
        }}
      >
        <Field label="اسم العميل">
          <input
            name="name"
            required
            maxLength={150}
            defaultValue={item?.name}
          />
        </Field>
        <div className="form-grid">
          <Field label="رقم الهاتف">
            <input
              name="phone"
              type="tel"
              dir="ltr"
              defaultValue={item?.phone}
            />
          </Field>
          <Field label="البريد الإلكتروني">
            <input
              name="email"
              type="email"
              dir="ltr"
              defaultValue={item?.email}
            />
          </Field>
        </div>
        <Field label="العنوان">
          <input name="address" defaultValue={item?.address} />
        </Field>
        <Field label="رصيد مستحق سابق (ج.م)">
          <input
            name="opening_balance"
            type="number"
            min="0"
            max="999999999"
            step="0.01"
            defaultValue={item?.opening_balance ?? 0}
          />
        </Field>
        <Field label="ملاحظات">
          <textarea name="notes" defaultValue={item?.notes} />
        </Field>
      </Form>
    </Modal>
  );
}
export function CaseEditor({
  item,
  clientId,
  onClose,
}: {
  item?: Case;
  clientId?: string;
  onClose: () => void;
}) {
  const { data, save } = useStore();
  return (
    <Modal title={item ? "تعديل القضية" : "إنشاء قضية جديدة"} onClose={onClose}>
      <Form
        onCancel={onClose}
        onSubmit={async (f) => {
          await save(
            "cases",
            {
              title: str(f, "title"),
              number: str(f, "number"),
              client_id: str(f, "client_id"),
              court: str(f, "court"),
              opponent: str(f, "opponent"),
              fee: Number(f.get("fee")),
              summary: str(f, "summary"),
              status: str(f, "status") as Case["status"],
            },
            item?.id,
          );
          onClose();
        }}
      >
        <Field label="عنوان القضية">
          <input
            name="title"
            required
            maxLength={200}
            defaultValue={item?.title}
          />
        </Field>
        <div className="form-grid">
          <Field label="رقم القضية / السنة">
            <input name="number" required defaultValue={item?.number} />
          </Field>
          <Field label="الحالة">
            <select name="status" defaultValue={item?.status ?? "active"}>
              <option value="active">متداولة</option>
              <option value="postponed">مؤجلة</option>
              <option value="closed">مغلقة</option>
            </select>
          </Field>
        </div>
        <Field label="العميل">
          <select
            name="client_id"
            required
            defaultValue={item?.client_id ?? clientId ?? ""}
            disabled={!!item}
          >
            <option value="">اختر العميل</option>
            {data.clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {item && (
            <input type="hidden" name="client_id" value={item.client_id} />
          )}
        </Field>
        <div className="form-grid">
          <Field label="المحكمة">
            <input name="court" required defaultValue={item?.court} />
          </Field>
          <Field label="الخصم">
            <input name="opponent" defaultValue={item?.opponent} />
          </Field>
        </div>
        <Field label="أتعاب القضية (ج.م)">
          <input
            name="fee"
            type="number"
            min="0"
            max="999999999"
            step="0.01"
            defaultValue={item?.fee ?? 0}
            required
          />
        </Field>
        <Field label="ملخص القضية">
          <textarea
            name="summary"
            rows={4}
            maxLength={20000}
            defaultValue={item?.summary}
          />
        </Field>
      </Form>
    </Modal>
  );
}
export function HearingEditor({
  item,
  caseId,
  onClose,
}: {
  item?: Hearing;
  caseId?: string;
  onClose: () => void;
}) {
  const { data, save } = useStore();
  const localDate = (s: string) => {
    const d = new Date(s);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
  };
  return (
    <Modal title={item ? "تعديل الجلسة" : "إضافة موعد جديد"} onClose={onClose}>
      <Form
        onCancel={onClose}
        onSubmit={async (f) => {
          await save(
            "hearings",
            {
              case_id: str(f, "case_id"),
              starts_at: new Date(str(f, "starts_at")).toISOString(),
              court: str(f, "court"),
              purpose: str(f, "purpose"),
              notes: str(f, "notes"),
              reminder_minutes: Number(f.get("reminder_minutes")),
            },
            item?.id,
          );
          onClose();
        }}
      >
        <Field label="القضية">
          <select
            name="case_id"
            required
            defaultValue={item?.case_id ?? caseId ?? ""}
          >
            <option value="">اختر القضية</option>
            {data.cases.map((c) => (
              <option value={c.id} key={c.id}>
                {c.title} — {c.number}
              </option>
            ))}
          </select>
        </Field>
        <Field label="التاريخ والوقت">
          <input
            name="starts_at"
            type="datetime-local"
            required
            defaultValue={item ? localDate(item.starts_at) : undefined}
          />
        </Field>
        <Field label="المحكمة / مكان الموعد">
          <input
            name="court"
            required
            defaultValue={
              item?.court ?? data.cases.find((c) => c.id === caseId)?.court
            }
          />
        </Field>
        <Field label="غرض الجلسة">
          <input name="purpose" required defaultValue={item?.purpose} />
        </Field>
        <Field label="التذكير">
          <select
            name="reminder_minutes"
            defaultValue={item?.reminder_minutes ?? 60}
          >
            <option value="0">وقت الموعد</option>
            <option value="30">قبل نصف ساعة</option>
            <option value="60">قبل ساعة</option>
            <option value="120">قبل ساعتين</option>
            <option value="1440">قبل يوم</option>
          </select>
        </Field>
        <p className="hint">
          أضف الموعد إلى تقويم جهازك لتلقي التذكير حتى عند إغلاق التطبيق.
        </p>
        <Field label="ملاحظات">
          <textarea name="notes" defaultValue={item?.notes} />
        </Field>
      </Form>
    </Modal>
  );
}
export function PaymentEditor({
  clientId,
  item,
  onClose,
}: {
  clientId: string;
  item?: Payment;
  onClose: () => void;
}) {
  const { data, save } = useStore();
  const remaining = balance(data, clientId) + Number(item?.amount ?? 0);
  return (
    <Modal title={item ? "تعديل دفعة" : "تسجيل دفعة"} onClose={onClose}>
      <p className="payment-context">
        {data.clients.find((c) => c.id === clientId)?.name}{" "}
        <strong>المتبقي {money(remaining)} ج.م</strong>
      </p>
      <p className="hint">
        تُخصم الدفعة من إجمالي حساب العميل، وتشمل كل قضاياه.
      </p>
      <Form
        onCancel={onClose}
        onSubmit={async (f) => {
          await save(
            "payments",
            {
              client_id: clientId,
              amount: Number(f.get("amount")),
              method: str(f, "method"),
              paid_at: new Date(str(f, "paid_at") + "T12:00:00").toISOString(),
              notes: str(f, "notes"),
            },
            item?.id,
          );
          onClose();
        }}
      >
        <Field label="المبلغ (ج.م)">
          <input
            name="amount"
            type="number"
            required
            min="0.01"
            step="0.01"
            max={remaining}
            defaultValue={item?.amount}
            autoFocus
          />
        </Field>
        <div className="form-grid">
          <Field label="تاريخ السداد">
            <input
              name="paid_at"
              type="date"
              required
              defaultValue={(item?.paid_at ?? new Date().toISOString()).slice(
                0,
                10,
              )}
            />
          </Field>
          <Field label="طريقة السداد">
            <select name="method" defaultValue={item?.method ?? "نقدي"}>
              <option>نقدي</option>
              <option>تحويل بنكي</option>
              <option>محفظة إلكترونية</option>
              <option>أخرى</option>
            </select>
          </Field>
        </div>
        <Field label="ملاحظات">
          <textarea name="notes" defaultValue={item?.notes} />
        </Field>
      </Form>
    </Modal>
  );
}
