// api/upload.js
// Handles PDF + Image upload, extracts syllabus content, detects topics using Groq

export const config = {
  api: { bodyParser: false, sizeLimit: "10mb" }
};

const GROQ_TEXT_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const GROQ_VISION_MODEL = process.env.GROQ_VISION_MODEL || "meta-llama/llama-4-maverick-17b-128e-instruct";

// ── Helpers ──────────────────────────────────────────────────

async function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", chunk => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function extractBoundary(contentType) {
  const match = contentType.match(/boundary=([^\s;]+)/);
  return match ? match[1] : null;
}

function extractFileFromMultipart(buffer, boundary) {
  const CRLF = "\r\n";
  const str = buffer.toString("binary");
  const parts = str.split("--" + boundary);

  for (const part of parts) {
    if (!part.includes("filename=")) continue;

    const ctMatch = part.match(/Content-Type:\s*([^\r\n]+)/i);
    const partMime = ctMatch ? ctMatch[1].trim() : "";

    const headerEnd = part.indexOf(CRLF + CRLF);
    if (headerEnd === -1) continue;

    const fileContent = part.slice(headerEnd + 4, part.lastIndexOf(CRLF));
    const fileBuffer = Buffer.from(fileContent, "binary");

    const fnMatch = part.match(/filename="([^"]+)"/i);
    const filename = fnMatch ? fnMatch[1].toLowerCase() : "";

    return { buffer: fileBuffer, mime: partMime, filename };
  }
  return null;
}

function getMimeType(filename, declaredMime) {
  if (filename.endsWith(".pdf")) return "application/pdf";
  if (filename.endsWith(".jpg") || filename.endsWith(".jpeg")) return "image/jpeg";
  if (filename.endsWith(".png")) return "image/png";
  if (filename.endsWith(".webp")) return "image/webp";
  return declaredMime || "application/octet-stream";
}

function isImage(mime) {
  return ["image/jpeg", "image/png", "image/webp"].includes(mime);
}

function isPDF(mime) {
  return mime === "application/pdf";
}

// ── Extract text from a normal text-based PDF ────────────────

async function extractTextFromPDF(buffer) {
  try {
    const pdfParse = require("pdf-parse");
    const data = await pdfParse(buffer);
    return data.text || "";
  } catch (e) {
    return "";
  }
}

// ── Groq chat completion (text-only) ──────────────────────────

async function groqTextCompletion(prompt) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: GROQ_TEXT_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 4000
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq text API error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  return (data.choices?.[0]?.message?.content || "").trim();
}

// ── Groq vision completion (image input) ──────────────────────

async function groqVisionCompletion(imageBuffer, mimeType, prompt) {
  const base64 = imageBuffer.toString("base64");
  const dataUrl = `data:${mimeType};base64,${base64}`;

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: GROQ_VISION_MODEL,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: dataUrl } }
          ]
        }
      ],
      temperature: 0.3,
      max_tokens: 4000
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq vision API error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  return (data.choices?.[0]?.message?.content || "").trim();
}

// ── Use Groq Vision to read an image buffer ────────────────────

async function extractSyllabusViaVision(imageBuffer, mimeType) {
  const prompt = `You are reading a university engineering syllabus document.
This may be a scanned page, a photo, or a screenshot.

Extract ALL syllabus content you can see. Focus on:
- Subject / Course names
- Unit numbers and unit titles
- Topic names and subtopic names
- Chapter headings

Return ONLY a JSON object in this exact format, no markdown, no extra text:
{
  "subjects": ["Subject Name 1", "Subject Name 2"],
  "topics": ["Topic 1", "Topic 2", "Topic 3", "Topic 4", "Topic 5", "Topic 6", "Topic 7", "Topic 8"],
  "rawText": "all the text you could read from the document as a single string"
}

Rules:
- topics array must have between 3 and 10 items
- each topic should be 2-5 words, meaningful for viva question generation
- rawText should contain as much text from the image as possible
- if you cannot read the document clearly, still return valid JSON with what you can see`;

  return await groqVisionCompletion(imageBuffer, mimeType, prompt);
}

// ── Use Groq text to extract topics from text ──────────────────

async function extractTopicsFromText(syllabusText) {
  const prompt = `You are analyzing a student's engineering syllabus.
Extract the main subjects or topics from this syllabus text.
Return ONLY a JSON array of topic strings. No explanation, no markdown, just raw JSON.
Maximum 8 topics. Keep each topic short (2-5 words). Focus on topics useful for viva preparation.

Syllabus text:
${syllabusText.slice(0, 7000)}

Example output:
["Operating Systems", "Database Management", "Computer Networks", "Data Structures", "OOP Concepts"]`;

  return await groqTextCompletion(prompt);
}

