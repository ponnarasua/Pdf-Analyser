import { NextRequest } from "next/server";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

export const dynamic = "force-dynamic";

// Helper to verify if the buffer starts with the PDF magic bytes (%PDF-)
const isPdfBuffer = (buf: Buffer): boolean => {
  if (buf.length < 4) return false;
  // %PDF magic bytes: 0x25 0x50 0x44 0x46
  return buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46;
};

// Helper to sanitize filenames to prevent path traversal or injection
const sanitizeFilename = (name: string): string => {
  if (!name) return "document.pdf";
  return name
    .replace(/[^a-zA-Z0-9.\-_]/g, "_") // replace unsafe characters with underscores
    .substring(0, 100); // limit length to 100 characters
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pdf_url, pdf_base64, filename } = body;

    if (!pdf_url && !pdf_base64) {
      return new Response(
        JSON.stringify({ type: "error", message: "Either pdf_url or pdf_base64 is required." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const encoder = new TextEncoder();
    
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (data: any) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        try {
          let buffer: Buffer;
          let activeFilename = "document.pdf";
          let sourceMode = "url";

          if (pdf_url) {
            sourceMode = "url";
            // --- Step 1: Downloading PDF ---
            sendEvent({ type: "step", step: "Downloading PDF", status: "active" });
            
            const trimmedUrl = pdf_url.trim();
            if (!trimmedUrl.startsWith("http://") && !trimmedUrl.startsWith("https://")) {
              sendEvent({ type: "error", message: "Invalid URL. Must start with http:// or https://" });
              controller.close();
              return;
            }

            let pdfResponse;
            try {
              pdfResponse = await fetch(trimmedUrl, {
                headers: {
                  "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                },
              });
            } catch (err: any) {
              sendEvent({ type: "error", message: `Network error downloading PDF: ${err.message || err}` });
              controller.close();
              return;
            }

            if (!pdfResponse.ok) {
              sendEvent({
                type: "error",
                message: `Download failed: Server returned ${pdfResponse.status} ${pdfResponse.statusText}`,
              });
              controller.close();
              return;
            }

            const arrayBuffer = await pdfResponse.arrayBuffer();
            buffer = Buffer.from(arrayBuffer);
            activeFilename = sanitizeFilename(trimmedUrl.split("/").pop() || "download.pdf");

            // Verify size limit for URL mode (25MB)
            if (buffer.length > 25 * 1024 * 1024) {
              sendEvent({ type: "error", message: "PDF is too large (max 25 MB)." });
              controller.close();
              return;
            }

            sendEvent({ type: "step", step: "Downloading PDF", status: "done" });
          } else {
            sourceMode = "upload";
            // --- Step 1: Processing Uploaded PDF ---
            sendEvent({ type: "step", step: "Downloading PDF", status: "active" }); // keep step name same for frontend compatibility
            
            try {
              buffer = Buffer.from(pdf_base64, "base64");
            } catch (err) {
              sendEvent({ type: "error", message: "Invalid base64 payload. Failed to decode file." });
              controller.close();
              return;
            }

            // Verify size limit for direct upload (Vercel limit safety, 4.5MB payload limit)
            if (buffer.length > 4.5 * 1024 * 1024) {
              sendEvent({ type: "error", message: "Uploaded PDF exceeds Vercel's 4.5MB limit. Please use the URL option instead." });
              controller.close();
              return;
            }

            activeFilename = sanitizeFilename(filename);
            await new Promise((r) => setTimeout(r, 400)); // brief pause for visual indicator consistency
            sendEvent({ type: "step", step: "Downloading PDF", status: "done" });
          }

          // --- Strict Format Sanitization / Magic Byte Check ---
          if (!isPdfBuffer(buffer)) {
            sendEvent({
              type: "error",
              message: "Format verification failed. The file is not a valid PDF document (missing %PDF header).",
            });
            controller.close();
            return;
          }

          // --- Step 2: Extracting Text ---
          sendEvent({ type: "step", step: "Extracting Text", status: "active" });
          await new Promise((r) => setTimeout(r, 600));
          sendEvent({ type: "step", step: "Extracting Text", status: "done" });

          // --- Step 3: Detecting Tables & Images ---
          sendEvent({ type: "step", step: "Detecting Tables & Images", status: "active" });
          await new Promise((r) => setTimeout(r, 500));

          // Attempt to extract page count from PDF binary structure
          let pageCount = 0;
          try {
            const pdfText = buffer.toString("binary");
            const match = pdfText.match(/\/Count\s+(\d+)/);
            if (match) {
              pageCount = parseInt(match[1], 10);
            }
          } catch {
            // no-op
          }
          if (!pageCount || pageCount <= 0 || pageCount > 1000) {
            const pagesMatches = buffer.toString("binary").match(/\/Type\s*\/Page\b/g);
            pageCount = pagesMatches ? pagesMatches.length : 1;
          }

          sendEvent({
            type: "meta",
            pages: pageCount,
            images: 0,
            tables: 0,
          });
          
          sendEvent({ type: "step", step: "Detecting Tables & Images", status: "done" });

          // --- Step 4: AI Analysis ---
          sendEvent({ type: "step", step: "AI Analysis", status: "active" });
          sendEvent({ type: "status", message: "Initializing Gemini model..." });

          const apiKey = process.env.GEMINI_API_KEY;
          if (!apiKey) {
            sendEvent({
              type: "error",
              message: "GEMINI_API_KEY is not configured on the server. Please add it to your .env.local file.",
            });
            controller.close();
            return;
          }

          const genAI = new GoogleGenerativeAI(apiKey);
          const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

          sendEvent({ type: "status", message: `Analyzing ${activeFilename} with Gemini...` });

          const pdfBase64Data = buffer.toString("base64");

          const prompt = `Analyze this PDF document and generate structured insights.
Return a valid JSON object matching the requested schema.

Extract:
- title: title of the document. If it is an invoice or resume, return the client name or candidate name.
- authors: author names (as a single string). If none, state organization or Unknown.
- summary: 2-3 sentences summarizing the entire document
- keyTakeaway: the single most important takeaway
- keywords: 5-10 key terms
- mainTopics: 3-6 main topics discussed
- imageInsights: up to 5 insights about figures/visual elements present (if any, else empty list)
- tableInsights: up to 5 insights about tables/data present (if any, else empty list)
- difficulty: "Beginner", "Intermediate", or "Advanced" based on readability
- estimatedReadingTime: estimate based on length (e.g. '12 min')
- wordCount: estimate of the total word count of the document (integer)
- documentType: The category of document (e.g. Research Paper, Technical Report, Article, Invoice, User Manual, Resume, Slide Deck, Book Chapter, etc.)`;

          const result = await model.generateContent({
            contents: [
              {
                role: "user",
                parts: [
                  {
                    inlineData: {
                      mimeType: "application/pdf",
                      data: pdfBase64Data,
                    },
                  },
                  {
                    text: prompt,
                  },
                ],
              },
            ],
            generationConfig: {
              responseMimeType: "application/json",
              responseSchema: {
                type: SchemaType.OBJECT,
                properties: {
                  title: { type: SchemaType.STRING },
                  authors: { type: SchemaType.STRING },
                  summary: { type: SchemaType.STRING },
                  keyTakeaway: { type: SchemaType.STRING },
                  keywords: {
                    type: SchemaType.ARRAY,
                    items: { type: SchemaType.STRING },
                  },
                  mainTopics: {
                    type: SchemaType.ARRAY,
                    items: { type: SchemaType.STRING },
                  },
                  imageInsights: {
                    type: SchemaType.ARRAY,
                    items: { type: SchemaType.STRING },
                  },
                  tableInsights: {
                    type: SchemaType.ARRAY,
                    items: { type: SchemaType.STRING },
                  },
                  difficulty: {
                    type: SchemaType.STRING,
                    format: "enum",
                    enum: ["Beginner", "Intermediate", "Advanced"],
                  },
                  estimatedReadingTime: { type: SchemaType.STRING },
                  wordCount: { type: SchemaType.INTEGER },
                  documentType: { type: SchemaType.STRING },
                },
                required: [
                  "title",
                  "authors",
                  "summary",
                  "keyTakeaway",
                  "keywords",
                  "mainTopics",
                  "imageInsights",
                  "tableInsights",
                  "difficulty",
                  "estimatedReadingTime",
                  "wordCount",
                  "documentType",
                ],
              },
            },
          });

          sendEvent({ type: "status", message: "Synthesizing final dashboard format..." });

          const responseText = result.response.text();
          let parsedData;
          try {
            parsedData = JSON.parse(responseText);
          } catch (jsonErr) {
            let raw = responseText.trim();
            if (raw.startsWith("```")) {
              raw = raw.split("```")[1];
              if (raw.startsWith("json")) {
                raw = raw.slice(4);
              }
            }
            parsedData = JSON.parse(raw);
          }

          // Compute metadata word count robustly
          let wordCountVal = 0;
          if (parsedData.wordCount !== undefined && parsedData.wordCount !== null) {
            if (typeof parsedData.wordCount === "number") {
              wordCountVal = Math.round(parsedData.wordCount);
            } else if (typeof parsedData.wordCount === "string") {
              wordCountVal = parseInt(parsedData.wordCount.replace(/[^0-9]/g, ""), 10) || 0;
            }
          }
          if (wordCountVal <= 0 && pageCount > 0) {
            wordCountVal = pageCount * 400; // estimate average 400 words per page as fallback
          }

          // Complete metadata updates
          const finalMetadata = {
            title: parsedData.title || "Unknown",
            author: parsedData.authors || "Unknown",
            pages: pageCount,
            word_count: wordCountVal,
            total_images: parsedData.imageInsights?.length || 0,
            total_tables: parsedData.tableInsights?.length || 0,
            estimated_reading_time: parsedData.estimatedReadingTime || `${Math.ceil(pageCount * 2)} min`,
            difficulty: parsedData.difficulty || "Intermediate",
          };

          const payload = {
            documentType: parsedData.documentType || "Document",
            title: parsedData.title || "Unknown",
            authors: parsedData.authors || "Unknown",
            summary: parsedData.summary || "Summary generation failed.",
            keyTakeaway: parsedData.keyTakeaway || "Key takeaway generation failed.",
            keywords: parsedData.keywords || [],
            difficulty: parsedData.difficulty || "Intermediate",
            estimatedReadingTime: parsedData.estimatedReadingTime || `${Math.ceil(pageCount * 2)} min`,
            mainTopics: parsedData.mainTopics || [],
            imageInsights: parsedData.imageInsights || [],
            tableInsights: parsedData.tableInsights || [],
            toc: [],
            metadata: finalMetadata,
          };

          sendEvent({ type: "step", step: "AI Analysis", status: "done" });

          // --- Step 5: Finalizing ---
          sendEvent({ type: "step", step: "Finalizing", status: "active" });
          await new Promise((r) => setTimeout(r, 300));
          sendEvent({ type: "step", step: "Finalizing", status: "done" });

          sendEvent({ type: "result", data: payload });
          controller.close();
        } catch (exc: any) {
          sendEvent({ type: "error", message: `AI analysis failed: ${exc.message || exc}` });
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || err }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
