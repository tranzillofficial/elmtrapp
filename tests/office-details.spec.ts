import { test, expect } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  await page.goto("/demo");
  await expect(page.locator(".main-content")).toBeVisible();
});
test("power metadata persists and expiry appears on dashboard and notification bell", async ({
  page,
}) => {
  await page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem("elmtrapp-demo-v1")!);
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Africa/Cairo",
    }).format(new Date());
    data.powers = [
      {
        id: "test-power",
        principal_name: "موكل تنبيه",
        phone: "01012345678",
        expires_on: today,
        poa_path: "a",
        front_path: "b",
        back_path: "c",
        created_at: new Date().toISOString(),
      },
    ];
    localStorage.setItem("elmtrapp-demo-v1", JSON.stringify(data));
  });
  await page.goto("/powers");
  await page
    .getByRole("button", { name: "تعديل البيانات / تجديد التاريخ" })
    .click();
  await page.getByLabel("رقم التوكيل الرسمي", { exact: true }).fill("321/2026");
  await page
    .getByRole("combobox", { name: "نوع التوكيل", exact: true })
    .selectOption("litigation");
  await page.getByRole("button", { name: "حفظ", exact: true }).click();
  await page.reload();
  await expect(
    page.getByText("رقم التوكيل: 321/2026", { exact: false }),
  ).toBeVisible();
  await expect(page.getByText("خاص بالقضايا", { exact: false })).toBeVisible();
  await page.goto("/dashboard");
  await expect(
    page.getByRole("region", { name: "تنبيهات التوكيلات" }),
  ).toContainText("ينتهي اليوم");
  await expect(page.locator(".notification-dot")).toBeVisible();
  await page.getByRole("button", { name: "التنبيهات", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("321/2026");
  await page.getByRole("button", { name: "إغلاق", exact: true }).click();
  await page.goto("/powers");
  await page
    .getByRole("button", { name: "تعديل البيانات / تجديد التاريخ" })
    .click();
  await page.getByLabel("تاريخ انتهاء التوكيل").fill("2099-01-01");
  await page.getByRole("button", { name: "حفظ", exact: true }).click();
  await page.goto("/dashboard");
  await expect(
    page.getByRole("region", { name: "تنبيهات التوكيلات" }),
  ).toHaveCount(0);
});
test("district court, advance payment and safe printable Arabic account statement", async ({
  page,
}) => {
  await page.goto("/cases/demo-case-1");
  await page.getByRole("button", { name: "تعديل القضية", exact: true }).click();
  await page
    .getByLabel("المحكمة الجزئية", { exact: true })
    .fill("محكمة مدينة نصر الجزئية");
  await page.getByRole("button", { name: "حفظ", exact: true }).click();
  await page.reload();
  await expect(
    page.getByText("المحكمة الجزئية: محكمة مدينة نصر الجزئية"),
  ).toBeVisible();
  await page.goto("/clients/demo-client-1");
  await page.getByRole("button", { name: "تسجيل دفعة", exact: true }).click();
  await page
    .getByRole("combobox", { name: "نوع الدفعة", exact: true })
    .selectOption("advance");
  await page.getByLabel("المبلغ (ج.م)", { exact: true }).fill("123.45");
  await page
    .getByLabel("ملاحظات", { exact: true })
    .fill("<img src=x onerror=alert(1)>");
  await page.getByRole("button", { name: "حفظ", exact: true }).click();
  await expect(page.locator(".payment-list")).toContainText("دفعة مقدمة");
  await page.reload();
  await expect(page.locator(".payment-list")).toContainText("١٢٣٫٤٥");
  await page
    .getByRole("button", { name: "تصدير أو طباعة كشف حساب PDF" })
    .click();
  await expect(page.getByRole("dialog")).toContainText("دفعة مقدمة");
  const popupPromise = page.waitForEvent("popup");
  await page
    .getByRole("button", { name: "طباعة / حفظ PDF", exact: true })
    .click();
  const popup = await popupPromise;
  await expect(
    popup.getByRole("heading", { name: "كشف حساب الموكل" }),
  ).toBeVisible();
  await expect(
    popup.getByText("<img src=x onerror=alert(1)>", { exact: true }),
  ).toBeVisible();
  expect(await popup.locator("img").count()).toBe(0);
  expect(await popup.evaluate(() => window.opener)).toBeNull();
  const last = await popup
    .locator("tbody tr:last-child td:last-child")
    .textContent();
  const total = await popup.locator("tfoot th:last-child").textContent();
  expect(last).toBe(total);
  if (process.env.SCREENSHOT_DIR) {
    await popup.screenshot({
      path: `${process.env.SCREENSHOT_DIR}/account-report.png`,
      fullPage: true,
    });
    await popup.pdf({
      path: `${process.env.SCREENSHOT_DIR}/account-report.pdf`,
      format: "A4",
      printBackground: true,
    });
  }
  await popup.close();
  await page.getByRole("button", { name: "إغلاق", exact: true }).click();
});
test("document categories survive reload, combine with search and fit phone widths", async ({
  page,
}) => {
  await page.goto("/clients/demo-client-1");
  const bytes = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 200;
    c.height = 300;
    c.getContext("2d")!.fillRect(0, 0, 200, 300);
    return c.toDataURL("image/png").split(",")[1];
  });
  await page
    .locator("input[type=file]")
    .setInputFiles({
      name: "عقد اختبار.png",
      mimeType: "image/png",
      buffer: Buffer.from(bytes, "base64"),
    });
  await expect(page.getByText("عقد اختبار.png", { exact: true })).toBeVisible();
  await page.goto("/documents");
  await page
    .getByRole("combobox", { name: "نوع المستند: عقد اختبار.png", exact: true })
    .selectOption("contract");
  await expect(
    page.getByRole("combobox", {
      name: "نوع المستند: عقد اختبار.png",
      exact: true,
    }),
  ).toHaveValue("contract");
  await page.reload();
  await expect(
    page.getByRole("combobox", {
      name: "نوع المستند: عقد اختبار.png",
      exact: true,
    }),
  ).toHaveValue("contract");
  await page.getByRole("button", { name: /^مذكرات/ }).click();
  await expect(
    page.getByRole("heading", { name: "عقد اختبار.png" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: /^عقود/ }).click();
  await expect(
    page.getByRole("heading", { name: "عقد اختبار.png" }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "ابحث باسم المستند أو القضية" })
    .fill("غير موجود");
  await expect(
    page.getByRole("heading", { name: "عقد اختبار.png" }),
  ).toHaveCount(0);
  await page
    .getByRole("textbox", { name: "ابحث باسم المستند أو القضية" })
    .fill("");
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (process.env.SCREENSHOT_DIR)
      await page.screenshot({
        path: `${process.env.SCREENSHOT_DIR}/document-categories-${width}.png`,
        fullPage: true,
      });
  }
});
