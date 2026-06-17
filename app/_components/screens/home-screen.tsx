"use client";

import { BookmarkCard } from "@/app/_components/bookmark-card";
import { Chip } from "@/app/_components/ui/chip";
import { SearchInput } from "@/app/_components/ui/input";
import { SortButton } from "@/app/_components/ui/sort-button";
import { SearchIcon } from "@/app/_icons";
import { useFilteredBookmarks } from "@/lib/hooks/use-filtered-bookmarks";
import { sorts } from "@/lib/theme";
import { DerivedBookmark, SortKey } from "@/lib/types";

interface HomeScreenProps {
  bookmarks: DerivedBookmark[];
  categories: string[];
  total: number;
  search: string;
  setSearch: (value: string) => void;
  tag: string;
  setTag: (value: string) => void;
  activeCategoryId?: string;
  sort: SortKey;
  setSort: (value: SortKey) => void;
  clearFilters: () => void;
  onVisit: (slug: string) => void;
}

export function HomeScreen({
  bookmarks,
  categories,
  total,
  search,
  setSearch,
  tag,
  setTag,
  activeCategoryId,
  sort,
  setSort,
  clearFilters,
  onVisit,
}: HomeScreenProps) {
  const filtered = useFilteredBookmarks(
    bookmarks,
    search,
    tag,
    sort as "recent" | "az" | "visits",
    activeCategoryId
  );

  return (
    <div>
      <div className="flex items-start justify-between gap-6 mb-[26px]">
        <div>
          <h1 className="font-[family-name:var(--font-space-grotesk)] text-[32px] font-bold text-[#f5f5f9] tracking-[-0.6px]">
            Library
          </h1>
          <p className="flex items-center gap-[9px] mt-[7px] text-glance-muted text-[14.5px]">
            <span className="inline-flex items-center gap-[6px]">
              <span className="w-[7px] h-[7px] rounded-full bg-glance-online shadow-[0_0_8px_#1ed760] animate-glance-pulse" />
              Live previews
            </span>
            <span className="text-[#3a3a48]">·</span>
            <span>{total} sites synced just now</span>
          </p>
        </div>
        <SearchInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-[300px] shrink-0"
        />
      </div>

      <div className="flex items-center justify-between gap-5 flex-wrap mb-6">
        <div className="flex gap-[9px] flex-wrap">
          {categories.map((name) => {
            const count =
              name === "All"
                ? total
                : bookmarks.filter((b) => b.tag === name).length;
            const active = tag === name;
            return (
              <Chip key={name} active={active} onClick={() => setTag(name)}>
                <span>{name}</span>
                <span
                  className={
                    "text-[11.5px] font-bold " +
                    (active
                      ? "text-[rgba(6,18,26,0.5)]"
                      : "text-glance-faint")
                  }
                >
                  {count}
                </span>
              </Chip>
            );
          })}
        </div>
        <div className="flex items-center gap-[6px] p-1 rounded-xl bg-white/[0.03] border border-glance-border">
          <span className="text-xs text-glance-faint font-semibold pl-2 pr-[6px]">
            Sort
          </span>
          {sorts.map((s) => (
            <SortButton
              key={s.key}
              active={sort === s.key}
              onClick={() => setSort(s.key)}
            >
              {s.label}
            </SortButton>
          ))}
        </div>
      </div>

      {filtered.length > 0 ? (
        <div
          className="grid gap-[28px]"
          style={{
            gridTemplateColumns: "repeat(auto-fill, minmax(330px, 1fr))",
          }}
        >
          {filtered.map((bm) => (
            <BookmarkCard key={bm.id} bookmark={bm} onClick={() => onVisit(bm.slug)} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 px-5 text-center border border-dashed border-white/10 rounded-[18px] bg-white/[0.015]">
          <div className="w-[54px] h-[54px] rounded-[15px] bg-white/[0.04] flex items-center justify-center mb-4">
            <SearchIcon className="text-glance-faint" />
          </div>
          <div className="text-[17px] font-bold text-[#d4d4dd] mb-[6px]">
            No bookmarks match
          </div>
          <div className="text-sm text-glance-muted mb-[18px]">
            Try a different search or category.
          </div>
          <button
            onClick={clearFilters}
            className="px-[18px] py-[10px] rounded-[11px] bg-white/[0.05] border border-white/10 text-[#d4d4dd] text-[13.5px] font-semibold cursor-pointer transition-all hover:bg-white/[0.07]"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
