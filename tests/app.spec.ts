import { test, expect } from "@playwright/test";
for (const width of [320, 390, 768, 1440]) {
  test(`all screens fit at ${width}px in light and dark`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => {
      errors.push(e.message);
      console.log("PAGEERROR", e.message);
    });
    page.on("console", (msg) => {
      if (msg.type() === "error") console.log("CONSOLE", msg.text());
    });
    await page.setViewportSize({ width, height: 900 });
    for (const path of [
      "/",
      "/cases",
      "/cases/demo-case-1",
      "/hearings",
      "/clients",
      "/clients/demo-client-1",
      "/documents",
      "/scanner",
      "/library",
      "/assistant",
      "/settings",
    ]) {
      await page.goto(path);
      await expect(page.locator(".main-content")).toBeVisible();
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      if (process.env.SCREENSHOT_DIR && path === "/")
        await page.screenshot({
          path: `${process.env.SCREENSHOT_DIR}/overview-${width}.png`,
          fullPage: true,
        });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        path,
      ).toBe(true);
    }
    await page.getByRole("button", { name: "داكن", exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    if (process.env.SCREENSHOT_DIR)
      await page.screenshot({
        path: `${process.env.SCREENSHOT_DIR}/settings-dark-${width}.png`,
        fullPage: true,
      });
    expect(errors).toEqual([]);
  });
}
test("create a client and case, account payments persist and are editable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/clients");
  await page.getByRole("button", { name: "إضافة عميل", exact: true }).click();
  await page.getByLabel("اسم العميل", { exact: true }).fill("عميل الاختبار");
  await page.getByLabel("رقم الهاتف", { exact: true }).fill("01000000000");
  await page.getByRole("button", { name: "حفظ", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await page.getByRole("link").filter({ hasText: "عميل الاختبار" }).click();
  await page.getByRole("button", { name: "إضافة", exact: true }).click();
  await page.getByLabel("عنوان القضية", { exact: true }).fill("قضية الاختبار");
  await page.getByLabel("رقم القضية / السنة", { exact: true }).fill("998/2026");
  await page.getByLabel("المحكمة", { exact: true }).fill("محكمة القاهرة");
  await page.getByLabel("أتعاب القضية (ج.م)", { exact: true }).fill("1000");
  await page.getByRole("button", { name: "حفظ", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await page.getByRole("button", { name: "تسجيل دفعة", exact: true }).click();
  await page.getByLabel("المبلغ (ج.م)", { exact: true }).fill("250");
  await page.getByRole("button", { name: "حفظ", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.locator(".account-stats")).toContainText("٧٥٠");
  await expect(
    page.getByRole("button", { name: "تسجيل دفعة", exact: true }),
  ).toHaveCount(1);
  await page.reload();
  await expect(page.locator(".account-stats")).toContainText("٧٥٠");
  await page.getByRole("button", { name: "تعديل الدفعة" }).click();
  await expect(page.getByLabel("المبلغ (ج.م)", { exact: true })).toHaveValue(
    "250",
  );
  await page.getByLabel("المبلغ (ج.م)", { exact: true }).fill("400");
  await page.getByRole("button", { name: "حفظ", exact: true }).click();
  await expect(page.locator(".account-stats")).toContainText("٦٠٠");
  await page.getByRole("link").filter({ hasText: "قضية الاختبار" }).click();
  await page
    .getByLabel("ملاحظة جديدة", { exact: true })
    .fill("مراجعة المستندات");
  await page.getByRole("button", { name: "إضافة ملاحظة", exact: true }).click();
  await expect(page.locator(".note")).toContainText("مراجعة المستندات");
});
test("scan gallery image, crop, save multi-page PDF and keep it on reload", async ({
  page,
}) => {
  await page.goto("/scanner?case=demo-case-1");
  await expect(
    page.getByRole("combobox", { name: "إرفاق بالقضية", exact: true }),
  ).toHaveValue("demo-case-1");
  // Generate a synthetic paper fixture; no private uploaded references are used.
  const bytes = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 500;
    c.height = 700;
    const x = c.getContext("2d")!;
    x.fillStyle = "#775533";
    x.fillRect(0, 0, 500, 700);
    x.fillStyle = "white";
    x.fillRect(50, 50, 400, 600);
    x.fillStyle = "black";
    x.fillText("TEST DOCUMENT", 100, 100);
    return c.toDataURL("image/png").split(",")[1];
  });
  const file = {
    name: "test-page.png",
    mimeType: "image/png",
    buffer: Buffer.from(bytes, "base64"),
  };
  await page.locator("input[type=file]").setInputFiles(file);
  await expect(page.getByAltText("معاينة الورقة قبل القص")).toBeVisible();
  await page
    .getByRole("button", { name: "إضافة الصفحة ومتابعة المسح" })
    .click();
  await expect(page.locator(".scanned-pages img")).toHaveCount(1);
  await page.locator("input[type=file]").setInputFiles(file);
  await expect(page.getByAltText("معاينة الورقة قبل القص")).toBeVisible();
  await page
    .getByRole("button", { name: "حفظ في القضية", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("تم حفظ المستند");
  await page.goto("/cases/demo-case-1");
  await page.getByRole("tab", { name: /المستندات/ }).click();
  await expect(page.locator(".document-row")).toHaveCount(1);
  await expect(page.locator(".document-row")).toContainText(".pdf");
  await page.reload();
  await page.getByRole("tab", { name: /المستندات/ }).click();
  await expect(page.locator(".document-row")).toHaveCount(1);
});
test("demo assistant is honest about missing integration", async ({
  page,
  request,
}) => {
  await page.goto("/assistant?case=demo-case-1");
  await page
    .getByRole("button", { name: "حلل ملخص القضية والمستندات" })
    .click();
  await expect(page.locator(".chat-panel [role=alert]")).toContainText(
    "لا يتم توليد تحليل وهمي",
  );
  const r = await request.post("/api/assistant", {
    data: { caseId: "demo-case-1", prompt: "test" },
  });
  expect([401, 503]).toContain(r.status());
});
