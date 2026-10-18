"use client";
import { useEffect, useId, useRef, useState } from "react";
import {
  X,
  Search,
  FolderOpen,
  ArrowLeft,
  LoaderCircle,
  Crown,
} from "lucide-react";
import Link from "next/link";
export function IconButton({
  label,
  children,
  ...props
}: {
  label: string;
  children: React.ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className="icon-button"
      type="button"
      aria-label={label}
      title={label}
      {...props}
    >
      {children}
    </button>
  );
}
export function SearchBox({
  value,
  onChange,
  placeholder = "ابحث...",
}: {
  value: string;
  onChange: (s: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="searchbox">
      <Search size={18} />
      <input
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <IconButton label="مسح البحث" onClick={() => onChange("")}>
          <X size={15} />
        </IconButton>
      )}
    </div>
  );
}
export function Empty({
  title = "لا توجد بيانات بعد",
  text,
  action,
}: {
  title?: string;
  text?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <FolderOpen size={32} />
      <strong>{title}</strong>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}
export function Badge({ status }: { status: string }) {
  return (
    <span className={`badge ${status}`}>
      {(
        { active: "متداولة", postponed: "مؤجلة", closed: "مغلقة" } as Record<
          string,
          string
        >
      )[status] ?? status}
    </span>
  );
}
export function SectionTitle({
  title,
  href,
  action,
}: {
  title: string;
  href?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="section-title">
      <h2>{title}</h2>
      {href ? (
        <Link href={href}>
          عرض الكل <ArrowLeft size={14} />
        </Link>
      ) : (
        action
      )}
    </div>
  );
}
export function PremiumBadge() {
  return (
    <span className="premium-badge">
      <Crown size={13} /> باقة باشتراك
    </span>
  );
}
export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    id = useId();
  useEffect(() => {
    const d = ref.current;
    d?.showModal();
    return () => d?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      aria-labelledby={id}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-header">
        <h2 id={id}>{title}</h2>
        <IconButton label="إغلاق" onClick={onClose}>
          <X size={19} />
        </IconButton>
      </div>
      {children}
    </dialog>
  );
}
export function Form({
  children,
  onSubmit,
  label = "حفظ",
  onCancel,
  resetOnSuccess = false,
}: {
  children: React.ReactNode;
  resetOnSuccess?: boolean;
  onSubmit: (data: FormData) => Promise<void>;
  label?: string;
  onCancel?: () => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        const form = e.currentTarget;
        const f = new FormData(form);
        setBusy(true);
        setError("");
        try {
          await onSubmit(f);
          if (resetOnSuccess) form.reset();
        } catch (e) {
          setError(e instanceof Error ? e.message : "تعذر الحفظ. حاول مجددًا");
        } finally {
          setBusy(false);
        }
      }}
    >
      {children}
      {error && (
        <p className="alert error" role="alert">
          {error}
        </p>
      )}
      <div className="form-actions">
        <button className="button primary" disabled={busy}>
          {busy ? <LoaderCircle className="spin" size={18} /> : null}
          {busy ? "جارٍ الحفظ..." : label}
        </button>
        {onCancel && (
          <button
            type="button"
            className="button"
            onClick={onCancel}
            disabled={busy}
          >
            إلغاء
          </button>
        )}
      </div>
    </form>
  );
}
export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
export const str = (f: FormData, key: string) =>
  String(f.get(key) ?? "").trim();
