"use client";

import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { Button } from "@/components/ui/button";
import {
     ArrowUp,
     AlertCircle,
     BarChart3,
     CheckCircle2,
     FileSpreadsheet,
     ListChecks,
     SquarePen,
     Wand2,
} from "lucide-react";
import { ChatMessage, UploadedData } from "../../../shared/types";
import ReactMarkdown, { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import CodeBlock from "@/components/CodeBlock";
import { cn } from "@/lib/utils";

interface ChatAgentProps {
     messages: ChatMessage[];
     onSendMessage: (message: string) => void;
     uploadedData: UploadedData | null;
     isLoading: boolean;
     onClearConversation?: () => void;
     onOpenDashboard?: () => void;
}

const SUGGESTIONS = [
     { icon: ListChecks, label: "Summarize this dataset" },
     { icon: Wand2, label: "Clean up missing and invalid values" },
     { icon: BarChart3, label: "Chart the most common values" },
];

const markdownComponents: Components = {
     code: ({ children, className }) => {
          const match = /language-(\w+)/.exec(className || "");
          const codeString = String(children).replace(/\n$/, "");
          const isBlock = Boolean(match) || codeString.includes("\n");

          if (!isBlock) {
               return (
                    <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.8125rem] text-foreground">
                         {children}
                    </code>
               );
          }
          return <CodeBlock code={codeString} language={match ? match[1] : "python"} />;
     },
     pre: ({ children }) => <>{children}</>,
     p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
     strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
     ul: ({ children }) => <ul className="mb-3 ml-4 list-disc space-y-1 marker:text-muted-foreground">{children}</ul>,
     ol: ({ children }) => <ol className="mb-3 ml-4 list-decimal space-y-1 marker:text-muted-foreground">{children}</ol>,
     li: ({ children }) => <li className="pl-1">{children}</li>,
     h1: ({ children }) => <h3 className="mb-2 mt-4 text-sm font-semibold first:mt-0">{children}</h3>,
     h2: ({ children }) => <h3 className="mb-2 mt-4 text-sm font-semibold first:mt-0">{children}</h3>,
     h3: ({ children }) => <h3 className="mb-2 mt-3 text-sm font-semibold first:mt-0">{children}</h3>,
     table: ({ children }) => (
          <div className="my-3 overflow-x-auto rounded-lg border">
               <table className="min-w-full text-xs">{children}</table>
          </div>
     ),
     thead: ({ children }) => <thead className="bg-muted">{children}</thead>,
     tr: ({ children }) => <tr className="border-b last:border-0">{children}</tr>,
     th: ({ children }) => <th className="px-3 py-2 text-left font-medium text-muted-foreground">{children}</th>,
     td: ({ children }) => <td className="tabular px-3 py-2">{children}</td>,
     blockquote: ({ children }) => (
          <blockquote className="my-3 rounded-md bg-muted px-3 py-2 text-muted-foreground">{children}</blockquote>
     ),
     hr: () => <hr className="my-4" />,
     a: ({ children, href }) => (
          <a href={href} target="_blank" rel="noreferrer" className="font-medium text-primary underline underline-offset-2">
               {children}
          </a>
     ),
};

function TypingIndicator() {
     return (
          <div className="flex items-center gap-2 py-1 text-sm text-muted-foreground" role="status">
               <span className="flex gap-1" aria-hidden>
                    <span className="typing-dot size-1.5 rounded-full bg-current" />
                    <span className="typing-dot size-1.5 rounded-full bg-current [animation-delay:150ms]" />
                    <span className="typing-dot size-1.5 rounded-full bg-current [animation-delay:300ms]" />
               </span>
               Thinking
          </div>
     );
}

