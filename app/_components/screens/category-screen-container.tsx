"use client";

import { CategoryScreen } from "@/app/_components/screens/category-screen";
import { useCategories } from "@/lib/hooks/use-categories";
import { useSettings } from "@/lib/hooks/use-settings";
import { pageById } from "@/lib/settings";

/**
 * Client container for the Categories page: wires the categories hook (and the
 * admin-editable page label) into the presentational CategoryScreen. The route
 * itself (app/category/page.tsx) is a server component that gates access first.
 */
export function CategoryScreenContainer() {
  const {
    categories,
    loading,
    error,
    addCategory,
    updateCategory,
    deleteCategory,
  } = useCategories();
  const { settings } = useSettings();
  const label = pageById(settings, "category")?.label ?? "Categories";

  return (
    <CategoryScreen
      label={label}
      categories={categories}
      loading={loading}
      error={error}
      addCategory={addCategory}
      updateCategory={updateCategory}
      deleteCategory={deleteCategory}
    />
  );
}
