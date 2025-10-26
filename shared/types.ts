export interface UploadedData {
  filename: string;
  rows: number;
  columns: number;
  column_names: string[];
  dtypes: Record<string, string>;
  preview: Record<string, unknown>[];
  data: Record<string, unknown>[];
  sheet_name?: string; // Optional: which sheet this data represents
  original_filename?: string; // Optional: the original file name before adding sheet suffix
}

export interface ChartData {
  type:
    | "line"
    | "bar"
    | "pie"
    | "doughnut"
    | "area"
    | "bubble"
    | "polarArea"
    | "radar"
    | "scatter"
    | "mixed";
  labels: string[];
  datasets: {
    label: string;
    data:
      | number[]
      | { x: number; y: number }[]
      | { x: number; y: number; r: number }[];
    borderColor?: string | string[];
    backgroundColor?: string | string[];
    fill?: boolean;
    tension?: number;
    type?: "line" | "bar" | "scatter";
    pointRadius?: number;
    pointHoverRadius?: number;
  }[];
  title: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  pandas_code?: string;
  has_code?: boolean;
  data_updated?: boolean;
  error?: string;
  print_output?: string;
  narrative_output?: string;
  chart_data?: ChartData;
}

export interface ChatRequest {
  message: string;
  chat_history: ChatMessage[];
}

export interface TextElement {
  id: string;
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize?: number;
  fontWeight?: string;
  color?: string;
}

export interface ChatResponse {
  response: string;
  pandas_code: string | null;
  has_code: boolean;
  data_updated: boolean;
  updated_data: {
    data: Record<string, unknown>[];
    columns: string[];
    rows: number;
    dtypes: Record<string, string>;
  } | null;
  error: string | null;
  print_output: string | null;
  narrative_output: string | null;
  chart_data: ChartData | null;
}
