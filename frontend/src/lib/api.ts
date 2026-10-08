import { UploadedData } from "../../../shared/types";

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const SAMPLE_DATASET = {
     path: "/samples/cafe_sales.csv",
     filename: "cafe_sales.csv",
};

interface SheetInfo {
     name: string;
     key: string;
     rows: number;
     columns: number;
     column_names: string[];
}

interface UploadResponse extends UploadedData {
     has_multiple_sheets?: boolean;
     sheets_info?: SheetInfo[];
     current_sheet?: string;
     dataset_key?: string;
}

/**
 * Uploads a CSV/Excel file and returns one entry per sheet.
 * Only the active sheet carries row data; other sheets load on selection.
 */
export async function uploadDataset(file: File): Promise<UploadedData[]> {
     const formData = new FormData();
     formData.append("file", file);

     const response = await fetch(`${API_URL}/upload`, {
          method: "POST",
          body: formData,
     });

     if (!response.ok) {
          let detail = response.statusText;
          try {
               const body = await response.json();
               if (body?.detail) detail = body.detail;
          } catch {
               // Non-JSON error body; keep the status text.
          }
          throw new Error(detail || "Upload failed");
     }

     const data: UploadResponse = await response.json();

     if (data.has_multiple_sheets && data.sheets_info && data.sheets_info.length > 1) {
          return data.sheets_info.map((sheet) => {
               const isCurrent = sheet.key === data.current_sheet;
               return {
                    filename: sheet.name,
                    original_filename: data.filename,
                    sheet_name: sheet.name,
                    dataset_key: sheet.key,
                    rows: sheet.rows,
                    columns: sheet.columns,
                    column_names: sheet.column_names,
                    dtypes: isCurrent ? data.dtypes : {},
                    preview: isCurrent ? data.preview : [],
                    data: isCurrent ? data.data : [],
               };
          });
     }

     return [
          {
               filename: data.filename,
               dataset_key: data.dataset_key,
               rows: data.rows,
               columns: data.columns,
               column_names: data.column_names,
               dtypes: data.dtypes,
               preview: data.preview,
               data: data.data,
          },
     ];
}

export async function loadSampleFile(): Promise<File> {
     const response = await fetch(SAMPLE_DATASET.path);
     if (!response.ok) throw new Error("Could not load the sample dataset");
     const blob = await response.blob();
     return new File([blob], SAMPLE_DATASET.filename, { type: "text/csv" });
}

/** Values that pandas keeps as strings but that mean "no valid data". */
export const INVALID_TOKENS = new Set([
     "error",
     "unknown",
     "n/a",
     "na",
     "nan",
     "null",
     "none",
     "-",
     "?",
     "#n/a",
     "#value!",
     "#ref!",
     "#div/0!",
]);

export function isMissing(value: unknown): boolean {
     return value === null || value === undefined || (typeof value === "string" && value.trim() === "");
}

export function isInvalidToken(value: unknown): boolean {
     return typeof value === "string" && INVALID_TOKENS.has(value.trim().toLowerCase());
}

export function formatCount(n: number): string {
     return n.toLocaleString("en-US");
}
