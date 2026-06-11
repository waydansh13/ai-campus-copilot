// app/api/viva/assess/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { userAnswer, expectedConcepts, question, subject, index } = await request.json();

    // Simple mock scoring logic
    const answerLength = userAnswer?.length || 0;
    let score = Math.floor(Math.random() * 4) + 6; // 6-9 base

    if (answerLength < 50) score = Math.max(3, score - 3);
    if (userAnswer.toLowerCase().includes('example') || userAnswer.toLowerCase().includes('because')) {
      score = Math.min(10, score + 1);
    }

    const feedbacks = [
      "Good conceptual coverage but could use more technical depth.",
      "Excellent answer! You demonstrated strong understanding.",
      "Solid response. Consider mentioning edge cases next time.",
      "Well structured. Try to be more precise with terminology.",
      "You missed a few key concepts. Review the fundamentals."
    ];

    const expressions = ['impressed', 'neutral', 'thinking', 'happy', 'disappointed'];

    return NextResponse.json({
      score: Math.min(10, Math.max(4, score)),
      feedback: feedbacks[Math.floor(Math.random() * feedbacks.length)],
      examinerExpression: expressions[Math.floor(Math.random() * expressions.length)]
    });
  } catch (error) {
    return NextResponse.json({
      score: 6,
      feedback: "Answer received. Please elaborate more in future responses.",
      examinerExpression: "neutral"
    }, { status: 200 });
  }
}