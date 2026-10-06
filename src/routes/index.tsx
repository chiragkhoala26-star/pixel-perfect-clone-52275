import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AI-Powered PDF Processing & Transaction Booking" },
      { name: "description", content: "Upload a transaction PDF, extract data with AI, generate Excel and book via Global API." },
      { property: "og:title", content: "AI-Powered PDF Processing & Transaction Booking" },
      { property: "og:description", content: "Upload a transaction PDF, extract data, generate Excel and book it." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

type Result = {
  status: string;
  message?: string;
  stage?: string;
  data?: Record<string, string>;
  globalApi?: { status: string; httpStatus?: number; error?: string; response?: unknown };
  excel?: { filename: string; base64: string };
};

function Index() {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Result | null>(null);

  const process = async () => {
    if (!file) return;
    setBusy(true);
    setRes(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch("/api/process-pdf", { method: "POST", body: fd });
      setRes(await r.json());
    } catch {
      setRes({ status: "error", message: "Network error" });
    } finally {
      setBusy(false);
    }
  };

  const download = () => {
    if (!res?.excel) return;
    const bytes = Uint8Array.from(atob(res.excel.base64), (c) => c.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = res.excel.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="mx-auto max-w-2xl space-y-5 p-6">
      <h1 className="text-2xl font-semibold">AI-Powered PDF Processing & Transaction Booking</h1>

      <label
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          setFile(e.dataTransfer.files[0] ?? null);
        }}
        className="block cursor-pointer rounded-lg border-2 border-dashed border-border p-8 text-center text-muted-foreground"
      >
        <input type="file" accept="application/pdf" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        {file ? file.name : "Drop a PDF here or click to choose"}
      </label>

      <button
        onClick={process}
        disabled={!file || busy}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        {busy ? "Processing…" : "Process PDF"}
      </button>

      {res && (
        <div className="space-y-4 text-sm">
          <p>
            <strong>Status:</strong>{" "}
            <span className={res.status === "error" ? "text-destructive" : ""}>
              {res.status}
              {res.stage ? ` (${res.stage})` : ""}
              {res.message ? ` — ${res.message}` : ""}
            </span>
          </p>
          {res.data && (
            <table className="w-full border border-border">
              <tbody>
                {Object.entries(res.data).map(([k, v]) => (
                  <tr key={k} className="border-b border-border">
                    <td className="bg-muted px-2 py-1 font-medium">{k}</td>
                    <td className="px-2 py-1">{v || <span className="text-destructive">missing</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {res.globalApi && (
            <div className="space-y-1">
              <p>
                <strong>Global API:</strong> {res.globalApi.status}
                {res.globalApi.httpStatus ? ` (HTTP ${res.globalApi.httpStatus})` : ""}
                {res.globalApi.error ? ` — ${res.globalApi.error}` : ""}
              </p>
              {res.globalApi.response != null && (
                <pre className="overflow-auto rounded-md bg-muted p-3 text-xs">
                  {JSON.stringify(res.globalApi.response, null, 2)}
                </pre>
              )}
            </div>
          )}
          {res.excel && (
            <button onClick={download} className="rounded-md border border-border px-4 py-2 font-medium">
              Download Excel
            </button>
          )}
        </div>
      )}
    </main>
  );
}
