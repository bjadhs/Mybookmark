import { NextRequest, NextResponse } from "next/server";
import { safeFetch, SsrfError } from "@/lib/ssrf";

export interface PreviewData {
  url: string;
  domain: string;
  image: string | null;
  title: string | null;
  description: string | null;
  favicon: string | null;
  themeColor: string | null;
  /** True when the site allows being embedded in our <iframe> (no blocking X-Frame-Options / CSP). */
  frameable: boolean;
  error?: string;
}

/**
 * Decide whether a site can be embedded in an iframe based on its response
 * headers. We err on the side of "not frameable" whenever a policy restricts
 * framing to specific origins, since our app origin won't be on those lists.
 */
function isFrameable(headers: Headers): boolean {
  const xfo = headers.get("x-frame-options");
  if (xfo) {
    const v = xfo.toLowerCase();
    if (v.includes("deny") || v.includes("sameorigin") || v.includes("allow-from")) {
      return false;
    }
  }

  const csp = headers.get("content-security-policy");
  if (csp) {
    const m = csp.match(/frame-ancestors([^;]*)/i);
    if (m) {
      const value = m[1].trim().toLowerCase();
      if (value.includes("'none'")) return false;
      // Only treat as frameable if it explicitly allows everything.
      if (!value.includes("*")) return false;
    }
  }

  return true;
}

const FETCH_TIMEOUT_MS = 8000;
const MAX_HTML_BYTES = 512 * 1024; // only the <head> matters
const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0 Safari/537.36";

function normalizeUrl(raw: string): URL | null {
  let value = raw.trim();
  if (!value) return null;
  if (!/^https?:\/\//i.test(value)) value = `https://${value}`;
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url;
  } catch {
    return null;
  }
}

/** Pull every <meta> tag's attributes into a property/name -> content lookup. */
function buildMetaMap(head: string): Map<string, string> {
  const map = new Map<string, string>();
  const metaRe = /<meta\b[^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = metaRe.exec(head))) {
    const tag = m[0];
    const key =
      attr(tag, "property") ?? attr(tag, "name") ?? attr(tag, "itemprop");
    const content = attr(tag, "content");
    if (key && content && !map.has(key.toLowerCase())) {
      map.set(key.toLowerCase(), content);
    }
  }
  return map;
}

