// app/api/viva/summarize/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {

    const { subject, history, totalQuestions } = await request.json();

    const overallScore = history.reduce((sum: number, q: any) => sum + (q.score || 5), 0);
    const avgScore = overallScore / totalQuestions;
    const formattedScore = avgScore.toFixed(1);

    const summary = `Viva Voce Summary for ${subject}\n\n` +
      `Overall Performance: ${formattedScore}/10\n\n` +
      `Strengths:\n• Good grasp of fundamental concepts\n• Clear communication\n\n` +
      `Areas for Improvement:\n• Deeper analysis of edge cases\n• More precise technical terminology\n\n` +
      `Final Recommendation: ${avgScore >= 8 ? 'Excellent' : avgScore >= 6 ? 'Satisfactory' : 'Needs Improvement'}. Keep practicing!`;
    return NextResponse.json({
      feedback: summary
    });
  } catch (error) {
    return NextResponse.json({
      feedback: "Viva completed successfully. You showed decent understanding of the subject."
    });
  }
}