import { createFileRoute } from "@tanstack/react-router";

// Dummy Global Application API: accepts a transaction + Excel and returns a booking reference.
export const Route = createFileRoute("/api/public/global-api-mock")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: { transaction?: Record<string, string>; excel?: { filename?: string; base64?: string } };
        try {
          body = await request.json();
        } catch {
          return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
        }
        const b64 = body.excel?.base64 ?? "";
        if (!body.transaction || !b64) {
          return Response.json({ ok: false, error: "transaction and excel are required" }, { status: 400 });
        }
        const excelBytes = Math.floor((b64.length * 3) / 4);
        return Response.json({
          ok: true,
          bookingReference: `GA-${Date.now().toString(36).toUpperCase()}`,
          receivedAt: new Date().toISOString(),
          transactionId: body.transaction["transaction_id"],
          excelReceived: { filename: body.excel?.filename, sizeBytes: excelBytes },
          message: "Transaction booked (dummy Global API)",
        });
      },
    },
  },
});
