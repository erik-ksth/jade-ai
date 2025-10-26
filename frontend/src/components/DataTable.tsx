"use client";

import { useMemo } from "react";
import { UploadedData } from "../../../shared/types";
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';

// Register all Community features
ModuleRegistry.registerModules([AllCommunityModule]);

interface DataTableProps {
     uploadedData: UploadedData | null;
}

export default function DataTable({ uploadedData }: DataTableProps) {
     console.log('DataTable rendered with uploadedData:', uploadedData);

     // Convert uploaded data to AG Grid format
     const { rowData, columnDefs } = useMemo(() => {
          if (!uploadedData || !uploadedData.data || uploadedData.data.length === 0) {
               return { rowData: [], columnDefs: [] };
          }

          const rows = uploadedData.data;
          const headers = uploadedData.column_names || Object.keys(rows[0] || {});

          // Create column definitions from headers
          const cols = headers.map((header: string) => {
               // Calculate initial width based on header length and content
               const baseWidth = Math.max(header.length * 8 + 40, 120); // Minimum 120px

               return {
                    field: header,
                    headerName: header,
                    sortable: true,
                    filter: true,
                    resizable: true,
                    width: baseWidth,           // Initial width
                    // Alternative width options:
                    // flex: 1,                // Use flex for proportional sizing
                    sizeToFit: true,        // Auto-size to fit content
                    // autoSizeColumns: true,  // Auto-size all columns
               };
          });

          return {
               rowData: rows,
               columnDefs: cols
          };
     }, [uploadedData]);

     return (
          <div className="flex-1 p-4 h-full w-full">
               {uploadedData ? (
                    <div className="ag-theme-alpine h-full w-full">
                         <AgGridReact
                              rowData={rowData}
                              columnDefs={columnDefs}
                              defaultColDef={{
                                   sortable: true,
                                   filter: true,
                                   resizable: true,
                                   headerClass: 'ag-header-cell-padding',
                                   editable: true,
                              }}
                              rowHeight={40}
                              headerHeight={64}
                              pagination={true}
                              paginationPageSize={100}
                              rowSelection="multiple"
                              suppressRowHoverHighlight={false}
                              cellSelection={true}
                         />
                    </div>
               ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                         Select a file from the left panel to view data
                    </div>
               )}
          </div>
     );
}
