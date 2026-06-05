import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pdfUrl } = body;

    if (!pdfUrl) {
      return NextResponse.json(
        { error: "PDF URL is required." },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(pdfUrl);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format. Please enter a valid HTTP/HTTPS URL." },
        { status: 400 }
      );
    }

    // Fetch PDF from URL
    let pdfResponse: Response;
    try {
      pdfResponse = await fetch(pdfUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });
    } catch (err: any) {
      return NextResponse.json(
        { error: `Failed to fetch PDF from URL. The host might be blocking the request or the server is down. Details: ${err.message || err}` },
        { status: 400 }
      );
    }

    if (!pdfResponse.ok) {
      return NextResponse.json(
        { error: `Failed to fetch PDF. Server returned status: ${pdfResponse.status} ${pdfResponse.statusText}` },
        { status: 400 }
      );
    }

    const contentType = pdfResponse.headers.get("content-type") || "";
    // Allow text/plain or octet-stream as fallbacks, but block obvious HTML or JSON
    if (contentType.includes("text/html") || contentType.includes("application/json")) {
      return NextResponse.json(
        { error: "The provided URL appears to be a web page (HTML) or JSON data, not a PDF document." },
        { status: 400 }
      );
    }

    const arrayBuffer = await pdfResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Limit buffer size to 25MB to prevent memory/timeout issues
    if (buffer.length > 25 * 1024 * 1024) {
      return NextResponse.json(
        { error: "PDF file is too large. The analysis limit is 25MB." },
        { status: 400 }
      );
    }

    const pdfBase64 = buffer.toString("base64");

    // Initialize Gemini API
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Gemini API key is not configured on the server. Please add GEMINI_API_KEY to your environment variables." },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    // Use gemini-2.0-flash as it is fast, has native PDF support and structured output
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `Analyze this PDF document. You are an expert document analyzer. Read the PDF content and extract a structured JSON object containing:
1. documentType: The category of document (e.g., Research Paper, Technical Report, Article, Invoice, User Manual, etc.)
2. title: The main title of the document.
3. authors: The author(s) of the document. Format as 'First Author, Second Author' or 'First Author et al.' for papers, or state the organization/unknown.
4. summary: A clean, concise 2 to 3 sentence summary of the document.
5. keyTakeaway: The single most important finding, takeaway, or main point.

Ensure all fields are fully populated and reflect the PDF contents accurately.`;

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
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            documentType: {
              type: SchemaType.STRING,
              description: "The category/type of the document, e.g., Research Paper, Article, Invoice, User Manual, Slide Deck, Resume, etc.",
            },
            title: {
              type: SchemaType.STRING,
              description: "The title of the document.",
            },
            authors: {
              type: SchemaType.STRING,
              description: "The author(s) of the document. Format as 'First Author et al.' or list them, or write the company name or Unknown.",
            },
            summary: {
              type: SchemaType.STRING,
              description: "A 2 to 3 sentence summary of the document.",
            },
            keyTakeaway: {
              type: SchemaType.STRING,
              description: "The single most important takeaway or point.",
            },
          },
          required: ["documentType", "title", "authors", "summary", "keyTakeaway"],
        },
      },
    });

    const responseText = result.response.text();
    const parsedData = JSON.parse(responseText);

    return NextResponse.json(parsedData);
  } catch (error: any) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: `An error occurred during analysis: ${error.message || error}` },
      { status: 500 }
    );
  }
}
