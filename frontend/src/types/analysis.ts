export interface TocEntry {
  title: string;
  page: number;
  level: number;
}

export interface DocumentMetadata {
  title: string | null;
  author: string | null;
  subject: string | null;
  pages: number;
  word_count: number;
  total_images: number;
  total_tables: number;
  estimated_reading_time: string | null;
  difficulty: string | null;
}

export interface AnalysisResult {
  documentType: string;
  title: string;
  authors: string;
  summary: string;
  keyTakeaway: string;
  keywords: string[];
  difficulty: string;
  estimatedReadingTime: string;
  mainTopics: string[];
  imageInsights: string[];
  tableInsights: string[];
  toc: TocEntry[];
  metadata: DocumentMetadata;
}

export type StepStatus = "pending" | "active" | "done" | "error";

export interface Step {
  name: string;
  status: StepStatus;
}

export interface SSEStep {
  type: "step";
  step: string;
  status: "active" | "done";
}

export interface SSEMeta {
  type: "meta";
  pages: number;
  images: number;
  tables: number;
}

export interface SSEStatus {
  type: "status";
  message: string;
}

export interface SSEResult {
  type: "result";
  data: AnalysisResult;
}

export interface SSEError {
  type: "error";
  message: string;
}

export type SSEMessage = SSEStep | SSEMeta | SSEStatus | SSEResult | SSEError;
