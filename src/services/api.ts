import { AnalysisResult, SSEMessage } from "@/types/analysis";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

/**
 * Streams the PDF analysis from the FastAPI backend via Server-Sent Events.
 * Calls onMessage for each SSE event received.
 */
export async function streamAnalysis(
  pdfUrl: string,
  onMessage: (msg: SSEMessage) => void,
  signal?: AbortSignal
): Promise<void> {
  const response = await fetch(`${BACKEND_URL}/api/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pdf_url: pdfUrl }),
    signal,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Backend error: ${response.status} ${text}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body.");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE messages are separated by double newlines
    const parts = buffer.split("\n\n");
    buffer = parts.pop() || "";

    for (const part of parts) {
      const line = part.trim();
      if (!line.startsWith("data: ")) continue;
      const jsonStr = line.slice(6).trim();
      try {
        const msg: SSEMessage = JSON.parse(jsonStr);
        onMessage(msg);
      } catch {
        // skip malformed lines
      }
    }
  }
}
