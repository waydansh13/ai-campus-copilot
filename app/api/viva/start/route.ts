// app/api/viva/start/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getGeminiKey } from "@/lib/gemini";

export async function POST(request: NextRequest) {
  try {
    const { subject = "Computer Science", difficulty = "medium", totalQuestions = 3, uploadedContent = "" } = await request.json();

    const genAI = new GoogleGenerativeAI(getGeminiKey());
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `You are a professor conducting an oral examination (viva voce).
Generate ${totalQuestions} questions for a student on the subject: "${subject}" at a "${difficulty}" difficulty level.
${uploadedContent ? `\nCRITICAL INSTRUCTION: You MUST base your questions EXCLUSIVELY on the contents of the uploaded study material provided below. Do not ask about general knowledge of the subject if it is not mentioned in the text.\n"""\n${uploadedContent}\n"""\n` : ''}
For each question, provide the question text, an array of expected concepts, an array of 4-8 key points, an ideal examiner-quality short answer, and the maximum marks (default to 10).

Return the result as a valid JSON array of objects, where each object has the following structure:
[
  {
    "question": "The question text",
    "expectedConcepts": ["concept1", "concept2", "concept3"],
    "keyPoints": ["point 1", "point 2", "point 3", "point 4"],
    "idealAnswer": "A concise, examiner-quality answer that covers the key points.",
    "maxMarks": 10
  }
]
Do not include any other text or markdown formatting (like \`\`\`json). Just the raw JSON array.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    const cleanText = text.replace(/```json\n?|\n?```/gi, '').trim();
    
    let generatedQuestions;
    try {
      generatedQuestions = JSON.parse(cleanText);
    } catch (e) {
      console.error("Failed to parse Gemini JSON response:", cleanText);
      throw new Error("Invalid JSON from Gemini");
    }

    return NextResponse.json({
      questions: generatedQuestions,
      introMessage: `Welcome to your ${difficulty} viva on ${subject}. I am Professor Charles. Let's begin the assessment.`,
    });
  } catch (error) {
    console.error("Start API Error:", error);
    return NextResponse.json({ 
      error: 'Failed to start viva session' 
    }, { status: 500 });
  }
}