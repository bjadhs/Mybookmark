"use client";

import { FauxBrowser } from "@/app/_components/faux-browser";
import { ImageSlot } from "@/app/_components/image-slot";
import { Button } from "@/app/_components/ui/button";
import { Chip } from "@/app/_components/ui/chip";
import { Input, TextArea } from "@/app/_components/ui/input";
import {
  FormField,
  LiveBadge,
  PageSubtitle,
  PageTitle,
} from "@/app/_components/ui/typography";
import { CheckIcon, GlobeIcon } from "@/app/_icons";
import { usePreviewValues } from "@/lib/hooks/use-preview-values";
import { useCategories } from "@/lib/hooks/use-categories";
import { surfaceBase } from "@/lib/styles";

interface AddScreenProps {
  title: string;
  setTitle: (value: string) => void;
  url: string;
  setUrl: (value: string) => void;
  desc: string;
  setDesc: (value: string) => void;
  categoryId: string;
  setCategoryId: (value: string) => void;
  previewImage: string | null;
  setPreviewImage: (value: string | null) => void;
  saving?: boolean;
  saveError?: string | null;
  onBack: () => void;
  onSave: () => void;
}

export function AddScreen({
  title,
  setTitle,
  url,
  setUrl,
  desc,
  setDesc,
  categoryId,
  setCategoryId,
  previewImage,
  setPreviewImage,
  saving = false,
  saveError = null,
  onBack,
  onSave,
}: AddScreenProps) {
  const { categories } = useCategories();
  const preview = usePreviewValues(title, url, desc, categories.find((c) => c.id === categoryId)?.name ?? "");

  return (
    <div>
      <PageTitle>Add a bookmark</PageTitle>
      <PageSubtitle>
        Set a title, link, and preview image — see exactly how it&apos;ll land in
        your grid.
      </PageSubtitle>

      <div
        className="grid gap-[30px] items-start"
        style={{ gridTemplateColumns: "1.05fr 0.95fr" }}
      >
        <form className={`${surfaceBase} p-7`} onSubmit={(e) => { e.preventDefault(); onSave(); }}>
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

          <FormField label="Category" className="mb-6">
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

          <FormField label="Preview image" className="mb-7">
            <ImageSlot
              placeholder="Drop a homepage screenshot"
              shape="rounded"
              radius={13}
              style={{ width: "100%", height: 170 }}
              onImageChange={setPreviewImage}
            />
          </FormField>

          {saveError && (
            <div className="mb-4 rounded-[11px] border border-red-500/30 bg-red-500/10 px-4 py-3 text-[13px] text-red-300">
              {saveError}
            </div>
          )}

          <div className="flex gap-3">
            <Button type="button" variant="secondary" className="flex-1" onClick={onBack} disabled={saving}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="flex-[1.4] flex items-center justify-center gap-2"
            >
              <CheckIcon />
              {saving ? "Saving…" : "Save bookmark"}
            </Button>
          </div>
        </form>

        <div className="sticky top-6">
          <LiveBadge />
          <div className="rounded-[18px] bg-glance-surface border border-white/[0.08] overflow-hidden shadow-[0_22px_46px_-18px_rgba(0,0,0,0.7)]"
          >
            <FauxBrowser
              domain={preview.domain}
              gradient="linear-gradient(135deg, #00d4ff, #7c5cff)"
              heroTint="linear-gradient(135deg, #00d4ff2e, #7c5cff14)"
              variant="add"
              imageSlot={
                previewImage ? (
                  <img
                    src={previewImage}
                    alt="Preview"
                    className="w-full h-[175px] object-cover"
                  />
                ) : undefined
              }
            />
            <div className="px-4 pt-4 pb-[18px]">
              <div className="flex items-center gap-[11px] mb-[11px]">
                <div className="flex shrink-0 items-center justify-center w-[34px] h-[34px] rounded-[10px] text-[15px] font-extrabold text-white bg-[var(--accent)]"
                >
                  {preview.glyph}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-bold text-glance-primary truncate"
                  >
                    {preview.title}
                  </div>
                  <div className="text-[12.5px] text-glance-muted truncate"
                  >
                    {preview.domain}
                  </div>
                </div>
              </div>
              <div className="text-[13px] text-glance-muted-light leading-[1.5] line-clamp-2 min-h-[39px]"
              >
                {preview.description}
              </div>
              <div className="flex items-center gap-[9px] mt-[13px]">
                <span className="text-[11.5px] font-semibold text-[#b8a8ff] bg-glance-purple-tag border border-glance-purple-tag-border px-[9px] py-[3px] rounded-[7px]"
                >
                  {preview.category}
                </span>
                <span className="text-xs text-glance-muted">just now</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