export default function ChatAgent({
     messages,
     onSendMessage,
     uploadedData,
     isLoading,
     onClearConversation,
     onOpenDashboard,
}: ChatAgentProps) {
     const [newMessage, setNewMessage] = useState("");
     const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
     const messagesEndRef = useRef<HTMLDivElement>(null);
     const inputRef = useRef<HTMLTextAreaElement>(null);
     const messagesContainerRef = useRef<HTMLDivElement>(null);

     // Pause auto-scroll while the user reads earlier messages
     useEffect(() => {
          const container = messagesContainerRef.current;
          if (!container) return;

          const handleScroll = () => {
               const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 24;
               setAutoScrollEnabled(isAtBottom);
          };

          container.addEventListener("scroll", handleScroll);
          return () => container.removeEventListener("scroll", handleScroll);
     }, []);

     useEffect(() => {
          if (!autoScrollEnabled) return;
          requestAnimationFrame(() => {
               messagesEndRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
          });
     }, [messages, autoScrollEnabled]);

     useEffect(() => {
          if (uploadedData && !isLoading) inputRef.current?.focus();
     }, [uploadedData, isLoading]);

     // Grow the composer with its content, up to a cap
     useLayoutEffect(() => {
          const el = inputRef.current;
          // Skip while hidden (e.g. inactive mobile view): scrollHeight is 0 there
          if (!el || el.offsetParent === null) return;
          el.style.height = "auto";
          el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
     }, [newMessage]);

     const send = (text: string) => {
          const trimmed = text.trim();
          if (!trimmed || isLoading || !uploadedData) return;
          onSendMessage(trimmed);
          setNewMessage("");
          setAutoScrollEnabled(true);
     };

     const canSend = Boolean(newMessage.trim()) && !isLoading && Boolean(uploadedData);
     const lastIndex = messages.length - 1;

     return (
          <div className="flex h-full w-full flex-col bg-background">
               <div className="flex h-10 shrink-0 items-center justify-between pl-4 pr-2">
                    <h2 className="text-xs font-medium text-muted-foreground">Assistant</h2>
                    {messages.length > 0 && onClearConversation && (
                         <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={onClearConversation}
                              disabled={isLoading}
                              aria-label="Start a new conversation"
                              title="New conversation"
                              className="size-7 text-muted-foreground hover:text-foreground"
                         >
                              <SquarePen />
                         </Button>
                    )}
               </div>

               <div ref={messagesContainerRef} className="min-h-0 flex-1 overflow-y-auto px-4">
                    {messages.length === 0 ? (
                         <div className="flex h-full flex-col justify-end pb-4">
                              {uploadedData ? (
                                   <div>
                                        <p className="text-sm font-medium">What should we do with this data?</p>
                                        <p className="mt-1 text-sm text-muted-foreground text-pretty">
                                             Jade writes and runs pandas code on{" "}
                                             <span className="font-medium text-foreground">{uploadedData.filename}</span>, then
                                             explains the result.
                                        </p>
                                        <div className="mt-4 space-y-1.5">
                                             {SUGGESTIONS.map(({ icon: Icon, label }) => (
                                                  <button
                                                       key={label}
                                                       onClick={() => send(label)}
                                                       disabled={isLoading}
                                                       className="flex w-full items-center gap-2.5 rounded-lg border bg-card px-3 py-2.5 text-left text-sm transition-colors duration-150 hover:border-input hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                                                  >
                                                       <Icon className="size-4 shrink-0 text-muted-foreground" />
                                                       {label}
                                                  </button>
                                             ))}
                                        </div>
                                   </div>
                              ) : (
                                   <div className="pb-2">
                                        <p className="text-sm font-medium">No dataset yet</p>
                                        <p className="mt-1 text-sm text-muted-foreground text-pretty">
                                             Upload a file or load the sample data. Then ask Jade to clean, explain, or chart it.
                                        </p>
                                   </div>
                              )}
                         </div>
                    ) : (
                         <div className="space-y-5 py-3">
                              {messages.map((message, index) => {
                                   const isStreamingPlaceholder =
                                        message.role === "assistant" && !message.content && isLoading && index === lastIndex;

                                   if (message.role === "user") {
                                        return (
                                             <div key={index} className="animate-message-in flex justify-end">
                                                  <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-lg bg-secondary px-3 py-2 text-sm leading-relaxed">
                                                       {message.content}
                                                  </div>
                                             </div>
                                        );
                                   }

                                   return (
                                        <div key={index} className="animate-message-in text-sm leading-relaxed text-foreground">
                                             {isStreamingPlaceholder ? (
                                                  <TypingIndicator />
                                             ) : (
                                                  message.content && (
                                                       <div className="break-words">
                                                            <ReactMarkdown components={markdownComponents} remarkPlugins={[remarkGfm]}>
                                                                 {message.content}
                                                            </ReactMarkdown>
                                                       </div>
                                                  )
                                             )}

                                             {(message.data_updated || message.chart_data) && (
                                                  <div className="mt-3 flex flex-wrap gap-1.5">
                                                       {message.data_updated && (
                                                            <span className="inline-flex items-center gap-1.5 rounded-md bg-selection px-2 py-1 text-xs font-medium text-selection-foreground">
                                                                 <CheckCircle2 className="size-3.5" />
                                                                 Table updated
                                                            </span>
                                                       )}
                                                       {message.chart_data && (
                                                            <button
                                                                 onClick={onOpenDashboard}
                                                                 className="inline-flex items-center gap-1.5 rounded-md bg-selection px-2 py-1 text-xs font-medium text-selection-foreground transition-opacity hover:opacity-80"
                                                            >
                                                                 <BarChart3 className="size-3.5" />
                                                                 Chart added · View dashboard
                                                            </button>
                                                       )}
                                                  </div>
                                             )}

                                             {message.error && (
                                                  <div
                                                       role="alert"
                                                       className="mt-3 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-[13px] text-destructive"
                                                  >
                                                       <AlertCircle className="mt-0.5 size-4 shrink-0" />
                                                       <span className="leading-snug">{message.error}</span>
                                                  </div>
                                             )}
                                        </div>
                                   );
                              })}
                              <div ref={messagesEndRef} />
                         </div>
                    )}
               </div>

               {/* Composer */}
               <div className="shrink-0 px-3 pb-3 pt-1">
                    <div
                         className={cn(
                              "rounded-xl border bg-card transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/15",
                              !uploadedData && "opacity-60"
                         )}
                    >
                         <textarea
                              ref={inputRef}
                              value={newMessage}
                              rows={1}
                              onChange={(e) => setNewMessage(e.target.value)}
                              onKeyDown={(e) => {
                                   if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                                        e.preventDefault();
                                        send(newMessage);
                                   }
                              }}
                              placeholder={uploadedData ? "Ask Jade to clean, analyze, or chart…" : "Upload a dataset to start"}
                              disabled={!uploadedData}
                              aria-label="Message Jade"
                              className="block min-h-9 max-h-40 w-full resize-none bg-transparent px-3 pt-2.5 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
                         />
                         <div className="flex items-center justify-between gap-2 pb-2 pl-3 pr-2">
                              <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                                   {uploadedData && (
                                        <>
                                             <FileSpreadsheet className="size-3.5 shrink-0" />
                                             <span className="truncate" title={uploadedData.filename}>
                                                  {uploadedData.filename}
                                             </span>
                                        </>
                                   )}
                              </span>
                              <Button
                                   size="icon-sm"
                                   onClick={() => send(newMessage)}
                                   disabled={!canSend}
                                   aria-label="Send message"
                                   className="size-7 shrink-0 rounded-lg"
                              >
                                   <ArrowUp />
                              </Button>
                         </div>
                    </div>
               </div>
          </div>
     );
}
