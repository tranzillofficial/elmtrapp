"use client";
import { useState } from "react";
import Link from "next/link";
import { FileText, ScanLine, Download } from "lucide-react";
import { useStore } from "./provider";
import { SearchBox, Empty } from "./ui";
import { day } from "@/lib/types";
export function Documents() {
  const { data, openDocument, setError } = useStore();
  const [search, setSearch] = useState("");
  const docs = data.documents.filter((d) =>
    `${d.name} ${data.cases.find((c) => c.id === d.case_id)?.title}`.includes(
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
            <Link href={`/cases/${d.case_id}`}>
              {data.cases.find((c) => c.id === d.case_id)?.title}
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
          </article>
        ))}
      </div>
      {!docs.length && (
        <div className="panel">
          <Empty
            title="لا توجد مستندات بعد"
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
