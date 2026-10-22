import { createSign } from "crypto";
import fs from "fs";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const WEBMASTERS_SCOPE = "https://www.googleapis.com/auth/webmasters";

/** URL-prefix property. Override with GSC_SITE_URL, including a domain property (`sc-domain:vizonix.com`). */
export const DEFAULT_GSC_SITE_URL = "https://www.vizonix.com/";

/** Feed passed to webmasters.sitemaps.submit. Override with GSC_SITEMAP_URL. */
export const DEFAULT_GSC_SITEMAP_URL = "https://www.vizonix.com/sitemap.xml";

export type SearchConsoleResult = {
  ok: boolean;
  skipped?: string;
  error?: string;
};

type ServiceAccount = {
  client_email: string;
  private_key: string;
};

export function searchConsoleSiteUrl(): string {
  return process.env.GSC_SITE_URL?.trim() || DEFAULT_GSC_SITE_URL;
}

export function searchConsoleSitemapUrl(): string {
  return process.env.GSC_SITEMAP_URL?.trim() || DEFAULT_GSC_SITEMAP_URL;
}

/** PUT URL for webmasters.sitemaps.submit. Both path segments are URL-encoded. */
export function webmastersSitemapSubmitUrl(siteUrl: string, feedUrl: string): string {
  return `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/sitemaps/${encodeURIComponent(feedUrl)}`;
}

function loadServiceAccount(raw: string): ServiceAccount | { error: string } {
  let text = raw.trim();
  if (!text) return { error: "GSC_SERVICE_ACCOUNT_JSON is empty" };
  if (!text.startsWith("{")) {
    try {
      if (!fs.existsSync(text)) return { error: "GSC_SERVICE_ACCOUNT_JSON is not JSON or a readable file path" };
      text = fs.readFileSync(text, "utf8");
    } catch {
      return { error: "GSC_SERVICE_ACCOUNT_JSON file could not be read" };
    }
  }
  try {
    let parsed: unknown = JSON.parse(text);
    if (typeof parsed === "string") parsed = JSON.parse(parsed);
    if (!parsed || typeof parsed !== "object") return { error: "GSC_SERVICE_ACCOUNT_JSON is not an object" };
    const record = parsed as { client_email?: unknown; private_key?: unknown };
    if (typeof record.client_email !== "string" || !record.client_email.trim()) {
      return { error: "GSC_SERVICE_ACCOUNT_JSON is missing client_email" };
    }
    if (typeof record.private_key !== "string" || !record.private_key.includes("PRIVATE KEY")) {
      return { error: "GSC_SERVICE_ACCOUNT_JSON is missing private_key" };
    }
    return { client_email: record.client_email.trim(), private_key: record.private_key };
  } catch {
    return { error: "GSC_SERVICE_ACCOUNT_JSON is not valid JSON" };
  }
}

function base64url(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function signServiceAccountJwt(account: ServiceAccount, issuedAt: number): string {
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64url(
    JSON.stringify({
      iss: account.client_email,
      scope: WEBMASTERS_SCOPE,
      aud: TOKEN_URL,
      iat: issuedAt,
      exp: issuedAt + 3600,
    }),
  );
  const unsigned = `${header}.${payload}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  return `${unsigned}.${signer.sign(account.private_key).toString("base64url")}`;
}

async function accessToken(account: ServiceAccount): Promise<string> {
  const assertion = signServiceAccountJwt(account, Math.floor(Date.now() / 1000));
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!response.ok) throw new Error(`Google token request failed (${response.status}).`);
  const body = (await response.json()) as { access_token?: unknown };
  if (typeof body.access_token !== "string" || !body.access_token) {
    throw new Error("Google token response did not include an access token.");
  }
  return body.access_token;
}

/**
 * Search Console sitemaps.submit for the live sitemap.
 * Google's anonymous sitemap ping endpoint is retired. This no-ops when the
 * service account is unset. It never throws.
 */
export async function submitSearchConsoleSitemap(): Promise<SearchConsoleResult> {
  const raw = process.env.GSC_SERVICE_ACCOUNT_JSON ?? "";
  if (!raw.trim()) return { ok: false, skipped: "GSC_SERVICE_ACCOUNT_JSON is not set" };
  const account = loadServiceAccount(raw);
  if ("error" in account) return { ok: false, error: account.error };
  const site = searchConsoleSiteUrl();
  const feed = searchConsoleSitemapUrl();
  try {
    const token = await accessToken(account);
    const response = await fetch(webmastersSitemapSubmitUrl(site, feed), {
      method: "PUT",
      headers: { authorization: `Bearer ${token}` },
    });
    if (!response.ok) return { ok: false, error: `Search Console responded ${response.status}` };
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Search Console submit failed";
    return { ok: false, error: message };
  }
}
