import { GoogleGenerativeAI } from "@google/generative-ai";
import { getGeminiKey, GEMINI_KEYS } from "@/lib/gemini";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    if (GEMINI_KEYS.length === 0) {
      return Response.json({
        reply: "No Gemini API keys configured."
      });
    }

    const { message, history = [], systemPrompt } = await req.json();

    const combinedHistory: { role: string; parts: { text: string }[] }[] = [];
    
    for (const msg of history) {
      const role = msg.role === "user" ? "user" : "model";
      if (combinedHistory.length > 0 && combinedHistory[combinedHistory.length - 1].role === role) {
        combinedHistory[combinedHistory.length - 1].parts[0].text += `\n\n${msg.content}`;
      } else {
        combinedHistory.push({
          role,
          parts: [{ text: msg.content }],
        });
      }
    }

    if (combinedHistory.length > 0 && combinedHistory[0].role === 'model') {
      combinedHistory.shift();
    }

    // Attempt to process request, rotating through keys if we hit a quota error (429)
    let lastError: any = null;
    
    for (let i = 0; i < GEMINI_KEYS.length; i++) {
        try {
            const key = getGeminiKey();
            const genAI = new GoogleGenerativeAI(key);
            
            const model = genAI.getGenerativeModel({
              model: "gemini-2.5-flash",
              systemInstruction: systemPrompt || "You are a helpful AI Study Assistant.",
            });

            const chat = model.startChat({ history: combinedHistory });
            const result = await chat.sendMessage(message);
            
            return Response.json({ reply: result.response.text() });
        } catch (e: any) {
            console.error(`Gemini Error on key attempt ${i+1}:`, e.message);
            lastError = e;
            // If it's a 429 quota error, we continue to the next key. Otherwise throw.
            if (e.message && e.message.includes('429')) {
                continue;
            }
            break; // Stop retrying on other types of errors
        }
    }

    return Response.json({ reply: "Sorry, I'm currently unavailable: " + (lastError?.message || "Unknown error") });

  } catch (error: any) {
    console.error("Gemini Error:", error.message);
    return Response.json({ reply: "Sorry, something went wrong with the AI: " + error.message });
  }
}