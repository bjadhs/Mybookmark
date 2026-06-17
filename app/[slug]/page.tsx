"use client";

import { useParams, useRouter } from "next/navigation";
import { DetailScreen } from "@/app/_components/screens/detail-screen";
import { Button } from "@/app/_components/ui/button";
import { useBookmarks } from "@/lib/hooks/use-bookmarks";
import { deriveBookmark, findBySlug } from "@/lib/utils";

export default function BookmarkDetailPage() {
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;

  const { bookmarks, loading, error, updateBookmark, deleteBookmark, toggleLike } =
    useBookmarks();

  const match = findBySlug(bookmarks, slug ?? "");
  const bookmark = match ? deriveBookmark(match) : null;

  return (
    <>
      {loading && (
        <div className="flex items-center justify-center h-64 text-glance-muted">
          Loading bookmark…
        </div>
      )}

      {!loading && error && (
        <div className="flex items-center justify-center h-64 text-red-400">
          {error}
        </div>
      )}

      {!loading && !error && !bookmark && (
        <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
          <div className="text-[17px] font-bold text-[#d4d4dd]">
            Bookmark not found
          </div>
          <Button onClick={() => router.push("/")}>Back to library</Button>
        </div>
      )}

      {!loading && !error && bookmark && (
        <DetailScreen
          bookmark={bookmark}
          onSave={async (input) => {
            await updateBookmark(bookmark.id, input);
          }}
          onDelete={async () => {
            await deleteBookmark(bookmark.id);
            router.push("/");
          }}
          onToggleLike={() => toggleLike(bookmark.id)}
        />
      )}
    </>
  );
}
