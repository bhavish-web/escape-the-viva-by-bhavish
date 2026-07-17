// api/upload.js
// Handles PDF upload, extracts text, detects topics using Gemini

const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const config = {
  api: { bodyParser: false }
};

async function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", chunk => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function extractBoundary(contentType) {
  const match = contentType.match(/boundary=(.+)/);
  return match ? match[1] : null;
}

function extractFileFromMultipart(buffer, boundary) {
  const str = buffer.toString("binary");
  const parts = str.split("--" + boundary);
  for (const part of parts) {
    if (part.includes("filename=") && part.includes("application/pdf")) {
      const headerEnd = part.indexOf("\r\n\r\n");
      if (headerEnd === -1) continue;
      const fileContent = part.slice(headerEnd + 4, part.lastIndexOf("\r\n"));
      return Buffer.from(fileContent, "binary");
    }
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: "Gemini API key not configured" });
  }

  try {
    const contentType = req.headers["content-type"] || "";
    if (!contentType.includes("multipart/form-data")) {
      return res.status(400).json({ error: "Please upload a PDF file" });
    }

    const boundary = extractBoundary(contentType);
    if (!boundary) {
      return res.status(400).json({ error: "Invalid form data" });
    }

    const body = await readBody(req);

    // Check file size (max 5MB)
    if (body.length > 5 * 1024 * 1024) {
      return res.status(400).json({ error: "File too large. Maximum size is 5MB." });
    }

    const pdfBuffer = extractFileFromMultipart(body, boundary);
    if (!pdfBuffer) {
      return res.status(400).json({ error: "Could not read PDF file. Please try again." });
    }

    // Extract text from PDF
    let pdfText = "";
    try {
      const pdfParse = require("pdf-parse");
      const pdfData = await pdfParse(pdfBuffer);
      pdfText = pdfData.text;
    } catch (e) {
      return res.status(400).json({ error: "Could not read this PDF. Make sure it contains selectable text (not a scanned image)." });
    }

    if (!pdfText || pdfText.trim().length < 50) {
      return res.status(400).json({ error: "PDF appears to be empty or contains no readable text. Please upload a text-based PDF." });
    }

    // Truncate to avoid token limits (keep first 8000 chars)
    const syllabusText = pdfText.slice(0, 8000);

    // Ask Gemini to detect topics
    const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";
    const model = genAI.getGenerativeModel({ model: modelName });

    const prompt = `You are analyzing a student's engineering syllabus. 
Extract the main subjects or topics from this syllabus text.
Return ONLY a JSON array of topic strings. No explanation, no markdown, just raw JSON.
Maximum 8 topics. Keep each topic short (2-4 words).

Syllabus text:
${syllabusText}

Example output format:
["Operating Systems", "Database Management", "Computer Networks", "Data Structures"]`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();

    // Parse topics from response
    let topics = [];
    try {
      const cleaned = responseText.replace(/```json|```/g, "").trim();
      topics = JSON.parse(cleaned);
      if (!Array.isArray(topics)) throw new Error("Not an array");
      topics = topics.filter(t => typeof t === "string" && t.length > 0).slice(0, 8);
    } catch (e) {
      // Fallback: extract lines that look like topics
      topics = responseText
        .split("\n")
        .map(l => l.replace(/[^a-zA-Z0-9 ]/g, "").trim())
        .filter(l => l.length > 2 && l.length < 50)
        .slice(0, 8);
    }

    if (topics.length === 0) {
      return res.status(400).json({ error: "Could not detect any topics from your syllabus. Please try a different PDF." });
    }

    // Store syllabus text temporarily in response (used for question generation)
    return res.status(200).json({
      topics,
      syllabusText: syllabusText.slice(0, 6000) // send back truncated text for question gen
    });

  } catch (err) {
    console.error("Upload error:", err);
    if (err.message && err.message.includes("429")) {
      return res.status(429).json({ error: "Too many requests. Please wait a moment and try again." });
    }
    return res.status(500).json({ error: "Something went wrong. Please try again." });
  }
}
