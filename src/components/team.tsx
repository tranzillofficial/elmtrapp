"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { usePricing } from "@/lib/pricing";
import { useStore } from "./provider";
import { Field, Form, str } from "./ui";
const modules = [
  ["clients", "العملاء"],
  ["cases", "القضايا"],
  ["hearings", "الجلسات"],
  ["notes", "الملاحظات"],
  ["payments", "المدفوعات"],
  ["documents", "المستندات"],
  ["library", "مرجع القانون"],
  ["assistant", "المساعد"],
  ["write", "الإضافة والتعديل والحذف"],
];
type Member = {
  id: string;
  user_id: string;
  display_name: string;
  permissions: string[];
  active: boolean;
};
type License = {
  seat_limit: number;
  expires_at: string | null;
  billing: string;
  price_per_seat: number;
};
export function TeamSettings() {
  const { demo, office, setError, setNotice } = useStore(),
    price = usePricing();
  const [members, setMembers] = useState<Member[]>([]),
    [license, setLicense] = useState<License | null>(null),
    [features, setFeatures] = useState<string[]>(["clients", "cases"]);
  useEffect(() => {
    if (demo) {
      const frame = requestAnimationFrame(() => {
        try {
          setMembers(
            JSON.parse(localStorage.getItem("elmtrapp-demo-team-v1") ?? "[]"),
          );
        } catch {
          setMembers([]);
        }
      });
      return () => cancelAnimationFrame(frame);
    }
    if (office.member) return;
    let active = true;
    void Promise.all([
      supabase?.from("office_members").select("*"),
      supabase
        ?.from("office_licenses")
        .select("*")
        .eq("owner_id", office.owner_id)
        .maybeSingle(),
    ]).then(([m, l]) => {
      if (active) {
        if (m?.error || l?.error)
          setError(m?.error?.message ?? l?.error?.message ?? "");
        else {
          setMembers(m?.data ?? []);
          setLicense(l?.data ?? null);
        }
      }
    });
    return () => {
      active = false;
    };
  }, [demo, office.member, office.owner_id, setError]);
  if (office.member)
    return (
      <section className="panel">
        <h2>حساب فريق المكتب</h2>
        <p>
          صلاحياتك يحددها صاحب المكتب.{" "}
          {office.permissions.includes("write")
            ? "يسمح لك بالتعديل في الأقسام المفعلة."
            : "حسابك للقراءة فقط."}
        </p>
      </section>
    );
  return (
    <>
      <section className="panel">
        <h2>فريق المكتب والحسابات الفرعية</h2>
        <p className="hint">
          {price.seatMonthly} جنيه للحساب شهريًا أو {price.seatAnnual} سنويًا.
          يفعّل الأدمن عدد الحسابات والمدة، ويمكنه تحديد سعر خاص للمكتب.
        </p>
        <p>
          {demo
            ? "تجربة محلية — لا تُنشئ حسابات حقيقية"
            : license?.expires_at && new Date(license.expires_at) > new Date()
              ? `${license.seat_limit} حسابات مفعلة حتى ${new Date(license.expires_at).toLocaleDateString("ar-EG")} · ${license.price_per_seat} جنيه للحساب / ${license.billing === "annual" ? "سنة" : "شهر"}`
              : "الحسابات الفرعية غير مفعلة. اطلب تفعيلها من مسؤول التطبيق."}
        </p>
        <Form
          label="حفظ الحساب الفرعي"
          onSubmit={async (f) => {
            const name = str(f, "member_name"),
              email = str(f, "member_email");
            if (demo) {
              const next: Member[] = [
                ...members,
                {
                  id: crypto.randomUUID(),
                  user_id: email,
                  display_name: name,
                  permissions: features,
                  active: true,
                },
              ];
              localStorage.setItem(
                "elmtrapp-demo-team-v1",
                JSON.stringify(next),
              );
              setMembers(next);
              setNotice("تمت إضافة حساب تجريبي محلي");
              return;
            }
            const r = await supabase!.rpc("manage_member", {
              member_email: email,
              member_name: name,
              features,
              member_active: true,
            });
            if (r.error) throw r.error;
            const m = await supabase!.from("office_members").select("*");
            setMembers(m.data ?? []);
            setNotice("تم حفظ الحساب وصلاحياته");
          }}
        >
          <p className="hint">
            يسجل المحامي حسابًا مستقلًا ويؤكد بريده أولًا. أدخل نفس البريد
            لتعديل الاسم والصلاحيات لاحقًا. إلغاء صلاحية التعديل يجعل الأقسام
            المختارة للقراءة فقط.
          </p>
          <Field label="اسم الحساب">
            <input name="member_name" required maxLength={100} />
          </Field>
          <Field label="البريد الإلكتروني للحساب">
            <input name="member_email" type="email" dir="ltr" required />
          </Field>
          <div className="permission-grid">
            {modules.map(([id, label]) => (
              <label key={id}>
                <input
                  type="checkbox"
                  checked={features.includes(id)}
                  onChange={(e) =>
                    setFeatures((v) =>
                      e.target.checked ? [...v, id] : v.filter((x) => x !== id),
                    )
                  }
                />
                {label}
              </label>
            ))}
          </div>
        </Form>
        {members.map((m) => (
          <div className="team-row" key={m.id}>
            <div className="row-main">
              <strong>{m.display_name}</strong>
              <p className="hint">
                {modules
                  .filter(([id]) => m.permissions.includes(id))
                  .map(([, l]) => l)
                  .join(" · ")}
              </p>
            </div>
            <button
              className="button"
              onClick={async () => {
                if (!confirm("إزالة الحساب من المكتب وسحب صلاحياته؟")) return;
                if (demo) {
                  const next = members.filter((x) => x.id !== m.id);
                  localStorage.setItem(
                    "elmtrapp-demo-team-v1",
                    JSON.stringify(next),
                  );
                  setMembers(next);
                } else {
                  const r = await supabase!
                    .from("office_members")
                    .delete()
                    .eq("id", m.id);
                  if (r.error) {
                    setError(r.error.message);
                    return;
                  }
                  setMembers((v) => v.filter((x) => x.id !== m.id));
                }
              }}
            >
              إزالة الحساب
            </button>
          </div>
        ))}
      </section>
    </>
  );
}
export function AdminSettings() {
  const price = usePricing(),
    { setNotice } = useStore();
  const [offices, setOffices] = useState<
    { id: string; office_name: string; full_name: string }[]
  >([]);
  useEffect(() => {
    void supabase
      ?.from("profiles")
      .select("id,office_name,full_name")
      .then((r) => setOffices(r.data ?? []));
  }, []);
  return (
    <section className="panel">
      <h2>لوحة مسؤول Elmtr App</h2>
      <h3>الأسعار العامة للموقع</h3>
      <Form
        label="تحديث الأسعار"
        onSubmit={async (f) => {
          const payload = Object.fromEntries(
            [
              "setup",
              "monthly",
              "annual",
              "annualBeforeDiscount",
              "seatMonthly",
              "seatAnnual",
            ].map((k) => [k, Number(f.get(k))]),
          );
          const r = await supabase!
            .from("site_prices")
            .update(payload)
            .eq("id", true);
          if (r.error) throw r.error;
          setNotice("تم تحديث الأسعار؛ تظهر عند فتح الصفحة أو الرجوع إليها");
          window.dispatchEvent(new Event("focus"));
        }}
      >
        {(
          [
            ["setup", "سعر شراء النظام"],
            ["monthly", "البرو شهريًا"],
            ["annual", "البرو سنويًا"],
            ["annualBeforeDiscount", "السنوي قبل الخصم"],
            ["seatMonthly", "الحساب الفرعي شهريًا"],
            ["seatAnnual", "الحساب الفرعي سنويًا"],
          ] as const
        ).map(([k, label]) => (
          <Field key={k} label={label}>
            <input
              name={k}
              type="number"
              min="0"
              step="0.01"
              required
              defaultValue={price[k]}
            />
          </Field>
        ))}
      </Form>
      <h3>تفعيل الحسابات الفرعية لمكتب</h3>
      <Form
        label="حفظ تفعيل المكتب"
        onSubmit={async (f) => {
          const r = await supabase!.from("office_licenses").upsert({
            owner_id: str(f, "owner"),
            seat_limit: Number(f.get("seats")),
            expires_at: new Date(str(f, "expiry") + "T23:59:59").toISOString(),
            billing: str(f, "billing"),
            price_per_seat: Number(f.get("seat_price")),
          });
          if (r.error) throw r.error;
          setNotice("تم حفظ تفعيل المكتب");
        }}
      >
        <Field label="المكتب">
          <select required name="owner">
            <option value="">اختر المكتب</option>
            {offices.map((o) => (
              <option key={o.id} value={o.id}>
                {o.office_name} — {o.full_name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="عدد الحسابات المسموح">
          <input
            name="seats"
            required
            type="number"
            min="0"
            max="500"
            defaultValue="1"
          />
        </Field>
        <Field label="نهاية التفعيل">
          <input name="expiry" required type="date" />
        </Field>
        <Field label="دورة السعر">
          <select name="billing">
            <option value="monthly">شهري</option>
            <option value="annual">سنوي</option>
          </select>
        </Field>
        <Field label="سعر الحساب لهذا المكتب">
          <input
            name="seat_price"
            required
            type="number"
            min="0"
            step="0.01"
            defaultValue="50"
          />
        </Field>
      </Form>
    </section>
  );
}
