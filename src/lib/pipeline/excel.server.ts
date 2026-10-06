import * as XLSX from "xlsx";
import { FIELDS, type Transaction } from "./extract.server";

export function buildExcelBase64(t: Transaction): string {
  const ws = XLSX.utils.json_to_sheet([t], { header: [...FIELDS] });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Transactions");
  return XLSX.write(wb, { type: "base64", bookType: "xlsx" });
}
