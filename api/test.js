import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  try {
    const key = process.env.GEMINI_API_KEY;

    console.log("Key exists:", !!key);
    console.log("Key prefix:", key?.slice(0, 6));

    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
    });

    const result = await model.generateContent("Say Hello");

    res.status(200).json({
      success: true,
      response: result.response.text(),
    });
  } catch (e) {
    res.status(500).json({
      error: e.message,
      stack: e.stack,
    });
  }
}
