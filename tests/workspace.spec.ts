import { test, expect } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  await page.goto("/demo");
  await expect(page.locator(".main-content")).toBeVisible();
});
async function newClient(page: import("@playwright/test").Page) {
  await page.goto("/clients");
  await page.getByRole("button", { name: "إضافة عميل", exact: true }).click();
  await page
    .getByLabel("اسم العميل", { exact: true })
    .fill("موكل الرصيد المقدم");
  await page.getByRole("button", { name: "حفظ", exact: true }).click();
  await page
    .getByRole("link")
    .filter({ hasText: "موكل الرصيد المقدم" })
    .click();
}
test("advance before fees, client and office expenses, corrections and report agree", async ({
  page,
}) => {
  await newClient(page);
  await page.getByRole("button", { name: "تسجيل دفعة", exact: true }).click();
  await page
    .getByRole("combobox", { name: "نوع الدفعة", exact: true })
    .selectOption("advance");
  await page.getByLabel("المبلغ (ج.م)", { exact: true }).fill("500");
  await page.getByRole("button", { name: "حفظ", exact: true }).click();
  await expect(page.locator(".account-stats")).toContainText(
    "رصيد لصالح الموكل",
  );
  await expect(page.locator(".account-stats")).toContainText("٥٠٠");
  for (const [description, billing, amount] of [
    ["رسوم اختبار", "client", "200"],
    ["انتقالات المكتب", "office", "100"],
  ]) {
    await page
      .getByRole("button", { name: "تسجيل مصروف", exact: true })
      .click();
    await page.getByLabel("بيان المصروف").fill(description);
    await page.getByLabel("المبلغ (ج.م)", { exact: true }).fill(amount);
    await page
      .getByRole("combobox", { name: "يتحمل المصروف", exact: true })
      .selectOption(billing);
    await page.getByRole("button", { name: "حفظ", exact: true }).click();
  }
  await page.reload();
  await expect(page.locator(".account-stats")).toContainText("٣٠٠");
  const row = page.locator(".expense-row").filter({ hasText: "رسوم اختبار" });
  await row.getByRole("button", { name: "تعديل المصروف" }).click();
  await page.getByLabel("المبلغ (ج.م)", { exact: true }).fill("250");
  await page.getByRole("button", { name: "حفظ", exact: true }).click();
  await expect(page.locator(".account-stats")).toContainText("٢٥٠");
  await page
    .getByRole("button", { name: "تصدير أو طباعة كشف حساب PDF" })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("رصيد لصالح الموكل");
  await expect(dialog.locator("table").nth(1)).toContainText(
    "المكتب (لا يضاف للحساب)",
  );
  expect(
    await dialog
      .locator("table")
      .first()
      .locator("tfoot th:last-child")
      .textContent(),
  ).toContain("٢٥٠");
  if (process.env.SCREENSHOT_DIR)
    await page.screenshot({
      path: `${process.env.SCREENSHOT_DIR}/credit-expenses-report.png`,
      fullPage: true,
    });
  await page.getByRole("button", { name: "إغلاق", exact: true }).click();
  await page.getByRole("button", { name: "إضافة", exact: true }).click();
  await expect(page.getByLabel("الخصم", { exact: true })).toHaveCount(0);
  await page
    .getByLabel("عنوان القضية", { exact: true })
    .fill("قضية بعد الرصيد");
  await page.getByLabel("رقم القضية / السنة", { exact: true }).fill("77/2026");
  await page.getByLabel("المحكمة", { exact: true }).fill("محكمة اختبار");
  await page.getByLabel("أتعاب القضية (ج.م)", { exact: true }).fill("400");
  await page.getByRole("button", { name: "حفظ", exact: true }).click();
  await expect(page.locator(".account-stats")).toContainText("المتبقي");
  await expect(page.locator(".account-stats")).toContainText("١٥٠");
});
test("case workspace quick note, hearing, upload and timeline persist at all sizes", async ({
  page,
}) => {
  await page.goto("/cases/demo-case-1");
  await page.getByRole("button", { name: "ملاحظة سريعة", exact: true }).click();
  await page.getByLabel("نص الملاحظة").fill("مراجعة مهمة في السجل");
  await page.getByRole("button", { name: "حفظ", exact: true }).click();
  await expect(page.locator(".case-hub-grid")).toContainText(
    "مراجعة مهمة في السجل",
  );
  await expect(page.locator(".case-timeline")).toContainText(
    "مراجعة مهمة في السجل",
  );
  await page.getByRole("button", { name: "تسجيل جلسة", exact: true }).click();
  await page
    .getByLabel("التاريخ والوقت", { exact: true })
    .fill("2099-01-01T10:00");
  await page.getByLabel("غرض الجلسة", { exact: true }).fill("مرافعة اختبار");
  await page.getByRole("button", { name: "حفظ", exact: true }).click();
  await expect(page.locator(".case-timeline")).toContainText("مرافعة اختبار");
  const bytes = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 100;
    c.height = 150;
    c.getContext("2d")!.fillRect(0, 0, 100, 150);
    return c.toDataURL("image/png").split(",")[1];
  });
  const fileChooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "إرفاق مستند", exact: true }).click();
  await (
    await fileChooser
  ).setFiles({
    name: "مستند السجل.png",
    mimeType: "image/png",
    buffer: Buffer.from(bytes, "base64"),
  });
  await expect(page.locator(".case-hub-grid")).toContainText("مستند السجل.png");
  await page.reload();
  await expect(page.locator(".case-timeline")).toContainText("مستند السجل.png");
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (process.env.SCREENSHOT_DIR)
      await page.screenshot({
        path: `${process.env.SCREENSHOT_DIR}/case-workspace-${width}.png`,
        fullPage: true,
      });
  }
});
test("configurable expiry review and office search navigate typed results", async ({
  page,
}) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem("workspace-power-seeded")) return;
    sessionStorage.setItem("workspace-power-seeded", "1");
    const data = JSON.parse(localStorage.getItem("elmtrapp-demo-v1")!);
    const now = new Date();
    now.setDate(now.getDate() + 20);
    const expires = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Africa/Cairo",
    }).format(now);
    data.powers = [
      {
        id: "search-power",
        principal_name: "موكل البحث",
        phone: "01012345678",
        official_number: "12345",
        expires_on: expires,
        reminder_days: 14,
        poa_path: "a",
        front_path: "b",
        back_path: "c",
        created_at: new Date().toISOString(),
      },
    ];
    localStorage.setItem("elmtrapp-demo-v1", JSON.stringify(data));
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("button", { name: "بحث في المكتب", exact: true }),
  ).toBeVisible();
  await page.goto("/dashboard");
  await expect(
    page.getByRole("region", { name: "تنبيهات التوكيلات" }),
  ).toHaveCount(0);
  await page.goto("/powers");
  await page
    .getByRole("button", { name: "تعديل البيانات / تجديد التاريخ" })
    .click();
  await page.getByLabel("التنبيه قبل الانتهاء (يوم)").fill("30");
  await page.getByRole("button", { name: "حفظ", exact: true }).click();
  await page.goto("/dashboard");
  await expect(
    page.getByRole("region", { name: "تنبيهات التوكيلات" }),
  ).toContainText("موكل البحث");
  await page.getByRole("button", { name: "تمت المراجعة", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "تنبيهات التوكيلات" }),
  ).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole("region", { name: "تنبيهات التوكيلات" }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "بحث في المكتب", exact: true })
    .click();
  await page.getByPlaceholder("ابحث في بيانات المكتب...").fill("١٢٣٤٥");
  await expect(page.getByRole("dialog")).toContainText("توكيل");
  await page
    .getByRole("dialog")
    .getByRole("link")
    .filter({ hasText: "موكل البحث" })
    .click();
  await expect(page).toHaveURL(/powers\?record=search-power/);
  await page
    .getByRole("button", { name: "إعادة تفعيل التنبيه", exact: true })
    .click();
  await page.goto("/dashboard");
  await expect(
    page.getByRole("region", { name: "تنبيهات التوكيلات" }),
  ).toContainText("موكل البحث");
  await page
    .getByRole("button", { name: "بحث في المكتب", exact: true })
    .click();
  await page.getByPlaceholder("ابحث في بيانات المكتب...").fill("محمد أحمد");
  await expect(page.getByRole("dialog")).toContainText("موكل");
  await expect(page.getByRole("dialog")).toContainText("قضية");
  await page
    .getByRole("dialog")
    .getByRole("link")
    .filter({ hasText: "دعوى تعويض" })
    .click();
  await expect(page).toHaveURL(/cases\/demo-case-1/);
});
