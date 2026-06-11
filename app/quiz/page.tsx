'use client';

import React, { useState, useRef, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface QuizOption {
  key: string;
  text: string;
}

interface QuizQuestion {
  id: number;
  question: string;
  options: QuizOption[];
  correct: string;
  explanation: string;
  type: 'mcq' | 'truefalse' | 'short';
}

interface UploadedFile {
  name: string;
  size: number;
  mimeType: string;
  base64: string;
  isImage: boolean;
  isDocument: boolean;
}

type QuizState = 'idle' | 'generating' | 'active' | 'results';
type Difficulty = 'easy' | 'medium' | 'hard' | 'mixed';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function parseQuizFromText(text: string): QuizQuestion[] {
  const questions: QuizQuestion[] = [];
  const clean = text.replace(/```(?:json)?/gi, '').trim();

  try {
    const parsed = JSON.parse(clean);
    const arr = Array.isArray(parsed) ? parsed : parsed.questions ?? parsed.quiz ?? [];
    return arr.map((q: any, i: number) => ({
      id: i + 1,
      question: q.question || q.q || '',
      options: Array.isArray(q.options)
        ? q.options.map((o: any, j: number) => ({
          key: typeof o === 'string' ? String.fromCharCode(65 + j) : o.key ?? String.fromCharCode(65 + j),
          text: typeof o === 'string' ? o : o.text ?? o.value ?? '',
        }))
        : [],
      correct: (q.correct ?? q.answer ?? q.correctAnswer ?? '').toString().toUpperCase(),
      explanation: q.explanation ?? q.reason ?? '',
      type: q.type ?? 'mcq',
    }));
  } catch {
    /* not JSON, parse markdown */
  }

  const blocks = clean.split(/\n(?=\d+[\.\)])/);
  for (const block of blocks) {
    const lines = block.trim().split('\n').filter(Boolean);
    if (!lines.length) continue;
    const qLine = lines[0].replace(/^\d+[\.\)]\s*/, '').trim();
    const options: QuizOption[] = [];
    let correct = '';
    let explanation = '';

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      const optMatch = line.match(/^([A-Da-d])[\.\)]\s*(.+)/);
      if (optMatch) { options.push({ key: optMatch[1].toUpperCase(), text: optMatch[2].trim() }); continue; }
      const ansMatch = line.match(/^(?:Answer|Correct|Ans)[:\s]+([A-Da-d])/i);
      if (ansMatch) { correct = ansMatch[1].toUpperCase(); continue; }
      const expMatch = line.match(/^(?:Explanation|Reason|Why)[:\s]+(.+)/i);
      if (expMatch) { explanation = expMatch[1].trim(); }
    }

    if (qLine && options.length >= 2) {
      questions.push({ id: questions.length + 1, question: qLine, options, correct, explanation, type: 'mcq' });
    }
  }

  return questions;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ height: 3, background: '#e8e8f0', borderRadius: 99, overflow: 'hidden', marginBottom: 5 }}>
      <div
        style={{
          height: '100%',
          width: `${pct}%`,
          background: '#534AB7',
          borderRadius: 99,
          transition: 'width 0.4s ease',
        }}
      />
    </div>
  );
}

function FileChip({ file, onRemove }: { file: UploadedFile; onRemove: () => void }) {
  const iconMap: Record<string, string> = {
    pdf: '📄', pptx: '📊', ppt: '📊', docx: '📝', doc: '📝',
    txt: '📃', csv: '📋', md: '📃',
  };
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  const icon = file.isImage ? '🖼️' : (iconMap[ext] ?? '📁');

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 14px', borderRadius: 10,
      border: '1.5px solid #b5d4f4', background: '#e6f1fb',
      marginTop: 10,
    }}>
      <span style={{ fontSize: 18 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#0C447C', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {file.name}
        </div>
        <div style={{ fontSize: 11, color: '#378ADD' }}>{formatBytes(file.size)}</div>
      </div>
      <button
        onClick={onRemove}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#85B7EB', padding: 4, borderRadius: 4, fontSize: 16, lineHeight: 1 }}
      >
        ✕
      </button>
    </div>
  );
}

function ScoreRing({ score, total }: { score: number; total: number }) {
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;
  const color = pct >= 80 ? '#3B6D11' : pct >= 50 ? '#BA7517' : '#E24B4A';
  const borderColor = pct >= 80 ? '#639922' : pct >= 50 ? '#BA7517' : '#E24B4A';
  return (
    <div style={{
      width: 100, height: 100, borderRadius: '50%',
      border: `3px solid ${borderColor}`,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      margin: '0 auto 20px',
    }}>
      <div style={{ fontSize: 30, fontWeight: 700, color, lineHeight: 1 }}>{score}</div>
      <div style={{ fontSize: 12, color: '#9090a8', marginTop: 2 }}>/ {total}</div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function QuizPage() {
  const [topic, setTopic] = useState('');
  const [questionCount, setQuestionCount] = useState(10);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [questionTypes, setQuestionTypes] = useState<string[]>(['mcq']);
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);

  const [quizState, setQuizState] = useState<QuizState>('idle');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<Record<number, string>>({});
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Styling constants ─────────────────────────────────────────────────────

  const PURPLE = '#534AB7';
  const PURPLE_LIGHT = '#EEEDFE';
  const PURPLE_BORDER = '#CECBF6';
  const GRAY_BG = '#f5f5fb';
  const CARD_BORDER = '#e8e8f0';
  const TEXT_MAIN = '#1a1a2e';
  const TEXT_MUTED = '#9090a8';

  const cardStyle: React.CSSProperties = {
    background: '#fff',
    border: `1px solid ${CARD_BORDER}`,
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
  };

  const fieldLabelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.07em',
    textTransform: 'uppercase',
    color: TEXT_MUTED,
    marginBottom: 10,
    display: 'block',
  };

  // ── File handling ─────────────────────────────────────────────────────────

  const handleFile = useCallback(async (file: File) => {
    setError('');
    if (file.size > 20 * 1024 * 1024) { setError('File too large — max 20 MB.'); return; }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = (e.target?.result as string).split(',')[1];
      const isImage = file.type.startsWith('image/');
      setUploadedFile({
        name: file.name,
        size: file.size,
        mimeType: file.type || 'application/octet-stream',
        base64,
        isImage,
        isDocument: !isImage,
      });
    };
    reader.readAsDataURL(file);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  // ── Quiz generation — calls /api/generate-quiz backend route ─────────────

  const generateQuiz = useCallback(async () => {
    if (!topic.trim() && !uploadedFile) { setError('Please enter a topic or upload a file.'); return; }
    setError('');
    setQuizState('generating');

    try {
      const res = await fetch('/api/quiz/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          questionCount,
          difficulty,
          questionTypes,
          // Only send file data if a file is uploaded
          uploadedFile: uploadedFile
            ? {
              mimeType: uploadedFile.mimeType,
              base64: uploadedFile.base64,
              isImage: uploadedFile.isImage,
            }
            : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');

      const parsed = parseQuizFromText(data.text);
      if (!parsed.length) throw new Error('Could not parse questions. Please try again.');

      setQuestions(parsed);
      setCurrentQ(0);
      setSelected({});
      setRevealed({});
      setQuizState('active');
    } catch (e: any) {
      setError(e.message || 'Failed to generate quiz');
      setQuizState('idle');
    }
  }, [topic, uploadedFile, questionCount, difficulty, questionTypes]);

  // ── Quiz interaction ──────────────────────────────────────────────────────

  const handleSelect = (key: string) => {
    if (revealed[currentQ]) return;
    setSelected(s => ({ ...s, [currentQ]: key }));
    setRevealed(r => ({ ...r, [currentQ]: true }));
  };

  const score = questions.reduce((acc, q, i) =>
    acc + (selected[i]?.toUpperCase() === q.correct?.toUpperCase() ? 1 : 0), 0);

  const allAnswered = questions.length > 0 && Object.keys(revealed).length === questions.length;

  const COUNT_OPTIONS = [5, 10, 15, 20, 30];
  const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard', 'mixed'];
  const TYPE_OPTIONS = [{ key: 'mcq', label: '4-option MCQ' }, { key: 'truefalse', label: 'True / False' }];

  // ─── Segmented button helper ──────────────────────────────────────────────

  const SegBtn = ({
    active, onClick, children, style,
  }: { active: boolean; onClick: () => void; children: React.ReactNode; style?: React.CSSProperties }) => (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        padding: '10px 8px',
        borderRadius: 10,
        border: `1.5px solid ${active ? PURPLE : CARD_BORDER}`,
        background: active ? PURPLE_LIGHT : '#fff',
        fontSize: 13,
        fontWeight: active ? 600 : 500,
        color: active ? PURPLE : TEXT_MUTED,
        cursor: 'pointer',
        transition: 'all 0.15s',
        fontFamily: 'inherit',
        textAlign: 'center',
        ...style,
      }}
    >
      {children}
    </button>
  );

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: GRAY_BG, minHeight: '100vh', color: TEXT_MAIN }}>

      {/* Header */}
      <header style={{ background: '#fff', borderBottom: `1px solid ${CARD_BORDER}`, padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: PURPLE, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 18, color: '#fff' }}>✦</span>
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: TEXT_MAIN }}>QuizAI</div>
            <div style={{ fontSize: 11, color: TEXT_MUTED, letterSpacing: '0.04em', textTransform: 'uppercase', marginTop: 1 }}>Powered by ❤️</div>
          </div>
        </div>

        {quizState === 'active' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 13, color: TEXT_MUTED }}>{currentQ + 1} / {questions.length}</span>
            <button
              onClick={() => setQuizState('idle')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: TEXT_MUTED, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              ✕ Exit
            </button>
          </div>
        )}
      </header>

      {/* ── IDLE / CONFIG ───────────────────────────────────────────────── */}
      {(quizState === 'idle' || quizState === 'generating') && (
        <main style={{ maxWidth: 580, margin: '0 auto', padding: '28px 16px 48px' }}>

          {/* Hero card */}
          <div style={{ ...cardStyle, textAlign: 'center', padding: '28px 24px 22px' }}>
            
            <div style={{ fontSize: 17, fontWeight: 600, color: TEXT_MAIN, marginBottom: 5 }}>Generate a smart quiz</div>
            <div style={{ fontSize: 13, color: TEXT_MUTED, lineHeight: 1.5 }}>
              Upload study material or enter any topic — AI quiz assistant will craft targeted questions for you.
            </div>
          </div>

          {/* Upload + topic */}
          <div style={cardStyle}>
            <span style={fieldLabelStyle}>
              Upload material{' '}
              <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: '#c0c0d0', fontSize: 11 }}>(optional)</span>
            </span>

            {!uploadedFile ? (
              <div
                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `1.5px dashed ${isDragging ? PURPLE : '#d0d0e8'}`,
                  borderRadius: 12,
                  padding: 22,
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: isDragging ? PURPLE_LIGHT : '#fafaff',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ fontSize: 22, color: '#AFA9EC', marginBottom: 6 }}>↑</div>
                <div style={{ fontSize: 13, color: TEXT_MUTED, fontWeight: 500 }}>Drop a file here, or click to browse</div>
                <div style={{ fontSize: 11, color: '#c0c0d0', marginTop: 3, letterSpacing: '0.02em' }}>
                  PDF · PPTX · DOCX · TXT · CSV · PNG · JPG — up to 20 MB
                </div>
              </div>
            ) : (
              <FileChip file={uploadedFile} onRemove={() => setUploadedFile(null)} />
            )}

            <input
              ref={fileInputRef}
              type="file"
              style={{ display: 'none' }}
              accept=".pdf,.ppt,.pptx,.doc,.docx,.txt,.md,.csv,.jpg,.jpeg,.png,.webp,.gif,.heic"
              onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
            />

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '14px 0' }}>
              <div style={{ flex: 1, height: 1, background: '#f0f0f8' }} />
              <span style={{ fontSize: 11, color: '#c0c0d0', letterSpacing: '0.06em' }}>OR ENTER TOPIC</span>
              <div style={{ flex: 1, height: 1, background: '#f0f0f8' }} />
            </div>

            <input
              value={topic}
              onChange={e => setTopic(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && generateQuiz()}
              placeholder="e.g. 'French Revolution', 'Machine Learning', 'Organic Chemistry'…"
              style={{
                width: '100%', padding: '11px 14px',
                borderRadius: 10, border: `1.5px solid ${CARD_BORDER}`,
                fontSize: 14, fontFamily: 'inherit',
                color: TEXT_MAIN, background: '#fff', outline: 'none',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => (e.target.style.borderColor = PURPLE)}
              onBlur={e => (e.target.style.borderColor = CARD_BORDER)}
            />
          </div>

          {/* Count */}
          <div style={cardStyle}>
            <span style={fieldLabelStyle}>Number of questions</span>
            <div style={{ display: 'flex', gap: 8 }}>
              {COUNT_OPTIONS.map(n => (
                <SegBtn key={n} active={questionCount === n} onClick={() => setQuestionCount(n)}>
                  {n}
                </SegBtn>
              ))}
            </div>
          </div>

          {/* Difficulty + Types */}
          <div style={{ ...cardStyle, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div>
              <span style={fieldLabelStyle}>Difficulty</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {DIFFICULTIES.map(d => (
                  <SegBtn
                    key={d}
                    active={difficulty === d}
                    onClick={() => setDifficulty(d)}
                    style={{ flex: 'unset', width: '100%' }}
                  >
                    {d.charAt(0).toUpperCase() + d.slice(1)}
                  </SegBtn>
                ))}
              </div>
            </div>
            <div>
              <span style={fieldLabelStyle}>Question type</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {TYPE_OPTIONS.map(({ key, label }) => {
                  const active = questionTypes.includes(key);
                  return (
                    <SegBtn
                      key={key}
                      active={active}
                      style={{ flex: 'unset', width: '100%' }}
                      onClick={() => {
                        setQuestionTypes(prev =>
                          active && prev.length > 1
                            ? prev.filter(t => t !== key)
                            : active ? prev : [...prev, key]
                        );
                      }}
                    >
                      {label}
                    </SegBtn>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              padding: '10px 14px', borderRadius: 10, marginBottom: 12,
              background: '#FCEBEB', border: '1px solid #F7C1C1',
              color: '#A32D2D', fontSize: 13,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              ⚠ {error}
            </div>
          )}

          {/* Generate button */}
          <button
            onClick={generateQuiz}
            disabled={quizState === 'generating'}
            style={{
              width: '100%', padding: 14,
              borderRadius: 12, border: 'none',
              background: quizState === 'generating' ? '#AFA9EC' : PURPLE,
              color: '#fff', fontSize: 15, fontWeight: 600,
              fontFamily: 'inherit', cursor: quizState === 'generating' ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'opacity 0.15s',
            }}
          >
            {quizState === 'generating' ? (
              <>
                <span style={{
                  width: 16, height: 16,
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: '#fff',
                  borderRadius: '50%',
                  display: 'inline-block',
                  animation: 'spin 0.7s linear infinite',
                }} />
                Generating quiz…
              </>
            ) : (
              <>✦ Generate quiz</>
            )}
          </button>
        </main>
      )}

      {/* ── ACTIVE QUIZ ─────────────────────────────────────────────────── */}
      {quizState === 'active' && questions.length > 0 && (() => {
        const q = questions[currentQ];
        const userAnswer = selected[currentQ];
        const isRevealed = revealed[currentQ];
        const isCorrect = userAnswer?.toUpperCase() === q.correct?.toUpperCase();
        const answeredCount = Object.keys(revealed).length;

        return (
          <main style={{ maxWidth: 580, margin: '0 auto', padding: '24px 16px 48px' }}>
            <ProgressBar value={answeredCount} max={questions.length} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: TEXT_MUTED, marginBottom: 20 }}>
              <span>{answeredCount} answered</span>
              <span>Score: {score} / {questions.length}</span>
            </div>

            <div key={currentQ} style={{ ...cardStyle, marginBottom: 0, animation: 'fadeUp 0.25s ease' }}>
              {/* Q badge */}
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                fontSize: 11, fontWeight: 600, color: PURPLE,
                background: PURPLE_LIGHT, padding: '3px 10px',
                borderRadius: 99, marginBottom: 12, letterSpacing: '0.03em',
              }}>
                Q{currentQ + 1} of {questions.length}
              </div>

              <p style={{ fontSize: 15, fontWeight: 500, color: TEXT_MAIN, lineHeight: 1.55, marginBottom: 18 }}>
                {q.question}
              </p>

              {/* Options */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
                {q.options.map(opt => {
                  const isSelected = userAnswer === opt.key;
                  const isCorrectOpt = opt.key?.toUpperCase() === q.correct?.toUpperCase();

                  let border = `1.5px solid ${CARD_BORDER}`;
                  let bg = '#fff';
                  let textColor = TEXT_MAIN;
                  let keyBg = '#f5f5fb';
                  let keyBorder = CARD_BORDER;
                  let keyColor = TEXT_MUTED;

                  if (isRevealed) {
                    if (isCorrectOpt) {
                      border = '1.5px solid #639922'; bg = '#EAF3DE'; textColor = '#3B6D11';
                      keyBg = '#EAF3DE'; keyBorder = '#97C459'; keyColor = '#3B6D11';
                    } else if (isSelected) {
                      border = '1.5px solid #E24B4A'; bg = '#FCEBEB'; textColor = '#A32D2D';
                      keyBg = '#FCEBEB'; keyBorder = '#F09595'; keyColor = '#A32D2D';
                    }
                  }

                  return (
                    <button
                      key={opt.key}
                      onClick={() => handleSelect(opt.key)}
                      disabled={!!isRevealed}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '12px 14px', borderRadius: 12,
                        border, background: bg, cursor: isRevealed ? 'default' : 'pointer',
                        textAlign: 'left', fontFamily: 'inherit', width: '100%',
                        transition: 'all 0.12s',
                      }}
                    >
                      <span style={{
                        width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                        background: keyBg, border: `1px solid ${keyBorder}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 600, color: keyColor,
                      }}>
                        {isRevealed && isCorrectOpt ? '✓' : isRevealed && isSelected && !isCorrectOpt ? '✕' : opt.key}
                      </span>
                      <span style={{ fontSize: 13, color: textColor, lineHeight: 1.4 }}>{opt.text}</span>
                    </button>
                  );
                })}
              </div>

              {/* Explanation */}
              {isRevealed && q.explanation && (
                <div style={{
                  padding: '12px 14px', borderRadius: 10, marginBottom: 18,
                  background: isCorrect ? '#EAF3DE' : PURPLE_LIGHT,
                  border: `1px solid ${isCorrect ? '#C0DD97' : PURPLE_BORDER}`,
                }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: isCorrect ? '#3B6D11' : PURPLE, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 4 }}>
                    Explanation
                  </div>
                  <div style={{ fontSize: 13, color: isCorrect ? '#27500A' : '#3C3489', lineHeight: 1.55 }}>
                    {q.explanation}
                  </div>
                </div>
              )}

              {/* Navigation */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <button
                  onClick={() => setCurrentQ(q => Math.max(0, q - 1))}
                  disabled={currentQ === 0}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '9px 16px', borderRadius: 10,
                    border: `1.5px solid ${CARD_BORDER}`, background: '#fff',
                    fontSize: 13, fontWeight: 500, color: currentQ === 0 ? '#c0c0d0' : TEXT_MUTED,
                    cursor: currentQ === 0 ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  ← Prev
                </button>

                {/* Dot nav */}
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 200 }}>
                  {questions.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentQ(i)}
                      style={{
                        width: i === currentQ ? 20 : 7,
                        height: 7,
                        borderRadius: 99,
                        border: 'none',
                        background: i === currentQ
                          ? PURPLE
                          : revealed[i]
                            ? selected[i]?.toUpperCase() === questions[i].correct?.toUpperCase() ? '#639922' : '#E24B4A'
                            : '#e0e0ee',
                        cursor: 'pointer',
                        padding: 0,
                        transition: 'all 0.15s',
                      }}
                    />
                  ))}
                </div>

                {currentQ < questions.length - 1 ? (
                  <button
                    onClick={() => setCurrentQ(q => q + 1)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      padding: '9px 16px', borderRadius: 10,
                      border: `1.5px solid ${PURPLE}`, background: PURPLE,
                      fontSize: 13, fontWeight: 500, color: '#fff',
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    Next →
                  </button>
                ) : (
                  <button
                    onClick={() => setQuizState('results')}
                    disabled={!allAnswered}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      padding: '9px 16px', borderRadius: 10,
                      border: `1.5px solid ${allAnswered ? '#639922' : CARD_BORDER}`,
                      background: allAnswered ? '#EAF3DE' : '#f5f5fb',
                      fontSize: 13, fontWeight: 600,
                      color: allAnswered ? '#3B6D11' : TEXT_MUTED,
                      cursor: allAnswered ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
                    }}
                  >
                    Finish ✓
                  </button>
                )}
              </div>
            </div>
          </main>
        );
      })()}

      {/* ── RESULTS ─────────────────────────────────────────────────────── */}
      {quizState === 'results' && (
        <main style={{ maxWidth: 580, margin: '0 auto', padding: '28px 16px 48px' }}>
          <div style={{ ...cardStyle, textAlign: 'center', padding: '32px 24px 24px' }}>
            <ScoreRing score={score} total={questions.length} />

            <div style={{ fontSize: 18, fontWeight: 600, color: TEXT_MAIN, marginBottom: 4 }}>
              {score / questions.length >= 0.8 ? 'Excellent work!' : score / questions.length >= 0.5 ? 'Good effort!' : 'Keep studying!'}
            </div>
            <div style={{ fontSize: 13, color: TEXT_MUTED, marginBottom: 22 }}>
              {Math.round((score / questions.length) * 100)}% correct — {score} out of {questions.length}
            </div>

            {/* Per-question breakdown */}
            <div style={{
              borderTop: `1px solid #f0f0f8`, paddingTop: 16,
              display: 'flex', flexDirection: 'column', gap: 7,
              maxHeight: 240, overflowY: 'auto', marginBottom: 20, textAlign: 'left',
            }}>
              {questions.map((q, i) => {
                const correct = selected[i]?.toUpperCase() === q.correct?.toUpperCase();
                const correctOpt = q.options.find(o => o.key === q.correct);
                return (
                  <div
                    key={i}
                    onClick={() => { setCurrentQ(i); setQuizState('active'); }}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 9,
                      padding: '9px 12px', borderRadius: 10, cursor: 'pointer',
                      border: `1px solid ${correct ? '#C0DD97' : '#F7C1C1'}`,
                      background: correct ? '#EAF3DE' : '#FCEBEB',
                    }}
                  >
                    <span style={{ fontSize: 14, color: correct ? '#639922' : '#E24B4A', flexShrink: 0, marginTop: 1 }}>
                      {correct ? '✓' : '✕'}
                    </span>
                    <div>
                      <div style={{ fontSize: 12, color: '#444', lineHeight: 1.4 }}>{q.question}</div>
                      {!correct && (
                        <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 2 }}>
                          Correct: <span style={{ color: '#639922', fontWeight: 500 }}>
                            {q.correct}{correctOpt ? ` — ${correctOpt.text}` : ''}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button
                onClick={() => { setCurrentQ(0); setQuizState('active'); }}
                style={{
                  padding: 12, borderRadius: 10, border: `1.5px solid ${CARD_BORDER}`,
                  background: '#fff', fontSize: 14, fontWeight: 500,
                  color: TEXT_MUTED, cursor: 'pointer', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                Review answers
              </button>
              <button
                onClick={() => {
                  setQuizState('idle');
                  setQuestions([]);
                  setSelected({});
                  setRevealed({});
                  setTopic('');
                  setUploadedFile(null);
                }}
                style={{
                  padding: 12, borderRadius: 10, border: 'none',
                  background: PURPLE, fontSize: 14, fontWeight: 600,
                  color: '#fff', cursor: 'pointer', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                New quiz
              </button>
            </div>
          </div>
        </main>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #f5f5fb; }
        ::-webkit-scrollbar-thumb { background: #d0d0e8; border-radius: 4px; }
        button:hover:not(:disabled) { opacity: 0.88; }
      `}</style>
    </div>
  );
}