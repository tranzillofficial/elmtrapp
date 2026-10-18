"use client";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  BookOpen,
  Bookmark,
  ChevronLeft,
  Sparkles,
  Send,
  FolderOpen,
  LockKeyhole,
  ExternalLink,
  LoaderCircle,
  Check,
  FileText,
} from "lucide-react";
import { useStore } from "./provider";
import { SearchBox, PremiumBadge, Empty, SectionTitle, IconButton } from "./ui";
import { supabase } from "@/lib/supabase";
export function PremiumGate({ children }: { children: React.ReactNode }) {
  const { premium } = useStore();
  return premium ? (
    <>{children}</>
  ) : (
    <div className="panel premium-gate">
      <LockKeyhole size={32} />
      <h2>مساحة قانونية أوسع لمكتبك</h2>
      <p>مرجع القانون والمساعد القانوني متاحان مع الاشتراك الشهري أو السنوي.</p>
      <Link href="/settings" className="button primary">
        تفاصيل الباقة
      </Link>
    </div>
  );
}
export function Library() {
  const { data, demo, save, remove, setError } = useStore();
  const [search, setSearch] = useState(""),
    [law, setLaw] = useState(""),
    [selected, setSelected] = useState(""),
    [onlySaved, setOnlySaved] = useState(false);
  const articles = data.articles.filter(
    (a) =>
      (!law || a.law_id === law) &&
      (!onlySaved || data.bookmarks.some((b) => b.article_id === a.id)) &&
      `${a.article_number} ${a.chapter} ${a.body} ${data.laws.find((l) => l.id === a.law_id)?.title}`.includes(
        search,
      ),
  );
  const article = data.articles.find((a) => a.id === selected);
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>مرجع القانون المصري</h1>
          <p>المعلومة القانونية، أقرب إليك.</p>
        </div>
        <PremiumBadge />
      </div>
      <PremiumGate>
        <div className="toolbar">
          <SearchBox
            value={search}
            onChange={setSearch}
            placeholder="ابحث باسم القانون أو رقم المادة أو نصها"
          />
          <button
            className={`button ${onlySaved ? "active-tool" : ""}`}
            onClick={() => setOnlySaved(!onlySaved)}
          >
            <Bookmark size={16} />
            المحفوظات
          </button>
        </div>
        <div className="segments law-segments">
          <button className={!law ? "selected" : ""} onClick={() => setLaw("")}>
            كل القوانين
          </button>
          {data.laws.map((l) => (
            <button
              key={l.id}
              className={law === l.id ? "selected" : ""}
              onClick={() => setLaw(l.id)}
            >
              {l.title}
            </button>
          ))}
        </div>
        {!data.laws.length ? (
          <div className="panel">
            <div className="law-categories">
              {["القانون المدني", "قانون العقوبات", "قانون المرافعات"].map(
                (l) => (
                  <div key={l}>
                    <BookOpen size={22} />
                    <strong>{l}</strong>
                    <span>بانتظار إضافة المرجع</span>
                  </div>
                ),
              )}
            </div>
            <Empty
              title="المرجع جاهز لاستقبال القوانين"
              text="تُضاف نصوص القوانين والمواد من مصادر موثقة إلى قاعدة البيانات. لن نعرض نصوصًا تجريبية كأنها مواد قانونية صحيحة."
            />
            {demo && (
              <p className="hint">
                هذه معاينة للواجهة. دليل الإعداد يوضح طريقة إضافة القوانين
                ومصادرها وتاريخ مراجعتها.
              </p>
            )}
          </div>
        ) : (
          <div className="library-layout">
            <section className="panel">
              <SectionTitle title={`نتائج البحث (${articles.length})`} />
              {articles.map((a) => (
                <button
                  key={a.id}
                  className={`article-row ${selected === a.id ? "chosen" : ""}`}
                  onClick={() => setSelected(a.id)}
                >
                  <BookOpen size={19} />
                  <span>
                    <strong>المادة {a.article_number}</strong>
                    <small>
                      {data.laws.find((l) => l.id === a.law_id)?.title} ·{" "}
                      {a.chapter}
                    </small>
                  </span>
                  <ChevronLeft size={16} />
                </button>
              ))}
              {!articles.length && <Empty title="لا توجد مواد مطابقة" />}
            </section>
            <section className="panel">
              {article ? (
                <>
                  <div className="section-title">
                    <h2>المادة {article.article_number}</h2>
                    <IconButton
                      label="حفظ في المفضلة"
                      onClick={async () => {
                        try {
                          const b = data.bookmarks.find(
                            (b) => b.article_id === article.id,
                          );
                          if (b) await remove("bookmarks", b.id);
                          else
                            await save("bookmarks", { article_id: article.id });
                        } catch (e) {
                          setError(
                            e instanceof Error ? e.message : "تعذر الحفظ",
                          );
                        }
                      }}
                    >
                      {data.bookmarks.some(
                        (b) => b.article_id === article.id,
                      ) ? (
                        <Check size={18} />
                      ) : (
                        <Bookmark size={18} />
                      )}
                    </IconButton>
                  </div>
                  <p className="eyebrow">
                    {data.laws.find((l) => l.id === article.law_id)?.title}
                  </p>
                  <p className="prose article-body">{article.body}</p>
                  {article.source_url &&
                    /^https?:\/\//.test(article.source_url) && (
                      <a
                        className="text-button"
                        href={article.source_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        عرض المصدر <ExternalLink size={14} />
                      </a>
                    )}
                  <p className="hint">
                    آخر مراجعة:{" "}
                    {article.verified_at
                      ? new Date(article.verified_at).toLocaleDateString(
                          "ar-EG",
                        )
                      : "لم يتم توثيق تاريخ مراجعة هذه المادة"}
                  </p>
                </>
              ) : (
                <Empty title="اختر مادة لقراءة نصها" />
              )}
            </section>
          </div>
        )}
      </PremiumGate>
    </>
  );
}
type Message = { role: "user" | "assistant"; text: string };
export function Assistant() {
  const { data, demo, premium } = useStore();
  const [caseId, setCaseId] = useState(""),
    [prompt, setPrompt] = useState(""),
    [messages, setMessages] = useState<Message[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const bottom = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() =>
      setCaseId(new URLSearchParams(window.location.search).get("case") ?? ""),
    );
    return () => cancelAnimationFrame(frame);
  }, []);
  useEffect(
    () =>
      bottom.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }),
    [messages, busy],
  );
  const send = async (text = prompt) => {
    if (!text.trim() || busy || !premium) return;
    setError("");
    if (demo) {
      setError(
        "لتشغيل التحليل الفعلي، اربط Supabase وسجل الدخول وفعّل الاشتراك واضبط مفتاح AI Gateway. لا يتم توليد تحليل وهمي في المعاينة.",
      );
      return;
    }
    if (!caseId) {
      setError("اختر قضية أولًا حتى يكون التحليل متعلقًا بملفها");
      return;
    }
    setBusy(true);
    try {
      const {
        data: { session },
      } = await supabase!.auth.getSession();
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          caseId,
          prompt: text,
          history: messages.slice(-8),
        }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error ?? "تعذر الاتصال بالمساعد");
      setMessages((v) => [
        ...v,
        { role: "user", text },
        { role: "assistant", text: result.text },
      ]);
      setPrompt("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر الاتصال بالمساعد");
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>المساعد القانوني</h1>
          <p>شريكك في تنظيم الأفكار ومراجعة تفاصيل القضية.</p>
        </div>
        <PremiumBadge />
      </div>
      <PremiumGate>
        <div className="assistant-layout">
          <section className="panel chat-panel">
            <div className="chat-case">
              <FolderOpen size={18} />
              <select
                aria-label="القضية المرتبطة"
                value={caseId}
                onChange={(e) => {
                  setCaseId(e.target.value);
                  setMessages([]);
                  setError("");
                }}
              >
                <option value="">اختر القضية المرتبطة</option>
                {data.cases.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title} — {c.number}
                  </option>
                ))}
              </select>
            </div>
            <div className="messages" aria-live="polite">
              {!messages.length && (
                <div className="assistant-welcome">
                  <div className="assistant-orb">
                    <Sparkles size={29} />
                  </div>
                  <h2>كيف أساعدك في قضيتك؟</h2>
                  <p>
                    اختر ملف القضية واطلب تلخيص الوقائع، مراجعة النواقص أو
                    اقتراح خطوات المتابعة.
                  </p>
                  <div className="suggestions">
                    {[
                      "حلل ملخص القضية والمستندات",
                      "ما المستندات التي تحتاج مراجعة؟",
                      "اقترح جدولًا للتحضير للجلسة",
                    ].map((s) => (
                      <button key={s} onClick={() => void send(s)}>
                        {s}
                        <ChevronLeft size={15} />
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((m, i) => (
                <div className={`message ${m.role}`} key={i}>
                  {m.role === "assistant" && <Sparkles size={17} />}
                  <div>{m.text}</div>
                </div>
              ))}
              {busy && (
                <div className="message assistant">
                  <LoaderCircle className="spin" size={18} />
                  جارٍ مراجعة الملف...
                </div>
              )}
              <div ref={bottom} />
            </div>
            {error && (
              <p className="alert error" role="alert">
                {error}
              </p>
            )}
            <form
              className="chat-input"
              onSubmit={(e) => {
                e.preventDefault();
                void send();
              }}
            >
              <textarea
                aria-label="اسأل عن القضية"
                placeholder="اسأل عن القضية..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={1}
                maxLength={4000}
                disabled={busy}
              />
              <button
                aria-label="إرسال"
                className="icon-button"
                disabled={busy || !prompt.trim()}
              >
                <Send size={21} />
              </button>
            </form>
            <p className="chat-disclaimer">
              المساعد أداة دعم. مراجعة المحامي مطلوبة، والمعلومات ليست حكمًا أو
              ضمانًا لنتيجة.
            </p>
          </section>
          <aside>
            <section className="panel">
              <SectionTitle title="سياق التحليل" />
              <p className="hint">
                يُرسل ملخص القضية، ملاحظاتها ونصوص المستندات المدخلة للمزود عند
                طلب التحليل. صور المستندات لا تُقرأ تلقائيًا.
              </p>
              {caseId && (
                <>
                  <SectionTitle title="مستندات القضية" />
                  {data.documents
                    .filter((d) => d.case_id === caseId)
                    .map((d) => (
                      <div key={d.id} className="context-document">
                        <FileText size={17} />
                        <span>
                          {d.name}
                          <small>
                            {d.extracted_text
                              ? "النص متاح للتحليل"
                              : "لا يوجد نص مستخرج"}
                          </small>
                        </span>
                      </div>
                    ))}
                </>
              )}
              <p className="hint">
                المواد القانونية التي يستند إليها المساعد تأتي من المرجع الموثق
                المُضاف لحسابك.
              </p>
            </section>
          </aside>
        </div>
      </PremiumGate>
    </>
  );
}
