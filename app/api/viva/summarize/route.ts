// app/api/viva/summarize/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const {
      subject,
      difficulty,
      history,
      totalQuestions,
      elapsed = 0,
      uploadedContent,
    } = await request.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
    }

    if (!Array.isArray(history) || history.length === 0) {
      return NextResponse.json({ feedback: 'No answers were recorded. The viva could not be assessed.' });
    }

    // ── Compute aggregate metrics from the history array ──────────────────────
    // The frontend stores answers under `userAnswer`, not `answer`.
    const scored = history.filter((q: any) => typeof q.score === 'number');
    const avgScore = scored.length > 0
      ? (scored.reduce((s: number, q: any) => s + q.score, 0) / scored.length).toFixed(1)
      : '0';
    const avgClarity = scored.length > 0
      ? (scored.reduce((s: number, q: any) => s + (q.clarity ?? 0), 0) / scored.length).toFixed(1)
      : '0';
    const avgAccuracy = scored.length > 0
      ? (scored.reduce((s: number, q: any) => s + (q.accuracy ?? 0), 0) / scored.length).toFixed(1)
      : '0';
    const avgDepth = scored.length > 0
      ? (scored.reduce((s: number, q: any) => s + (q.depth ?? 0), 0) / scored.length).toFixed(1)
      : '0';
    const avgComm = scored.length > 0
      ? (scored.reduce((s: number, q: any) => s + (q.communication ?? 0), 0) / scored.length).toFixed(1)
      : '0';

    const formatTime = (s: number) =>
      `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

    // ── Build the Q&A transcript ───────────────────────────────────────────────
    // Note: field is `userAnswer`, not `answer`
    const transcript = history
      .map((q: any, i: number) => {
        const ans = q.userAnswer ?? q.answer ?? '(no answer recorded)';
        const fb = q.feedback ?? '(no feedback)';
        return [
          `Q${i + 1}: ${q.question}`,
          `Student answered: ${ans}`,
          `Score: ${q.score ?? '?'}/10  |  Clarity: ${q.clarity ?? '?'}  Accuracy: ${q.accuracy ?? '?'}  Depth: ${q.depth ?? '?'}  Communication: ${q.communication ?? '?'}`,
          `Sentiment detected: ${q.sentiment ?? 'neutral'}`,
          `Examiner feedback: ${fb}`,
        ].join('\n');
      })
      .join('\n\n---\n\n');

    const materialNote = uploadedContent
      ? `\nThe viva was based on uploaded study material. Tailor strengths/weaknesses to that material where evident.\n`
      : '';

    const prompt = `You are a senior academic examiner writing the official post-viva report for a student.

Subject: ${subject}
Level: ${difficulty}
Questions asked: ${totalQuestions}
Questions answered: ${history.length}
Duration: ${formatTime(elapsed)}
${materialNote}
Aggregate performance metrics:
- Overall average: ${avgScore}/10
- Clarity: ${avgClarity}/10
- Accuracy: ${avgAccuracy}/10
- Depth of knowledge: ${avgDepth}/10
- Communication: ${avgComm}/10

Full Q&A transcript with per-question scores:
${transcript}

Write a professional viva voce performance report with these EXACT sections (use these headers verbatim):

**Overall Performance**
2–3 sentences summarising how the student performed overall, referencing the average score and general patterns observed across their answers.

**Strengths**
• [Point 1 — cite a specific question/answer where they did well]
• [Point 2 — another specific strength]
• [Point 3 — communication or structural strength if applicable]

**Areas for Improvement**
• [Point 1 — specific concept gap with the question number]
• [Point 2 — another gap]
• [Point 3 — a suggestion for deeper study or technique]

**Final Verdict**
Choose exactly one: Excellent Pass | Pass | Borderline Pass | Fail
Follow with 1–2 sentences of justification referencing the average score and key observations.

Rules:
- Be specific: reference actual question numbers and content from their answers.
- Do not invent information not present in the transcript.
- Use **bold** for section headers and bullet points for lists, as shown above.
- Do not add extra sections or preambles.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.35,
            maxOutputTokens: 1200,
          },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error('Gemini API error (summarize):', err);
      return NextResponse.json({ error: 'Gemini API request failed' }, { status: 502 });
    }

    const data = await response.json();
    const summary = data.candidates?.[0]?.content?.parts?.[0]?.text ?? 'Summary unavailable.';

    return NextResponse.json({ feedback: summary });

  } catch (error) {
    console.error('summarize route error:', error);
    return NextResponse.json({
      feedback: 'Viva completed. The summary could not be generated at this time.',
    }, { status: 200 });
  }
}