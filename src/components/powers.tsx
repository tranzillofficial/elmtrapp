"use client";
import { useEffect, useState } from "react";
import { Plus, FileText } from "lucide-react";
import { useStore } from "./provider";
import { Modal, Form, Field, SearchBox, Empty, str } from "./ui";
import { powerDaysLeft } from "@/lib/power-alerts";
import { SharePdf } from "./share-pdf";
import { day, powerTypes, type Power } from "@/lib/types";
export function Powers() {
  const { data, office, savePower, readFile } = useStore();
  const [search, setSearch] = useState(""),
    [editor, setEditor] = useState<Power | "new" | null>(null);
  const [preview, setPreview] = useState<{ url: string; title: string } | null>(
    null,
  );
  const [previewBusy, setPreviewBusy] = useState(false),
    [previewError, setPreviewError] = useState("");
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview.url);
    },
    [preview],
  );
  const writable = !office.member || office.permissions.includes("write");
  const records = data.powers
    .filter((p) =>
      `${p.principal_name} ${p.phone} ${p.official_number ?? ""}`.includes(
        search,
      ),
    )
    .toSorted((a, b) => a.expires_on.localeCompare(b.expires_on));
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>التوكيلات</h1>
          <p>بيانات الموكل، صور التوكيل والبطاقة ومواعيد الانتهاء.</p>
        </div>
        {writable && (
          <button className="button primary" onClick={() => setEditor("new")}>
            <Plus size={17} />
            إضافة توكيل
          </button>
        )}
      </div>
      <SearchBox
        value={search}
        onChange={setSearch}
        placeholder="ابحث باسم الموكل أو الهاتف أو رقم التوكيل"
      />
      <div className="document-grid powers-grid">
        {records.map((p) => {
          const status = expiry(p.expires_on);
          return (
            <article className="panel document-card" key={p.id}>
              <div className="section-title">
                <FileText size={22} />
                <span className={`badge ${status.className}`}>
                  {status.label}
                </span>
              </div>
              <h2>{p.principal_name}</h2>
              <p className="hint">
                {p.official_number
                  ? `رقم التوكيل: ${p.official_number}`
                  : "لم يُسجل رقم التوكيل"}{" "}
                ·{" "}
                {p.official_type
                  ? powerTypes[p.official_type]
                  : "النوع غير محدد"}
              </p>
              <a dir="ltr" href={`tel:${p.phone}`}>
                {p.phone}
              </a>
              <p className="hint">ينتهي في {day(`${p.expires_on}T12:00:00`)}</p>
              <div className="power-files">
                {[
                  [p.poa_path, "صورة التوكيل"],
                  [p.front_path, "البطاقة — الوجه"],
                  [p.back_path, "البطاقة — الظهر"],
                ].map(([path, title]) => (
                  <button
                    className="text-button"
                    key={path}
                    disabled={previewBusy}
                    onClick={async () => {
                      setPreviewBusy(true);
                      setPreviewError("");
                      try {
                        const blob = await readFile(path);
                        setPreview({ url: URL.createObjectURL(blob), title });
                      } catch (e) {
                        setPreviewError(
                          e instanceof Error ? e.message : "تعذر فتح الصورة",
                        );
                      } finally {
                        setPreviewBusy(false);
                      }
                    }}
                  >
                    {title}
                  </button>
                ))}
              </div>
              <SharePdf
                paths={[p.poa_path]}
                identityPaths={[p.front_path, p.back_path]}
                name={`توكيل-${p.principal_name}`}
                phone={p.phone}
              />
              {writable && (
                <button className="text-button" onClick={() => setEditor(p)}>
                  تعديل البيانات / تجديد التاريخ
                </button>
              )}
              <p className="hint">محفوظ: صورة التوكيل · البطاقة وجه وظهر</p>
            </article>
          );
        })}
      </div>
      {!records.length && (
        <div className="panel">
          <Empty
            title="لا توجد توكيلات"
            text="أضف بيانات الموكل وصورة التوكيل ووجهي البطاقة."
          />
        </div>
      )}
      {previewError && (
        <p className="alert error" role="alert">
          {previewError}
        </p>
      )}
      {preview && (
        <Modal title={preview.title} onClose={() => setPreview(null)}>
          {/* Uploaded private blob has no stable Next/Image URL. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="power-preview"
            src={preview.url}
            alt={preview.title}
          />
        </Modal>
      )}
      {editor && (
        <Modal
          title={editor === "new" ? "إضافة توكيل" : "تعديل التوكيل"}
          onClose={() => setEditor(null)}
        >
          <Form
            onCancel={() => setEditor(null)}
            onSubmit={async (f) => {
              await savePower(
                {
                  principal_name: str(f, "principal_name"),
                  phone: str(f, "phone"),
                  official_number: str(f, "official_number"),
                  official_type: str(
                    f,
                    "official_type",
                  ) as Power["official_type"],
                  expires_on: str(f, "expires_on"),
                },
                editor === "new"
                  ? ([f.get("poa"), f.get("front"), f.get("back")] as File[])
                  : [],
                editor === "new" ? undefined : editor.id,
              );
              setEditor(null);
            }}
          >
            <Field label="اسم الموكل">
              <input
                name="principal_name"
                required
                maxLength={160}
                defaultValue={editor === "new" ? "" : editor.principal_name}
              />
            </Field>
            <div className="form-grid">
              <Field label="رقم التوكيل الرسمي">
                <input
                  name="official_number"
                  maxLength={100}
                  defaultValue={
                    editor === "new" ? "" : (editor.official_number ?? "")
                  }
                />
              </Field>
              <Field label="نوع التوكيل">
                <select
                  name="official_type"
                  defaultValue={
                    editor === "new" ? "general" : (editor.official_type ?? "")
                  }
                >
                  <option value="">غير محدد</option>
                  {Object.entries(powerTypes).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="form-grid">
              <Field label="رقم الهاتف">
                <input
                  name="phone"
                  type="tel"
                  required
                  maxLength={30}
                  dir="ltr"
                  defaultValue={editor === "new" ? "" : editor.phone}
                />
              </Field>
              <Field label="تاريخ انتهاء التوكيل">
                <input
                  name="expires_on"
                  type="date"
                  required
                  defaultValue={editor === "new" ? "" : editor.expires_on}
                />
              </Field>
            </div>
            {editor === "new" && (
              <>
                <p className="hint">
                  صور JPG / PNG / WebP، حتى 20 ميجابايت لكل صورة. يمكنك التصوير
                  بالكاميرا أو الاختيار من المعرض.
                </p>
                {[
                  ["poa", "صورة التوكيل"],
                  ["front", "صورة البطاقة — الوجه"],
                  ["back", "صورة البطاقة — الظهر"],
                ].map(([name, label]) => (
                  <Field label={label} key={name}>
                    <input
                      name={name}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      required
                    />
                  </Field>
                ))}
              </>
            )}
          </Form>
        </Modal>
      )}
    </>
  );
}
function expiry(date: string) {
  const days = powerDaysLeft(date);
  return days < 0
    ? { label: "منتهي", className: "closed" }
    : days <= 30
      ? { label: "ينتهي قريبًا", className: "postponed" }
      : { label: "ساري", className: "active" };
}
