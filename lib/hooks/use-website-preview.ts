"use client";

import { useEffect, useState } from "react";

export interface WebsitePreview {
  image: string | null;
  title: string | null;
  description: string | null;
  favicon: string | null;
  themeColor: string | null;
  frameable: boolean;
  loading: boolean;
  error: string | null;
}

const INITIAL: WebsitePreview = {
  image: null,
  title: null,
  description: null,
  favicon: null,
  themeColor: null,
  frameable: false,
  loading: true,
  error: null,
};

export function useWebsitePreview(url: string): WebsitePreview {
  const [state, setState] = useState<WebsitePreview>(INITIAL);

  useEffect(() => {
    if (!url) {
      setState({ ...INITIAL, loading: false });
      return;
    }

    let cancelled = false;
    setState({ ...INITIAL, loading: true });

    fetch(`/api/preview?url=${encodeURIComponent(url)}`, { cache: "no-store" })
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (cancelled) return;

        if (!res.ok || !data) {
          setState({
            ...INITIAL,
            loading: false,
            error: (data && data.error) || `Preview unavailable (${res.status})`,
          });
          return;
        }

        setState({
          image: data.image ?? null,
          title: data.title ?? null,
          description: data.description ?? null,
          favicon: data.favicon ?? null,
          themeColor: data.themeColor ?? null,
          frameable: Boolean(data.frameable),
          loading: false,
          error: data.error ?? null,
        });
      })
      .catch(() => {
        if (cancelled) return;
        setState({ ...INITIAL, loading: false, error: "Failed to load preview" });
      });

    return () => {
      cancelled = true;
    };
  }, [url]);

  return state;
}
