"use client";

import { useState, useEffect, useRef } from "react";
import { PageTitle, PageSubtitle } from "@/app/_components/ui/typography";
import { PlusIcon, CheckIcon } from "@/app/_icons";
import { Category } from "@/lib/types";

interface CategoryScreenProps {
  /** Admin-editable page title (defaults to "Categories"). */
  label?: string;
  categories: Category[];
  loading: boolean;
  error: string | null;
  addCategory: (name: string) => Promise<Category>;
  updateCategory: (id: string, name: string) => Promise<Category>;
  deleteCategory: (id: string) => Promise<void>;
}

export function CategoryScreen({
  label = "Categories",
  categories,
  loading,
  error,
  addCategory,
  updateCategory,
  deleteCategory,
}: CategoryScreenProps) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editingId) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (!gridRef.current) return;
      const target = e.target as HTMLElement;
      if (!target.closest(`[data-category-id="${editingId}"]`)) {
        setEditingId(null);
        setEditName("");
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [editingId]);

  const handleAdd = async () => {
    if (!newName.trim() || saving) return;
    setSaving(true);
    try {
      await addCategory(newName.trim());
      setNewName("");
      setAdding(false);
    } catch {
      // error handled by hook
    } finally {
      setSaving(false);
    }
  };

  const handleRename = async (id: string) => {
    if (!editName.trim() || saving) return;
    setSaving(true);
    try {
      await updateCategory(id, editName.trim());
      setEditingId(null);
      setEditName("");
    } catch {
      // error handled by hook
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (
      !window.confirm(
        `Delete "${name}"? Bookmarks in this category will become uncategorized.`
      )
    ) {
      return;
    }
    try {
      await deleteCategory(id);
    } catch {
      // error handled by hook
    }
  };

  const startEdit = (id: string, name: string) => {
    setEditingId(id);
    setEditName(name);
  };

  return (
    <div>
      <div className="flex items-start justify-between gap-6 mb-7">
        <div>
          <PageTitle>{label}</PageTitle>
          <PageSubtitle>
            Organize your bookmarks with categories.
          </PageSubtitle>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-[11px] bg-[var(--accent)] text-white text-sm font-semibold cursor-pointer shadow-[0_8px_22px_-6px_rgba(168,85,247,0.5)] transition-all duration-150 hover:brightness-[1.06] hover:-translate-y-px shrink-0"
        >
          <PlusIcon className="w-4 h-4" />
          Add category
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center h-40 text-glance-muted">
          Loading categories…
        </div>
      )}

      {error && (
        <div className="flex items-center justify-center h-40 text-red-400">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div ref={gridRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {adding && (
            <div className="flex items-center gap-2.5 px-3.5 py-3.5 rounded-[14px] border border-dashed border-white/10 bg-white/[0.02]">
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAdd();
                  if (e.key === "Escape") {
                    setAdding(false);
                    setNewName("");
                  }
                }}
                placeholder="Category name"
                className="flex-1 bg-white/5 border border-white/10 rounded-[10px] px-4 py-2.5 text-sm text-glance-primary outline-none focus:border-[var(--accent)] placeholder:text-glance-faint"
              />
              <button
                onClick={handleAdd}
                disabled={saving || !newName.trim()}
                className="p-2.5 rounded-[10px] bg-[var(--accent)]/20 text-[var(--accent)] hover:bg-[var(--accent)]/30 transition-colors disabled:opacity-40"
              >
                <CheckIcon className="w-4 h-4" />
              </button>
            </div>
          )}

          {categories.length === 0 && !adding && (
            <div className="flex flex-col items-center justify-center py-20 px-5 text-center">
              <div className="text-[17px] font-bold text-[#d4d4dd] mb-1.5">
                No categories yet
              </div>
              <div className="text-sm text-glance-muted">
                Create your first category to organize bookmarks.
              </div>
            </div>
          )}

          {categories.map((cat) => (
            <div
              key={cat.id}
              data-category-id={cat.id}
              className="flex items-center gap-3 px-3.5 py-3.5 rounded-[14px] border border-white/[0.06] bg-[#13131b] transition-colors hover:bg-white/[0.03]"
            >
              {editingId === cat.id ? (
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full bg-[var(--accent)]/15 text-[var(--accent)] text-[11px] font-bold tabular-nums">
                    {cat.count}
                  </span>
                  <input
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleRename(cat.id);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    className="min-w-0 flex-1 bg-white/5 border border-white/10 rounded-[10px] px-3 py-1.5 text-sm text-glance-primary outline-none focus:border-[var(--accent)]"
                  />
                  <button
                    onClick={() => handleRename(cat.id)}
                    disabled={saving || !editName.trim()}
                    className="p-1.5 rounded-lg text-[var(--accent)] hover:bg-[var(--accent)]/20 transition-colors disabled:opacity-40"
                  >
                    <CheckIcon className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full bg-[var(--accent)]/15 text-[var(--accent)] text-[11px] font-bold tabular-nums">
                      {cat.count}
                    </span>
                    <div
                      onClick={() => startEdit(cat.id, cat.name)}
                      className="text-[14.5px] font-semibold text-glance-primary truncate cursor-pointer hover:text-white transition-colors"
                    >
                      {cat.name}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(cat.id, cat.name)}
                    className="p-1 rounded text-[11px] text-glance-faint hover:text-red-400 hover:bg-white/[0.05] transition-colors leading-none"
                    title="Delete"
                  >
                    ✕
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
