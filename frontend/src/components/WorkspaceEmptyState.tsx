"use client";

import { useState } from "react";
import { FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface WorkspaceEmptyStateProps {
     hasFiles: boolean;
     isUploading: boolean;
     onUploadFile: (file: File) => void;
     onUploadSample: () => void;
     onBrowse: () => void;
}

const ACCEPTED = /\.(csv|xlsx|xls)$/i;

export default function WorkspaceEmptyState({
     hasFiles,
     isUploading,
     onUploadFile,
     onUploadSample,
     onBrowse,
}: WorkspaceEmptyStateProps) {
     const [isDragging, setIsDragging] = useState(false);
     const [dropError, setDropError] = useState<string | null>(null);
     const [pending, setPending] = useState<"file" | "sample" | null>(null);
     const activeAction = isUploading ? pending ?? "file" : null;

     if (hasFiles) {
          return (
               <div className="flex h-full items-center justify-center p-6">
                    <div className="max-w-xs text-center">
                         <p className="text-sm font-medium">No file open</p>
                         <p className="mt-1 text-sm text-muted-foreground">
                              Select a file in the sidebar to open it, or open the dashboard.
                         </p>
                    </div>
               </div>
          );
     }

     const handleDrop = (e: React.DragEvent) => {
          e.preventDefault();
          setIsDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (!file) return;
          if (!ACCEPTED.test(file.name)) {
               setDropError("That file type isn't supported. Use a CSV, XLS, or XLSX file.");
               return;
          }
          setDropError(null);
          setPending("file");
          onUploadFile(file);
     };

     return (
          <div
               className="flex h-full items-center justify-center p-6"
               onDragOver={(e) => {
                    e.preventDefault();
                    if (!isDragging) setIsDragging(true);
               }}
               onDragLeave={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false);
               }}
               onDrop={handleDrop}
          >
               <div
                    className={cn(
                         "flex w-full max-w-md flex-col items-center rounded-xl border border-dashed px-8 py-12 text-center transition-colors duration-200",
                         isDragging ? "border-primary bg-selection" : "border-input"
                    )}
               >
                    <div className="mb-5 flex size-11 items-center justify-center rounded-lg border bg-background text-muted-foreground">
                         <FileSpreadsheet className="size-5" />
                    </div>
                    <h2 className="text-base font-semibold text-balance">
                         {isDragging ? "Drop to upload" : "Start with a dataset"}
                    </h2>
                    <p className="mt-1.5 max-w-[34ch] text-sm text-muted-foreground text-pretty">
                         Drag a CSV or Excel file here. Then ask Jade to clean it, explain it, or chart it.
                    </p>

                    <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                         <Button
                              onClick={() => {
                                   setPending("file");
                                   onBrowse();
                              }}
                              disabled={isUploading}
                         >
                              {activeAction === "file" ? <Loader2 className="animate-spin" /> : <Upload />}
                              {activeAction === "file" ? "Uploading…" : "Upload file"}
                         </Button>
                         <Button
                              variant="outline"
                              onClick={() => {
                                   setPending("sample");
                                   onUploadSample();
                              }}
                              disabled={isUploading}
                         >
                              {activeAction === "sample" && <Loader2 className="animate-spin" />}
                              {activeAction === "sample" ? "Loading sample…" : "Try sample data"}
                         </Button>
                    </div>

                    <p className="mt-4 text-xs text-muted-foreground">
                         Supports CSV, XLS, and XLSX
                    </p>
                    {dropError && (
                         <p role="alert" className="mt-3 text-xs font-medium text-destructive">
                              {dropError}
                         </p>
                    )}
               </div>
          </div>
     );
}
