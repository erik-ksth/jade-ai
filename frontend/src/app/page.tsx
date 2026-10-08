"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { UploadedData, ChatMessage, ChatRequest, ChartData, TextElement, BoxElement } from "../../../shared/types";
import DataTable from "@/components/DataTable";
import Dashboard from "@/components/Dashboard";
import ChatAgent from "@/components/ChatAgent";
import FileExplorer, { FileExplorerHandle } from "@/components/FileExplorer";
import SimpleTabs, { SimpleTab } from "@/components/SimpleTabs";
import WorkspaceEmptyState from "@/components/WorkspaceEmptyState";
import { Button } from "@/components/ui/button";
import { PanelLeft, PanelRight, LayoutDashboard, Files, Table2, MessageSquare } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { API_URL } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/useMediaQuery";

type MobileView = "files" | "workspace" | "assistant";

const MOBILE_VIEWS: { id: MobileView; label: string; icon: typeof Files }[] = [
  { id: "files", label: "Files", icon: Files },
  { id: "workspace", label: "Data", icon: Table2 },
  { id: "assistant", label: "Assistant", icon: MessageSquare },
];
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
  const [boxElements, setBoxElements] = useState<BoxElement[]>([]);

  // Tab system state
  const [tabs, setTabs] = useState<SimpleTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [shouldOpenTabs, setShouldOpenTabs] = useState<number | null>(null);

  const fileExplorerRef = useRef<FileExplorerHandle>(null);
  const [isUploading, setIsUploading] = useState(false);
  const isMobile = useMediaQuery("(max-width: 767px)");
  const [mobileView, setMobileView] = useState<MobileView>("workspace");

  // Refs for collapsible panels
  const fileExplorerPanelRef = useRef<ImperativePanelHandle>(null);
  const chatPanelRef = useRef<ImperativePanelHandle>(null);

  // Track panel collapsed states
  const [isFileExplorerCollapsed, setIsFileExplorerCollapsed] = useState(false);
  const [isChatCollapsed, setIsChatCollapsed] = useState(false);

  // Get the currently selected file
  const uploadedData = selectedFileIndex !== null ? files[selectedFileIndex] : null;

  // Tab management functions
  const openTabForFile = useCallback((fileIndex: number) => {
    const file = files[fileIndex];
    const tabId = `data-${fileIndex}`;

    // Check if tab already exists
    const existingTab = tabs.find(t => t.id === tabId);
    if (existingTab) {
      setActiveTabId(tabId);
      return;
    }

    // Create new tab
    const newTab: SimpleTab = {
      id: tabId,
      title: file.filename,
      type: "data",
      fileIndex: fileIndex,
      content: null, // Will be rendered dynamically
    };

    setTabs(prev => [...prev, newTab]);
    setActiveTabId(tabId);
  }, [files, tabs]);

  const openDashboardTab = useCallback(() => {
    const tabId = "dashboard";

    // Check if tab already exists
    const existingTab = tabs.find(t => t.id === tabId);
    if (existingTab) {
      setActiveTabId(tabId);
      return;
    }

    // Create new tab
    const newTab: SimpleTab = {
      id: tabId,
      title: "Dashboard",
      type: "dashboard",
      content: null, // Will be rendered dynamically
    };

    setTabs(prev => [...prev, newTab]);
    setActiveTabId(tabId);
  }, [tabs]);

  const handleTabClose = (tabId: string) => {
    const newTabs = tabs.filter(t => t.id !== tabId);
    setTabs(newTabs);

    // If closing active tab, switch to last tab
    if (activeTabId === tabId) {
      setActiveTabId(newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null);
    }
  };

  const handleTabReorder = (fromIndex: number, toIndex: number) => {
    const newTabs = [...tabs];
    const [movedTab] = newTabs.splice(fromIndex, 1);
    newTabs.splice(toIndex, 0, movedTab);
    setTabs(newTabs);
  };

  const handleTabChange = (tabId: string) => {
    setActiveTabId(tabId);

    // If it's a data tab, sync the selected file index
    if (tabId.startsWith('data-')) {
      const fileIndex = parseInt(tabId.replace('data-', ''));
      if (!isNaN(fileIndex) && fileIndex >= 0 && fileIndex < files.length && fileIndex !== selectedFileIndex) {
        activateFile(fileIndex, files);
      }
    }
  };

  // Clear backend state on page load/refresh
  useEffect(() => {
    const clearBackendState = async () => {
      try {
        await fetch(`${API_URL}/clear`, {
          method: 'POST',
        });
      } catch (error) {
        console.error('Error clearing backend state:', error);
      }
    };

    clearBackendState();
  }, []);

  // Open tabs after file upload
  useEffect(() => {
    if (shouldOpenTabs !== null && files.length > shouldOpenTabs) {
      const dataTabId = `data-${shouldOpenTabs}`;

      // Open data tab first (this will be the active tab)
      openTabForFile(shouldOpenTabs);

      // Open dashboard tab but don't focus it
      const dashboardTabId = "dashboard";
      const existingDashboardTab = tabs.find(t => t.id === dashboardTabId);
      if (!existingDashboardTab) {
        const newTab: SimpleTab = {
          id: dashboardTabId,
          title: "Dashboard",
          type: "dashboard",
          content: null,
        };
        setTabs(prev => [...prev, newTab]);
        // Keep focus on data tab by setting it as active
        setActiveTabId(dataTabId);
      }

      setShouldOpenTabs(null);
    }
  }, [files, shouldOpenTabs, tabs, openTabForFile]);

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
        case '2': // Cmd/Ctrl + 2: Toggle AI Chat
          e.preventDefault();
          if (isChatCollapsed) {
            chatPanelRef.current?.expand();
          } else {
            chatPanelRef.current?.collapse();
          }
          break;
        case '3': // Cmd/Ctrl + 3: Open Dashboard
          e.preventDefault();
          openDashboardTab();
          break;
        case '0': // Cmd/Ctrl + 0: Show All Panels
          e.preventDefault();
          fileExplorerPanelRef.current?.expand();
          chatPanelRef.current?.expand();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFileExplorerCollapsed, isChatCollapsed, openDashboardTab]);

  const handleFileUpload = (data: UploadedData | UploadedData[]) => {
    if (Array.isArray(data)) {
      // Multiple sheets uploaded at once
      const startIndex = files.length;
      setFiles(prev => [...prev, ...data]);
      setSelectedFileIndex(startIndex);
      setShouldOpenTabs(startIndex);
    } else {
      // Single file uploaded
      const newIndex = files.length;
      setFiles(prev => [...prev, data]);
      setSelectedFileIndex(newIndex);
      setShouldOpenTabs(newIndex);
    }
  };

  // Make a file the active dataset in the backend, so chat requests run against it.
  // The backend returns its current copy, which also loads not-yet-viewed Excel sheets.
  const activateFile = useCallback(async (index: number | null, fileList: UploadedData[]) => {
    setSelectedFileIndex(index);
    const file = index !== null ? fileList[index] : null;
    const key = file?.dataset_key;
    if (!key) return;

    try {
      const response = await fetch(`${API_URL}/switch-sheet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheet_name: key })
      });
      if (!response.ok) return;

      const result = await response.json();
      setFiles(prev => prev.map(f => f.dataset_key === key
        ? {
          ...f,
          rows: result.rows,
          columns: result.columns.length,
          column_names: result.columns,
          dtypes: result.dtypes,
          data: result.data,
          preview: result.data.slice(0, 5),
        }
        : f
      ));
    } catch (error) {
      console.error('Error switching dataset:', error);
    }
  }, []);

  const handleFileSelect = (index: number) => {
    openTabForFile(index);
    activateFile(index, files);
  };

  const handleFileRemove = (index: number) => {
    // Close the tab for this file if it exists
    const tabId = `data-${index}`;
    const newTabs = tabs.filter(t => t.id !== tabId);

    // Update tab indices for files after the removed one
    const updatedTabs = newTabs.map(tab => {
      if (tab.type === "data" && tab.fileIndex !== undefined && tab.fileIndex > index) {
        return {
          ...tab,
          id: `data-${tab.fileIndex - 1}`,
          fileIndex: tab.fileIndex - 1,
        };
      }
      return tab;
    });

    setTabs(updatedTabs);

    // If the removed tab was active, switch to another tab
    if (activeTabId === tabId) {
      setActiveTabId(updatedTabs.length > 0 ? updatedTabs[updatedTabs.length - 1].id : null);
    } else if (activeTabId && activeTabId.startsWith('data-')) {
      // Update active tab ID if it's after the removed file
      const activeFileIndex = parseInt(activeTabId.replace('data-', ''));
      if (activeFileIndex > index) {
        setActiveTabId(`data-${activeFileIndex - 1}`);
      }
    }

    // Remove the file
    const remainingFiles = files.filter((_, i) => i !== index);
    setFiles(remainingFiles);

    // Update selected index if needed
    if (selectedFileIndex === index) {
      activateFile(remainingFiles.length > 0 ? 0 : null, remainingFiles);
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

  const handleAddBoxElement = (boxElement: BoxElement) => {
    setBoxElements(prev => [...prev, boxElement]);
  };

  const handleUpdateBoxElement = (id: string, updates: Partial<BoxElement>) => {
    setBoxElements(prev => prev.map(elem =>
      elem.id === id ? { ...elem, ...updates } : elem
    ));
  };

  const handleRemoveBoxElement = (id: string) => {
    setBoxElements(prev => prev.filter(elem => elem.id !== id));
  };

  const handleClearConversation = () => {
    setChatMessages([]);
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
      const response = await fetch(`${API_URL}/chat/stream`, {
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
              } else if (event.type === 'error') {
                setChatMessages(prev => {
                  const newMessages = [...prev];
                  const lastIndex = newMessages.length - 1;
                  if (newMessages[lastIndex]?.role === 'assistant') {
                    newMessages[lastIndex] = {
                      ...newMessages[lastIndex],
                      error: String(event.content || 'Something went wrong while processing your request.'),
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
                  setCharts(prev => [...prev, { ...event.chart_data, id: `chart-${Date.now()}` }]);
                }

                // If data was updated, update the selected file
                if (event.data_updated && event.updated_data && selectedFileIndex !== null) {
                  const updated = event.updated_data;
                  setFiles(prev => {
                    const newFiles = [...prev];
                    const current = newFiles[selectedFileIndex];
                    if (current) {
                      newFiles[selectedFileIndex] = {
                        ...current,
                        rows: updated.rows,
                        columns: updated.columns.length,
                        column_names: updated.columns,
                        dtypes: updated.dtypes,
                        preview: updated.data.slice(0, 5),
                        data: updated.data,
                      };
                    }
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
        const lastIndex = newMessages.length - 1;
        if (newMessages[lastIndex]?.role === 'assistant') {
          newMessages[lastIndex] = {
            ...newMessages[lastIndex],
            error: "Couldn't reach the analysis server. Check that the backend is running and try again.",
          };
        }
        return newMessages;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFilesPanel = () => {
    if (isFileExplorerCollapsed) fileExplorerPanelRef.current?.expand();
    else fileExplorerPanelRef.current?.collapse();
  };

  const toggleChatPanel = () => {
    if (isChatCollapsed) chatPanelRef.current?.expand();
    else chatPanelRef.current?.collapse();
  };

  const fileExplorer = (
    <FileExplorer
      ref={fileExplorerRef}
      files={files}
      selectedFileIndex={selectedFileIndex}
      onFileSelect={(index) => {
        handleFileSelect(index);
        setMobileView("workspace");
      }}
      onFileUpload={(data) => {
        handleFileUpload(data);
        setMobileView("workspace");
      }}
      onFileRemove={handleFileRemove}
      onFileReplace={handleFileReplace}
      onUploadingChange={setIsUploading}
    />
  );

  const workspace = (
    <div className="h-full overflow-hidden bg-card">
      {tabs.length > 0 ? (
        <SimpleTabs
          tabs={tabs.map(tab => ({
            ...tab,
            content: tab.type === "data" && tab.fileIndex !== undefined
              ? <DataTable uploadedData={files[tab.fileIndex]} />
              : tab.type === "dashboard"
                ? (
                  <Dashboard
                    uploadedData={uploadedData}
                    charts={charts}
                    onRemoveChart={handleRemoveChart}
                    textElements={textElements}
                    onAddTextElement={handleAddTextElement}
                    onUpdateTextElement={handleUpdateTextElement}
                    onRemoveTextElement={handleRemoveTextElement}
                    boxElements={boxElements}
                    onAddBoxElement={handleAddBoxElement}
                    onUpdateBoxElement={handleUpdateBoxElement}
                    onRemoveBoxElement={handleRemoveBoxElement}
                  />
                )
                : null
          }))}
          activeTabId={activeTabId}
          onTabChange={handleTabChange}
          onTabClose={handleTabClose}
          onTabReorder={handleTabReorder}
        />
      ) : (
        <WorkspaceEmptyState
          hasFiles={files.length > 0}
          isUploading={isUploading}
          onUploadFile={(file) => fileExplorerRef.current?.uploadFile(file)}
          onUploadSample={() => fileExplorerRef.current?.uploadSample()}
          onBrowse={() => fileExplorerRef.current?.openFilePicker()}
        />
      )}
    </div>
  );

  const assistant = (
    <ChatAgent
      messages={chatMessages}
      onSendMessage={handleSendMessage}
      uploadedData={uploadedData}
      isLoading={isLoading}
      onClearConversation={handleClearConversation}
      onOpenDashboard={() => {
        openDashboardTab();
        setMobileView("workspace");
      }}
    />
  );

  return (
    <div className="h-dvh flex flex-col bg-background text-foreground">
      {/* Header */}
      <header className="no-print flex h-12 shrink-0 items-center justify-between border-b px-3">
        <div className="flex items-center gap-2 pl-1">
          <Image
            src="/jade_ai_icon.png"
            alt=""
            width={287}
            height={323}
            className="h-[18px] w-auto"
            priority
          />
          <span className="text-[15px] font-semibold tracking-tight">Jade AI</span>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              openDashboardTab();
              setMobileView("workspace");
            }}
            className="text-muted-foreground hover:text-foreground"
            title="Open dashboard (⌘3)"
          >
            <LayoutDashboard />
            <span className="max-md:sr-only">Dashboard</span>
          </Button>

          {!isMobile && (
            <>
              <div className="mx-1.5 h-5 w-px bg-border" aria-hidden />
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={toggleFilesPanel}
                aria-pressed={!isFileExplorerCollapsed}
                aria-label={isFileExplorerCollapsed ? "Show files panel" : "Hide files panel"}
                title={`${isFileExplorerCollapsed ? "Show" : "Hide"} files (⌘1)`}
                className={cn(
                  "hover:text-foreground",
                  isFileExplorerCollapsed ? "text-muted-foreground" : "text-foreground"
                )}
              >
                <PanelLeft />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={toggleChatPanel}
                aria-pressed={!isChatCollapsed}
                aria-label={isChatCollapsed ? "Show assistant panel" : "Hide assistant panel"}
                title={`${isChatCollapsed ? "Show" : "Hide"} assistant (⌘2)`}
                className={cn(
                  "hover:text-foreground",
                  isChatCollapsed ? "text-muted-foreground" : "text-foreground"
                )}
              >
                <PanelRight />
              </Button>
            </>
          )}
          <ThemeToggle />
        </div>
      </header>

      {isMobile ? (
        <>
          {/* Phone layout: one view at a time; all stay mounted to keep their state */}
          <main className="min-h-0 flex-1">
            <div className={cn("h-full", mobileView !== "files" && "hidden")}>{fileExplorer}</div>
            <div className={cn("h-full", mobileView !== "workspace" && "hidden")}>{workspace}</div>
            <div className={cn("h-full", mobileView !== "assistant" && "hidden")}>{assistant}</div>
          </main>
          <nav className="no-print grid h-14 shrink-0 grid-cols-3 border-t pb-[env(safe-area-inset-bottom)]" aria-label="Views">
            {MOBILE_VIEWS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setMobileView(id)}
                aria-current={mobileView === id ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors",
                  mobileView === id ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon className="size-5" />
                {label}
              </button>
            ))}
          </nav>
        </>
      ) : (
        <div className="flex-1 overflow-hidden">
          <ResizablePanelGroup direction="horizontal" className="h-full">
            <ResizablePanel
              ref={fileExplorerPanelRef}
              defaultSize={16}
              minSize={12}
              maxSize={28}
              collapsible={true}
              onCollapse={() => setIsFileExplorerCollapsed(true)}
              onExpand={() => setIsFileExplorerCollapsed(false)}
              className="no-print h-full"
            >
              {fileExplorer}
            </ResizablePanel>

            <ResizableHandle className="no-print" />

            <ResizablePanel defaultSize={56} minSize={30}>
              {workspace}
            </ResizablePanel>

            <ResizableHandle className="no-print" />

            <ResizablePanel
              ref={chatPanelRef}
              defaultSize={28}
              minSize={22}
              maxSize={40}
              collapsible={true}
              onCollapse={() => setIsChatCollapsed(true)}
              onExpand={() => setIsChatCollapsed(false)}
              className="no-print h-full"
            >
              {assistant}
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      )}
    </div>
  );
}
