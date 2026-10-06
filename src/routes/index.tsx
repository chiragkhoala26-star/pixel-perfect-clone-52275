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

type Item = { file: File; busy: boolean; res: Result | null };

function download(excel: { filename: string; base64: string }) {
  const bytes = Uint8Array.from(atob(excel.base64), (c) => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = excel.filename;
  a.click();
  URL.revokeObjectURL(url);
}

function Index() {
  const [items, setItems] = useState<Item[]>([]);
  const busy = items.some((i) => i.busy);

  const add = (list: FileList | null) => {
    if (!list) return;
    setItems((prev) => [...prev, ...Array.from(list).map((file) => ({ file, busy: false, res: null }))]);
  };

  const processAll = async () => {
    const targets = items.map((it, idx) => ({ it, idx })).filter(({ it }) => !it.res);
    setItems((prev) => prev.map((it) => (it.res ? it : { ...it, busy: true })));
    await Promise.all(
      targets.map(async ({ it, idx }) => {
        let res: Result;
        try {
          const fd = new FormData();
          fd.append("file", it.file);
          const r = await fetch("/api/process-pdf", { method: "POST", body: fd });
          res = await r.json();
        } catch {
          res = { status: "error", message: "Network error" };
        }
        setItems((prev) => prev.map((p, i) => (i === idx ? { ...p, busy: false, res } : p)));
      }),
    );
  };

  return (
    <main className="mx-auto max-w-3xl space-y-5 p-6">
      <h1 className="text-2xl font-semibold">AI-Powered PDF Processing & Transaction Booking</h1>

      <label
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          add(e.dataTransfer.files);
        }}
        className="block cursor-pointer rounded-lg border-2 border-dashed border-border p-8 text-center text-muted-foreground"
      >
        <input type="file" accept="application/pdf" multiple className="hidden" onChange={(e) => { add(e.target.files); e.target.value = ""; }} />
        Drop one or more PDFs here or click to choose
      </label>

      <div className="flex gap-2">
        <button
          onClick={processAll}
          disabled={!items.some((i) => !i.res) || busy}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {busy ? "Processing…" : `Process ${items.filter((i) => !i.res).length || ""} PDF(s)`}
        </button>
        {items.length > 0 && (
          <button onClick={() => setItems([])} disabled={busy} className="rounded-md border border-border px-4 py-2 text-sm disabled:opacity-50">
            Clear
          </button>
        )}
      </div>

      {items.map(({ file, busy: b, res }, idx) => (
        <section key={idx} className="space-y-3 rounded-lg border border-border p-4 text-sm">
          <p className="font-medium">{file.name}</p>
          {b && <p className="text-muted-foreground">Processing…</p>}
          {!b && !res && <p className="text-muted-foreground">Waiting</p>}
          {res && (
            <>
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
                <button onClick={() => download(res.excel!)} className="rounded-md border border-border px-4 py-2 font-medium">
                  Download Excel
                </button>
              )}
            </>
          )}
        </section>
      ))}
    </main>
  );
}
