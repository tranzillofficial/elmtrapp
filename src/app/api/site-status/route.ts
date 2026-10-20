import { readMaintenance } from "@/lib/maintenance";
export const dynamic = "force-dynamic";
export async function GET() {
  const status = await readMaintenance();
  return Response.json(status, {
    status: status.unavailable ? 503 : 200,
    headers: { "Cache-Control": "no-store, max-age=0", "Retry-After": "15" },
  });
}
