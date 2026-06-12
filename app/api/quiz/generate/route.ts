// src/app/api/quiz/generate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getGeminiKey } from "@/lib/gemini";
const GEMINI_MODEL = 'gemini-2.5-flash';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { topic, questionCount = 10, difficulty = 'medium', questionTypes = ['mcq'], uploadedFile } = body;

        if (!topic?.trim() && !uploadedFile) {
            return NextResponse.json({ error: 'topic or uploadedFile is required' }, { status: 400 });
        }

        

        const apiKey = getGeminiKey();
        if (!apiKey) {
            return NextResponse.json(
                { error: 'GEMINI_API_KEY environment variable is not set' },
                { status: 500 }
            );
        }

        // Build the prompt
        const typeInstructions = questionTypes.map((t: string) => {
            if (t === 'truefalse') return 'True/False questions (2 options: A. True, B. False)';
            return '4-option multiple choice questions (options A, B, C, D)';
        }).join(' and ');

        const topicLine = topic?.trim()
            ? `Topic: ${topic.trim()}`
            : 'Use the uploaded file as the source material.';

        const prompt = `Generate exactly ${questionCount} quiz questions. ${topicLine}
Difficulty: ${difficulty}
Question types: ${typeInstructions}

Return ONLY a valid JSON array with no markdown fences, no preamble, no extra text.
Each element must match this exact shape:
{
  "question": "string",
  "options": [
    { "key": "A", "text": "string" },
    { "key": "B", "text": "string" },
    { "key": "C", "text": "string" },
    { "key": "D", "text": "string" }
  ],
  "correct": "A",
  "explanation": "string",
  "type": "mcq"
}
For True/False questions use only options A and B (True/False) and set "type": "truefalse".
The "correct" field must be the letter key of the correct option (e.g. "A", "B", "C", or "D").`;

        const userParts: object[] = [];

        // Attach file as inline data — Gemini natively reads PDF, PPTX, images, etc.
        if (uploadedFile?.base64 && uploadedFile?.mimeType) {
            userParts.push({
                inline_data: {
                    mime_type: uploadedFile.mimeType,
                    data: uploadedFile.base64,
                },
            });
        }

        userParts.push({ text: prompt });

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

        const geminiBody: Record<string, unknown> = {
            contents: [{ role: 'user', parts: userParts }],
            generationConfig: {
                temperature: 0.4,
                topP: 0.95,
                topK: 40,
                maxOutputTokens: 8192,
                responseMimeType: 'text/plain',
            },
            system_instruction: {
                parts: [{
                    text: 'You are a quiz generator. Always respond with a raw JSON array only — no markdown, no explanation, no code fences. The JSON must be parseable directly by JSON.parse().',
                }],
            },
        };

        const geminiRes = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(geminiBody),
        });

        if (!geminiRes.ok) {
            const errText = await geminiRes.text();
            console.error('Gemini API error:', geminiRes.status, errText);
            let errMsg = `Gemini API error (${geminiRes.status})`;
            try {
                const errJson = JSON.parse(errText);
                errMsg = errJson?.error?.message || errMsg;
            } catch { /* ignore */ }
            return NextResponse.json({ error: errMsg }, { status: geminiRes.status });
        }

        const geminiData = await geminiRes.json();

        const text =
            geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ||
            geminiData?.candidates?.[0]?.content?.parts
                ?.map((p: { text?: string }) => p.text || '')
                .join('') ||
            '';

        if (!text) {
            const finishReason = geminiData?.candidates?.[0]?.finishReason;
            if (finishReason === 'SAFETY') {
                return NextResponse.json(
                    { error: 'Content blocked by Gemini safety filters. Try a different topic.' },
                    { status: 422 }
                );
            }
            return NextResponse.json(
                { error: 'Gemini returned an empty response. Please try again.' },
                { status: 500 }
            );
        }

        // Return { text } — this is what page.tsx expects
        return NextResponse.json({ text });
    } catch (err: any) {
        console.error('Quiz generate route error:', err);
        return NextResponse.json(
            { error: err.message || 'Internal server error' },
            { status: 500 }
        );
    }
}