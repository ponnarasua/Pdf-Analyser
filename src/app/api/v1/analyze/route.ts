import { NextRequest } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { pdf_url } = await request.json();
    if (!pdf_url) {
      return new Response(
        JSON.stringify({ type: "error", message: "pdf_url is required." }),
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
          // --- Step 1: Downloading PDF ---
          sendEvent({ type: "step", step: "Downloading PDF", status: "active" });
          
          let pdfResponse;
          try {
            pdfResponse = await fetch(pdf_url, {
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
          const buffer = Buffer.from(arrayBuffer);

          if (buffer.length > 25 * 1024 * 1024) { // 25 MB limit
            sendEvent({ type: "error", message: "PDF is too large (max 25 MB)." });
            controller.close();
            return;
          }

          sendEvent({ type: "step", step: "Downloading PDF", status: "done" });

          // --- Step 2: Extracting Text ---
          sendEvent({ type: "step", step: "Extracting Text", status: "active" });
          await new Promise((r) => setTimeout(r, 600)); // visual pause
          sendEvent({ type: "step", step: "Extracting Text", status: "done" });

          // --- Step 3: Detecting Tables & Images ---
          sendEvent({ type: "step", step: "Detecting Tables & Images", status: "active" });
          await new Promise((r) => setTimeout(r, 500)); // visual pause

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

          sendEvent({ type: "status", message: "Uploading PDF to Gemini and analyzing..." });

          const pdfBase64 = buffer.toString("base64");

          const prompt = `Analyze this PDF document and generate structured insights.
Return a valid JSON object matching the requested schema.

Extract:
- title: title of the document
- authors: author names (as a single string)
- summary: 2-3 sentences summarizing the entire document
- keyTakeaway: the single most important takeaway
- keywords: 5-10 key terms
- mainTopics: 3-6 main topics discussed
- imageInsights: up to 5 insights about figures/visual elements present (if any, else empty list)
- tableInsights: up to 5 insights about tables/data present (if any, else empty list)
- difficulty: "Beginner", "Intermediate", or "Advanced" based on readability
- estimatedReadingTime: estimate based on length (e.g. '12 min')`;

          const result = await model.generateContent({
            contents: [
              {
                role: "user",
                parts: [
                  {
                    inlineData: {
                      mimeType: "application/pdf",
                      data: pdfBase64,
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

          // Complete metadata updates
          const finalMetadata = {
            title: parsedData.title || "Unknown",
            author: parsedData.authors || "Unknown",
            pages: pageCount,
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
