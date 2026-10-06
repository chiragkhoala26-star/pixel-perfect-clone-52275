import type { Transaction } from "./extract.server";

export type GlobalApiResult = { status: "success" | "failed" | "not_configured"; httpStatus?: number; response?: unknown; error?: string };

// Replace this module to change the Global Application API integration.
export async function sendToGlobalApi(t: Transaction): Promise<GlobalApiResult> {
  const url = process.env["GLOBAL_API_URL"];
  const key = process.env["GLOBAL_API_KEY"];
  if (!url) return { status: "not_configured", error: "GLOBAL_API_URL is not set" };
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(key ? { Authorization: `Bearer ${key}` } : {}) },
      body: JSON.stringify(t),
      signal: AbortSignal.timeout(20000),
    });
    const text = await res.text();
    let body: unknown = text;
    try { body = JSON.parse(text); } catch { /* keep text */ }
    return { status: res.ok ? "success" : "failed", httpStatus: res.status, response: body, error: res.ok ? undefined : `Global API returned ${res.status}` };
  } catch (e) {
    return { status: "failed", error: e instanceof Error ? e.message : "Global API unreachable" };
  }
}
