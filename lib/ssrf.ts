import { isIP } from "node:net";
import type { LookupAddress } from "node:dns";
import { lookup } from "node:dns/promises";

/**
 * SSRF guard for outbound fetches against user-supplied URLs.
 *
 * The preview endpoint fetches arbitrary URLs server-side, which lets an
 * attacker point us at internal infrastructure — cloud metadata
 * (`169.254.169.254`), `localhost`, or RFC-1918 hosts — and read the response
 * via the returned metadata/errors. This module:
 *   - restricts the scheme to http/https,
 *   - resolves the hostname via DNS and rejects any address in a private,
 *     loopback, link-local, or otherwise reserved range,
 *   - follows redirects manually, re-validating every hop's target host.
 *
 * Residual risk: there is a small TOCTOU window between DNS validation and the
 * actual connection (classic DNS rebinding). Fully closing it requires pinning
 * the resolved IP at connect time; the checks here block all the
 * straightforward attacks (IP literals, localhost, redirects to internal hosts).
 */

export class SsrfError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SsrfError";
  }
}

const PRIVATE_ADDRESS = "blocked: target resolves to a private or reserved address";

function ipv4ToLong(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let long = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const n = Number(part);
    if (n > 255) return null;
    long = long * 256 + n;
  }
  return long >>> 0;
}

function isPrivateIpv4(ip: string): boolean {
  const long = ipv4ToLong(ip);
  if (long === null) return true; // unparseable → treat as unsafe
  const inRange = (base: string, bits: number): boolean => {
    const baseLong = ipv4ToLong(base);
    if (baseLong === null) return false;
    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
    return (long & mask) === (baseLong & mask);
  };
  return (
    inRange("0.0.0.0", 8) || // "this" network
    inRange("10.0.0.0", 8) || // private
    inRange("100.64.0.0", 10) || // carrier-grade NAT
    inRange("127.0.0.0", 8) || // loopback
    inRange("169.254.0.0", 16) || // link-local (incl. cloud metadata)
    inRange("172.16.0.0", 12) || // private
    inRange("192.0.0.0", 24) || // IETF protocol assignments
    inRange("192.168.0.0", 16) || // private
    inRange("198.18.0.0", 15) || // benchmarking
    inRange("224.0.0.0", 4) || // multicast
    inRange("240.0.0.0", 4) // reserved / broadcast
  );
}

function isPrivateIpv6(ip: string): boolean {
  let addr = ip.toLowerCase();
  const zone = addr.indexOf("%");
  if (zone !== -1) addr = addr.slice(0, zone);

  // IPv4-mapped / -embedded addresses (e.g. ::ffff:169.254.169.254)
  const embedded = addr.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (embedded) return isPrivateIpv4(embedded[1]);

  if (addr === "::" || addr === "::1") return true; // unspecified / loopback
  if (addr.startsWith("fc") || addr.startsWith("fd")) return true; // unique local fc00::/7
  if (/^fe[89ab]/.test(addr)) return true; // link-local fe80::/10
  if (addr.startsWith("ff")) return true; // multicast
  return false;
}

/** Throws {@link SsrfError} if `url` is not a safe, public http(s) target. */
export async function assertPublicUrl(url: URL): Promise<void> {
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new SsrfError("blocked: only http(s) URLs are allowed");
  }

  let hostname = url.hostname;
  if (hostname.startsWith("[") && hostname.endsWith("]")) {
    hostname = hostname.slice(1, -1); // IPv6 literal
  }

  const literal = isIP(hostname);
  if (literal === 4) {
    if (isPrivateIpv4(hostname)) throw new SsrfError(PRIVATE_ADDRESS);
    return;
  }
  if (literal === 6) {
    if (isPrivateIpv6(hostname)) throw new SsrfError(PRIVATE_ADDRESS);
    return;
  }

  const lower = hostname.toLowerCase();
  if (
    lower === "localhost" ||
    lower.endsWith(".localhost") ||
    lower.endsWith(".local") ||
    lower.endsWith(".internal")
  ) {
    throw new SsrfError(PRIVATE_ADDRESS);
  }

  let records: LookupAddress[];
  try {
    records = await lookup(hostname, { all: true });
  } catch {
    throw new SsrfError("blocked: could not resolve host");
  }
  if (records.length === 0) throw new SsrfError("blocked: could not resolve host");

  for (const { address, family } of records) {
    const isPrivate = family === 6 ? isPrivateIpv6(address) : isPrivateIpv4(address);
    if (isPrivate) throw new SsrfError(PRIVATE_ADDRESS);
  }
}

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

/**
 * Like `fetch`, but validates the target host (and every redirect hop) against
 * the SSRF allow rules. Redirects are followed manually with a hard cap so an
 * attacker can't bounce us from a public host to an internal one.
 */
export async function safeFetch(
  input: string,
  init: RequestInit & { maxRedirects?: number } = {}
): Promise<Response> {
  const { maxRedirects = 5, ...rest } = init;
  let current: URL;
  try {
    current = new URL(input);
  } catch {
    throw new SsrfError("blocked: invalid URL");
  }

  for (let hop = 0; hop <= maxRedirects; hop++) {
    await assertPublicUrl(current);
    const res = await fetch(current.href, { ...rest, redirect: "manual" });

    if (!REDIRECT_STATUSES.has(res.status)) return res;

    const location = res.headers.get("location");
    if (!location) return res; // redirect without a target — let caller handle it

    try {
      current = new URL(location, current);
    } catch {
      throw new SsrfError("blocked: invalid redirect target");
    }
  }

  throw new SsrfError("blocked: too many redirects");
}
