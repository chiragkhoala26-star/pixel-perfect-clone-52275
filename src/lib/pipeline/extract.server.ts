// PDF extraction via Lovable AI Gateway. Replace this module to swap extraction method.
export const FIELDS = [
  "transaction_id",
  "transaction_name",
  "loan_amount",
  "loan_type",
  "business_unit",
  "opportunity_id",
  "trade_fee",
  "cash_balance",
] as const;
export type Transaction = Record<(typeof FIELDS)[number], string>;

export async function extractTransaction(pdf: ArrayBuffer): Promise<Partial<Transaction>> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("Extraction service is not configured");
  const b64 = Buffer.from(pdf).toString("base64");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Extract these fields from the transaction PDF: ${FIELDS.join(", ")}. Use empty string if a field is not found. loan_amount, trade_fee and cash_balance as plain number strings.`,
            },
            { type: "file", file: { filename: "doc.pdf", file_data: `data:application/pdf;base64,${b64}` } },
          ],
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "save_transaction",
            parameters: {
              type: "object",
              properties: Object.fromEntries(FIELDS.map((f) => [f, { type: "string" }])),
              required: [...FIELDS],
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "save_transaction" } },
    }),
  });
  if (res.status === 429) throw new Error("Extraction rate limit reached, try again shortly");
  if (res.status === 402) throw new Error("AI credits exhausted");
  if (!res.ok) throw new Error(`Extraction failed (${res.status})`);
  const json = await res.json();
  const args = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) throw new Error("Extraction returned no data");
  return JSON.parse(args);
}
