"use client";

import { useState, useEffect } from "react";

interface AnalysisResult {
  documentType: string;
  title: string;
  authors: string;
  summary: string;
  keyTakeaway: string;
}

interface HistoricalAnalysis {
  url: string;
  title: string;
  date: string;
  result: AnalysisResult;
}

export default function Home() {
  const [pdfUrl, setPdfUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoricalAnalysis[]>([]);
  const [showPreview, setShowPreview] = useState(true);

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("pdf_analyser_history");
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load history from localStorage:", e);
    }
  }, []);

  // Save history to localStorage
  const saveToHistory = (url: string, title: string, analysisResult: AnalysisResult) => {
    try {
      const newHistoryItem: HistoricalAnalysis = {
        url,
        title,
        date: new Date().toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        result: analysisResult,
      };

      // Remove duplicate URLs if they exist
      const filtered = history.filter((item) => item.url.toLowerCase() !== url.toLowerCase());
      const updated = [newHistoryItem, ...filtered].slice(0, 5); // Keep last 5

      setHistory(updated);
      localStorage.setItem("pdf_analyser_history", JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to save history to localStorage:", e);
    }
  };

  // Clear history
  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem("pdf_analyser_history");
  };

  const handleAnalyze = async (urlToAnalyze?: string) => {
    const targetUrl = urlToAnalyze || pdfUrl;
    if (!targetUrl || !targetUrl.trim()) {
      setError("Please enter a valid PDF URL.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);
    setStatusMessage("Connecting to server...");

    // Update status in steps for visual interest and realism
    const statusSteps = [
      { text: "Downloading target PDF...", delay: 800 },
      { text: "Reading document structure...", delay: 2200 },
      { text: "Analyzing content with Gemini AI...", delay: 4000 },
      { text: "Formatting structured insights...", delay: 7500 },
    ];

    const timers = statusSteps.map((step) =>
      setTimeout(() => {
        setStatusMessage(step.text);
      }, step.delay)
    );

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pdfUrl: targetUrl }),
      });

      const data = await response.json();

      // Clear the timers
      timers.forEach((t) => clearTimeout(t));

      if (!response.ok) {
        throw new Error(data.error || "Failed to analyze the PDF.");
      }

      setResult(data);
      saveToHistory(targetUrl, data.title, data);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred. Please check the URL and try again.");
    } finally {
      // Clear timers in case of immediate failure
      timers.forEach((t) => clearTimeout(t));
      setIsLoading(false);
      setStatusMessage("");
    }
  };

  const handleQuickTest = (url: string) => {
    setPdfUrl(url);
    handleAnalyze(url);
  };

  const loadFromHistory = (item: HistoricalAnalysis) => {
    setPdfUrl(item.url);
    setResult(item.result);
    setError(null);
  };

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col max-w-[1600px] mx-auto">
      {/* Header */}
      <header className="flex flex-col md:flex-row items-center justify-between mb-8 pb-6 border-b border-white/5">
        <div className="text-center md:text-left mb-4 md:mb-0">
          <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
            <span className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent" style={{ fontFamily: "var(--font-heading)" }}>
              PDF.insight
            </span>
            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Gemini 2.0
            </span>
          </div>
          <p className="text-sm text-slate-400 max-w-md">
            Analyze any public PDF URL on the server. Get structured insights instantly.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-white/5 bg-white/5 hover:bg-white/10 transition-colors"
          >
            {showPreview ? (
              <>
                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
                Hide PDF Preview
              </>
            ) : (
              <>
                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Show PDF Preview
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Layout Grid */}
      <main className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start flex-1">
        {/* Left Column: Input and Analysis (Takes 7 cols if preview shown, 12 if hidden) */}
        <section className={`flex flex-col gap-6 transition-all duration-300 ${showPreview ? "lg:col-span-7 xl:col-span-8" : "lg:col-span-12"}`}>
          
          {/* URL Input Form */}
          <div className="glass p-6 rounded-2xl flex flex-col gap-4 relative overflow-hidden">
            {/* Background Glow accent */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>
            
            <label className="text-sm font-semibold tracking-wide text-slate-300 uppercase" style={{ fontFamily: "var(--font-heading)" }}>
              Analyze Document URL
            </label>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <input
                  type="url"
                  placeholder="Paste publicly accessible PDF URL (e.g., https://example.com/file.pdf)"
                  value={pdfUrl}
                  onChange={(e) => setPdfUrl(e.target.value)}
                  disabled={isLoading}
                  className="w-full h-12 pl-11 pr-4 rounded-xl border border-white/10 bg-black/30 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm"
                />
                <svg className="w-5 h-5 text-slate-500 absolute left-4 top-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>

              <button
                onClick={() => handleAnalyze()}
                disabled={isLoading || !pdfUrl.trim()}
                className="h-12 px-6 rounded-xl font-medium text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover-scale flex items-center justify-center gap-2"
                style={{
                  background: "linear-gradient(135deg, var(--primary), var(--secondary))",
                  boxShadow: "0 4px 20px rgba(99, 102, 241, 0.25)",
                }}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                    <span>Analyze PDF</span>
                  </>
                )}
              </button>
            </div>

            {/* Quick Test Links */}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="text-xs text-slate-500 font-medium mr-1">Quick Test:</span>
              <button
                onClick={() => handleQuickTest("https://arxiv.org/pdf/1706.03762")}
                disabled={isLoading}
                className="px-3 py-1.5 text-xs rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/10 text-slate-300 transition-all font-medium"
              >
                Vaswani et al. (Attention Paper)
              </button>
              <button
                onClick={() => handleQuickTest("https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf")}
                disabled={isLoading}
                className="px-3 py-1.5 text-xs rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/10 text-slate-300 transition-all font-medium"
              >
                Simple Dummy PDF
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="glass p-4 rounded-xl border-red-500/20 bg-red-500/5 flex items-start gap-3">
              <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <h4 className="text-sm font-semibold text-red-400">Analysis Failed</h4>
                <p className="text-xs text-red-200/80 mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Loading Shimmer Loader */}
          {isLoading && (
            <div className="glass p-6 rounded-2xl flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-24 rounded shimmer-bg"></div>
                  <div className="h-5 w-40 rounded shimmer-bg"></div>
                </div>
                <div className="h-8 w-3/4 rounded shimmer-bg mt-2"></div>
              </div>

              {/* Status Stepper */}
              <div className="py-4 border-y border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <svg className="animate-spin h-5 w-5 text-indigo-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span className="text-sm font-medium text-slate-300">{statusMessage}</span>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div className="h-4 w-full rounded shimmer-bg"></div>
                <div className="h-4 w-5/6 rounded shimmer-bg"></div>
                <div className="h-4 w-4/5 rounded shimmer-bg"></div>
              </div>

              <div className="h-20 w-full rounded shimmer-bg"></div>
            </div>
          )}

          {/* Analysis Results Display */}
          {result && !isLoading && (
            <div className="glass p-6 rounded-2xl flex flex-col gap-6 relative overflow-hidden">
              {/* Corner accent glow */}
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

              {/* Badges / Document Meta */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {result.documentType}
                </div>

                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-violet-500/10 text-violet-400 border border-violet-500/20">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="truncate max-w-[200px]" title={result.authors}>
                    {result.authors}
                  </span>
                </div>
              </div>

              {/* Title Section */}
              <div className="border-b border-white/5 pb-5">
                <h2 className="text-2xl md:text-3xl font-extrabold text-white leading-tight" style={{ fontFamily: "var(--font-heading)" }}>
                  {result.title}
                </h2>
              </div>

              {/* Summary Section */}
              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-semibold tracking-wider text-indigo-400 uppercase" style={{ fontFamily: "var(--font-heading)" }}>
                  Document Summary
                </h3>
                <div className="pl-4 border-l-2 border-indigo-500/70 py-1">
                  <p className="text-slate-300 leading-relaxed text-sm md:text-base">
                    {result.summary}
                  </p>
                </div>
              </div>

              {/* Key Takeaway Section */}
              <div className="mt-2 p-5 rounded-xl border border-indigo-500/20 bg-gradient-to-r from-indigo-500/5 to-purple-500/5 relative overflow-hidden">
                {/* Micro glow behind taking */}
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-indigo-500/5 via-transparent to-purple-500/5 opacity-50"></div>
                
                <div className="flex items-start gap-4 relative z-10">
                  <div className="p-2.5 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xs font-bold tracking-wider text-slate-300 uppercase mb-1" style={{ fontFamily: "var(--font-heading)" }}>
                      Key Takeaway
                    </h3>
                    <p className="text-white font-medium text-sm md:text-base leading-relaxed">
                      {result.keyTakeaway}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* History Panel */}
          {history.length > 0 && (
            <div className="glass p-6 rounded-2xl flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold tracking-wide text-slate-400 uppercase" style={{ fontFamily: "var(--font-heading)" }}>
                  Recent Analyses
                </label>
                <button
                  onClick={clearHistory}
                  className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Clear History
                </button>
              </div>

              <div className="flex flex-col gap-2.5">
                {history.map((item, index) => (
                  <div
                    key={index}
                    onClick={() => loadFromHistory(item)}
                    className="p-3.5 rounded-xl border border-white/5 bg-white/2 hover:bg-white/5 hover:border-white/10 transition-all cursor-pointer flex items-center justify-between group"
                  >
                    <div className="flex flex-col gap-1 pr-4 min-w-0">
                      <span className="text-sm font-medium text-white group-hover:text-indigo-400 transition-colors truncate">
                        {item.title || "Untitled Document"}
                      </span>
                      <span className="text-xs text-slate-500 truncate" title={item.url}>
                        {item.url}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-600 font-semibold whitespace-nowrap bg-white/5 px-2 py-1 rounded border border-white/5">
                      {item.date}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Right Column: PDF Preview (Takes 5 cols on large screens if active) */}
        {showPreview && (
          <section className="lg:col-span-5 xl:col-span-4 h-[600px] lg:h-[750px] sticky top-8 flex flex-col gap-4">
            <div className="glass p-3 rounded-2xl flex-1 flex flex-col overflow-hidden relative">
              <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
                <span className="text-xs font-semibold tracking-wide text-slate-300 uppercase" style={{ fontFamily: "var(--font-heading)" }}>
                  PDF Preview
                </span>
                {pdfUrl ? (
                  <a
                    href={pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 transition-colors"
                  >
                    Open Link
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                ) : null}
              </div>

              {pdfUrl ? (
                <div className="flex-1 rounded-xl overflow-hidden bg-black/40 mt-3 relative">
                  <iframe
                    src={`${pdfUrl}#toolbar=0`}
                    className="w-full h-full border-0"
                    title="PDF Source Preview"
                  />
                  {/* Subtle overlay helper info in case iframe fails */}
                  <div className="absolute bottom-2 left-2 right-2 p-3 rounded bg-black/85 backdrop-filter backdrop-blur border border-white/5 pointer-events-none">
                    <p className="text-[10px] text-slate-400 text-center">
                      If preview fails to load, the server hosting the PDF may be blocking external embeds.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex-1 rounded-xl bg-black/25 mt-3 flex flex-col items-center justify-center p-6 text-center border border-dashed border-white/5">
                  <svg className="w-12 h-12 text-slate-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h4 className="text-sm font-semibold text-slate-400">No PDF Loaded</h4>
                  <p className="text-xs text-slate-600 max-w-[200px] mt-1.5">
                    Enter a PDF URL above or click a quick test example to load a preview.
                  </p>
                </div>
              )}
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-16 py-6 border-t border-white/5 text-center text-xs text-slate-600">
        <p>© {new Date().getFullYear()} PDF.insight. Powered by Gemini 2.0 Flash.</p>
      </footer>
    </div>
  );
}
