"use client";
import { useState } from "react";
import { Share2, Download } from "lucide-react";
import { Modal } from "./ui";
import { useStore } from "./provider";
import { makePdf } from "@/lib/pdf";
export function SharePdf({
  paths,
  name,
  phone,
  identityPaths = [],
}: {
  paths: string[];
  name: string;
  phone?: string;
  identityPaths?: string[];
}) {
  const { readFile } = useStore();
  const [open, setOpen] = useState(false),
    [file, setFile] = useState<File | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [includeId, setIncludeId] = useState(false);
  const close = () => {
    setOpen(false);
    setFile(null);
    setError("");
    setIncludeId(false);
  };
  const supported =
    !!file &&
    typeof navigator !== "undefined" &&
    !!navigator.canShare?.({ files: [file] });
  return (
    <>
      <button className="button" onClick={() => setOpen(true)}>
        <Share2 size={16} />
        إرسال PDF واتساب
      </button>
      {open && (
        <Modal title="مشاركة PDF على واتساب" onClose={close}>
          <p className="hint">{name}</p>
          {!!identityPaths.length && (
            <label className="check-row">
              <input
                type="checkbox"
                checked={includeId}
                disabled={busy}
                onChange={(e) => {
                  setIncludeId(e.target.checked);
                  setFile(null);
                }}
              />
              تضمين صور البطاقة (بيانات شخصية)
            </label>
          )}
          {!file ? (
            <button
              className="button primary"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  const blobs = [];
                  for (const p of [
                    ...paths,
                    ...(includeId ? identityPaths : []),
                  ])
                    blobs.push(await readFile(p));
                  setFile(await makePdf(blobs, name));
                } catch (e) {
                  setError(e instanceof Error ? e.message : "تعذر تجهيز الملف");
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "جارٍ تجهيز PDF…" : "تجهيز PDF"}
            </button>
          ) : (
            <>
              <p className="hint">
                {file.name} · {(file.size / 1024).toFixed(0)} KB
              </p>
              {supported ? (
                <>
                  <p>اضغط مشاركة، ثم اختر واتساب والمستلم من قائمة المشاركة.</p>
                  <button
                    className="button primary"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      setError("");
                      try {
                        await navigator.share({ files: [file] });
                      } catch (e) {
                        if (!(
                          e instanceof DOMException && e.name === "AbortError"
                        ))
                          setError(
                            "تعذرت المشاركة؛ يمكنك تنزيل PDF وإرفاقه في واتساب.",
                          );
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    <Share2 size={16} />
                    مشاركة على واتساب
                  </button>
                </>
              ) : (
                <p className="hint">
                  المتصفح لا يدعم مشاركة الملفات مباشرة. نزّل PDF ثم أرفقه
                  كمستند في واتساب.
                </p>
              )}
              <button
                className="button"
                onClick={() => {
                  const url = URL.createObjectURL(file);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = file.name;
                  a.click();
                  setTimeout(() => URL.revokeObjectURL(url), 60000);
                }}
              >
                <Download size={16} />
                تنزيل PDF
              </button>
              <a
                className="button"
                target="_blank"
                rel="noopener noreferrer"
                href={`https://wa.me/${whatsappNumber(phone)}`}
              >
                فتح واتساب
              </a>
            </>
          )}
          {error && (
            <p role="alert" className="alert error">
              {error}
            </p>
          )}
        </Modal>
      )}
    </>
  );
}
function whatsappNumber(phone?: string) {
  const n = (phone ?? "")
    .replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 1632))
    .replace(/\D/g, "");
  return /^01\d{9}$/.test(n) ? `2${n}` : n.startsWith("00") ? n.slice(2) : n;
}
