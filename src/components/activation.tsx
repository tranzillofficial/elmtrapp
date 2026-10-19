"use client";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useStore } from "./provider";
import { Field, Form, str } from "./ui";
import { usePricing } from "@/lib/pricing";
export type ActivationRequest = {
  id: string;
  owner_id: string;
  kind: "system" | "pro";
  period: "monthly" | "annual" | null;
  status: string;
  created_at: string;
  reviewed_at: string | null;
};
export const requestLabel = (r: ActivationRequest) =>
  r.kind === "system"
    ? "تفعيل النظام"
    : `برو ${r.period === "annual" ? "سنوي" : "شهري"}`;
export function ActivationPanel({ waiting = false }: { waiting?: boolean }) {
  const { office, refresh } = useStore(),
    prices = usePricing();
  const [requests, setRequests] = useState<ActivationRequest[]>([]),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const load = useCallback(async () => {
    if (!supabase) return;
    const r = await supabase
      .from("activation_requests")
      .select("*")
      .order("created_at", { ascending: false });
    if (r.error) setError(r.error.message);
    else setRequests(r.data ?? []);
  }, []);
  useEffect(() => {
    const frame = requestAnimationFrame(() => void load());
    const tick = setInterval(() => {
      if (!document.hidden) {
        void load();
        void refresh();
      }
    }, 30000);
    return () => {
      cancelAnimationFrame(frame);
      clearInterval(tick);
    };
  }, [load, refresh]);
  return (
    <section className="panel">
      <h2>{waiting ? "حسابك في انتظار التفعيل" : "طلبات اشتراك البرو"}</h2>
      <p className="hint">
        {waiting
          ? "تم إرسال طلب تفعيل النظام إلى الإدارة تلقائيًا. بعد مراجعة الطلب والموافقة عليه تقدر تستخدم حسابك."
          : "اختر مدة الاشتراك؛ التفعيل يتم بعد موافقة الأدمن."}
      </p>
      {notice && (
        <p className="alert" role="status">
          {notice}
        </p>
      )}
      {error && (
        <p className="alert error" role="alert">
          {error}
        </p>
      )}
      {!office.member && (
        <Form
          label={waiting ? "إرسال / متابعة طلب التفعيل" : "إرسال طلب البرو"}
          onSubmit={async (f) => {
            const r = await supabase!.rpc("request_activation", {
              request_kind: waiting ? "system" : "pro",
              request_period: waiting ? null : str(f, "period"),
            });
            if (r.error) throw r.error;
            await load();
            setNotice("طلبك مسجل لدى الإدارة، وحالته ظاهرة بالأسفل");
          }}
        >
          {!waiting && (
            <Field label="مدة البرو">
              <select name="period">
                <option value="monthly">شهر · {prices.monthly} جنيه</option>
                <option value="annual">سنة · {prices.annual} جنيه</option>
              </select>
            </Field>
          )}
        </Form>
      )}
      {requests.slice(0, 5).map((r) => (
        <div className="team-row" key={r.id}>
          <div className="row-main">
            <strong>{requestLabel(r)}</strong>
            <p className="hint">
              {new Date(r.created_at).toLocaleString("ar-EG")}
            </p>
          </div>
          <span className="status-label">
            {r.status === "pending"
              ? "قيد المراجعة"
              : r.status === "approved"
                ? "تمت الموافقة"
                : "مرفوض"}
          </span>
        </div>
      ))}
    </section>
  );
}
export function PendingActivation() {
  const { refresh, user, error } = useStore();
  return (
    <main className="pending-page">
      <div className="pending-head">
        <span className="brand">Elmtr App</span>
        <button
          className="button"
          onClick={() => void supabase?.auth.signOut()}
        >
          تسجيل الخروج
        </button>
      </div>
      <p dir="ltr">{user?.email}</p>
      <ActivationPanel waiting />
      {error && <p className="alert error">{error}</p>}
      <button className="button" onClick={() => void refresh()}>
        تحديث حالة التفعيل
      </button>
    </main>
  );
}
