"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { CheckCircle2, AlertCircle, Info } from "lucide-react";
import { EVIDENCE_BUCKET, authMessage, explain, supabase, supabaseConfigured } from "./supabase";
import { TABLES, buildDB, mapUser, toRow } from "./mappers";
import { emptyDB } from "./seed";
import type { AppUser, CollectionKey, DB, Evidence, IndicatorStatus, Role, School, TaskStatus } from "./types";
import { uid } from "./utils";

const GUEST: AppUser = { id: "", name: "", email: "", role: "member", active: false };
export type Status = "loading" | "anon" | "error" | "no_profile" | "no_school" | "ready";
type ToastKind = "success" | "error" | "info";
interface ToastItem { id: string; kind: ToastKind; text: string }
interface AuthUser { id: string; email: string }
type AnyRow = Record<string, any>;

// نسخة محلية من حذف التسلسل الموجود في قاعدة البيانات (ON DELETE CASCADE / SET NULL)
function cascade(db: DB, k: CollectionKey, id: string): { db: DB; evidenceIds: string[] } {
  let next: DB = { ...db };
  let indicatorIds: string[] = [];
  if (k === "domains") {
    indicatorIds = db.indicators.filter((i) => i.domainId === id).map((i) => i.id);
    next.domains = db.domains.filter((d) => d.id !== id);
    next.standards = db.standards.filter((x) => x.domainId !== id);
    next.indicators = db.indicators.filter((i) => i.domainId !== id);
  } else if (k === "standards") {
    indicatorIds = db.indicators.filter((i) => i.standardId === id).map((i) => i.id);
    next.standards = db.standards.filter((x) => x.id !== id);
    next.indicators = db.indicators.filter((i) => i.standardId !== id);
  } else if (k === "indicators") {
    indicatorIds = [id];
    next.indicators = db.indicators.filter((i) => i.id !== id);
  } else if (k === "users") {
    next.users = db.users.filter((u) => u.id !== id);
    next.indicators = db.indicators.map((i) => (i.ownerId === id ? { ...i, ownerId: "" } : i));
    next.tasks = db.tasks.map((t) => (t.assigneeId === id ? { ...t, assigneeId: "" } : t));
    next.plans = db.plans.map((p) => (p.ownerId === id ? { ...p, ownerId: "" } : p));
  } else {
    next = { ...db, [k]: (db[k] as { id: string }[]).filter((x) => x.id !== id) } as DB;
  }
  let evidenceIds = k === "evidence" ? [id] : [];
  if (indicatorIds.length) {
    evidenceIds = db.evidence.filter((e) => indicatorIds.includes(e.indicatorId)).map((e) => e.id);
    next.evidence = next.evidence.filter((e) => !indicatorIds.includes(e.indicatorId));
    next.tasks = next.tasks.map((t) => (indicatorIds.includes(t.indicatorId) ? { ...t, indicatorId: "" } : t));
    next.plans = next.plans.map((p) => (indicatorIds.includes(p.indicatorId) ? { ...p, indicatorId: "" } : p));
  }
  return { db: next, evidenceIds };
}

// PostgREST يحدّ الاستجابة بـ 1000 صف، لذلك نقرأ على دفعات
async function fetchAll(table: string, schoolId: string): Promise<AnyRow[]> {
  const out: AnyRow[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from(table).select("*").eq("school_id", schoolId)
      .order("created_at", { ascending: true }).order("id").range(from, from + 999);
    if (error) throw error;
    out.push(...(data ?? []));
    if ((data?.length ?? 0) < 1000) break;
  }
  return out;
}

