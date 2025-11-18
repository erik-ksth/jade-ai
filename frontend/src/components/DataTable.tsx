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
          <div className="flex-1 p-2 h-full w-full">
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
                              rowHeight={32}
                              headerHeight={40}
                              pagination={false}
                              // paginationPageSize={1000}
                              rowSelection="multiple"
                              suppressRowHoverHighlight={false}
                              cellSelection={true}
                         />
                    </div>
               ) : (
                    <div className="flex items-center justify-center h-full">
                         <div className="text-center">
                              <div className="w-16 h-16 mx-auto mb-5 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                                   <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                   </svg>
                              </div>
                              <h3 className="text-base font-semibold text-slate-700 mb-2">No data to display</h3>
                              <p className="text-sm text-slate-500">Select a file from the left panel to view data</p>
                         </div>
                    </div>
               )}
          </div>
     );
}
