"use client";

import { useState } from "react";
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

     // Custom components for markdown rendering
     const markdownComponents: Components = {
          code: (props) => {
               const { children, className } = props;
               const isInline = !className?.includes('language-');

               if (isInline) {
                    return (
                         <code className="bg-gray-200 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono border">
                              {children}
                         </code>
                    );
               }
               return (
                    <div className="bg-gray-900 text-green-400 p-3 rounded-lg font-mono text-sm border border-gray-700">
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
          <div className="w-full h-full border-l bg-gray-50 p-4">
               <Card className="h-full flex flex-col">
                    <CardHeader>
                         <div className="flex items-center justify-between">
                              <CardTitle>Chat with Agent</CardTitle>
                              {uploadedData && (
                                   <Button
                                        onClick={handleUndo}
                                        variant="outline"
                                        size="sm"
                                        className="flex items-center gap-2"
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
                                             className={`p-3 rounded-lg ${message.role === 'user'
                                                  ? 'bg-blue-100 ml-8'
                                                  : 'bg-gray-100 mr-8'
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
                                                  <div className="bg-green-100 text-green-800 p-2 rounded-lg text-sm flex items-center gap-2">
                                                       <span>✅</span>
                                                       <span>Code executed successfully - Data updated</span>
                                                  </div>
                                             </div>
                                        )}

                                        {/* Print Output Results */}
                                        {message.print_output && (
                                             <div className="mr-8">
                                                  <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                                                       <div className="text-blue-800 text-sm font-medium mb-2 flex items-center gap-2">
                                                            <span>📊</span>
                                                            <span>Code Output:</span>
                                                       </div>
                                                       <div className="bg-gray-900 text-green-400 p-2 rounded font-mono text-xs overflow-x-auto">
                                                            <pre className="whitespace-pre-wrap">{message.print_output}</pre>
                                                       </div>
                                                  </div>
                                             </div>
                                        )}

                                        {/* Narrative Output */}
                                        {message.narrative_output && (
                                             <div className="mr-8">
                                                  <div className="bg-purple-50 border border-purple-200 p-3 rounded-lg">
                                                       <div className="text-purple-800 text-sm font-medium mb-2 flex items-center gap-2">
                                                            <span>💡</span>
                                                            <span>What this means:</span>
                                                       </div>
                                                       <div className="text-purple-700 text-sm leading-relaxed prose prose-sm max-w-none">
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
                                                  <div className="bg-red-100 text-red-800 p-2 rounded-lg text-sm flex items-center gap-2">
                                                       <span>❌</span>
                                                       <span>Error: {message.error}</span>
                                                  </div>
                                             </div>
                                        )}
                                   </div>
                              ))}
                         </div>

                         {/* Loading Indicator */}
                         {isLoading && (
                              <div className="flex items-center justify-center py-4">
                                   <div className="flex items-center gap-2 text-gray-500">
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                        <span className="text-sm">AI is thinking...</span>
                                   </div>
                              </div>
                         )}

                         {/* Input */}
                         <div className="space-y-2">
                              {/* Selected File Indicator */}
                              <div className="flex items-center justify-between px-1">
                                   {uploadedData ? (
                                        <div className="flex items-center gap-2 text-xs">
                                             <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded font-medium truncate max-w-[200px]" title={uploadedData.filename}>
                                                  {uploadedData.filename}
                                             </span>
                                        </div>
                                   ) : (
                                        <div className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                                             ⚠️ No file selected - Select a file from the left panel
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
                                   />
                                   <Button
                                        onClick={handleSendMessage}
                                        size="icon"
                                        disabled={isLoading || !newMessage.trim() || !uploadedData}
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
