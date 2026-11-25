import type { AppUser, CollectionKey, DB, Domain, Evidence, Indicator, Plan, Standard, Task } from "./types";

type Row = Record<string, any>;

export const TABLES = {
  users: "profiles",
  domains: "domains",
  standards: "standards",
  indicators: "indicators",
  evidence: "evidence",
  tasks: "tasks",
  plans: "improvement_plans",
} as const satisfies Record<CollectionKey, string>;

export interface RowCtx { schoolId: string; userId: string; yearId: string | null; isNew: boolean }

const s = (v: unknown) => (v == null ? "" : String(v));
const nn = (v: string) => (v ? v : null);

export function toRow(k: CollectionKey, item: unknown, c: RowCtx): Row {
  switch (k) {
    case "users": {
      const u = item as AppUser;
      return { full_name: u.name, role: u.role, is_active: u.active };
    }
    case "domains": {
      const d = item as Domain;
      return { id: d.id, school_id: c.schoolId, code: d.code, title: d.title, ...(c.isNew && c.yearId ? { year_id: c.yearId } : {}) };
    }
    case "standards": {
      const x = item as Standard;
      return { id: x.id, school_id: c.schoolId, domain_id: x.domainId, code: x.code, title: x.title };
    }
    case "indicators": {
      const i = item as Indicator;
      return {
        id: i.id, school_id: c.schoolId, domain_id: i.domainId, standard_id: i.standardId, code: i.code,
        title: i.title, description: i.description, status: i.status, owner_id: nn(i.ownerId), due_date: nn(i.dueDate),
      };
    }
    case "evidence": {
      const e = item as Evidence;
      return {
        id: e.id, school_id: c.schoolId, indicator_id: e.indicatorId, kind: e.kind, description: e.description,
        category: e.category, storage_path: e.storagePath ?? null, file_name: e.fileName ?? null, mime_type: e.mime ?? null,
        size_bytes: e.size ?? null, external_url: e.url ?? null, uploaded_by: e.uploadedBy || c.userId, created_at: e.createdAt,
      };
    }
    case "tasks": {
      const t = item as Task;
      return {
        id: t.id, school_id: c.schoolId, indicator_id: nn(t.indicatorId), title: t.title, assignee_id: nn(t.assigneeId),
        due_date: nn(t.dueDate), status: t.status, ...(c.isNew ? { created_by: c.userId } : {}),
      };
    }
    case "plans": {
      const p = item as Plan;
      return {
        id: p.id, school_id: c.schoolId, indicator_id: nn(p.indicatorId), title: p.title, goal: p.goal, actions: p.actions,
        owner_id: nn(p.ownerId), start_date: nn(p.startDate), end_date: nn(p.endDate), status: p.status,
      };
    }
  }
}

export const mapUser = (r: Row): AppUser => ({ id: r.id, name: s(r.full_name), email: s(r.email), role: r.role, active: r.is_active !== false });
const mapDomain = (r: Row): Domain => ({ id: r.id, code: s(r.code), title: s(r.title) });
const mapStandard = (r: Row): Standard => ({ id: r.id, domainId: r.domain_id, code: s(r.code), title: s(r.title) });
const mapIndicator = (r: Row): Indicator => ({
  id: r.id, domainId: r.domain_id, standardId: r.standard_id, code: s(r.code), title: s(r.title), description: s(r.description),
  status: r.status, ownerId: s(r.owner_id), dueDate: s(r.due_date).slice(0, 10),
});
const mapEvidence = (r: Row): Evidence => ({
  id: r.id, indicatorId: r.indicator_id, kind: r.kind, category: s(r.category), description: s(r.description),
  fileName: r.file_name ?? undefined, mime: r.mime_type ?? undefined, size: r.size_bytes == null ? undefined : Number(r.size_bytes),
  url: r.external_url ?? undefined, storagePath: r.storage_path ?? undefined, uploadedBy: s(r.uploaded_by), createdAt: s(r.created_at).slice(0, 10),
});
const mapTask = (r: Row): Task => ({
  id: r.id, title: s(r.title), indicatorId: s(r.indicator_id), assigneeId: s(r.assignee_id), dueDate: s(r.due_date).slice(0, 10), status: r.status,
});
const mapPlan = (r: Row): Plan => ({
  id: r.id, title: s(r.title), indicatorId: s(r.indicator_id), goal: s(r.goal), actions: s(r.actions), ownerId: s(r.owner_id),
  startDate: s(r.start_date).slice(0, 10), endDate: s(r.end_date).slice(0, 10), status: r.status,
});

export function buildDB(school: Row | null, yearName: string, rows: Record<CollectionKey, Row[]>): DB {
  return {
    school: {
      name: s(school?.name), city: s(school?.city), stage: s(school?.stage), principal: s(school?.principal),
      year: yearName, isDemo: Boolean(school?.is_demo),
    },
    users: rows.users.map(mapUser),
    domains: rows.domains.map(mapDomain),
    standards: rows.standards.map(mapStandard),
    indicators: rows.indicators.map(mapIndicator),
    evidence: rows.evidence.map(mapEvidence).reverse(),
    tasks: rows.tasks.map(mapTask),
    plans: rows.plans.map(mapPlan),
  };
}
