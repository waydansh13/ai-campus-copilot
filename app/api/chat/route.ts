import { GoogleGenerativeAI } from "@google/generative-ai";
import { getGeminiKey } from "@/lib/gemini";
import { NextRequest } from "next/server";
import { GEMINI_KEYS } from "@/lib/gemini";

const genAI = new GoogleGenerativeAI(
  getGeminiKey()
);

export async function POST(req: NextRequest) {
  try {
    if (GEMINI_KEYS.length === 0) {
  return Response.json({
    reply: "No Gemini API keys configured."
  });
}

    const { message, history = [], systemPrompt } = await req.json();

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: systemPrompt || "You are a helpful AI Study Assistant.",
    });

    // ✅ Fix: remove leading assistant messages — Gemini requires history to start with 'user'
    const cleanHistory = history
      .filter((_: any, i: number) => {
        if (i === 0 && history[0].role === 'assistant') return false;
        return true;
      })
      .map((m: { role: string; content: string }) => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.content }],
      }));

    const chat = model.startChat({ history: cleanHistory });

    const result = await chat.sendMessage(message);
    return Response.json({ reply: result.response.text() });

  } catch (error: any) {
    console.error("Gemini Error:", error.message);
    return Response.json({ reply: "Sorry, something went wrong: " + error.message });
  }
}