import { SSEMessage } from "@/types/analysis";
import { BACKEND_URL } from "@/config/constants";

/**
 * Streams the PDF analysis from the FastAPI backend via Server-Sent Events.
 * Calls onMessage for each SSE event received.
 */
export async function streamAnalysis(
  payload: { pdf_url?: string; pdf_base64?: string; filename?: string },
  onMessage: (msg: SSEMessage) => void,
  signal?: AbortSignal
): Promise<void> {
  const response = await fetch(`${BACKEND_URL}/api/v1/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
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
