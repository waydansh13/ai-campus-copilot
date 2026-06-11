import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: NextRequest) {
    try {
        if (!process.env.GEMINI_API_KEY) {
            return Response.json({
                reply: "GEMINI_API_KEY is missing.",
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