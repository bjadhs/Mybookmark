"use client";

import { useState } from "react";
import { SignInButton } from "@clerk/nextjs";
import { FauxBrowser } from "@/app/_components/faux-browser";
import { ImageSlot } from "@/app/_components/image-slot";
import { CommentsSection } from "@/app/_components/comments-section";
import { Button } from "@/app/_components/ui/button";
import { Chip } from "@/app/_components/ui/chip";
import { Input, TextArea } from "@/app/_components/ui/input";
import { FormField } from "@/app/_components/ui/typography";
import {
  ArrowUpRightIcon,
  CheckIcon,
  GlobeIcon,
  HeartIcon,
} from "@/app/_icons";
import { useWebsitePreview } from "@/lib/hooks/use-website-preview";
import { useCategories } from "@/lib/hooks/use-categories";
import { useRole } from "@/lib/hooks/use-role";
import { UpdateBookmarkInput } from "@/lib/hooks/use-bookmarks";
import { surfaceBase } from "@/lib/styles";
import { DerivedBookmark } from "@/lib/types";

interface DetailScreenProps {
  bookmark: DerivedBookmark;
  onSave: (input: UpdateBookmarkInput) => Promise<void>;
  onDelete: () => Promise<void>;
  onToggleLike: () => Promise<void>;
}

