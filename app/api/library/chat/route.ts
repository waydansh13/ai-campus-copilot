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

        const { prompt } = await req.json();

        if (!prompt?.trim()) {
            return Response.json({
                reply: "Please enter a valid prompt.",
            });
        }

        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            systemInstruction: `
You are Campus Copilot's Smart Library AI.

Your responsibilities:
- Recommend books to university students.
- Summarize books.
- Answer library-related questions.
- Suggest study resources.
- Help students with academic queries.
- Keep responses concise, friendly, and helpful.
      `,
        });

        const result = await model.generateContent(prompt);

        return Response.json({
            reply: result.response.text(),
        });

    } catch (error: any) {
        console.error("Library Gemini Error:", error);

        return Response.json({
            reply:
                "Sorry, something went wrong: " +
                (error?.message || "Unknown error"),
        });
    }
}