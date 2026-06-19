// app/api/viva/analyze-document/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getGeminiKey } from "@/lib/gemini";

export async function POST(request: NextRequest) {
    try {
        const { content = "" } = await request.json();

        if (!content || !content.trim()) {
            return NextResponse.json({ error: 'No content provided' }, { status: 400 });
        }

        const genAI = new GoogleGenerativeAI(getGeminiKey());
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        // Cap the excerpt sent for topic detection — we just need enough to identify
        // the subject, not the whole document (that full text is still used later
        // when generating questions).
        const excerpt = content.slice(0, 12000);

        const prompt = `You are preparing to conduct an oral examination (viva voce) on the study material below.

Read it and identify what it is actually about.

"""
${excerpt}
"""

Return ONLY a valid JSON object with this exact structure — no markdown formatting, no backticks, no extra commentary:
{
  "topic": "A short, specific subject title for this material (3-6 words, e.g. 'Cellular Respiration' or 'React Hooks & State Management')",
  "subtopics": ["up to 5 key subtopics or themes actually covered in the text"],
  "suggestedDifficulty": "beginner, medium, or advanced based on how the material is written"
}`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const cleanText = text.replace(/```json\n?|\n?```/gi, '').trim();

        let analysis: any;
        try {
            analysis = JSON.parse(cleanText);
        } catch (e) {
            console.error("Failed to parse Gemini analysis JSON:", cleanText);
            throw new Error("Invalid JSON from Gemini");
        }

        return NextResponse.json({
            topic: analysis?.topic || 'Uploaded Document',
            subtopics: Array.isArray(analysis?.subtopics) ? analysis.subtopics.slice(0, 5) : [],
            suggestedDifficulty: analysis?.suggestedDifficulty || 'medium',
        });
    } catch (error) {
        console.error("Analyze Document API Error:", error);
        return NextResponse.json({
            error: 'Failed to analyze document'
        }, { status: 500 });
    }
}