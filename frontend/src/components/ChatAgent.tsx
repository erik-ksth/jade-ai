"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Copy, Check, Sparkles } from "lucide-react";
import { ChatMessage, UploadedData } from "../../../shared/types";
import ReactMarkdown from "react-markdown";
import { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface ChatAgentProps {
     messages: ChatMessage[];
     onSendMessage: (message: string) => void;
     uploadedData: UploadedData | null;
     isLoading: boolean;
}

export default function ChatAgent({ messages, onSendMessage, uploadedData, isLoading }: ChatAgentProps) {
     const [newMessage, setNewMessage] = useState("");
     const [copiedCode, setCopiedCode] = useState<number | null>(null);
     const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
     const messagesEndRef = useRef<HTMLDivElement>(null);
     const inputRef = useRef<HTMLInputElement>(null);
     const messagesContainerRef = useRef<HTMLDivElement>(null);

     // Detect user scrolling and disable auto-scroll
     useEffect(() => {
          const container = messagesContainerRef.current;
          if (!container) return;

          const handleScroll = () => {
               // Check if user is at the bottom (within 10px threshold)
               const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 10;

               // If user scrolls away from bottom, disable auto-scroll
               // If user scrolls back to bottom, re-enable it
               setAutoScrollEnabled(isAtBottom);
          };

          container.addEventListener('scroll', handleScroll);
          return () => container.removeEventListener('scroll', handleScroll);
     }, []);

     // Smooth auto-scroll that only works when enabled
     useEffect(() => {
          if (!autoScrollEnabled) return;

          // Use requestAnimationFrame for smoother scrolling during streaming
          requestAnimationFrame(() => {
               messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
          });
     }, [messages, autoScrollEnabled]);

     // Auto-focus input when data is uploaded
     useEffect(() => {
          if (uploadedData && !isLoading) {
               inputRef.current?.focus();
          }
     }, [uploadedData]);

     // Auto-focus input when loading completes
     useEffect(() => {
          if (!isLoading && uploadedData) {
               inputRef.current?.focus();
          }
     }, [isLoading, uploadedData]);

     // Copy code to clipboard
     const copyCode = (code: string, index: number) => {
          navigator.clipboard.writeText(code);
          setCopiedCode(index);
          setTimeout(() => setCopiedCode(null), 2000);
     };

     // Custom components for markdown rendering - accepts isUserMessage to conditionally style
     const getMarkdownComponents = (isUserMessage: boolean): Components => ({
          code: (props) => {
               const { children, className, ...rest } = props;
               const match = /language-(\w+)/.exec(className || '');
               const isInline = !match;
               const codeString = String(children).replace(/\n$/, '');
               const codeIndex = Math.random(); // Unique ID for copy button

               if (isInline) {
                    return (
                         <code className="bg-slate-100 text-rose-600 px-1.5 py-0.5 rounded text-sm font-mono border border-slate-200">
                              {children}
                         </code>
                    );
               }

               return (
                    <div className="relative group my-4">
                         <div className="absolute right-2 top-2 z-10">
                              <button
                                   onClick={() => copyCode(codeString, codeIndex)}
                                   className="opacity-0 group-hover:opacity-100 transition-opacity bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded text-xs flex items-center gap-1.5 shadow-lg"
                              >
                                   {copiedCode === codeIndex ? (
                                        <>
                                             <Check className="h-3 w-3" />
                                             <span>Copied!</span>
                                        </>
                                   ) : (
                                        <>
                                             <Copy className="h-3 w-3" />
                                             <span>Copy</span>
                                        </>
                                   )}
                              </button>
                         </div>
                         <SyntaxHighlighter
                              language={match ? match[1] : 'python'}
                              style={vscDarkPlus}
                              customStyle={{
                                   margin: '0',
                                   borderRadius: '0.5rem',
                                   fontSize: '0.875rem',
                                   padding: '1rem',
                                   border: '1px solid #334155',
                              } as any}
                              {...rest}
                         >
                              {codeString}
                         </SyntaxHighlighter>
                    </div>
               );
          },
          p: ({ children }) => (
               <p className={`mb-3 last:mb-0 leading-relaxed ${isUserMessage ? 'text-white' : 'text-slate-700'}`}>{children}</p>
          ),
          strong: ({ children }) => (
               <strong className={`font-semibold ${isUserMessage ? 'text-white' : 'text-slate-900'}`}>{children}</strong>
          ),
          em: ({ children }) => (
               <em className={`italic ${isUserMessage ? 'text-slate-200' : 'text-slate-600'}`}>{children}</em>
          ),
          ul: ({ children }) => (
               <ul className="list-disc list-outside ml-4 mb-3 space-y-1.5">{children}</ul>
          ),
          ol: ({ children }) => (
               <ol className="list-decimal list-outside ml-4 mb-3 space-y-1.5">{children}</ol>
          ),
          li: ({ children }) => (
               <li className={`text-sm leading-relaxed pl-1 ${isUserMessage ? 'text-white' : 'text-slate-700'}`}>{children}</li>
          ),
          h1: ({ children }) => (
               <h1 className={`text-xl font-bold mb-3 mt-4 first:mt-0 ${isUserMessage ? 'text-white' : 'text-slate-900'}`}>{children}</h1>
          ),
          h2: ({ children }) => (
               <h2 className={`text-lg font-bold mb-2 mt-3 first:mt-0 ${isUserMessage ? 'text-white' : 'text-slate-900'}`}>{children}</h2>
          ),
          h3: ({ children }) => (
               <h3 className={`text-base font-semibold mb-2 mt-2 first:mt-0 ${isUserMessage ? 'text-white' : 'text-slate-800'}`}>{children}</h3>
          ),
          table: ({ children }) => (
               <div className="overflow-x-auto my-4 rounded-lg border border-slate-200 shadow-sm">
                    <table className="min-w-full divide-y divide-slate-200">{children}</table>
               </div>
          ),
          thead: ({ children }) => (
               <thead className="bg-slate-50">{children}</thead>
          ),
          tbody: ({ children }) => (
               <tbody className="bg-white divide-y divide-slate-200">{children}</tbody>
          ),
          tr: ({ children }) => (
               <tr>{children}</tr>
          ),
          th: ({ children }) => (
               <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider border-b-2 border-slate-300 ${isUserMessage ? 'text-slate-200 bg-slate-600' : 'text-slate-700 bg-slate-100'}`}>{children}</th>
          ),
          td: ({ children }) => (
               <td className={`px-4 py-3 text-sm border-b border-slate-100 ${isUserMessage ? 'text-white' : 'text-slate-700'}`}>{children}</td>
          ),
          blockquote: ({ children }) => (
               <blockquote className={`border-l-4 pl-4 my-3 italic ${isUserMessage ? 'border-slate-500 text-slate-200' : 'border-slate-300 text-slate-600'}`}>{children}</blockquote>
          ),
          hr: () => (
               <hr className={`my-4 ${isUserMessage ? 'border-slate-500' : 'border-slate-200'}`} />
          ),
     });

     const handleSendMessage = () => {
          if (!newMessage.trim()) return;
          onSendMessage(newMessage);
          setNewMessage("");
          // Re-enable auto-scroll when user sends a message
          setAutoScrollEnabled(true);
          // Focus back to input after sending
          setTimeout(() => inputRef.current?.focus(), 100);
     };

     return (
          <div className="w-full h-full border-l border-slate-200 bg-slate-50 p-3">
               <div className="h-full flex flex-col">
                    <div className="flex-shrink-0 pb-3 px-1">
                         <div className="flex items-center justify-end gap-2">
                              <Sparkles className="h-5 w-5 text-slate-700" />
                         </div>
                    </div>
                    <div className="flex-1 flex flex-col overflow-y-auto px-1">
                         {/* Messages */}
                         <div ref={messagesContainerRef} className="flex-1 overflow-y-auto space-y-3 mb-3 pr-2">
                              {messages.map((message, index) => (
                                   <div key={index} className="space-y-2">
                                        {/* Message Content */}
                                        <div
                                             className={message.role === 'user'
                                                  ? 'p-3 rounded-lg shadow-sm bg-slate-700 text-white ml-8 border border-slate-600'
                                                  : 'py-1'
                                             }
                                        >
                                             <div className="prose prose-sm max-w-none">
                                                  <ReactMarkdown
                                                       components={getMarkdownComponents(message.role === 'user')}
                                                       remarkPlugins={[remarkGfm]}
                                                  >
                                                       {message.content}
                                                  </ReactMarkdown>
                                             </div>
                                        </div>

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
                              <div className="flex items-center justify-center py-2">
                                   <div className="flex items-center gap-3 text-slate-600">
                                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-slate-300 border-t-slate-700"></div>
                                        <span className="text-sm font-medium">AI is thinking...</span>
                                   </div>
                              </div>
                         )}

                         {/* Input */}
                         <div className="space-y-2">
                              {/* Selected File Indicator */}
                              <div className="flex items-center justify-between">
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
                                        ref={inputRef}
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
                    </div>
               </div>
          </div>
     );
}
