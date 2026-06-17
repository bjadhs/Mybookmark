import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";

export type Role = "admin" | "user" | "guest";

export interface CurrentUserInfo {
  role: Role;
  userId: string | null;
  name: string;
  imageUrl: string;
  email: string | null;
}

/**
 * Admin identity is driven entirely by the ADMIN_EMAIL env var (comma-separated
 * list supported, case-insensitive). No DB column, no Clerk metadata — the
 * source of truth lives in the environment so admins can be changed without a
 * deploy of code.
 */
function adminEmails(): string[] {
  return (process.env.ADMIN_EMAIL ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmails().includes(email.toLowerCase());
}

/**
 * Resolve the signed-in Clerk user into a role + display fields. Returns a
 * "guest" record (userId null) when nobody is signed in.
 */
export async function getCurrentUserInfo(): Promise<CurrentUserInfo> {
  const user = await currentUser();
  if (!user) {
    return { role: "guest", userId: null, name: "", imageUrl: "", email: null };
  }

  const email =
    user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)
      ?.emailAddress ??
    user.emailAddresses[0]?.emailAddress ??
    null;

  const name =
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.username ||
    email ||
    "User";

  return {
    role: isAdminEmail(email) ? "admin" : "user",
    userId: user.id,
    name,
    imageUrl: user.imageUrl ?? "",
    email,
  };
}

/**
 * Route guard for admin-only mutations. Returns a NextResponse to return early
 * (401 guest / 403 non-admin), or null when the caller is an admin.
 */
export async function guardAdmin(): Promise<NextResponse | null> {
  const me = await getCurrentUserInfo();
  if (!me.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (me.role !== "admin") {
    return NextResponse.json(
      { error: "Forbidden — admins only" },
      { status: 403 }
    );
  }
  return null;
}

type GuardUserResult =
  | { response: NextResponse; user?: undefined }
  | { response?: undefined; user: CurrentUserInfo };

/**
 * Route guard for actions any signed-in user may perform (like, comment).
 * Returns the resolved user, or a 401 response when nobody is signed in.
 */
export async function guardUser(): Promise<GuardUserResult> {
  const me = await getCurrentUserInfo();
  if (!me.userId) {
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { user: me };
}
