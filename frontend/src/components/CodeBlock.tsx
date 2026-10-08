"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import { Check, ChevronRight, Copy } from "lucide-react";
import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter";
import python from "react-syntax-highlighter/dist/esm/languages/prism/python";
import { oneDark, oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { cn } from "@/lib/utils";

interface CodeBlockProps {
     code: string;
     language?: string;
}

// Only Python is generated; other languages (e.g. "text" output) render unhighlighted
SyntaxHighlighter.registerLanguage("python", python);

const EXAMPLE_MARKER = /^#\s*EXAMPLE ONLY\s*\n?/i;

export default function CodeBlock({ code, language = "python" }: CodeBlockProps) {
     const { resolvedTheme } = useTheme();
     const [open, setOpen] = useState(false);
     const [copied, setCopied] = useState(false);

     const isExample = EXAMPLE_MARKER.test(code);
     const displayCode = code.replace(EXAMPLE_MARKER, "");
     const lineCount = displayCode.split("\n").length;
     const isOutput = language === "text" || language === "plaintext";
     const languageLabel = isOutput ? "Output" : language === "python" ? "Python" : language;

     const copy = async () => {
          try {
               await navigator.clipboard.writeText(displayCode);
               setCopied(true);
               setTimeout(() => setCopied(false), 1500);
          } catch {
               // Clipboard can be unavailable (permissions, insecure context); fail quietly.
          }
     };

     const style = resolvedTheme === "dark" ? oneDark : oneLight;

     return (
          <div className="my-3 overflow-hidden rounded-lg border bg-code">
               <div className="flex h-8 items-center gap-1 pl-1 pr-1">
                    <button
                         onClick={() => setOpen((v) => !v)}
                         aria-expanded={open}
                         className="flex h-6 flex-1 items-center gap-1.5 rounded px-1.5 text-left text-xs text-muted-foreground transition-colors hover:text-foreground"
                    >
                         <ChevronRight
                              className={cn("size-3.5 transition-transform duration-200", open && "rotate-90")}
                         />
                         <span className="font-medium text-foreground">{isExample ? "Example code" : languageLabel}</span>
                         <span className="tabular">
                              · {lineCount} {lineCount === 1 ? "line" : "lines"}
                         </span>
                         {!open && <span className="ml-auto pr-1">Show</span>}
                    </button>
                    <button
                         onClick={copy}
                         aria-label={copied ? "Copied" : "Copy code"}
                         title={copied ? "Copied" : "Copy code"}
                         className="flex size-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                         {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
                    </button>
               </div>
               {open && (
                    <div className="border-t">
                         <SyntaxHighlighter
                              language={language}
                              // eslint-disable-next-line @typescript-eslint/no-explicit-any
                              style={style as any}
                              customStyle={{
                                   margin: 0,
                                   padding: "0.75rem 0.875rem",
                                   background: "transparent",
                                   fontSize: "12px",
                                   lineHeight: 1.6,
                              }}
                              codeTagProps={{
                                   style: {
                                        fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
                                        background: "transparent",
                                   },
                              }}
                         >
                              {displayCode}
                         </SyntaxHighlighter>
                    </div>
               )}
          </div>
     );
}