interface Store {
  status: Status; configured: boolean; authEmail: string; db: DB; user: AppUser | null; joinCode: string | null;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string) => Promise<{ error?: string; needsConfirm?: boolean }>;
  signOut: () => Promise<void>;
  registerSchool: (schoolName: string, fullName: string, year: string) => Promise<string | null>;
  joinSchool: (code: string, fullName: string) => Promise<string | null>;
  regenerateJoinCode: () => Promise<boolean>;
  createUser: (b: { name: string; email: string; password: string; role: Role }) => Promise<string | null>;
  refresh: () => Promise<void>;
  upsert: <K extends CollectionKey>(k: K, item: DB[K][number]) => Promise<boolean>;
  remove: (k: CollectionKey, id: string) => Promise<boolean>;
  setIndicatorStatus: (id: string, status: IndicatorStatus) => Promise<boolean>;
  setTaskStatus: (id: string, status: TaskStatus) => Promise<boolean>;
  addEvidence: (ev: Evidence, file?: File) => Promise<boolean>;
  getEvidenceUrl: (e: Evidence, download?: boolean) => Promise<string | null>;
  applyImport: (next: DB) => Promise<boolean>;
  updateSchool: (s: School) => Promise<boolean>;
  notify: (text: string, kind?: ToastKind) => void;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [authReady, setAuthReady] = useState(false);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [yearId, setYearId] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState<string | null>(null);
  const [db, setDb] = useState<DB>(emptyDB);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const dbRef = useRef<DB>(db);
  const reqRef = useRef(0);
  const inflight = useRef(new Set<string>());

  const notify = useCallback((text: string, kind: ToastKind = "success") => {
    const id = uid();
    setToasts((t) => [...t, { id, kind, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 6000);
  }, []);

  const commit = useCallback((fn: (d: DB) => DB) => {
    const next = fn(dbRef.current);
    dbRef.current = next;
    setDb(next);
  }, []);

  const reset = useCallback(() => {
    reqRef.current++;
    setProfile(null); setSchoolId(null); setYearId(null); setJoinCode(null);
    const e = emptyDB(); dbRef.current = e; setDb(e);
  }, []);

  // ---------- المصادقة ----------
  useEffect(() => {
    if (!supabaseConfigured) { setAuthReady(true); return; }
    let active = true;
    const toAuth = (s: { user: { id: string; email?: string | null } } | null): AuthUser | null => (s ? { id: s.user.id, email: s.user.email ?? "" } : null);
    supabase.auth.getSession().then(({ data }) => { if (active) { setAuthUser(toAuth(data.session)); setAuthReady(true); } });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const next = toAuth(session);
      setAuthUser((prev) => (prev?.id === next?.id && prev?.email === next?.email ? prev : next));
    });
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);

  // ---------- تحميل بيانات المدرسة (RLS تحصرها في مدرسة المستخدمة) ----------
  const load = useCallback(async (userId: string) => {
    const req = ++reqRef.current;
    try {
      const { data: prof, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
      if (error) throw error;
      if (req !== reqRef.current) return;
      if (!prof) { setProfile(null); setSchoolId(null); setLoadedFor(userId); return; }
      if (prof.is_active === false) {
        await supabase.auth.signOut();
        notify("هذا الحساب معطّل. تواصلي مع مديرة المدرسة.", "error");
        return;
      }
      const me = mapUser(prof);
      if (!prof.school_id) { setProfile(me); setSchoolId(null); setLoadedFor(userId); return; }
      const sid = prof.school_id as string;
      const isAdmin = me.role === "school_admin" || me.role === "system_admin";
      const [sch, yr, code, users, domains, standards, indicators, evidence, tasks, plans] = await Promise.all([
        supabase.from("schools").select("*").eq("id", sid).maybeSingle(),
        supabase.from("academic_years").select("*").eq("school_id", sid).order("is_current", { ascending: false }).order("name", { ascending: false }).limit(1).maybeSingle(),
        isAdmin ? supabase.from("school_join_codes").select("code").eq("school_id", sid).maybeSingle() : Promise.resolve({ data: null, error: null }),
        fetchAll("profiles", sid), fetchAll("domains", sid), fetchAll("standards", sid), fetchAll("indicators", sid),
        fetchAll("evidence", sid), fetchAll("tasks", sid), fetchAll("improvement_plans", sid),
      ]);
      if (sch.error) throw sch.error;
      if (yr.error) throw yr.error;
      if (req !== reqRef.current) return;
      const next = buildDB(sch.data, yr.data?.name ?? "", { users, domains, standards, indicators, evidence, tasks, plans });
      dbRef.current = next; setDb(next);
      setProfile(me); setSchoolId(sid); setYearId(yr.data?.id ?? null); setJoinCode(code.data?.code ?? null);
      setLoadedFor(userId);
    } catch (e) {
      if (req !== reqRef.current) return;
      notify(explain(e), "error");
      setLoadError(true);
    }
  }, [notify]);

  const uidNow = authUser?.id ?? null;
  useEffect(() => {
    if (!authReady) return;
    setLoadError(false);
    if (!uidNow) { reset(); setLoadedFor(null); return; }
    setLoadedFor(null);
    load(uidNow);
  }, [authReady, uidNow, load, reset]);

  const refresh = useCallback(async () => { if (uidNow) { setLoadError(false); await load(uidNow); } }, [uidNow, load]);

  const status: Status = !authReady ? "loading" : !authUser ? "anon" : loadError ? "error"
    : loadedFor !== authUser.id ? "loading" : !profile ? "no_profile" : !schoolId ? "no_school" : "ready";

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    return error ? authMessage(error) : null;
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: `${window.location.origin}/dashboard` } });
    if (error) return { error: authMessage(error) };
    if (data.user && data.user.identities?.length === 0) return { error: "هذا البريد مسجّل مسبقًا. جرّب تسجيل الدخول." };
    return { needsConfirm: !data.session };
  }, []);

  const signOut = useCallback(async () => { await supabase.auth.signOut(); }, []);

  const registerSchool = useCallback(async (schoolName: string, fullName: string, year: string) => {
    const { error } = await supabase.rpc("register_school", { p_school_name: schoolName, p_full_name: fullName, p_year: year });
    if (error) return explain(error);
    await refresh();
    return null;
  }, [refresh]);

  const joinSchool = useCallback(async (code: string, fullName: string) => {
    const { error } = await supabase.rpc("join_school", { p_code: code, p_full_name: fullName });
    if (error) return explain(error);
    await refresh();
    return null;
  }, [refresh]);

  const regenerateJoinCode = useCallback(async () => {
    const { data, error } = await supabase.rpc("regenerate_join_code");
    if (error) { notify(explain(error), "error"); return false; }
    setJoinCode(typeof data === "string" ? data : null);
    return true;
  }, [notify]);

  // إنشاء حساب موظفة مباشرة: يمر عبر مسار خادم (/api/users) يستخدم مفتاح service_role السري
  const createUser = useCallback(async (b: { name: string; email: string; password: string; role: Role }) => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) return "انتهت الجلسة. سجّلي الدخول من جديد.";
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` },
        body: JSON.stringify(b),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) return j.error ?? "تعذّر إنشاء المستخدمة.";
      await refresh();
      return null;
    } catch { return "تعذّر الاتصال بالخادم."; }
  }, [refresh]);

  // ---------- الكتابة ----------
  const upsert = useCallback(async <K extends CollectionKey>(k: K, item: DB[K][number]): Promise<boolean> => {
    if (!schoolId || !profile) { notify("لا توجد جلسة مدرسة نشطة.", "error"); return false; }
    const id = (item as unknown as { id: string }).id;
    const key = `${k}:${id}`;
    if (inflight.current.has(key)) return false;
    inflight.current.add(key);
    try {
      const exists = (dbRef.current[k] as unknown as { id: string }[]).some((x) => x.id === id);
      const row = toRow(k, item, { schoolId, userId: profile.id, yearId, isNew: !exists });
      // INSERT أو UPDATE صريحان (وليس upsert) كي تُطبَّق سياسات RLS الصحيحة لكل عملية
      const res = exists
        ? await supabase.from(TABLES[k]).update(row).eq("id", id).select("id")
        : await supabase.from(TABLES[k]).insert(row).select("id");
      if (res.error) { notify(explain(res.error), "error"); return false; }
      if (!res.data || res.data.length === 0) { notify("لم يتم الحفظ: ليست لديك صلاحية أو أن السجل لم يعد موجودًا.", "error"); return false; }
      commit((prev) => {
        const list = prev[k] as unknown as { id: string }[];
        const it = item as unknown as { id: string };
        const next = list.some((x) => x.id === it.id) ? list.map((x) => (x.id === it.id ? it : x)) : [...list, it];
        return { ...prev, [k]: next } as DB;
      });
      return true;
    } catch (e) { notify(explain(e), "error"); return false; }
    finally { inflight.current.delete(key); }
  }, [schoolId, profile, yearId, commit, notify]);

  const remove = useCallback(async (k: CollectionKey, id: string): Promise<boolean> => {
    const key = `${k}:${id}`;
    if (inflight.current.has(key)) return false;
    inflight.current.add(key);
    try {
      const { db: next, evidenceIds } = cascade(dbRef.current, k, id);
      const paths = dbRef.current.evidence.filter((e) => evidenceIds.includes(e.id) && e.storagePath).map((e) => e.storagePath as string);
      const { data, error } = await supabase.from(TABLES[k]).delete().eq("id", id).select("id");
      if (error) { notify(explain(error), "error"); return false; }
      if (!data || data.length === 0) { notify("لم يتم الحذف: ليست لديك صلاحية أو أن السجل غير موجود.", "error"); return false; }
      if (paths.length) {
        const r = await supabase.storage.from(EVIDENCE_BUCKET).remove(paths);
        if (r.error) notify("تم الحذف، لكن تعذّر حذف بعض الملفات من التخزين.", "info");
      }
      dbRef.current = next; setDb(next);
      return true;
    } catch (e) { notify(explain(e), "error"); return false; }
    finally { inflight.current.delete(key); }
  }, [notify]);

  // تحديث حقل واحد (الأعضاء يستطيعون تعديل الحالة فقط، وقاعدة البيانات تفرض ذلك)
  const patch = useCallback(async (table: "indicators" | "tasks", id: string, fields: Record<string, unknown>, apply: (d: DB) => DB) => {
    const key = `${table}:${id}`;
    if (inflight.current.has(key)) return false;
    inflight.current.add(key);
    try {
      const { data, error } = await supabase.from(table).update(fields).eq("id", id).select("id");
      if (error) { notify(explain(error), "error"); return false; }
      if (!data || data.length === 0) { notify("لم يتم التحديث: ليست لديك صلاحية على هذا السجل.", "error"); return false; }
      commit(apply);
      return true;
    } catch (e) { notify(explain(e), "error"); return false; }
    finally { inflight.current.delete(key); }
  }, [commit, notify]);

  const setIndicatorStatus = useCallback((id: string, status: IndicatorStatus) =>
    patch("indicators", id, { status }, (d) => ({ ...d, indicators: d.indicators.map((i) => (i.id === id ? { ...i, status } : i)) })), [patch]);
  const setTaskStatus = useCallback((id: string, status: TaskStatus) =>
    patch("tasks", id, { status }, (d) => ({ ...d, tasks: d.tasks.map((t) => (t.id === id ? { ...t, status } : t)) })), [patch]);

  const addEvidence = useCallback(async (ev: Evidence, file?: File): Promise<boolean> => {
    if (!schoolId) return false;
    let path: string | undefined;
    if (file) {
      const ext = (file.name.split(".").pop() ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
      path = `${schoolId}/${ev.indicatorId}/${ev.id}.${ext}`;
      const up = await supabase.storage.from(EVIDENCE_BUCKET).upload(path, file, { contentType: ev.mime || undefined, upsert: false });
      if (up.error) { notify(explain(up.error), "error"); return false; }
    }
    const ok = await upsert("evidence", path ? { ...ev, storagePath: path } : ev);
    if (!ok && path) await supabase.storage.from(EVIDENCE_BUCKET).remove([path]); // تنظيف الملف اليتيم
    return ok;
  }, [schoolId, upsert, notify]);

  const getEvidenceUrl = useCallback(async (e: Evidence, download = false) => {
    if (!e.storagePath) return null;
    const { data, error } = await supabase.storage.from(EVIDENCE_BUCKET).createSignedUrl(e.storagePath, 120, download ? { download: e.fileName ?? true } : undefined);
    if (error) { notify(explain(error), "error"); return null; }
    return data.signedUrl;
  }, [notify]);

  const applyImport = useCallback(async (next: DB): Promise<boolean> => {
    if (!schoolId || !profile) return false;
    const cur = dbRef.current;
    const fresh = <T extends { id: string }>(a: T[], b: T[]) => { const ids = new Set(b.map((x) => x.id)); return a.filter((x) => !ids.has(x.id)); };
    const steps: [CollectionKey, { id: string }[]][] = [
      ["domains", fresh(next.domains, cur.domains)],
      ["standards", fresh(next.standards, cur.standards)],
      ["indicators", fresh(next.indicators, cur.indicators)],
    ];
    try {
      for (const [k, items] of steps) {
        for (let i = 0; i < items.length; i += 500) {
          const rows = items.slice(i, i + 500).map((x) => toRow(k, x, { schoolId, userId: profile.id, yearId, isNew: true }));
          const { error } = await supabase.from(TABLES[k]).insert(rows);
          if (error) throw error;
        }
      }
      commit(() => ({ ...cur, domains: next.domains, standards: next.standards, indicators: next.indicators }));
      return true;
    } catch (e) {
      notify(`${explain(e)} — أُعيد تحميل البيانات من الخادم.`, "error");
      await refresh();
      return false;
    }
  }, [schoolId, profile, yearId, commit, notify, refresh]);

  const updateSchool = useCallback(async (s: School): Promise<boolean> => {
    if (!schoolId) return false;
    try {
      const r1 = await supabase.from("schools").update({ name: s.name, city: s.city || null, stage: s.stage || null, principal: s.principal || null }).eq("id", schoolId).select("id");
      if (r1.error) throw r1.error;
      if (!r1.data?.length) { notify("لم يتم الحفظ: ليست لديك صلاحية تعديل بيانات المدرسة.", "error"); return false; }
      if (yearId) {
        const r2 = await supabase.from("academic_years").update({ name: s.year }).eq("id", yearId).select("id");
        if (r2.error) throw r2.error;
      } else {
        const r2 = await supabase.from("academic_years").insert({ school_id: schoolId, name: s.year, is_current: true }).select("id");
        if (r2.error) throw r2.error;
        setYearId(r2.data?.[0]?.id ?? null);
      }
      commit((p) => ({ ...p, school: s }));
      return true;
    } catch (e) { notify(explain(e), "error"); return false; }
  }, [schoolId, yearId, commit, notify]);

  const value: Store = {
    status, configured: supabaseConfigured, authEmail: authUser?.email ?? "", db, user: status === "ready" ? profile : null, joinCode,
    signIn, signUp, signOut, registerSchool, joinSchool, regenerateJoinCode, createUser, refresh,
    upsert, remove, setIndicatorStatus, setTaskStatus, addEvidence, getEvidenceUrl, applyImport, updateSchool, notify,
  };
  const icons = { success: CheckCircle2, error: AlertCircle, info: Info };
  const tone = { success: "border-emerald-200 text-emerald-800", error: "border-red-200 text-red-800", info: "border-navy-200 text-navy-800" };

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 start-4 z-[60] flex w-[min(92vw,22rem)] flex-col gap-2 print:hidden" aria-live="polite">
        {toasts.map((t) => {
          const Icon = icons[t.kind];
          return (
            <div key={t.id} className={`pointer-events-auto flex items-start gap-2 rounded-xl border bg-white p-3 text-sm shadow-card ${tone[t.kind]}`}>
              <Icon className="mt-0.5 h-4 w-4 shrink-0" /> <span>{t.text}</span>
            </div>
          );
        })}
      </div>
    </Ctx.Provider>
  );
}

export function useStore(): Store {
  const c = useContext(Ctx);
  if (!c) throw new Error("useStore must be used inside StoreProvider");
  return c;
}
export function useUser(): AppUser { return useStore().user ?? GUEST; }

export function useLookups() {
  const { db } = useStore();
  return useMemo(() => ({
    userById: new Map(db.users.map((u) => [u.id, u])),
    domainById: new Map(db.domains.map((d) => [d.id, d])),
    standardById: new Map(db.standards.map((s) => [s.id, s])),
    indicatorById: new Map(db.indicators.map((i) => [i.id, i])),
  }), [db]);
}
