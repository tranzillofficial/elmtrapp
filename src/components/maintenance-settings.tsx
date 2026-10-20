"use client";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Field, Form, str } from "./ui";
type Runtime = {
  maintenance_enabled: boolean;
  maintenance_until: string | null;
  maintenance_message: string;
};
const localDate = (value: string) => {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
};
export function MaintenanceSettings() {
  const [runtime, setRuntime] = useState<Runtime | null>(null),
    [enabled, setEnabled] = useState(false),
    [end, setEnd] = useState(""),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const r = await supabase!
      .from("site_runtime")
      .select("maintenance_enabled,maintenance_until,maintenance_message")
      .eq("id", true)
      .single();
    if (r.error) {
      setError("تعذر تحميل إعدادات الصيانة: " + r.error.message);
      return;
    }
    setError("");
    setRuntime(r.data);
    setEnabled(r.data.maintenance_enabled);
    setEnd(
      localDate(
        r.data.maintenance_until ??
          new Date(Date.now() + 3600000).toISOString(),
      ),
    );
    setMessage(r.data.maintenance_message);
  }, []);
  useEffect(() => {
    const frame = requestAnimationFrame(() => void load());
    return () => cancelAnimationFrame(frame);
  }, [load]);
  const update = async (values: Partial<Runtime>) => {
    const r = await supabase!
      .from("site_runtime")
      .update(values)
      .eq("id", true)
      .select("maintenance_enabled,maintenance_until,maintenance_message")
      .single();
    if (r.error) throw new Error(r.error.message);
    setRuntime(r.data);
    setEnabled(r.data.maintenance_enabled);
    setNotice(
      r.data.maintenance_enabled
        ? "تم تفعيل الصيانة. الزوار سيرون الرسالة والعد التنازلي."
        : "تم فتح الموقع للزوار.",
    );
  };
  return (
    <section className="panel maintenance-settings">
      <div className="section-title">
        <h2>وضع الصيانة والتحديث</h2>
        {runtime && (
          <span
            className={`badge ${runtime.maintenance_enabled ? "postponed" : "active"}`}
          >
            {runtime.maintenance_enabled ? "الصيانة مفعلة" : "الموقع متاح"}
          </span>
        )}
      </div>
      <p className="hint">
        عند التفعيل، كل صفحات الموقع، بما فيها اللاندنج والديمو، تعرض رسالة
        التحديث. لوحة الأدمن تظل متاحة من /admin.
      </p>
      {error && (
        <p className="alert error" role="alert">
          {error}
          <button className="text-button" onClick={() => void load()}>
            إعادة المحاولة
          </button>
        </p>
      )}
      {notice && (
        <p className="alert success" role="status">
          {notice}
        </p>
      )}
      {runtime && (
        <>
          <Form
            label="حفظ وضع الصيانة"
            onSubmit={async (f) => {
              if (enabled && (!end || new Date(end).getTime() <= Date.now()))
                throw new Error("اختر موعد انتهاء متوقع بعد الوقت الحالي");
              setBusy(true);
              setNotice("");
              try {
                await update({
                  maintenance_enabled: enabled,
                  maintenance_until: end ? new Date(end).toISOString() : null,
                  maintenance_message: str(f, "maintenance_message"),
                });
              } finally {
                setBusy(false);
              }
            }}
          >
            <label className="check-row">
              <input
                type="checkbox"
                checked={enabled}
                disabled={busy}
                onChange={(e) => setEnabled(e.target.checked)}
              />
              تفعيل وضع الصيانة
            </label>
            <Field label="موعد انتهاء التحديث المتوقع (بتوقيت جهازك)">
              <input
                type="datetime-local"
                required={enabled}
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                disabled={busy}
              />
            </Field>
            <Field label="الرسالة الظاهرة للزوار">
              <textarea
                name="maintenance_message"
                rows={3}
                required
                maxLength={1000}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={busy}
              />
            </Field>
            <p className="hint">
              العدّاد يعرض وقتًا تقديريًا. الموقع يفتح عند إيقاف الصيانة يدويًا،
              حتى لو وصل العدّاد للصفر. الصفحات المفتوحة تلتقط التغيير خلال 15
              ثانية تقريبًا.
            </p>
          </Form>
          {runtime.maintenance_enabled && (
            <button
              className="button account-report-button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  await update({ maintenance_enabled: false });
                } catch (e) {
                  setError(e instanceof Error ? e.message : "تعذر فتح الموقع");
                } finally {
                  setBusy(false);
                }
              }}
            >
              إيقاف الصيانة وفتح الموقع
            </button>
          )}
        </>
      )}
    </section>
  );
}
