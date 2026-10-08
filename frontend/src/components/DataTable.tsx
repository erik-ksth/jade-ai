"use client";

import { useMemo } from "react";
import { UploadedData } from "../../../shared/types";
import { AgGridReact } from "ag-grid-react";
import {
     AllCommunityModule,
     ModuleRegistry,
     themeQuartz,
     type ColDef,
     type ValueFormatterParams,
     type CellClassParams,
} from "ag-grid-community";
import { formatCount, isInvalidToken, isMissing } from "@/lib/api";

ModuleRegistry.registerModules([AllCommunityModule]);

// Colors resolve from CSS tokens, so the grid follows the light/dark theme without re-rendering.
const gridTheme = themeQuartz.withParams({
     backgroundColor: "var(--card)",
     foregroundColor: "var(--foreground)",
     chromeBackgroundColor: "var(--background)",
     headerBackgroundColor: "var(--background)",
     headerTextColor: "var(--muted-foreground)",
     headerFontWeight: 500,
     headerFontSize: 12,
     headerHeight: 36,
     borderColor: "var(--border)",
     rowHoverColor: "var(--accent)",
     selectedRowBackgroundColor: "var(--selection)",
     oddRowBackgroundColor: "var(--card)",
     accentColor: "var(--primary)",
     rangeSelectionBorderColor: "var(--primary)",
     fontFamily: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
     fontSize: 13,
     dataFontSize: 13,
     spacing: 6,
     rowHeight: 32,
     wrapperBorder: false,
     wrapperBorderRadius: 0,
     columnBorder: false,
     headerColumnBorder: true,
     headerColumnBorderHeight: "40%",
     browserColorScheme: "inherit",
});

interface DataTableProps {
     uploadedData: UploadedData | null;
}

type Row = Record<string, unknown>;

const formatValue = (params: ValueFormatterParams<Row>) =>
     isMissing(params.value) ? "—" : String(params.value);

const toNumber = (value: unknown): number | null => {
     if (typeof value === "number") return Number.isFinite(value) ? value : null;
     if (typeof value === "string" && value.trim() !== "") {
          const n = Number(value);
          return Number.isFinite(n) ? n : null;
     }
     return null;
};

// A column reads as numeric when most of its filled values parse as numbers
const isNumericColumn = (rows: Row[], header: string) => {
     let filled = 0;
     let numeric = 0;
     for (const row of rows) {
          const value = row[header];
          if (isMissing(value)) continue;
          filled++;
          if (toNumber(value) !== null) numeric++;
     }
     return filled > 0 && numeric / filled >= 0.8;
};

const numericComparator = (a: unknown, b: unknown) => {
     const x = toNumber(a);
     const y = toNumber(b);
     if (x === null && y === null) return 0;
     if (x === null) return -1;
     if (y === null) return 1;
     return x - y;
};

const cellClassRules = {
     "cell-missing": (params: CellClassParams<Row>) => isMissing(params.value),
     "cell-invalid": (params: CellClassParams<Row>) => isInvalidToken(params.value),
};

export default function DataTable({ uploadedData }: DataTableProps) {
     const { rowData, columnDefs, stats } = useMemo(() => {
          const rows = uploadedData?.data ?? [];
          const headers = uploadedData?.column_names?.length
               ? uploadedData.column_names
               : Object.keys(rows[0] || {});

          let missing = 0;
          let invalid = 0;
          for (const row of rows) {
               for (const header of headers) {
                    const value = row[header];
                    if (isMissing(value)) missing++;
                    else if (isInvalidToken(value)) invalid++;
               }
          }

          const cols: ColDef<Row>[] = [
               {
                    colId: "__row",
                    headerName: "",
                    valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1,
                    width: 56,
                    pinned: "left",
                    sortable: false,
                    filter: false,
                    resizable: false,
                    suppressMovable: true,
                    cellClass: "tabular text-muted-foreground text-right",
               },
               ...headers.map((header): ColDef<Row> => {
                    const numeric = isNumericColumn(rows, header);
                    return {
                         field: header,
                         headerName: header,
                         headerTooltip: header,
                         minWidth: 110,
                         valueFormatter: formatValue,
                         cellClassRules,
                         ...(numeric
                              ? { type: "rightAligned", cellClass: ["tabular", "ag-right-aligned-cell"], comparator: numericComparator }
                              : {}),
                    };
               }),
          ];

          return {
               rowData: rows,
               columnDefs: cols,
               stats: { rows: rows.length, columns: headers.length, missing, invalid },
          };
     }, [uploadedData]);

     if (!uploadedData) {
          return (
               <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    Select a file to view its data
               </div>
          );
     }

     return (
          <div className="flex h-full w-full flex-col">
               <div className="flex h-9 shrink-0 items-center gap-4 border-b px-3 text-xs text-muted-foreground">
                    <span className="tabular">
                         <span className="font-medium text-foreground">{formatCount(stats.rows)}</span> rows
                    </span>
                    <span className="tabular">
                         <span className="font-medium text-foreground">{stats.columns}</span> columns
                    </span>
                    <span className="h-3.5 w-px bg-border" aria-hidden />
                    <span className="tabular flex items-center gap-1.5" title="Cells with no value">
                         <span className="italic">—</span>
                         <span>
                              <span className="font-medium text-foreground">{formatCount(stats.missing)}</span> empty
                         </span>
                    </span>
                    <span
                         className="tabular flex items-center gap-1.5"
                         title="Placeholder values like ERROR or UNKNOWN"
                    >
                         <span className="size-2 rounded-[2px] bg-warning" aria-hidden />
                         <span>
                              <span className="font-medium text-foreground">{formatCount(stats.invalid)}</span> invalid
                         </span>
                    </span>
               </div>

               <div className="min-h-0 flex-1">
                    <AgGridReact<Row>
                         theme={gridTheme}
                         rowData={rowData}
                         columnDefs={columnDefs}
                         defaultColDef={{
                              sortable: true,
                              filter: true,
                              resizable: true,
                         }}
                         autoSizeStrategy={{ type: "fitCellContents" }}
                         tooltipShowDelay={400}
                         enableCellTextSelection={true}
                         ensureDomOrder={true}
                    />
               </div>
          </div>
     );
}
