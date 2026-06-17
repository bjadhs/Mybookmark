import { useState } from "react";
import { SortKey } from "@/lib/types";

export function useLibraryState() {
  const [search, setSearch] = useState("");
  const [tag, setTag] = useState("All");
  const [sort, setSort] = useState<SortKey>("recent");

  return {
    search,
    setSearch,
    tag,
    setTag,
    sort,
    setSort,
    clearFilters: () => {
      setSearch("");
      setTag("All");
    },
  };
}

export function useAddFormState() {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [desc, setDesc] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  return {
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
    reset: () => {
      setTitle("");
      setUrl("");
      setDesc("");
      setCategoryId("");
      setPreviewImage(null);
    },
  };
}
