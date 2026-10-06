import type { Transaction } from "./extract.server";

export type GlobalApiResult = { status: "success" | "failed" | "not_configured"; httpStatus?: number; url?: string; response?: unknown; error?: string | undefined };

// Replace this module to change the Global Application API integration.
// Falls back to the built-in dummy endpoint when GLOBAL_API_URL is not set.
export async function sendToGlobalApi(
  t: Transaction,
  excel: { filename: string; base64: string },
  origin: string,
): Promise<GlobalApiResult> {
  const url = process.env["GLOBAL_API_URL"] || `${origin}/api/public/global-api-mock`;
  const key = process.env["GLOBAL_API_KEY"];
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(key ? { Authorization: `Bearer ${key}` } : {}) },
      body: JSON.stringify({ transaction: t, excel }),
      signal: AbortSignal.timeout(20000),
    });
    const text = await res.text();
    let body: unknown = text;
    try { body = JSON.parse(text); } catch { /* keep text */ }
    return { status: res.ok ? "success" : "failed", httpStatus: res.status, url, response: body, error: res.ok ? undefined : `Global API returned ${res.status}` };
  } catch (e) {
    return { status: "failed", url, error: e instanceof Error ? e.message : "Global API unreachable" };
  }
}
