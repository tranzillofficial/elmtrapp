"use client";
import Link from "next/link";
import { useStore } from "./provider";
import { day } from "@/lib/types";
import { expiringPowers, powerExpiryLabel } from "@/lib/power-alerts";
export function PowerAlerts({
  compact = false,
  onNavigate,
}: {
  compact?: boolean;
  onNavigate?: () => void;
}) {
  const { data, office } = useStore();
  if (office.member && !office.permissions.includes("documents")) return null;
  const powers = expiringPowers(data.powers);
  if (!powers.length) return null;
  return (
    <section
      className={compact ? "power-alerts" : "panel power-alerts"}
      aria-label="تنبيهات التوكيلات"
    >
      <div className="section-title">
        <h2>تنبيهات التوكيلات ({powers.length})</h2>
        {!compact && <Link href="/powers">عرض التوكيلات</Link>}
      </div>
      <p className="hint">التوكيلات المنتهية أو التي تنتهي خلال 30 يومًا.</p>
      {powers.slice(0, compact ? 10 : 3).map((p) => (
        <Link
          className="notification-row"
          key={p.id}
          href="/powers"
          onClick={onNavigate}
        >
          <span>
            <strong>
              {p.principal_name}
              {p.official_number ? ` · ${p.official_number}` : ""}
            </strong>
            <small>
              {powerExpiryLabel(p.expires_on)} ·{" "}
              {day(`${p.expires_on}T12:00:00`)}
            </small>
          </span>
        </Link>
      ))}
      {compact && powers.length > 10 && (
        <Link href="/powers" onClick={onNavigate}>
          عرض باقي التوكيلات
        </Link>
      )}
    </section>
  );
}
