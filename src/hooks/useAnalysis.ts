import { useState, useRef, useEffect } from "react";
import { streamAnalysis } from "@/lib/api";
import { AnalysisResult, Step, SSEMessage } from "@/types/analysis";
import { INITIAL_STEPS } from "@/config/constants";

const readFileAsBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        const base64 = reader.result.split(",")[1];
        resolve(base64);
      } else {
        reject(new Error("Failed to read file as base64 string."));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
};

export function useAnalysis() {
  const [inputMode, setInputMode] = useState<"url" | "upload">("url");
  const [pdfUrl, setPdfUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

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
    let payload: { pdf_url?: string; pdf_base64?: string; filename?: string } = {};

    if (urlToAnalyze || inputMode === "url") {
      const targetUrl = (urlToAnalyze || pdfUrl).trim();
      if (!targetUrl) {
        setError("Please enter a PDF URL.");
        return;
      }
      payload = { pdf_url: targetUrl };
    } else {
      if (!selectedFile) {
        setError("Please select or drop a local PDF file first.");
        return;
      }
      if (selectedFile.size > 20 * 1024 * 1024) {
        setError("File size exceeds 20MB limit. Please upload a smaller file or use the URL mode.");
        return;
      }
      setIsLoading(true);
      setError(null);
      setResult(null);
      setStatusMessage("Reading local file contents...");
      
      try {
        const base64 = await readFileAsBase64(selectedFile);
        payload = { pdf_base64: base64, filename: selectedFile.name };
      } catch (err: any) {
        setError(`Failed to read file: ${err.message || err}`);
        setIsLoading(false);
        return;
      }
    }

    setIsLoading(true);
    setError(null);
    setResult(null);
    setStatusMessage("Connecting to analysis stream...");
    setSteps(INITIAL_STEPS.map((s) => ({ ...s, status: "pending" })));

    // Cancel any current request
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    try {
      await streamAnalysis(
        payload,
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
        setError(err.message || "An unexpected connection error occurred.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickTest = (url: string) => {
    setInputMode("url");
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
    setPdfUrl("");
    setSelectedFile(null);
    setFileError(null);
  };

  return {
    inputMode,
    setInputMode,
    pdfUrl,
    setPdfUrl,
    selectedFile,
    setSelectedFile,
    fileError,
    setFileError,
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
