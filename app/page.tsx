"use client";

import { useRouter } from "next/navigation";
import { HomeScreen } from "@/app/_components/screens/home-screen";
import { useLibraryState } from "@/lib/hooks/use-app-state";
import { useBookmarks } from "@/lib/hooks/use-bookmarks";
import { useCategories } from "@/lib/hooks/use-categories";
import { useActiveCategory } from "@/lib/category-filter";
import { deriveBookmark } from "@/lib/utils";

export default function Home() {
  const router = useRouter();
  const { bookmarks, loading, error } = useBookmarks();
  const { categories } = useCategories();
  const library = useLibraryState();

  const activeCategoryId = useActiveCategory();

  const derivedBookmarks = bookmarks.map(deriveBookmark);

  const categoryNames = ["All", ...categories.map((c) => c.name)];

  return (
    <>
      {loading && (
        <div className="flex items-center justify-center h-64 text-glance-muted">
          Loading bookmarks…
        </div>
      )}

      {error && (
        <div className="flex items-center justify-center h-64 text-red-400">
          {error}
        </div>
      )}

      {!loading && !error && (
        <HomeScreen
          bookmarks={derivedBookmarks}
          categories={categoryNames}
          total={derivedBookmarks.length}
          search={library.search}
          setSearch={library.setSearch}
          tag={library.tag}
          setTag={library.setTag}
          activeCategoryId={activeCategoryId}
          sort={library.sort}
          setSort={library.setSort}
          clearFilters={library.clearFilters}
          onVisit={(slug) => router.push(`/${slug}`)}
        />
      )}
    </>
  );
}
