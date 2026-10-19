import { test, expect } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  await page.goto("/demo");
  await expect(page.locator(".main-content")).toBeVisible();
});
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
      "/dashboard",
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
      if (process.env.SCREENSHOT_DIR && path === "/dashboard")
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
  await expect(page.locator(".messages")).toContainText("محاكاة توضيحية للبرو");
  const r = await request.post("/api/assistant", {
    data: { caseId: "demo-case-1", prompt: "test" },
  });
  expect([401, 503]).toContain(r.status());
});

for (const width of [320, 390, 768, 1440])
  test(`landing pricing and demo at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "قضاياك تحت السيطرة",
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(page.locator(".lp-price-card").first()).toContainText("٢٬٨٠٠");
    await expect(page.locator(".lp-price-pro .lp-price")).toContainText(
      "٢٬٠٠٠",
    );
    await expect(page.locator(".lp-price-pro del")).toContainText("٣٬٠٠٠");
    await page.getByRole("button", { name: "شهري", exact: true }).click();
    await expect(page.locator(".lp-price-pro .lp-price")).toContainText("٢٥٠");
    await page.getByRole("button", { name: /سنوي/ }).click();
    if (process.env.SCREENSHOT_DIR)
      await page.screenshot({
        path: `${process.env.SCREENSHOT_DIR}/landing-${width}.png`,
        fullPage: true,
      });
    await page
      .getByRole("link", { name: "جرّب حساب ديمو", exact: false })
      .click();
    await expect(page.locator(".main-content")).toBeVisible();
    await expect(page.locator(".demo-banner")).toBeVisible();
  });
test("real login remains separate from demo", async ({ page }) => {
  await page.goto("/login?mode=signup");
  await expect(
    page.getByRole("heading", { name: "إنشاء حساب مكتب" }),
  ).toBeVisible();
  await expect(page.locator(".demo-banner")).toHaveCount(0);
  await page
    .getByRole("button", { name: "استكشاف المعاينة التجريبية" })
    .click();
  await expect(page.locator(".demo-banner")).toBeVisible();
});
test("client files, PRO reference, PWA and demo team", async ({ page }) => {
  await page.goto("/clients/demo-client-1");
  await page.locator("input[type=file]").setInputFiles({
    name: "بطاقة.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\n%%EOF"),
  });
  await expect(page.getByText("بطاقة.pdf", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("بطاقة.pdf", { exact: true })).toBeVisible();
  await page.goto("/documents");
  await expect(page.getByText("مستند عميل: محمد أحمد")).toBeVisible();
  await page.goto("/library");
  await expect(
    page.getByText("القانون المدني — مقتطف", { exact: true }).first(),
  ).toBeVisible();
  await page.goto("/settings");
  await expect(
    page.getByRole("button", { name: "تثبيت التطبيق PWA" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "تثبيت التطبيق PWA" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Safari" }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "اسم الحساب", exact: true })
    .fill("محامي الفريق");
  await page
    .getByRole("textbox", { name: "البريد الإلكتروني للحساب", exact: true })
    .fill("demo@example.com");
  await page.getByRole("button", { name: "حفظ الحساب الفرعي" }).click();
  await expect(page.getByText("محامي الفريق", { exact: true })).toBeVisible();
});
test("PWA native prompt wiring and dynamic public prices", async ({ page }) => {
  await page.route("**/rest/v1/site_prices*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: true,
        setup: 2900,
        monthly: 275,
        annual: 2100,
        annualBeforeDiscount: 3300,
        seatMonthly: 55,
        seatAnnual: 660,
      }),
    }),
  );
  await page.goto("/");
  await expect(page.locator(".lp-pricing-grid").first()).toContainText("٢٬٩٠٠");
  await expect(page.locator(".lp-savings")).toContainText("١٬٢٠٠");
  await page.goto("/settings");
  await page.evaluate(() => {
    const event = new Event("beforeinstallprompt");
    Object.assign(event, {
      prompt: async () => {
        document.documentElement.dataset.installPrompt = "called";
      },
      userChoice: Promise.resolve({ outcome: "accepted" }),
    });
    window.dispatchEvent(event);
  });
  await page.getByRole("button", { name: "تثبيت التطبيق PWA" }).click();
  await expect(page.locator("html")).toHaveAttribute(
    "data-install-prompt",
    "called",
  );
  await page.goto("/scanner?client=demo-client-1");
  await expect(
    page.getByRole("combobox", { name: "إرفاق بالعميل", exact: true }),
  ).toHaveValue("demo-client-1");
});
test("overview quick actions and optional national ID persist without email or default zero", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "إضافة موكل", exact: true }).click();
  await expect(
    page.getByRole("dialog").getByLabel("البريد الإلكتروني", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByLabel("رصيد مستحق سابق (ج.م)", { exact: true }),
  ).toHaveValue("");
  const national = page.getByLabel("الرقم القومي (اختياري)", { exact: true });
  await expect(national).not.toHaveAttribute("required");
  await page
    .getByLabel("اسم العميل", { exact: true })
    .fill("موكل الرقم القومي");
  await page.getByLabel("رقم الهاتف", { exact: true }).fill("01000000000");
  await national.fill("٢٩٩٠١٠١١٢٣٤٥٦٧");
  if (process.env.SCREENSHOT_DIR)
    await page.screenshot({
      path: `${process.env.SCREENSHOT_DIR}/client-editor-390.png`,
      fullPage: true,
    });
  await page.getByRole("button", { name: "حفظ", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await page.getByRole("button", { name: "قضية جديدة", exact: true }).click();
  await expect(
    page.getByLabel("أتعاب القضية (ج.م)", { exact: true }),
  ).toHaveValue("");
  await page.getByRole("button", { name: "إلغاء", exact: true }).click();
  await page.getByRole("button", { name: "تسجيل جلسة", exact: true }).click();
  await page
    .getByRole("combobox", { name: "القضية", exact: true })
    .selectOption("demo-case-1");
  const date = await page.evaluate(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T10:00`;
  });
  await page.getByLabel("التاريخ والوقت", { exact: true }).fill(date);
  await page
    .getByLabel("المحكمة / مكان الموعد", { exact: true })
    .fill("محكمة الاختبار");
  await page.getByLabel("غرض الجلسة", { exact: true }).fill("جلسة من الاختصار");
  await page.getByRole("button", { name: "حفظ", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await page.goto("/clients");
  await page.getByRole("link").filter({ hasText: "موكل الرقم القومي" }).click();
  await expect(page.getByText("29901011234567", { exact: true })).toBeVisible();
  await expect(page.locator('a[href^="mailto:"]')).toHaveCount(0);
  await page.reload();
  await expect(page.getByText("29901011234567", { exact: true })).toBeVisible();
});
