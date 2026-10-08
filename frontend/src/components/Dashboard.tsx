"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { UploadedData, ChartData, TextElement, BoxElement } from "../../../shared/types";
import { X, Type, Printer, Square, BarChart3 } from "lucide-react";
import {
     Chart as ChartJS,
     CategoryScale,
     LinearScale,
     PointElement,
     LineElement,
     BarElement,
     ArcElement,
     RadialLinearScale,
     Title,
     Tooltip,
     Legend,
     Filler,
} from "chart.js";
import { Line, Bar, Pie, Doughnut, PolarArea, Radar, Scatter, Bubble } from "react-chartjs-2";
import { Rnd } from "react-rnd";
import { chartThemes, withAlpha, type ChartTheme } from "@/lib/chartTheme";
import { cn } from "@/lib/utils";

ChartJS.register(
     CategoryScale,
     LinearScale,
     RadialLinearScale,
     PointElement,
     LineElement,
     BarElement,
     ArcElement,
     Filler,
     Title,
     Tooltip,
     Legend
);

interface DashboardProps {
     uploadedData: UploadedData | null;
     charts: ChartData[];
     onRemoveChart?: (index: number) => void;
     textElements?: TextElement[];
     onAddTextElement?: (textElement: TextElement) => void;
     onUpdateTextElement?: (id: string, updates: Partial<TextElement>) => void;
     onRemoveTextElement?: (id: string) => void;
     boxElements?: BoxElement[];
     onAddBoxElement?: (boxElement: BoxElement) => void;
     onUpdateBoxElement?: (id: string, updates: Partial<BoxElement>) => void;
     onRemoveBoxElement?: (id: string) => void;
}

const CATEGORICAL_TYPES = new Set(["pie", "doughnut", "polarArea"]);
const CHART_WIDTH = 560;
const CHART_HEIGHT = 360;
const CHART_GAP = 24;
const TOP_OFFSET = 60; // leaves room for the toolbar

/** Re-color server-provided datasets with the app palette for the active theme. */
function themeDatasets(chart: ChartData, theme: ChartTheme) {
     const { series } = theme;
     const isCategorical = CATEGORICAL_TYPES.has(chart.type);

     return chart.datasets.map((dataset, i) => {
          const base = series[i % series.length];

          if (isCategorical) {
               // Cycle the palette, stepping down opacity once it repeats
               const colors = chart.labels.map((_, j) =>
                    withAlpha(series[j % series.length], [1, 0.7, 0.45][Math.floor(j / series.length) % 3])
               );
               return { ...dataset, backgroundColor: colors, borderColor: theme.surface, borderWidth: 2 };
          }

          switch (chart.type) {
               case "bar":
                    return {
                         ...dataset,
                         backgroundColor: base,
                         hoverBackgroundColor: withAlpha(base, 0.8),
                         borderWidth: 0,
                         borderRadius: 4,
                         maxBarThickness: 48,
                    };
               case "line":
               case "area":
                    return {
                         ...dataset,
                         borderColor: base,
                         backgroundColor: withAlpha(base, chart.type === "area" ? 0.15 : 0),
                         fill: chart.type === "area",
                         borderWidth: 2,
                         tension: 0.3,
                         pointRadius: chart.labels.length > 40 ? 0 : 2.5,
                         pointHoverRadius: 4,
                         pointBackgroundColor: base,
                    };
               case "radar":
                    return {
                         ...dataset,
                         borderColor: base,
                         backgroundColor: withAlpha(base, 0.15),
                         pointBackgroundColor: base,
                         borderWidth: 2,
                    };
               default: // scatter, bubble
                    return { ...dataset, backgroundColor: withAlpha(base, 0.7), borderColor: base };
          }
     });
}

