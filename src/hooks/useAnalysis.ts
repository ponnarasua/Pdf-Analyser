import { useState, useRef, useEffect } from "react";
import { streamAnalysis } from "@/lib/api";
import { AnalysisResult, Step, SSEMessage } from "@/types/analysis";
import { INITIAL_STEPS } from "@/config/constants";

export function useAnalysis() {
  const [pdfUrl, setPdfUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [steps, setSteps] = useState<Step[]>(INITIAL_STEPS);
  const [statusMessage, setStatusMessage] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Clean up in-flight requests when unmounting
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

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

    setIsLoading(true);
    setError(null);
    setResult(null);
    setStatusMessage("");
    setSteps(INITIAL_STEPS.map((s) => ({ ...s, status: "pending" })));

    // Cancel any current request
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
              prev.map((s) =>
                s.status === "active" ? { ...s, status: "error" } : s
              )
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

  return {
    pdfUrl,
    setPdfUrl,
    isLoading,
    steps,
    statusMessage,
    result,
    error,
    handleAnalyze,
    handleQuickTest,
    handleReset,
  };
}
