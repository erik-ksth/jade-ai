"use client";

import { useState } from "react";
import { X, Table2, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SimpleTab {
     id: string;
     title: string;
     type: "data" | "dashboard";
     fileIndex?: number;
     content: React.ReactNode;
}

interface SimpleTabsProps {
     tabs: SimpleTab[];
     activeTabId: string | null;
     onTabChange: (tabId: string) => void;
     onTabClose: (tabId: string) => void;
     onTabReorder?: (fromIndex: number, toIndex: number) => void;
}

export default function SimpleTabs({
     tabs,
     activeTabId,
     onTabChange,
     onTabClose,
     onTabReorder,
}: SimpleTabsProps) {
     const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
     const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

     const handleDragStart = (e: React.DragEvent, index: number) => {
          setDraggedIndex(index);
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", index.toString());
     };

     const handleDragOver = (e: React.DragEvent, index: number) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";

          if (draggedIndex !== null && draggedIndex !== index) {
               setDragOverIndex(index);
          }
     };

     const handleDragLeave = () => {
          setDragOverIndex(null);
     };

     const handleDrop = (e: React.DragEvent, dropIndex: number) => {
          e.preventDefault();

          if (draggedIndex !== null && draggedIndex !== dropIndex && onTabReorder) {
               onTabReorder(draggedIndex, dropIndex);
          }

          setDraggedIndex(null);
          setDragOverIndex(null);
     };

     const handleDragEnd = () => {
          setDraggedIndex(null);
          setDragOverIndex(null);
     };

     const activeTab = tabs.find((tab) => tab.id === activeTabId);

     return (
          <div className="h-full w-full flex flex-col">
               {/* Tab Bar */}
               <div role="tablist" className="flex h-10 shrink-0 items-stretch overflow-x-auto bg-background">
                    {tabs.map((tab, index) => {
                         const isActive = activeTabId === tab.id;
                         const Icon = tab.type === "dashboard" ? LayoutDashboard : Table2;
                         return (
                              <div
                                   key={tab.id}
                                   role="tab"
                                   aria-selected={isActive}
                                   tabIndex={isActive ? 0 : -1}
                                   draggable={true}
                                   onDragStart={(e) => handleDragStart(e, index)}
                                   onDragOver={(e) => handleDragOver(e, index)}
                                   onDragLeave={handleDragLeave}
                                   onDrop={(e) => handleDrop(e, index)}
                                   onDragEnd={handleDragEnd}
                                   onClick={() => onTabChange(tab.id)}
                                   onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === " ") {
                                             e.preventDefault();
                                             onTabChange(tab.id);
                                        }
                                   }}
                                   className={cn(
                                        "group relative flex min-w-0 max-w-56 cursor-pointer select-none items-center gap-2 border-r pl-3 pr-1.5 text-[13px] outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50",
                                        isActive
                                             ? "border-b border-b-transparent bg-card text-foreground"
                                             : "border-b text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                                        draggedIndex === index && "opacity-40"
                                   )}
                              >
                                   {dragOverIndex === index && draggedIndex !== index && (
                                        <span aria-hidden className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-primary" />
                                   )}
                                   <Icon className={cn("size-3.5 shrink-0", isActive ? "text-primary" : "")} />
                                   <span className={cn("truncate", isActive && "font-medium")}>{tab.title}</span>
                                   <button
                                        onClick={(e) => {
                                             e.stopPropagation();
                                             onTabClose(tab.id);
                                        }}
                                        className={cn(
                                             "flex-shrink-0 rounded p-0.5 text-muted-foreground transition-opacity hover:bg-accent hover:text-foreground focus-visible:opacity-100",
                                             isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                                        )}
                                        aria-label={`Close ${tab.title}`}
                                        title="Close tab"
                                   >
                                        <X className="size-3.5" />
                                   </button>
                              </div>
                         );
                    })}
                    <div aria-hidden className="flex-1 border-b" />
               </div>

               {/* Tab Content */}
               <div role="tabpanel" className="flex-1 overflow-hidden bg-card">
                    {activeTab ? activeTab.content : (
                         <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                              No tab selected
                         </div>
                    )}
               </div>
          </div>
     );
}
