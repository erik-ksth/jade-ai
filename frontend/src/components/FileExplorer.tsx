"use client";

import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
     Dialog,
     DialogContent,
     DialogDescription,
     DialogFooter,
     DialogHeader,
     DialogTitle,
} from "@/components/ui/dialog";
import {
     AlertDialog,
     AlertDialogAction,
     AlertDialogCancel,
     AlertDialogContent,
     AlertDialogDescription,
     AlertDialogFooter,
     AlertDialogHeader,
     AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
     DropdownMenu,
     DropdownMenuContent,
     DropdownMenuItem,
     DropdownMenuSeparator,
     DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash2, Download, Plus, FileSpreadsheet, Sheet, Loader2, X } from "lucide-react";
import { UploadedData } from "../../../shared/types";
import { formatCount, loadSampleFile, uploadDataset } from "@/lib/api";
import { cn } from "@/lib/utils";

interface FileExplorerProps {
     files: UploadedData[];
     selectedFileIndex: number | null;
     onFileSelect: (index: number) => void;
     onFileUpload: (data: UploadedData | UploadedData[]) => void;
     onFileRemove: (index: number) => void;
     onFileReplace: (index: number, data: UploadedData) => void;
     onUploadingChange?: (isUploading: boolean) => void;
}

export interface FileExplorerHandle {
     uploadFile: (file: File) => Promise<void>;
     uploadSample: () => Promise<void>;
     openFilePicker: () => void;
}