// ── Parse topics from any Groq response ────────────────────────

function parseTopics(responseText) {
  try {
    const cleaned = responseText.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) {
      return parsed.filter(t => typeof t === "string" && t.length > 0).slice(0, 8);
    }
    if (parsed.topics && Array.isArray(parsed.topics)) {
      return parsed.topics.filter(t => typeof t === "string" && t.length > 0).slice(0, 8);
    }
  } catch (e) {
    return responseText
      .split("\n")
      .map(l => l.replace(/[^a-zA-Z0-9 ]/g, "").trim())
      .filter(l => l.length > 3 && l.length < 60)
      .slice(0, 8);
  }
  return [];
}

// ── Main Handler ─────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({ error: "Groq API key not configured on server." });
  }

  try {
    const contentType = req.headers["content-type"] || "";
    if (!contentType.includes("multipart/form-data")) {
      return res.status(400).json({ error: "Please upload a file." });
    }

    const boundary = extractBoundary(contentType);
    if (!boundary) {
      return res.status(400).json({ error: "Invalid form data." });
    }

    const body = await readBody(req);

    if (body.length > 10 * 1024 * 1024) {
      return res.status(400).json({ error: "File too large. Maximum size is 10MB." });
    }

    const file = extractFileFromMultipart(body, boundary);
    if (!file) {
      return res.status(400).json({ error: "Could not read the uploaded file. Please try again." });
    }

    const mime = getMimeType(file.filename, file.mime);
    let topics = [];
    let syllabusText = "";

    // ── BRANCH 1: Image file (jpg, png, webp) ──────────────────
    if (isImage(mime)) {
      const visionResponse = await extractSyllabusViaVision(file.buffer, mime);

      let parsed = null;
      try {
        const cleaned = visionResponse.replace(/```json|```/g, "").trim();
        parsed = JSON.parse(cleaned);
      } catch (e) {
        topics = parseTopics(visionResponse);
        syllabusText = visionResponse;
      }

      if (parsed) {
        if (parsed.topics && Array.isArray(parsed.topics)) {
          topics = parsed.topics.filter(t => typeof t === "string" && t.length > 0).slice(0, 8);
        }
        syllabusText = parsed.rawText || visionResponse;
      }

      if (topics.length === 0) {
        return res.status(400).json({
          error: "We couldn't extract enough readable syllabus content. Please upload a clearer image or another document."
        });
      }

      return res.status(200).json({ topics, syllabusText: syllabusText.slice(0, 6000) });
    }

    // ── BRANCH 2: PDF ──────────────────────────────────────────
    if (isPDF(mime)) {
      const extractedText = await extractTextFromPDF(file.buffer);
      const hasText = extractedText && extractedText.trim().length > 80;

      if (hasText) {
        // Text PDF — use text-based topic detection via Groq
        syllabusText = extractedText.slice(0, 8000);
        const topicsResponse = await extractTopicsFromText(syllabusText);
        topics = parseTopics(topicsResponse);

        if (topics.length === 0) {
          return res.status(400).json({
            error: "Could not detect topics from your PDF. Please try a clearer document."
          });
        }

        return res.status(200).json({ topics, syllabusText: syllabusText.slice(0, 6000) });

      } else {
        // Scanned PDF with no extractable text.
        // Groq's vision model reads images, not raw PDF bytes, so we can't send
        // the PDF directly the way Gemini could. Ask the user to upload it as
        // an image instead (screenshot or photo of the page) rather than
        // silently failing.
        return res.status(400).json({
          error: "This looks like a scanned PDF with no selectable text. Please upload a screenshot or photo (JPG/PNG) of the syllabus page instead — our current setup can read images directly but not scanned PDFs."
        });
      }
    }

    // ── Unsupported file type ───────────────────────────────────
    return res.status(400).json({
      error: "Unsupported file type. Please upload a PDF, JPG, PNG, or WEBP file."
    });

  } catch (err) {
    console.error("Upload error:", err);
    if (err.message && err.message.includes("429")) {
      return res.status(429).json({ error: "Too many requests. Please wait a moment and try again." });
    }
    return res.status(500).json({
      error: err.message,
      stack: err.stack
    });
  }
}
