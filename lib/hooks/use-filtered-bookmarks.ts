import { useMemo } from "react";
import { DerivedBookmark } from "@/lib/types";
import { SortKey } from "@/lib/types";

export function useFilteredBookmarks(
  bookmarks: DerivedBookmark[],
  search: string,
  tag: string,
  sort: SortKey,
  activeCategoryId?: string
) {
  return useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = bookmarks.filter((b) => {
      const okTag =
        tag === "All" &&
        (!activeCategoryId || activeCategoryId === "all")
          ? true
          : activeCategoryId && activeCategoryId !== "all"
            ? b.categoryId === activeCategoryId
            : b.tag === tag;
      const okQ =
        !q ||
        b.title.toLowerCase().includes(q) ||
        b.domain.toLowerCase().includes(q);
      return okTag && okQ;
    });

    list = list.slice().sort((a, b) => {
      if (sort === "az") return a.title.localeCompare(b.title);
      if (sort === "visits") return b.visits - a.visits;
      return 0;
    });

    return list;
  }, [bookmarks, search, tag, sort, activeCategoryId]);
}
