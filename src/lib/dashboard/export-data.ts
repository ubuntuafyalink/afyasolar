/**
 * Client-side data export (Excel) for facility tables. The `xlsx` library is
 * dynamically imported on use so it never ships in the main bundle. No backend 
 * builds the workbook in the browser and triggers a download.
 */
export type ExportRow = Record<string, string | number>

/** Build an .xlsx from rows and trigger a download. */
export async function exportRowsToExcel(
  rows: ExportRow[],
  filename: string,
  sheetName = "Sheet1",
): Promise<void> {
  const XLSX = await import("xlsx")
  const worksheet = XLSX.utils.json_to_sheet(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
  XLSX.writeFile(workbook, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`)
}
