// app/api/viva/assess/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const {
      userAnswer,
      expectedConcepts,
      keyPoints = [],
      idealAnswer = "",
      maxMarks = 10,
      question,
      subject,
      index,
      conversationHistory = [],
      isFollowUp = false,
      followUpCount = 0,
      uploadedContent,
    } = await request.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
    }

    // ── Hard non-answer detection BEFORE hitting Gemini ───────────────────────
    const trimmed = (userAnswer ?? '').trim().toLowerCase();
    const nonAnswerPhrases = [
      'dunno', "don't know", 'dont know', 'idk', 'no idea', 'not sure',
      'i have no idea', 'i do not know', 'i dont know', "i don't know",
      'nothing', 'no clue', 'pass', 'skip', '?', 'no', 'yes', 'maybe',
      'ok', 'okay', 'hmm', 'um', 'uh', 'yeah', 'nope', 'nah',
    ];

    const wordCount = trimmed.split(/\s+/).filter(Boolean).length;

    const isNonAnswer =
      nonAnswerPhrases.includes(trimmed) ||
      trimmed.length < 8 ||
      wordCount < 3;

    if (isNonAnswer) {
      return NextResponse.json({
        score: 0,
        clarity: 0,
        accuracy: 0,
        depth: 0,
        communication: 0,
        feedback: `The student responded with "${userAnswer.trim()}" — this is not an attempt at an answer. A viva requires at least a partial explanation. Score: 0/10.`,
        examinerExpression: 'disappointed',
        sentiment: 'confused',
        acknowledgment: "That is not an answer.",
        shouldFollowUp: false,
        followupQuestion: '',
      });
    }

    // ── Context snippets ──────────────────────────────────────────────────────
    const contextSnippet = conversationHistory.length > 0
      ? `Recent conversation:\n${conversationHistory
        .slice(-4)
        .map((m: any) => `${m.role === 'tutor' ? 'Examiner' : 'Student'}: ${m.text}`)
        .join('\n')}\n\n`
      : '';

    const materialHint = uploadedContent
      ? `Course material context (first 600 chars):\n${uploadedContent.slice(0, 600)}\n\n`
      : '';

    const prompt = `You are an uncompromising university viva examiner. Evaluate student answers STRICTLY.

SUBJECT: ${subject}
QUESTION ${index + 1}${isFollowUp ? ' (follow-up)' : ''}: ${question}
EXPECTED CONCEPTS: ${expectedConcepts?.join(', ') || 'N/A'}
KEY POINTS: ${keyPoints?.join(', ') || 'N/A'}
IDEAL ANSWER: "${idealAnswer}"
${contextSnippet}${materialHint}STUDENT ANSWER (${wordCount} words): "${userAnswer}"

━━━━ MANDATORY SCORING RUBRIC (OUT OF 100) ━━━━
1. Concept Accuracy (40%): Is the information scientifically/factually correct?
2. Completeness (30%): Are all key points and expected concepts covered?
3. Examples / Supporting Points (15%): Did the student provide examples or deep context?
4. Clarity & Structure (15%): Is the answer logically structured and clearly communicated?

CRITICAL RULES YOU MUST FOLLOW:
1. Compare the student's answer against the EXPECTED CONCEPTS and KEY POINTS to populate missingPoints and strengths.
2. Missing points should clearly identify concepts the student failed to mention.
3. If important concepts are missing, set shouldFollowUp = true.
4. Generate a follow-up question focused on the most important missing concept (or weakly explained concept).
5. If the answer is sufficiently complete, set shouldFollowUp = false.
6. Follow-up priority: 1. Most important missing concept 2. Weakly explained concept 3. Missing example 4. Edge cases. Follow-ups must be short, viva-style, and test understanding (e.g., "Can you explain the Circular Wait condition?").
7. followUpCount=${followUpCount}. Only set shouldFollowUp=true if followUpCount < 1.
8. Do NOT calculate the final total score. Only provide the subscores.

RESPOND WITH ONLY THIS RAW JSON — no markdown, no code fences, nothing else:
{
  "accuracy": <integer 0-40>,
  "completeness": <integer 0-30>,
  "examples": <integer 0-15>,
  "clarity": <integer 0-15>,
  "strengths": ["...", "..."],
  "missingPoints": ["...", "..."],
  "feedback": "<2-3 sentences of overall examiner feedback>",
  "shouldFollowUp": <true | false>,
  "followupQuestion": "<short targeted follow-up question or empty string>"
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 700,
          },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error('Gemini API error (assess):', err);
      return NextResponse.json({ error: 'Gemini API request failed' }, { status: 502 });
    }

    const data = await response.json();
    const rawText: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    const cleaned = rawText
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/gi, '')
      .trim();

    let result: any;
    try {
      result = JSON.parse(cleaned);
    } catch {
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try { result = JSON.parse(jsonMatch[0]); }
        catch {
          console.error('JSON parse failed. Raw:', rawText);
          return NextResponse.json({
            score: Math.round(3 * (maxMarks / 10)), clarity: 3, accuracy: 3, depth: 2, communication: 3,
            feedback: 'Your answer was noted but could not be fully evaluated.',
            examinerExpression: 'neutral', sentiment: 'neutral',
            acknowledgment: 'I see, let us continue.',
            shouldFollowUp: false, followupQuestion: '',
          });
        }
      } else {
        return NextResponse.json({
          score: Math.round(3 * (maxMarks / 10)), clarity: 3, accuracy: 3, depth: 2, communication: 3,
          feedback: 'Your answer was noted but could not be fully evaluated.',
          examinerExpression: 'neutral', sentiment: 'neutral',
          acknowledgment: 'Let us continue.',
          shouldFollowUp: false, followupQuestion: '',
        });
      }
    }

    const clamp = (v: any, min: number, max: number) =>
      Math.min(max, Math.max(min, Math.round(Number(v) || 0)));

    const acc = clamp(result.accuracy, 0, 40);
    const comp = clamp(result.completeness, 0, 30);
    const ex = clamp(result.examples, 0, 15);
    const clar = clamp(result.clarity, 0, 15);
    const total = acc + comp + ex + clar;

    const finalScore = Math.round((total / 100) * maxMarks);

    // UI mapping
    const uiAccuracy = Math.round((acc / 40) * 10);
    const uiDepth = Math.round((comp / 30) * 10);
    const uiCommunication = Math.round((ex / 15) * 10);
    const uiClarity = Math.round((clar / 15) * 10);

    // Fallbacks for conversational fields
    let examinerExpression = 'neutral';
    if (total > 70) examinerExpression = 'happy';
    else if (total < 40) examinerExpression = 'disappointed';

    let sentiment = 'neutral';
    if (total > 80) sentiment = 'confident';
    else if (total < 30) sentiment = 'confused';

    let acknowledgment = 'I see.';
    if (total > 80) acknowledgment = 'Excellent.';
    else if (total > 60) acknowledgment = 'Good answer.';
    else if (total < 40) acknowledgment = 'You missed a few points.';

    const strengthsStr = Array.isArray(result.strengths) && result.strengths.length > 0 
      ? `Strengths: ${result.strengths.join(', ')}. ` : '';
    const missingStr = Array.isArray(result.missingPoints) && result.missingPoints.length > 0
      ? `Missing: ${result.missingPoints.join(', ')}. ` : '';
    const richFeedback = `${strengthsStr}${missingStr}${result.feedback || ''}`.trim();

    return NextResponse.json({
      score: finalScore,
      clarity: uiClarity,
      accuracy: uiAccuracy,
      depth: uiDepth,
      communication: uiCommunication,
      feedback: richFeedback,
      examinerExpression,
      sentiment,
      acknowledgment,
      shouldFollowUp: Boolean(result.shouldFollowUp),
      followupQuestion: typeof result.followupQuestion === 'string' ? result.followupQuestion : '',
    });

  } catch (error) {
    console.error('assess route error:', error);
    return NextResponse.json({
      score: 0, clarity: 0, accuracy: 0, depth: 0, communication: 0,
      feedback: 'Evaluation failed. Please try again.',
      examinerExpression: 'neutral', sentiment: 'neutral',
      acknowledgment: 'Let us continue.',
      shouldFollowUp: false, followupQuestion: '',
    }, { status: 200 });
  }
}