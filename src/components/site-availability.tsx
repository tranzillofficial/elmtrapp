"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { MaintenanceStatus } from "@/lib/maintenance";
export function SiteAvailability({
  initialStatus,
  children,
}: {
  initialStatus: MaintenanceStatus;
  children?: React.ReactNode;
}) {
  const [status, setStatus] = useState(initialStatus);
  const blocked = useRef(initialStatus.enabled);
  useEffect(() => {
    let disposed = false,
      inFlight = false;
    const controller = new AbortController();
    const check = async () => {
      if (inFlight || document.hidden) return;
      inFlight = true;
      try {
        const r = await fetch("/api/site-status", {
          cache: "no-store",
          signal: controller.signal,
        });
        const next = (await r.json()) as MaintenanceStatus;
        if (disposed || typeof next.enabled !== "boolean" || !next.server_now)
          return;
        if (!next.enabled && blocked.current) {
          window.location.reload();
          return;
        }
        blocked.current = next.enabled;
        setStatus(next);
      } catch {
        /* Retain the last known state on an interrupted request. */
      } finally {
        inFlight = false;
      }
    };
    void check();
    const timer = setInterval(() => void check(), 15000);
    const focus = () => void check();
    window.addEventListener("focus", focus);
    document.addEventListener("visibilitychange", focus);
    return () => {
      disposed = true;
      controller.abort();
      clearInterval(timer);
      window.removeEventListener("focus", focus);
      document.removeEventListener("visibilitychange", focus);
    };
  }, []);
  return status.enabled ? <MaintenanceNotice status={status} /> : children;
}
function MaintenanceNotice({ status }: { status: MaintenanceStatus }) {
  const initial = status.until
    ? Math.max(0, Date.parse(status.until) - Date.parse(status.server_now))
    : 0;
  const [remaining, setRemaining] = useState(initial);
  useEffect(() => {
    const start = performance.now();
    const tick = () =>
      setRemaining(Math.max(0, initial - (performance.now() - start)));
    const frame = requestAnimationFrame(tick);
    const timer = setInterval(tick, 1000);
    return () => {
      cancelAnimationFrame(frame);
      clearInterval(timer);
    };
  }, [initial]);
  const total = Math.ceil(remaining / 1000);
  const values = [
    ["يوم", Math.floor(total / 86400)],
    ["ساعة", Math.floor(total / 3600) % 24],
    ["دقيقة", Math.floor(total / 60) % 60],
    ["ثانية", total % 60],
  ];
  return (
    <main className="maintenance-page">
      <section className="maintenance-card">
        <Image
          src="/elmtr-icon-192-v2.png"
          alt="Elmtr App"
          width={64}
          height={64}
          priority
        />
        <p className="maintenance-brand">Elmtr App</p>
        <h1>{status.unavailable ? "هنرجع بعد قليل" : "الموقع تحت التحديث"}</h1>
        <p className="maintenance-message">{status.message}</p>
        {status.until && (
          <>
            <p className="hint">الوقت المتبقي المتوقع للعودة</p>
            <div
              className="maintenance-countdown"
              role="timer"
              aria-label="العد التنازلي لانتهاء التحديث"
            >
              {values.map(([label, value]) => (
                <div key={label}>
                  <strong>{String(value).padStart(2, "0")}</strong>
                  <span>{label}</span>
                </div>
              ))}
            </div>
            <p className="hint">
              موعد العودة المتوقع:{" "}
              {new Intl.DateTimeFormat("ar-EG", {
                timeZone: "Africa/Cairo",
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date(status.until))}{" "}
              بتوقيت القاهرة
            </p>
            {remaining === 0 && (
              <p role="status">
                انتهى الوقت المتوقع، بنراجع اللمسات الأخيرة. الصفحة هتتحدث
                تلقائيًا لما نرجع.
              </p>
            )}
          </>
        )}
        <p className="hint">شكرًا لصبرك. الصفحة بتتابع حالة الموقع تلقائيًا.</p>
        <Link href="/admin" className="text-button">
          دخول الإدارة
        </Link>
      </section>
    </main>
  );
}