function chartOptions(chart: ChartData, theme: ChartTheme) {
     const isCategorical = CATEGORICAL_TYPES.has(chart.type);
     const isRadial = chart.type === "radar" || chart.type === "polarArea";
     const isXY = chart.type === "scatter" || chart.type === "bubble";

     const axis = {
          ticks: { color: theme.text, padding: 6 },
          grid: { color: theme.grid },
          border: { display: false },
     };

     return {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 300 },
          plugins: {
               legend: {
                    display: isCategorical || chart.datasets.length > 1,
                    position: "bottom" as const,
                    labels: { color: theme.text, usePointStyle: true, boxWidth: 8, boxHeight: 8, padding: 14 },
               },
               title: { display: false },
               tooltip: {
                    backgroundColor: theme.tooltipBackground,
                    borderColor: theme.tooltipBorder,
                    borderWidth: 1,
                    titleColor: theme.foreground,
                    bodyColor: theme.text,
                    padding: 10,
                    cornerRadius: 6,
                    displayColors: isCategorical || chart.datasets.length > 1,
                    boxPadding: 4,
               },
          },
          ...(isRadial
               ? {
                      scales: {
                           r: {
                                beginAtZero: true,
                                ticks: { color: theme.text, backdropColor: "transparent" },
                                grid: { color: theme.grid },
                                angleLines: { color: theme.grid },
                                pointLabels: { color: theme.text },
                           },
                      },
                 }
               : isCategorical
                 ? {}
                 : {
                        scales: {
                             x: {
                                  ...axis,
                                  ...(isXY ? { type: "linear" as const } : {}),
                                  grid: { display: isXY, color: theme.grid },
                             },
                             y: { ...axis, beginAtZero: true, ...(isXY ? { type: "linear" as const } : {}) },
                        },
                   }),
     };
}

const CHART_COMPONENTS = {
     bar: Bar,
     pie: Pie,
     doughnut: Doughnut,
     area: Line,
     bubble: Bubble,
     polarArea: PolarArea,
     radar: Radar,
     scatter: Scatter,
     line: Line,
     mixed: Bar,
} as const;

function RemoveButton({ label, onClick }: { label: string; onClick: () => void }) {
     return (
          <button
               onClick={(e) => {
                    e.stopPropagation();
                    onClick();
               }}
               aria-label={label}
               title={label}
               className="no-print flex size-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
               <X className="size-3.5" />
          </button>
     );
}

