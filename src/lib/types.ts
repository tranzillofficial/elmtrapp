export type Client = {
  id: string;
  owner_id?: string;
  name: string;
  phone: string;
  national_id?: string;
  address: string;
  opening_balance: number;
  notes: string;
  created_at: string;
};
export type Case = {
  id: string;
  owner_id?: string;
  client_id: string;
  title: string;
  number: string;
  court: string;
  district_court?: string;
  status: "active" | "postponed" | "closed";
  summary: string;
  opponent: string;
  fee: number;
  created_at: string;
};
export type Hearing = {
  id: string;
  owner_id?: string;
  case_id: string;
  starts_at: string;
  court: string;
  purpose: string;
  notes: string;
  reminder_minutes: number;
  created_at: string;
};
export type Note = {
  id: string;
  owner_id?: string;
  case_id: string;
  body: string;
  created_at: string;
};
export type Payment = {
  kind?: "payment" | "advance";
  id: string;
  owner_id?: string;
  client_id: string;
  amount: number;
  paid_at: string;
  method: string;
  notes: string;
  created_at: string;
};
export const documentCategories = {
  other: "أخرى",
  contract: "عقود",
  memorandum: "مذكرات",
  claim: "صحف دعاوى",
} as const;
export type Document = {
  category?: keyof typeof documentCategories;
  id: string;
  owner_id?: string;
  case_id: string | null;
  client_id?: string | null;
  name: string;
  path: string;
  mime_type: string;
  size: number;
  extracted_text: string;
  created_at: string;
};
export const powerTypes = {
  general: "عام رسمي",
  litigation: "خاص بالقضايا",
} as const;
export type Power = {
  official_number?: string;
  official_type?: "" | keyof typeof powerTypes;
  id: string;
  owner_id?: string;
  principal_name: string;
  phone: string;
  expires_on: string;
  poa_path: string;
  front_path: string;
  back_path: string;
  created_at: string;
};
export type Law = {
  id: string;
  title: string;
  number: string;
  year: number;
  source_url: string;
  verified_at: string | null;
};
export type Article = {
  id: string;
  law_id: string;
  article_number: string;
  chapter: string;
  body: string;
  source_url: string;
  verified_at: string | null;
};
export type Bookmark = {
  id: string;
  owner_id?: string;
  article_id: string;
  created_at: string;
};
export type Entitlement = {
  plan: "basic" | "monthly" | "annual";
  expires_at: string | null;
};
export type Profile = { full_name: string; office_name: string; phone: string };
export type Data = {
  powers: Power[];
  clients: Client[];
  cases: Case[];
  hearings: Hearing[];
  notes: Note[];
  payments: Payment[];
  documents: Document[];
  laws: Law[];
  articles: Article[];
  bookmarks: Bookmark[];
};
export type Table = keyof Data;
export type Row<T extends Table> = Data[T][number];
export const EMPTY: Data = {
  powers: [],
  clients: [],
  cases: [],
  hearings: [],
  notes: [],
  payments: [],
  documents: [],
  laws: [],
  articles: [],
  bookmarks: [],
};
export const statuses = {
  active: "متداولة",
  postponed: "مؤجلة",
  closed: "مغلقة",
};
export const money = (value: number) =>
  new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 2 }).format(value);
export const day = (value: string, options?: Intl.DateTimeFormatOptions) =>
  new Date(value).toLocaleDateString(
    "ar-EG",
    options ?? { day: "numeric", month: "long", year: "numeric" },
  );
export const time = (value: string) =>
  new Date(value).toLocaleTimeString("ar-EG", {
    hour: "2-digit",
    minute: "2-digit",
  });
const fromCents = (value: number) => value / 100;
const cents = (value: number) =>
  Math.round((Number(value) + Number.EPSILON) * 100);
export const totalFees = (data: Data, id: string) =>
  fromCents(
    cents(data.clients.find((c) => c.id === id)?.opening_balance ?? 0) +
      data.cases
        .filter((c) => c.client_id === id)
        .reduce((sum, c) => sum + cents(c.fee), 0),
  );
export const paid = (data: Data, id: string) =>
  fromCents(
    data.payments
      .filter((p) => p.client_id === id)
      .reduce((sum, p) => sum + cents(p.amount), 0),
  );
export const balance = (data: Data, id: string) =>
  fromCents(cents(totalFees(data, id)) - cents(paid(data, id)));
