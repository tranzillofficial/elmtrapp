"use client";
import { ActivationPanel } from "./activation";
import { InstallApp } from "./install";
import { TeamSettings } from "./team";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePricing } from "@/lib/pricing";
import {
  Building2,
  ShieldCheck,
  Crown,
  Sun,
  Moon,
  LogOut,
  Cloud,
  HardDrive,
  RefreshCw,
} from "lucide-react";
import { useStore } from "./provider";
import { Form, Field, str } from "./ui";
import { supabase } from "@/lib/supabase";
export function Settings({
  theme,
  setTheme,
}: {
  theme: string;
  setTheme: (s: string) => void;
}) {
  const pricing = usePricing();
  const router = useRouter();
  const {
    profile,
    saveProfile,
    demo,
    entitlement,
    premium,
    resetDemo,
    leaveDemo,
  } = useStore();
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>الإعدادات</h1>
          <p>مساحة عمل على طريقتك.</p>
        </div>
      </div>
      {!demo && <ActivationPanel />}
      <TeamSettings />
      <div className="settings-grid">
        <InstallApp />
        <section className="panel">
          <h2 className="inline-icon">
            <Building2 size={19} />
            بيانات المكتب
          </h2>
          <Form
            onSubmit={async (f) =>
              saveProfile({
                full_name: str(f, "full_name"),
                office_name: str(f, "office_name"),
                phone: str(f, "phone"),
              })
            }
          >
            <Field label="اسم المحامي">
              <input
                name="full_name"
                required
                maxLength={100}
                defaultValue={profile.full_name}
              />
            </Field>
            <Field label="اسم المكتب">
              <input
                name="office_name"
                required
                maxLength={150}
                defaultValue={profile.office_name}
              />
            </Field>
            <Field label="هاتف المكتب">
              <input
                name="phone"
                type="tel"
                dir="ltr"
                defaultValue={profile.phone}
              />
            </Field>
          </Form>
        </section>
        <div>
          <section className="panel">
            <h2>المظهر</h2>
            <p className="hint">اختر التصميم المناسب لك.</p>
            <div className="segments appearance">
              {[
                ["light", "فاتح", Sun],
                ["dark", "داكن", Moon],
              ].map(([v, l, Icon]) => {
                const I = Icon as typeof Sun;
                return (
                  <button
                    key={String(v)}
                    className={theme === v ? "selected" : ""}
                    onClick={() => setTheme(String(v))}
                  >
                    <I size={17} />
                    {String(l)}
                  </button>
                );
              })}
            </div>
          </section>
          <section className="panel subscription-card">
            <h2 className="inline-icon">
              <Crown size={19} />
              باقة المكتب
            </h2>
            <strong>
              {demo
                ? "معاينة كل المميزات"
                : premium
                  ? entitlement.plan === "annual"
                    ? "الاشتراك السنوي"
                    : "الاشتراك الشهري"
                  : "الباقة الأساسية"}
            </strong>
            <p className="hint">
              الأساسية: القضايا، الجلسات، العملاء، الحسابات والمستندات. الاشتراك
              يضيف مرجع القانون والمساعد القانوني.
            </p>
            {entitlement.expires_at && (
              <p className="hint">
                تنتهي في{" "}
                {new Date(entitlement.expires_at).toLocaleDateString("ar-EG")}
              </p>
            )}
            <p className="hint">
              البرو: {pricing.monthly} جنيه شهريًا أو {pricing.annual} جنيه
              سنويًا بدل {pricing.annualBeforeDiscount}. تفعيل الاشتراك وإدارته
              يتمان من مسؤول التطبيق. لا يوجد دفع إلكتروني أو تفعيل تلقائي
              للباقة في هذه النسخة.
            </p>
          </section>
        </div>
        <section className="panel">
          <h2 className="inline-icon">
            {demo ? <HardDrive size={19} /> : <Cloud size={19} />}حفظ البيانات
          </h2>
          <p>{demo ? "وضع المعاينة التجريبية" : "حساب Supabase متصل"}</p>
          <p className="hint">
            {demo
              ? "البيانات التجريبية محفوظة في هذا المتصفح، والمستندات في تخزين الجهاز. ليست بديلًا عن النسخ الاحتياطي ولا تنتقل تلقائيًا للحساب الحقيقي."
              : "بياناتك ومستنداتك مرتبطة بحسابك ومعزولة عن المستخدمين الآخرين بصلاحيات قاعدة البيانات."}
          </p>
          {demo && (
            <button
              className="button"
              onClick={() => {
                if (
                  confirm(
                    "إعادة بيانات المعاينة؟ سيُحذف ما أضفته داخل المعاينة.",
                  )
                )
                  resetDemo();
              }}
            >
              <RefreshCw size={16} />
              إعادة المعاينة
            </button>
          )}
          {supabase &&
            (demo ? (
              <button
                className="button primary"
                onClick={() => {
                  leaveDemo();
                  router.push("/login");
                }}
              >
                ربط حسابي / تسجيل الدخول
              </button>
            ) : (
              <button
                className="button"
                onClick={() => void supabase!.auth.signOut()}
              >
                <LogOut size={17} />
                تسجيل الخروج
              </button>
            ))}
        </section>
        <section className="panel">
          <h2 className="inline-icon">
            <ShieldCheck size={19} />
            خصوصية ملفاتك
          </h2>
          <p className="hint">
            مستندات القضايا في حاوية خاصة. رابط فتح المستند مؤقت، والـAI لا
            يستقبل سياق القضية إلا عند إرسال طلب تحليل صريح.
          </p>
          <p className="hint">
            يمكن إضافة الموقع للشاشة الرئيسية من قائمة المتصفح. يتطلب الحساب
            السحابي اتصالًا بالإنترنت.
          </p>
        </section>
      </div>
    </>
  );
}
export function Auth() {
  const router = useRouter();
  const [signup, setSignup] = useState(false),
    [message, setMessage] = useState("");
  useEffect(() => {
    const frame = requestAnimationFrame(() =>
      setSignup(
        new URLSearchParams(window.location.search).get("mode") === "signup",
      ),
    );
    return () => cancelAnimationFrame(frame);
  }, []);
  return (
    <main className="auth-page">
      <section className="auth-brand">
        <div className="brand">
          Elmtr App<span>مساحة مكتبك القانونية</span>
        </div>
        <h1>
          كل تفاصيل مكتبك.
          <br />
          <em>في مكان واحد.</em>
        </h1>
        <p>قضاياك، عملاؤك وجلساتك. تجربة منظمة تمنحك وقتًا أكثر لما يهم.</p>
      </section>
      <section className="panel auth-card">
        <span className="eyebrow">مرحبًا بك في Elmtr App</span>
        <h2>{signup ? "إنشاء حساب مكتب" : "تسجيل الدخول"}</h2>
        <p className="hint">
          {signup ? "ابدأ تنظيم مكتبك بخطوة واحدة." : "أكمل من حيث توقفت."}
        </p>
        <Form
          label={signup ? "إنشاء حساب" : "دخول إلى المكتب"}
          onSubmit={async (f) => {
            if (!supabase) throw new Error("لم يتم ربط Supabase بعد");
            setMessage("");
            if (signup) {
              const { data, error } = await supabase.auth.signUp({
                email: str(f, "email"),
                password: str(f, "password"),
                options: { data: { full_name: str(f, "name") } },
              });
              if (error) throw error;
              setMessage(
                data.session
                  ? "تم إنشاء حسابك وإرسال طلب التفعيل للإدارة"
                  : "راجع بريدك لتأكيد الحساب، ثم سجل الدخول لمتابعة طلب التفعيل.",
              );
            } else {
              const { error } = await supabase.auth.signInWithPassword({
                email: str(f, "email"),
                password: str(f, "password"),
              });
              if (error) throw error;
            }
          }}
        >
          {signup && (
            <Field label="اسم المحامي">
              <input name="name" required autoComplete="name" />
            </Field>
          )}
          <Field label="البريد الإلكتروني">
            <input
              name="email"
              type="email"
              required
              dir="ltr"
              autoComplete="email"
            />
          </Field>
          <Field label="كلمة المرور">
            <input
              name="password"
              type="password"
              minLength={8}
              required
              dir="ltr"
              autoComplete={signup ? "new-password" : "current-password"}
            />
          </Field>
        </Form>
        {message && (
          <p className="alert" role="status">
            {message}
          </p>
        )}
        <button
          className="text-button auth-switch"
          onClick={() => {
            setSignup(!signup);
            setMessage("");
          }}
        >
          {signup
            ? "لديك حساب؟ تسجيل الدخول"
            : "ليس لديك حساب؟ إنشاء حساب جديد"}
        </button>
        <hr />
        <Link href="/" className="text-button auth-switch">
          العودة للموقع
        </Link>
        <button className="button full" onClick={() => router.push("/demo")}>
          استكشاف المعاينة التجريبية
        </button>
      </section>
    </main>
  );
}
