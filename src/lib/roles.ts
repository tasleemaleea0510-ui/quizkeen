export const ROLE_THEME: Record<string, { color: string; glow?: string; badge: string; label: string }> = {
  OWNER: { color: "text-amber-300", glow: "drop-shadow-[0_0_6px_rgba(252,211,77,0.9)]", badge: "👑", label: "ÄGARE" },
  ADMIN: { color: "text-red-400", glow: "drop-shadow-[0_0_5px_rgba(248,113,113,0.7)]", badge: "🛡️", label: "ADMIN" },
  SECURITY: { color: "text-sky-300", glow: "drop-shadow-[0_0_5px_rgba(125,211,252,0.7)]", badge: "🕵️", label: "SÄKERHET" },
  TEACHER: { color: "text-blue-500", badge: "🍎", label: "LÄRARE" },
  STUDENT: { color: "text-slate-300", badge: "🎒", label: "ELEV" },
};

export const STAFF_ROLES = ["OWNER", "ADMIN", "SECURITY"];

export function rankTheme(i: number, role: string) {
  if (STAFF_ROLES.includes(role)) return ROLE_THEME[role];
  if (i === 0) return { color: "text-emerald-400", glow: "drop-shadow-[0_0_8px_rgba(52,211,153,0.9)]", badge: "🌟", label: "" };
  if (i === 1) return { color: "text-purple-400", badge: "", label: "" };
  if (i === 2) return { color: "text-yellow-600", badge: "", label: "" };
  return ROLE_THEME.STUDENT;
}