import type { DB } from "./types";

// طبقة الوصول للبيانات. الواجهات لا تعرف أين تُحفظ البيانات.
// في المرحلة التالية يُستبدل localRepository بـ supabaseRepository دون تعديل الصفحات.
export interface Repository {
  load(): Promise<DB | null>;
  save(db: DB): Promise<void>;
  reset(): Promise<void>;
}

const KEY = "nexora.school.demo.v1";

export const localRepository: Repository = {
  async load() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) as DB) : null;
    } catch {
      return null;
    }
  },
  async save(db) { localStorage.setItem(KEY, JSON.stringify(db)); },
  async reset() { localStorage.removeItem(KEY); },
};

export const repository: Repository = localRepository;
