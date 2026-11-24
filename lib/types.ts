export type Role = "system_admin" | "school_admin" | "supervisor" | "member";
export type IndicatorStatus = "not_started" | "in_progress" | "completed" | "needs_review";
export type TaskStatus = "open" | "done";
export type PlanStatus = "draft" | "active" | "done";

export interface School { name: string; city: string; stage: string; year: string; principal: string; isDemo: boolean }
export interface AppUser { id: string; name: string; email: string; role: Role; active: boolean }
export interface Domain { id: string; code: string; title: string }
export interface Standard { id: string; domainId: string; code: string; title: string }
export interface Indicator {
  id: string; domainId: string; standardId: string; code: string; title: string; description: string;
  status: IndicatorStatus; ownerId: string; dueDate: string;
}
export interface Evidence {
  id: string; indicatorId: string; kind: "file" | "link"; category: string; description: string;
  fileName?: string; mime?: string; size?: number; url?: string; uploadedBy: string; createdAt: string;
}
export interface Task { id: string; title: string; indicatorId: string; assigneeId: string; dueDate: string; status: TaskStatus }
export interface Plan {
  id: string; title: string; indicatorId: string; goal: string; actions: string; ownerId: string;
  startDate: string; endDate: string; status: PlanStatus;
}

export interface DB {
  school: School; users: AppUser[]; domains: Domain[]; standards: Standard[]; indicators: Indicator[];
  evidence: Evidence[]; tasks: Task[]; plans: Plan[];
}
export type CollectionKey = Exclude<keyof DB, "school">;
