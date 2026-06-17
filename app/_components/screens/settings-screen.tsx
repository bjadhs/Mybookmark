"use client";

import { useState } from "react";
import { PageSubtitle, PageTitle } from "@/app/_components/ui/typography";
import {
  CheckIcon,
  CloseIcon,
  PlusIcon,
  TrashIcon,
  PAGE_ICONS,
} from "@/app/_icons";
import { useRole } from "@/lib/hooks/use-role";
import { useSettings } from "@/lib/hooks/use-settings";
import { ACCENTS, ACCENT_KEYS, PAGE_ICON_KEYS, slugify } from "@/lib/settings";
import type {
  AccentKey,
  ManagedPage,
  PageIconKey,
  PageSection,
  SiteSettings,
} from "@/lib/types";

export function SettingsScreen() {
  const { isAdmin, loading: roleLoading } = useRole();
  const { settings, save } = useSettings();

  const [draft, setDraft] = useState<SiteSettings>(settings);
  const [syncedFrom, setSyncedFrom] = useState(settings);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Re-seed the draft when the source settings change identity (initial async
  // load, or a save). Done during render (React's recommended prop→state sync)
  // rather than in an effect, so there's no extra render pass.
  if (settings !== syncedFrom) {
    setSyncedFrom(settings);
    setDraft(settings);
  }

  const set = <K extends keyof SiteSettings>(key: K, v: SiteSettings[K]) =>
    setDraft((d) => ({ ...d, [key]: v }));

  const setPage = (id: string, patch: Partial<ManagedPage>) =>
    setDraft((d) => ({
      ...d,
      pages: d.pages.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    }));

  const removePage = (id: string) =>
    setDraft((d) => ({ ...d, pages: d.pages.filter((p) => p.id !== id) }));

  const addPage = () =>
    setDraft((d) => {
      const id = uniquePageId(d.pages.map((p) => p.id));
      const page: ManagedPage = {
        id,
        builtin: false,
        label: "New page",
        icon: "globe",
        locked: true,
        lockedIcon: "lock",
        lockedTitle: "Members only.",
        lockedDesc: "Sign in to view this page.",
        perks: [],
        sections: [],
      };
      return { ...d, pages: [...d.pages, page] };
    });

  const dirty = JSON.stringify(draft) !== JSON.stringify(settings);
  const readOnly = !isAdmin;

  const handleSave = async () => {
    if (!dirty || saving) return;
    setSaving(true);
    setErr(null);
    try {
      await save(draft);
      setSavedAt(Date.now());
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-[680px]">
      <div className="flex items-start justify-between gap-6 mb-7">
        <div>
          <PageTitle>Settings</PageTitle>
          <PageSubtitle>
            {readOnly
              ? "Appearance and content are managed by the admin."
              : "Tune the theme, labels, and the guest experience for everyone."}
          </PageSubtitle>
        </div>
        {!readOnly && (
          <button
            onClick={handleSave}
            disabled={!dirty || saving}
            className="flex items-center gap-2 px-4 py-2.5 rounded-[11px] bg-[var(--accent)] text-white text-sm font-semibold cursor-pointer shadow-[0_8px_22px_-6px_rgba(168,85,247,0.5)] transition-all duration-150 hover:brightness-[1.06] hover:-translate-y-px disabled:opacity-40 disabled:cursor-default disabled:shadow-none disabled:translate-y-0 shrink-0"
          >
            <CheckIcon className="w-4 h-4" />
            {saving ? "Saving…" : "Save changes"}
          </button>
        )}
      </div>

      {readOnly && !roleLoading && (
        <div className="mb-6 rounded-[12px] border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-[13px] text-glance-muted">
          You&apos;re viewing these settings — only an admin can change them.
        </div>
      )}

      {err && (
        <div className="mb-6 rounded-[12px] border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {err}
        </div>
      )}
      {savedAt && !dirty && !err && (
        <div className="mb-6 rounded-[12px] border border-glance-online/30 bg-glance-online/10 px-4 py-3 text-sm text-glance-online">
          Saved — changes are live for everyone.
        </div>
      )}

      {/* Appearance --------------------------------------------------------- */}
      <Section
        title="Appearance"
        desc="The accent color used across buttons, highlights, and active items."
      >
        <div className="flex flex-wrap gap-2.5">
          {ACCENT_KEYS.map((key) => (
            <AccentSwatch
              key={key}
              accent={key}
              selected={draft.accent === key}
              disabled={readOnly}
              onSelect={() => set("accent", key)}
            />
          ))}
        </div>
      </Section>

      {/* Server ------------------------------------------------------------- */}
      <Section
        title="Server"
        desc="The name of the box shown on the Server page."
      >
        <FieldText
          label="Server name"
          value={draft.serverName}
          disabled={readOnly}
          placeholder="Glance Production"
          onChange={(v) => set("serverName", v)}
        />
      </Section>

      {/* Members-only nav --------------------------------------------------- */}
      <Section
        title="Members-only nav"
        desc="How signed-out visitors see pages that require an account."
      >
        <Toggle
          label="Show lock icon on members-only nav"
          checked={draft.showLockIcon}
          disabled={readOnly}
          onChange={(v) => set("showLockIcon", v)}
        />
      </Section>

      {/* Pages -------------------------------------------------------------- */}
      <Section
        title="Pages"
        desc="The sidebar pages. Rename them, pick an icon, choose whether each is members-only, and edit its locked-screen teaser. Add your own pages too."
      >
        <div className="flex flex-col gap-3">
          {draft.pages.map((page) => (
            <PageCard
              key={page.id}
              page={page}
              disabled={readOnly}
              onChange={(patch) => setPage(page.id, patch)}
              onRemove={() => removePage(page.id)}
            />
          ))}
        </div>
        {!readOnly && (
          <button
            onClick={addPage}
            className="mt-3 flex items-center gap-2 px-3.5 py-2.5 rounded-[11px] border border-dashed border-white/15 text-[13px] font-semibold text-glance-muted hover:text-glance-primary hover:border-[var(--accent)]/45 hover:bg-[var(--accent)]/[0.05] transition-colors"
          >
            <PlusIcon className="w-4 h-4" />
            Add page
          </button>
        )}
      </Section>
    </div>
  );
}

function PageCard({
  page,
  disabled,
  onChange,
  onRemove,
}: {
  page: ManagedPage;
  disabled: boolean;
  onChange: (patch: Partial<ManagedPage>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-[14px] border border-glance-border bg-white/[0.02] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <FieldText
            label={page.builtin ? `Page — ${page.id} (built-in)` : "Page label"}
            value={page.label}
            disabled={disabled}
            placeholder="Page name"
            onChange={(v) => onChange({ label: v })}
          />
        </div>
        {!disabled && !page.builtin && (
          <button
            onClick={onRemove}
            title="Delete page"
            className="mt-6 p-2 rounded-[10px] text-glance-faint hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="mt-3">
        <IconPicker
          label="Sidebar icon"
          value={page.icon}
          disabled={disabled}
          onSelect={(icon) => onChange({ icon })}
        />
      </div>

      <div className="mt-3">
        <Toggle
          label="Members-only (locked)"
          checked={page.locked}
          disabled={disabled}
          onChange={(v) => onChange({ locked: v })}
        />
      </div>

      <div className="mt-4 rounded-[12px] border border-white/[0.06] bg-white/[0.015] p-3.5">
        <div className="text-[11px] font-bold tracking-[0.5px] text-glance-faint uppercase mb-3">
          Locked screen
        </div>
        <div className="flex flex-col gap-4">
          <IconPicker
            label="Hero icon"
            value={page.lockedIcon}
            disabled={disabled}
            onSelect={(lockedIcon) => onChange({ lockedIcon })}
          />
          <FieldText
            label="Title"
            value={page.lockedTitle}
            disabled={disabled}
            placeholder="Members only."
            onChange={(v) => onChange({ lockedTitle: v })}
          />
          <FieldTextarea
            label="Description"
            value={page.lockedDesc}
            disabled={disabled}
            onChange={(v) => onChange({ lockedDesc: v })}
          />
          <PerksEditor
            perks={page.perks}
            disabled={disabled}
            onChange={(perks) => onChange({ perks })}
          />
        </div>
      </div>

      {!page.builtin && (
        <div className="mt-4">
          <SectionsEditor
            sections={page.sections}
            disabled={disabled}
            onChange={(sections) => onChange({ sections })}
          />
        </div>
      )}
    </div>
  );
}

function IconPicker({
  label,
  value,
  disabled,
  onSelect,
}: {
  label: string;
  value: PageIconKey;
  disabled: boolean;
  onSelect: (key: PageIconKey) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] font-bold tracking-[0.5px] text-glance-faint uppercase">
        {label}
      </span>
      <div className="flex flex-wrap gap-2">
        {PAGE_ICON_KEYS.map((key) => {
          const Icon = PAGE_ICONS[key];
          const selected = value === key;
          return (
            <button
              key={key}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(key)}
              title={key}
              className={`flex items-center justify-center w-9 h-9 rounded-[10px] border transition-all ${
                selected
                  ? "border-[var(--accent)]/60 bg-[var(--accent)]/15 text-[var(--accent)]"
                  : "border-white/[0.08] bg-white/[0.02] text-glance-muted hover:bg-white/[0.05]"
              } ${disabled ? "cursor-default opacity-70" : "cursor-pointer"}`}
            >
              <Icon className="w-[18px] h-[18px]" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SectionsEditor({
  sections,
  disabled,
  onChange,
}: {
  sections: PageSection[];
  disabled: boolean;
  onChange: (sections: PageSection[]) => void;
}) {
  const update = (i: number, patch: Partial<PageSection>) =>
    onChange(sections.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  const remove = (i: number) => onChange(sections.filter((_, idx) => idx !== i));
  const add = () => onChange([...sections, { heading: "", text: "" }]);

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] font-bold tracking-[0.5px] text-glance-faint uppercase">
        Page content
      </span>
      <div className="flex flex-col gap-3">
        {sections.map((section, i) => (
          <div
            key={i}
            className="rounded-[12px] border border-white/[0.06] bg-white/[0.015] p-3"
          >
            <div className="flex items-center gap-2">
              <input
                value={section.heading}
                disabled={disabled}
                onChange={(e) => update(i, { heading: e.target.value })}
                placeholder="Section heading"
                className={inputClass}
              />
              {!disabled && (
                <button
                  onClick={() => remove(i)}
                  title="Remove section"
                  className="p-2 rounded-[10px] text-glance-faint hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
                >
                  <CloseIcon className="w-4 h-4" />
                </button>
              )}
            </div>
            <textarea
              value={section.text}
              disabled={disabled}
              rows={3}
              onChange={(e) => update(i, { text: e.target.value })}
              placeholder="Section text…"
              className={`${inputClass} mt-2 resize-y leading-[1.5]`}
            />
          </div>
        ))}
      </div>
      {!disabled && sections.length < 12 && (
        <button
          onClick={add}
          className="self-start mt-1 flex items-center gap-1.5 px-3 py-2 rounded-[10px] text-[12.5px] font-semibold text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-colors"
        >
          <PlusIcon className="w-3.5 h-3.5" />
          Add section
        </button>
      )}
    </div>
  );
}

/** Pick an unused, url-safe id for a freshly added custom page. */
function uniquePageId(existing: string[]): string {
  const taken = new Set(existing);
  let n = existing.length + 1;
  let id = slugify(`page-${n}`);
  while (taken.has(id)) {
    n += 1;
    id = slugify(`page-${n}`);
  }
  return id;
}

function AccentSwatch({
  accent,
  selected,
  disabled,
  onSelect,
}: {
  accent: AccentKey;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  const { label, hex } = ACCENTS[accent];
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      title={label}
      className={`flex items-center gap-2 pl-2 pr-3 py-2 rounded-[11px] border text-[13px] font-semibold transition-all ${
        selected
          ? "border-white/25 bg-white/[0.06] text-glance-primary"
          : "border-white/[0.08] bg-white/[0.02] text-glance-muted hover:bg-white/[0.04]"
      } ${disabled ? "cursor-default opacity-70" : "cursor-pointer"}`}
    >
      <span
        className="flex items-center justify-center w-6 h-6 rounded-lg text-white"
        style={{ background: hex }}
      >
        {selected && <CheckIcon className="w-3.5 h-3.5" />}
      </span>
      {label}
    </button>
  );
}

function PerksEditor({
  perks,
  disabled,
  onChange,
}: {
  perks: string[];
  disabled: boolean;
  onChange: (perks: string[]) => void;
}) {
  const update = (i: number, v: string) =>
    onChange(perks.map((p, idx) => (idx === i ? v : p)));
  const remove = (i: number) => onChange(perks.filter((_, idx) => idx !== i));
  const add = () => onChange([...perks, ""]);

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] font-bold tracking-[0.5px] text-glance-faint uppercase">
        Locked page — “you can” list
      </span>
      <div className="flex flex-col gap-2">
        {perks.map((perk, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              value={perk}
              disabled={disabled}
              onChange={(e) => update(i, e.target.value)}
              placeholder="Something members can do…"
              className={inputClass}
            />
            {!disabled && (
              <button
                onClick={() => remove(i)}
                title="Remove"
                className="p-2 rounded-[10px] text-glance-faint hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>
      {!disabled && perks.length < 8 && (
        <button
          onClick={add}
          className="self-start mt-1 flex items-center gap-1.5 px-3 py-2 rounded-[10px] text-[12.5px] font-semibold text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-colors"
        >
          <PlusIcon className="w-3.5 h-3.5" />
          Add item
        </button>
      )}
    </div>
  );
}

function Section({
  title,
  desc,
  children,
}: {
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-4 rounded-[16px] border border-glance-border bg-glance-surface p-5">
      <h2 className="font-[family-name:var(--font-space-grotesk)] text-[16px] font-bold text-glance-primary">
        {title}
      </h2>
      <p className="text-[13px] text-glance-muted mb-4 mt-0.5">{desc}</p>
      {children}
    </section>
  );
}

function FieldText({
  label,
  value,
  placeholder,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  disabled: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-bold tracking-[0.5px] text-glance-faint uppercase">
        {label}
      </span>
      <input
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      />
    </label>
  );
}

function FieldTextarea({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  disabled: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-bold tracking-[0.5px] text-glance-faint uppercase">
        {label}
      </span>
      <textarea
        value={value}
        disabled={disabled}
        rows={3}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputClass} resize-y leading-[1.5]`}
      />
    </label>
  );
}

function Toggle({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`flex items-center justify-between w-full gap-4 ${
        disabled ? "cursor-default" : "cursor-pointer"
      }`}
    >
      <span className="text-[13.5px] font-semibold text-glance-primary">
        {label}
      </span>
      <span
        className={`relative w-[42px] h-[24px] rounded-full transition-colors shrink-0 ${
          checked ? "bg-[var(--accent)]" : "bg-white/[0.12]"
        }`}
      >
        <span
          className={`absolute top-[3px] w-[18px] h-[18px] rounded-full bg-white transition-all ${
            checked ? "left-[21px]" : "left-[3px]"
          }`}
        />
      </span>
    </button>
  );
}

const inputClass =
  "w-full bg-white/5 border border-white/10 rounded-[10px] px-3 py-2.5 text-sm text-glance-primary outline-none focus:border-[var(--accent)] placeholder:text-glance-faint disabled:opacity-60 disabled:cursor-default";
