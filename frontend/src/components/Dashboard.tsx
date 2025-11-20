"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { UploadedData, ChartData, TextElement, BoxElement } from "../../../shared/types";
import { X, Type, Printer, Square } from "lucide-react";
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
} from 'chart.js';
import {
     Line,
     Bar,
     Pie,
     Doughnut,
     PolarArea,
     Radar,
     Scatter,
     Bubble
} from 'react-chartjs-2';
import { Rnd } from 'react-rnd';

// Register Chart.js components
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
     onRemoveBoxElement
}: DashboardProps) {
     const { resolvedTheme } = useTheme();
     const [selectedChart, setSelectedChart] = useState<number | null>(null);
     const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
     const [selectedBoxId, setSelectedBoxId] = useState<string | null>(null);
     const [editingTextId, setEditingTextId] = useState<string | null>(null);
     const textInputRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
     const [chartKey, setChartKey] = useState(0);

     // Force chart re-render when theme changes
     useEffect(() => {
          setChartKey(prev => prev + 1);
     }, [resolvedTheme]);

     // Update box elements with default colors when theme changes
     useEffect(() => {
          if (!onUpdateBoxElement) return;

          boxElements.forEach(box => {
               // Only update boxes that are using default colors (white or dark slate)
               const isDefaultLightBg = box.backgroundColor === '#ffffff';
               const isDefaultDarkBg = box.backgroundColor === '#1e293b';
               const isDefaultLightBorder = box.borderColor === '#e2e8f0';
               const isDefaultDarkBorder = box.borderColor === '#475569';

               if ((isDefaultLightBg || isDefaultDarkBg) && (isDefaultLightBorder || isDefaultDarkBorder)) {
                    const isDarkMode = resolvedTheme === 'dark';
                    onUpdateBoxElement(box.id, {
                         backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
                         borderColor: isDarkMode ? '#475569' : '#e2e8f0',
                    });
               }
          });
     }, [resolvedTheme, boxElements, onUpdateBoxElement]);

     // Context menu state
     const [contextMenu, setContextMenu] = useState<{
          x: number;
          y: number;
          type: 'chart' | 'text' | 'box';
          id: number | string;
     } | null>(null);

     // Track z-index for each element (higher number = on top)
     const [chartZIndices, setChartZIndices] = useState<{ [key: number]: number }>({});
     const [textZIndices, setTextZIndices] = useState<{ [key: string]: number }>({});
     const [boxZIndices, setBoxZIndices] = useState<{ [key: string]: number }>({});
     const zIndexCounter = useRef(10);

     const handleAddText = () => {
          if (onAddTextElement) {
               // Offset each new text box so they don't stack on top of each other
               const offset = textElements.length * 30;
               // Detect dark mode for default text color
               const isDarkMode = document.documentElement.classList.contains('dark');
               const newTextElement: TextElement = {
                    id: `text-${Date.now()}`,
                    content: "Double click to edit",
                    x: 100 + offset,
                    y: 100 + offset,
                    width: 300,
                    height: 100,
                    fontSize: 16,
                    fontWeight: "normal",
                    color: isDarkMode ? "#e2e8f0" : "#1e293b",
               };
               onAddTextElement(newTextElement);
          }
     };

     const handleAddBox = () => {
          if (onAddBoxElement) {
               // Offset each new box so they don't stack on top of each other
               const offset = boxElements.length * 30;
               // Detect dark mode for default box colors
               const isDarkMode = document.documentElement.classList.contains('dark');
               const newBoxElement: BoxElement = {
                    id: `box-${Date.now()}`,
                    x: 100 + offset,
                    y: 100 + offset,
                    width: 300,
                    height: 200,
                    backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
                    borderColor: isDarkMode ? "#475569" : "#e2e8f0",
                    borderWidth: 1,
                    borderRadius: 8,
               };
               onAddBoxElement(newBoxElement);
          }
     };

     const bringChartToFront = (chartIndex: number) => {
          zIndexCounter.current += 1;
          setChartZIndices(prev => ({
               ...prev,
               [chartIndex]: zIndexCounter.current
          }));
     };

     const bringTextToFront = (textId: string) => {
          zIndexCounter.current += 1;
          setTextZIndices(prev => ({
               ...prev,
               [textId]: zIndexCounter.current
          }));
     };

     const bringBoxToFront = (boxId: string) => {
          zIndexCounter.current += 1;
          setBoxZIndices(prev => ({
               ...prev,
               [boxId]: zIndexCounter.current
          }));
     };

     const sendChartToBack = (chartIndex: number) => {
          setChartZIndices(prev => ({
               ...prev,
               [chartIndex]: 1
          }));
     };

     const sendTextToBack = (textId: string) => {
          setTextZIndices(prev => ({
               ...prev,
               [textId]: 1
          }));
     };

     const sendBoxToBack = (boxId: string) => {
          setBoxZIndices(prev => ({
               ...prev,
               [boxId]: 1
          }));
     };

     const handlePrint = () => {
          // Deselect any selected elements before printing
          setSelectedChart(null);
          setSelectedTextId(null);
          setSelectedBoxId(null);
          setEditingTextId(null);

          // Small delay to ensure state updates are reflected
          setTimeout(() => {
               window.print();
          }, 100);
     };

     const handleTextDoubleClick = (textId: string) => {
          setEditingTextId(textId);
          setTimeout(() => {
               const ref = textInputRefs.current[textId];
               if (ref) {
                    ref.focus();
                    // Select all text
                    const range = document.createRange();
                    range.selectNodeContents(ref);
                    const selection = window.getSelection();
                    selection?.removeAllRanges();
                    selection?.addRange(range);
               }
          }, 50);
     };

     const handleTextBlur = useCallback((textId: string, content: string) => {
          setEditingTextId(null);
          if (onUpdateTextElement && content.trim()) {
               onUpdateTextElement(textId, { content: content.trim() });
          }
     }, [onUpdateTextElement]);

     const contextMenuRef = useRef<HTMLDivElement | null>(null);

     useEffect(() => {
          const handleClickOutside = (e: MouseEvent) => {
               if (editingTextId) {
                    const ref = textInputRefs.current[editingTextId];
                    if (ref && !ref.contains(e.target as Node)) {
                         const content = ref.textContent || "Text";
                         handleTextBlur(editingTextId, content);
                    }
               }
               // Close context menu on any click outside of it
               if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
                    setContextMenu(null);
               }
          };

          document.addEventListener("mousedown", handleClickOutside);
          return () => document.removeEventListener("mousedown", handleClickOutside);
     }, [editingTextId, handleTextBlur]);

     const handleContextMenu = (e: React.MouseEvent, type: 'chart' | 'text' | 'box', id: number | string) => {
          e.preventDefault();
          e.stopPropagation();
          setContextMenu({
               x: e.clientX,
               y: e.clientY,
               type,
               id
          });
     };

     const handleBringToFront = () => {
          if (!contextMenu) return;

          if (contextMenu.type === 'chart') {
               bringChartToFront(contextMenu.id as number);
          } else if (contextMenu.type === 'text') {
               bringTextToFront(contextMenu.id as string);
          } else if (contextMenu.type === 'box') {
               bringBoxToFront(contextMenu.id as string);
          }

          setContextMenu(null);
     };

     const handleSendToBack = () => {
          if (!contextMenu) return;

          if (contextMenu.type === 'chart') {
               sendChartToBack(contextMenu.id as number);
          } else if (contextMenu.type === 'text') {
               sendTextToBack(contextMenu.id as string);
          } else if (contextMenu.type === 'box') {
               sendBoxToBack(contextMenu.id as string);
          }

          setContextMenu(null);
     };

     const renderBoxElement = (boxElement: BoxElement) => {
          const isSelected = selectedBoxId === boxElement.id;
          const zIndex = boxZIndices[boxElement.id] || 5; // Lower z-index so boxes stay behind

          return (
               <Rnd
                    key={boxElement.id}
                    position={{ x: boxElement.x, y: boxElement.y }}
                    size={{ width: boxElement.width, height: boxElement.height }}
                    onDragStop={(e, d) => {
                         if (onUpdateBoxElement) {
                              onUpdateBoxElement(boxElement.id, { x: d.x, y: d.y });
                         }
                    }}
                    onResizeStop={(e, direction, ref, delta, position) => {
                         if (onUpdateBoxElement) {
                              onUpdateBoxElement(boxElement.id, {
                                   width: parseInt(ref.style.width),
                                   height: parseInt(ref.style.height),
                                   x: position.x,
                                   y: position.y,
                              });
                         }
                    }}
                    minWidth={50}
                    minHeight={50}
                    bounds="parent"
                    style={{ zIndex }}
               >
                    <div
                         className={`relative h-full w-full cursor-pointer transition-all duration-200 backdrop-blur-sm shadow-lg ${isSelected
                              ? 'ring-2 ring-blue-400 dark:ring-blue-500'
                              : ''
                              }`}
                         style={{
                              backgroundColor: boxElement.backgroundColor || (resolvedTheme === 'dark' ? '#1e293b' : '#ffffff'),
                              border: `${boxElement.borderWidth || 1}px solid ${boxElement.borderColor || (resolvedTheme === 'dark' ? '#475569' : '#e2e8f0')}`,
                              borderRadius: `${boxElement.borderRadius || 8}px`,
                         }}
                         onClick={() => {
                              setSelectedBoxId(isSelected ? null : boxElement.id);
                              setSelectedChart(null);
                              setSelectedTextId(null);
                         }}
                         onContextMenu={(e) => handleContextMenu(e, 'box', boxElement.id)}
                    >
                         {/* Floating Delete Button */}
                         {isSelected && onRemoveBoxElement && (
                              <Button
                                   variant="destructive"
                                   size="sm"
                                   onClick={(e) => {
                                        e.stopPropagation();
                                        onRemoveBoxElement(boxElement.id);
                                        setSelectedBoxId(null);
                                   }}
                                   className="no-print absolute -top-3 -right-3 h-9 w-9 rounded-full p-0 shadow-lg hover:shadow-xl z-20 bg-slate-700 dark:bg-slate-600 hover:bg-slate-800 dark:hover:bg-slate-500 border-2 border-white dark:border-slate-900"
                              >
                                   <X className="h-4 w-4" />
                              </Button>
                         )}
                    </div>
               </Rnd>
          );
     };

     const renderTextElement = (textElement: TextElement) => {
          const isSelected = selectedTextId === textElement.id;
          const isEditing = editingTextId === textElement.id;
          const zIndex = textZIndices[textElement.id] || 10;

          return (
               <Rnd
                    key={textElement.id}
                    position={{ x: textElement.x, y: textElement.y }}
                    size={{ width: textElement.width, height: textElement.height }}
                    onDragStop={(e, d) => {
                         if (onUpdateTextElement) {
                              onUpdateTextElement(textElement.id, { x: d.x, y: d.y });
                         }
                    }}
                    onResizeStop={(e, direction, ref, delta, position) => {
                         if (onUpdateTextElement) {
                              onUpdateTextElement(textElement.id, {
                                   width: parseInt(ref.style.width),
                                   height: parseInt(ref.style.height),
                                   x: position.x,
                                   y: position.y,
                              });
                         }
                    }}
                    minWidth={100}
                    minHeight={40}
                    bounds="parent"
                    style={{ zIndex }}
               >
                    <div
                         className={`relative h-full w-full p-2 cursor-pointer transition-all duration-200 ${isSelected
                              ? 'ring-2 ring-blue-400 dark:ring-blue-500'
                              : ''
                              }`}
                         onClick={() => {
                              if (!isEditing) {
                                   setSelectedTextId(isSelected ? null : textElement.id);
                                   setSelectedChart(null);
                                   setSelectedBoxId(null);
                              }
                         }}
                         onDoubleClick={(e) => {
                              e.stopPropagation();
                              handleTextDoubleClick(textElement.id);
                         }}
                         onContextMenu={(e) => handleContextMenu(e, 'text', textElement.id)}
                    >
                         <div
                              ref={(el) => {
                                   textInputRefs.current[textElement.id] = el;
                              }}
                              contentEditable={isEditing}
                              suppressContentEditableWarning
                              className={`h-full w-full outline-none overflow-auto break-words text-slate-900 dark:text-slate-100 ${isEditing ? 'cursor-text' : 'cursor-pointer'
                                   }`}
                              style={{
                                   fontSize: `${textElement.fontSize || 16}px`,
                                   fontWeight: textElement.fontWeight || "normal",
                                   // Only apply color if it's not the old default dark color
                                   ...(textElement.color && textElement.color !== "#1e293b" && textElement.color !== "inherit"
                                        ? { color: textElement.color }
                                        : {}),
                              }}
                              onKeyDown={(e) => {
                                   if (e.key === 'Escape' && isEditing) {
                                        const content = e.currentTarget.textContent || "Text";
                                        handleTextBlur(textElement.id, content);
                                   }
                              }}
                         >
                              {textElement.content}
                         </div>

                         {/* Floating Delete Button */}
                         {isSelected && !isEditing && onRemoveTextElement && (
                              <Button
                                   variant="destructive"
                                   size="sm"
                                   onClick={(e) => {
                                        e.stopPropagation();
                                        onRemoveTextElement(textElement.id);
                                        setSelectedTextId(null);
                                   }}
                                   className="no-print absolute -top-3 -right-3 h-9 w-9 rounded-full p-0 shadow-lg hover:shadow-xl z-20 bg-slate-700 dark:bg-slate-600 hover:bg-slate-800 dark:hover:bg-slate-500 border-2 border-white dark:border-slate-900"
                              >
                                   <X className="h-4 w-4" />
                              </Button>
                         )}
                    </div>
               </Rnd>
          );
     };

     const renderChart = (chartData: ChartData, index: number) => {
          // Use provided chart data
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const displayChartData: any = {
               labels: chartData.labels,
               datasets: chartData.datasets,
          };

          const chartType = chartData.type;
          const chartTitle = chartData.title;
          const isSelected = selectedChart === index;
          const zIndex = chartZIndices[index] || 10;

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const getChartOptions = (type: string): any => {
               // Use theme from hook for reactive updates
               const isDarkMode = resolvedTheme === 'dark';
               const textColor = isDarkMode ? '#e2e8f0' : '#334155';
               const gridColor = isDarkMode ? '#334155' : '#e2e8f0';

               const baseOptions = {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                         legend: {
                              position: 'top' as const,
                              labels: {
                                   color: textColor,
                              },
                         },
                         title: {
                              display: false,
                         },
                    },
               };

               switch (type) {
                    case 'pie':
                    case 'doughnut':
                         return baseOptions;

                    case 'polarArea':
                    case 'radar':
                         return {
                              ...baseOptions,
                              scales: {
                                   r: {
                                        beginAtZero: true,
                                        ticks: {
                                             color: textColor,
                                        },
                                        grid: {
                                             color: gridColor,
                                        },
                                        pointLabels: {
                                             color: textColor,
                                        },
                                   },
                              },
                         };

                    case 'area':
                         return {
                              ...baseOptions,
                              scales: {
                                   x: {
                                        ticks: {
                                             color: textColor,
                                        },
                                        grid: {
                                             color: gridColor,
                                        },
                                   },
                                   y: {
                                        beginAtZero: true,
                                        ticks: {
                                             color: textColor,
                                        },
                                        grid: {
                                             color: gridColor,
                                        },
                                   },
                              },
                         };

                    case 'scatter':
                    case 'bubble':
                         return {
                              ...baseOptions,
                              scales: {
                                   x: {
                                        type: 'linear' as const,
                                        ticks: {
                                             color: textColor,
                                        },
                                        grid: {
                                             color: gridColor,
                                        },
                                   },
                                   y: {
                                        type: 'linear' as const,
                                        ticks: {
                                             color: textColor,
                                        },
                                        grid: {
                                             color: gridColor,
                                        },
                                   },
                              },
                         };

                    default: // bar, line
                         return {
                              ...baseOptions,
                              scales: {
                                   x: {
                                        ticks: {
                                             color: textColor,
                                        },
                                        grid: {
                                             color: gridColor,
                                        },
                                   },
                                   y: {
                                        beginAtZero: true,
                                        ticks: {
                                             color: textColor,
                                        },
                                        grid: {
                                             color: gridColor,
                                        },
                                   },
                              },
                         };
               }
          };

          const chartOptions = getChartOptions(chartType);

          // Select the appropriate chart component based on type
          const getChartComponent = (type: string) => {
               switch (type) {
                    case 'bar': return Bar;
                    case 'pie': return Pie;
                    case 'doughnut': return Doughnut;
                    case 'area': return Line; // Area charts are filled line charts
                    case 'bubble': return Bubble;
                    case 'polarArea': return PolarArea;
                    case 'radar': return Radar;
                    case 'scatter': return Scatter;
                    case 'line':
                    default: return Line;
               }
          };

          const ChartComponent = getChartComponent(chartType);

          return (
               <Rnd
                    key={`chart-${index}-${chartKey}`}
                    default={{
                         x: 50 + (index * 50), // Offset each chart slightly
                         y: 50 + (index * 30),
                         width: 600,
                         height: 400,
                    }}
                    minWidth={300}
                    minHeight={250}
                    bounds="parent"
                    style={{ zIndex }}
               >
                    <div
                         className="relative h-full w-full"
                         onClick={() => {
                              setSelectedChart(isSelected ? null : index);
                              setSelectedTextId(null);
                              setSelectedBoxId(null);
                         }}
                         onContextMenu={(e) => handleContextMenu(e, 'chart', index)}
                    >
                         <div className={`h-full w-full cursor-pointer transition-all duration-200 ${isSelected
                              ? 'ring-2 ring-blue-400 dark:ring-blue-500'
                              : ''
                              }`}>
                              <div className="cursor-move pb-2">
                                   <h3 className="text-slate-700 dark:text-slate-300 text-base font-semibold">{chartTitle}</h3>
                              </div>
                              <div className="h-[calc(100%-32px)]">
                                   {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                   <ChartComponent data={displayChartData as any} options={chartOptions} />
                              </div>
                         </div>

                         {/* Floating Delete Button */}
                         {isSelected && onRemoveChart && (
                              <Button
                                   variant="destructive"
                                   size="sm"
                                   onClick={(e) => {
                                        e.stopPropagation();
                                        onRemoveChart(index);
                                        setSelectedChart(null);
                                   }}
                                   className="no-print absolute -top-3 -right-3 h-9 w-9 rounded-full p-0 shadow-lg hover:shadow-xl z-20 bg-slate-700 dark:bg-slate-600 hover:bg-slate-800 dark:hover:bg-slate-500 border-2 border-white dark:border-slate-900"
                              >
                                   <X className="h-4 w-4" />
                              </Button>
                         )}
                    </div>
               </Rnd>
          );
     };

     return (
          <div className="h-full w-full relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900">
               {/* Subtle geometric background */}
               <div
                    className="absolute inset-0 opacity-30 dark:opacity-10"
                    style={{
                         backgroundImage: `linear-gradient(to right, #f1f5f9 1px, transparent 1px),
                                          linear-gradient(to bottom, #f1f5f9 1px, transparent 1px)`,
                         backgroundSize: '40px 40px',
                    }}
               />

               {/* Action Buttons */}
               <div className="absolute bottom-2 right-2 z-30 flex gap-2 no-print">
                    {/* Print Button */}
                    <Button
                         onClick={handlePrint}
                         className="h-12 w-12 rounded-full shadow-lg hover:shadow-xl bg-slate-600 dark:bg-slate-700 hover:bg-slate-700 dark:hover:bg-slate-600 border-2 border-white dark:border-slate-800"
                         title="Print Dashboard"
                    >
                         <Printer className="h-5 w-5 text-white" />
                    </Button>

                    {/* Add Box Button */}
                    {onAddBoxElement && (
                         <Button
                              onClick={handleAddBox}
                              className="h-12 w-12 rounded-full shadow-lg hover:shadow-xl bg-slate-600 dark:bg-slate-700 hover:bg-slate-700 dark:hover:bg-slate-600 border-2 border-white dark:border-slate-800"
                              title="Add Box"
                         >
                              <Square className="h-5 w-5 text-white" />
                         </Button>
                    )}

                    {/* Add Text Button */}
                    {onAddTextElement && (
                         <Button
                              onClick={handleAddText}
                              className="h-12 w-12 rounded-full shadow-lg hover:shadow-xl bg-slate-600 dark:bg-slate-700 hover:bg-slate-700 dark:hover:bg-slate-600 border-2 border-white dark:border-slate-800"
                              title="Add Text"
                         >
                              <Type className="h-5 w-5 text-white" />
                         </Button>
                    )}
               </div>

               {/* Render all box elements (behind everything) */}
               {boxElements.map((boxElement) => renderBoxElement(boxElement))}

               {/* Render all text elements */}
               {textElements.map((textElement) => renderTextElement(textElement))}

               {/* Render all charts */}
               {charts.map((chart, index) => renderChart(chart, index))}

               {/* Empty state when no charts and no text */}
               {charts.length === 0 && textElements.length === 0 && boxElements.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center">
                         <div className="text-center">
                              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center">
                                   <svg className="w-10 h-10 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                   </svg>
                              </div>
                              <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">No visualizations yet</h3>
                              <p className="text-sm text-slate-500 dark:text-slate-400">Ask the AI to create a chart or click the T button to add text</p>
                         </div>
                    </div>
               )}

               {/* Context Menu */}
               {contextMenu && (
                    <div
                         ref={contextMenuRef}
                         className="fixed bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 py-1 z-50 min-w-[180px]"
                         style={{
                              left: `${contextMenu.x}px`,
                              top: `${contextMenu.y}px`,
                         }}
                         onClick={(e) => e.stopPropagation()}
                    >
                         <button
                              className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                              onClick={handleBringToFront}
                         >
                              Bring to Front
                         </button>
                         <button
                              className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                              onClick={handleSendToBack}
                         >
                              Send to Back
                         </button>
                    </div>
               )}
          </div>
     );
}
