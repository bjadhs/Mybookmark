"use client";

import { ArrowUpRightIcon, HeartIcon } from "@/app/_icons";
import { DerivedBookmark } from "@/lib/types";
import { useWebsitePreview } from "@/lib/hooks/use-website-preview";
import { FauxBrowser } from "./faux-browser";

interface BookmarkCardProps {
  bookmark: DerivedBookmark;
  onClick: () => void;
}

export function BookmarkCard({ bookmark, onClick }: BookmarkCardProps) {
  const { image, frameable, loading } = useWebsitePreview(bookmark.url);

  return (
    <div
      onClick={onClick}
      className="group cursor-pointer overflow-hidden rounded-[18px] border border-glance-border bg-glance-surface transition-all duration-300 hover:scale-[1.03] hover:border-white/15 hover:shadow-[0_8px_40px_-8px_rgba(124,92,255,0.35)] flex flex-col aspect-square"
    >
      <FauxBrowser
        domain={bookmark.domain}
        gradient={bookmark.gradient}
        heroTint={bookmark.heroTint}
        variant="card"
        frameUrl={frameable ? bookmark.url : null}
        previewImage={image ?? bookmark.previewImage}
        isLoadingPreview={loading}
      />

      <div className="px-[14px] py-[12px] flex items-center gap-[10px]">
        <div className="flex shrink-0 items-center justify-center w-[28px] h-[28px] rounded-[8px] text-[13px] font-extrabold text-white bg-[var(--accent)]">
          {bookmark.glyph}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-bold text-glance-primary truncate">
            {bookmark.title}
          </div>
          <div className="text-[11px] text-glance-muted truncate">
            {bookmark.domain}
          </div>
        </div>
        <div className="flex flex-col items-end gap-[2px] shrink-0">
          <span
            className={`flex items-center gap-[3px] text-[10px] ${
              bookmark.likedByMe ? "text-[var(--accent)]" : "text-glance-faint"
            }`}
          >
            <HeartIcon className="w-[11px] h-[11px]" filled={bookmark.likedByMe} />
            {bookmark.likeCount}
          </span>
          <span className="text-[10px] text-glance-muted">{bookmark.last}</span>
        </div>
        <ArrowUpRightIcon className="shrink-0 text-glance-faint w-[14px] h-[14px]" />
      </div>
    </div>
  );
}