function attr(tag: string, name: string): string | null {
  const re = new RegExp(`${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i");
  const m = re.exec(tag);
  if (!m) return null;
  return decodeEntities(m[2] ?? m[3] ?? m[4] ?? "");
}

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&apos;/g, "'");
}

function resolve(value: string | null | undefined, base: string): string | null {
  if (!value) return null;
  try {
    return new URL(value, base).href;
  } catch {
    return null;
  }
}

/** Find the best favicon by scanning <link rel="...icon..."> tags. */
function findFavicon(head: string, base: string): string | null {
  const linkRe = /<link\b[^>]*>/gi;
  let best: string | null = null;
  let bestScore = -1;
  let m: RegExpExecArray | null;
  while ((m = linkRe.exec(head))) {
    const tag = m[0];
    const rel = (attr(tag, "rel") ?? "").toLowerCase();
    if (!rel.includes("icon")) continue;
    const href = attr(tag, "href");
    if (!href) continue;
    // Prefer apple-touch-icon (larger) > sized icon > plain icon
    const sizes = attr(tag, "sizes") ?? "";
    let score = 1;
    if (rel.includes("apple-touch-icon")) score = 4;
    else if (/\d{2,}/.test(sizes)) score = 3;
    else if (rel.includes("shortcut")) score = 2;
    if (score > bestScore) {
      bestScore = score;
      best = resolve(href, base);
    }
  }
  return best ?? resolve("/favicon.ico", base);
}

async function readCappedText(res: Response): Promise<string> {
  const body = res.body;
  if (!body) return await res.text();
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let html = "";
  let received = 0;
  while (received < MAX_HTML_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    html += decoder.decode(value, { stream: true });
    if (/<\/head>/i.test(html)) break; // we have everything we need
  }
  reader.cancel().catch(() => {});
  return html;
}

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("url");
  const target = raw ? normalizeUrl(raw) : null;

  if (!target) {
    return NextResponse.json(
      { error: "A valid http(s) URL is required" },
      { status: 400 }
    );
  }

  const empty: PreviewData = {
    url: target.href,
    domain: target.hostname.replace(/^www\./, ""),
    image: null,
    title: null,
    description: null,
    favicon: resolve("/favicon.ico", target.origin),
    themeColor: null,
    frameable: false,
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await safeFetch(target.href, {
      headers: {
        "User-Agent": BROWSER_UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: controller.signal,
      next: { revalidate: 60 * 60 * 6 },
    });

    const finalUrl = res.url || target.href;
    const contentType = res.headers.get("content-type") ?? "";
    const frameable = isFrameable(res.headers);

    // The link points straight at an image — use it as the preview.
    if (contentType.startsWith("image/")) {
      return NextResponse.json({ ...empty, url: finalUrl, image: finalUrl });
    }

    if (!res.ok || !contentType.includes("html")) {
      return NextResponse.json(
        {
          ...empty,
          url: finalUrl,
          // We still got real response headers, so trust them for framing.
          frameable,
          error: res.ok
            ? `Unsupported content type: ${contentType}`
            : `Site responded ${res.status}`,
        },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    const html = await readCappedText(res);
    const headMatch = html.match(/<head[\s\S]*?<\/head>/i);
    const head = headMatch ? headMatch[0] : html;

    const meta = buildMetaMap(head);
    const pick = (...keys: string[]) => {
      for (const k of keys) {
        const v = meta.get(k);
        if (v) return v;
      }
      return null;
    };

    const titleTag = head.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title =
      pick("og:title", "twitter:title") ||
      (titleTag ? decodeEntities(titleTag[1].trim()) : null);

    const description = pick(
      "og:description",
      "twitter:description",
      "description"
    );

    const rawImage = pick(
      "og:image:secure_url",
      "og:image:url",
      "og:image",
      "twitter:image",
      "twitter:image:src",
      "image"
    );

    const data: PreviewData = {
      url: finalUrl,
      domain: new URL(finalUrl).hostname.replace(/^www\./, ""),
      image: resolve(rawImage, finalUrl),
      title,
      description,
      favicon: findFavicon(head, finalUrl),
      themeColor: pick("theme-color"),
      frameable,
    };

    // No browser cache: the preview shape evolves and we want clients to always
    // pick up the latest logic. The upstream site fetch is still deduped via
    // `next: { revalidate }` above, so this stays cheap.
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    // Refuse to reach internal/reserved hosts — don't fall back to a probe that
    // would still hit the blocked target.
    if (err instanceof SsrfError) {
      return NextResponse.json(
        { error: "This URL can't be previewed" },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const aborted = err instanceof Error && err.name === "AbortError";

    // The full GET failed (timeout, redirect loop, bot/UA block, …). Some of
    // those sites are still perfectly embeddable in a real browser, while others
    // genuinely block framing. Instead of guessing, do a cheap HEAD to read the
    // actual framing headers and decide honestly whether a live iframe will work.
    try {
      const headController = new AbortController();
      const headTimer = setTimeout(() => headController.abort(), 5000);
      const head = await safeFetch(target.href, {
        method: "HEAD",
        headers: { "User-Agent": BROWSER_UA },
        signal: headController.signal,
      });
      clearTimeout(headTimer);

      return NextResponse.json(
        {
          ...empty,
          url: head.url || target.href,
          frameable: isFrameable(head.headers),
          error: "Limited preview — couldn't read page metadata",
        },
        { headers: { "Cache-Control": "no-store" } }
      );
    } catch {
      return NextResponse.json(
        {
          ...empty,
          frameable: false,
          error: aborted ? "Timed out reaching site" : "Could not reach site",
        },
        { headers: { "Cache-Control": "no-store" } }
      );
    }
  } finally {
    clearTimeout(timeout);
  }
}
