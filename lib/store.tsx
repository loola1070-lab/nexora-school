"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { CheckCircle2, AlertCircle, Info } from "lucide-react";
import type { AppUser, CollectionKey, DB, School } from "./types";
import { repository } from "./repository";
import { emptyDB, seedDB } from "./seed";
import { uid } from "./utils";

const SESSION_KEY = "nexora.session.demo.v1";
export const DEMO_PASSWORD = "demo1234";
const GUEST: AppUser = { id: "", name: "", email: "", role: "member", active: false };

type ToastKind = "success" | "error" | "info";
interface ToastItem { id: string; kind: ToastKind; text: string }

// ملفات الشواهد في الوضع التجريبي تبقى في ذاكرة الصفحة فقط (لا تُحفظ دائمًا).
const fileUrls = new Map<string, string>();
export const demoFiles = {
  get: (id: string) => fileUrls.get(id),
  set: (id: string, url: string) => void fileUrls.set(id, url),
  delete: (id: string) => { const u = fileUrls.get(id); if (u) URL.revokeObjectURL(u); fileUrls.delete(id); },
};

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

interface Store {
  ready: boolean; db: DB; user: AppUser | null;
  login: (email: string, password: string) => boolean; logout: () => void;
  upsert: <K extends CollectionKey>(k: K, item: DB[K][number]) => void;
  remove: (k: CollectionKey, id: string) => void;
  commit: (fn: (db: DB) => DB) => void;
  updateSchool: (s: School) => void;
  resetDemo: () => Promise<void>;
  notify: (text: string, kind?: ToastKind) => void;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<DB>(emptyDB);
  const dbRef = useRef<DB>(db);
  const [ready, setReady] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const notify = useCallback((text: string, kind: ToastKind = "success") => {
    const id = uid();
    setToasts((t) => [...t, { id, kind, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000);
  }, []);

  const commit = useCallback((fn: (d: DB) => DB) => {
    const next = fn(dbRef.current);
    dbRef.current = next;
    setDb(next);
  }, []);

  useEffect(() => {
    (async () => {
      const loaded = (await repository.load()) ?? seedDB();
      dbRef.current = loaded;
      setDb(loaded);
      try { setSessionId(localStorage.getItem(SESSION_KEY)); } catch { /* ignore */ }
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    if (!ready) return;
    repository.save(db).catch(() => notify("تعذّر حفظ البيانات في المتصفح (قد تكون المساحة ممتلئة).", "error"));
  }, [db, ready, notify]);

  const user = useMemo(() => db.users.find((u) => u.id === sessionId && u.active) ?? null, [db.users, sessionId]);

  const login = useCallback((email: string, password: string) => {
    const u = dbRef.current.users.find((x) => x.active && x.email.toLowerCase() === email.trim().toLowerCase());
    if (!u || password !== DEMO_PASSWORD) return false;
    setSessionId(u.id);
    try { localStorage.setItem(SESSION_KEY, u.id); } catch { /* ignore */ }
    return true;
  }, []);

  const logout = useCallback(() => {
    setSessionId(null);
    try { localStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
  }, []);

  const upsert = useCallback(<K extends CollectionKey>(k: K, item: DB[K][number]) => {
    commit((prev) => {
      const list = prev[k] as unknown as { id: string }[];
      const it = item as unknown as { id: string };
      const next = list.some((x) => x.id === it.id) ? list.map((x) => (x.id === it.id ? it : x)) : [...list, it];
      return { ...prev, [k]: next } as DB;
    });
  }, [commit]);

  const remove = useCallback((k: CollectionKey, id: string) => {
    const { db: next, evidenceIds } = cascade(dbRef.current, k, id);
    evidenceIds.forEach(demoFiles.delete);
    dbRef.current = next;
    setDb(next);
  }, []);

  const updateSchool = useCallback((school: School) => commit((p) => ({ ...p, school })), [commit]);

  const resetDemo = useCallback(async () => {
    fileUrls.forEach((_, id) => demoFiles.delete(id));
    await repository.reset();
    const fresh = seedDB();
    dbRef.current = fresh;
    setDb(fresh);
  }, []);

  const value: Store = { ready, db, user, login, logout, upsert, remove, commit, updateSchool, resetDemo, notify };
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
