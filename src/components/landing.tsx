"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowUpLeft,
  ArrowLeft,
  Play,
  Check,
  ChevronLeft,
  FolderOpen,
  CalendarDays,
  Users,
  Wallet,
  ScanLine,
  BookOpen,
  Sparkles,
  ShieldCheck,
  MonitorSmartphone,
  Scale,
  FileText,
  Clock,
  Plus,
  Crown,
} from "lucide-react";
import { usePricing } from "@/lib/pricing";
const benefits = [
  {
    Icon: FolderOpen,
    title: "لكل قضية، ملف متكامل",
    text: "اجمع بيانات القضية والخصم والملخص والملاحظات والمستندات، وارجع لأي تفصيلة في وقتها.",
  },
  {
    Icon: CalendarDays,
    title: "كل جلسة في حسابك",
    text: "تابع الجلسات من تقويم واضح، وسجّل ملاحظاتك وأضف الموعد لتقويم جهازك مع تذكير.",
  },
  {
    Icon: Wallet,
    title: "حساب العميل واضح",
    text: "شوف إجمالي الأتعاب والمدفوع والمتبقي. سجّل دفعة واحدة على حساب العميل مهما كان عدد قضاياه.",
  },
  {
    Icon: ScanLine,
    title: "المستند في مكانه",
    text: "ارفع مستنداتك أو صوّر الورق بالكاميرا، واضبط القص والوضوح واجمع الصفحات في ملف PDF.",
  },
];
const faqs = [
  {
    q: "سعر النظام اشتراك ولا دفع مرة واحدة؟",
    a: "سعر الشراء المعروض هو رسوم تفعيل السيستم مرة واحدة للباقة الأساسية. اشتراك البرو اختياري، ويُضاف إلى سعر السيستم إذا احتجت المميزات الإضافية.",
  },
  {
    q: "إيه الفرق بين الأساسي والبرو؟",
    a: "الأساسي يشمل إدارة القضايا والعملاء والجلسات والدفعات والمستندات. البرو يضيف مرجع القانون المصري والمساعد القانوني، عند تفعيل الاشتراك وتجهيز الخدمات ومحتوى المرجع.",
  },
  {
    q: "هل حساب الديمو بيحتاج تسجيل أو بيانات دفع؟",
    a: "لا. زر تجربة الديمو يفتح مساحة ببيانات تجريبية مستقلة في متصفحك. تقدر تضيف قضية وعميل وتجرب الدفعات من غير التأثير على أي حساب حقيقي.",
  },
  {
    q: "ينفع أستخدمه من الموبايل والكمبيوتر؟",
    a: "نعم، التصميم متجاوب مع الموبايل والتابلت والكمبيوتر. حساب المكتب المتصل يحتاج إنترنت للوصول إلى بياناته السحابية.",
  },
  {
    q: "هل الذكاء الاصطناعي بديل لرأي المحامي؟",
    a: "المساعد يساعد في التلخيص وتنظيم الأفكار ومراجعة النواقص، ويظل تحليل الملف والقرار النهائي مسؤولية المحامي. تشغيله يتطلب تفعيل خدمة الذكاء الاصطناعي.",
  },
];
export function Landing() {
  const pricing = usePricing();
  const saving = Math.max(0, pricing.annualBeforeDiscount - pricing.annual);
  const savingPercent =
    pricing.annualBeforeDiscount > 0
      ? Math.round((saving / pricing.annualBeforeDiscount) * 100)
      : 0;
  const [period, setPeriod] = useState<"monthly" | "annual">("annual");
  return (
    <div className="landing" dir="rtl">
      <header className="lp-header">
        <div className="lp-container lp-nav">
          <Link className="lp-brand" href="/">
            <span className="lp-logo-frame">
              <Image
                src="/elmtr-logo.png"
                alt=""
                width={64}
                height={64}
                priority
              />
            </span>
            <span className="lp-brand-wordmark">
              Elmtr App<small>مكتبك القانوني</small>
            </span>
          </Link>
          <nav aria-label="تنقل الصفحة">
            <a href="#features">المميزات</a>
            <a href="#pricing">الأسعار</a>
            <a href="#questions">أسئلة شائعة</a>
          </nav>
          <div className="lp-nav-actions">
            <Link href="/login" className="lp-login">
              تسجيل الدخول
            </Link>
            <Link href="/demo" className="lp-button lp-small">
              جرّب الديمو <ArrowUpLeft size={15} />
            </Link>
          </div>
        </div>
      </header>
      <main>
        <section className="lp-hero lp-container">
          <div className="lp-hero-copy">
            <span className="lp-kicker">
              <span />
              مصمّم لمكاتب المحاماة في مصر
            </span>
            <h1>
              قضاياك تحت السيطرة.
              <br />
              <em>ومكتبك في مكان واحد.</em>
            </h1>
            <p>
              من أول مقابلة مع العميل لآخر جلسة. رتّب قضاياك، تابع مواعيدك
              وحساباتك، واحفظ مستنداتك في مساحة عمل واحدة واضحة.
            </p>
            <div className="lp-hero-actions">
              <Link className="lp-button" href="/demo">
                <Play size={16} />
                جرّب حساب ديمو
                <ArrowLeft size={17} />
              </Link>
              <a className="lp-button lp-secondary" href="#pricing">
                شوف الباقات
              </a>
            </div>
            <div className="lp-reassurance">
              <span>
                <Check size={14} />
                بدون تسجيل
              </span>
              <span>
                <Check size={14} />
                بدون بيانات دفع
              </span>
              <span>
                <Check size={14} />
                موبايل وكمبيوتر
              </span>
            </div>
            <div className="lp-hero-price">
              <strong>
                {pricing.setup.toLocaleString("ar-EG")} <small>جنيه</small>
              </strong>
              <span>
                تفعيل السيستم مرة واحدة
                <br />
                <b>واشتراك البرو على اختيارك</b>
              </span>
            </div>
          </div>
          <div className="lp-hero-visual">
            <ProductPreview />
            <div className="lp-floating-note">
              <div>
                <CalendarDays size={20} />
              </div>
              <span>
                <b>مواعيدك قدامك</b>
                <small>وكل ملف جاهز للجلسة</small>
              </span>
              <Check size={15} />
            </div>
            <span className="lp-preview-label">
              معاينة توضيحية لواجهة السيستم
            </span>
          </div>
        </section>
        <div className="lp-proof-strip">
          <div className="lp-container">
            {[
              { Icon: Scale, text: "واجهة عربية تناسب شغلك" },
              { Icon: ShieldCheck, text: "كل مكتب له بياناته الخاصة" },
              { Icon: MonitorSmartphone, text: "تجربة متكاملة على كل أجهزتك" },
            ].map(({ Icon, text }) => (
              <div key={text}>
                <Icon size={20} />
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>
        <section className="lp-section lp-container" id="features">
          <div className="lp-section-heading">
            <span className="lp-kicker">ترتيب أكثر. انشغال أقل.</span>
            <h2>
              تفاصيل كتير.
              <br />
              ومكان واحد يجمعها.
            </h2>
            <p>
              بدل ما تدور بين دفتر المواعيد والملفات والحسابات، خلّي شغلك مترتب
              حوالين كل قضية وعميل.
            </p>
          </div>
          <div className="lp-feature-grid">
            {benefits.map(({ Icon, title, text }, i) => (
              <article className="lp-feature" key={title}>
                <div className="lp-feature-top">
                  <span>
                    <Icon size={24} />
                  </span>
                  <small>0{i + 1}</small>
                </div>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="lp-workflow-section">
          <div className="lp-container lp-workflow">
            <div>
              <span className="lp-kicker">رحلة شغل أبسط</span>
              <h2>
                من ملف جديد
                <br />
                لمتابعة كل التفاصيل.
              </h2>
              <p>خطوات واضحة، من غير ما تعيد نفس البيانات كل مرة.</p>
              <Link href="/demo" className="lp-inline-link">
                جرّب الخطوات بنفسك <ArrowLeft size={16} />
              </Link>
            </div>
            <ol>
              {[
                {
                  title: "أضف العميل والقضية",
                  text: "سجّل البيانات الأساسية، الملخص والأتعاب في ملف واحد.",
                },
                {
                  title: "رتّب الجلسات والمستندات",
                  text: "حدّد الموعد وارفع الأوراق أو امسحها بالكاميرا.",
                },
                {
                  title: "تابع الحساب وخطوتك الجاية",
                  text: "سجّل الدفعات والملاحظات، وارجع للملف وقت ما تحتاجه.",
                },
              ].map((s, i) => (
                <li key={s.title}>
                  <span>{i + 1}</span>
                  <div>
                    <h3>{s.title}</h3>
                    <p>{s.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>
        <section className="lp-section lp-container lp-pro-section">
          <div className="lp-pro-copy">
            <span className="lp-kicker">
              <Crown size={15} />
              Elmtr App PRO
            </span>
            <h2>
              مساحة أوسع
              <br />
              للبحث والمراجعة.
            </h2>
            <p>
              زوّد أدوات مكتبك بمرجع قانوني قابل للبحث، ومساعد يساعدك ترتّب
              الوقائع وتراجع النقاط اللي تحتاج انتباهك.
            </p>
            <div className="lp-pro-feature">
              <BookOpen size={22} />
              <div>
                <h3>مرجع القانون المصري</h3>
                <p>
                  بحث باسم القانون أو رقم المادة، مع النص ومصدره عند إضافة
                  المرجع الموثق.
                </p>
              </div>
            </div>
            <div className="lp-pro-feature">
              <Sparkles size={22} />
              <div>
                <h3>مساعد مرتبط بملف القضية</h3>
                <p>
                  تلخيص الوقائع، مراجعة النواقص واقتراح خطوات المتابعة، مع
                  مراجعتك المهنية.
                </p>
              </div>
            </div>
            <a className="lp-inline-link" href="#pricing">
              شوف اشتراك البرو <ArrowLeft size={16} />
            </a>
          </div>
          <div className="lp-ai-preview">
            <div className="lp-ai-top">
              <span>
                <Sparkles size={19} />
                المساعد القانوني
              </span>
              <span className="lp-pro-label">PRO</span>
            </div>
            <div className="lp-ai-case">
              <FolderOpen size={15} />
              ملف القضية · دعوى تعويض
            </div>
            <div className="lp-ai-user">
              رتّب لي نقاط مراجعة الملف قبل الجلسة.
            </div>
            <div className="lp-ai-message">
              <Sparkles size={20} />
              <div>
                <strong>قائمة التحضير للجلسة</strong>
                <p>
                  <Check size={14} />
                  مراجعة تسلسل الوقائع والتواريخ.
                </p>
                <p>
                  <Check size={14} />
                  التأكد من اكتمال المستندات.
                </p>
                <p>
                  <Check size={14} />
                  تجهيز النقاط المطلوب مناقشتها.
                </p>
              </div>
            </div>
            <div className="lp-ai-input">
              اسأل عن القضية…
              <ArrowUpLeft size={17} />
            </div>
            <small>مثال توضيحي للواجهة، وليس تحليلًا لقضية فعلية.</small>
          </div>
        </section>
        <section className="lp-section lp-pricing-section" id="pricing">
          <p className="hint">
            الحسابات الفرعية للمكتب: {pricing.seatMonthly} جنيه شهريًا أو{" "}
            {pricing.seatAnnual} جنيه سنويًا للحساب، بتفعيل من الأدمن وصلاحيات
            مستقلة لكل محامٍ.
          </p>
          <div className="lp-container">
            <div className="lp-section-heading lp-centered">
              <span className="lp-kicker">استثمار واضح لمكتبك</span>
              <h2>
                ابدأ بالسيستم.
                <br />
                وزوّد إمكانياتك وقت ما تحتاج.
              </h2>
              <p>رسوم تفعيل مرة واحدة، واشتراك برو اختياري يُضاف إليها.</p>
            </div>
            <div className="lp-pricing-grid">
              <article className="lp-price-card">
                <div className="lp-card-label">
                  <FolderOpen size={21} />
                  السيستم الأساسي
                </div>
                <h3>كل أساسيات إدارة مكتبك</h3>
                <div className="lp-price">
                  <strong>{pricing.setup.toLocaleString("ar-EG")}</strong>
                  <span>
                    جنيه
                    <br />
                    <b>مرة واحدة</b>
                  </span>
                </div>
                <p>رسوم تفعيل السيستم الأساسي.</p>
                <ul>
                  {[
                    "إدارة القضايا وملفات العملاء",
                    "تقويم الجلسات والمواعيد",
                    "حسابات العملاء وتسجيل الدفعات",
                    "رفع المستندات ومسح الورق إلى PDF",
                    "واجهة عربية للموبايل والكمبيوتر",
                  ].map((x) => (
                    <li key={x}>
                      <Check size={16} />
                      {x}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/login?mode=signup"
                  className="lp-button lp-secondary"
                >
                  أنشئ حساب مكتبك <ArrowLeft size={17} />
                </Link>
              </article>
              <article className="lp-price-card lp-price-pro">
                {saving > 0 && (
                  <span className="lp-savings">
                    وفّر {saving.toLocaleString("ar-EG")} جنيه مع السنوي
                  </span>
                )}
                <div className="lp-card-label">
                  <Crown size={21} />
                  اشتراك PRO
                </div>
                <h3>أدوات إضافية للبحث والتحليل</h3>
                <div
                  className="lp-billing"
                  role="group"
                  aria-label="دورية اشتراك البرو"
                >
                  <button
                    aria-pressed={period === "monthly"}
                    onClick={() => setPeriod("monthly")}
                  >
                    شهري
                  </button>
                  <button
                    aria-pressed={period === "annual"}
                    onClick={() => setPeriod("annual")}
                  >
                    سنوي{" "}
                    {savingPercent > 0 && (
                      <span>وفّر {savingPercent.toLocaleString("ar-EG")}٪</span>
                    )}
                  </button>
                </div>
                <div className="lp-price">
                  <strong>
                    {(period === "annual"
                      ? pricing.annual
                      : pricing.monthly
                    ).toLocaleString("ar-EG")}
                  </strong>
                  <span>
                    جنيه
                    <br />
                    <b>/{period === "annual" ? "السنة" : "الشهر"}</b>
                  </span>
                  {period === "annual" && saving > 0 && (
                    <del aria-label="السعر السنوي قبل الخصم">
                      {pricing.annualBeforeDiscount.toLocaleString("ar-EG")}
                    </del>
                  )}
                </div>
                <p>
                  بالإضافة إلى رسوم تفعيل السيستم{" "}
                  {pricing.setup.toLocaleString("ar-EG")} جنيه.
                </p>
                <ul>
                  {[
                    "مرجع القانون المصري والبحث في المواد",
                    "حفظ المواد القانونية للرجوع إليها",
                    "مساعد قانوني مرتبط بملف القضية",
                    "تلخيص ومراجعة واقتراح خطوات المتابعة",
                  ].map((x) => (
                    <li key={x}>
                      <Check size={16} />
                      {x}
                    </li>
                  ))}
                </ul>
                <Link href="/demo" className="lp-button">
                  استكشف حساب البرو <ArrowLeft size={17} />
                </Link>
                <small>يتطلب تفعيل خدمات البرو وإضافة المرجع القانوني.</small>
              </article>
            </div>
          </div>
        </section>
        <section
          className="lp-section lp-container lp-faq-section"
          id="questions"
        >
          <div className="lp-section-heading">
            <span className="lp-kicker">قبل ما تبدأ</span>
            <h2>
              أسئلة بتفرق
              <br />
              في قرارك.
            </h2>
            <p>جرّب الديمو وخد وقتك في استكشاف التفاصيل.</p>
            <Link href="/demo" className="lp-inline-link">
              افتح حساب الديمو <ArrowLeft size={16} />
            </Link>
          </div>
          <div className="lp-faqs">
            {faqs.map((f, i) => (
              <details key={f.q} open={i === 0 ? true : undefined}>
                <summary>
                  {f.q}
                  <Plus size={17} />
                </summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </section>
        <section className="lp-final-cta lp-container">
          <div>
            <span className="lp-kicker">مكتب أهدى. رؤية أوضح.</span>
            <h2>جرّب طريقة أكثر تنظيمًا لشغلك.</h2>
            <p>افتح الديمو، ضيف قضية، وسجّل أول دفعة بنفسك.</p>
          </div>
          <Link href="/demo" className="lp-button">
            <Play size={16} />
            ابدأ تجربة الديمو <ArrowLeft size={17} />
          </Link>
        </section>
      </main>
      <footer className="lp-footer lp-container">
        <Link className="lp-brand" href="/">
          <span className="lp-logo-frame">
            <Image src="/elmtr-logo.png" alt="" width={64} height={64} />
          </span>
          <span className="lp-brand-wordmark">
            Elmtr App<small>مكتبك القانوني في مكان واحد</small>
          </span>
        </Link>
        <p>إدارة أوضح لمكتب المحاماة.</p>
        <div>
          <Link href="/login">تسجيل الدخول</Link>
          <a href="#pricing">الباقات</a>
          <Link href="/demo">الديمو</Link>
        </div>
      </footer>
    </div>
  );
}
function ProductPreview() {
  return (
    <div className="lp-product-preview">
      <div className="lp-browser-bar">
        <span />
        <span />
        <span />
        <b>elmtrapp.com</b>
        <ShieldCheck size={11} />
      </div>
      <div className="lp-preview-app">
        <aside>
          <b>Elmtr App</b>
          {[
            { Icon: FolderOpen, text: "نظرة عامة" },
            { Icon: CalendarDays, text: "الجلسات" },
            { Icon: Users, text: "العملاء" },
            { Icon: FileText, text: "المستندات" },
          ].map(({ Icon, text }, i) => (
            <span className={i === 0 ? "on" : ""} key={text}>
              <Icon size={13} />
              {text}
            </span>
          ))}
          <Scale size={21} />
        </aside>
        <div className="lp-preview-body">
          <div className="lp-preview-title">
            <span>
              <strong>أهلًا، أستاذ أحمد</strong>
              <small>ملخص أعمال مكتبك اليوم</small>
            </span>
            <span className="lp-preview-avatar">أ</span>
          </div>
          <div className="lp-preview-stats">
            {[
              { Icon: FolderOpen, title: "القضايا النشطة", v: "٢٤" },
              { Icon: CalendarDays, title: "جلسات الأسبوع", v: "٦" },
              { Icon: Wallet, title: "المستحقات", v: "٢٨٬٥٠٠" },
            ].map(({ Icon, title, v }) => (
              <div key={title}>
                <span>
                  {title}
                  <Icon size={13} />
                </span>
                <b>{v}</b>
              </div>
            ))}
          </div>
          <div className="lp-preview-columns">
            <div>
              <strong>
                الجلسات القادمة <ChevronLeft size={11} />
              </strong>
              {[
                {
                  day: "١٩",
                  month: "أكتوبر",
                  title: "محكمة القاهرة الكلية",
                  sub: "دعوى تعويض · ١٠:٠٠ ص",
                },
                {
                  day: "٢١",
                  month: "أكتوبر",
                  title: "محكمة الأسرة",
                  sub: "دعوى نفقة · ١١:٣٠ ص",
                },
                {
                  day: "٢٣",
                  month: "أكتوبر",
                  title: "محكمة استئناف القاهرة",
                  sub: "استئناف مدني · ٩:٠٠ ص",
                },
              ].map((r) => (
                <div className="lp-preview-hearing" key={r.day}>
                  <span>
                    <b>{r.day}</b>
                    <small>{r.month}</small>
                  </span>
                  <div>
                    <b>{r.title}</b>
                    <small>
                      <Clock size={9} />
                      {r.sub}
                    </small>
                  </div>
                </div>
              ))}
            </div>
            <div className="lp-preview-file">
              <FolderOpen size={25} />
              <b>دعوى تعويض</b>
              <small>محمد أحمد</small>
              <span>متداولة</span>
              <hr />
              <small>الجلسة القادمة</small>
              <b>١٩ أكتوبر</b>
              <div>
                <FileText size={14} />٣ مستندات مرفقة
                <Check size={11} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
