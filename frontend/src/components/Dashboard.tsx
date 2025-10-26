"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UploadedData, ChartData } from "../../../shared/types";
import { X } from "lucide-react";
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
}

export default function Dashboard({ charts, onRemoveChart }: DashboardProps) {
     const [selectedChart, setSelectedChart] = useState<number | null>(null);

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
                    className="z-10"
               >
                    <div
                         className="relative h-full w-full"
                         onClick={() => setSelectedChart(isSelected ? null : index)}
                    >
                         <Card className={`h-full w-full shadow-lg cursor-pointer transition-all duration-200 ${isSelected ? 'ring-2 ring-blue-500 shadow-xl' : 'hover:shadow-lg'
                              }`}>
                              <CardHeader className="cursor-move">
                                   <CardTitle>{chartTitle}</CardTitle>
                              </CardHeader>
                              <CardContent className="h-[calc(100%-80px)]">
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
                                   className="absolute -top-2 -right-2 h-8 w-8 rounded-full p-0 shadow-lg hover:shadow-xl z-20"
                              >
                                   <X className="h-4 w-4" />
                              </Button>
                         )}
                    </div>
               </Rnd>
          );
     };

     return (
          <div className="h-full w-full bg-gray-50 relative overflow-hidden">
               {/* Canvas Background Pattern */}
               <div
                    className="absolute inset-0"
                    style={{
                         backgroundImage:
                              'radial-gradient(circle, #d1d5db 1px, transparent 1px)',
                         backgroundSize: '20px 20px',
                    }}
               />

               {/* Render all charts */}
               {charts.map((chart, index) => renderChart(chart, index))}

               {/* Empty state when no charts */}
               {charts.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center">
                         <div className="text-center text-gray-500">
                              <div className="text-6xl mb-4">📊</div>
                              <h3 className="text-xl font-semibold mb-2">No Charts Yet</h3>
                              <p className="text-sm">Ask the AI to create a chart to get started!</p>
                         </div>
                    </div>
               )}
          </div>
     );
}
