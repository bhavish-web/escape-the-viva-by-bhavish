// api/generate.js
// Generates viva questions using Groq (Llama 3.3 70B) based on syllabus + topic + difficulty

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({ error: "Groq API key not configured" });
  }

  const { topic, difficulty, syllabusText } = req.body;

  if (!topic || !difficulty || !syllabusText) {
    return res.status(400).json({ error: "Missing topic, difficulty, or syllabus content." });
  }

  const difficultyGuide = {
    easy: "definitions, basic terminology, simple recall questions",
    medium: "conceptual understanding, comparisons, practical applications",
    hard: "deep analysis, advanced scenarios, edge cases, tricky concepts"
  };

  const prompt = `You are a strict engineering professor creating viva exam questions.
Generate exactly 30 multiple choice questions based ONLY on this syllabus content.

Topic to focus on: ${topic}
Difficulty level: ${difficulty.toUpperCase()} (${difficultyGuide[difficulty] || difficultyGuide.medium})

Syllabus content:
${syllabusText}

STRICT RULES:
- Questions must come ONLY from the syllabus content above
- Each question must have exactly 4 options (A, B, C, D)
- Only ONE option is correct
- No duplicate or nearly identical questions
- Questions must be technically accurate
- Keep questions clear and concise
- The wrong options should be plausible but clearly wrong

Return ONLY a valid JSON array. No explanation, no markdown, no extra text.
Use exactly this format:

[
  {
    "topic": "${topic}",
    "difficulty": "${difficulty}",
    "question": "What is...?",
    "options": ["Correct answer", "Wrong option 1", "Wrong option 2", "Wrong option 3"],
    "correct": 0,
    "hint": "Think about...",
    "professorAsk": "Short version of question for professor bubble",
    "correctReaction": "Short funny positive reaction from professor",
    "wrongReaction": "Short funny angry reaction from professor",
    "wrongComment": "Short educational comment about correct answer"
  }
]

Note: "correct" is always 0 in your output (the first option). The game will shuffle options automatically.`;

  try {
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.8,
        max_tokens: 8000
      })
    });

    if (!groqRes.ok) {
      const errBody = await groqRes.text();
      console.error("Groq API error:", groqRes.status, errBody);
      if (groqRes.status === 429) {
        return res.status(429).json({ error: "API quota reached. Please wait a moment and try again." });
      }
      return res.status(500).json({ error: "Question generation failed. Please try again." });
    }

    const groqData = await groqRes.json();
    const responseText = (groqData.choices?.[0]?.message?.content || "").trim();

    // Parse and validate
    let questions = [];
    try {
      const cleaned = responseText.replace(/```json|```/g, "").trim();
      questions = JSON.parse(cleaned);
    } catch (e) {
      console.error("JSON parse failed:", e, "\nRaw response:", responseText);
      return res.status(500).json({ error: "Failed to generate valid questions. Please try again." });
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(500).json({ error: "No questions were generated. Please try again." });
    }

    // Validate each question has required fields
    const required = ["question", "options", "correct", "hint"];
    const valid = questions.filter(q =>
      required.every(f => q[f] !== undefined) &&
      Array.isArray(q.options) &&
      q.options.length === 4 &&
      typeof q.correct === "number"
    );

    if (valid.length < 5) {
      return res.status(500).json({ error: "Generated questions were invalid. Please try again." });
    }

    // Fill in missing reaction fields with defaults
    const final = valid.map(q => ({
      topic: q.topic || topic,
      difficulty: q.difficulty || difficulty,
      question: q.question,
      options: q.options,
      correct: 0, // always 0 as per prompt, game shuffles anyway
      hint: q.hint || "Think carefully!",
      professorAsk: q.professorAsk || q.question,
      correctReaction: q.correctReaction || "Good answer! You actually studied! 👍",
      wrongReaction: q.wrongReaction || "WRONG! Did you even open the textbook?! 😡",
      wrongComment: q.wrongComment || "Study this topic carefully!"
    }));

    return res.status(200).json({ questions: final });

  } catch (err) {
    console.error("Generate error:", err);
    return res.status(500).json({ error: "Question generation failed. Please try again." });
  }
}
