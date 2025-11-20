"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { UploadedData, ChatMessage, ChatRequest, ChatResponse, ChartData, TextElement, BoxElement } from "../../../shared/types";
import DataTable from "@/components/DataTable";
import Dashboard from "@/components/Dashboard";
import ChatAgent from "@/components/ChatAgent";
import FileExplorer from "@/components/FileExplorer";
import SimpleTabs, { SimpleTab } from "@/components/SimpleTabs";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { PanelLeftClose, PanelRightClose, LayoutGrid } from "lucide-react";
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

  // Refs for collapsible panels
  const fileExplorerPanelRef = useRef<ImperativePanelHandle>(null);
  const chatPanelRef = useRef<ImperativePanelHandle>(null);

  // Track panel collapsed states
  const [isFileExplorerCollapsed, setIsFileExplorerCollapsed] = useState(false);
  const [isChatCollapsed, setIsChatCollapsed] = useState(false);

  // Get the currently selected file
  const uploadedData = selectedFileIndex !== null ? files[selectedFileIndex] : null;

  // Tab management functions
  const openTabForFile = (fileIndex: number) => {
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
  };

  const openDashboardTab = () => {
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
  };

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
      if (!isNaN(fileIndex) && fileIndex >= 0 && fileIndex < files.length) {
        setSelectedFileIndex(fileIndex);
      }
    }
  };

  // Clear backend state on page load/refresh
  useEffect(() => {
    const clearBackendState = async () => {
      try {
        await fetch('http://localhost:8000/clear', {
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
  }, [files, shouldOpenTabs, tabs]);

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

  const handleFileSelect = async (index: number) => {
    const selectedFile = files[index];

    // Open tab for the selected file
    openTabForFile(index);

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
        <div className="grid grid-cols-3 items-center">
          {/* Left: Logo */}
          <div className="flex items-center">
            <Image
              src="/jade_ai_icon.png"
              alt="Jade AI Icon"
              width={150}
              height={24}
              className="h-5 w-auto"
              priority
            />
          </div>

          {/* Center: File Name */}
          <div className="flex items-center justify-center">
            {uploadedData ? (
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <span className="font-medium">{uploadedData.filename}</span>
              </div>
            ) : (
              <span className="text-sm text-slate-400">No file selected</span>
            )}
          </div>

          {/* Right: Buttons */}
          <div className="flex items-center justify-end gap-2">
            {/* Dashboard Button */}
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={openDashboardTab}
            >
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Dashboard
            </Button>

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
                  if (isChatCollapsed) {
                    chatPanelRef.current?.expand();
                  } else {
                    chatPanelRef.current?.collapse();
                  }
                }}>
                  <PanelRightClose className="h-4 w-4 mr-2" />
                  <span className="flex-1">{isChatCollapsed ? 'Show AI Chat' : 'Hide AI Chat'}</span>
                  <span className="text-xs text-slate-500">⌘2</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={openDashboardTab}>
                  <LayoutGrid className="h-4 w-4 mr-2" />
                  <span className="flex-1">Open Dashboard</span>
                  <span className="text-xs text-slate-500">⌘3</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    fileExplorerPanelRef.current?.expand();
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
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Left Side - File Explorer */}
          <ResizablePanel
            ref={fileExplorerPanelRef}
            defaultSize={8}
            minSize={5}
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

          {/* Middle - Tabbed Interface */}
          <ResizablePanel defaultSize={55} minSize={20}>
            <div className="h-full overflow-hidden">
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
                <div className="h-full flex items-center justify-center text-slate-400 bg-white">
                  <div className="text-center">
                    <p className="text-lg font-medium mb-2">No tabs open</p>
                    <p className="text-sm">Select a file from the left panel or open the dashboard</p>
                  </div>
                </div>
              )}
            </div>
          </ResizablePanel>

          {/* Resize Handle between Middle and Right sides */}
          <ResizableHandle className="no-print" />

          {/* Right Side - Chat */}
          <ResizablePanel
            ref={chatPanelRef}
            defaultSize={20}
            minSize={15}
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
                onClearConversation={handleClearConversation}
              />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}