export function DetailScreen({
  bookmark,
  onSave,
  onDelete,
  onToggleLike,
}: DetailScreenProps) {
  const { categories } = useCategories();
  const { isAdmin, isSignedIn } = useRole();
  const [liking, setLiking] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(bookmark.title);
  const [url, setUrl] = useState(bookmark.url);
  const [desc, setDesc] = useState(bookmark.desc);
  const [categoryId, setCategoryId] = useState(bookmark.categoryId);
  const [previewImage, setPreviewImage] = useState<string | null>(
    bookmark.previewImage
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preview = useWebsitePreview(bookmark.url);
  const fallbackImage = editing ? previewImage : bookmark.previewImage;

  const startEditing = () => {
    setTitle(bookmark.title);
    setUrl(bookmark.url);
    setDesc(bookmark.desc);
    setCategoryId(bookmark.categoryId);
    setPreviewImage(bookmark.previewImage);
    setError(null);
    setEditing(true);
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      await onSave({ title, url, desc, categoryId, previewImage });
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const handleLike = async () => {
    if (liking) return;
    setLiking(true);
    try {
      await onToggleLike();
    } catch {
      // non-critical; leave UI as-is
    } finally {
      setLiking(false);
    }
  };

  const handleDelete = async () => {
    if (deleting) return;
    if (
      typeof window !== "undefined" &&
      !window.confirm(`Delete "${bookmark.title}"? This can't be undone.`)
    ) {
      return;
    }
    setDeleting(true);
    setError(null);
    try {
      await onDelete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete bookmark");
      setDeleting(false);
    }
  };

  return (
    <div>
      <div
        className="grid gap-11 items-start mx-auto mt-2"
        style={{ gridTemplateColumns: "1.15fr 0.85fr", maxWidth: 1080 }}
      >
        <div className="rounded-[20px] bg-glance-surface border border-white/[0.08] overflow-hidden shadow-[0_30px_70px_-24px_rgba(0,0,0,0.8)]">
          <FauxBrowser
            domain={bookmark.domain}
            gradient={bookmark.gradient}
            heroTint={bookmark.heroTint}
            variant="visit"
            frameUrl={preview.frameable ? bookmark.url : null}
            interactive
            previewImage={preview.image ?? fallbackImage}
            isLoadingPreview={preview.loading}
          />
        </div>

        {editing ? (
          <form
            className={`${surfaceBase} p-6`}
            onSubmit={(e) => {
              e.preventDefault();
              handleSave();
            }}
          >
            <FormField label="Title">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Figma"
              />
            </FormField>

            <FormField label="Link">
              <Input
                icon={<GlobeIcon className="text-glance-faint" />}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://figma.com"
              />
            </FormField>

            <FormField label="Description">
              <TextArea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                rows={3}
                placeholder="A short note so you remember why you saved it."
              />
            </FormField>

            <FormField label="Category" className="mb-5">
              <div className="flex gap-2 flex-wrap">
                {categories.map((cat) => (
                  <Chip
                    key={cat.id}
                    active={categoryId === cat.id}
                    onClick={() => setCategoryId(cat.id)}
                    size="sm"
                  >
                    {cat.name}
                  </Chip>
                ))}
              </div>
            </FormField>

            <FormField
              label="Preview image — shown when the site can't be previewed"
              className="mb-6"
            >
              <ImageSlot
                placeholder="Drop a homepage screenshot"
                shape="rounded"
                radius={13}
                style={{ width: "100%", height: 150 }}
                value={previewImage}
                onImageChange={setPreviewImage}
              />
            </FormField>

            {error && (
              <div className="mb-4 rounded-[11px] border border-red-500/30 bg-red-500/10 px-4 py-3 text-[13px] text-red-300">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => setEditing(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="flex-[1.4] flex items-center justify-center gap-2"
              >
                <CheckIcon />
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </form>
        ) : (
          <div>
            <div className="flex items-center justify-center w-[60px] h-[60px] rounded-[18px] text-[26px] font-extrabold text-white bg-[var(--accent)] mb-5 shadow-[0_12px_30px_-8px_rgba(168,85,247,0.4)]">
              {bookmark.glyph}
            </div>
            <h1 className="font-[family-name:var(--font-space-grotesk)] text-[34px] font-bold text-[#f5f5f9] tracking-[-0.6px] mb-3">
              {bookmark.title}
            </h1>
            <div className="inline-flex items-center gap-[7px] px-3 py-[6px] rounded-[9px] bg-white/[0.04] border border-white/[0.08] text-[13px] text-glance-muted-light mb-[18px]">
              <GlobeIcon />
              {bookmark.domain}
            </div>
            <p className="text-[15.5px] text-[#a8a8b8] leading-[1.6] mb-[18px]">
              {bookmark.desc}
            </p>

            <div className="flex items-center gap-[10px] flex-wrap mb-5">
              <span className="text-[12.5px] font-semibold text-[#b8a8ff] bg-glance-purple-tag border border-glance-purple-tag-border px-[11px] py-[5px] rounded-lg">
                {bookmark.tag}
              </span>
              <span className="text-[13px] text-glance-muted">
                Last visited {bookmark.last}
              </span>
              <span className="text-[#3a3a48]">·</span>
              <span className="text-[13px] text-glance-muted">
                {bookmark.visits} visits
              </span>
            </div>

            <a
              href={bookmark.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-[5px] text-[12.5px] font-semibold text-[#ffe680] hover:text-[#fff2b0] mb-6 transition-colors"
            >
              Open {bookmark.domain}
              <ArrowUpRightIcon />
            </a>

            {error && (
              <div className="mb-4 rounded-[11px] border border-red-500/30 bg-red-500/10 px-4 py-3 text-[13px] text-red-300">
                {error}
              </div>
            )}

            {/* Like — any signed-in user; guests are prompted to sign in. */}
            <div className="mb-5">
              {isSignedIn ? (
                <button
                  onClick={handleLike}
                  disabled={liking}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-[12px] text-[13.5px] font-semibold border transition-all cursor-pointer disabled:opacity-60 ${
                    bookmark.likedByMe
                      ? "bg-[var(--accent)] text-white border-transparent shadow-[0_8px_22px_-8px_rgba(168,85,247,0.6)]"
                      : "bg-white/[0.04] text-glance-primary border-white/[0.1] hover:bg-white/[0.07]"
                  }`}
                >
                  <HeartIcon filled={bookmark.likedByMe} />
                  {bookmark.likedByMe ? "Liked" : "Like"}
                  <span className="tabular-nums opacity-80">
                    {bookmark.likeCount}
                  </span>
                </button>
              ) : (
                <SignInButton mode="modal">
                  <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[12px] text-[13.5px] font-semibold bg-white/[0.04] text-glance-primary border border-white/[0.1] hover:bg-white/[0.07] transition-all cursor-pointer">
                    <HeartIcon />
                    Sign in to like
                    <span className="tabular-nums opacity-80">
                      {bookmark.likeCount}
                    </span>
                  </button>
                </SignInButton>
              )}
            </div>

            {isAdmin && (
              <div className="flex gap-3">
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={startEditing}
                >
                  Edit
                </Button>
                <Button
                  variant="secondary"
                  className="flex-1 !text-red-300 hover:!bg-red-500/10"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? "Deleting…" : "Delete"}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <CommentsSection bookmarkId={bookmark.id} />
    </div>
  );
}
