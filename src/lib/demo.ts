import { Data, EMPTY } from "./types";
export function demoData(): Data {
  const now = new Date();
  const date = (offset: number, hour = 10) => {
    const d = new Date(now);
    d.setDate(d.getDate() + offset);
    d.setHours(hour, 0, 0, 0);
    return d.toISOString();
  };
  const created_at = date(-30);
  return {
    ...EMPTY,
    clients: [
      {
        id: "demo-client-1",
        name: "محمد أحمد",
        phone: "01012345678",
        email: "mohamed@example.com",
        address: "مدينة نصر، القاهرة",
        opening_balance: 0,
        notes: "يفضل التواصل بعد الساعة الخامسة مساءً",
        created_at,
      },
      {
        id: "demo-client-2",
        name: "سارة محمود",
        phone: "01123456789",
        email: "sara@example.com",
        address: "الدقي، الجيزة",
        opening_balance: 0,
        notes: "",
        created_at,
      },
      {
        id: "demo-client-3",
        name: "شركة النور للتجارة",
        phone: "01234567890",
        email: "info@example.com",
        address: "التجمع الخامس، القاهرة",
        opening_balance: 0,
        notes: "",
        created_at,
      },
    ],
    cases: [
      {
        id: "demo-case-1",
        client_id: "demo-client-1",
        title: "دعوى تعويض",
        number: "١٢٤٥ / ٢٠٢٦",
        court: "محكمة القاهرة الكلية",
        status: "active",
        summary:
          "دعوى تعويض عن الأضرار المادية والمعنوية الناتجة عن حادث سير. جارٍ تجهيز المستندات والتقارير المتعلقة بالواقعة.",
        opponent: "شركة الأمان للتأمين",
        fee: 15000,
        created_at,
      },
      {
        id: "demo-case-2",
        client_id: "demo-client-2",
        title: "دعوى نفقة",
        number: "٣٣١ / ٢٠٢٦",
        court: "محكمة الأسرة",
        status: "postponed",
        summary: "متابعة المستندات وتحديد موعد الجلسة القادمة.",
        opponent: "أحمد علي",
        fee: 10000,
        created_at,
      },
      {
        id: "demo-case-3",
        client_id: "demo-client-1",
        title: "دعوى إيجار",
        number: "٧٨٩ / ٢٠٢٥",
        court: "محكمة الجيزة",
        status: "closed",
        summary: "تم إنهاء إجراءات القضية وحفظ ملفها.",
        opponent: "",
        fee: 3000,
        created_at,
      },
      {
        id: "demo-case-4",
        client_id: "demo-client-3",
        title: "استئناف مدني",
        number: "٢١٨ / ٢٠٢٦",
        court: "محكمة استئناف القاهرة",
        status: "active",
        summary: "مراجعة المستندات والمذكرات الخاصة بالاستئناف.",
        opponent: "",
        fee: 18000,
        created_at,
      },
    ],
    hearings: [
      {
        id: "demo-hearing-1",
        case_id: "demo-case-1",
        starts_at: date(0, 10),
        court: "محكمة القاهرة الكلية",
        purpose: "تقديم المستندات",
        notes: "إحضار أصل تقرير الخبير",
        reminder_minutes: 60,
        created_at,
      },
      {
        id: "demo-hearing-2",
        case_id: "demo-case-2",
        starts_at: date(2, 11),
        court: "محكمة الأسرة",
        purpose: "مرافعة",
        notes: "",
        reminder_minutes: 60,
        created_at,
      },
      {
        id: "demo-hearing-3",
        case_id: "demo-case-4",
        starts_at: date(4, 9),
        court: "محكمة استئناف القاهرة",
        purpose: "نظر الاستئناف",
        notes: "",
        reminder_minutes: 120,
        created_at,
      },
    ],
    notes: [
      {
        id: "demo-note-1",
        case_id: "demo-case-1",
        body: "مراجعة تقرير الخبير قبل الجلسة القادمة والتأكد من اكتمال المستندات.",
        created_at,
      },
    ],
    payments: [
      {
        id: "demo-payment-1",
        client_id: "demo-client-1",
        amount: 6000,
        paid_at: date(-14),
        method: "نقدي",
        notes: "دفعة من إجمالي الحساب",
        created_at,
      },
      {
        id: "demo-payment-2",
        client_id: "demo-client-1",
        amount: 3000,
        paid_at: date(-7),
        method: "تحويل بنكي",
        notes: "",
        created_at,
      },
      {
        id: "demo-payment-3",
        client_id: "demo-client-2",
        amount: 2500,
        paid_at: date(-3),
        method: "نقدي",
        notes: "",
        created_at,
      },
    ],
  };
}
