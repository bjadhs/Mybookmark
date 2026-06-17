"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AddScreen } from "@/app/_components/screens/add-screen";
import { useAddFormState } from "@/lib/hooks/use-app-state";
import { useBookmarks } from "@/lib/hooks/use-bookmarks";
import { useRole } from "@/lib/hooks/use-role";

export default function AddPage() {
  const router = useRouter();
  const { addBookmark } = useBookmarks();
  const { isAdmin, loading: roleLoading } = useRole();
  const addForm = useAddFormState();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Adding bookmarks is admin-only. Non-admins (and guests) are bounced home;
  // the API also enforces this, so this is purely a UX guard.
  useEffect(() => {
    if (!roleLoading && !isAdmin) router.replace("/");
  }, [roleLoading, isAdmin, router]);

  if (roleLoading || !isAdmin) {
    return (
      <div className="flex items-center justify-center h-64 text-glance-muted">
        {roleLoading ? "Loading…" : "Redirecting…"}
      </div>
    );
  }

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      await addBookmark({
        title: addForm.title,
        url: addForm.url,
        desc: addForm.desc,
        categoryId: addForm.categoryId,
        previewImage: addForm.previewImage,
      });
      addForm.reset();
      router.push("/");
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Failed to save bookmark"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <AddScreen
      title={addForm.title}
      setTitle={addForm.setTitle}
      url={addForm.url}
      setUrl={addForm.setUrl}
      desc={addForm.desc}
      setDesc={addForm.setDesc}
      categoryId={addForm.categoryId}
      setCategoryId={addForm.setCategoryId}
      previewImage={addForm.previewImage}
      setPreviewImage={addForm.setPreviewImage}
      saving={saving}
      saveError={saveError}
      onBack={() => router.push("/")}
      onSave={handleSave}
    />
  );
}
