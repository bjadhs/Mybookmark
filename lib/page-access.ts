import "server-only";
import { redirect } from "next/navigation";
import { getSettings } from "@/lib/db/settings";
import { getCurrentUserInfo, type CurrentUserInfo } from "@/lib/auth";
import { pageById } from "@/lib/settings";
import type { ManagedPage, SiteSettings } from "@/lib/types";

interface PageAccess {
  settings: SiteSettings;
  page: ManagedPage | undefined;
  me: CurrentUserInfo;
}

/**
 * Server-side gate for a managed page. Loads the live settings + current user;
 * if the page is locked and the caller is a guest, redirects to the friendly
 * /locked teaser (matching the sidebar's behavior) instead of Clerk's sign-in.
 * Built-in pages used to be gated by middleware (proxy.ts) — that gating now
 * lives here so a page's `locked` flag is the single source of truth.
 */
export async function enforcePageAccess(pageId: string): Promise<PageAccess> {
  const [settings, me] = await Promise.all([
    getSettings(),
    getCurrentUserInfo(),
  ]);
  const page = pageById(settings, pageId);

  if (page?.locked && !me.userId) {
    redirect(`/locked?feature=${pageId}`);
  }

  return { settings, page, me };
}

/**
 * Server-side gate for admin-only pages. Guests are sent to sign-in; signed-in
 * non-admins are bounced home. The matching API routes enforce admin too, so
 * this is the UX half of a defense-in-depth pair.
 */
export async function enforceAdmin(): Promise<CurrentUserInfo> {
  const me = await getCurrentUserInfo();
  if (!me.userId) redirect("/sign-in");
  if (me.role !== "admin") redirect("/");
  return me;
}
