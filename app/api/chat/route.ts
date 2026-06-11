import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: NextRequest) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return Response.json({ reply: "GEMINI_API_KEY is missing." });
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