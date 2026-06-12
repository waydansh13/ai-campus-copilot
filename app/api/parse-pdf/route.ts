import { GoogleGenerativeAI } from "@google/generative-ai";
import { getGeminiKey } from "@/lib/gemini";
import { NextRequest } from 'next/server';
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

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.type !== 'application/pdf') {
      return Response.json({ error: 'File must be a PDF' }, { status: 400 });
    }

    // Convert file to base64
    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');

    // Use Gemini to extract text from the PDF
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: 'application/pdf',
          data: base64,
        },
      },
      {
        text: 'Extract ALL text content from this PDF document. Return ONLY the raw text content, preserving the original structure (headings, paragraphs, lists, tables). Do not add any commentary, summaries, or extra formatting — just the exact text from the document.',
      },
    ]);

    const extractedText = result.response.text();

    if (!extractedText || extractedText.trim().length === 0) {
      return Response.json(
        { error: 'No text could be extracted from the PDF.' },
        { status: 422 }
      );
    }

    return Response.json({
      text: extractedText,
      pages: null, // Gemini doesn't report page count
    });
  } catch (error: any) {
    console.error('PDF parse error:', error.message);
    return Response.json(
      { error: 'Failed to parse PDF: ' + error.message },
      { status: 500 }
    );
  }
}
