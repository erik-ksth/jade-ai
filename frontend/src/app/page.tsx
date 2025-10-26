"use client";

import { useState } from "react";
import Image from "next/image";
import { UploadedData, ChatMessage, ChatRequest, ChatResponse, ChartData, TextElement } from "../../../shared/types";
import DataTable from "@/components/DataTable";
import Dashboard from "@/components/Dashboard";
import ChatAgent from "@/components/ChatAgent";
import FileExplorer from "@/components/FileExplorer";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

export default function Home() {
  const [files, setFiles] = useState<UploadedData[]>([]);
  const [selectedFileIndex, setSelectedFileIndex] = useState<number | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [charts, setCharts] = useState<ChartData[]>([]);
  const [textElements, setTextElements] = useState<TextElement[]>([]);

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

    try {
      // Prepare chat request
      const chatRequest: ChatRequest = {
        message: message,
        chat_history: chatMessages
      };

      // Send to new chat endpoint
      const response = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chatRequest)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: ChatResponse = await response.json();

      // Create assistant message with full response
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: result.response,
        pandas_code: result.pandas_code || undefined,
        has_code: result.has_code,
        data_updated: result.data_updated,
        error: result.error || undefined,
        print_output: result.print_output || undefined,
        narrative_output: result.narrative_output || undefined,
        chart_data: result.chart_data || undefined
      };

      // Add assistant message to chat
      setChatMessages(prev => [...prev, assistantMessage]);

      // If chart data was created, add it to the charts array
      if (result.chart_data) {
        setCharts(prev => [...prev, result.chart_data!]);
      }

      // If data was updated, update the selected file
      if (result.data_updated && result.updated_data && selectedFileIndex !== null) {
        const updatedData: UploadedData = {
          filename: uploadedData?.filename || "Modified Data",
          rows: result.updated_data.rows,
          columns: result.updated_data.columns.length,
          column_names: result.updated_data.columns,
          dtypes: result.updated_data.dtypes,
          preview: result.updated_data.data.slice(0, 5),
          data: result.updated_data.data,
          sheet_name: uploadedData?.sheet_name,
          original_filename: uploadedData?.original_filename
        };

        setFiles(prev => {
          const newFiles = [...prev];
          newFiles[selectedFileIndex] = updatedData;
          return newFiles;
        });
      }

    } catch (error) {
      console.error('Error sending message to backend:', error);
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: `❌ Error connecting to backend: ${error}`,
        error: String(error)
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className="no-print bg-white border-b border-slate-200 px-8 py-5 shadow-sm">
        <div className="flex items-center gap-3">
          <Image
            src="/jade_ai_logo.png"
            alt="Jade AI Logo"
            width={200}
            height={32}
            className="h-8 w-auto"
            priority
          />
          <span className="text-sm text-slate-400 font-normal">Data Analytics</span>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Left Side - File Explorer */}
          <ResizablePanel defaultSize={15} minSize={10} collapsible={true} className="no-print h-full">
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
              <ResizablePanel defaultSize={60} minSize={20} collapsible={true} className="no-print h-full">
                <div className="h-full overflow-hidden">
                  <DataTable uploadedData={uploadedData} />
                </div>
              </ResizablePanel>

              {/* Resize Handle between Table and Dashboard */}
              <ResizableHandle className="no-print" />

              {/* Dashboard Panel */}
              <ResizablePanel defaultSize={40} minSize={20} collapsible={true} className="h-full">
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
          <ResizablePanel defaultSize={30} minSize={20} collapsible={true} className="no-print h-full">
            <div className="h-full overflow-hidden">
              <ChatAgent
                messages={chatMessages}
                onSendMessage={handleSendMessage}
                uploadedData={uploadedData}
                onDataUpdate={(data) => {
                  if (selectedFileIndex !== null) {
                    setFiles(prev => {
                      const newFiles = [...prev];
                      newFiles[selectedFileIndex] = data;
                      return newFiles;
                    });
                  }
                }}
                isLoading={isLoading}
              />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}




