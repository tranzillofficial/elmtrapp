"use client";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useStore } from "./provider";
import { AdminSettings } from "./team";
import { ActivationRequest, requestLabel } from "./activation";
import { Empty, Field, Form, Modal, SearchBox, str } from "./ui";
import { InstallApp } from "./install";
type Account = {
  id: string;
  email: string;
  confirmed: boolean;
  created_at: string;
  full_name: string;
  office_name: string;
  phone: string;
  status: string;
  plan: string;
  expires_at: string | null;
  is_admin: boolean;
  member: boolean;
};
const statusName = (s: string) =>
  ({
    active: "مفعل",
    pending: "بانتظار التفعيل",
    rejected: "مرفوض",
    suspended: "موقوف",
  })[s] ?? s;
const hasPro = (a: Account) =>
  a.plan !== "basic" && !!a.expires_at && new Date(a.expires_at) > new Date();
export function AdminDashboard() {
  const { user } = useStore();
  const [accounts, setAccounts] = useState<Account[]>([]),
    [requests, setRequests] = useState<ActivationRequest[]>([]),
    [tab, setTab] = useState("accounts"),
    [search, setSearch] = useState(""),
    [filter, setFilter] = useState("all"),
    [selected, setSelected] = useState<Account | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const [a, r] = await Promise.all([
      supabase!.rpc("admin_accounts"),
      supabase!
        .from("activation_requests")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);
    if (a.error || r.error)
      setError(a.error?.message ?? r.error?.message ?? "تعذر التحميل");
    else {
      setAccounts(a.data ?? []);
      setRequests(r.data ?? []);
    }
    setLoading(false);
  }, []);
  useEffect(() => {
    const frame = requestAnimationFrame(() => void load());
    const tick = setInterval(() => {
      if (!document.hidden) void load();
    }, 30000);
    const focus = () => void load();
    window.addEventListener("focus", focus);
    return () => {
      cancelAnimationFrame(frame);
      clearInterval(tick);
      window.removeEventListener("focus", focus);
    };
  }, [load]);
  const act = async (
    target: string,
    action: string,
    period: string | null = null,
    requestId: string | null = null,
  ) => {
    setError("");
    setNotice("");
    const r = await supabase!.rpc("admin_activation", {
      target,
      action,
      pro_period: period,
      request_id: requestId,
    });
    if (r.error) throw new Error(r.error.message);
    setNotice("تم حفظ التفعيل بنجاح");
    await load();
  };
  const pending = requests.filter((r) => r.status === "pending");
  const rows = accounts.filter(
    (a) =>
      `${a.email} ${a.full_name} ${a.office_name} ${a.phone}`
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (filter === "all" ||
        (filter === "pro" && hasPro(a)) ||
        filter === a.status),
  );
  return (
    <div className="admin-app">
      <header className="admin-header">
        <div>
          <span className="brand">Elmtr App</span>
          <small>إدارة المنصة</small>
        </div>
        <div className="admin-header-actions">
          <span dir="ltr">{user?.email}</span>
          <button
            className="button"
            onClick={() => void supabase!.auth.signOut()}
          >
            خروج
          </button>
        </div>
      </header>
      <main className="admin-main">
        <div className="page-heading">
          <div>
            <h1>إدارة الحسابات والتفعيل</h1>
            <p>تابع التسجيلات وراجع الطلبات وحدد اشتراك كل مكتب.</p>
          </div>
          <button
            className="button"
            disabled={busy}
            onClick={() => void load()}
          >
            تحديث
          </button>
        </div>
        <div className="admin-metrics">
          {[
            ["إجمالي الحسابات", accounts.length],
            ["طلبات معلقة", pending.length],
            [
              "مكاتب مفعلة",
              accounts.filter((a) => a.status === "active" && !a.member).length,
            ],
            ["اشتراكات برو سارية", accounts.filter(hasPro).length],
          ].map(([label, value]) => (
            <div className="panel" key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
        <nav className="segments admin-tabs" aria-label="إدارة المنصة">
          {[
            ["accounts", "الحسابات"],
            ["requests", `طلبات التفعيل (${pending.length})`],
            ["pricing", "الأسعار والفريق"],
            ["settings", "إعدادات التطبيق"],
          ].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={tab === id ? "selected" : ""}
            >
              {label}
            </button>
          ))}
        </nav>
        {error && (
          <p className="alert error" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="alert" role="status">
            {notice}
          </p>
        )}
        {loading ? (
          <p>جارٍ تحميل الحسابات…</p>
        ) : tab === "accounts" ? (
          <>
            <div className="toolbar">
              <SearchBox
                value={search}
                onChange={setSearch}
                placeholder="ابحث بالاسم أو البريد أو المكتب"
              />
              <select
                aria-label="فلتر الحسابات"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="all">كل الحسابات</option>
                <option value="pending">بانتظار التفعيل</option>
                <option value="active">المفعلة</option>
                <option value="suspended">الموقوفة</option>
                <option value="pro">البرو الساري</option>
              </select>
            </div>
            <div className="admin-account-list">
              {rows.map((a) => (
                <article key={a.id} className="panel admin-account">
                  <div className="admin-account-identity">
                    <span className="avatar">{a.full_name?.[0] ?? "م"}</span>
                    <div>
                      <h2>{a.office_name || a.full_name || "حساب جديد"}</h2>
                      <p>
                        {a.full_name} {a.member && "· حساب فرعي"}{" "}
                        {a.is_admin && "· أدمن"}
                      </p>
                      <span dir="ltr">{a.email}</span>
                      {a.phone && <span dir="ltr">{a.phone}</span>}
                    </div>
                  </div>
                  <div className="admin-account-meta">
                    <span className="status-label">{statusName(a.status)}</span>
                    <span className="hint">
                      {a.confirmed ? "البريد مؤكد" : "البريد غير مؤكد"}
                    </span>
                    <span className="hint">
                      سجل في{" "}
                      {new Date(a.created_at).toLocaleDateString("ar-EG")}
                    </span>
                  </div>
                  <div className="admin-account-pro">
                    <strong>
                      {hasPro(a)
                        ? `برو ${a.plan === "annual" ? "سنوي" : "شهري"}`
                        : "الباقة الأساسية"}
                    </strong>
                    {a.expires_at && (
                      <span className="hint">
                        حتى {new Date(a.expires_at).toLocaleDateString("ar-EG")}
                      </span>
                    )}
                    <button
                      className="button"
                      onClick={() => {
                        setSelected(a);
                        setError("");
                      }}
                    >
                      إدارة الحساب
                    </button>
                  </div>
                </article>
              ))}
            </div>
            {!rows.length && <Empty title="لا توجد حسابات مطابقة" />}
          </>
        ) : tab === "requests" ? (
          <>
            <h2>طلبات بانتظار الموافقة</h2>
            <p className="hint">
              التحديث تلقائي كل 30 ثانية. الموافقة على البرو تحدد المدة من وقت
              الموافقة.
            </p>
            {pending.map((r) => {
              const a = accounts.find((a) => a.id === r.owner_id);
              return (
                <section key={r.id} className="panel admin-request">
                  <h3>{requestLabel(r)}</h3>
                  <strong>{a?.office_name || a?.full_name}</strong>
                  <p dir="ltr">{a?.email}</p>
                  <p className="hint">
                    {new Date(r.created_at).toLocaleString("ar-EG")}
                  </p>
                  <Form
                    label={
                      r.kind === "system"
                        ? "الموافقة وتفعيل النظام"
                        : "الموافقة وتفعيل البرو"
                    }
                    onSubmit={async (f) =>
                      act(
                        r.owner_id,
                        r.kind === "system" ? "activate" : "pro",
                        r.kind === "system" ? null : str(f, "period"),
                        r.id,
                      )
                    }
                  >
                    {r.kind === "pro" && (
                      <Field label="مدة الاشتراك">
                        <select
                          name="period"
                          defaultValue={r.period ?? "monthly"}
                        >
                          <option value="monthly">شهر من الآن</option>
                          <option value="annual">سنة من الآن</option>
                        </select>
                      </Field>
                    )}
                    <button
                      className="button"
                      type="button"
                      disabled={busy}
                      onClick={async () => {
                        if (!confirm("رفض الطلب؟")) return;
                        setBusy(true);
                        try {
                          await act(r.owner_id, "reject", null, r.id);
                        } catch (e) {
                          setError(
                            e instanceof Error ? e.message : "تعذر الرفض",
                          );
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      رفض الطلب
                    </button>
                  </Form>
                </section>
              );
            })}
            {!pending.length && <Empty title="لا توجد طلبات معلقة" />}
            <section className="panel">
              <h2>آخر الطلبات التي تمت مراجعتها</h2>
              {requests
                .filter((r) => r.status !== "pending")
                .slice(0, 20)
                .map((r) => (
                  <div key={r.id} className="team-row">
                    <div className="row-main">
                      <strong>{requestLabel(r)}</strong>
                      <p dir="ltr" className="hint">
                        {accounts.find((a) => a.id === r.owner_id)?.email}
                      </p>
                    </div>
                    <span>{r.status === "approved" ? "مقبول" : "مرفوض"}</span>
                  </div>
                ))}
            </section>
          </>
        ) : tab === "pricing" ? (
          <AdminSettings />
        ) : (
          <InstallApp />
        )}
        {selected && (
          <Modal title="إدارة الحساب" onClose={() => setSelected(null)}>
            <p dir="ltr">{selected.email}</p>
            <p className="hint">حالة النظام: {statusName(selected.status)}</p>
            <Form
              label="تفعيل النظام"
              onSubmit={async () => {
                await act(selected.id, "activate");
                setSelected(null);
              }}
            >
              <p className="hint">
                التفعيل الأساسي مرة واحدة دون تاريخ انتهاء.
              </p>
            </Form>
            {!selected.is_admin && (
              <button
                className="button"
                onClick={async () => {
                  if (!confirm("إيقاف وصول هذا المكتب للنظام؟")) return;
                  setBusy(true);
                  try {
                    await act(selected.id, "suspend");
                    setSelected(null);
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "تعذر الإيقاف");
                  } finally {
                    setBusy(false);
                  }
                }}
                disabled={busy}
              >
                إيقاف الحساب
              </button>
            )}
            {!selected.member && (
              <Form
                label="حفظ اشتراك البرو"
                onSubmit={async (f) => {
                  await act(
                    selected.id,
                    str(f, "plan") === "basic" ? "basic" : "pro",
                    str(f, "plan"),
                  );
                  setSelected(null);
                }}
              >
                <Field label="الاشتراك">
                  <select name="plan" defaultValue="monthly">
                    <option value="monthly">برو لمدة شهر</option>
                    <option value="annual">برو لمدة سنة</option>
                    <option value="basic">إلغاء البرو والرجوع للأساسية</option>
                  </select>
                </Field>
                <p className="hint">
                  المدة الجديدة تبدأ من الآن. يلزم تفعيل النظام وتأكيد البريد
                  أولًا.
                </p>
              </Form>
            )}
          </Modal>
        )}
      </main>
    </div>
  );
}
