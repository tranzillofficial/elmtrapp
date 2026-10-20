export type MaintenanceStatus = {
  enabled: boolean;
  until: string | null;
  message: string;
  server_now: string;
  unavailable?: boolean;
};
export async function readMaintenance(
  fetcher: typeof fetch = fetch,
): Promise<MaintenanceStatus> {
  const now = () => new Date().toISOString();
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key)
    return { enabled: false, until: null, message: "", server_now: now() };
  try {
    const response = await fetcher(
      `${url}/rest/v1/site_runtime?id=eq.true&select=maintenance_enabled,maintenance_until,maintenance_message`,
      {
        headers: { apikey: key },
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      },
    );
    if (!response.ok) throw new Error("Status unavailable");
    const rows = await response.json();
    const row = rows[0];
    if (
      !row ||
      typeof row.maintenance_enabled !== "boolean" ||
      typeof row.maintenance_message !== "string" ||
      (row.maintenance_enabled &&
        !Number.isFinite(Date.parse(row.maintenance_until)))
    )
      throw new Error("Invalid status");
    return {
      enabled: row.maintenance_enabled,
      until: row.maintenance_until,
      message: row.maintenance_message,
      server_now: now(),
    };
  } catch {
    return {
      enabled: true,
      until: null,
      message: "تعذر الاتصال مؤقتًا. بنعمل على استعادة الخدمة، جرّب بعد قليل.",
      server_now: now(),
      unavailable: true,
    };
  }
}
