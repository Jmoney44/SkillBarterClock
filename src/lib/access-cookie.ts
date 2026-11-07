// A short-lived cache of the signed-in member's onboarding state and role, so
// src/proxy.ts can redirect without querying the database on every request.
// It only steers navigation: APIs and database functions enforce access, so a
// tampered value can't grant anything beyond seeing a page shell.

export const ACCESS_COOKIE = "sbc-access";
export const ACCESS_COOKIE_MAX_AGE_SECONDS = 5 * 60;

export type MemberAccess = {
  userId: string;
  onboarded: boolean;
  role: "member" | "admin";
};

export function serializeAccess(access: MemberAccess) {
  return `${access.userId}|${access.onboarded ? 1 : 0}|${access.role}`;
}

export function parseAccess(value: string | undefined): MemberAccess | null {
  const [userId, onboarded, role] = value?.split("|") ?? [];
  if (!userId || (onboarded !== "0" && onboarded !== "1") || (role !== "member" && role !== "admin")) {
    return null;
  }
  return { userId, onboarded: onboarded === "1", role };
}
