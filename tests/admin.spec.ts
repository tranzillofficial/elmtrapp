import { test, expect, Page } from "@playwright/test";
const id = "77777777-7777-4777-8777-777777777777";
async function fixture(page: Page, admin = true, activated = true) {
  const user = {
    id,
    email: admin ? "admin@example.com" : "office@example.com",
    aud: "authenticated",
    role: "authenticated",
    app_metadata: { provider: "email" },
    user_metadata: {},
    created_at: new Date().toISOString(),
  };
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const token = [
    { alg: "HS256", typ: "JWT" },
    { sub: id, exp, role: "authenticated" },
    "test",
  ]
    .map((v, i) =>
      i === 2 ? v : Buffer.from(JSON.stringify(v)).toString("base64url"),
    )
    .join(".");
  await page.addInitScript(
    ({ user, token, exp }) => {
      localStorage.setItem(
        "sb-psxszegqiivcbqudmvwu-auth-token",
        JSON.stringify({
          access_token: token,
          refresh_token: "fixture",
          expires_at: exp,
          expires_in: 3600,
          token_type: "bearer",
          user,
        }),
      );
    },
    { user, token, exp },
  );
  const accounts = [
    {
      id,
      email: "new.office@example.com",
      confirmed: true,
      created_at: new Date().toISOString(),
      full_name: "أحمد محمد",
      office_name: "مكتب العدالة للمحاماة",
      phone: "01000000000",
      status: "pending",
      plan: "basic",
      expires_at: null,
      is_admin: false,
      member: false,
    },
  ];
  const requests = [
    {
      id: "req1",
      owner_id: id,
      kind: "system",
      period: null,
      status: "pending",
      created_at: new Date().toISOString(),
    },
    {
      id: "req2",
      owner_id: id,
      kind: "pro",
      period: "monthly",
      status: "pending",
      created_at: new Date().toISOString(),
    },
  ];
  const actions: Record<string, unknown>[] = [];
  await page.route("**/psxszegqiivcbqudmvwu.supabase.co/**", async (route) => {
    const url = new URL(route.request().url());
    let body: unknown = [];
    if (url.pathname.endsWith("/auth/v1/user")) body = user;
    else if (url.pathname.endsWith("/rpc/office_context"))
      body = {
        owner_id: id,
        admin,
        activated,
        member: false,
        active: true,
        permissions: [],
      };
    else if (url.pathname.endsWith("/rpc/admin_accounts")) body = accounts;
    else if (url.pathname.endsWith("/activation_requests")) body = requests;
    else if (url.pathname.endsWith("/profiles"))
      body = [{ full_name: "أحمد", office_name: "المكتب", phone: "" }];
    else if (url.pathname.endsWith("/site_prices"))
      body = {
        id: true,
        setup: 2800,
        monthly: 250,
        annual: 2000,
        annualBeforeDiscount: 3000,
        seatMonthly: 50,
        seatAnnual: 600,
      };
    else if (url.pathname.endsWith("/rpc/admin_activation")) {
      const action = route.request().postDataJSON();
      actions.push(action);
      if (action.action === "activate") accounts[0].status = "active";
      for (const r of requests)
        if (r.id === action.request_id) r.status = "approved";
      body = null;
    } else if (url.pathname.endsWith("/rpc/request_activation")) body = null;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  });
  return actions;
}
test("admin sees registered accounts and approves system and annual PRO", async ({
  page,
}) => {
  const actions = await fixture(page);
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "إدارة الحسابات والتفعيل" }),
  ).toBeVisible();
  await expect(
    page.getByText("new.office@example.com", { exact: true }),
  ).toBeVisible();
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (process.env.SCREENSHOT_DIR)
      await page.screenshot({
        path: `${process.env.SCREENSHOT_DIR}/admin-${width}.png`,
        fullPage: true,
      });
  }
  await page.getByRole("button", { name: /طلبات التفعيل/ }).click();
  await page.getByRole("button", { name: "الموافقة وتفعيل النظام" }).click();
  await expect.poll(() => actions.length).toBe(1);
  expect(actions[0]).toMatchObject({
    target: id,
    action: "activate",
    request_id: "req1",
  });
  await page
    .getByRole("combobox", { name: "مدة الاشتراك", exact: true })
    .selectOption("annual");
  await page.getByRole("button", { name: "الموافقة وتفعيل البرو" }).click();
  await expect.poll(() => actions.length).toBe(2);
  expect(actions[1]).toMatchObject({
    target: id,
    action: "pro",
    pro_period: "annual",
    request_id: "req2",
  });
  await expect(page.getByText("لا توجد طلبات معلقة")).toBeVisible();
});
test("pending office sees activation screen instead of law office", async ({
  page,
}) => {
  await fixture(page, false, false);
  await page.goto("/dashboard");
  await expect(
    page.getByRole("heading", { name: "حسابك في انتظار التفعيل" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "تحديث حالة التفعيل" }),
  ).toBeVisible();
  await expect(page.locator(".sidebar")).toHaveCount(0);
});
test("admin saves maintenance message/deadline, public demo pauses and release stays accessible", async ({
  page,
  request,
}) => {
  await fixture(page);
  const control = "http://127.0.0.1:4179/__control";
  let runtime = {
    id: true,
    maintenance_enabled: false,
    maintenance_until: null as string | null,
    maintenance_message: "بنحدث التطبيق",
  };
  await page.route("**/rest/v1/site_runtime*", async (route) => {
    if (route.request().method() === "PATCH") {
      runtime = { ...runtime, ...route.request().postDataJSON() };
      await request.post(control, { data: runtime });
    }
    await route.fulfill({ json: runtime });
  });
  try {
    await page.goto("/admin");
    await page.getByRole("button", { name: "الصيانة", exact: true }).click();
    await expect(page.getByText("الموقع متاح", { exact: true })).toBeVisible();
    await page.getByRole("checkbox", { name: "تفعيل وضع الصيانة" }).check();
    await page
      .getByLabel("موعد انتهاء التحديث المتوقع (بتوقيت جهازك)", { exact: true })
      .fill("2020-01-01T10:00");
    await page
      .getByRole("button", { name: "حفظ وضع الصيانة", exact: true })
      .click();
    await expect(
      page.getByText("اختر موعد انتهاء متوقع بعد الوقت الحالي"),
    ).toBeVisible();
    const date = new Date(Date.now() + 3600000);
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    await page
      .getByLabel("موعد انتهاء التحديث المتوقع (بتوقيت جهازك)", { exact: true })
      .fill(local);
    await page
      .getByLabel("الرسالة الظاهرة للزوار")
      .fill("تحديث من لوحة الأدمن");
    await page
      .getByRole("button", { name: "حفظ وضع الصيانة", exact: true })
      .click();
    await expect(
      page.getByText("الصيانة مفعلة", { exact: true }),
    ).toBeVisible();
    expect(runtime.maintenance_enabled).toBe(true);
    expect(runtime.maintenance_message).toBe("تحديث من لوحة الأدمن");
    const visitor = await page.context().newPage();
    await visitor.goto("/demo");
    await expect(
      visitor.getByRole("heading", { name: "الموقع تحت التحديث" }),
    ).toBeVisible();
    await expect(visitor.getByText("تحديث من لوحة الأدمن")).toBeVisible();
    await page
      .getByRole("button", { name: "إيقاف الصيانة وفتح الموقع", exact: true })
      .click();
    await expect(page.getByText("الموقع متاح", { exact: true })).toBeVisible();
    await visitor.evaluate(() => window.dispatchEvent(new Event("focus")));
    await expect(visitor.locator(".main-content")).toBeVisible({
      timeout: 20000,
    });
    await visitor.close();
  } finally {
    await request.post(control, {
      data: { maintenance_enabled: false, maintenance_until: null },
    });
  }
});
