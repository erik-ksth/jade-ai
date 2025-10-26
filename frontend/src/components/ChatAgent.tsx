"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Send, Undo2 } from "lucide-react";
import { ChatMessage, UploadedData } from "../../../shared/types";
import ReactMarkdown from "react-markdown";
import { Components } from "react-markdown";

interface ChatAgentProps {
     messages: ChatMessage[];
     onSendMessage: (message: string) => void;
     uploadedData: UploadedData | null;
     onDataUpdate: (data: UploadedData) => void;
     isLoading: boolean;
}

export default function ChatAgent({ messages, onSendMessage, uploadedData, onDataUpdate, isLoading }: ChatAgentProps) {
     const [newMessage, setNewMessage] = useState("");
     const messagesEndRef = useRef<HTMLDivElement>(null);

     // Auto-scroll to bottom when messages change
     useEffect(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
     }, [messages, isLoading]);

     // Custom components for markdown rendering
     const markdownComponents: Components = {
          code: (props) => {
               const { children, className } = props;
               const isInline = !className?.includes('language-');

               if (isInline) {
                    return (
                         <code className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded text-sm font-mono border border-slate-200">
                              {children}
                         </code>
                    );
               }
               return (
                    <div className="bg-slate-900 text-emerald-400 p-4 rounded-lg font-mono text-sm border border-slate-700 shadow-inner">
                         <pre className="whitespace-pre-wrap overflow-x-auto">
                              {children}
                         </pre>
                    </div>
               );
          },
          p: ({ children }) => (
               <p className="mb-2 last:mb-0">{children}</p>
          ),
          strong: ({ children }) => (
               <strong className="font-semibold">{children}</strong>
          ),
          em: ({ children }) => (
               <em className="italic">{children}</em>
          ),
          ul: ({ children }) => (
               <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>
          ),
          ol: ({ children }) => (
               <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>
          ),
          li: ({ children }) => (
               <li className="text-sm">{children}</li>
          ),
          h1: ({ children }) => (
               <h1 className="text-lg font-bold mb-2">{children}</h1>
          ),
          h2: ({ children }) => (
               <h2 className="text-base font-bold mb-2">{children}</h2>
          ),
          h3: ({ children }) => (
               <h3 className="text-sm font-bold mb-1">{children}</h3>
          ),
     };

     const handleSendMessage = () => {
          if (!newMessage.trim()) return;
          onSendMessage(newMessage);
          setNewMessage("");
     };

     const handleUndo = async () => {
          if (!uploadedData) return;

          try {
               const response = await fetch('http://localhost:8000/undo', {
                    method: 'POST',
                    headers: {
                         'Content-Type': 'application/json',
                    }
               });

               if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
               }

               const result = await response.json();

               if (result.success) {
                    const updatedData: UploadedData = {
                         filename: uploadedData.filename,
                         rows: result.rows,
                         columns: result.columns.length,
                         column_names: result.columns,
                         dtypes: result.dtypes,
                         preview: result.data.slice(0, 5),
                         data: result.data
                    };

                    onDataUpdate(updatedData);
                    onSendMessage("🔄 Last operation undone successfully!");
               } else {
                    onSendMessage("❌ No operations to undo");
               }

          } catch (error) {
               console.error('Error undoing operation:', error);
               onSendMessage(`❌ Error undoing operation: ${error}`);
          }
     };

     return (
          <div className="w-full h-full border-l border-slate-200 bg-slate-50 p-4">
               <Card className="h-full flex flex-col shadow-sm border-slate-200">
                    <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                         <div className="flex items-center justify-between">
                              <CardTitle className="text-slate-700 text-base font-semibold">AI Assistant</CardTitle>
                              {uploadedData && (
                                   <Button
                                        onClick={handleUndo}
                                        variant="outline"
                                        size="sm"
                                        className="flex items-center gap-2 border-slate-300 hover:bg-slate-100 text-slate-700"
                                   >
                                        <Undo2 className="h-4 w-4" />
                                        Undo
                                   </Button>
                              )}
                         </div>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col overflow-y-auto">
                         {/* Messages */}
                         <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                              {messages.map((message, index) => (
                                   <div key={index} className="space-y-2">
                                        {/* Message Content */}
                                        <div
                                             className={`p-4 rounded-lg shadow-sm ${message.role === 'user'
                                                  ? 'bg-slate-700 text-white ml-8 border border-slate-600'
                                                  : 'bg-white mr-8 border border-slate-200'
                                                  }`}
                                        >
                                             <div className="prose prose-sm max-w-none">
                                                  <ReactMarkdown components={markdownComponents}>
                                                       {message.content}
                                                  </ReactMarkdown>
                                             </div>
                                        </div>


                                        {/* Execution Status */}
                                        {message.data_updated && (
                                             <div className="mr-8">
                                                  <div className="bg-emerald-50 text-emerald-800 p-3 rounded-lg text-sm flex items-center gap-2 border border-emerald-200 shadow-sm">
                                                       <span>✓</span>
                                                       <span className="font-medium">Code executed successfully - Data updated</span>
                                                  </div>
                                             </div>
                                        )}

                                        {/* Print Output Results */}
                                        {message.print_output && (
                                             <div className="mr-8">
                                                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg shadow-sm">
                                                       <div className="text-slate-700 text-sm font-semibold mb-2 flex items-center gap-2">
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                                            </svg>
                                                            <span>Code Output:</span>
                                                       </div>
                                                       <div className="bg-slate-900 text-emerald-400 p-3 rounded-lg font-mono text-xs overflow-x-auto shadow-inner">
                                                            <pre className="whitespace-pre-wrap">{message.print_output}</pre>
                                                       </div>
                                                  </div>
                                             </div>
                                        )}

                                        {/* Narrative Output */}
                                        {message.narrative_output && (
                                             <div className="mr-8">
                                                  <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg shadow-sm">
                                                       <div className="text-blue-800 text-sm font-semibold mb-2 flex items-center gap-2">
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                            <span>What this means:</span>
                                                       </div>
                                                       <div className="text-blue-900 text-sm leading-relaxed prose prose-sm max-w-none">
                                                            <ReactMarkdown components={markdownComponents}>
                                                                 {message.narrative_output}
                                                            </ReactMarkdown>
                                                       </div>
                                                  </div>
                                             </div>
                                        )}

                                        {/* Error Status */}
                                        {message.error && (
                                             <div className="mr-8 ml-4">
                                                  <div className="bg-red-50 text-red-800 p-3 rounded-lg text-sm flex items-center gap-2 border border-red-200 shadow-sm">
                                                       <span>✕</span>
                                                       <span className="font-medium">Error: {message.error}</span>
                                                  </div>
                                             </div>
                                        )}
                                   </div>
                              ))}
                              {/* Invisible element at the end to scroll to */}
                              <div ref={messagesEndRef} />
                         </div>

                         {/* Loading Indicator */}
                         {isLoading && (
                              <div className="flex items-center justify-center py-4">
                                   <div className="flex items-center gap-3 text-slate-600">
                                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-slate-300 border-t-slate-700"></div>
                                        <span className="text-sm font-medium">AI is thinking...</span>
                                   </div>
                              </div>
                         )}

                         {/* Input */}
                         <div className="space-y-3">
                              {/* Selected File Indicator */}
                              <div className="flex items-center justify-between px-1">
                                   {uploadedData ? (
                                        <div className="flex items-center gap-2 text-xs">
                                             <span className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg font-medium truncate max-w-[200px] border border-slate-200" title={uploadedData.filename}>
                                                  {uploadedData.filename}
                                             </span>
                                        </div>
                                   ) : (
                                        <div className="text-xs text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
                                             <span className="font-medium">⚠ No file selected</span>
                                        </div>
                                   )}
                              </div>

                              <div className="flex gap-2">
                                   <Input
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        placeholder={uploadedData ? "Ask about your data..." : "Select a file first..."}
                                        onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSendMessage()}
                                        disabled={isLoading || !uploadedData}
                                        className="border-slate-300 focus:border-slate-400 focus:ring-slate-400"
                                   />
                                   <Button
                                        onClick={handleSendMessage}
                                        size="icon"
                                        disabled={isLoading || !newMessage.trim() || !uploadedData}
                                        className="bg-slate-700 hover:bg-slate-800 text-white"
                                   >
                                        <Send className="h-4 w-4" />
                                   </Button>
                              </div>
                         </div>
                    </CardContent>
               </Card>
          </div>
     );
}
