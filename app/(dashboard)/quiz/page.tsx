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

// ─── Neon Dark Theme Constants ────────────────────────────────────────────────

const NEON = '#00F0FF';
const NEON_DIM = 'rgba(0,240,255,0.6)';
const NEON_BG = 'rgba(0,240,255,0.06)';
const NEON_BORDER = 'rgba(0,240,255,0.15)';
const NEON_GLOW = '0 0 20px rgba(0,240,255,0.25)';
const BG = '#09090B';
const BG_SUBTLE = '#0D0D12';
const CARD = '#111116';
const CARD_ELEVATED = '#16161D';
const TEXT = '#F0F2F5';
const TEXT_SEC = '#7A8BA0';
const TEXT_DIM = '#4A5568';
const BORDER = 'rgba(255,255,255,0.06)';
const BORDER_HOVER = 'rgba(255,255,255,0.12)';

const SUCCESS = '#34D399';
const SUCCESS_DIM = 'rgba(52,211,153,0.15)';
const SUCCESS_BORDER = 'rgba(52,211,153,0.3)';
const DANGER = '#EF4444';
const DANGER_DIM = 'rgba(239,68,68,0.15)';
const DANGER_BORDER = 'rgba(239,68,68,0.3)';

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
    <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden', marginBottom: 5 }}>
      <div
        style={{
          height: '100%',
          width: `${pct}%`,
          background: NEON,
          borderRadius: 99,
          transition: 'width 0.4s ease',
          boxShadow: '0 0 8px rgba(0,240,255,0.4)',
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
      border: `1.5px solid ${NEON_BORDER}`, background: NEON_BG,
      marginTop: 10,
    }}>
      <span style={{ fontSize: 18 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: NEON, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {file.name}
        </div>
        <div style={{ fontSize: 11, color: NEON_DIM }}>{formatBytes(file.size)}</div>
      </div>
      <button
        onClick={onRemove}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: TEXT_DIM, padding: 4, borderRadius: 4, fontSize: 16, lineHeight: 1 }}
      >
        ✕
      </button>
    </div>
  );
}