export default function Dashboard({
     charts,
     onRemoveChart,
     textElements = [],
     onAddTextElement,
     onUpdateTextElement,
     onRemoveTextElement,
     boxElements = [],
     onAddBoxElement,
     onUpdateBoxElement,
     onRemoveBoxElement,
}: DashboardProps) {
     const { resolvedTheme } = useTheme();
     const theme = chartThemes[resolvedTheme === "dark" ? "dark" : "light"];
     const containerRef = useRef<HTMLDivElement>(null);
     const [selectedChart, setSelectedChart] = useState<number | null>(null);
     const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
     const [selectedBoxId, setSelectedBoxId] = useState<string | null>(null);
     const [editingTextId, setEditingTextId] = useState<string | null>(null);
     const textInputRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

     // Match chart typography to the app font
     useEffect(() => {
          ChartJS.defaults.font.family = getComputedStyle(document.body).fontFamily;
          ChartJS.defaults.font.size = 12;
     }, []);

     const [contextMenu, setContextMenu] = useState<{
          x: number;
          y: number;
          type: "chart" | "text" | "box";
          id: number | string;
     } | null>(null);

     // Track z-index for each element (higher number = on top)
     const [chartZIndices, setChartZIndices] = useState<{ [key: number]: number }>({});
     const [textZIndices, setTextZIndices] = useState<{ [key: string]: number }>({});
     const [boxZIndices, setBoxZIndices] = useState<{ [key: string]: number }>({});
     const zIndexCounter = useRef(10);

     const clearSelection = () => {
          setSelectedChart(null);
          setSelectedTextId(null);
          setSelectedBoxId(null);
     };

     const handleAddText = () => {
          if (!onAddTextElement) return;
          const offset = textElements.length * 24;
          onAddTextElement({
               id: `text-${Date.now()}`,
               content: "Double-click to edit",
               x: 24 + offset,
               y: TOP_OFFSET + offset,
               width: 280,
               height: 64,
               fontSize: 16,
               fontWeight: "500",
          });
     };

     const handleAddBox = () => {
          if (!onAddBoxElement) return;
          const offset = boxElements.length * 24;
          onAddBoxElement({
               id: `box-${Date.now()}`,
               x: 24 + offset,
               y: TOP_OFFSET + offset,
               width: 320,
               height: 200,
               borderWidth: 1,
               borderRadius: 10,
          });
     };

     const bringToFront = (type: "chart" | "text" | "box", id: number | string) => {
          zIndexCounter.current += 1;
          const z = zIndexCounter.current;
          if (type === "chart") setChartZIndices((prev) => ({ ...prev, [id as number]: z }));
          if (type === "text") setTextZIndices((prev) => ({ ...prev, [id as string]: z }));
          if (type === "box") setBoxZIndices((prev) => ({ ...prev, [id as string]: z }));
     };

     const sendToBack = (type: "chart" | "text" | "box", id: number | string) => {
          if (type === "chart") setChartZIndices((prev) => ({ ...prev, [id as number]: 1 }));
          if (type === "text") setTextZIndices((prev) => ({ ...prev, [id as string]: 1 }));
          if (type === "box") setBoxZIndices((prev) => ({ ...prev, [id as string]: 1 }));
     };

     const handlePrint = () => {
          clearSelection();
          setEditingTextId(null);
          // Let the deselection render before the print snapshot
          setTimeout(() => window.print(), 100);
     };

     const handleTextDoubleClick = (textId: string) => {
          setEditingTextId(textId);
          setTimeout(() => {
               const ref = textInputRefs.current[textId];
               if (ref) {
                    ref.focus();
                    const range = document.createRange();
                    range.selectNodeContents(ref);
                    const selection = window.getSelection();
                    selection?.removeAllRanges();
                    selection?.addRange(range);
               }
          }, 50);
     };

     const handleTextBlur = useCallback(
          (textId: string, content: string) => {
               setEditingTextId(null);
               if (onUpdateTextElement && content.trim()) {
                    onUpdateTextElement(textId, { content: content.trim() });
               }
          },
          [onUpdateTextElement]
     );

     const contextMenuRef = useRef<HTMLDivElement | null>(null);

     useEffect(() => {
          const handleClickOutside = (e: MouseEvent) => {
               if (editingTextId) {
                    const ref = textInputRefs.current[editingTextId];
                    if (ref && !ref.contains(e.target as Node)) {
                         handleTextBlur(editingTextId, ref.textContent || "Text");
                    }
               }
               if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
                    setContextMenu(null);
               }
          };

          document.addEventListener("mousedown", handleClickOutside);
          return () => document.removeEventListener("mousedown", handleClickOutside);
     }, [editingTextId, handleTextBlur]);

     const handleContextMenu = (e: React.MouseEvent, type: "chart" | "text" | "box", id: number | string) => {
          e.preventDefault();
          e.stopPropagation();
          setContextMenu({ x: e.clientX, y: e.clientY, type, id });
     };

     const renderBoxElement = (boxElement: BoxElement) => {
          const isSelected = selectedBoxId === boxElement.id;

          return (
               <Rnd
                    key={boxElement.id}
                    position={{ x: boxElement.x, y: boxElement.y }}
                    size={{ width: boxElement.width, height: boxElement.height }}
                    onDragStop={(e, d) => onUpdateBoxElement?.(boxElement.id, { x: d.x, y: d.y })}
                    onResizeStop={(e, direction, ref, delta, position) =>
                         onUpdateBoxElement?.(boxElement.id, {
                              width: parseInt(ref.style.width),
                              height: parseInt(ref.style.height),
                              x: position.x,
                              y: position.y,
                         })
                    }
                    minWidth={50}
                    minHeight={50}
                    bounds="parent"
                    style={{ zIndex: boxZIndices[boxElement.id] || 5 }}
               >
                    <div
                         className={cn(
                              "group relative h-full w-full cursor-move border bg-card shadow-xs transition-shadow",
                              isSelected && "border-primary ring-2 ring-primary/20"
                         )}
                         style={{
                              ...(boxElement.backgroundColor ? { backgroundColor: boxElement.backgroundColor } : {}),
                              ...(boxElement.borderColor ? { borderColor: boxElement.borderColor } : {}),
                              borderWidth: `${boxElement.borderWidth || 1}px`,
                              borderRadius: `${boxElement.borderRadius || 10}px`,
                         }}
                         onClick={(e) => {
                              e.stopPropagation();
                              clearSelection();
                              setSelectedBoxId(isSelected ? null : boxElement.id);
                         }}
                         onContextMenu={(e) => handleContextMenu(e, "box", boxElement.id)}
                    >
                         {onRemoveBoxElement && (
                              <div
                                   className={cn(
                                        "absolute right-1.5 top-1.5 transition-opacity",
                                        isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                                   )}
                              >
                                   <RemoveButton
                                        label="Remove box"
                                        onClick={() => {
                                             onRemoveBoxElement(boxElement.id);
                                             setSelectedBoxId(null);
                                        }}
                                   />
                              </div>
                         )}
                    </div>
               </Rnd>
          );
     };

     const renderTextElement = (textElement: TextElement) => {
          const isSelected = selectedTextId === textElement.id;
          const isEditing = editingTextId === textElement.id;

          return (
               <Rnd
                    key={textElement.id}
                    position={{ x: textElement.x, y: textElement.y }}
                    size={{ width: textElement.width, height: textElement.height }}
                    onDragStop={(e, d) => onUpdateTextElement?.(textElement.id, { x: d.x, y: d.y })}
                    onResizeStop={(e, direction, ref, delta, position) =>
                         onUpdateTextElement?.(textElement.id, {
                              width: parseInt(ref.style.width),
                              height: parseInt(ref.style.height),
                              x: position.x,
                              y: position.y,
                         })
                    }
                    disableDragging={isEditing}
                    minWidth={100}
                    minHeight={36}
                    bounds="parent"
                    style={{ zIndex: textZIndices[textElement.id] || 10 }}
               >
                    <div
                         className={cn(
                              "group relative h-full w-full rounded-md px-2 py-1.5 outline-1 outline-dashed outline-transparent transition-[outline-color] hover:outline-border",
                              isSelected && "outline-primary hover:outline-primary",
                              isEditing ? "cursor-text" : "cursor-move"
                         )}
                         onClick={(e) => {
                              e.stopPropagation();
                              if (!isEditing) {
                                   clearSelection();
                                   setSelectedTextId(isSelected ? null : textElement.id);
                              }
                         }}
                         onDoubleClick={(e) => {
                              e.stopPropagation();
                              handleTextDoubleClick(textElement.id);
                         }}
                         onContextMenu={(e) => handleContextMenu(e, "text", textElement.id)}
                    >
                         <div
                              ref={(el) => {
                                   textInputRefs.current[textElement.id] = el;
                              }}
                              contentEditable={isEditing}
                              suppressContentEditableWarning
                              className="h-full w-full overflow-auto break-words text-foreground outline-none"
                              style={{
                                   fontSize: `${textElement.fontSize || 16}px`,
                                   fontWeight: textElement.fontWeight || "500",
                                   ...(textElement.color ? { color: textElement.color } : {}),
                              }}
                              onKeyDown={(e) => {
                                   if (e.key === "Escape" && isEditing) {
                                        handleTextBlur(textElement.id, e.currentTarget.textContent || "Text");
                                   }
                              }}
                         >
                              {textElement.content}
                         </div>

                         {!isEditing && onRemoveTextElement && (
                              <div
                                   className={cn(
                                        "absolute -right-2 -top-2 rounded-md border bg-card shadow-xs transition-opacity",
                                        isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                                   )}
                              >
                                   <RemoveButton
                                        label="Remove text"
                                        onClick={() => {
                                             onRemoveTextElement(textElement.id);
                                             setSelectedTextId(null);
                                        }}
                                   />
                              </div>
                         )}
                    </div>
               </Rnd>
          );
     };

     const renderChart = (chartData: ChartData, index: number) => {
          const isSelected = selectedChart === index;
          const ChartComponent = CHART_COMPONENTS[chartData.type] ?? Line;
          const data = { labels: chartData.labels, datasets: themeDatasets(chartData, theme) };

          // Tile new charts left-to-right, top-to-bottom based on the visible width
          const containerWidth = containerRef.current?.clientWidth ?? 1000;
          const columns = Math.max(1, Math.floor((containerWidth - CHART_GAP) / (CHART_WIDTH + CHART_GAP)));
          const defaultPosition = {
               x: CHART_GAP + (index % columns) * (CHART_WIDTH + CHART_GAP),
               y: TOP_OFFSET + Math.floor(index / columns) * (CHART_HEIGHT + CHART_GAP),
               width: Math.min(CHART_WIDTH, containerWidth - CHART_GAP * 2),
               height: CHART_HEIGHT,
          };

          return (
               <Rnd
                    key={chartData.id ?? `chart-${index}`}
                    default={defaultPosition}
                    minWidth={300}
                    minHeight={240}
                    bounds="parent"
                    dragHandleClassName="chart-drag-handle"
                    style={{ zIndex: chartZIndices[index] || 10 }}
               >
                    <div
                         className={cn(
                              "group flex h-full w-full flex-col rounded-xl border bg-card shadow-xs transition-shadow",
                              isSelected && "border-primary ring-2 ring-primary/20"
                         )}
                         onClick={(e) => {
                              e.stopPropagation();
                              clearSelection();
                              setSelectedChart(isSelected ? null : index);
                         }}
                         onContextMenu={(e) => handleContextMenu(e, "chart", index)}
                    >
                         <div className="chart-drag-handle flex h-11 shrink-0 cursor-move items-center justify-between gap-2 pl-4 pr-2">
                              <h3 className="truncate text-sm font-medium" title={chartData.title}>
                                   {chartData.title}
                              </h3>
                              {onRemoveChart && (
                                   <div
                                        className={cn(
                                             "transition-opacity",
                                             isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                                        )}
                                   >
                                        <RemoveButton
                                             label="Remove chart"
                                             onClick={() => {
                                                  onRemoveChart(index);
                                                  setSelectedChart(null);
                                             }}
                                        />
                                   </div>
                              )}
                         </div>
                         <div className="min-h-0 flex-1 px-4 pb-4">
                              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                              <ChartComponent data={data as any} options={chartOptions(chartData, theme) as any} />
                         </div>
                    </div>
               </Rnd>
          );
     };

     const isEmpty = charts.length === 0 && textElements.length === 0 && boxElements.length === 0;

     return (
          <div
               ref={containerRef}
               className="dashboard-print-container relative h-full w-full overflow-hidden bg-background"
               style={{
                    backgroundImage: "radial-gradient(var(--border) 1px, transparent 1px)",
                    backgroundSize: "20px 20px",
               }}
               onClick={clearSelection}
          >
               {/* Toolbar */}
               <div className="no-print absolute right-3 top-3 z-40 flex items-center gap-0.5 rounded-lg border bg-background p-0.5 shadow-xs">
                    {onAddTextElement && (
                         <Button variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground hover:text-foreground" onClick={(e) => { e.stopPropagation(); handleAddText(); }}>
                              <Type />
                              Text
                         </Button>
                    )}
                    {onAddBoxElement && (
                         <Button variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground hover:text-foreground" onClick={(e) => { e.stopPropagation(); handleAddBox(); }}>
                              <Square />
                              Box
                         </Button>
                    )}
                    <div className="mx-0.5 h-4 w-px bg-border" aria-hidden />
                    <Button
                         variant="ghost"
                         size="sm"
                         className="h-7 px-2 text-muted-foreground hover:text-foreground"
                         onClick={(e) => { e.stopPropagation(); handlePrint(); }}
                         disabled={isEmpty}
                    >
                         <Printer />
                         Print
                    </Button>
               </div>

               {boxElements.map(renderBoxElement)}
               {textElements.map(renderTextElement)}
               {charts.map(renderChart)}

               {isEmpty && (
                    <div className="absolute inset-0 flex items-center justify-center p-6">
                         <div className="max-w-sm text-center">
                              <div className="mx-auto mb-4 flex size-11 items-center justify-center rounded-lg border bg-background text-muted-foreground">
                                   <BarChart3 className="size-5" />
                              </div>
                              <h3 className="text-sm font-semibold">Your dashboard is empty</h3>
                              <p className="mt-1.5 text-sm text-muted-foreground text-pretty">
                                   Ask the assistant for a chart, like &ldquo;Chart total sales by item&rdquo;. Charts land here, where
                                   you can arrange, annotate, and print them.
                              </p>
                         </div>
                    </div>
               )}

               {/* Context Menu */}
               {contextMenu && (
                    <div
                         ref={contextMenuRef}
                         role="menu"
                         className="fixed z-50 min-w-40 rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
                         style={{ left: contextMenu.x, top: contextMenu.y }}
                         onClick={(e) => e.stopPropagation()}
                    >
                         <button
                              role="menuitem"
                              className="w-full rounded-sm px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent"
                              onClick={() => {
                                   bringToFront(contextMenu.type, contextMenu.id);
                                   setContextMenu(null);
                              }}
                         >
                              Bring to front
                         </button>
                         <button
                              role="menuitem"
                              className="w-full rounded-sm px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent"
                              onClick={() => {
                                   sendToBack(contextMenu.type, contextMenu.id);
                                   setContextMenu(null);
                              }}
                         >
                              Send to back
                         </button>
                    </div>
               )}
          </div>
     );
}
