"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UploadedData, ChartData, TextElement } from "../../../shared/types";
import { X, Type, Printer } from "lucide-react";
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
}

export default function Dashboard({
     charts,
     onRemoveChart,
     textElements = [],
     onAddTextElement,
     onUpdateTextElement,
     onRemoveTextElement
}: DashboardProps) {
     const [selectedChart, setSelectedChart] = useState<number | null>(null);
     const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
     const [editingTextId, setEditingTextId] = useState<string | null>(null);
     const textInputRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

     // Track z-index for each element (higher number = on top)
     const [chartZIndices, setChartZIndices] = useState<{ [key: number]: number }>({});
     const [textZIndices, setTextZIndices] = useState<{ [key: string]: number }>({});
     const zIndexCounter = useRef(10);

     const handleAddText = () => {
          if (onAddTextElement) {
               // Offset each new text box so they don't stack on top of each other
               const offset = textElements.length * 30;
               const newTextElement: TextElement = {
                    id: `text-${Date.now()}`,
                    content: "Double click to edit",
                    x: 100 + offset,
                    y: 100 + offset,
                    width: 300,
                    height: 100,
                    fontSize: 16,
                    fontWeight: "normal",
                    color: "#1e293b",
               };
               onAddTextElement(newTextElement);
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

     const handlePrint = () => {
          // Deselect any selected elements before printing
          setSelectedChart(null);
          setSelectedTextId(null);
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

     useEffect(() => {
          const handleClickOutside = (e: MouseEvent) => {
               if (editingTextId) {
                    const ref = textInputRefs.current[editingTextId];
                    if (ref && !ref.contains(e.target as Node)) {
                         const content = ref.textContent || "Text";
                         handleTextBlur(editingTextId, content);
                    }
               }
          };

          document.addEventListener("mousedown", handleClickOutside);
          return () => document.removeEventListener("mousedown", handleClickOutside);
     }, [editingTextId, handleTextBlur]);

     const renderTextElement = (textElement: TextElement) => {
          const isSelected = selectedTextId === textElement.id;
          const isEditing = editingTextId === textElement.id;
          const zIndex = textZIndices[textElement.id] || 10;

          return (
               <Rnd
                    key={textElement.id}
                    position={{ x: textElement.x, y: textElement.y }}
                    size={{ width: textElement.width, height: textElement.height }}
                    onDragStart={() => {
                         bringTextToFront(textElement.id);
                    }}
                    onDragStop={(e, d) => {
                         if (onUpdateTextElement) {
                              onUpdateTextElement(textElement.id, { x: d.x, y: d.y });
                         }
                    }}
                    onResizeStart={() => {
                         bringTextToFront(textElement.id);
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
                         className={`relative h-full w-full p-2 rounded-lg backdrop-blur-sm bg-white/90 border border-slate-200 cursor-pointer transition-all duration-300 ${isSelected
                              ? 'ring-2 ring-slate-400 shadow-2xl shadow-slate-200/50 border-slate-300'
                              : 'shadow-lg shadow-slate-100 hover:shadow-xl hover:shadow-slate-200/50 hover:border-slate-300'
                              }`}
                         onClick={() => {
                              if (!isEditing) {
                                   setSelectedTextId(isSelected ? null : textElement.id);
                                   setSelectedChart(null);
                                   bringTextToFront(textElement.id);
                              }
                         }}
                         onDoubleClick={(e) => {
                              e.stopPropagation();
                              handleTextDoubleClick(textElement.id);
                         }}
                    >
                         <div
                              ref={(el) => {
                                   textInputRefs.current[textElement.id] = el;
                              }}
                              contentEditable={isEditing}
                              suppressContentEditableWarning
                              className={`h-full w-full outline-none overflow-auto break-words ${isEditing ? 'cursor-text' : 'cursor-pointer'
                                   }`}
                              style={{
                                   fontSize: `${textElement.fontSize || 16}px`,
                                   fontWeight: textElement.fontWeight || "normal",
                                   color: textElement.color || "#1e293b",
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
                                   className="no-print absolute -top-3 -right-3 h-9 w-9 rounded-full p-0 shadow-lg hover:shadow-xl z-20 bg-slate-700 hover:bg-slate-800 border-2 border-white"
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
               const baseOptions = {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                         legend: {
                              position: 'top' as const,
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
                                   },
                              },
                         };

                    case 'area':
                         return {
                              ...baseOptions,
                              scales: {
                                   y: {
                                        beginAtZero: true,
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
                                   },
                                   y: {
                                        type: 'linear' as const,
                                   },
                              },
                         };

                    default: // bar, line
                         return {
                              ...baseOptions,
                              scales: {
                                   y: {
                                        beginAtZero: true,
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
                    key={index}
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
                    onDragStart={() => {
                         bringChartToFront(index);
                    }}
                    onResizeStart={() => {
                         bringChartToFront(index);
                    }}
               >
                    <div
                         className="relative h-full w-full"
                         onClick={() => {
                              setSelectedChart(isSelected ? null : index);
                              setSelectedTextId(null);
                              bringChartToFront(index);
                         }}
                    >
                         <Card className={`h-full w-full backdrop-blur-sm bg-white/90 border-slate-200 cursor-pointer transition-all duration-300 ${isSelected
                              ? 'ring-2 ring-slate-400 shadow-2xl shadow-slate-200/50 border-slate-300'
                              : 'shadow-lg shadow-slate-100 hover:shadow-xl hover:shadow-slate-200/50 hover:border-slate-300'
                              }`}>
                              <CardHeader className="cursor-move border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                                   <CardTitle className="text-slate-700 text-base font-semibold">{chartTitle}</CardTitle>
                              </CardHeader>
                              <CardContent className="h-[calc(100%-80px)] p-3">
                                   {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                   <ChartComponent data={displayChartData as any} options={chartOptions} />
                              </CardContent>
                         </Card>

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
                                   className="no-print absolute -top-3 -right-3 h-9 w-9 rounded-full p-0 shadow-lg hover:shadow-xl z-20 bg-slate-700 hover:bg-slate-800 border-2 border-white"
                              >
                                   <X className="h-4 w-4" />
                              </Button>
                         )}
                    </div>
               </Rnd>
          );
     };

     return (
          <div className="h-full w-full relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-50">
               {/* Subtle geometric background */}
               <div
                    className="absolute inset-0 opacity-30"
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
                         className="h-12 w-12 rounded-full shadow-lg hover:shadow-xl bg-slate-600 hover:bg-slate-700 border-2 border-white"
                         title="Print Dashboard"
                    >
                         <Printer className="h-5 w-5" />
                    </Button>

                    {/* Add Text Button */}
                    {onAddTextElement && (
                         <Button
                              onClick={handleAddText}
                              className="h-12 w-12 rounded-full shadow-lg hover:shadow-xl bg-slate-600 hover:bg-slate-700 border-2 border-white"
                              title="Add Text"
                         >
                              <Type className="h-5 w-5" />
                         </Button>
                    )}
               </div>

               {/* Render all text elements */}
               {textElements.map((textElement) => renderTextElement(textElement))}

               {/* Render all charts */}
               {charts.map((chart, index) => renderChart(chart, index))}

               {/* Empty state when no charts and no text */}
               {charts.length === 0 && textElements.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center">
                         <div className="text-center">
                              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                                   <svg className="w-10 h-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                   </svg>
                              </div>
                              <h3 className="text-lg font-semibold text-slate-700 mb-2">No visualizations yet</h3>
                              <p className="text-sm text-slate-500">Ask the AI to create a chart or click the T button to add text</p>
                         </div>
                    </div>
               )}
          </div>
     );
}
