"use client";
import { useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Modal, IconButton, Empty } from "./ui";
import { useStore } from "./provider";
const normal = (s: string) =>
  s
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/[\u064B-\u065F]/g, "")
    .replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 1632))
    .replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 1776))
    .trim();
export function GlobalSearch() {
  const { data, office } = useStore();
  const [open, setOpen] = useState(false),
    [query, setQuery] = useState("");
  const q = normal(query);
  const can = (module: string) =>
    !office.member || office.permissions.includes(module);
  const all = [
    ...(can("clients")
      ? data.clients.map((c) => ({
          id: c.id,
          type: "موكل",
          title: c.name,
          detail: c.phone,
          text: `${c.name} ${c.phone} ${c.national_id ?? ""}`,
          href: `/clients/${c.id}`,
        }))
      : []),
    ...(can("cases")
      ? data.cases.map((c) => ({
          id: c.id,
          type: "قضية",
          title: c.title,
          detail: c.number,
          text: `${c.title} ${c.number} ${c.court} ${c.district_court ?? ""} ${data.clients.find((x) => x.id === c.client_id)?.name ?? ""}`,
          href: `/cases/${c.id}`,
        }))
      : []),
    ...(can("documents")
      ? data.powers.map((p) => ({
          id: p.id,
          type: "توكيل",
          title: p.principal_name,
          detail: p.official_number ?? "",
          text: `${p.principal_name} ${p.official_number ?? ""} ${p.phone}`,
          href: `/powers?record=${p.id}`,
        }))
      : []),
    ...(can("documents")
      ? data.documents.map((d) => ({
          id: d.id,
          type: "مستند",
          title: d.name,
          detail: "المستندات",
          text: d.name,
          href: `/documents?record=${d.id}`,
        }))
      : []),
  ];
  const results = q ? all.filter((r) => normal(r.text).includes(q)) : [];
  return (
    <>
      <IconButton label="بحث في المكتب" onClick={() => setOpen(true)}>
        <Search size={19} />
      </IconButton>
      {open && (
        <Modal
          title="بحث في المكتب"
          onClose={() => {
            setOpen(false);
            setQuery("");
          }}
        >
          <label className="field">
            <span>اسم موكل، رقم قضية أو توكيل، مستند</span>
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث في بيانات المكتب..."
            />
          </label>
          {q && <p className="hint">{results.length} نتيجة</p>}
          <div className="global-results">
            {results.slice(0, 50).map((r) => (
              <Link
                key={`${r.type}-${r.id}`}
                className="notification-row"
                href={r.href}
                onClick={() => {
                  setOpen(false);
                  setQuery("");
                }}
              >
                <span className="search-type">{r.type}</span>
                <span>
                  <strong>{r.title}</strong>
                  <small>{r.detail}</small>
                </span>
              </Link>
            ))}
          </div>
          {q && !results.length && <Empty title="لا توجد نتائج مطابقة" />}
          {results.length > 50 && (
            <p className="hint">
              تظهر أول 50 نتيجة. اكتب تفاصيل أكثر لتضييق البحث.
            </p>
          )}
        </Modal>
      )}
    </>
  );
}
