"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
     Dialog,
     DialogContent,
     DialogDescription,
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
     DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, FileEdit, Trash2, Download } from "lucide-react";
import { UploadedData } from "../../../shared/types";

interface FileExplorerProps {
     files: UploadedData[];
     selectedFileIndex: number | null;
     onFileSelect: (index: number) => void;
     onFileUpload: (data: UploadedData | UploadedData[], initialMessage?: string) => void;
     onFileRemove: (index: number) => void;
     onFileReplace: (index: number, data: UploadedData) => void;
}

export default function FileExplorer({
     files,
     selectedFileIndex,
     onFileSelect,
     onFileUpload,
     onFileRemove,
     onFileReplace,
}: FileExplorerProps) {
     const [isLoading, setIsLoading] = useState(false);
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

     const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
          const file = event.target.files?.[0];
          if (!file) return;

          setIsLoading(true);
          const formData = new FormData();
          formData.append('file', file);

          try {
               const response = await fetch('http://localhost:8000/upload', {
                    method: 'POST',
                    body: formData,
               });

               if (!response.ok) {
                    throw new Error(`Upload failed: ${response.statusText}`);
               }

               const data = await response.json();
               console.log('Uploaded data received:', data);

               // Check if file has multiple sheets
               if (data.has_multiple_sheets && data.sheets_info && data.sheets_info.length > 1) {
                    console.log('File has multiple sheets:', data.sheets_info);

                    // Create separate entries for each sheet
                    const allSheets: UploadedData[] = [];
                    let hasDuplicate = false;

                    for (const sheetInfo of data.sheets_info) {
                         // For the first sheet (current_sheet), use the data from the response
                         // For other sheets, they'll load data when selected
                         const isCurrentSheet = sheetInfo.name === data.current_sheet;

                         const sheetData: UploadedData = {
                              filename: sheetInfo.name,
                              original_filename: data.filename,
                              sheet_name: sheetInfo.name,
                              rows: sheetInfo.rows,
                              columns: sheetInfo.columns,
                              column_names: sheetInfo.column_names,
                              dtypes: isCurrentSheet ? data.dtypes : {},
                              preview: isCurrentSheet ? data.preview : [],
                              data: isCurrentSheet ? data.data : []
                         };

                         // Check for duplicates
                         const existingIndex = files.findIndex(f => f.filename === sheetData.filename);

                         if (existingIndex !== -1) {
                              // Duplicate found - show dialog for first duplicate
                              setPendingUploadData(sheetData);
                              setDuplicateIndex(existingIndex);
                              setNewFileName(generateNewFileName(sheetData.filename));
                              setShowDuplicateDialog(true);
                              hasDuplicate = true;
                              break;
                         }

                         allSheets.push(sheetData);
                    }

                    // Upload all sheets at once if no duplicates
                    if (!hasDuplicate && allSheets.length > 0) {
                         onFileUpload(allSheets);
                    }
               } else {
                    // Single sheet or CSV file
                    // Check if filename already exists
                    const existingIndex = files.findIndex(f => f.filename === data.filename);

                    if (existingIndex !== -1) {
                         // Duplicate found - show dialog
                         setPendingUploadData(data);
                         setDuplicateIndex(existingIndex);
                         setNewFileName(generateNewFileName(data.filename));
                         setShowDuplicateDialog(true);
                    } else {
                         // No duplicate - upload directly
                         onFileUpload(data);
                    }
               }
          } catch (error) {
               console.error('Upload failed:', error);
          } finally {
               setIsLoading(false);
               event.target.value = '';
          }
     };

     const generateNewFileName = (filename: string): string => {
          const extensionMatch = filename.match(/(\.[^.]+)$/);
          const extension = extensionMatch ? extensionMatch[1] : '';
          const baseName = extension ? filename.slice(0, -extension.length) : filename;

          let counter = 1;
          let newName = `${baseName} (${counter})${extension}`;

          while (files.some(f => f.filename === newName)) {
               counter++;
               newName = `${baseName} (${counter})${extension}`;
          }

          return newName;
     };

     const handleReplace = () => {
          if (pendingUploadData && duplicateIndex !== -1) {
               onFileReplace(duplicateIndex, pendingUploadData);
               setShowDuplicateDialog(false);
               setPendingUploadData(null);
               setDuplicateIndex(-1);
          }
     };

     const handleRename = () => {
          if (pendingUploadData && newFileName.trim()) {
               const renamedData = { ...pendingUploadData, filename: newFileName.trim() };
               onFileUpload(renamedData);
               setShowDuplicateDialog(false);
               setPendingUploadData(null);
               setDuplicateIndex(-1);
               setNewFileName("");
          }
     };

     const handleCancelUpload = () => {
          setShowDuplicateDialog(false);
          setPendingUploadData(null);
          setDuplicateIndex(-1);
          setNewFileName("");
     };

     const handleStartRename = (index: number, currentName: string) => {
          setRenamingIndex(index);
          setRenameValue(currentName);
          setShowRenameDialog(true);
     };

     const handleConfirmRename = () => {
          if (renamingIndex !== -1 && renameValue.trim()) {
               const updatedFile = { ...files[renamingIndex], filename: renameValue.trim() };
               onFileReplace(renamingIndex, updatedFile);
               setShowRenameDialog(false);
               setRenamingIndex(-1);
               setRenameValue("");
          }
     };

     const handleCancelRename = () => {
          setShowRenameDialog(false);
          setRenamingIndex(-1);
          setRenameValue("");
     };

     const handleStartDelete = (index: number) => {
          setDeletingIndex(index);
          setShowDeleteDialog(true);
     };

     const handleConfirmDelete = () => {
          if (deletingIndex !== -1) {
               onFileRemove(deletingIndex);
               setShowDeleteDialog(false);
               setDeletingIndex(-1);
          }
     };

     const handleCancelDelete = () => {
          setShowDeleteDialog(false);
          setDeletingIndex(-1);
     };

     const handleDownloadCsv = (file: UploadedData) => {
          // Convert data to CSV format
          const headers = file.column_names;
          const rows = file.data;

          // Create CSV content
          const csvContent = [
               headers.join(','),
               ...rows.map((row: Record<string, unknown>) =>
                    headers.map((header: string) => {
                         const value = row[header];
                         // Escape values that contain commas or quotes
                         if (value === null || value === undefined) return '';
                         const stringValue = String(value);
                         if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
                              return `"${stringValue.replace(/"/g, '""')}"`;
                         }
                         return stringValue;
                    }).join(',')
               )
          ].join('\n');

          // Create blob and download
          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
          const link = document.createElement('a');
          const url = URL.createObjectURL(blob);

          const fileName = file.filename.replace(/\.[^/.]+$/, "") + "_export.csv";
          link.setAttribute('href', url);
          link.setAttribute('download', fileName);
          link.style.visibility = 'hidden';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
     };

     return (
          <div className="flex-1 p-3 h-full w-full">
               <div className="h-full w-full flex flex-col">
                    <div className="flex-shrink-0 pb-3 px-1">
                         <h2 className="text-base font-semibold text-slate-700">Files</h2>
                    </div>
                    <div className="flex-1 flex flex-col min-h-0 px-1">
                         {/* Upload Button */}
                         <div className="flex-shrink-0 mb-2">
                              <Input
                                   ref={fileInputRef}
                                   type="file"
                                   accept=".csv,.xlsx,.xls"
                                   onChange={handleFileUpload}
                                   className="hidden"
                                   id="file-upload-explorer"
                                   disabled={isLoading}
                              />
                              <Button
                                   asChild
                                   disabled={isLoading}
                                   className="w-full bg-slate-700 hover:bg-slate-800 text-white"
                                   size="sm"
                              >
                                   <label
                                        htmlFor="file-upload-explorer"
                                        className={`cursor-pointer ${isLoading ? 'cursor-not-allowed' : ''}`}
                                   >
                                        {isLoading ? 'Uploading...' : '+ Upload File'}
                                   </label>
                              </Button>
                         </div>

                         {/* File List */}
                         <div className="flex-1 overflow-y-auto space-y-1">
                              {files.length === 0 ? (
                                   <div className="flex items-center justify-center h-full text-sm text-slate-500 text-center px-2">
                                        No files uploaded yet
                                   </div>
                              ) : (
                                   files.map((file, index) => (
                                        <div
                                             key={index}
                                             className={`
                    group flex items-center justify-between p-1.5 rounded-lg
                    transition-all duration-200 text-sm
                    ${selectedFileIndex === index
                                                       ? 'bg-slate-100 border border-slate-300 shadow-sm'
                                                       : 'hover:bg-slate-50 border border-transparent hover:border-slate-200'
                                                  }
                  `}
                                        >
                                             <div
                                                  className="flex-1 min-w-0 cursor-pointer"
                                                  onClick={() => onFileSelect(index)}
                                             >
                                                  <div className="truncate font-medium text-slate-700" title={file.filename}>
                                                       {file.filename}
                                                  </div>
                                             </div>

                                             <DropdownMenu>
                                                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                                       <button
                                                            className="ml-2 p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-200 rounded"
                                                            title="More options"
                                                       >
                                                            <MoreVertical className="w-4 h-4 text-slate-600" />
                                                       </button>
                                                  </DropdownMenuTrigger>
                                                  <DropdownMenuContent align="end" className="w-40">
                                                       <DropdownMenuItem
                                                            onClick={(e) => {
                                                                 e.stopPropagation();
                                                                 handleStartRename(index, file.filename);
                                                            }}
                                                            className="cursor-pointer"
                                                       >
                                                            <FileEdit className="w-4 h-4 mr-2" />
                                                            Rename
                                                       </DropdownMenuItem>
                                                       <DropdownMenuItem
                                                            onClick={(e) => {
                                                                 e.stopPropagation();
                                                                 handleDownloadCsv(file);
                                                            }}
                                                            className="cursor-pointer"
                                                       >
                                                            <Download className="w-4 h-4 mr-2" />
                                                            Download CSV
                                                       </DropdownMenuItem>
                                                       <DropdownMenuItem
                                                            onClick={(e) => {
                                                                 e.stopPropagation();
                                                                 handleStartDelete(index);
                                                            }}
                                                            className="cursor-pointer text-red-600 focus:text-red-600"
                                                       >
                                                            <Trash2 className="w-4 h-4 mr-2" />
                                                            Delete
                                                       </DropdownMenuItem>
                                                  </DropdownMenuContent>
                                             </DropdownMenu>
                                        </div>
                                   ))
                              )}
                         </div>
                    </div>
               </div>

               {/* Duplicate File Dialog */}
               <Dialog open={showDuplicateDialog} onOpenChange={(open) => !open && handleCancelUpload()}>
                    <DialogContent className="max-w-md">
                         <DialogHeader>
                              <DialogTitle>File Already Exists</DialogTitle>
                              <DialogDescription>
                                   A file named <span className="font-medium text-gray-900">{pendingUploadData?.filename}</span> already exists. What would you like to do?
                              </DialogDescription>
                         </DialogHeader>

                         <div className="space-y-4">
                              {/* Replace Option */}
                              <div className="border rounded-lg p-3">
                                   <div className="flex items-center justify-between mb-2">
                                        <span className="font-medium text-sm">Replace existing file</span>
                                   </div>
                                   <p className="text-xs text-gray-500 mb-3">
                                        This will overwrite the existing file with the new one.
                                   </p>
                                   <Button
                                        onClick={handleReplace}
                                        variant="destructive"
                                        size="sm"
                                        className="w-full"
                                   >
                                        Replace
                                   </Button>
                              </div>

                              {/* Rename Option */}
                              <div className="border rounded-lg p-3">
                                   <div className="flex items-center justify-between mb-2">
                                        <span className="font-medium text-sm">Keep both files</span>
                                   </div>
                                   <p className="text-xs text-gray-500 mb-2">
                                        Rename the new file to keep both versions.
                                   </p>
                                   <Input
                                        value={newFileName}
                                        onChange={(e) => setNewFileName(e.target.value)}
                                        placeholder="Enter new filename"
                                        className="mb-2 text-sm"
                                        onKeyPress={(e) => e.key === 'Enter' && newFileName.trim() && handleRename()}
                                   />
                                   <Button
                                        onClick={handleRename}
                                        variant="default"
                                        size="sm"
                                        className="w-full"
                                        disabled={!newFileName.trim()}
                                   >
                                        Rename and Upload
                                   </Button>
                              </div>

                              {/* Cancel Button */}
                              <Button
                                   onClick={handleCancelUpload}
                                   variant="outline"
                                   size="sm"
                                   className="w-full"
                              >
                                   Cancel
                              </Button>
                         </div>
                    </DialogContent>
               </Dialog>

               {/* Rename File Dialog */}
               <Dialog open={showRenameDialog} onOpenChange={(open) => !open && handleCancelRename()}>
                    <DialogContent className="max-w-md">
                         <DialogHeader>
                              <DialogTitle>Rename File</DialogTitle>
                              <DialogDescription>
                                   Enter a new name for the file.
                              </DialogDescription>
                         </DialogHeader>

                         <div className="space-y-4">
                              <Input
                                   value={renameValue}
                                   onChange={(e) => setRenameValue(e.target.value)}
                                   placeholder="Enter new filename"
                                   className="text-sm"
                                   onKeyPress={(e) => e.key === 'Enter' && renameValue.trim() && handleConfirmRename()}
                                   autoFocus
                              />

                              <div className="flex gap-2 justify-end">
                                   <Button
                                        onClick={handleCancelRename}
                                        variant="outline"
                                        size="sm"
                                   >
                                        Cancel
                                   </Button>
                                   <Button
                                        onClick={handleConfirmRename}
                                        variant="default"
                                        size="sm"
                                        disabled={!renameValue.trim()}
                                   >
                                        Rename
                                   </Button>
                              </div>
                         </div>
                    </DialogContent>
               </Dialog>

               {/* Delete Confirmation Dialog */}
               <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                    <AlertDialogContent>
                         <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                   This will permanently delete <span className="font-medium text-gray-900">{deletingIndex !== -1 ? files[deletingIndex]?.filename : ''}</span>. This action cannot be undone.
                              </AlertDialogDescription>
                         </AlertDialogHeader>
                         <AlertDialogFooter>
                              <AlertDialogCancel onClick={handleCancelDelete}>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={handleConfirmDelete} className="bg-red-600 hover:bg-red-700">
                                   Delete
                              </AlertDialogAction>
                         </AlertDialogFooter>
                    </AlertDialogContent>
               </AlertDialog>
          </div>
     );
}

