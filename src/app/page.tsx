"use client";

import { useState } from "react";
import { useAnalysis } from "@/hooks/useAnalysis";
import { QUICK_TESTS } from "@/config/constants";

import StepProgress from "@/components/ui/StepProgress";
import SummaryCard from "@/components/analysis/SummaryCard";
import MetadataPanel from "@/components/analysis/MetadataPanel";
import TocPanel from "@/components/analysis/TocPanel";
import VisualInsights from "@/components/analysis/VisualInsights";
import TableInsights from "@/components/analysis/TableInsights";
import KeywordsPanel from "@/components/analysis/KeywordsPanel";

import { Search, Zap, ExternalLink, FileText, RotateCcw, Upload, Link2, X, AlertCircle } from "lucide-react";

export default function Home() {
  const {
    inputMode,
    setInputMode,
    pdfUrl,
    setPdfUrl,
    selectedFile,
    setSelectedFile,
    isLoading,
    steps,
    statusMessage,
    result,
    error,
    handleAnalyze,
    handleQuickTest,
    handleReset,
  } = useAnalysis();

  const [isDragActive, setIsDragActive] = useState(false);
  const [localFileError, setLocalFileError] = useState<string | null>(null);

  const processFile = (file: File) => {
    setLocalFileError(null);
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setLocalFileError("Format error: Only standard PDF files (.pdf) are supported.");
      return;
    }
    if (file.size > 4.5 * 1024 * 1024) {
      setLocalFileError("Size limit exceeded: Direct uploads are limited to 4MB (due to Vercel body limits). For larger files, please paste a public URL.");
      return;
    }
    setSelectedFile(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="min-h-screen bg-[#080B12] text-white">
      {/* Ambient background glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-indigo-600/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-violet-600/8 rounded-full blur-[120px]" />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 py-10 flex flex-col gap-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-3xl font-black tracking-tight bg-gradient-to-r from-indigo-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                PDF.insight
              </span>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 tracking-wider uppercase">
                Gemini 2.5 Flash
              </span>
            </div>
            <p className="text-sm text-slate-500 max-w-md">
              Paste a public PDF URL or upload a local file. Our backend handles extraction and structured analysis using server-side Gemini AI.
            </p>
          </div>

          {(result || error || isLoading) && (
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 text-sm font-medium transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              New Analysis
            </button>
          )}
        </header>

        {/* Input & Control Panel */}
        <section className="rounded-2xl border border-white/8 bg-white/4 backdrop-blur-xl p-6 flex flex-col gap-6">
          {/* Tab Selector */}
          <div className="flex items-center border-b border-white/10 pb-1 gap-6">
            <button
              onClick={() => { setInputMode("url"); setLocalFileError(null); }}
              disabled={isLoading}
              className={`pb-3 text-sm font-semibold transition-all relative flex items-center gap-2 ${
                inputMode === "url"
                  ? "text-indigo-400"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <Link2 className="w-4 h-4" />
              Paste URL Link
              {inputMode === "url" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />
              )}
            </button>
            <button
              onClick={() => { setInputMode("upload"); setLocalFileError(null); }}
              disabled={isLoading}
              className={`pb-3 text-sm font-semibold transition-all relative flex items-center gap-2 ${
                inputMode === "upload"
                  ? "text-indigo-400"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <Upload className="w-4 h-4" />
              Upload Local File
              {inputMode === "upload" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />
              )}
            </button>
          </div>

          {/* Mode 1: URL input */}
          {inputMode === "url" && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    id="pdf-url-input"
                    type="url"
                    value={pdfUrl}
                    onChange={(e) => setPdfUrl(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                    placeholder="https://arxiv.org/pdf/1706.03762"
                    disabled={isLoading}
                    className="w-full h-12 pl-11 pr-4 rounded-xl border border-white/10 bg-black/30 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20 text-sm transition-all disabled:opacity-50"
                  />
                </div>

                <button
                  id="analyze-btn"
                  onClick={() => handleAnalyze()}
                  disabled={isLoading || !pdfUrl.trim()}
                  className="h-12 px-6 rounded-xl font-semibold text-white text-sm flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                    boxShadow: "0 4px 20px rgba(99,102,241,0.3)",
                  }}
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Analysing...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      Analyse PDF Link
                    </>
                  )}
                </button>
              </div>

              {/* Quick Tests */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] text-slate-600 font-semibold uppercase tracking-wider mr-1">
                  Try:
                </span>
                {QUICK_TESTS.map((qt) => (
                  <button
                    key={qt.url}
                    onClick={() => handleQuickTest(qt.url)}
                    disabled={isLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-white/8 bg-white/4 hover:bg-white/8 hover:border-white/12 text-slate-300 transition-all disabled:opacity-40"
                  >
                    <FileText className="w-3 h-3 text-slate-500" />
                    {qt.label}
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/15">
                      {qt.badge}
                    </span>
                  </button>
                ))}

                {pdfUrl && (
                  <a
                    href={pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    Open PDF <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Mode 2: Direct file upload */}
          {inputMode === "upload" && (
            <div className="flex flex-col gap-4">
              {!selectedFile ? (
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-3 transition-all cursor-pointer ${
                    isDragActive
                      ? "border-indigo-400 bg-indigo-500/5"
                      : "border-white/10 bg-black/20 hover:border-white/20 hover:bg-black/30"
                  }`}
                  onClick={() => document.getElementById("file-select-input")?.click()}
                >
                  <input
                    id="file-select-input"
                    type="file"
                    accept="application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="p-3 rounded-full bg-white/5 border border-white/8 text-slate-400">
                    <Upload className="w-6 h-6 animate-pulse" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-slate-300">
                      Drag & drop your PDF file here, or <span className="text-indigo-400 hover:underline">browse files</span>
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      PDF files only (Max size: 4MB due to serverless payload limits)
                    </p>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-white/10 bg-black/20 p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate" title={selectedFile.name}>
                        {selectedFile.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatFileSize(selectedFile.size)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSelectedFile(null)}
                      disabled={isLoading}
                      className="p-1.5 rounded-lg border border-white/10 hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
                      title="Clear Selection"
                    >
                      <X className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleAnalyze()}
                      disabled={isLoading}
                      className="h-10 px-5 rounded-lg font-semibold text-white text-xs flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
                      style={{
                        background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                        boxShadow: "0 4px 15px rgba(99,102,241,0.25)",
                      }}
                    >
                      {isLoading ? (
                        <>
                          <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Analysing...
                        </>
                      ) : (
                        <>
                          <Zap className="w-3.5 h-3.5" />
                          Analyse File
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Local File Error Alert */}
              {localFileError && (
                <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/5 border border-amber-500/10 p-3 rounded-lg">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{localFileError}</span>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Global Error Display */}
        {error && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-red-400 mb-1">Analysis Failed</h4>
              <p className="text-xs text-red-200/70 leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        {/* Loading progress stepper */}
        {isLoading && (
          <StepProgress steps={steps} statusMessage={statusMessage} />
        )}

        {/* Structured JSON Results Dashboard */}
        {result && !isLoading && (
          <div className="flex flex-col gap-6" id="results-dashboard">
            {/* Main Metadata Banner */}
            <div className="rounded-2xl border border-white/8 bg-white/4 backdrop-blur-xl px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    {result.documentType}
                  </span>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20">
                    {result.authors}
                  </span>
                </div>
                <h1 className="text-2xl md:text-3xl font-black text-white leading-tight">
                  {result.title}
                </h1>
              </div>
            </div>

            {/* Document summary panels */}
            <SummaryCard result={result} />

            {/* Meta stats details */}
            <MetadataPanel result={result} />

            {/* Tables of Contents structure */}
            {result.toc && result.toc.length > 0 && <TocPanel toc={result.toc} />}

            {/* Inferred Visual/Table grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <VisualInsights
                totalImages={result.metadata.total_images}
                imageInsights={result.imageInsights}
              />
              <TableInsights
                totalTables={result.metadata.total_tables}
                tableInsights={result.tableInsights}
              />
            </div>

            {/* Tag chip lists */}
            <KeywordsPanel
              keywords={result.keywords}
              mainTopics={result.mainTopics}
            />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !result && !error && (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center mb-2">
              <FileText className="w-8 h-8 text-slate-600" />
            </div>
            <h2 className="text-lg font-semibold text-slate-400">
              Ready to analyse
            </h2>
            <p className="text-sm text-slate-600 max-w-sm">
              Paste a publicly accessible PDF URL or upload a local file to generate structured summaries, topic tags, difficulty ratings, and visual insights.
            </p>
          </div>
        )}

        <footer className="pt-4 border-t border-white/5 text-center text-xs text-slate-700">
          PDF.insight v3 · Unified Next.js + Gemini 2.5 Flash
        </footer>
      </div>
    </div>
  );
}
