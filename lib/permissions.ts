import type { AppUser, Evidence, Indicator, Role } from "./types";

// ملاحظة: هذه الصلاحيات لتجربة الواجهة فقط. الحماية الفعلية تكون عبر RLS في Supabase (المرحلة 1).
export const isManager = (r: Role) => r !== "member";
export const canManageUsers = (r: Role) => r === "school_admin" || r === "system_admin";
export const canEditSchool = canManageUsers;
export const canEditIndicator = (u: AppUser, i: Indicator) => isManager(u.role) || i.ownerId === u.id;
export const canDeleteEvidence = (u: AppUser, e: Evidence) => isManager(u.role) || e.uploadedBy === u.id;