const FileExplorer = forwardRef<FileExplorerHandle, FileExplorerProps>(function FileExplorer(
     { files, selectedFileIndex, onFileSelect, onFileUpload, onFileRemove, onFileReplace, onUploadingChange },
     ref
) {
     const [isLoading, setIsLoading] = useState(false);
     const [uploadError, setUploadError] = useState<string | null>(null);
     const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
     const [pendingUploadData, setPendingUploadData] = useState<UploadedData | null>(null);
     const [duplicateIndex, setDuplicateIndex] = useState<number>(-1);
     const [newFileName, setNewFileName] = useState("");
     const [showRenameDialog, setShowRenameDialog] = useState(false);
     const [renamingIndex, setRenamingIndex] = useState<number>(-1);
     const [renameValue, setRenameValue] = useState("");
     const [showDeleteDialog, setShowDeleteDialog] = useState(false);
     const [deletingIndex, setDeletingIndex] = useState<number>(-1);
     const fileInputRef = useRef<HTMLInputElement>(null);

     const setUploading = (value: boolean) => {
          setIsLoading(value);
          onUploadingChange?.(value);
     };

     const generateNewFileName = (filename: string): string => {
          const extensionMatch = filename.match(/(\.[^.]+)$/);
          const extension = extensionMatch ? extensionMatch[1] : "";
          const baseName = extension ? filename.slice(0, -extension.length) : filename;

          let counter = 1;
          let newName = `${baseName} (${counter})${extension}`;

          while (files.some((f) => f.filename === newName)) {
               counter++;
               newName = `${baseName} (${counter})${extension}`;
          }

          return newName;
     };

     const processFile = async (file: File) => {
          if (isLoading) return;
          setUploading(true);
          setUploadError(null);

          try {
               const entries = await uploadDataset(file);

               // Stop at the first name clash and let the user decide
               const duplicate = entries
                    .map((entry) => ({ entry, index: files.findIndex((f) => f.filename === entry.filename) }))
                    .find(({ index }) => index !== -1);

               if (duplicate) {
                    setPendingUploadData(duplicate.entry);
                    setDuplicateIndex(duplicate.index);
                    setNewFileName(generateNewFileName(duplicate.entry.filename));
                    setShowDuplicateDialog(true);
               } else {
                    onFileUpload(entries.length === 1 ? entries[0] : entries);
               }
          } catch (error) {
               setUploadError(
                    error instanceof Error && error.message !== "Failed to fetch"
                         ? error.message
                         : "Couldn't reach the server. Check that the backend is running."
               );
          } finally {
               setUploading(false);
          }
     };

     useImperativeHandle(ref, () => ({
          uploadFile: processFile,
          uploadSample: async () => {
               try {
                    await processFile(await loadSampleFile());
               } catch {
                    setUploadError("Couldn't load the sample dataset.");
               }
          },
          openFilePicker: () => fileInputRef.current?.click(),
     }));

     const handleInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) await processFile(file);
     };

     const closeDuplicateDialog = () => {
          setShowDuplicateDialog(false);
          setPendingUploadData(null);
          setDuplicateIndex(-1);
          setNewFileName("");
     };

     const handleReplace = () => {
          if (pendingUploadData && duplicateIndex !== -1) {
               onFileReplace(duplicateIndex, pendingUploadData);
               closeDuplicateDialog();
          }
     };

     const handleKeepBoth = () => {
          if (pendingUploadData && newFileName.trim()) {
               onFileUpload({ ...pendingUploadData, filename: newFileName.trim() });
               closeDuplicateDialog();
          }
     };

     const handleStartRename = (index: number, currentName: string) => {
          setRenamingIndex(index);
          setRenameValue(currentName);
          setShowRenameDialog(true);
     };

     const closeRenameDialog = () => {
          setShowRenameDialog(false);
          setRenamingIndex(-1);
          setRenameValue("");
     };

     const handleConfirmRename = () => {
          if (renamingIndex !== -1 && renameValue.trim()) {
               onFileReplace(renamingIndex, { ...files[renamingIndex], filename: renameValue.trim() });
               closeRenameDialog();
          }
     };

     const handleConfirmDelete = () => {
          if (deletingIndex !== -1) {
               onFileRemove(deletingIndex);
               setShowDeleteDialog(false);
               setDeletingIndex(-1);
          }
     };

     const handleDownloadCsv = (file: UploadedData) => {
          const headers = file.column_names;
          const escape = (value: unknown) => {
               if (value === null || value === undefined) return "";
               const stringValue = String(value);
               return /[",\n]/.test(stringValue) ? `"${stringValue.replace(/"/g, '""')}"` : stringValue;
          };

          const csvContent = [
               headers.map(escape).join(","),
               ...file.data.map((row: Record<string, unknown>) => headers.map((h) => escape(row[h])).join(",")),
          ].join("\n");

          const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = file.filename.replace(/\.[^/.]+$/, "") + "_cleaned.csv";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
     };

     return (
          <div className="flex h-full w-full flex-col">
               <div className="flex h-10 shrink-0 items-center justify-between pl-4 pr-2">
                    <h2 className="text-xs font-medium text-muted-foreground">Files</h2>
                    <input
                         ref={fileInputRef}
                         type="file"
                         accept=".csv,.xlsx,.xls"
                         onChange={handleInputChange}
                         className="hidden"
                         disabled={isLoading}
                    />
                    <Button
                         variant="ghost"
                         size="icon-sm"
                         onClick={() => fileInputRef.current?.click()}
                         disabled={isLoading}
                         aria-label="Upload file"
                         title="Upload file"
                         className="size-7 text-muted-foreground hover:text-foreground"
                    >
                         {isLoading ? <Loader2 className="animate-spin" /> : <Plus />}
                    </Button>
               </div>

               {uploadError && (
                    <div
                         role="alert"
                         className="mx-2 mb-2 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-2.5 py-2 text-xs text-destructive"
                    >
                         <span className="flex-1 leading-snug">{uploadError}</span>
                         <button
                              onClick={() => setUploadError(null)}
                              aria-label="Dismiss error"
                              className="-m-0.5 rounded p-0.5 hover:bg-destructive/10"
                         >
                              <X className="size-3.5" />
                         </button>
                    </div>
               )}

               <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
                    {files.length === 0 ? (
                         <div className="px-2 py-1">
                              <p className="text-xs leading-relaxed text-muted-foreground">
                                   {isLoading ? "Uploading…" : "Uploaded files appear here."}
                              </p>
                         </div>
                    ) : (
                         <ul className="space-y-px">
                              {files.map((file, index) => {
                                   const isSelected = selectedFileIndex === index;
                                   const Icon = file.sheet_name ? Sheet : FileSpreadsheet;
                                   return (
                                        <li key={`${file.filename}-${index}`} className="group relative">
                                             <button
                                                  onClick={() => onFileSelect(index)}
                                                  aria-current={isSelected ? "true" : undefined}
                                                  className={cn(
                                                       "flex w-full items-start gap-2.5 rounded-md py-2 pl-2 pr-8 text-left transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                                                       isSelected
                                                            ? "bg-selection text-selection-foreground"
                                                            : "text-foreground hover:bg-accent"
                                                  )}
                                             >
                                                  <Icon
                                                       className={cn(
                                                            "mt-0.5 size-4 shrink-0",
                                                            isSelected ? "text-selection-foreground" : "text-muted-foreground"
                                                       )}
                                                  />
                                                  <span className="min-w-0 flex-1">
                                                       <span className="block truncate text-[13px] font-medium" title={file.filename}>
                                                            {file.filename}
                                                       </span>
                                                       <span
                                                            className={cn(
                                                                 "tabular block truncate text-xs",
                                                                 isSelected ? "text-selection-foreground/75" : "text-muted-foreground"
                                                            )}
                                                       >
                                                            {formatCount(file.rows)} rows · {file.columns} cols
                                                       </span>
                                                  </span>
                                             </button>

                                             <DropdownMenu>
                                                  <DropdownMenuTrigger asChild>
                                                       <button
                                                            className="absolute right-1 top-1.5 rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-background/60 hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100"
                                                            aria-label={`Options for ${file.filename}`}
                                                       >
                                                            <MoreHorizontal className="size-4" />
                                                       </button>
                                                  </DropdownMenuTrigger>
                                                  <DropdownMenuContent align="start" className="w-44">
                                                       <DropdownMenuItem onClick={() => handleStartRename(index, file.filename)}>
                                                            <Pencil />
                                                            Rename
                                                       </DropdownMenuItem>
                                                       <DropdownMenuItem onClick={() => handleDownloadCsv(file)}>
                                                            <Download />
                                                            Download CSV
                                                       </DropdownMenuItem>
                                                       <DropdownMenuSeparator />
                                                       <DropdownMenuItem
                                                            variant="destructive"
                                                            onClick={() => {
                                                                 setDeletingIndex(index);
                                                                 setShowDeleteDialog(true);
                                                            }}
                                                       >
                                                            <Trash2 />
                                                            Remove
                                                       </DropdownMenuItem>
                                                  </DropdownMenuContent>
                                             </DropdownMenu>
                                        </li>
                                   );
                              })}
                         </ul>
                    )}
               </div>

               {/* Duplicate File Dialog */}
               <Dialog open={showDuplicateDialog} onOpenChange={(open) => !open && closeDuplicateDialog()}>
                    <DialogContent className="sm:max-w-md">
                         <DialogHeader>
                              <DialogTitle>A file with this name exists</DialogTitle>
                              <DialogDescription>
                                   <span className="font-medium text-foreground">{pendingUploadData?.filename}</span> is already
                                   open. Replace it, or keep both under a new name.
                              </DialogDescription>
                         </DialogHeader>

                         <div className="space-y-2">
                              <label htmlFor="duplicate-name" className="text-xs font-medium text-muted-foreground">
                                   New file name
                              </label>
                              <Input
                                   id="duplicate-name"
                                   value={newFileName}
                                   onChange={(e) => setNewFileName(e.target.value)}
                                   onKeyDown={(e) => e.key === "Enter" && newFileName.trim() && handleKeepBoth()}
                              />
                         </div>

                         <DialogFooter>
                              <Button variant="ghost" onClick={closeDuplicateDialog}>
                                   Cancel
                              </Button>
                              <Button variant="outline" onClick={handleReplace}>
                                   Replace existing
                              </Button>
                              <Button onClick={handleKeepBoth} disabled={!newFileName.trim()}>
                                   Keep both
                              </Button>
                         </DialogFooter>
                    </DialogContent>
               </Dialog>

               {/* Rename File Dialog */}
               <Dialog open={showRenameDialog} onOpenChange={(open) => !open && closeRenameDialog()}>
                    <DialogContent className="sm:max-w-md">
                         <DialogHeader>
                              <DialogTitle>Rename file</DialogTitle>
                              <DialogDescription>This only changes the name shown in Jade.</DialogDescription>
                         </DialogHeader>
                         <Input
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && renameValue.trim() && handleConfirmRename()}
                              aria-label="File name"
                              autoFocus
                         />
                         <DialogFooter>
                              <Button variant="ghost" onClick={closeRenameDialog}>
                                   Cancel
                              </Button>
                              <Button onClick={handleConfirmRename} disabled={!renameValue.trim()}>
                                   Rename
                              </Button>
                         </DialogFooter>
                    </DialogContent>
               </Dialog>

               {/* Remove Confirmation Dialog */}
               <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                    <AlertDialogContent>
                         <AlertDialogHeader>
                              <AlertDialogTitle>Remove this file?</AlertDialogTitle>
                              <AlertDialogDescription>
                                   <span className="font-medium text-foreground">
                                        {deletingIndex !== -1 ? files[deletingIndex]?.filename : ""}
                                   </span>{" "}
                                   and any changes made to it will be removed from this session.
                              </AlertDialogDescription>
                         </AlertDialogHeader>
                         <AlertDialogFooter>
                              <AlertDialogCancel onClick={() => setDeletingIndex(-1)}>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                   onClick={handleConfirmDelete}
                                   className="bg-destructive text-white hover:bg-destructive/90"
                              >
                                   Remove
                              </AlertDialogAction>
                         </AlertDialogFooter>
                    </AlertDialogContent>
               </AlertDialog>
          </div>
     );
});

export default FileExplorer;
