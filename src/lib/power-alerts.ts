import type { Power } from "./types";
export function cairoDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) => parts.find((p) => p.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
export function powerDaysLeft(date: string, now = new Date()) {
  return Math.round(
    (Date.parse(`${date}T00:00:00Z`) -
      Date.parse(`${cairoDate(now)}T00:00:00Z`)) /
      86400000,
  );
}
export function expiringPowers(powers: Power[], now = new Date()) {
  return powers
    .filter(
      (p) =>
        p.reviewed_for_expiry !== p.expires_on &&
        powerDaysLeft(p.expires_on, now) <= (p.reminder_days ?? 30),
    )
    .toSorted((a, b) => a.expires_on.localeCompare(b.expires_on));
}
export function powerExpiryLabel(date: string) {
  const d = powerDaysLeft(date);
  return d < 0 ? "منتهي" : d === 0 ? "ينتهي اليوم" : `ينتهي خلال ${d} يوم`;
}
