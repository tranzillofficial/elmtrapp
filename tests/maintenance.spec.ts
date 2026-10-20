import { test, expect } from "@playwright/test";
const control = "http://127.0.0.1:4179/__control";
test.afterEach(async ({ request }) => {
  await request.post(control, {
    data: { maintenance_enabled: false, maintenance_until: null },
  });
});
test("server pauses all public entry points, leaves admin login open and blocks assistant", async ({
  page,
  request,
}) => {
  await request.post(control, {
    data: {
      maintenance_enabled: true,
      maintenance_until: new Date(Date.now() + 90000).toISOString(),
      maintenance_message: "بنحدث الموقع للاختبار",
    },
  });
  for (const path of [
    "/",
    "/demo",
    "/dashboard",
    "/cases/demo-case-1",
    "/login",
    "/anything/nested",
  ]) {
    await page.goto(path);
    await expect(
      page.getByRole("heading", { name: "الموقع تحت التحديث" }),
    ).toBeVisible();
    await expect(page.getByText("بنحدث الموقع للاختبار")).toBeVisible();
    await expect(page.locator(".main-content")).toHaveCount(0);
    await expect(page.getByRole("timer")).toBeVisible();
  }
  const assistant = await request.post("/api/assistant", { data: {} });
  expect(assistant.status()).toBe(503);
  expect(assistant.headers()["retry-after"]).toBe("60");
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "الموقع تحت التحديث" }),
  ).toHaveCount(0);
  await expect(page.locator("input[type=password]")).toBeVisible();
});
test("countdown ticks on phones and zero retains the maintenance screen", async ({
  page,
  request,
}) => {
  await request.post(control, {
    data: {
      maintenance_enabled: true,
      maintenance_until: new Date(Date.now() + 65000).toISOString(),
      maintenance_message: "صيانة سريعة",
    },
  });
  await page.goto("/demo");
  const timer = page.getByRole("timer");
  const previous = await timer.innerText();
  await expect.poll(() => timer.innerText()).not.toBe(previous);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (process.env.SCREENSHOT_DIR)
      await page.screenshot({
        path: `${process.env.SCREENSHOT_DIR}/maintenance-${width}.png`,
        fullPage: true,
      });
  }
  await request.post(control, {
    data: {
      maintenance_enabled: true,
      maintenance_until: "2020-01-01T00:00:00Z",
    },
  });
  await page.reload();
  await expect(page.getByRole("status")).toContainText("انتهى الوقت المتوقع");
  await expect(
    page.getByRole("heading", { name: "الموقع تحت التحديث" }),
  ).toBeVisible();
});
test("an already open demo pauses on status poll and reopens on admin release", async ({
  page,
  request,
}) => {
  await page.goto("/demo");
  await expect(page.locator(".main-content")).toBeVisible();
  await request.post(control, {
    data: {
      maintenance_enabled: true,
      maintenance_until: new Date(Date.now() + 3600000).toISOString(),
      maintenance_message: "تحديث الصفحة المفتوحة",
    },
  });
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(
    page.getByRole("heading", { name: "الموقع تحت التحديث" }),
  ).toBeVisible({ timeout: 20000 });
  await expect(page.locator(".main-content")).toHaveCount(0);
  await request.post(control, { data: { maintenance_enabled: false } });
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page.locator(".main-content")).toBeVisible({ timeout: 20000 });
});
