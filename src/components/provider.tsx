"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { demoData } from "@/lib/demo";
import {
  Power,
  Data,
  EMPTY,
  Table,
  Row,
  Profile,
  Entitlement,
  balance,
} from "@/lib/types";
import { localFile, removeLocalFile } from "@/lib/files";
import { sampleLaws, sampleArticles } from "@/lib/legal-sample";
const KEY = "elmtrapp-demo-v1";
export type OfficeContext = {
  activated?: boolean;
  owner_id: string;
  admin: boolean;
  member: boolean;
  permissions: string[];
  active: boolean;
};
const defaultOffice: OfficeContext = {
  owner_id: "",
  admin: false,
  member: false,
  permissions: [],
  active: true,
};
type Store = {
  office: OfficeContext;
  data: Data;
  loading: boolean;
  demo: boolean;
  user: User | null;
  profile: Profile;
  entitlement: Entitlement;
  premium: boolean;
  error: string;
  notice: string;
  setNotice: (s: string) => void;
  setError: (s: string) => void;
  enterDemo: () => void;
  leaveDemo: () => void;
  refresh: () => Promise<void>;
  save: <T extends Table>(
    table: T,
    values: Partial<Row<T>>,
    id?: string,
  ) => Promise<void>;
  remove: (table: Table, id: string) => Promise<void>;
  upload: (
    caseId: string,
    file: File,
    text?: string,
    target?: "case" | "client",
  ) => Promise<void>;
  readFile: (path: string) => Promise<Blob>;
  savePower: (
    values: Pick<Power, "principal_name" | "phone" | "expires_on">,
    files: File[],
    id?: string,
  ) => Promise<void>;
  openDocument: (id: string) => Promise<void>;
  saveProfile: (p: Profile) => Promise<void>;
  resetDemo: () => void;
};
const Context = createContext<Store | null>(null);
const defaultProfile = {
  full_name: "أحمد",
  office_name: "مكتب المحاماة",
  phone: "",
};
export function Provider({
  children,
  initialDemo = false,
  forceAuth = false,
}: {
  children: React.ReactNode;
  initialDemo?: boolean;
  forceAuth?: boolean;
}) {
  const [office, setOffice] = useState<OfficeContext>(defaultOffice);
  const [data, setDataState] = useState<Data>(EMPTY),
    [loading, setLoading] = useState(true),
    [demo, setDemo] = useState(false),
    [user, setUser] = useState<User | null>(null),
    [profile, setProfile] = useState(defaultProfile),
    [entitlement, setEntitlement] = useState<Entitlement>({
      plan: "basic",
      expires_at: null,
    }),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const dataRef = useRef<Data>(EMPTY);
  const generation = useRef(0);
  const demoRef = useRef(false);
  const currentUser = useRef<string | null>(null);
  const setData = useCallback((next: Data) => {
    dataRef.current = next;
    setDataState(next);
  }, []);
  const premium =
    demo ||
    (entitlement.plan !== "basic" &&
      !!entitlement.expires_at &&
      new Date(entitlement.expires_at) > new Date());
  const enterDemo = useCallback(() => {
    sessionStorage.setItem("elmtrapp-demo-mode", "1");
    demoRef.current = true;
    generation.current++;
    try {
      const v = localStorage.getItem(KEY);
      setData(
        v
          ? {
              ...EMPTY,
              ...JSON.parse(v),
              laws: sampleLaws,
              articles: sampleArticles,
            }
          : demoData(),
      );
    } catch {
      setData(demoData());
    }
    try {
      const stored = localStorage.getItem(KEY + "-profile");
      setProfile(stored ? JSON.parse(stored) : defaultProfile);
    } catch {
      setProfile(defaultProfile);
    }
    setOffice(defaultOffice);
    setDemo(true);
    setLoading(false);
    setError("");
  }, [setData]);
  const refresh = useCallback(async () => {
    if (!supabase || demo || demoRef.current) return;
    const revision = ++generation.current;
    setLoading(true);
    setError("");
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (revision !== generation.current || demoRef.current) return;
      if (error && error.name !== "AuthSessionMissingError") throw error;
      if (!user) {
        currentUser.current = null;
        setOffice(defaultOffice);
        setUser(null);
        setData(EMPTY);
        setProfile(defaultProfile);
        setEntitlement({ plan: "basic", expires_at: null });
        return;
      }
      if (currentUser.current !== user.id) {
        setOffice(defaultOffice);
        setData(EMPTY);
        setProfile(defaultProfile);
        setEntitlement({ plan: "basic", expires_at: null });
      }
      currentUser.current = user.id;
      setUser(user);
      const context = await supabase.rpc("office_context");
      if (context.error) throw context.error;
      const officeContext = context.data as OfficeContext;
      if (!officeContext.active) {
        setData(EMPTY);
        setOffice(officeContext);
        throw new Error("الحساب الفرعي موقوف أو انتهت باقة المكتب");
      }
      setOffice(officeContext);
      if (officeContext.activated === false && !officeContext.admin) {
        setData(EMPTY);
        return;
      }
      if (officeContext.admin) {
        setData(EMPTY);
        return;
      }
      const tables = Object.keys(EMPTY) as Table[];
      const load = async (table: Table) => {
        const rows: unknown[] = [];
        for (let offset = 0; ; offset += 1000) {
          const result = await supabase!
            .from(table)
            .select("*")
            .order("id")
            .range(offset, offset + 999);
          if (result.error) throw result.error;
          rows.push(...result.data);
          if (result.data.length < 1000) break;
        }
        return rows;
      };
      const [results, p, e] = await Promise.all([
        Promise.all(tables.map(load)),
        supabase
          .from("profiles")
          .select("full_name,office_name,phone")
          .eq("id", user.id)
          .maybeSingle(),
        supabase
          .from("entitlements")
          .select("plan,expires_at")
          .eq("owner_id", officeContext.owner_id)
          .maybeSingle(),
      ]);
      if (revision !== generation.current || demoRef.current) return;
      if (p.error) throw p.error;
      if (e.error) throw e.error;
      const next = { ...EMPTY };
      results.forEach((rows, i) => Object.assign(next, { [tables[i]]: rows }));
      for (const t of ["clients", "cases", "notes", "documents"] as const)
        next[t].sort((a, b) => b.created_at.localeCompare(a.created_at));
      setData(next);
      if (!p.data) {
        const created = await supabase.from("profiles").upsert({
          id: user.id,
          full_name: user.user_metadata.full_name ?? "المحامي",
          office_name: defaultProfile.office_name,
          phone: "",
        });
        if (created.error) throw created.error;
      }
      setProfile(
        p.data ?? {
          ...defaultProfile,
          full_name: user.user_metadata.full_name ?? "المحامي",
        },
      );
      setEntitlement(e.data ?? { plan: "basic", expires_at: null });
    } catch (e) {
      if (revision === generation.current)
        setError(
          e instanceof Error
            ? e.message
            : "تعذر تحميل بيانات المكتب. تأكد من تشغيل ملف SQL.",
        );
    } finally {
      if (revision === generation.current) setLoading(false);
    }
  }, [demo, setData]);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (
        !forceAuth &&
        (initialDemo ||
          sessionStorage.getItem("elmtrapp-demo-mode") === "1" ||
          !supabase)
      ) {
        enterDemo();
        return;
      }
      if (forceAuth) {
        sessionStorage.removeItem("elmtrapp-demo-mode");
        demoRef.current = false;
        setDemo(false);
      }
      void refresh();
    });
    const subscription = supabase?.auth.onAuthStateChange(() => {
      setTimeout(() => void refresh(), 0);
    });
    return () => {
      cancelAnimationFrame(frame);
      subscription?.data.subscription.unsubscribe();
    };
  }, [refresh, enterDemo, initialDemo, forceAuth]);
  useEffect(() => {
    if (demo && !loading) {
      try {
        localStorage.setItem(KEY, JSON.stringify(data));
      } catch {
        queueMicrotask(() =>
          setError(
            "مساحة التخزين غير كافية. احذف الملفات غير المطلوبة أو اربط حسابك بالسحابة.",
          ),
        );
      }
    }
  }, [data, demo, loading]);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 4500);
    return () => clearTimeout(t);
  }, [notice]);
  const save = async <T extends Table>(
    table: T,
    values: Partial<Row<T>>,
    id?: string,
  ) => {
    const data = dataRef.current;
    if (
      office.member &&
      (!office.active ||
        !office.permissions.includes("write") ||
        !office.permissions.includes(
          table === "bookmarks"
            ? "library"
            : table === "powers"
              ? "documents"
              : table,
        ))
    )
      throw new Error("ليست لديك صلاحية تعديل هذا القسم");
    if (["laws", "articles"].includes(table))
      throw new Error("المرجع يُدار من قاعدة البيانات فقط");
    if (demo) {
      if (table === "clients") {
        const v = values as Partial<Data["clients"][number]>;
        if (!v.name?.trim()) throw new Error("اسم العميل مطلوب");
        if (Number(v.opening_balance) < 0)
          throw new Error("الرصيد السابق يجب ألا يقل عن صفر");
        if (
          id &&
          Number(v.opening_balance) +
            data.cases
              .filter((c) => c.client_id === id)
              .reduce((s, c) => s + Number(c.fee), 0) <
            data.payments
              .filter((p) => p.client_id === id)
              .reduce((s, p) => s + Number(p.amount), 0)
        )
          throw new Error("لا يمكن خفض الرصيد عن المدفوع");
      }
      if (table === "cases") {
        const v = values as Partial<Data["cases"][number]>;
        if (!data.clients.some((c) => c.id === v.client_id))
          throw new Error("اختر عميلًا موجودًا");
        if (!v.title?.trim() || !v.number?.trim())
          throw new Error("عنوان القضية ورقمها مطلوبان");
        if (data.cases.some((c) => c.id !== id && c.number === v.number))
          throw new Error("رقم القضية موجود بالفعل");
        const old = data.cases.find((c) => c.id === id);
        if (
          old &&
          balance(data, v.client_id!) + Number(v.fee) - Number(old.fee) < 0
        )
          throw new Error("لا يمكن خفض الأتعاب عن إجمالي المدفوع");
      }
      const next = { ...data };
      const rows = [...data[table]] as { id: string }[];
      const item = {
        ...values,
        id: id ?? crypto.randomUUID(),
        created_at: new Date().toISOString(),
      };
      if (table === "payments") {
        const v = values as Partial<Data["payments"][number]>;
        const old = id ? data.payments.find((p) => p.id === id) : null;
        if (
          Number(v.amount) <= 0 ||
          Number(v.amount) >
            balance(data, v.client_id ?? "") + Number(old?.amount ?? 0)
        )
          throw new Error("الدفعة يجب أن تكون أكبر من صفر ولا تتجاوز المتبقي");
      }
      if (id)
        Object.assign(next, {
          [table]: rows.map((r) => (r.id === id ? { ...r, ...values } : r)),
        });
      else Object.assign(next, { [table]: [item, ...rows] });
      setData(next);
    } else {
      if (!supabase || !user) throw new Error("سجل الدخول أولًا");
      const payload = { ...values, owner_id: office.owner_id || user.id };
      const q = id
        ? supabase.from(table).update(payload).eq("id", id)
        : supabase.from(table).insert(payload);
      const { error } = await q.select("id").single();
      if (error) throw new Error(error.message);
      await refresh();
    }
    setNotice("تم الحفظ بنجاح");
  };
  const remove = async (table: Table, id: string) => {
    if (
      office.member &&
      (!office.active ||
        !office.permissions.includes("write") ||
        !office.permissions.includes(
          table === "bookmarks"
            ? "library"
            : table === "powers"
              ? "documents"
              : table,
        ))
    )
      throw new Error("ليست لديك صلاحية تعديل هذا القسم");
    const data = dataRef.current;
    if (demo) {
      const next = { ...data };
      Object.assign(next, {
        [table]: (data[table] as { id: string }[]).filter((r) => r.id !== id),
      });
      if (table === "cases") {
        for (const t of ["hearings", "notes", "documents"] as const)
          Object.assign(next, { [t]: data[t].filter((r) => r.case_id !== id) });
      }
      if (table === "clients" && data.cases.some((c) => c.client_id === id))
        throw new Error("لا يمكن حذف عميل مرتبط بقضايا");
      setData(next);
    } else {
      const { error } = await supabase!.from(table).delete().eq("id", id);
      if (error) throw new Error(error.message);
      await refresh();
    }
    setNotice("تم الحذف");
  };
  const upload = async (
    caseId: string,
    file: File,
    text = "",
    target: "case" | "client" = "case",
  ) => {
    if (file.size === 0) throw new Error("الملف فارغ");
    if (file.size > 20 * 1024 * 1024)
      throw new Error("الحد الأقصى لحجم الملف ٢٠ ميجابايت");
    if (
      !["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(
        file.type,
      )
    )
      throw new Error("استخدم PDF أو JPG أو PNG أو WebP");
    const path = `${demo ? "demo" : office.owner_id || user?.id}/${target === "client" ? "clients/" : ""}${caseId}/${crypto.randomUUID()}.${file.type === "application/pdf" ? "pdf" : file.type.split("/")[1]}`;
    if (demo) await localFile(path, file);
    else {
      const { error } = await supabase!.storage
        .from("case-documents")
        .upload(path, file);
      if (error) throw error;
    }
    try {
      await save("documents", {
        case_id: target === "case" ? caseId : null,
        client_id: target === "client" ? caseId : null,
        name: file.name,
        path,
        mime_type: file.type,
        size: file.size,
        extracted_text: text,
      });
    } catch (e) {
      if (demo) await removeLocalFile(path);
      else await supabase!.storage.from("case-documents").remove([path]);
      throw e;
    }
  };
  const readFile = async (path: string): Promise<Blob> => {
    if (demo) {
      const blob = await localFile(path);
      if (!blob) throw new Error("الملف غير متاح في هذا المتصفح؛ أعد رفعه");
      return blob;
    }
    const result = await supabase!.storage
      .from("case-documents")
      .download(path);
    if (result.error) throw new Error(result.error.message);
    return result.data;
  };
  const savePower = async (
    values: Pick<Power, "principal_name" | "phone" | "expires_on">,
    files: File[],
    id?: string,
  ) => {
    if (
      office.member &&
      (!office.active ||
        !office.permissions.includes("documents") ||
        !office.permissions.includes("write"))
    )
      throw new Error("ليست لديك صلاحية تعديل التوكيلات");
    if (id) {
      await save("powers", values, id);
      return;
    }
    if (
      files.length !== 3 ||
      files.some(
        (f) =>
          !["image/jpeg", "image/png", "image/webp"].includes(f.type) ||
          !f.size ||
          f.size > 20 * 1024 * 1024,
      )
    )
      throw new Error(
        "ارفع صورة التوكيل ووجهي البطاقة بصيغة JPG أو PNG أو WebP، حتى 20 ميجابايت للصورة",
      );
    for (const file of files) {
      let bitmap: ImageBitmap;
      try {
        bitmap = await createImageBitmap(file);
      } catch {
        throw new Error(
          "إحدى الصور غير صالحة؛ اختر صورة واضحة بصيغة JPG أو PNG أو WebP",
        );
      }
      const tooLarge = bitmap.width * bitmap.height > 60000000;
      bitmap.close();
      if (tooLarge) throw new Error("إحدى الصور كبيرة جدًا؛ اختر صورة أصغر");
    }
    const powerId = crypto.randomUUID();
    const owner = demo ? "demo" : office.owner_id || user!.id;
    const paths = files.map(
      (f, i) => `${owner}/powers/${powerId}/${i}.${f.type.split("/")[1]}`,
    );
    const uploaded: string[] = [];
    try {
      for (let i = 0; i < files.length; i++) {
        if (demo) await localFile(paths[i], files[i]);
        else {
          const r = await supabase!.storage
            .from("case-documents")
            .upload(paths[i], files[i]);
          if (r.error) throw new Error(r.error.message);
        }
        uploaded.push(paths[i]);
      }
      await save("powers", {
        ...values,
        id: powerId,
        poa_path: paths[0],
        front_path: paths[1],
        back_path: paths[2],
      });
    } catch (e) {
      if (demo) await Promise.all(uploaded.map(removeLocalFile));
      else if (uploaded.length)
        await supabase!.storage.from("case-documents").remove(uploaded);
      throw e;
    }
  };
  const openDocument = async (id: string) => {
    const doc = data.documents.find((d) => d.id === id);
    if (!doc) return;
    // Open synchronously so mobile browsers do not block the eventual signed URL.
    const win = window.open("about:blank", "_blank");
    if (win) win.opener = null;
    try {
      let url: string;
      if (demo) {
        const blob = await localFile(doc.path);
        if (!blob) throw new Error("الملف غير متاح على هذا الجهاز");
        url = URL.createObjectURL(blob);
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      } else {
        const { data, error } = await supabase!.storage
          .from("case-documents")
          .createSignedUrl(doc.path, 60);
        if (error) throw error;
        url = data.signedUrl;
      }
      if (win) win.location.href = url;
      else throw new Error("اسمح بفتح نافذة المستند في المتصفح");
    } catch (e) {
      win?.close();
      throw e;
    }
  };
  const saveProfile = async (p: Profile) => {
    if (!demo) {
      const { error } = await supabase!
        .from("profiles")
        .upsert({ id: user!.id, ...p });
      if (error) throw error;
    }
    if (demo) localStorage.setItem(KEY + "-profile", JSON.stringify(p));
    setProfile(p);
    setNotice("تم حفظ الإعدادات");
  };
  return (
    <Context.Provider
      value={{
        office,
        data,
        loading,
        demo,
        user,
        profile,
        entitlement,
        premium,
        error,
        notice,
        setNotice,
        setError,
        enterDemo,
        leaveDemo: () => {
          sessionStorage.removeItem("elmtrapp-demo-mode");
          demoRef.current = false;
          generation.current++;
          setUser(null);
          currentUser.current = null;
          setDemo(false);
          setData(EMPTY);
        },
        refresh,
        save,
        remove,
        upload,
        readFile,
        savePower,
        openDocument,
        saveProfile,
        resetDemo: () => {
          setData(demoData());
          setNotice("تمت إعادة البيانات التجريبية");
        },
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useStore() {
  const value = useContext(Context);
  if (!value) throw new Error("Provider missing");
  return value;
}
