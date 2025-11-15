"use client";

import { useState } from "react";
import { X } from "lucide-react";
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
               <div className="flex-shrink-0 bg-slate-100 border-b border-slate-200 flex items-center overflow-x-auto">
                    {tabs.map((tab, index) => (
                         <div
                              key={tab.id}
                              draggable={true}
                              onDragStart={(e) => handleDragStart(e, index)}
                              onDragOver={(e) => handleDragOver(e, index)}
                              onDragLeave={handleDragLeave}
                              onDrop={(e) => handleDrop(e, index)}
                              onDragEnd={handleDragEnd}
                              onClick={() => onTabChange(tab.id)}
                              className={cn(
                                   "group flex items-center gap-2 px-3 py-2 text-sm border-r border-slate-200 cursor-pointer transition-colors min-w-0 select-none",
                                   activeTabId === tab.id
                                        ? "bg-white text-slate-900 font-medium"
                                        : "bg-slate-100 text-slate-600 hover:bg-slate-50",
                                   draggedIndex === index && "opacity-40",
                                   dragOverIndex === index && draggedIndex !== index && "border-l-2 border-l-blue-500"
                              )}
                         >
                              <span className="truncate">{tab.title}</span>
                              <button
                                   onClick={(e) => {
                                        e.stopPropagation();
                                        onTabClose(tab.id);
                                   }}
                                   className={cn(
                                        "flex-shrink-0 p-0.5 rounded hover:bg-slate-200 transition-colors",
                                        activeTabId === tab.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                                   )}
                                   title="Close tab"
                              >
                                   <X className="h-3 w-3" />
                              </button>
                         </div>
                    ))}
               </div>

               {/* Tab Content */}
               <div className="flex-1 overflow-hidden bg-white">
                    {activeTab ? activeTab.content : (
                         <div className="h-full flex items-center justify-center text-slate-400">
                              No tab selected
                         </div>
                    )}
               </div>
          </div>
     );
}
