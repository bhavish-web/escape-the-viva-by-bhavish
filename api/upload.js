// api/upload.js
// Handles PDF + Image upload, extracts syllabus content, detects topics + units using Groq

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
      max_tokens: 4000,
      reasoning_effort: "low",
      reasoning_format: "hidden"
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
      max_tokens: 4000,
      reasoning_format: "hidden"
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
  const prompt = `You are reading a university engineering syllabus document (a photo, scan, or screenshot).

The syllabus is organized into UNITS (UNIT - I, UNIT - II, UNIT - III, UNIT - IV, ...).
Read the document and return the content grouped BY UNIT.

Return ONLY a JSON object in this EXACT format. No markdown, no commentary, no extra text before or after:
{
  "units": [
    { "number": 1, "content": "all the syllabus text that belongs to Unit 1 (topics, subtopics, keywords)" },
    { "number": 2, "content": "all the syllabus text that belongs to Unit 2" }
  ],
  "topics": ["Broad Topic 1", "Broad Topic 2", "Broad Topic 3", "Broad Topic 4", "Broad Topic 5", "Broad Topic 6"],
  "rawText": "all readable text from the document as one string"
}

STRICT RULES:
- "units": one object per unit you can see. "number" is the unit number (1,2,3,4...). "content" is the actual academic text of that unit (list its topics/subtopics). Do NOT put commentary, reasoning, or headings like "Identify the subject" in content.
- If the document has no clear units, return "units": [].
- "topics": 6-12 BROAD topic names (2-5 words each), grouping tiny subtopics under their theme. No unit numbers, no meta lines.
- "rawText": as much readable text as possible.
- Output ONLY the JSON object. Do NOT write any explanation or thinking.`;

  return await groqVisionCompletion(imageBuffer, mimeType, prompt);
}

// Build clean unit objects from the vision model's structured "units" array
function unitsFromVision(parsedUnits) {
  if (!Array.isArray(parsedUnits)) return [];
  const byNum = new Map();
  for (const u of parsedUnits) {
    if (!u || typeof u !== "object") continue;
    let n = u.number;
    if (typeof n === "string") n = parseInt(n.replace(/\D/g, ""), 10);
    if (!Number.isFinite(n) || n < 1 || n > 20) continue;
    const content = (typeof u.content === "string" ? u.content : "").trim();
    if (content.replace(/\s/g, "").length < 25) continue;   // needs real content
    if (byNum.has(n)) continue;
    byNum.set(n, {
      id: "Unit " + n,
      title: "",
      label: "Unit " + n,          // number-only button
      text: content.slice(0, 4000)
    });
  }
  return Array.from(byNum.values()).sort((a, b) =>
    parseInt(a.id.replace(/\D/g, ""), 10) - parseInt(b.id.replace(/\D/g, ""), 10)
  ).slice(0, 12);
}

// ── Use Groq text to extract topics from text ──────────────────

async function extractTopicsFromText(syllabusText) {
  const prompt = `You are extracting selectable STUDY TOPICS from an engineering syllabus so a student can pick one and get viva questions on it.

From the syllabus text below, list the actual academic topics/units a student would study.

STRICT RULES:
- Output ONLY a raw JSON array of strings. No prose, no markdown, no keys, no numbering.
- Each item must be a real academic topic name (e.g. "Propositional Logic", "Problem Solving by Search", "Knowledge Representation").
- Do NOT include instructions, headings, or meta lines like "Identify the Subject", "Unit I", "Unit II", "Title", "So the subject is...", "Topics", "Syllabus".
- Do NOT include the words "Unit", "Chapter", "Module" alone. If a unit has a title, use the TITLE only.
- Remove unit numbers/labels. "UNIT I: Problem Solving by Search" -> "Problem Solving by Search".
- GROUP small subtopics under their broader theme. Do NOT list every tiny subtopic.
  Example: "Breadth-first search, DFS, A* search, Hill-climbing" all belong under "Search Strategies" — output the broad theme, not each algorithm.
- Return 6 to 12 BROAD topics. COVER EVERY UNIT of the syllabus (do not skip any unit), but keep them broad — group tiny subtopics under their theme. Each 2-5 words. No duplicates.

Syllabus text:
${syllabusText.slice(0, 7000)}

Example (for an AI syllabus):
["Search Strategies", "Adversarial Search & CSPs", "Propositional Logic", "First-Order Logic", "Knowledge Representation", "Classical Planning"]`;

  return await groqTextCompletion(prompt);
}

// ── Parse topics from any Groq response ────────────────────────

