import { createFileRoute } from "@tanstack/react-router";
import { extractTransaction, FIELDS, type Transaction } from "@/lib/pipeline/extract.server";
import { buildExcelBase64 } from "@/lib/pipeline/excel.server";
import { sendToGlobalApi } from "@/lib/pipeline/global-api.server";

const err = (stage: string, message: string, status = 400, extra: object = {}) =>
  Response.json({ status: "error", stage, message, ...extra }, { status });

export const Route = createFileRoute("/api/process-pdf")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let file: File | null = null;
        try {
          file = (await request.formData()).get("file") as File | null;
        } catch {
          return err("upload", "Expected multipart form data with a 'file' field");
        }
        if (!file || typeof file === "string") return err("upload", "No file uploaded");
        if (file.size > 15 * 1024 * 1024) return err("upload", "PDF must be under 15MB");
        const buf = await file.arrayBuffer();
        const head = new TextDecoder().decode(new Uint8Array(buf.slice(0, 5)));
        if (head !== "%PDF-") return err("validation", "File is not a valid PDF");

        let raw: Partial<Transaction>;
        try {
          raw = await extractTransaction(buf);
        } catch (e) {
          return err("extraction", e instanceof Error ? e.message : "Extraction failed", 502);
        }
        const data = Object.fromEntries(FIELDS.map((f) => [f, String(raw[f] ?? "").trim()])) as Transaction;
        const missing = FIELDS.filter((f) => !data[f]);
        if (missing.length) return err("validation", `Missing fields: ${missing.join(", ")}`, 422, { data, missing });

        let excel: string;
        try {
          excel = buildExcelBase64(data);
        } catch {
          return err("excel", "Excel generation failed", 500, { data });
        }

        const excelFile = { filename: `transaction_${data.transaction_id}.xlsx`, base64: excel };
        const globalApi = await sendToGlobalApi(data, excelFile, new URL(request.url).origin);
        return Response.json({
          status: globalApi.status === "success" ? "success" : "partial",
          data,
          globalApi,
          excel: excelFile,
        });
      },
    },
  },
});
