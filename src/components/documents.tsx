"use client";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { FileText, ScanLine, Download } from "lucide-react";
import { SharePdf } from "./share-pdf";
import { useStore } from "./provider";
import { SearchBox, Empty } from "./ui";
import { day, documentCategories, type Document } from "@/lib/types";
export function Documents() {
  const { data, openDocument, setError, save, office } = useStore();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all"),
    [busy, setBusy] = useState("");
  const writable = !office.member || office.permissions.includes("write");
  const record = useSearchParams().get("record");
  const docs = data.documents.filter(
    (d) =>
      (!record || d.id === record) &&
      (category === "all" || (d.category ?? "other") === category) &&
      `${d.name} ${data.cases.find((c) => c.id === d.case_id)?.title ?? data.clients.find((c) => c.id === d.client_id)?.name}`.includes(
        search,
      ),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>المستندات</h1>
          <p>أوراق مكتبك، محفوظة بجوار قضاياها.</p>
        </div>
        <Link className="button primary" href="/scanner">
          <ScanLine size={18} />
          مسح مستند
        </Link>
      </div>
      <div
        className="document-filters"
        role="group"
        aria-label="تصنيف المستندات"
      >
        {[["all", "الكل"], ...Object.entries(documentCategories)].map(
          ([v, l]) => (
            <button
              className={`button ${category === v ? "primary" : ""}`}
              aria-pressed={category === v}
              key={v}
              onClick={() => setCategory(v)}
            >
              {l}
              <span>
                {
                  data.documents.filter(
                    (d) => v === "all" || (d.category ?? "other") === v,
                  ).length
                }
              </span>
            </button>
          ),
        )}
      </div>
      <SearchBox
        value={search}
        onChange={setSearch}
        placeholder="ابحث باسم المستند أو القضية"
      />
      <div className="document-grid">
        {docs.map((d) => (
          <article className="panel document-card" key={d.id}>
            <div className="document-preview">
              <FileText size={45} />
              <span>{d.mime_type === "application/pdf" ? "PDF" : "صورة"}</span>
            </div>
            <h2>{d.name}</h2>
            {writable ? (
              <label className="field">
                <span>نوع المستند</span>
                <select
                  aria-label={`نوع المستند: ${d.name}`}
                  value={d.category ?? "other"}
                  disabled={busy === d.id}
                  onChange={async (e) => {
                    const value = e.target.value as Document["category"];
                    setBusy(d.id);
                    try {
                      await save("documents", { category: value }, d.id);
                    } catch (e) {
                      setError(
                        e instanceof Error ? e.message : "تعذر تغيير التصنيف",
                      );
                    } finally {
                      setBusy("");
                    }
                  }}
                >
                  {Object.entries(documentCategories).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <p className="hint">
                {documentCategories[d.category ?? "other"]}
              </p>
            )}
            <Link
              href={
                d.client_id ? `/clients/${d.client_id}` : `/cases/${d.case_id}`
              }
            >
              {d.client_id
                ? `مستند عميل: ${data.clients.find((c) => c.id === d.client_id)?.name}`
                : data.cases.find((c) => c.id === d.case_id)?.title}
            </Link>
            <p className="hint">
              {day(d.created_at)} · {(d.size / 1024).toFixed(0)} KB
            </p>
            <button
              className="button full"
              onClick={() =>
                void openDocument(d.id).catch((e) => setError(e.message))
              }
            >
              <Download size={16} />
              فتح المستند
            </button>
            <SharePdf paths={[d.path]} name={d.name} />
          </article>
        ))}
      </div>
      {!docs.length && (
        <div className="panel">
          <Empty
            title="لا توجد مستندات مطابقة"
            text="ارفع ملفاتك من صفحة القضية، أو امسح مستندًا بالكاميرا."
            action={
              <Link className="button" href="/scanner">
                فتح الماسح
              </Link>
            }
          />
        </div>
      )}
    </>
  );
}
