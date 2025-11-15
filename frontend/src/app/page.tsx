"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { UploadedData, ChatMessage, ChatRequest, ChatResponse, ChartData, TextElement } from "../../../shared/types";
import DataTable from "@/components/DataTable";
import Dashboard from "@/components/Dashboard";
import ChatAgent from "@/components/ChatAgent";
import FileExplorer from "@/components/FileExplorer";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { PanelLeftClose, PanelRightClose, PanelTopClose, PanelBottomClose, LayoutGrid } from "lucide-react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
  ImperativePanelHandle,
} from "@/components/ui/resizable";

export default function Home() {
  const [files, setFiles] = useState<UploadedData[]>([]);
  const [selectedFileIndex, setSelectedFileIndex] = useState<number | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [charts, setCharts] = useState<ChartData[]>([]);
  const [textElements, setTextElements] = useState<TextElement[]>([]);

  // Refs for collapsible panels
  const fileExplorerPanelRef = useRef<ImperativePanelHandle>(null);
  const dataTablePanelRef = useRef<ImperativePanelHandle>(null);
  const dashboardPanelRef = useRef<ImperativePanelHandle>(null);
  const chatPanelRef = useRef<ImperativePanelHandle>(null);

  // Track panel collapsed states
  const [isFileExplorerCollapsed, setIsFileExplorerCollapsed] = useState(false);
  const [isDataTableCollapsed, setIsDataTableCollapsed] = useState(false);
  const [isDashboardCollapsed, setIsDashboardCollapsed] = useState(false);
  const [isChatCollapsed, setIsChatCollapsed] = useState(false);

  // Keyboard shortcuts for toggling panels
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if Cmd (Mac) or Ctrl (Windows/Linux) is pressed
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;

      if (!isCmdOrCtrl) return;

      switch (e.key) {
        case '1': // Cmd/Ctrl + 1: Toggle Files
          e.preventDefault();
          if (isFileExplorerCollapsed) {
            fileExplorerPanelRef.current?.expand();
          } else {
            fileExplorerPanelRef.current?.collapse();
          }
          break;
        case '2': // Cmd/Ctrl + 2: Toggle Data
          e.preventDefault();
          if (isDataTableCollapsed) {
            dataTablePanelRef.current?.expand();
          } else {
            dataTablePanelRef.current?.collapse();
          }
          break;
        case '3': // Cmd/Ctrl + 3: Toggle Dashboard
          e.preventDefault();
          if (isDashboardCollapsed) {
            dashboardPanelRef.current?.expand();
          } else {
            dashboardPanelRef.current?.collapse();
          }
          break;
        case '4': // Cmd/Ctrl + 4: Toggle AI Chat
          e.preventDefault();
          if (isChatCollapsed) {
            chatPanelRef.current?.expand();
          } else {
            chatPanelRef.current?.collapse();
          }
          break;
        case '0': // Cmd/Ctrl + 0: Show All Panels
          e.preventDefault();
          fileExplorerPanelRef.current?.expand();
          dataTablePanelRef.current?.expand();
          dashboardPanelRef.current?.expand();
          chatPanelRef.current?.expand();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFileExplorerCollapsed, isDataTableCollapsed, isDashboardCollapsed, isChatCollapsed]);

  // Get the currently selected file
  const uploadedData = selectedFileIndex !== null ? files[selectedFileIndex] : null;

  const handleFileUpload = (data: UploadedData | UploadedData[]) => {
    if (Array.isArray(data)) {
      // Multiple sheets uploaded at once
      setFiles(prev => [...prev, ...data]);
      // Select the first sheet of the batch
      setSelectedFileIndex(files.length);
    } else {
      // Single file uploaded
      setFiles(prev => [...prev, data]);
      // Automatically select the newly uploaded file
      setSelectedFileIndex(files.length);
    }
  };

  const handleFileSelect = async (index: number) => {
    const selectedFile = files[index];

    // If the file has a sheet_name, switch to that sheet in the backend
    if (selectedFile.sheet_name) {
      try {
        const response = await fetch('http://localhost:8000/switch-sheet', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sheet_name: selectedFile.sheet_name })
        });

        if (response.ok) {
          const result = await response.json();
          // Update the file data with the correct sheet data
          const updatedFile: UploadedData = {
            ...selectedFile,
            rows: result.rows,
            columns: result.columns.length,
            column_names: result.columns,
            dtypes: result.dtypes,
            data: result.data,
            preview: result.data.slice(0, 5)
          };

          // Update the file in the list
          setFiles(prev => {
            const newFiles = [...prev];
            newFiles[index] = updatedFile;
            return newFiles;
          });
        }
      } catch (error) {
        console.error('Error switching sheet:', error);
      }
    }

    setSelectedFileIndex(index);
  };

  const handleFileRemove = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    // Update selected index if needed
    if (selectedFileIndex === index) {
      setSelectedFileIndex(files.length > 1 ? 0 : null);
    } else if (selectedFileIndex !== null && selectedFileIndex > index) {
      setSelectedFileIndex(selectedFileIndex - 1);
    }
  };

  const handleFileReplace = (index: number, data: UploadedData) => {
    setFiles(prev => {
      const newFiles = [...prev];
      newFiles[index] = data;
      return newFiles;
    });
    // Keep the replaced file selected
    setSelectedFileIndex(index);
  };

  const handleRemoveChart = (index: number) => {
    setCharts(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddTextElement = (textElement: TextElement) => {
    setTextElements(prev => [...prev, textElement]);
  };

  const handleUpdateTextElement = (id: string, updates: Partial<TextElement>) => {
    setTextElements(prev => prev.map(elem =>
      elem.id === id ? { ...elem, ...updates } : elem
    ));
  };

  const handleRemoveTextElement = (id: string) => {
    setTextElements(prev => prev.filter(elem => elem.id !== id));
  };

  const handleSendMessage = async (message: string) => {
    // Add user message to chat
    const userMessage: ChatMessage = { role: 'user', content: message };
    setChatMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    // Create empty assistant message for streaming
    const assistantMessage: ChatMessage = {
      role: 'assistant',
      content: '',
      has_code: false,
      data_updated: false
    };
    setChatMessages(prev => [...prev, assistantMessage]);

    try {
      // Prepare chat request
      const chatRequest: ChatRequest = {
        message: message,
        chat_history: chatMessages
      };

      // Connect to streaming endpoint
      const response = await fetch('http://localhost:8000/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chatRequest)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Read streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No reader available');
      }

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);

            if (data === '[DONE]') {
              break;
            }

            try {
              const event = JSON.parse(data);

              if (event.type === 'status' || event.type === 'response') {
                // Append content to assistant message in real-time
                setChatMessages(prev => {
                  const newMessages = [...prev];
                  const lastIndex = newMessages.length - 1;
                  if (newMessages[lastIndex].role === 'assistant') {
                    // Create a new object to avoid mutation issues
                    newMessages[lastIndex] = {
                      ...newMessages[lastIndex],
                      content: newMessages[lastIndex].content + event.content
                    };
                  }
                  return newMessages;
                });
              } else if (event.type === 'complete') {
                // Update with final data
                setChatMessages(prev => {
                  const newMessages = [...prev];
                  const lastIndex = newMessages.length - 1;
                  if (newMessages[lastIndex].role === 'assistant') {
                    // Create a new object to avoid mutation issues
                    newMessages[lastIndex] = {
                      ...newMessages[lastIndex],
                      data_updated: event.data_updated,
                      chart_data: event.chart_data,
                      error: event.error
                    };
                  }
                  return newMessages;
                });

                // If chart data was created, add it to the charts array
                if (event.chart_data) {
                  setCharts(prev => [...prev, event.chart_data]);
                }

                // If data was updated, update the selected file
                if (event.data_updated && event.updated_data && selectedFileIndex !== null) {
                  const updatedData: UploadedData = {
                    filename: uploadedData?.filename || "Modified Data",
                    rows: event.updated_data.rows,
                    columns: event.updated_data.columns.length,
                    column_names: event.updated_data.columns,
                    dtypes: event.updated_data.dtypes,
                    preview: event.updated_data.data.slice(0, 5),
                    data: event.updated_data.data,
                    sheet_name: uploadedData?.sheet_name,
                    original_filename: uploadedData?.original_filename
                  };

                  setFiles(prev => {
                    const newFiles = [...prev];
                    newFiles[selectedFileIndex] = updatedData;
                    return newFiles;
                  });
                }
              }
            } catch (parseError) {
              console.error('Error parsing event:', parseError);
            }
          }
        }
      }

    } catch (error) {
      console.error('Error sending message to backend:', error);
      setChatMessages(prev => {
        const newMessages = [...prev];
        const lastMessage = newMessages[newMessages.length - 1];
        if (lastMessage.role === 'assistant' && !lastMessage.content) {
          lastMessage.content = `❌ Error connecting to backend: ${error}`;
          lastMessage.error = String(error);
        }
        return newMessages;
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className="no-print bg-white border-b border-slate-200 px-4 py-2 shadow-sm">
        <div className="flex items-center justify-between">
          <Image
            src="/jade_ai_logo.png"
            alt="Jade AI Logo"
            width={150}
            height={24}
            className="h-5 w-auto"
            priority
          />

          {/* Current File Name */}
          <div className="flex-1 flex items-center justify-center px-4">
            {uploadedData ? (
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <span className="font-medium">{uploadedData.filename}</span>
              </div>
            ) : (
              <span className="text-sm text-slate-400">No file selected</span>
            )}
          </div>

          {/* Panel Toggle Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <LayoutGrid className="h-4 w-4" />
                Panels
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => {
                if (isFileExplorerCollapsed) {
                  fileExplorerPanelRef.current?.expand();
                } else {
                  fileExplorerPanelRef.current?.collapse();
                }
              }}>
                <PanelLeftClose className="h-4 w-4 mr-2" />
                <span className="flex-1">{isFileExplorerCollapsed ? 'Show Files' : 'Hide Files'}</span>
                <span className="text-xs text-slate-500">⌘1</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                if (isDataTableCollapsed) {
                  dataTablePanelRef.current?.expand();
                } else {
                  dataTablePanelRef.current?.collapse();
                }
              }}>
                <PanelTopClose className="h-4 w-4 mr-2" />
                <span className="flex-1">{isDataTableCollapsed ? 'Show Data' : 'Hide Data'}</span>
                <span className="text-xs text-slate-500">⌘2</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                if (isDashboardCollapsed) {
                  dashboardPanelRef.current?.expand();
                } else {
                  dashboardPanelRef.current?.collapse();
                }
              }}>
                <PanelBottomClose className="h-4 w-4 mr-2" />
                <span className="flex-1">{isDashboardCollapsed ? 'Show Dashboard' : 'Hide Dashboard'}</span>
                <span className="text-xs text-slate-500">⌘3</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                if (isChatCollapsed) {
                  chatPanelRef.current?.expand();
                } else {
                  chatPanelRef.current?.collapse();
                }
              }}>
                <PanelRightClose className="h-4 w-4 mr-2" />
                <span className="flex-1">{isChatCollapsed ? 'Show AI Chat' : 'Hide AI Chat'}</span>
                <span className="text-xs text-slate-500">⌘4</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  fileExplorerPanelRef.current?.expand();
                  dataTablePanelRef.current?.expand();
                  dashboardPanelRef.current?.expand();
                  chatPanelRef.current?.expand();
                }}
              >
                <LayoutGrid className="h-4 w-4 mr-2" />
                <span className="flex-1">Show All Panels</span>
                <span className="text-xs text-slate-500">⌘0</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Left Side - File Explorer */}
          <ResizablePanel
            ref={fileExplorerPanelRef}
            defaultSize={15}
            minSize={10}
            collapsible={true}
            onCollapse={() => setIsFileExplorerCollapsed(true)}
            onExpand={() => setIsFileExplorerCollapsed(false)}
            className="no-print h-full"
          >
            <div className="h-full overflow-hidden">
              <FileExplorer
                files={files}
                selectedFileIndex={selectedFileIndex}
                onFileSelect={handleFileSelect}
                onFileUpload={handleFileUpload}
                onFileRemove={handleFileRemove}
                onFileReplace={handleFileReplace}
              />
            </div>
          </ResizablePanel>

          {/* Resize Handle between File Explorer and Middle panels */}
          <ResizableHandle className="no-print" />

          {/* Middle - Table & Dashboard */}
          <ResizablePanel defaultSize={55} minSize={20} collapsible={true}>
            <ResizablePanelGroup direction="vertical" className="h-full">
              {/* Data Table Panel */}
              <ResizablePanel
                ref={dataTablePanelRef}
                defaultSize={60}
                minSize={20}
                collapsible={true}
                onCollapse={() => setIsDataTableCollapsed(true)}
                onExpand={() => setIsDataTableCollapsed(false)}
                className="no-print h-full"
              >
                <div className="h-full overflow-hidden">
                  <DataTable uploadedData={uploadedData} />
                </div>
              </ResizablePanel>

              {/* Resize Handle between Table and Dashboard */}
              <ResizableHandle className="no-print" />

              {/* Dashboard Panel */}
              <ResizablePanel
                ref={dashboardPanelRef}
                defaultSize={40}
                minSize={20}
                collapsible={true}
                onCollapse={() => setIsDashboardCollapsed(true)}
                onExpand={() => setIsDashboardCollapsed(false)}
                className="h-full"
              >
                <div className="h-full overflow-hidden dashboard-print-container">
                  <Dashboard
                    uploadedData={uploadedData}
                    charts={charts}
                    onRemoveChart={handleRemoveChart}
                    textElements={textElements}
                    onAddTextElement={handleAddTextElement}
                    onUpdateTextElement={handleUpdateTextElement}
                    onRemoveTextElement={handleRemoveTextElement}
                  />
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>

          {/* Resize Handle between Middle and Right sides */}
          <ResizableHandle className="no-print" />

          {/* Right Side - Chat */}
          <ResizablePanel
            ref={chatPanelRef}
            defaultSize={30}
            minSize={20}
            collapsible={true}
            onCollapse={() => setIsChatCollapsed(true)}
            onExpand={() => setIsChatCollapsed(false)}
            className="no-print h-full"
          >
            <div className="h-full overflow-hidden">
              <ChatAgent
                messages={chatMessages}
                onSendMessage={handleSendMessage}
                uploadedData={uploadedData}
                isLoading={isLoading}
              />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}




