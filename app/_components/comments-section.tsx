"use client";

import { useState } from "react";
import Image from "next/image";
import { SignInButton, useAuth } from "@clerk/nextjs";
import { useComments } from "@/lib/hooks/use-comments";
import { useRole } from "@/lib/hooks/use-role";
import { TrashIcon } from "@/app/_icons";
import { Comment } from "@/lib/types";

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function Avatar({ comment }: { comment: Comment }) {
  if (comment.authorImage) {
    return (
      <Image
        src={comment.authorImage}
        alt={comment.authorName}
        width={32}
        height={32}
        className="w-8 h-8 rounded-[9px] object-cover shrink-0"
      />
    );
  }
  return (
    <div className="flex items-center justify-center w-8 h-8 rounded-[9px] text-[13px] font-extrabold text-white bg-[var(--accent)] shrink-0">
      {(comment.authorName[0] || "?").toUpperCase()}
    </div>
  );
}

export function CommentsSection({ bookmarkId }: { bookmarkId: string }) {
  const { comments, loading, error, addComment, deleteComment } =
    useComments(bookmarkId);
  const { isSignedIn, isAdmin } = useRole();
  const { userId } = useAuth();
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  const handlePost = async () => {
    if (!body.trim() || posting) return;
    setPosting(true);
    setPostError(null);
    try {
      await addComment(body.trim());
      setBody("");
    } catch (err) {
      setPostError(err instanceof Error ? err.message : "Failed to post comment");
    } finally {
      setPosting(false);
    }
  };

  return (
    <section className="mt-10 mx-auto" style={{ maxWidth: 1080 }}>
      <h2 className="font-[family-name:var(--font-space-grotesk)] text-[20px] font-bold text-[#f5f5f9] tracking-[-0.3px] mb-5">
        Comments
        {!loading && (
          <span className="ml-2 text-[15px] font-semibold text-glance-faint">
            {comments.length}
          </span>
        )}
      </h2>

      {isSignedIn ? (
        <div className="mb-7">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            placeholder="Share a thought…"
            className="w-full resize-none rounded-[13px] bg-white/[0.03] border border-white/[0.08] px-4 py-3 text-[14px] text-glance-primary outline-none transition-colors focus:border-[var(--accent)] placeholder:text-glance-faint"
          />
          {postError && (
            <div className="mt-2 text-[13px] text-red-300">{postError}</div>
          )}
          <div className="flex justify-end mt-3">
            <button
              onClick={handlePost}
              disabled={posting || !body.trim()}
              className="px-5 py-2.5 rounded-[11px] bg-[var(--accent)] text-white text-[13.5px] font-semibold cursor-pointer transition-all hover:brightness-[1.06] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {posting ? "Posting…" : "Post comment"}
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-7 flex items-center justify-between gap-4 rounded-[13px] bg-white/[0.03] border border-white/[0.08] px-4 py-3">
          <span className="text-[13.5px] text-glance-muted">
            Sign in to join the conversation.
          </span>
          <SignInButton mode="modal">
            <button className="px-4 py-2 rounded-[10px] bg-[var(--accent)] text-white text-[13px] font-semibold cursor-pointer transition-all hover:brightness-[1.06]">
              Sign in
            </button>
          </SignInButton>
        </div>
      )}

      {loading && (
        <div className="text-[14px] text-glance-muted">Loading comments…</div>
      )}
      {error && <div className="text-[14px] text-red-400">{error}</div>}

      {!loading && !error && comments.length === 0 && (
        <div className="text-[14px] text-glance-muted">
          No comments yet — be the first.
        </div>
      )}

      <div className="flex flex-col gap-4">
        {comments.map((c) => {
          const canDelete = isAdmin || userId === c.userId;
          return (
            <div
              key={c.id}
              className="group flex gap-3 rounded-[13px] bg-white/[0.02] border border-white/[0.06] px-4 py-3"
            >
              <Avatar comment={c} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[13.5px] font-bold text-glance-primary truncate">
                    {c.authorName}
                  </span>
                  <span className="text-[11.5px] text-glance-faint">
                    {relativeTime(c.createdAt)}
                  </span>
                </div>
                <p className="text-[14px] text-[#a8a8b8] leading-[1.55] mt-1 whitespace-pre-wrap break-words">
                  {c.body}
                </p>
              </div>
              {canDelete && (
                <button
                  onClick={() => deleteComment(c.id)}
                  className="self-start p-1.5 rounded-[8px] text-glance-faint opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
                  title="Delete comment"
                >
                  <TrashIcon />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
