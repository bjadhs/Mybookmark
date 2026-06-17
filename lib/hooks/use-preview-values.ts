import { useMemo } from "react";
import { deriveDomain } from "@/lib/styles";

export function usePreviewValues(
  title: string,
  url: string,
  desc: string,
  category: string
) {
  return useMemo(() => {
    return {
      domain: deriveDomain(url) || "yoursite.com",
      title: title.trim() || "Untitled bookmark",
      description:
        desc.trim() || "Add a short description so you remember why you saved this.",
      glyph: (title.trim()[0] || "+").toUpperCase(),
      category,
    };
  }, [title, url, desc, category]);
}
