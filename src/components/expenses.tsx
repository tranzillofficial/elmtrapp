"use client";
import { useState } from "react";
import { useStore } from "./provider";
import { Modal, Form, Field, str, IconButton } from "./ui";
import { expenseCategories, money, day, type Expense } from "@/lib/types";
import { cairoDate } from "@/lib/power-alerts";
import { Pencil, Trash2 } from "lucide-react";
export function Expenses({
  clientId,
  caseId,
}: {
  clientId: string;
  caseId?: string;
}) {
  const { data, office, remove, setError } = useStore();
  const [editor, setEditor] = useState<Expense | "new" | null>(null);
  const allowed = !office.member || office.permissions.includes("payments");
  const writable =
    allowed && (!office.member || office.permissions.includes("write"));
  if (!allowed) return null;
  const rows = data.expenses
    .filter(
      (e) => e.client_id === clientId && (!caseId || e.case_id === caseId),
    )
    .toSorted((a, b) => b.spent_on.localeCompare(a.spent_on));
  return (
    <section className="panel expense-section">
      <div className="section-title">
        <h2>المصروفات</h2>
        {writable && (
          <button className="button" onClick={() => setEditor("new")}>
            تسجيل مصروف
          </button>
        )}
      </div>
      <p className="hint">
        على الموكل:{" "}
        {money(
          rows
            .filter((e) => e.billing === "client")
            .reduce((s, e) => s + Number(e.amount), 0),
        )}{" "}
        ج.م · على المكتب:{" "}
        {money(
          rows
            .filter((e) => e.billing === "office")
            .reduce((s, e) => s + Number(e.amount), 0),
        )}{" "}
        ج.م
      </p>
      {rows.map((e) => (
        <div className="expense-row" key={e.id}>
          <div className="row-main">
            <strong>{e.description}</strong>
            <small>
              {expenseCategories[e.category]} · {day(`${e.spent_on}T12:00:00`)}{" "}
              · {e.billing === "client" ? "مستحق على الموكل" : "على المكتب"}
            </small>
          </div>
          <b>{money(e.amount)} ج.م</b>
          {writable && (
            <>
              <IconButton label="تعديل المصروف" onClick={() => setEditor(e)}>
                <Pencil size={15} />
              </IconButton>
              <IconButton
                label="حذف المصروف"
                onClick={async () => {
                  if (confirm("حذف المصروف وتحديث الحساب؟"))
                    try {
                      await remove("expenses", e.id);
                    } catch (err) {
                      setError(
                        err instanceof Error ? err.message : "تعذر الحذف",
                      );
                    }
                }}
              >
                <Trash2 size={15} />
              </IconButton>
            </>
          )}
        </div>
      ))}
      {!rows.length && <p className="hint">لا توجد مصروفات مسجلة.</p>}
      {editor && (
        <ExpenseEditor
          clientId={clientId}
          caseId={caseId}
          item={editor === "new" ? undefined : editor}
          onClose={() => setEditor(null)}
        />
      )}
    </section>
  );
}
export function ExpenseEditor({
  clientId,
  caseId,
  item,
  onClose,
}: {
  clientId: string;
  caseId?: string;
  item?: Expense;
  onClose: () => void;
}) {
  const { data, save } = useStore();
  return (
    <Modal title={item ? "تعديل المصروف" : "تسجيل مصروف"} onClose={onClose}>
      <Form
        onCancel={onClose}
        onSubmit={async (f) => {
          await save(
            "expenses",
            {
              client_id: clientId,
              case_id: caseId || str(f, "case_id") || null,
              amount: Number(f.get("amount")),
              category: str(f, "category") as Expense["category"],
              billing: str(f, "billing") as Expense["billing"],
              description: str(f, "description"),
              spent_on: str(f, "spent_on"),
            },
            item?.id,
          );
          onClose();
        }}
      >
        <Field label="بيان المصروف">
          <input
            name="description"
            required
            maxLength={1000}
            defaultValue={item?.description}
          />
        </Field>
        <div className="form-grid">
          <Field label="المبلغ (ج.م)">
            <input
              name="amount"
              type="number"
              min="0.01"
              max="999999999"
              step="0.01"
              required
              defaultValue={item?.amount ?? ""}
            />
          </Field>
          <Field label="تاريخ المصروف">
            <input
              type="date"
              name="spent_on"
              required
              defaultValue={item?.spent_on ?? cairoDate()}
            />
          </Field>
        </div>
        <div className="form-grid">
          <Field label="نوع المصروف">
            <select name="category" defaultValue={item?.category ?? "court"}>
              {Object.entries(expenseCategories).map(([v, l]) => (
                <option value={v} key={v}>
                  {l}
                </option>
              ))}
            </select>
          </Field>
          <Field label="يتحمل المصروف">
            <select name="billing" defaultValue={item?.billing ?? "client"}>
              <option value="client">الموكل</option>
              <option value="office">المكتب</option>
            </select>
          </Field>
        </div>
        {!caseId && (
          <Field label="القضية (اختياري)">
            <select name="case_id" defaultValue={item?.case_id ?? ""}>
              <option value="">بدون قضية محددة</option>
              {data.cases
                .filter((c) => c.client_id === clientId)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title} · {c.number}
                  </option>
                ))}
            </select>
          </Field>
        )}
        <p className="hint">
          مصروفات الموكل تضاف للمستحقات. مصروفات المكتب لا تزيد المبلغ المطلوب
          منه.
        </p>
      </Form>
    </Modal>
  );
}
