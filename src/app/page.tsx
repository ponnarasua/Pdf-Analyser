"use client";

import { useState, useRef } from "react";
import { streamAnalysis } from "@/services/api";
import { AnalysisResult, Step, SSEMessage } from "@/types/analysis";

import StepProgress from "@/components/StepProgress";
import SummaryCard from "@/components/SummaryCard";
import MetadataPanel from "@/components/MetadataPanel";
import TocPanel from "@/components/TocPanel";
import VisualInsights from "@/components/VisualInsights";
import TableInsights from "@/components/TableInsights";
import KeywordsPanel from "@/components/KeywordsPanel";

import { Search, Zap, ExternalLink, FileText, RotateCcw } from "lucide-react";

const INITIAL_STEPS: Step[] = [
  { name: "Downloading PDF", status: "pending" },
  { name: "Extracting Text", status: "pending" },
  { name: "Detecting Tables & Images", status: "pending" },
  { name: "AI Analysis", status: "pending" },
  { name: "Finalizing", status: "pending" },
];

const QUICK_TESTS = [
  {
    label: "Attention Is All You Need",
    url: "https://arxiv.org/pdf/1706.03762",
    badge: "Research Paper",
  },
  {
    label: "React.js Wikipedia",
    url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    badge: "Sample PDF",
  },
];

export default function Home() {
  const [pdfUrl, setPdfUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [steps, setSteps] = useState<Step[]>(INITIAL_STEPS);
  const [statusMessage, setStatusMessage] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const updateStep = (name: string, status: Step["status"]) => {
    setSteps((prev) =>
      prev.map((s) => (s.name === name ? { ...s, status } : s))
    );
  };

  const handleAnalyze = async (urlToAnalyze?: string) => {
    const target = (urlToAnalyze || pdfUrl).trim();
    if (!target) {
      setError("Please enter a PDF URL.");
      return;
    }

    // Reset state
    setIsLoading(true);
    setError(null);
    setResult(null);
    setStatusMessage("");
    setSteps(INITIAL_STEPS.map((s) => ({ ...s, status: "pending" })));

    // Cancel any in-flight request
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    try {
      await streamAnalysis(
        target,
        (msg: SSEMessage) => {
          if (msg.type === "step") {
            updateStep(msg.step, msg.status === "done" ? "done" : "active");
            if (msg.status === "active") {
              setStatusMessage(`Processing: ${msg.step}...`);
            }
          } else if (msg.type === "status") {
            setStatusMessage(msg.message);
          } else if (msg.type === "result") {
            setResult(msg.data);
            setSteps((prev) => prev.map((s) => ({ ...s, status: "done" })));
            setStatusMessage("");
          } else if (msg.type === "error") {
            setError(msg.message);
            setSteps((prev) =>
              prev.map((s) => (s.status === "active" ? { ...s, status: "error" } : s))
            );
          }
        },
        abortRef.current.signal
      );
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setError(
          err.message?.includes("fetch")
            ? "Could not connect to the backend. Make sure the FastAPI server is running at http://localhost:8000."
            : err.message || "An unexpected error occurred."
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickTest = (url: string) => {
    setPdfUrl(url);
    handleAnalyze(url);
  };

  const handleReset = () => {
    abortRef.current?.abort();
    setIsLoading(false);
    setResult(null);
    setError(null);
    setSteps(INITIAL_STEPS.map((s) => ({ ...s, status: "pending" })));
    setStatusMessage("");
  };

  return (
    <div className="min-h-screen bg-[#080B12] text-white">
      {/* Ambient background glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-indigo-600/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-violet-600/8 rounded-full blur-[120px]" />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 py-10 flex flex-col gap-10">
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
              Paste any public PDF URL below. Our backend downloads, extracts, and analyses it using AI — your API key never leaves the server.
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

        {/* Input Section */}
        <section className="rounded-2xl border border-white/8 bg-white/4 backdrop-blur-xl p-6 flex flex-col gap-4">
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
              className="h-12 px-6 rounded-xl font-semibold text-white text-sm flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
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
                  Analyse PDF
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
        </section>

        {/* Error */}
        {error && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5 flex items-start gap-3">
            <svg className="w-5 h-5 text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h4 className="text-sm font-semibold text-red-400 mb-1">Analysis Failed</h4>
              <p className="text-xs text-red-200/70 leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        {/* Loading + Step Progress */}
        {isLoading && (
          <StepProgress steps={steps} statusMessage={statusMessage} />
        )}

        {/* Results Dashboard */}
        {result && !isLoading && (
          <div className="flex flex-col gap-6" id="results-dashboard">
            {/* Title banner */}
            <div className="rounded-2xl border border-white/8 bg-white/4 backdrop-blur-xl px-6 py-5">
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

            {/* Summary + Key Takeaway */}
            <SummaryCard result={result} />

            {/* Metadata */}
            <MetadataPanel result={result} />

            {/* TOC */}
            {result.toc.length > 0 && <TocPanel toc={result.toc} />}

            {/* Visual + Table Insights grid */}
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

            {/* Keywords + Topics */}
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
              Paste a publicly accessible PDF URL above and click &ldquo;Analyse PDF&rdquo;. Works with research papers, reports, manuals, invoices and more.
            </p>
          </div>
        )}

        <footer className="pt-4 border-t border-white/5 text-center text-xs text-slate-700">
          PDF.insight v2 · Next.js + FastAPI + Gemini 2.5 Flash
        </footer>
      </div>
    </div>
  );
}
