// app/api/viva/start/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { subject = "Computer Science", difficulty = "medium" } = await request.json();

    const sampleQuestions = [
      {
        question: "Explain the difference between BFS and DFS with examples.",
        expectedConcepts: ["graph traversal", "queue", "stack", "time complexity"]
      },
      {
        question: "What is a deadlock in operating systems? How to prevent it?",
        expectedConcepts: ["deadlock", "mutual exclusion", "resource allocation"]
      },
      {
        question: "How does a HashMap work internally?",
        expectedConcepts: ["hashing", "collision resolution", "load factor"]
      }
    ];

    return NextResponse.json({
      questions: sampleQuestions,
      introMessage: `Welcome to your ${difficulty} viva on ${subject}. I am Professor Charles. Let's begin the assessment.`,
    });
  } catch (error) {
    console.error("Start API Error:", error);
    return NextResponse.json({ 
      error: 'Failed to start viva session' 
    }, { status: 500 });
  }
}