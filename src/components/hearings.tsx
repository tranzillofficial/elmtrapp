"use client";
import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Download,
  Pencil,
  Clock,
} from "lucide-react";
import { useStore } from "./provider";
import { HearingEditor } from "./editors";
import { Empty, IconButton, SectionTitle } from "./ui";
import { HearingRow } from "./overview";
import { Hearing, day } from "@/lib/types";
import { downloadCalendar } from "./cases";
const key = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export function Hearings() {
  const { data } = useStore();
  const [month, setMonth] = useState(new Date()),
    [selected, setSelected] = useState(key(new Date())),
    [modal, setModal] = useState<Hearing | "new" | null>(null),
    [view, setView] = useState("day");
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const offset = (first.getDay() + 1) % 7;
  const count = new Date(
    month.getFullYear(),
    month.getMonth() + 1,
    0,
  ).getDate();
  const rows = data.hearings
    .filter((h) => view === "all" || key(new Date(h.starts_at)) === selected)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const move = (n: number) =>
    setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1));
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>الجلسات والمواعيد</h1>
          <p>كل جلسة في موعدها، وكل خطوة محسوبة.</p>
        </div>
        <button
          className="button primary"
          onClick={() => setModal("new")}
          disabled={!data.cases.length}
        >
          <Plus size={18} />
          إضافة موعد
        </button>
      </div>
      <div className="calendar-layout">
        <section className="panel calendar">
          <div className="calendar-top">
            <IconButton label="الشهر السابق" onClick={() => move(-1)}>
              <ChevronRight size={18} />
            </IconButton>
            <strong>
              {month.toLocaleDateString("ar-EG", {
                month: "long",
                year: "numeric",
              })}
            </strong>
            <IconButton label="الشهر التالي" onClick={() => move(1)}>
              <ChevronLeft size={18} />
            </IconButton>
          </div>
          <div className="calendar-grid">
            {[
              "السبت",
              "الأحد",
              "الإثنين",
              "الثلاثاء",
              "الأربعاء",
              "الخميس",
              "الجمعة",
            ].map((d) => (
              <span className="weekday" key={d}>
                {d}
              </span>
            ))}
            {Array.from({ length: offset }, (_, i) => (
              <span key={"blank" + i} />
            ))}
            {Array.from({ length: count }, (_, i) => {
              const d = new Date(month.getFullYear(), month.getMonth(), i + 1);
              const k = key(d);
              const has = data.hearings.some(
                (h) => key(new Date(h.starts_at)) === k,
              );
              return (
                <button
                  key={k}
                  aria-label={day(d.toISOString())}
                  aria-pressed={selected === k}
                  className={`${selected === k ? "chosen" : ""} ${key(new Date()) === k ? "today" : ""}`}
                  onClick={() => {
                    setSelected(k);
                    setView("day");
                  }}
                >
                  {(i + 1).toLocaleString("ar-EG")}
                  {has && <i />}
                </button>
              );
            })}
          </div>
          <div className="calendar-legend">
            <i />
            يوم به جلسات{" "}
            <button
              className="text-button"
              onClick={() => {
                setMonth(new Date());
                setSelected(key(new Date()));
                setView("day");
              }}
            >
              اليوم
            </button>
          </div>
        </section>
        <section className="panel">
          <SectionTitle
            title={
              view === "all"
                ? "كل المواعيد"
                : day(selected + "T12:00:00", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })
            }
            action={
              <button
                className="text-button"
                onClick={() => setView(view === "all" ? "day" : "all")}
              >
                {view === "all" ? "اليوم المحدد" : "كل المواعيد"}
              </button>
            }
          />
          {rows.map((h) => (
            <div className="appointment" key={h.id}>
              <HearingRow item={h} />
              {h.notes && <p className="hint">{h.notes}</p>}
              <div className="small-actions">
                <span>
                  <Clock size={13} />
                  تذكير قبل {h.reminder_minutes} دقيقة
                </span>
                <button
                  className="text-button"
                  onClick={() =>
                    downloadCalendar(
                      h,
                      data.cases.find((c) => c.id === h.case_id)?.title ??
                        "جلسة",
                    )
                  }
                >
                  <Download size={14} />
                  للتقويم
                </button>
                <IconButton label="تعديل الموعد" onClick={() => setModal(h)}>
                  <Pencil size={15} />
                </IconButton>
              </div>
            </div>
          ))}
          {!rows.length && (
            <Empty
              title="يوم هادئ، لا توجد مواعيد"
              text="يمكنك إضافة موعد جديد أو اختيار يوم آخر."
            />
          )}
        </section>
      </div>
      {modal && (
        <HearingEditor
          item={modal === "new" ? undefined : modal}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}
