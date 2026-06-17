"use client";

import { useRouter, usePathname } from "next/navigation";
import { UserButton, useAuth } from "@clerk/nextjs";
import {
  GridIcon,
  SettingsIcon,
  PlusIcon,
  LogoIcon,
  LockIcon,
  PAGE_ICONS,
} from "@/app/_icons";
import { useBookmarks } from "@/lib/hooks/use-bookmarks";
import { useRole } from "@/lib/hooks/use-role";
import { useSettings } from "@/lib/hooks/use-settings";
import { navPages, pageRoute } from "@/lib/settings";

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { isSignedIn } = useAuth();
  const { isAdmin } = useRole();
  const { bookmarks } = useBookmarks();
  const { settings } = useSettings();
  const total = bookmarks.length;

  // Admin-managed pages. Signed-in users go to the real page; guests on a
  // locked page are steered to the friendly /locked teaser instead.
  const pages = navPages(settings);
  const navItemClass =
    "flex items-center gap-3 px-3 py-2.5 rounded-[11px] text-sm font-semibold text-glance-muted cursor-pointer transition-all duration-150 hover:bg-white/4 hover:text-glance-primary";
  const navActiveClass = "bg-[var(--accent)]/20 text-[var(--accent)]";
  const navLink = (path: string) =>
    `${navItemClass} ${pathname === path ? navActiveClass : ""}`;

  return (
    <aside className="sticky top-0 self-start flex flex-col h-screen w-[268px] shrink-0 px-[18px] py-[22px] border-r border-white/5 bg-[rgba(10,10,15,0.6)] backdrop-blur-[12px]">
      <div
        onClick={() => router.push("/")}
        className="flex items-center gap-[11px] px-[6px] pb-[22px] pt-1 cursor-pointer transition-opacity hover:opacity-85"
      >
        <div className="flex items-center justify-center w-9 h-9 rounded-[11px] text-white bg-[var(--accent)] shadow-[0_6px_18px_rgba(168,85,247,0.4)]">
          <LogoIcon />
        </div>
        <div className="flex items-center gap-2">
          <span className="font-[family-name:var(--font-space-grotesk)] text-[19px] font-bold text-[#f4f4f8] tracking-[-0.3px]">
            Glance
          </span>
          <span className="text-[10px] font-bold tracking-[0.5px] text-[#9a8dff] bg-[rgba(124,92,255,0.16)] border border-[rgba(124,92,255,0.25)] px-[6px] py-[2px] rounded-md">
            BETA
          </span>
        </div>
      </div>

      {isAdmin && (
        <button
          onClick={() => router.push("/add")}
          className="flex items-center justify-center gap-[9px] w-full py-3 rounded-[13px] bg-[var(--accent)] text-white font-semibold text-sm cursor-pointer shadow-[0_8px_22px_-6px_rgba(168,85,247,0.5)] transition-all duration-150 hover:brightness-[1.06] hover:-translate-y-px"
        >
          <PlusIcon />
          New bookmark
        </button>
      )}

      <div className="text-[11px] font-bold tracking-[0.8px] text-glance-faint px-2 pb-[10px] mt-[26px]">
        LIBRARY
      </div>
      <nav className="flex flex-col gap-[3px]">
        <div onClick={() => router.push("/")} className={navLink("/")}>
          <GridIcon />
          <span className="flex-1">All bookmarks</span>
          <span className="text-xs font-bold text-glance-faint">{total}</span>
        </div>

        {pages.map((page) => {
          const Icon = PAGE_ICONS[page.icon] ?? PAGE_ICONS.globe;
          const route = pageRoute(page);
          // Signed-in members (and any unlocked page) link straight to the page;
          // guests on a locked page get the /locked teaser.
          return isSignedIn || !page.locked ? (
            <div
              key={page.id}
              onClick={() => router.push(route)}
              className={navLink(route)}
            >
              <Icon />
              <span className="flex-1">{page.label}</span>
            </div>
          ) : (
            <div
              key={page.id}
              onClick={() => router.push(`/locked?feature=${page.id}`)}
              title="Members only — sign in to unlock"
              className="group relative flex items-center gap-3 px-3 py-2.5 rounded-[11px] cursor-pointer overflow-hidden border border-dashed border-white/[0.09] bg-white/[0.012] transition-all duration-200 hover:border-[var(--accent)]/45 hover:bg-[var(--accent)]/[0.06]"
            >
              {/* The icon wears a padlock like a locked folder — the whole row,
                  not a side badge, is what reads as locked. The padlock badge is
                  toggleable via site settings (showLockIcon). */}
              <span className="relative inline-flex text-glance-faint transition-colors duration-200 group-hover:text-[var(--accent)]">
                <Icon />
                {settings.showLockIcon && (
                  <span className="absolute -bottom-[5px] -right-[6px] flex items-center justify-center w-[14px] h-[14px] rounded-full bg-[#16161f] border border-white/10 text-glance-faint transition-colors duration-200 group-hover:text-[var(--accent)] group-hover:border-[var(--accent)]/40">
                    <LockIcon className="w-2 h-2" />
                  </span>
                )}
              </span>
              <span className="flex-1 text-sm font-semibold text-glance-faint select-none transition-colors duration-200 group-hover:text-glance-primary">
                {page.label}
              </span>
              <span className="text-[10px] font-bold tracking-[0.6px] text-[var(--accent)] opacity-0 translate-x-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0">
                UNLOCK
              </span>
            </div>
          );
        })}
      </nav>

      {isSignedIn && (
        <>
          <div className="text-[11px] font-bold tracking-[0.8px] text-glance-faint px-2 pb-[10px] mt-6">
            ACCOUNT
          </div>
          <nav className="flex flex-col gap-[3px]">
            <div
              onClick={() => router.push("/settings")}
              className={navLink("/settings")}
            >
              <SettingsIcon />
              Settings
            </div>
          </nav>
        </>
      )}

      {isSignedIn ? (
        <div className="mt-auto flex items-center gap-[11px] p-[11px] rounded-[14px] bg-white/[0.03] border border-glance-border">
          <UserButton
            appearance={{
              elements: {
                userButtonAvatarBox: "w-9 h-9 rounded-[11px]",
                userButtonOuterIdentifier:
                  "text-[13.5px] font-bold text-glance-primary truncate",
                userButtonTrigger:
                  "flex items-center gap-[11px] focus:outline-none",
              },
            }}
            showName
          />
        </div>
      ) : (
        <div
          onClick={() => router.push("/sign-in")}
          className="mt-auto flex items-center gap-[11px] p-[11px] rounded-[14px] bg-white/[0.03] border border-glance-border cursor-pointer transition-all hover:bg-[var(--accent)]/[0.08] hover:border-[var(--accent)]/30"
        >
          <div className="flex items-center justify-center w-9 h-9 rounded-[11px] text-white text-sm font-extrabold bg-[var(--accent)]">
            ?
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13.5px] font-bold text-glance-primary truncate">
              Not signed in
            </div>
            <div className="text-[11.5px] text-glance-muted">
              Sign in to unlock everything
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
