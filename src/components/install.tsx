"use client";
import { useEffect, useState } from "react";
type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};
let deferredInstall: InstallEvent | null = null;
export function PwaBootstrap() {
  useEffect(() => {
    const capture = (e: Event) => {
      e.preventDefault();
      deferredInstall = e as InstallEvent;
    };
    window.addEventListener("beforeinstallprompt", capture);
    if ("serviceWorker" in navigator)
      void navigator.serviceWorker.register("/sw.js").catch(() => {});
    return () => window.removeEventListener("beforeinstallprompt", capture);
  }, []);
  return null;
}
export function InstallApp() {
  const [prompt, setPrompt] = useState<InstallEvent | null>(null),
    [installed, setInstalled] = useState(false),
    [help, setHelp] = useState(false);
  useEffect(() => {
    const capture = (e: Event) => {
      e.preventDefault();
      setPrompt(e as InstallEvent);
    };
    const done = () => {
      setInstalled(true);
      setPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", capture);
    window.addEventListener("appinstalled", done);
    const frame = requestAnimationFrame(() =>
      setInstalled(window.matchMedia("(display-mode: standalone)").matches),
    );
    if ("serviceWorker" in navigator)
      void navigator.serviceWorker.register("/sw.js").catch(() => {});
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("beforeinstallprompt", capture);
      window.removeEventListener("appinstalled", done);
    };
  }, []);
  return (
    <section className="panel">
      <h2>تثبيت Elmtr App</h2>
      <p className="hint">
        افتح مكتبك من الشاشة الرئيسية كتطبيق مستقل. الحساب السحابي يحتاج
        الإنترنت.
      </p>
      <button
        className="button primary"
        disabled={installed}
        onClick={async () => {
          const available = prompt ?? deferredInstall;
          if (available) {
            await available.prompt();
            const choice = await available.userChoice;
            deferredInstall = null;
            if (choice.outcome === "accepted") setPrompt(null);
          } else setHelp(true);
        }}
      >
        {installed ? "التطبيق مثبت" : "تثبيت التطبيق PWA"}
      </button>
      {help && (
        <p className="alert" role="status">
          على iPhone: افتح الموقع في Safari ثم مشاركة ← إضافة إلى الشاشة
          الرئيسية. على Android أو الكمبيوتر: من قائمة Chrome أو Edge اختر
          «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية». قد لا يظهر الخيار إذا
          كان التطبيق مثبتًا بالفعل.
        </p>
      )}
    </section>
  );
}
