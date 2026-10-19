import { test, expect } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  await page.goto("/demo");
  await expect(page.locator(".main-content")).toBeVisible();
});
async function fixture(page: import("@playwright/test").Page) {
  const bytes = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 500;
    c.height = 700;
    const x = c.getContext("2d")!;
    x.fillStyle = "white";
    x.fillRect(0, 0, 500, 700);
    x.fillStyle = "black";
    x.fillText("TEST POWER", 50, 50);
    return c.toDataURL("image/png").split(",")[1];
  });
  return Buffer.from(bytes, "base64");
}
test("powers persist images, expiry, PDF pages and native share with optional ID", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "canShare", { value: () => true });
    Object.defineProperty(navigator, "share", {
      value: async ({ files }: { files: File[] }) => {
        const text = await files[0].text();
        (window as unknown as { shared: unknown }).shared = {
          name: files[0].name,
          type: files[0].type,
          pages: (text.match(/\/Type \/Page\b/g) || []).length,
          header: text.slice(0, 4),
        };
      },
    });
  });
  await page.goto("/demo");
  await expect(page.locator(".main-content")).toBeVisible();
  const image = await fixture(page);
  await page.goto("/powers");
  await page.getByRole("button", { name: "إضافة توكيل", exact: true }).click();
  await page.getByLabel("اسم الموكل", { exact: true }).fill("موكل اختبار");
  await page.getByLabel("رقم الهاتف", { exact: true }).fill("01012345678");
  await page.getByLabel("تاريخ انتهاء التوكيل").fill("2020-01-01");
  for (const name of ["poa", "front", "back"])
    await page.locator(`input[name="${name}"]`).setInputFiles({
      name: `${name}.png`,
      mimeType: "image/png",
      buffer: image,
    });
  await page.getByRole("button", { name: "حفظ", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "موكل اختبار" }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByText("منتهي", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "البطاقة — الوجه", exact: true })
    .click();
  await expect(page.locator(".power-preview")).toBeVisible();
  await page.getByRole("button", { name: "إغلاق", exact: true }).click();
  await page
    .getByRole("button", { name: "إرسال PDF واتساب", exact: true })
    .click();
  await page.getByRole("button", { name: "تجهيز PDF", exact: true }).click();
  await page
    .getByRole("button", { name: "مشاركة على واتساب", exact: true })
    .click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as { shared: { pages: number } }).shared?.pages,
      ),
    )
    .toBe(1);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "تجهيز PDF", exact: true }).click();
  await page
    .getByRole("button", { name: "مشاركة على واتساب", exact: true })
    .click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as { shared: { pages: number } }).shared?.pages,
      ),
    )
    .toBe(3);
  const shared = await page.evaluate(
    () =>
      (window as unknown as { shared: { type: string; header: string } })
        .shared,
  );
  expect(shared.type).toBe("application/pdf");
  expect(shared.header).toBe("%PDF");
  await page.getByRole("button", { name: "إغلاق", exact: true }).click();
  await page
    .getByRole("button", { name: "تعديل البيانات / تجديد التاريخ" })
    .click();
  await page.getByLabel("تاريخ انتهاء التوكيل").fill("2099-01-01");
  await page.getByRole("button", { name: "حفظ", exact: true }).click();
  await expect(page.getByText("ساري", { exact: true })).toBeVisible();
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (process.env.SCREENSHOT_DIR)
      await page.screenshot({
        path: `${process.env.SCREENSHOT_DIR}/powers-${width}.png`,
        fullPage: true,
      });
  }
});
test("document image converts to downloadable PDF when native sharing unavailable", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "canShare", { value: () => false }),
  );
  await page.goto("/demo");
  await expect(page.locator(".main-content")).toBeVisible();
  const image = await fixture(page);
  await page.goto("/clients/demo-client-1");
  await page.locator("input[type=file]").setInputFiles({
    name: "identity.png",
    mimeType: "image/png",
    buffer: image,
  });
  await expect(page.getByText("identity.png", { exact: true })).toBeVisible();
  await page.goto("/documents");
  const card = page
    .locator(".document-card")
    .filter({ has: page.getByRole("heading", { name: "identity.png" }) });
  await card.getByRole("button", { name: "إرسال PDF واتساب" }).click();
  await page.getByRole("button", { name: "تجهيز PDF", exact: true }).click();
  await expect(
    page.getByText("المتصفح لا يدعم مشاركة الملفات مباشرة.", { exact: false }),
  ).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "تنزيل PDF", exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("identity.pdf");
});
