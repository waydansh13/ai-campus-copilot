// app/api/viva/next-question/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getGeminiKey } from "@/lib/gemini";

export async function POST(request: NextRequest) {
    try {
        const {
            subject = "Computer Science",
            difficulty = "medium",
            uploadedContent = "",
            previousQuestions = [],
            questionNumber = 2,
            totalQuestions = 5,
            lastAnswer = "",
            lastScore = 5,
        } = await request.json();

        const genAI = new GoogleGenerativeAI(getGeminiKey());
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const askedSoFar = Array.isArray(previousQuestions) && previousQuestions.length > 0
            ? previousQuestions.map((q: any, i: number) => `${i + 1}. ${q.question}`).join('\n')
            : '(none yet)';

        // Adapt the next question to how the student has been performing so far
        const performanceNote = lastScore >= 7
            ? "The student answered the previous question well. Increase the depth slightly, or move to a related but more challenging concept."
            : lastScore >= 5
                ? "The student gave an adequate but incomplete answer. Probe a related concept at a similar difficulty level."
                : "The student struggled with the previous question. Ask a more fundamental or clarifying question on a related concept — do not simply repeat the same question.";

        const prompt = `You are Professor Charles, conducting a live oral examination (viva voce) on "${subject}" at a "${difficulty}" difficulty level.

This is question ${questionNumber} of ${totalQuestions}.
${uploadedContent ? `\nCRITICAL INSTRUCTION: You MUST base this question EXCLUSIVELY on the uploaded study material below. Do not ask about anything that is not covered in this text.\n"""\n${uploadedContent}\n"""\n` : ''}
Questions already asked in this session (do NOT repeat these or ask near-duplicates):
${askedSoFar}

The student's most recent answer was: "${lastAnswer || '(no answer recorded)'}"
Their score on that answer was ${lastScore}/10.
${performanceNote}

Generate exactly ONE new question that explores a different concept or angle than the questions already asked above.
Also provide an array of expected concepts, an array of 4-8 key points, an ideal examiner-quality short answer, and the maximum marks (default to 10).

Return ONLY a valid JSON object with this exact structure — no markdown formatting, no backticks, no extra commentary:
{
  "question": "The question text",
  "expectedConcepts": ["concept1", "concept2", "concept3"],
  "subtopic": "A short label for the specific concept this question targets",
  "keyPoints": ["point 1", "point 2", "point 3", "point 4"],
  "idealAnswer": "A concise, examiner-quality answer that covers the key points.",
  "maxMarks": 10
}`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const cleanText = text.replace(/```json\n?|\n?```/gi, '').trim();

        let nextQuestion: any;
        try {
            nextQuestion = JSON.parse(cleanText);
        } catch (e) {
            console.error("Failed to parse Gemini next-question JSON:", cleanText);
            throw new Error("Invalid JSON from Gemini");
        }

        if (!nextQuestion?.question) {
            throw new Error("Gemini did not return a question");
        }

        return NextResponse.json({
            question: nextQuestion.question,
            expectedConcepts: Array.isArray(nextQuestion.expectedConcepts) ? nextQuestion.expectedConcepts : [],
            subtopic: nextQuestion.subtopic || '',
            keyPoints: Array.isArray(nextQuestion.keyPoints) ? nextQuestion.keyPoints : [],
            idealAnswer: nextQuestion.idealAnswer || '',
            maxMarks: nextQuestion.maxMarks || 10,
        });
    } catch (error) {
        console.error("Next Question API Error:", error);
        return NextResponse.json({
            error: 'Failed to generate next question'
        }, { status: 500 });
    }
}