function parseTopics(responseText) {
  try {
    const cleaned = responseText.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) {
      return cleanTopicList(parsed);
    }
    if (parsed.topics && Array.isArray(parsed.topics)) {
      return cleanTopicList(parsed.topics);
    }
  } catch (e) {
    const arrMatch = responseText.match(/\[[\s\S]*\]/);
    if (arrMatch) {
      try {
        const arr = JSON.parse(arrMatch[0]);
        if (Array.isArray(arr)) {
          return cleanTopicList(arr);
        }
      } catch (_) {}
    }
    const lines = responseText
      .split("\n")
      .map(l => l.replace(/^[\s\-\*\d\.\)]+/, "").trim())
      .map(l => l.replace(/^(unit|chapter|module|topic|title)\s*[ivxlcdm0-9]*[:\-\.]?\s*/i, "").trim());
    return cleanTopicList(lines);
  }
  return [];
}

// Remove meta/instruction lines and clean up unit labels
function cleanTopicList(list) {
  const BAD = /(identify|subject is|syllabus|choose|select|following|topics?\b|units?\b|chapters?\b|title\b|so the|here are|based on|question)/i;
  const seen = new Set();
  const out = [];
  for (let raw of list) {
    if (typeof raw !== "string") continue;
    let t = raw
      .replace(/^(unit|chapter|module)\s*[ivxlcdm0-9]+[:\-\.]?\s*/i, "")
      .replace(/[^a-zA-Z0-9 &/\-]/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (t.length < 3 || t.length > 60) continue;
    if (BAD.test(t)) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
    if (out.length >= 12) break;
  }
  return out;
}

// ── Split raw syllabus text into UNITS (Unit 1/2/... — number only) ──
function splitIntoUnits(rawText) {
  if (!rawText) return [];
  const text = rawText.replace(/\r/g, "");
  const re = /(?:^|\n)\s*UNIT\s*[-:]?\s*([IVXLCDM]+|\d+)\b/gi;
  const marks = [];
  let m;
  while ((m = re.exec(text)) !== null) {
    const num = romanOrNum(m[1].toUpperCase());
    marks.push({ num, index: m.index, headerEnd: re.lastIndex });
  }
  if (marks.length < 2) return [];

  const byNum = new Map();
  for (let i = 0; i < marks.length; i++) {
    const n = marks[i].num;
    if (byNum.has(n)) continue;
    const start = marks[i].headerEnd;
    const end = i + 1 < marks.length ? marks[i + 1].index : text.length;
    const body = text.slice(start, end).trim().slice(0, 4000);
    if (body.replace(/\s/g, "").length < 25) continue;
    byNum.set(n, {
      id: "Unit " + n,
      title: "",
      label: "Unit " + n,
      text: body
    });
  }

  const units = Array.from(byNum.values()).sort((a, b) => {
    const na = parseInt(a.id.replace(/\D/g, ""), 10);
    const nb = parseInt(b.id.replace(/\D/g, ""), 10);
    return na - nb;
  });
  return units.slice(0, 12);
}

function romanOrNum(s) {
  const map = { I:1, II:2, III:3, IV:4, V:5, VI:6, VII:7, VIII:8, IX:9, X:10, XI:11, XII:12 };
  if (map[s]) return map[s];
  const n = parseInt(s, 10);
  return isNaN(n) ? s : n;
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

      let unitsImg = [];
      if (parsed) {
        if (parsed.topics && Array.isArray(parsed.topics)) {
          topics = cleanTopicList(parsed.topics);
        }
        syllabusText = parsed.rawText || visionResponse;
        unitsImg = unitsFromVision(parsed.units);
      }

      if (unitsImg.length < 2) {
        const alt = splitIntoUnits(syllabusText);
        unitsImg = alt.length >= 2 ? alt : [];
      }

      if (topics.length === 0 && unitsImg.length === 0) {
        return res.status(400).json({
          error: "We couldn't extract enough readable syllabus content. Please upload a clearer image or another document."
        });
      }

      return res.status(200).json({ topics, units: unitsImg, syllabusText: syllabusText.slice(0, 6000) });
    }

    // ── BRANCH 2: PDF ──────────────────────────────────────────
    if (isPDF(mime)) {
      const extractedText = await extractTextFromPDF(file.buffer);
      const hasText = extractedText && extractedText.trim().length > 80;

      if (hasText) {
        syllabusText = extractedText.slice(0, 8000);
        const topicsResponse = await extractTopicsFromText(syllabusText);
        topics = parseTopics(topicsResponse);

        if (topics.length === 0) {
          return res.status(400).json({
            error: "Could not detect topics from your PDF. Please try a clearer document."
          });
        }

        const unitsPdf = splitIntoUnits(syllabusText);
        return res.status(200).json({ topics, units: unitsPdf, syllabusText: syllabusText.slice(0, 6000) });

      } else {
        return res.status(400).json({
          error: "This looks like a scanned PDF with no selectable text. Please upload a screenshot or photo (JPG/PNG) of the syllabus page instead — our current setup can read images directly but not scanned PDFs."
        });
      }
    }

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
