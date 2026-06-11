// app/api/viva/hint/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { question, expectedConcepts, subject } = await request.json();

    const hints = [
      "Focus on core concepts like time and space complexity.",
      "Consider edge cases and real-world applications.",
      "Think about the underlying data structures involved.",
      "Recall the standard algorithms and their trade-offs.",
      "Explain with a small example to demonstrate understanding."
    ];

    return NextResponse.json({
      hint: hints[Math.floor(Math.random() * hints.length)]
    });
  } catch (error) {
    return NextResponse.json({ 
      hint: "Consider fundamental principles and trade-offs in your answer." 
    });
  }
}