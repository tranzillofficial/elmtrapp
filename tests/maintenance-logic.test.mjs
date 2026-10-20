import { test } from "node:test";
import assert from "node:assert/strict";
import { readMaintenance } from "../src/lib/maintenance.ts";
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.invalid";
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-publishable-key";
test("status is uncached and past countdown never reopens a manually paused site", async () => {
  const status = await readMaintenance(async (_url, options) => {
    assert.equal(options.cache, "no-store");
    return Response.json([
      {
        maintenance_enabled: true,
        maintenance_until: "2020-01-01T00:00:00Z",
        maintenance_message: "صيانة",
      },
    ]);
  });
  assert.equal(status.enabled, true);
  assert.equal(status.until, "2020-01-01T00:00:00Z");
});
test("unavailable or malformed status fails closed with no fake countdown", async () => {
  for (const fetcher of [
    async () => {
      throw Error("offline");
    },
    async () => Response.json([]),
    async () => new Response("", { status: 503 }),
  ]) {
    const s = await readMaintenance(fetcher);
    assert.equal(s.enabled, true);
    assert.equal(s.unavailable, true);
    assert.equal(s.until, null);
  }
});