function ScoreRing({ score, total }: { score: number; total: number }) {
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;
  const color = pct >= 80 ? SUCCESS : pct >= 50 ? '#FBBF24' : DANGER;
  const borderColor = pct >= 80 ? SUCCESS : pct >= 50 ? '#FBBF24' : DANGER;
  return (
    <div style={{
      width: 100, height: 100, borderRadius: '50%',
      border: `3px solid ${borderColor}`,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      margin: '0 auto 20px',
      boxShadow: `0 0 20px ${color}33`,
    }}>
      <div style={{ fontSize: 30, fontWeight: 700, color, lineHeight: 1 }}>{score}</div>
      <div style={{ fontSize: 12, color: TEXT_DIM, marginTop: 2 }}>/ {total}</div>
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

  // ── Styling ─────────────────────────────────────────────────────────────────

  const cardStyle: React.CSSProperties = {
    background: CARD,
    border: `1px solid ${BORDER}`,
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
  };

  const fieldLabelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.07em',
    textTransform: 'uppercase',
    color: TEXT_DIM,
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
        border: `1.5px solid ${active ? NEON : BORDER}`,
        background: active ? NEON_BG : 'transparent',
        fontSize: 13,
        fontWeight: active ? 600 : 500,
        color: active ? NEON : TEXT_SEC,
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
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: BG, minHeight: '100vh', color: TEXT }}>

      {/* Header */}
      <header style={{ background: BG_SUBTLE, borderBottom: `1px solid ${BORDER}`, padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: NEON, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: NEON_GLOW }}>
            <span style={{ fontSize: 18, color: BG }}>✦</span>
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: TEXT }}>QuizAI</div>
            <div style={{ fontSize: 11, color: TEXT_DIM, letterSpacing: '0.04em', textTransform: 'uppercase', marginTop: 1 }}>Powered by ❤️</div>
          </div>
        </div>

        {quizState === 'active' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 13, color: TEXT_SEC }}>{currentQ + 1} / {questions.length}</span>
            <button
              onClick={() => setQuizState('idle')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: TEXT_DIM, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}
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
            
            <div style={{ fontSize: 17, fontWeight: 600, color: TEXT, marginBottom: 5 }}>Generate a smart quiz</div>
            <div style={{ fontSize: 13, color: TEXT_SEC, lineHeight: 1.5 }}>
              Upload study material or enter any topic — AI quiz assistant will craft targeted questions for you.
            </div>
          </div>

          {/* Upload + topic */}
          <div style={cardStyle}>
            <span style={fieldLabelStyle}>
              Upload material{' '}
              <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: TEXT_DIM, fontSize: 11 }}>(optional)</span>
            </span>

            {!uploadedFile ? (
              <div
                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `1.5px dashed ${isDragging ? NEON : BORDER_HOVER}`,
                  borderRadius: 12,
                  padding: 22,
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: isDragging ? NEON_BG : 'rgba(255,255,255,0.02)',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ fontSize: 22, color: NEON_DIM, marginBottom: 6 }}>↑</div>
                <div style={{ fontSize: 13, color: TEXT_SEC, fontWeight: 500 }}>Drop a file here, or click to browse</div>
                <div style={{ fontSize: 11, color: TEXT_DIM, marginTop: 3, letterSpacing: '0.02em' }}>
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
              <div style={{ flex: 1, height: 1, background: BORDER }} />
              <span style={{ fontSize: 11, color: TEXT_DIM, letterSpacing: '0.06em' }}>OR ENTER TOPIC</span>
              <div style={{ flex: 1, height: 1, background: BORDER }} />
            </div>

            <input
              value={topic}
              onChange={e => setTopic(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && generateQuiz()}
              placeholder="e.g. 'French Revolution', 'Machine Learning', 'Organic Chemistry'…"
              style={{
                width: '100%', padding: '11px 14px',
                borderRadius: 10, border: `1.5px solid ${BORDER}`,
                fontSize: 14, fontFamily: 'inherit',
                color: TEXT, background: 'rgba(255,255,255,0.03)', outline: 'none',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => (e.target.style.borderColor = NEON)}
              onBlur={e => (e.target.style.borderColor = BORDER)}
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
              background: DANGER_DIM, border: `1px solid ${DANGER_BORDER}`,
              color: '#FCA5A5', fontSize: 13,
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
              background: quizState === 'generating' ? NEON_DIM : NEON,
              color: BG, fontSize: 15, fontWeight: 600,
              fontFamily: 'inherit', cursor: quizState === 'generating' ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'opacity 0.15s',
              boxShadow: NEON_GLOW,
            }}
          >
            {quizState === 'generating' ? (
              <>
                <span style={{
                  width: 16, height: 16,
                  border: `2px solid rgba(9,9,11,0.3)`,
                  borderTopColor: BG,
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
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: TEXT_DIM, marginBottom: 20 }}>
              <span>{answeredCount} answered</span>
              <span>Score: {score} / {questions.length}</span>
            </div>

            <div key={currentQ} style={{ ...cardStyle, marginBottom: 0, animation: 'fadeUp 0.25s ease' }}>
              {/* Q badge */}
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                fontSize: 11, fontWeight: 600, color: NEON,
                background: NEON_BG, padding: '3px 10px',
                borderRadius: 99, marginBottom: 12, letterSpacing: '0.03em',
                border: `1px solid ${NEON_BORDER}`,
              }}>
                Q{currentQ + 1} of {questions.length}
              </div>

              <p style={{ fontSize: 15, fontWeight: 500, color: TEXT, lineHeight: 1.55, marginBottom: 18 }}>
                {q.question}
              </p>

              {/* Options */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
                {q.options.map(opt => {
                  const isSelected = userAnswer === opt.key;
                  const isCorrectOpt = opt.key?.toUpperCase() === q.correct?.toUpperCase();

                  let border = `1.5px solid ${BORDER}`;
                  let bg = 'rgba(255,255,255,0.02)';
                  let textColor = TEXT;
                  let keyBg = 'rgba(255,255,255,0.04)';
                  let keyBorder = BORDER;
                  let keyColor = TEXT_SEC;

                  if (isRevealed) {
                    if (isCorrectOpt) {
                      border = `1.5px solid ${SUCCESS}`; bg = SUCCESS_DIM; textColor = SUCCESS;
                      keyBg = SUCCESS_DIM; keyBorder = SUCCESS; keyColor = SUCCESS;
                    } else if (isSelected) {
                      border = `1.5px solid ${DANGER}`; bg = DANGER_DIM; textColor = '#FCA5A5';
                      keyBg = DANGER_DIM; keyBorder = DANGER; keyColor = DANGER;
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
                  background: isCorrect ? SUCCESS_DIM : NEON_BG,
                  border: `1px solid ${isCorrect ? SUCCESS_BORDER : NEON_BORDER}`,
                }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: isCorrect ? SUCCESS : NEON, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 4 }}>
                    Explanation
                  </div>
                  <div style={{ fontSize: 13, color: isCorrect ? '#A7F3D0' : TEXT_SEC, lineHeight: 1.55 }}>
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
                    border: `1.5px solid ${BORDER}`, background: 'transparent',
                    fontSize: 13, fontWeight: 500, color: currentQ === 0 ? TEXT_DIM : TEXT_SEC,
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
                          ? NEON
                          : revealed[i]
                            ? selected[i]?.toUpperCase() === questions[i].correct?.toUpperCase() ? SUCCESS : DANGER
                            : 'rgba(255,255,255,0.1)',
                        cursor: 'pointer',
                        padding: 0,
                        transition: 'all 0.15s',
                        boxShadow: i === currentQ ? '0 0 8px rgba(0,240,255,0.4)' : 'none',
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
                      border: `1.5px solid ${NEON}`, background: NEON,
                      fontSize: 13, fontWeight: 500, color: BG,
                      cursor: 'pointer', fontFamily: 'inherit',
                      boxShadow: '0 0 10px rgba(0,240,255,0.2)',
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
                      border: `1.5px solid ${allAnswered ? SUCCESS : BORDER}`,
                      background: allAnswered ? SUCCESS_DIM : 'rgba(255,255,255,0.03)',
                      fontSize: 13, fontWeight: 600,
                      color: allAnswered ? SUCCESS : TEXT_DIM,
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

            <div style={{ fontSize: 18, fontWeight: 600, color: TEXT, marginBottom: 4 }}>
              {score / questions.length >= 0.8 ? 'Excellent work!' : score / questions.length >= 0.5 ? 'Good effort!' : 'Keep studying!'}
            </div>
            <div style={{ fontSize: 13, color: TEXT_SEC, marginBottom: 22 }}>
              {Math.round((score / questions.length) * 100)}% correct — {score} out of {questions.length}
            </div>

            {/* Per-question breakdown */}
            <div style={{
              borderTop: `1px solid ${BORDER}`, paddingTop: 16,
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
                      border: `1px solid ${correct ? SUCCESS_BORDER : DANGER_BORDER}`,
                      background: correct ? SUCCESS_DIM : DANGER_DIM,
                    }}
                  >
                    <span style={{ fontSize: 14, color: correct ? SUCCESS : DANGER, flexShrink: 0, marginTop: 1 }}>
                      {correct ? '✓' : '✕'}
                    </span>
                    <div>
                      <div style={{ fontSize: 12, color: TEXT_SEC, lineHeight: 1.4 }}>{q.question}</div>
                      {!correct && (
                        <div style={{ fontSize: 11, color: TEXT_DIM, marginTop: 2 }}>
                          Correct: <span style={{ color: SUCCESS, fontWeight: 500 }}>
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
                  padding: 12, borderRadius: 10, border: `1.5px solid ${BORDER}`,
                  background: 'transparent', fontSize: 14, fontWeight: 500,
                  color: TEXT_SEC, cursor: 'pointer', fontFamily: 'inherit',
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
                  background: NEON, fontSize: 14, fontWeight: 600,
                  color: BG, cursor: 'pointer', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  boxShadow: NEON_GLOW,
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
        ::-webkit-scrollbar-track { background: ${BG}; }
        ::-webkit-scrollbar-thumb { background: #2A2A35; border-radius: 4px; }
        button:hover:not(:disabled) { opacity: 0.88; }
      `}</style>
    </div>
  );
}