"use client";
/* eslint-disable @next/next/no-img-element -- Scanner previews are local Blob URLs, never remote optimized images. */
import { useEffect, useRef, useState } from "react";
import {
  Camera,
  ImagePlus,
  Crop,
  Contrast,
  RotateCw,
  Trash2,
  Check,
  ScanLine,
  FileDown,
  LoaderCircle,
} from "lucide-react";
import { useStore } from "./provider";
import { Field, IconButton } from "./ui";
type Page = { url: string; blob: Blob; name: string };
type Bounds = { x: number; y: number; w: number; h: number };
const full: Bounds = { x: 0, y: 0, w: 100, h: 100 };
async function loadImage(url: string) {
  const image = new Image();
  image.src = url;
  await image.decode();
  return image;
}
export function Scanner() {
  const { data, upload, setNotice } = useStore();
  const [clientTarget, setClientTarget] = useState(false);
  const [caseId, setCaseId] = useState(""),
    [camera, setCamera] = useState(false),
    [source, setSource] = useState(""),
    [pages, setPages] = useState<Page[]>([]),
    [bounds, setBounds] = useState(full),
    [enhance, setEnhance] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [crop, setCrop] = useState(false),
    [transcript, setTranscript] = useState("");
  const video = useRef<HTMLVideoElement>(null),
    stream = useRef<MediaStream | null>(null),
    input = useRef<HTMLInputElement>(null),
    sourceRef = useRef(""),
    pagesRef = useRef<Page[]>([]);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const q = new URLSearchParams(window.location.search);
      setClientTarget(q.has("client"));
      setCaseId(q.get("client") ?? q.get("case") ?? "");
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  useEffect(() => {
    sourceRef.current = source;
    pagesRef.current = pages;
  }, [source, pages]);
  useEffect(
    () => () => {
      stream.current?.getTracks().forEach((t) => t.stop());
      if (sourceRef.current) URL.revokeObjectURL(sourceRef.current);
      pagesRef.current.forEach((p) => URL.revokeObjectURL(p.url));
    },
    [],
  );
  useEffect(() => {
    if (camera && video.current && stream.current) {
      video.current.srcObject = stream.current;
      void video.current
        .play()
        .catch(() => setError("اضغط على معاينة الكاميرا لتشغيلها"));
    }
  }, [camera]);
  const stop = () => {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    setCamera(false);
  };
  const start = async () => {
    setError("");
    try {
      if (!navigator.mediaDevices?.getUserMedia)
        throw new Error(
          "الكاميرا تحتاج اتصال HTTPS أو localhost. يمكنك اختيار صورة من المعرض.",
        );
      stream.current = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1440 },
        },
        audio: false,
      });
      setCamera(true);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "تعذر فتح الكاميرا. اسمح بالوصول إليها أو استخدم المعرض.",
      );
    }
  };
  const accept = async (blob: Blob) => {
    if (source) URL.revokeObjectURL(source);
    const url = URL.createObjectURL(blob);
    setSource(url);
    setBounds(full);
    setError("");
    stop();
    await detect(url);
  };
  const detect = async (url: string) => {
    const img = await loadImage(url);
    const c = document.createElement("canvas");
    c.width = 400;
    c.height = Math.round((img.height / img.width) * 400);
    const ctx = c.getContext("2d")!;
    ctx.drawImage(img, 0, 0, c.width, c.height);
    const px = ctx.getImageData(0, 0, c.width, c.height).data;
    let minX = c.width,
      minY = c.height,
      maxX = 0,
      maxY = 0,
      hits = 0;
    for (let y = 0; y < c.height; y += 3)
      for (let x = 0; x < c.width; x += 3) {
        const i = (y * c.width + x) * 4;
        const values = [px[i], px[i + 1], px[i + 2]];
        if (
          Math.min(...values) > 170 &&
          Math.max(...values) - Math.min(...values) < 55
        ) {
          hits++;
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        }
      }
    const area = ((maxX - minX) * (maxY - minY)) / (c.width * c.height);
    if (area > 0.18 && area < 0.94 && hits > 100) {
      setBounds({
        x: Math.max(0, (minX / c.width) * 100 - 1),
        y: Math.max(0, (minY / c.height) * 100 - 1),
        w: Math.min(100, ((maxX - minX) / c.width) * 100 + 2),
        h: Math.min(100, ((maxY - minY) / c.height) * 100 + 2),
      });
      setNotice("تم اقتراح حدود الورقة. راجع القص قبل الحفظ.");
    } else {
      setBounds(full);
      setNotice("راجع حدود الورقة واضبطها يدويًا عند الحاجة");
    }
  };
  const capture = async () => {
    const v = video.current;
    if (!v?.videoWidth) return;
    const c = document.createElement("canvas");
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext("2d")!.drawImage(v, 0, 0);
    const b = await new Promise<Blob | null>((r) =>
      c.toBlob(r, "image/jpeg", 0.93),
    );
    if (b) await accept(b);
  };
  const render = async () => {
    const img = await loadImage(source);
    const x = (img.width * bounds.x) / 100,
      y = (img.height * bounds.y) / 100,
      w = Math.min(img.width - x, (img.width * bounds.w) / 100),
      h = Math.min(img.height - y, (img.height * bounds.h) / 100);
    const scale = Math.min(1, 2200 / Math.max(w, h));
    const c = document.createElement("canvas");
    c.width = Math.round(w * scale);
    c.height = Math.round(h * scale);
    const ctx = c.getContext("2d")!;
    ctx.drawImage(img, x, y, w, h, 0, 0, c.width, c.height);
    if (enhance) {
      const image = ctx.getImageData(0, 0, c.width, c.height);
      for (let i = 0; i < image.data.length; i += 4) {
        const v = Math.max(
          0,
          Math.min(
            255,
            (image.data[i] * 0.299 +
              image.data[i + 1] * 0.587 +
              image.data[i + 2] * 0.114 -
              128) *
              1.35 +
              150,
          ),
        );
        image.data[i] = image.data[i + 1] = image.data[i + 2] = v;
      }
      ctx.putImageData(image, 0, 0);
    }
    return new Promise<Blob>((resolve, reject) =>
      c.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("تعذر معالجة الصورة"))),
        "image/jpeg",
        0.92,
      ),
    );
  };
  const addPage = async () => {
    setBusy(true);
    setError("");
    try {
      const blob = await render();
      setPages((p) => [
        ...p,
        {
          url: URL.createObjectURL(blob),
          blob,
          name: `مستند-${p.length + 1}.jpg`,
        },
      ]);
      URL.revokeObjectURL(source);
      setSource("");
      setBounds(full);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };
  const rotate = async () => {
    const img = await loadImage(source);
    const c = document.createElement("canvas");
    c.width = img.height;
    c.height = img.width;
    const ctx = c.getContext("2d")!;
    ctx.translate(c.width / 2, c.height / 2);
    ctx.rotate(Math.PI / 2);
    ctx.drawImage(img, -img.width / 2, -img.height / 2);
    const b = await new Promise<Blob | null>((r) =>
      c.toBlob(r, "image/jpeg", 0.95),
    );
    if (b) await accept(b);
  };
  const save = async () => {
    if (!caseId) {
      setError("اختر العميل أو القضية لإرفاق المستند");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const list = [...pages];
      if (source) {
        const blob = await render();
        list.push({ url: "", blob, name: "مستند.jpg" });
      }
      if (!list.length) throw new Error("أضف صفحة واحدة على الأقل");
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF();
      for (let i = 0; i < list.length; i++) {
        if (i) pdf.addPage();
        const url = list[i].url || URL.createObjectURL(list[i].blob);
        const img = await loadImage(url);
        const w = 190,
          h = Math.min(277, (w * img.height) / img.width);
        const width = (h * img.width) / img.height;
        pdf.addImage(img, "JPEG", (210 - width) / 2, 10, width, h);
        if (!list[i].url) URL.revokeObjectURL(url);
      }
      await upload(
        caseId,
        new File(
          [pdf.output("blob")],
          `مستند-ممسوح-${new Date().toISOString().slice(0, 10)}.pdf`,
          { type: "application/pdf" },
        ),
        transcript,
        clientTarget ? "client" : "case",
      );
      pages.forEach((p) => URL.revokeObjectURL(p.url));
      setPages([]);
      if (source) URL.revokeObjectURL(source);
      setSource("");
      setTranscript("");
      setNotice("تم حفظ المستند");
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر حفظ المستند");
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>مسح مستند</h1>
          <p>من ورقة إلى ملف منظم، في خطوات بسيطة.</p>
        </div>
        <span className="subtle-chip">
          <ScanLine size={15} />
          ماسح المستندات
        </span>
      </div>
      <div className="scanner-layout">
        <section className="panel scanner-panel">
          <div
            className={`camera-stage ${source || camera ? "has-image" : ""}`}
          >
            {camera ? (
              <video
                ref={video}
                autoPlay
                playsInline
                muted
                onClick={() => void video.current?.play()}
              />
            ) : source ? (
              <>
                <img
                  src={source}
                  alt="معاينة الورقة قبل القص"
                  style={{
                    filter: enhance
                      ? "grayscale(1) contrast(1.35) brightness(1.08)"
                      : undefined,
                  }}
                />
                <div
                  className="scan-bounds"
                  style={{
                    left: `${bounds.x}%`,
                    top: `${bounds.y}%`,
                    width: `${Math.min(bounds.w, 100 - bounds.x)}%`,
                    height: `${Math.min(bounds.h, 100 - bounds.y)}%`,
                  }}
                >
                  <i />
                  <i />
                  <i />
                  <i />
                </div>
              </>
            ) : (
              <div className="scanner-empty">
                <ScanLine size={54} />
                <h2>ضع المستند داخل الإطار</h2>
                <p>صوّر في إضاءة جيدة وعلى سطح بلون مختلف عن الورقة.</p>
                <button className="button primary" onClick={() => void start()}>
                  <Camera size={18} />
                  فتح الكاميرا
                </button>
                <button
                  className="text-button"
                  onClick={() => input.current?.click()}
                >
                  أو اختر صورة من المعرض
                </button>
              </div>
            )}
          </div>
          <div className="scanner-tools">
            {source ? (
              <>
                <button className="button" onClick={() => void detect(source)}>
                  <Crop size={16} />
                  قص تلقائي
                </button>
                <button
                  className={`button ${enhance ? "active-tool" : ""}`}
                  onClick={() => setEnhance(!enhance)}
                  aria-pressed={enhance}
                >
                  <Contrast size={16} />
                  تحسين الوضوح
                </button>
                <IconButton label="تدوير الصورة" onClick={() => void rotate()}>
                  <RotateCw size={18} />
                </IconButton>
                <button className="text-button" onClick={() => setCrop(!crop)}>
                  ضبط الحدود
                </button>
              </>
            ) : (
              <>
                <IconButton
                  label="اختيار صورة من المعرض"
                  onClick={() => input.current?.click()}
                >
                  <ImagePlus size={23} />
                </IconButton>
                {camera ? (
                  <button
                    className="shutter"
                    aria-label="التقاط المستند"
                    onClick={() => void capture()}
                  />
                ) : (
                  <IconButton label="فتح الكاميرا" onClick={() => void start()}>
                    <Camera size={23} />
                  </IconButton>
                )}
                {camera && (
                  <button className="text-button" onClick={stop}>
                    إغلاق الكاميرا
                  </button>
                )}
              </>
            )}
          </div>
          {source && crop && (
            <div className="crop-controls">
              {(["x", "y", "w", "h"] as const).map((k) => (
                <Field
                  label={
                    {
                      x: "بداية أفقية",
                      y: "بداية رأسية",
                      w: "العرض",
                      h: "الارتفاع",
                    }[k]
                  }
                  key={k}
                >
                  <input
                    type="range"
                    min={k === "w" || k === "h" ? 10 : 0}
                    max={k === "x" || k === "y" ? 85 : 100}
                    value={bounds[k]}
                    onChange={(e) =>
                      setBounds({ ...bounds, [k]: Number(e.target.value) })
                    }
                  />
                </Field>
              ))}
            </div>
          )}
          {source && (
            <button
              className="button full"
              disabled={busy}
              onClick={() => void addPage()}
            >
              <PlusPage />
              إضافة الصفحة ومتابعة المسح
            </button>
          )}
          <input
            ref={input}
            type="file"
            className="sr-only"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                if (file.size > 20 * 1024 * 1024) {
                  setError("حجم الصورة يجب ألا يتجاوز ٢٠ ميجابايت");
                  return;
                }
                void accept(file).catch(() => setError("تعذر قراءة الصورة"));
              }
              e.target.value = "";
            }}
          />
        </section>
        <aside>
          <section className="panel">
            <h2>حفظ المستند</h2>
            <button
              type="button"
              className="text-button"
              onClick={() => {
                setClientTarget((v) => !v);
                setCaseId("");
              }}
            >
              التبديل إلى {clientTarget ? "قضية" : "مستند عميل"}
            </button>
            <Field label={clientTarget ? "إرفاق بالعميل" : "إرفاق بالقضية"}>
              <select
                value={caseId}
                onChange={(e) => setCaseId(e.target.value)}
              >
                <option value="">
                  اختر {clientTarget ? "العميل" : "القضية"}
                </option>
                {(clientTarget
                  ? data.clients.map((c) => ({
                      id: c.id,
                      title: c.name,
                      number: "",
                    }))
                  : data.cases
                ).map((c) => (
                  <option value={c.id} key={c.id}>
                    {c.title} — {c.number}
                  </option>
                ))}
              </select>
            </Field>
            <div className="scanned-pages">
              {pages.map((p, i) => (
                <div key={p.url}>
                  <img src={p.url} alt={`صفحة ${i + 1}`} />
                  <span>{i + 1}</span>
                  <IconButton
                    label={`حذف الصفحة ${i + 1}`}
                    onClick={() => {
                      URL.revokeObjectURL(p.url);
                      setPages((v) => v.filter((x) => x !== p));
                    }}
                  >
                    <Trash2 size={13} />
                  </IconButton>
                </div>
              ))}
            </div>
            <p className="hint">
              {pages.length} صفحات جاهزة{source ? " + صفحة قيد المراجعة" : ""}.
              تُجمع الصفحات في ملف PDF واحد.
            </p>
            <Field label="نص المستند للمساعد (اختياري)">
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                maxLength={30000}
                placeholder="اكتب أو الصق النص الذي تريد أن يراجعه المساعد مع المستند."
              />
            </Field>
            <p className="hint">
              الماسح يحسّن الصورة ويقترح حدود القص. قراءة النصوص تلقائيًا OCR
              غير مفعّلة في هذه النسخة.
            </p>
            {error && (
              <p role="alert" className="alert error">
                {error}
              </p>
            )}
            <button
              className="button primary full"
              disabled={busy || (!pages.length && !source)}
              onClick={() => void save()}
            >
              {busy ? (
                <LoaderCircle size={17} className="spin" />
              ) : (
                <FileDown size={17} />
              )}{" "}
              {busy
                ? "جارٍ الحفظ..."
                : clientTarget
                  ? "حفظ في ملف العميل"
                  : "حفظ في القضية"}
            </button>
          </section>
          {!data.cases.length && (
            <p className="alert">أضف قضية أولًا لحفظ المستندات داخلها.</p>
          )}
        </aside>
      </div>
    </>
  );
}
function PlusPage() {
  return <Check size={17} />;
}
