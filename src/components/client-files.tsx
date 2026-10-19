"use client";
import Link from "next/link";
import { useState } from "react";
import { SharePdf } from "./share-pdf";
import { useStore } from "./provider";
export function ClientFiles({ id }: { id: string }) {
  const { data, upload, openDocument, setError } = useStore();
  const [busy, setBusy] = useState(false);
  return (
    <section className="panel">
      <h2>مستندات العميل</h2>
      <p className="hint">
        البطاقة، التوكيلات ومستندات العميل العامة، مستقلة عن القضايا.
      </p>
      <label className="button">
        {busy ? "جارٍ الرفع…" : "إضافة بطاقة / توكيل / مستند"}
        <input
          type="file"
          hidden
          multiple
          disabled={busy}
          accept="image/jpeg,image/png,image/webp,application/pdf"
          onChange={async (e) => {
            const files = Array.from(e.target.files ?? []);
            e.target.value = "";
            setBusy(true);
            try {
              for (const file of files) await upload(id, file, "", "client");
            } catch (e) {
              setError(e instanceof Error ? e.message : "تعذر الرفع");
            } finally {
              setBusy(false);
            }
          }}
        />
      </label>
      <Link className="button" href={`/scanner?client=${id}`}>
        مسح بالكاميرا
      </Link>
      {data.documents
        .filter((d) => d.client_id === id)
        .map((d) => (
          <div className="team-row" key={d.id}>
            <span className="row-main">{d.name}</span>
            <SharePdf
              paths={[d.path]}
              name={d.name}
              phone={data.clients.find((c) => c.id === id)?.phone}
            />
            <button
              className="text-button"
              onClick={() =>
                void openDocument(d.id).catch((e) => setError(e.message))
              }
            >
              فتح
            </button>
          </div>
        ))}
    </section>
  );
}
