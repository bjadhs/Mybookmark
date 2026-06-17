"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { LockIcon, ArrowLeftIcon, HeartIcon, PAGE_ICONS } from "@/app/_icons";
import { useSettings } from "@/lib/hooks/use-settings";
import { FALLBACK_LOCKED, pageById } from "@/lib/settings";

function LockedContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { settings } = useSettings();
  const feature = params.get("feature");
  // Every page's locked screen is admin-editable via site settings. When the
  // ?feature points at a known page we show its copy; otherwise the generic
  // members-only teaser.
  const page = feature ? pageById(settings, feature) : undefined;
  const copy = page
    ? {
        badge: page.label.toUpperCase(),
        title: page.lockedTitle,
        blurb: page.lockedDesc,
        perks: page.perks,
        lockedIcon: page.lockedIcon,
      }
    : {
        badge: "MEMBERS ONLY",
        title: FALLBACK_LOCKED.lockedTitle,
        blurb: FALLBACK_LOCKED.lockedDesc,
        perks: FALLBACK_LOCKED.perks,
        lockedIcon: FALLBACK_LOCKED.lockedIcon,
      };
  const BadgeIcon = PAGE_ICONS[copy.lockedIcon] ?? PAGE_ICONS.heart;

  return (
    <div className="relative mx-auto flex min-h-[calc(100vh-90px)] max-w-[680px] flex-col items-center justify-center px-4 text-center">
      {/* Ambient purple glow behind the lock */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-[12%] h-64 w-64 rounded-full bg-[var(--accent)]/30 blur-[90px]"
        style={{ animation: "glance-glow-pulse 4s ease-in-out infinite" }}
      />

      {/* The padlock — floats lazily, jiggles every few seconds like it's daring you */}
      <div
        className="relative z-[1] mb-7 flex h-[88px] w-[88px] items-center justify-center rounded-[26px] bg-[var(--accent)] text-white shadow-[0_18px_50px_-12px_rgba(168,85,247,0.7)]"
        style={{ animation: "glance-float 5s ease-in-out infinite" }}
      >
        <span style={{ animation: "glance-jiggle 6s ease-in-out infinite" }}>
          <LockIcon className="h-10 w-10" />
        </span>
      </div>

      <div
        className="z-[1] mb-3 inline-flex items-center gap-[7px] rounded-full border border-[var(--accent)]/30 bg-[var(--accent)]/15 px-3 py-[5px] text-[11px] font-bold tracking-[1px] text-[#c9a4ff]"
        style={{ animation: "glance-rise 0.5s ease both" }}
      >
        <BadgeIcon className="h-3.5 w-3.5" />
        {copy.badge} · LOCKED
      </div>

      <h1
        className="z-[1] mb-4 font-[family-name:var(--font-space-grotesk)] text-[32px] font-bold leading-[1.15] tracking-[-0.6px] text-[#f5f5f9] sm:text-[38px]"
        style={{ animation: "glance-rise 0.5s ease 0.05s both" }}
      >
        {copy.title}
      </h1>

      <p
        className="z-[1] mb-7 max-w-[520px] text-[15.5px] leading-[1.65] text-[#a8a8b8]"
        style={{ animation: "glance-rise 0.5s ease 0.1s both" }}
      >
        {copy.blurb}
      </p>

      <ul
        className="z-[1] mb-9 flex w-full max-w-[440px] flex-col gap-[10px] text-left"
        style={{ animation: "glance-rise 0.5s ease 0.15s both" }}
      >
        {copy.perks.map((perk) => (
          <li
            key={perk}
            className="flex items-center gap-3 rounded-[13px] border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-[14px] font-medium text-[#d4d4dd]"
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)]/20 text-[#c9a4ff]">
              <HeartIcon filled className="h-[13px] w-[13px]" />
            </span>
            {perk}
          </li>
        ))}
      </ul>

      <div
        className="z-[1] flex w-full max-w-[440px] flex-col gap-3 sm:flex-row"
        style={{ animation: "glance-rise 0.5s ease 0.2s both" }}
      >
        <SignUpButton mode="modal">
          <button className="flex flex-1 items-center justify-center gap-2 rounded-[13px] bg-[var(--accent)] py-3 text-sm font-semibold text-white shadow-[0_10px_26px_-8px_rgba(168,85,247,0.6)] transition-all hover:-translate-y-px hover:brightness-[1.06]">
            Sign up — unlock everything
          </button>
        </SignUpButton>
        <SignInButton mode="modal">
          <button className="flex flex-1 items-center justify-center gap-2 rounded-[13px] border border-white/[0.1] bg-white/[0.04] py-3 text-sm font-semibold text-glance-primary transition-all hover:bg-white/[0.08]">
            I already have an account
          </button>
        </SignInButton>
      </div>

      <button
        onClick={() => router.push("/")}
        className="z-[1] mt-7 inline-flex items-center gap-2 text-[13px] font-semibold text-glance-muted transition-colors hover:text-glance-primary"
      >
        <ArrowLeftIcon />
        Fine, back to browsing
      </button>
    </div>
  );
}

export default function LockedPage() {
  return (
    <Suspense fallback={null}>
      <LockedContent />
    </Suspense>
  );
}
