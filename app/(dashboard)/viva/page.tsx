'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Mic, MicOff, Volume2, VolumeX, RotateCcw, Phone, Send,
  ChevronDown, Upload, FileText, X, Loader2, Award, Brain,
  Zap, MessageSquare, Activity, Eye, EyeOff,
} from 'lucide-react';

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
const SUCCESS_DIM = 'rgba(52,211,153,0.12)';
const DANGER = '#EF4444';
const DANGER_DIM = 'rgba(239,68,68,0.12)';
const WARNING = '#FBBF24';
const WARNING_DIM = 'rgba(251,191,36,0.12)';
const WARNING_BORDER = 'rgba(251,191,36,0.25)';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Message {
  role: 'tutor' | 'student';
  text: string;
  type?: 'question' | 'followup' | 'feedback' | 'intro' | 'thinking' | 'answer';
  score?: number;
  isThinking?: boolean;
}

interface EvalResult {
  score: number;
  clarity: number;
  accuracy: number;
  depth: number;
  communication: number;
  sentiment: string;
  feedback: string;
  followupQuestion?: string;
  shouldFollowUp?: boolean;
  expression: string;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  dur: number;
  delay: number;
  opacity: number;
}

// ─── Topics ──────────────────────────────────────────────────────────────────
const TOPICS = [
  'Data Structures & Algorithms', 'Operating Systems', 'Machine Learning',
  'Database Management', 'Computer Networks', 'Software Engineering',
  'Web Technologies', 'Artificial Intelligence',
];
const LEVELS = ['Beginner', 'Undergraduate', 'Advanced'];

// ─── Animated Particles (CLIENT-ONLY — fixes hydration mismatch) ──────────────
function Particles({ count = 20 }: { count?: number }) {
  const [particles, setParticles] = useState<Particle[]>([]);

  // Only generate on client — never on server — eliminates hydration mismatch
  useEffect(() => {
    setParticles(
      Array.from({ length: count }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 1 + Math.random() * 2,
        dur: 6 + Math.random() * 10,
        delay: Math.random() * 8,
        opacity: 0.06 + Math.random() * 0.12,
      }))
    );
  }, [count]);

  if (particles.length === 0) return null;

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {particles.map(p => (
        <div key={p.id} style={{
          position: 'absolute',
          left: `${p.x}%`,
          top: `${p.y}%`,
          width: p.size,
          height: p.size,
          borderRadius: '50%',
          background: NEON,
          opacity: p.opacity,
          animationName: 'float', animationDuration: `${p.dur}s`, animationTimingFunction: 'ease-in-out', animationDelay: `${p.delay}s`, animationIterationCount: 'infinite', animationDirection: 'alternate',
        }} />
      ))}
    </div>
  );
}

// ─── Professor Face Avatar — lip sync + eye blink, no animation shorthand bug ──
function ProfessorFace({ talking, listening, thinking, expression }: {
  talking: boolean; listening: boolean; thinking: boolean; expression: string;
}) {
  // Eye blink state — client only
  const [blink, setBlink] = useState(false);
  const [mouthFrame, setMouthFrame] = useState(0);

  // Random blink every 2-5 seconds
  useEffect(() => {
    let timeout: any;
    const scheduleNextBlink = () => {
      const delay = 2000 + Math.random() * 3000;
      timeout = setTimeout(() => {
        setBlink(true);
        setTimeout(() => { setBlink(false); scheduleNextBlink(); }, 120);
      }, delay);
    };
    scheduleNextBlink();
    return () => clearTimeout(timeout);
  }, []);

  // Lip sync animation while talking
  useEffect(() => {
    if (!talking) { setMouthFrame(0); return; }
    const id = setInterval(() => {
      setMouthFrame(f => (f + 1) % 4);
    }, 120);
    return () => clearInterval(id);
  }, [talking]);

  // Expression → face features
  const isHappy = expression === 'happy' || expression === 'impressed' || expression === 'encouraging';
  const isSad = expression === 'disappointed';
  const isStern = expression === 'stern';
  const isThinkingExpr = expression === 'thinking' || thinking;
  const isListeningExpr = listening;

  // Ring color — neon themed
  const ringColor = thinking ? WARNING
    : listening ? SUCCESS
      : talking ? NEON
        : isHappy ? '#60A5FA'
          : isSad ? DANGER
            : NEON;

  // Eye Y position (blink = closed)
  const eyeOpenRy = 5.5;
  const eyeRy = blink ? 0.5 : eyeOpenRy;

  // Mouth path based on state + frame
  let mouthPath: string;
  if (talking) {
    const frames = [
      'M 82,122 Q 100,130 118,122',  // open wide
      'M 84,120 Q 100,126 116,120',  // half open
      'M 82,122 Q 100,132 118,122',  // wide again
      'M 86,121 Q 100,124 114,121',  // small open
    ];
    mouthPath = frames[mouthFrame];
  } else if (isHappy) {
    mouthPath = 'M 82,118 Q 100,130 118,118';
  } else if (isSad) {
    mouthPath = 'M 84,126 Q 100,116 116,126';
  } else if (isStern) {
    mouthPath = 'M 84,121 Q 100,121 116,121';
  } else if (isThinkingExpr) {
    mouthPath = 'M 88,120 Q 100,120 112,119';
  } else {
    mouthPath = 'M 84,120 Q 100,124 116,120';
  }

  // Eyebrow Y offset for expressions
  const lBrowY = isSad ? 76 : isStern ? 74 : isThinkingExpr ? 73 : 76;
  const rBrowY = isSad ? 76 : isStern ? 74 : isThinkingExpr ? 73 : 76;
  const lBrowRotate = isThinkingExpr ? 'rotate(-8deg)' : isSad ? 'rotate(6deg)' : isStern ? 'rotate(4deg)' : 'none';
  const rBrowRotate = isThinkingExpr ? 'rotate(8deg)' : isSad ? 'rotate(-6deg)' : isStern ? 'rotate(-4deg)' : 'none';

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* Pulse rings */}
      {(talking || listening || thinking) && [0, 1, 2].map(i => (
        <div key={i} style={{
          position: 'absolute',
          width: `${75 + i * 18}%`,
          height: `${75 + i * 18}%`,
          borderRadius: '50%',
          border: `1.5px solid ${ringColor}`,
          opacity: 0.25 - i * 0.06,
          animationName: 'orbPulse',
          animationDuration: `${1.2 + i * 0.35}s`,
          animationTimingFunction: 'ease-in-out',
          animationDelay: `${i * 0.22}s`,
          animationIterationCount: 'infinite',
          animationDirection: 'alternate',
          animationFillMode: 'none',
        }} />
      ))}

      {/* SVG Face */}
      <svg viewBox="0 0 200 200" width="100%" height="100%" style={{ filter: `drop-shadow(0 6px 20px rgba(0,240,255,0.2))` }}>
        <defs>
          <radialGradient id="faceGrad" cx="45%" cy="38%" r="58%">
            <stop offset="0%" stopColor="#fde8c8" />
            <stop offset="100%" stopColor="#f5c9a0" />
          </radialGradient>
          <radialGradient id="faceGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={ringColor} stopOpacity="0.12" />
            <stop offset="100%" stopColor={ringColor} stopOpacity="0" />
          </radialGradient>
          <linearGradient id="hairGrad" x1="0" y1="0" x2="0.3" y2="1">
            <stop offset="0%" stopColor="#1e1b4b" />
            <stop offset="100%" stopColor="#312e81" />
          </linearGradient>
          <linearGradient id="suitGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1e1b4b" />
            <stop offset="100%" stopColor="#0f0e1e" />
          </linearGradient>
        </defs>

        {/* Background glow circle */}
        <circle cx="100" cy="100" r="92" fill="url(#faceGlow)" />

        {/* Suit / body */}
        <rect x="42" y="152" width="116" height="55" rx="22" fill="url(#suitGrad)" />
        {/* Shirt collar */}
        <path d="M72,152 L100,175 L128,152" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1" />
        {/* Tie */}
        <path d="M95,170 L105,170 L108,196 L100,200 L92,196 Z" fill={ringColor} />

        {/* Neck */}
        <rect x="87" y="126" width="26" height="30" rx="7" fill="url(#faceGrad)" />

        {/* Head */}
        <ellipse cx="100" cy="94" rx="50" ry="52" fill="url(#faceGrad)" stroke="#f0c08a" strokeWidth="0.8" />

        {/* Hair top */}
        <path d="M50,78 Q46,34 80,26 Q100,22 120,26 Q154,34 150,78" fill="url(#hairGrad)" />
        {/* Sideburns */}
        <rect x="49" y="74" width="8" height="22" rx="4" fill="url(#hairGrad)" />
        <rect x="143" y="74" width="8" height="22" rx="4" fill="url(#hairGrad)" />

        {/* Ears */}
        <ellipse cx="50" cy="96" rx="6" ry="9" fill="url(#faceGrad)" stroke="#f0c08a" strokeWidth="0.5" />
        <ellipse cx="150" cy="96" rx="6" ry="9" fill="url(#faceGrad)" stroke="#f0c08a" strokeWidth="0.5" />

        {/* Eyebrows */}
        <rect
          x="70" y={lBrowY} width="20" height="3.5" rx="1.75"
          fill="#1e1b4b"
          style={{ transform: lBrowRotate, transformOrigin: '80px 77px', transition: 'all 0.3s ease' }}
        />
        <rect
          x="110" y={rBrowY} width="20" height="3.5" rx="1.75"
          fill="#1e1b4b"
          style={{ transform: rBrowRotate, transformOrigin: '120px 77px', transition: 'all 0.3s ease' }}
        />

        {/* Eyes — blink via eyeRy */}
        <ellipse cx="80" cy="92" rx="10" ry={blink ? 1 : 8} fill="white" style={{ transition: 'ry 0.06s ease' }} />
        <ellipse cx="80" cy="93" rx={blink ? 0 : 5.5} ry={eyeRy} fill={ringColor} style={{ transition: 'ry 0.06s ease' }} />
        <ellipse cx="80" cy="93" rx={blink ? 0 : 2.5} ry={blink ? 0 : 3} fill="#0f0e1e" style={{ transition: 'ry 0.06s ease' }} />
        {!blink && <circle cx="82" cy="91" r="1.2" fill="white" opacity="0.9" />}
        <ellipse cx="80" cy="92" rx="10" ry={blink ? 7.5 : 0} fill="url(#faceGrad)" style={{ transition: 'ry 0.06s ease' }} />

        <ellipse cx="120" cy="92" rx="10" ry={blink ? 1 : 8} fill="white" style={{ transition: 'ry 0.06s ease' }} />
        <ellipse cx="120" cy="93" rx={blink ? 0 : 5.5} ry={eyeRy} fill={ringColor} style={{ transition: 'ry 0.06s ease' }} />
        <ellipse cx="120" cy="93" rx={blink ? 0 : 2.5} ry={blink ? 0 : 3} fill="#0f0e1e" style={{ transition: 'ry 0.06s ease' }} />
        {!blink && <circle cx="122" cy="91" r="1.2" fill="white" opacity="0.9" />}
        <ellipse cx="120" cy="92" rx="10" ry={blink ? 7.5 : 0} fill="url(#faceGrad)" style={{ transition: 'ry 0.06s ease' }} />

        {/* Glasses frames */}
        <rect x="66" y="83" width="28" height="17" rx="6" stroke={ringColor} fill={`${ringColor}15`} strokeWidth="2" />
        <rect x="106" y="83" width="28" height="17" rx="6" stroke={ringColor} fill={`${ringColor}15`} strokeWidth="2" />
        <line x1="94" y1="91" x2="106" y2="91" stroke={ringColor} strokeWidth="2" />
        <line x1="66" y1="91" x2="56" y2="94" stroke={ringColor} strokeWidth="1.5" strokeLinecap="round" />
        <line x1="134" y1="91" x2="144" y2="94" stroke={ringColor} strokeWidth="1.5" strokeLinecap="round" />

        {/* Nose */}
        <path d="M100,96 Q96,108 92,110 Q100,114 108,110 Q104,108 100,96" fill="#f0c08a" opacity="0.55" />

        {/* Cheek blush when happy */}
        {isHappy && (
          <>
            <ellipse cx="66" cy="108" rx="11" ry="7" fill="#ff8a80" opacity="0.15" />
            <ellipse cx="134" cy="108" rx="11" ry="7" fill="#ff8a80" opacity="0.15" />
          </>
        )}

        {/* Mouth — animated lip sync */}
        <path
          d={mouthPath}
          fill="none"
          stroke="#7c4d30"
          strokeWidth="2.5"
          strokeLinecap="round"
          style={{ transition: talking ? 'none' : 'd 0.25s ease' }}
        />
        {talking && mouthFrame % 2 === 0 && (
          <ellipse cx="100" cy="126" rx="10" ry="4.5" fill="white" opacity="0.92" />
        )}
        {talking && (
          <ellipse cx="100" cy="126" rx="9" ry="3.5" fill="#7c3a3a" opacity="0.5" />
        )}

        {/* Thinking bubble */}
        {thinking && (
          <>
            <circle cx="140" cy="48" r="12" fill={WARNING_DIM} stroke={WARNING} strokeWidth="1.5" />
            <text x="140" y="53" textAnchor="middle" fontSize="13">🧠</text>
            <circle cx="128" cy="62" r="4" fill={WARNING_DIM} stroke={WARNING} strokeWidth="1" />
            <circle cx="133" cy="54" r="2.5" fill={WARNING_DIM} stroke={WARNING} strokeWidth="1" />
          </>
        )}

        {/* Listening indicator */}
        {listening && (
          <>
            <circle cx="140" cy="48" r="12" fill={SUCCESS_DIM} stroke={SUCCESS} strokeWidth="1.5" />
            <text x="140" y="53" textAnchor="middle" fontSize="13">🎧</text>
          </>
        )}
      </svg>

      {/* Talking spinner ring around avatar */}
      {talking && (
        <div style={{
          position: 'absolute', inset: 0,
          borderRadius: '50%',
          border: '2.5px solid transparent',
          borderTopColor: ringColor,
          borderRightColor: `${ringColor}55`,
          animationName: 'spin',
          animationDuration: '1.4s',
          animationTimingFunction: 'linear',
          animationIterationCount: 'infinite',
        }} />
      )}
    </div>
  );
}

// ─── Waveform ─────────────────────────────────────────────────────────────────
function Waveform({ active, color = NEON, bars = 12 }: { active: boolean; color?: string; bars?: number }) {
  const heights = [0.3, 0.5, 0.8, 1, 0.7, 0.9, 0.6, 0.85, 0.5, 0.75, 0.4, 0.65];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2.5, height: 28 }}>
      {Array.from({ length: bars }, (_, i) => (
        <div key={i} style={{
          width: 3, borderRadius: 3, background: color,
          height: active ? `${heights[i % heights.length] * 100}%` : '18%',
          animationName: active ? 'waveBar' : 'none', animationDuration: `${0.5 + (i % 5) * 0.1}s`, animationTimingFunction: 'ease-in-out', animationDelay: `${(i * 0.06).toFixed(2)}s`, animationIterationCount: 'infinite', animationDirection: 'alternate',
          transition: 'height 0.3s',
          opacity: active ? 0.85 : 0.25,
        }} />
      ))}
    </div>
  );
}

// ─── Score Badge ──────────────────────────────────────────────────────────────
function ScoreBadge({ score }: { score: number }) {
  const color = score >= 7 ? SUCCESS : score >= 5 ? WARNING : DANGER;
  const bg = score >= 7 ? SUCCESS_DIM : score >= 5 ? WARNING_DIM : DANGER_DIM;
  const border = score >= 7 ? 'rgba(52,211,153,0.3)' : score >= 5 ? WARNING_BORDER : 'rgba(239,68,68,0.3)';
  return (
    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 800, background: bg, color, border: `1px solid ${border}`, letterSpacing: '0.03em' }}>
      {score}/10
    </span>
  );
}

// ─── Sentiment Chip ───────────────────────────────────────────────────────────
function SentimentChip({ sentiment }: { sentiment: string }) {
  const map: Record<string, { icon: string; color: string }> = {
    confident: { icon: '💪', color: '#60A5FA' },
    hesitant: { icon: '🤔', color: WARNING },
    confused: { icon: '😕', color: DANGER },
    nervous: { icon: '😰', color: '#A78BFA' },
    good: { icon: '😊', color: SUCCESS },
    neutral: { icon: '😐', color: TEXT_SEC },
  };
  const s = map[sentiment?.toLowerCase()] || map.neutral;
  return (
    <span style={{ fontSize: 11, color: s.color, background: `${s.color}14`, padding: '2px 8px', borderRadius: 20, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
      {s.icon} {sentiment || 'Neutral'}
    </span>
  );
}

// ─── Chat Bubble ──────────────────────────────────────────────────────────────
function ChatBubble({ msg, isNew }: { msg: Message; isNew?: boolean }) {
  const isTutor = msg.role === 'tutor';
  const isThinking = msg.isThinking;

  return (
    <div style={{
      display: 'flex', flexDirection: isTutor ? 'row' : 'row-reverse',
      gap: 10, marginBottom: 14, alignItems: 'flex-start',
      animationName: isNew ? 'bubbleIn' : 'none', animationDuration: '0.35s', animationTimingFunction: 'cubic-bezier(0.34,1.56,0.64,1)',
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%', flexShrink: 0, marginTop: 2,
        background: isTutor
          ? `linear-gradient(135deg, ${NEON}, #3B82F6)`
          : `linear-gradient(135deg, ${TEXT_DIM}, #334155)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: isTutor ? `0 0 12px rgba(0,240,255,0.3)` : 'none',
        fontSize: 13,
      }}>
        {isTutor ? '🎓' : '👤'}
      </div>

      <div style={{ maxWidth: '78%' }}>
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
          color: isTutor ? NEON : TEXT_DIM, marginBottom: 4, display: 'block',
        }}>
          {isTutor ? 'Prof. Charles' : 'You'}
          {msg.type === 'followup' && <span style={{ marginLeft: 6, color: WARNING, fontSize: 9 }}>FOLLOW-UP</span>}
          {msg.type === 'feedback' && <span style={{ marginLeft: 6, color: SUCCESS, fontSize: 9 }}>FEEDBACK</span>}
        </span>
        <div style={{
          padding: '10px 14px', borderRadius: isTutor ? '4px 14px 14px 14px' : '14px 4px 14px 14px',
          background: isTutor
            ? isThinking ? WARNING_DIM : CARD_ELEVATED
            : 'rgba(255,255,255,0.04)',
          border: `1px solid ${isTutor
            ? isThinking ? WARNING_BORDER : BORDER
            : BORDER_HOVER}`,
          fontSize: 13.5, color: TEXT, lineHeight: 1.65,
        }}>
          {isThinking ? (
            <span style={{ color: WARNING, fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ animationName: 'spin', animationDuration: '1.5s', animationTimingFunction: 'linear', animationIterationCount: 'infinite', display: 'inline-block' }}>🧠</span>
              Evaluating your response…
            </span>
          ) : (
            msg.text
          )}
        </div>
        {/* Score badges are intentionally never rendered inline during the
            session — all scoring is withheld and only shown in the final
            summary screen at the end of the viva. */}
      </div>
    </div>
  );
}

// ─── Live Transcript Overlay ──────────────────────────────────────────────────
function LiveTranscript({ text, interim }: { text: string; interim: string }) {
  return (
    <div style={{
      background: SUCCESS_DIM, border: `1px solid rgba(52,211,153,0.3)`,
      borderRadius: 12, padding: '10px 14px', marginBottom: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: SUCCESS, animationName: 'breathe', animationDuration: '0.8s', animationTimingFunction: 'ease-in-out', animationIterationCount: 'infinite', animationDirection: 'alternate' }} />
        <span style={{ fontSize: 10, color: SUCCESS, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Live Transcript</span>
      </div>
      <p style={{ fontSize: 13, color: TEXT, margin: 0, lineHeight: 1.6 }}>
        {text && <span>{text} </span>}
        {interim && <span style={{ color: TEXT_SEC, fontStyle: 'italic' }}>{interim}</span>}
        {!text && !interim && <span style={{ color: TEXT_DIM, fontStyle: 'italic' }}>Listening — speak now…</span>}
      </p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function VivaTutor() {
  const [topic, setTopic] = useState('');
  const [customTopic, setCustomTopic] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [level, setLevel] = useState('Undergraduate');
  const [totalQ, setTotalQ] = useState(5);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedContent, setUploadedContent] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [detectedTopic, setDetectedTopic] = useState('');
  const [detectedSubtopics, setDetectedSubtopics] = useState<string[]>([]);
  const [analyzeError, setAnalyzeError] = useState('');

  const [phase, setPhase] = useState<'setup' | 'session' | 'done'>('setup');
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentQ, setCurrentQ] = useState<any>(null);
  const [qNum, setQNum] = useState(1);
  const [history, setHistory] = useState<any[]>([]);
  const [isFollowUp, setIsFollowUp] = useState(false);
  const [followUpCount, setFollowUpCount] = useState(0);

  const [userAnswer, setUserAnswer] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isLoadingNext, setIsLoadingNext] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState('');
  const [awaitingAnswer, setAwaitingAnswer] = useState(false);

  const [isTalking, setIsTalking] = useState(false);
  const [tutorExpression, setTutorExpression] = useState('neutral');
  const [tutorThinking, setTutorThinking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showFinalFeedback, setShowFinalFeedback] = useState(false);

  const [elapsed, setElapsed] = useState(0);
  const [summary, setSummary] = useState('');
  const [avgScore, setAvgScore] = useState('0');

  const recognitionRef = useRef<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const timerRef = useRef<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const silenceTimerRef = useRef<any>(null);
  const isListeningRef = useRef(false);

  const getTopicLabel = () => uploadedFile ? (detectedTopic || 'Uploaded Document') : (isCustom && customTopic.trim() ? customTopic.trim() : topic);
  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (phase === 'session') {
      timerRef.current = setInterval(() => setElapsed(p => p + 1), 1000);
      return () => clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [phase]);

  useEffect(() => {
    if (history.length > 0) {
      setAvgScore((history.reduce((s, q) => s + (q.score || 0), 0) / history.length).toFixed(1));
    }
  }, [history]);

  // Accumulated transcript ref
  const transcriptRef = useRef('');

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';
    rec.maxAlternatives = 1;

    rec.onresult = (e: any) => {
      let finalText = '';
      let interimText = '';
      for (let i = 0; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          finalText += e.results[i][0].transcript + ' ';
        } else {
          interimText += e.results[i][0].transcript;
        }
      }
      if (finalText.trim()) {
        transcriptRef.current = (transcriptRef.current + ' ' + finalText).trim();
        setUserAnswer(transcriptRef.current);
        setInterimTranscript('');
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          if (isListeningRef.current) {
            recognitionRef.current?.stop();
          }
        }, 4000);
      } else {
        setInterimTranscript(interimText);
      }
    };

    rec.onerror = (e: any) => {
      if (e.error === 'no-speech' || e.error === 'aborted') return;
      console.warn('Mic error:', e.error);
      setIsListening(false);
      isListeningRef.current = false;
      setInterimTranscript('');
    };

    rec.onend = () => {
      if (isListeningRef.current) {
        setIsListening(false);
        isListeningRef.current = false;
        setInterimTranscript('');
      }
    };

    recognitionRef.current = rec;
  }, []);


  const speak = useCallback((text: string, onDone?: () => void) => {
    if (!('speechSynthesis' in window)) { onDone?.(); return; }
    window.speechSynthesis.cancel();
    const clean = text.replace(/[*#_`]/g, '').trim().slice(0, 400);
    if (!clean) { onDone?.(); return; }

    const getVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      return voices.find(v =>
        v.name.includes('Google UK English Male') ||
        v.name.includes('Google US English') ||
        v.name.includes('Daniel')
      ) || voices.find(v => v.lang?.startsWith('en'));
    };

    const u = new SpeechSynthesisUtterance(clean);
    const voice = getVoice();
    if (voice) u.voice = voice;
    u.rate = 0.92; u.pitch = 1.0; u.volume = 1;

    u.onstart = () => {
      setIsTalking(true);
      if (isListeningRef.current) {
        try { recognitionRef.current?.stop(); } catch { }
        setIsListening(false);
        isListeningRef.current = false;
        setInterimTranscript('');
      }
    };
    u.onend = () => { setIsTalking(false); onDone?.(); };
    u.onerror = () => { setIsTalking(false); onDone?.(); };

    if (!isMuted) {
      setTimeout(() => window.speechSynthesis.speak(u), 80);
    } else {
      setIsTalking(false);
      onDone?.();
    }
  }, [isMuted]);

  const addMsg = useCallback((msg: Message) => {
    setMessages(prev => [...prev, { ...msg, isNew: true } as any]);
  }, []);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.match(/\.(pdf|txt)$/i)) { alert('Use PDF or TXT'); return; }
    setUploadedFile(file);
    setIsUploading(true);
    setDetectedTopic(''); setDetectedSubtopics([]); setAnalyzeError('');

    let content = '';
    try {
      if (file.name.endsWith('.txt')) {
        content = await file.text();
      } else {
        const fd = new FormData(); fd.append('file', file);
        const r = await fetch('/api/parse-pdf', { method: 'POST', body: fd });
        const d = await r.json();
        if (r.ok && d.text) content = d.text;
        else throw new Error(d.error || 'Parse failed');
      }
      setUploadedContent(content);
    } catch (err: any) {
      alert(err.message);
      setUploadedFile(null); setUploadedContent('');
      setIsUploading(false);
      return;
    }
    setIsUploading(false);

    // Have Gemini read the material and figure out what it's actually about,
    // so the viva is framed around the real subject instead of a generic label.
    setIsAnalyzing(true);
    try {
      const ar = await fetch('/api/viva/analyze-document', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      const ad = await ar.json();
      if (ar.ok && ad.topic) {
        setDetectedTopic(ad.topic);
        setDetectedSubtopics(ad.subtopics || []);
      } else {
        setAnalyzeError('Could not detect a topic — will proceed with a generic label.');
      }
    } catch {
      setAnalyzeError('Could not detect a topic — will proceed with a generic label.');
    }
    setIsAnalyzing(false);
  };

  const startViva = async () => {
    setIsStarting(true); setError('');
    setHistory([]); setElapsed(0); setQNum(1);
    setUserAnswer(''); setMessages([]); setSummary(''); setFollowUpCount(0);
    const topicLabel = getTopicLabel();
    try {
      const r = await fetch('/api/viva/start', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: topicLabel, difficulty: level.toLowerCase(), totalQuestions: totalQ, uploadedContent: uploadedContent || undefined }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed to start');
      setCurrentQ(d.questions[0]);
      setPhase('session');
      setTutorExpression('neutral');

      const intro = d.introMessage || `Let's begin. I'll ask you ${totalQ} questions on ${topicLabel}. Take your time and speak clearly.`;
      const firstQ = d.questions[0]?.question || '';

      addMsg({ role: 'tutor', text: intro, type: 'intro' });
      speak(intro, () => {
        setTimeout(() => {
          addMsg({ role: 'tutor', text: firstQ, type: 'question' });
          speak(firstQ, () => setAwaitingAnswer(true));
        }, 500);
      });
    } catch (err: any) {
      setError(err.message || 'Could not start session.');
    }
    setIsStarting(false);
  };

  // Advances the session: either fetches the next question, or — if the viva
  // is complete — moves to the 'done' phase and generates the final summary.
  const advance = useCallback(async (filledHistory: any[]) => {
    const next = qNum + 1;
    if (next > totalQ) {
      setPhase('done');
      clearInterval(timerRef.current);
      const closingLine = "That completes your viva. Let me compile your full assessment.";
      addMsg({ role: 'tutor', text: closingLine, type: 'intro' });
      speak(closingLine);
      setIsEvaluating(true);
      try {
        const r = await fetch('/api/viva/summarize', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subject: getTopicLabel(), difficulty: level.toLowerCase(), history: filledHistory, totalQuestions: totalQ, elapsed, uploadedContent: uploadedContent || undefined }),
        });
        const d = await r.json();
        setSummary(d.feedback || '');
      } catch { setSummary('Your viva is complete. Well done.'); }
      setIsEvaluating(false);
      return;
    }

    setIsLoadingNext(true);
    setUserAnswer(''); setIsFollowUp(false);
    setTutorExpression('thinking');
    try {
      const r = await fetch('/api/viva/next-question', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: getTopicLabel(), difficulty: level.toLowerCase(),
          uploadedContent: uploadedContent || undefined,
          previousQuestions: filledHistory, questionNumber: next, totalQuestions: totalQ,
          lastAnswer: filledHistory[filledHistory.length - 1]?.userAnswer || '',
          lastScore: filledHistory[filledHistory.length - 1]?.score ?? 5,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed to generate question');
      const newQ = { 
        question: d.question, 
        expectedConcepts: d.expectedConcepts || [], 
        subtopic: d.subtopic || '',
        keyPoints: d.keyPoints || [],
        idealAnswer: d.idealAnswer || '',
        maxMarks: d.maxMarks || 10
      };
      setCurrentQ(newQ);
      setQNum(next);
      setTutorExpression('neutral');
      addMsg({ role: 'tutor', text: d.question, type: 'question' });
      speak(d.question, () => setAwaitingAnswer(true));
    } catch (err: any) {
      setError(err.message || 'Failed to get next question');
    }
    setIsLoadingNext(false);
  }, [qNum, totalQ, elapsed, uploadedContent, level, addMsg, speak]);

  const submitAnswer = useCallback(async (answerOverride?: string) => {
    const ans = (answerOverride || userAnswer).trim();
    if (!ans || isEvaluating || !currentQ) return;
    setAwaitingAnswer(false);
    setIsEvaluating(true); setError('');
    setShowTextInput(false);
    if (isListening && recognitionRef.current) recognitionRef.current.stop();
    setIsListening(false); isListeningRef.current = false;

    addMsg({ role: 'student', text: ans, type: 'answer' });
    addMsg({ role: 'tutor', text: '', type: 'feedback', isThinking: true });
    setTutorThinking(true);
    setTutorExpression('thinking');

    try {
      const r = await fetch('/api/viva/assess', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: currentQ.question,
          expectedConcepts: currentQ.expectedConcepts,
          keyPoints: currentQ.keyPoints,
          idealAnswer: currentQ.idealAnswer,
          maxMarks: currentQ.maxMarks,
          userAnswer: ans,
          subject: getTopicLabel(),
          index: qNum - 1,
          conversationHistory: messages.slice(-8).map(m => ({ role: m.role, text: m.text })),
          isFollowUp,
          followUpCount,
          uploadedContent: uploadedContent || undefined,
        }),
      });
      const d = await r.json();
      const evalData: EvalResult = {
        score: d.score ?? 5, feedback: d.feedback ?? '',
        expression: d.examinerExpression || 'neutral',
        clarity: d.clarity ?? 3, accuracy: d.accuracy ?? 3,
        depth: d.depth ?? 3, communication: d.communication ?? 3,
        sentiment: d.sentiment || 'neutral',
        followupQuestion: d.followupQuestion || '',
        shouldFollowUp: d.shouldFollowUp || false,
      };
      setTutorThinking(false);
      setTutorExpression(evalData.expression);

      // Replace the "Evaluating…" placeholder with just a short, in-character
      // verbal acknowledgment. No score, no metrics, no feedback text shown here —
      // that's all withheld and only surfaced in the final summary screen.
      setMessages(prev => {
        const filtered = prev.filter(m => !m.isThinking);
        const acknowledgment = d.acknowledgment || (d.score >= 7 ? "Mmm, yes." : d.score >= 5 ? "Interesting." : "I see.");
        return [...filtered, { role: 'tutor' as const, text: acknowledgment, type: 'feedback' as const }];
      });

      // Record full scoring data in history — used only for the end-of-viva report.
      const updatedHistory = [...history, {
        ...currentQ, userAnswer: ans, score: evalData.score,
        feedback: evalData.feedback, clarity: evalData.clarity, accuracy: evalData.accuracy,
        depth: evalData.depth, communication: evalData.communication, sentiment: evalData.sentiment,
      }];
      setHistory(updatedHistory);

      const ack = d.acknowledgment || (d.score >= 7 ? "Good." : "Alright.");
      speak(ack, () => {
        if (evalData.shouldFollowUp && evalData.followupQuestion && followUpCount < 1) {
          setFollowUpCount(c => c + 1);
          setIsFollowUp(true);
          setCurrentQ((prev: any) => ({ ...prev, question: evalData.followupQuestion }));
          setUserAnswer('');
          setTimeout(() => {
            addMsg({ role: 'tutor', text: evalData.followupQuestion!, type: 'followup' });
            speak(evalData.followupQuestion!, () => setAwaitingAnswer(true));
          }, 400);
          setIsEvaluating(false);
          return;
        }
        // No more follow-ups for this question — move straight on to the
        // next question (or the final summary) without showing any
        // evaluation UI in between.
        setIsFollowUp(false);
        setFollowUpCount(0);
        setIsEvaluating(false);
        advance(updatedHistory);
      });
    } catch (err: any) {
      setTutorThinking(false);
      setMessages(prev => prev.filter(m => !m.isThinking));
      setError('Evaluation failed. Please try again.');
      setIsEvaluating(false);
    }
  }, [userAnswer, isEvaluating, currentQ, isListening, messages, qNum, isFollowUp, followUpCount, speak, addMsg, history, advance]);

  const toggleMic = () => {
    if (isTalking) return;

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      alert('Voice input requires Chrome or Edge browser. Please type your answer instead.');
      return;
    }

    if (isListening) {
      clearTimeout(silenceTimerRef.current);
      try { recognitionRef.current?.stop(); } catch { }
      setIsListening(false);
      isListeningRef.current = false;
      setInterimTranscript('');
    } else {
      transcriptRef.current = '';
      setUserAnswer('');
      setInterimTranscript('');

      const rec = new SR();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';
      rec.maxAlternatives = 1;

      rec.onresult = (e: any) => {
        let finalText = '';
        let interimText = '';
        for (let i = 0; i < e.results.length; i++) {
          if (e.results[i].isFinal) {
            finalText += e.results[i][0].transcript + ' ';
          } else {
            interimText += e.results[i][0].transcript;
          }
        }
        if (finalText.trim()) {
          transcriptRef.current = (transcriptRef.current + ' ' + finalText).trim();
          setUserAnswer(transcriptRef.current);
          setInterimTranscript('');
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = setTimeout(() => {
            if (isListeningRef.current) rec.stop();
          }, 4000);
        } else {
          setInterimTranscript(interimText);
        }
      };

      rec.onerror = (e: any) => {
        if (e.error === 'no-speech' || e.error === 'aborted') return;
        if (e.error === 'not-allowed') {
          alert('Microphone permission denied. Please allow mic access in your browser settings.');
        }
        console.warn('Mic error:', e.error);
        setIsListening(false);
        isListeningRef.current = false;
        setInterimTranscript('');
      };

      rec.onend = () => {
        if (isListeningRef.current) {
          setIsListening(false);
          isListeningRef.current = false;
          setInterimTranscript('');
        }
      };

      recognitionRef.current = rec;

      try {
        rec.start();
        setIsListening(true);
        isListeningRef.current = true;
      } catch (err) {
        console.warn('Could not start mic:', err);
        setIsListening(false);
        isListeningRef.current = false;
      }
    }
  };

  const reset = () => {
    window.speechSynthesis?.cancel();
    clearTimeout(silenceTimerRef.current);
    setPhase('setup'); setCurrentQ(null); setQNum(1); setHistory([]);
    setUserAnswer(''); setElapsed(0);
    setMessages([]); setSummary(''); setError('');
    setIsListening(false); isListeningRef.current = false;
    setIsTalking(false); setShowTextInput(false); setInterimTranscript('');
    setTutorExpression('neutral'); setTutorThinking(false);
    setIsFollowUp(false); setFollowUpCount(0); setAwaitingAnswer(false);
    setShowFinalFeedback(false);
    clearInterval(timerRef.current);
  };

  const progress = totalQ > 0 ? Math.round((qNum / totalQ) * 100) : 0;

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div style={{
      fontFamily: "'DM Sans', 'Inter', -apple-system, sans-serif",
      background: BG,
      minHeight: '100vh',
      color: TEXT,
      position: 'relative',
      overflowX: 'hidden',
    }}>
      {/* Ambient background */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-20%', left: '-10%', width: '50%', height: '60%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,240,255,0.03) 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', bottom: '-10%', right: '-5%', width: '45%', height: '50%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.02) 0%, transparent 70%)' }} />
        <Particles count={25} />
      </div>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 28px',
        background: 'rgba(9,9,11,0.85)',
        backdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${BORDER}`,
        boxShadow: '0 1px 8px rgba(0,0,0,0.3)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: NEON,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: NEON_GLOW,
          }}>
            <Brain size={18} color={BG} />
          </div>
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, margin: 0, color: TEXT, letterSpacing: '-0.02em' }}>AI Viva Tutor</p>
            <p style={{ fontSize: 10, color: TEXT_DIM, margin: 0, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Prof. Charles · </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {phase === 'session' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 20, background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`, fontSize: 12, color: TEXT_SEC, fontVariantNumeric: 'tabular-nums' }}>
              <Activity size={12} color={SUCCESS} />
              {formatTime(elapsed)}
            </div>
          )}
          {phase === 'session' && (
            <button onClick={() => setIsMuted(m => !m)} style={{
              padding: '6px 12px', borderRadius: 20, cursor: 'pointer', fontSize: 12, fontWeight: 600,
              background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`,
              color: isMuted ? DANGER : TEXT_SEC, display: 'flex', alignItems: 'center', gap: 5,
            }}>
              {isMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
              {isMuted ? 'Unmute' : 'Mute'}
            </button>
          )}
          {phase !== 'setup' && (
            <button onClick={reset} style={{
              padding: '6px 14px', borderRadius: 20, border: `1px solid rgba(239,68,68,0.3)`,
              background: DANGER_DIM, cursor: 'pointer', fontSize: 12, fontWeight: 600,
              color: DANGER, display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <Phone size={12} style={{ transform: 'rotate(135deg)' }} /> End
            </button>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 20px 60px', position: 'relative', zIndex: 1 }}>

        {/* ─── SETUP ────────────────────────────────────────────────────────── */}
        {phase === 'setup' && (
          <div style={{ maxWidth: 580, margin: '0 auto' }}>
            {/* Orb intro */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32, paddingTop: 16 }}>
              <div style={{ width: 120, height: 120, position: 'relative' }}>
                <ProfessorFace talking={false} listening={false} thinking={false} expression="happy" />
              </div>
              <div style={{
                marginTop: 16, padding: '12px 22px', borderRadius: 14, maxWidth: 360, textAlign: 'center',
                background: NEON_BG, border: `1px solid ${NEON_BORDER}`,
              }}>
                <p style={{ fontSize: 14, color: TEXT_SEC, margin: 0, lineHeight: 1.6 }}>
                  Hi, I'm <strong style={{ color: NEON }}>Prof. Charles</strong>. Upload your material or pick a topic — I'll study it and conduct a live viva, just like your real examiner.
                </p>
              </div>
            </div>

            {/* Setup card */}
            <div style={{
              background: CARD, borderRadius: 20,
              border: `1px solid ${BORDER}`, padding: 28,
              boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
            }}>
              {/* Topic */}
              <label style={{ fontSize: 11, fontWeight: 700, color: TEXT_DIM, display: 'block', marginBottom: 8, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Topic</label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                {['Preset', 'Custom'].map((t, i) => (
                  <button key={t} onClick={() => setIsCustom(i === 1)} style={{
                    padding: '8px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    border: (isCustom ? i === 1 : i === 0) ? `1.5px solid ${NEON}` : `1px solid ${BORDER}`,
                    background: (isCustom ? i === 1 : i === 0) ? NEON_BG : 'transparent',
                    color: (isCustom ? i === 1 : i === 0) ? NEON : TEXT_DIM,
                  }}>{t}</button>
                ))}
              </div>
              {!isCustom ? (
                <div style={{ position: 'relative', marginBottom: 20 }}>
                  <select value={topic} onChange={e => setTopic(e.target.value)} style={{
                    width: '100%', padding: '11px 14px', borderRadius: 10, fontSize: 14, cursor: 'pointer',
                    border: `1px solid ${BORDER}`, background: BG_SUBTLE,
                    color: topic ? TEXT : TEXT_DIM, fontFamily: 'inherit', appearance: 'none', outline: 'none',
                  }}>
                    <option value="" disabled>Choose Your Topic</option>
                    {TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <ChevronDown size={14} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: TEXT_DIM, pointerEvents: 'none' }} />
                </div>
              ) : (
                <input value={customTopic} onChange={e => setCustomTopic(e.target.value)}
                  placeholder="e.g. Quantum Computing, Organic Chemistry…"
                  style={{
                    width: '100%', padding: '11px 14px', borderRadius: 10, fontSize: 14,
                    border: `1px solid ${BORDER}`, background: BG_SUBTLE,
                    color: TEXT, fontFamily: 'inherit', outline: 'none', marginBottom: 20, boxSizing: 'border-box',
                  }} />
              )}

              {/* Level */}
              <label style={{ fontSize: 11, fontWeight: 700, color: TEXT_DIM, display: 'block', marginBottom: 8, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Level</label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                {LEVELS.map(l => (
                  <button key={l} onClick={() => setLevel(l)} style={{
                    flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    border: level === l ? `1.5px solid ${NEON}` : `1px solid ${BORDER}`,
                    background: level === l ? NEON_BG : 'transparent',
                    color: level === l ? NEON : TEXT_DIM,
                  }}>{l}</button>
                ))}
              </div>

              {/* Questions */}
              <label style={{ fontSize: 11, fontWeight: 700, color: TEXT_DIM, display: 'block', marginBottom: 8, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Questions</label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 22 }}>
                {[3, 5, 10].map(n => (
                  <button key={n} onClick={() => setTotalQ(n)} style={{
                    flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer',
                    border: totalQ === n ? `1.5px solid ${NEON}` : `1px solid ${BORDER}`,
                    background: totalQ === n ? NEON_BG : 'transparent',
                    color: totalQ === n ? NEON : TEXT_DIM,
                  }}>{n}</button>
                ))}
              </div>

              {/* File upload */}
              <div style={{
                background: 'rgba(255,255,255,0.02)', borderRadius: 12,
                border: `1.5px dashed ${BORDER_HOVER}`, padding: 18, marginBottom: 24, textAlign: 'center',
              }}>
                {!uploadedFile ? (
                  <>
                    <Upload size={20} color={TEXT_DIM} style={{ margin: '0 auto 6px' }} />
                    <p style={{ fontSize: 13, color: TEXT_DIM, margin: '0 0 10px' }}>Upload study material — PDF or TXT (optional)</p>
                    <button onClick={() => fileRef.current?.click()} style={{
                      padding: '7px 18px', borderRadius: 8, cursor: 'pointer',
                      border: `1px solid ${NEON_BORDER}`, background: NEON_BG,
                      color: NEON, fontSize: 13, fontWeight: 600,
                    }}>
                      {isUploading ? 'Processing…' : 'Choose File'}
                    </button>
                    <input ref={fileRef} type="file" accept=".pdf,.txt" style={{ display: 'none' }} onChange={handleFile} />
                  </>
                ) : (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                      <FileText size={16} color={SUCCESS} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: SUCCESS }}>{uploadedFile.name}</span>
                      <button onClick={() => {
                        setUploadedFile(null); setUploadedContent('');
                        setDetectedTopic(''); setDetectedSubtopics([]); setAnalyzeError('');
                      }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: TEXT_DIM, padding: 2 }}>
                        <X size={14} />
                      </button>
                    </div>

                    {isAnalyzing ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10, fontSize: 12, color: TEXT_DIM }}>
                        <Loader2 size={12} style={{ animationName: 'spin', animationDuration: '1s', animationTimingFunction: 'linear', animationIterationCount: 'infinite' }} />
                        Prof. Charles is reading your material…
                      </div>
                    ) : detectedTopic ? (
                      <div style={{ marginTop: 10, padding: '9px 12px', borderRadius: 8, background: NEON_BG, border: `1px solid ${NEON_BORDER}`, textAlign: 'left' }}>
                        <p style={{ fontSize: 12, color: NEON, fontWeight: 700, margin: 0 }}>Detected topic: {detectedTopic}</p>
                        {detectedSubtopics.length > 0 && (
                          <p style={{ fontSize: 11, color: TEXT_DIM, margin: '4px 0 0' }}>{detectedSubtopics.join(' · ')}</p>
                        )}
                      </div>
                    ) : analyzeError ? (
                      <p style={{ fontSize: 11, color: WARNING, margin: '8px 0 0' }}>{analyzeError}</p>
                    ) : null}
                  </div>
                )}
              </div>

              {error && <p style={{ fontSize: 13, color: DANGER, marginBottom: 12, background: DANGER_DIM, padding: '10px 14px', borderRadius: 8, border: `1px solid rgba(239,68,68,0.3)` }}>⚠ {error}</p>}

              <button onClick={startViva} disabled={isStarting || isUploading || isAnalyzing || (!uploadedFile && (isCustom ? !customTopic.trim() : !topic))} style={{
                width: '100%', padding: 15, borderRadius: 12, border: 'none', cursor: 'pointer',
                background: isStarting || isUploading || isAnalyzing || (!uploadedFile && (isCustom ? !customTopic.trim() : !topic))
                  ? NEON_DIM
                  : NEON,
                color: BG, fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: isStarting ? 'none' : NEON_GLOW,
                transition: 'all 0.2s',
              }}>
                {isStarting ? <><Loader2 size={18} style={{ animationName: 'spin', animationDuration: '1s', animationTimingFunction: 'linear', animationIterationCount: 'infinite' }} /> Preparing…</> : <><Zap size={18} /> Begin Viva Session</>}
              </button>
            </div>
          </div>
        )}

        {/* ─── SESSION ──────────────────────────────────────────────────────── */}
        {phase === 'session' && currentQ && (
          <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 20, alignItems: 'start' }}>

            {/* LEFT: Tutor panel */}
            <div style={{ position: 'sticky', top: 80 }}>
              {/* Orb card */}
              <div style={{
                borderRadius: 20, padding: 24, textAlign: 'center', marginBottom: 14,
                background: `linear-gradient(145deg, ${CARD} 0%, ${BG_SUBTLE} 100%)`,
                border: `1px solid ${NEON_BORDER}`,
                boxShadow: `0 2px 12px rgba(0,240,255,0.08)`,
              }}>
                <div style={{ width: 140, height: 140, margin: '0 auto 14px' }}>
                  <ProfessorFace talking={isTalking} listening={isListening} thinking={tutorThinking} expression={tutorExpression} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
                  <Waveform active={isTalking} color={NEON} bars={10} />
                </div>

                {/* Status label */}
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px',
                  borderRadius: 20, fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
                  textTransform: 'uppercase', marginBottom: 14,
                  background: tutorThinking ? WARNING_DIM : isTalking ? NEON_BG : isListening ? SUCCESS_DIM : 'rgba(255,255,255,0.04)',
                  color: tutorThinking ? WARNING : isTalking ? NEON : isListening ? SUCCESS : TEXT_DIM,
                  border: `1px solid ${tutorThinking ? WARNING_BORDER : isTalking ? NEON_BORDER : isListening ? 'rgba(52,211,153,0.3)' : BORDER}`,
                }}>
                  {tutorThinking ? '🧠 Evaluating' : isTalking ? '🔊 Speaking' : isListening ? '🎙 Listening' : awaitingAnswer ? '⏳ Awaiting' : isLoadingNext ? '📝 Preparing' : '😐 Idle'}
                </div>

                {/* Controls */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: 14 }}>
                  <button onClick={() => setIsMuted(m => !m)} style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                    background: 'none', border: 'none', cursor: 'pointer',
                  }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%',
                      background: isMuted ? DANGER_DIM : 'rgba(255,255,255,0.04)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: `1px solid ${isMuted ? 'rgba(239,68,68,0.3)' : BORDER}`,
                    }}>
                      {isMuted ? <VolumeX size={16} color={DANGER} /> : <Volume2 size={16} color={TEXT_DIM} />}
                    </div>
                    <span style={{ fontSize: 9, color: TEXT_DIM, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{isMuted ? 'Unmute' : 'Mute'}</span>
                  </button>
                  <button onClick={reset} style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                    background: 'none', border: 'none', cursor: 'pointer',
                  }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%',
                      background: DANGER_DIM,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: `1px solid rgba(239,68,68,0.3)`,
                    }}>
                      <Phone size={16} color={DANGER} style={{ transform: 'rotate(135deg)' }} />
                    </div>
                    <span style={{ fontSize: 9, color: TEXT_DIM, textTransform: 'uppercase', letterSpacing: '0.06em' }}>End</span>
                  </button>
                </div>
              </div>

              {/* Progress */}
              <div style={{
                background: CARD, borderRadius: 14,
                border: `1px solid ${BORDER}`, padding: 16, marginBottom: 14,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 12 }}>
                  <span style={{ color: TEXT, fontWeight: 600 }}>{getTopicLabel()}</span>
                  <span style={{ color: TEXT_DIM }}>{level}</span>
                </div>
                <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, marginBottom: 8, overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: NEON, borderRadius: 2, width: `${progress}%`, transition: 'width 0.5s', boxShadow: '0 0 8px rgba(0,240,255,0.4)' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: TEXT, fontWeight: 700 }}>Q{qNum} / {totalQ}</span>
                  <span style={{ color: TEXT_DIM }}>Scores revealed at the end</span>
                </div>
              </div>

              {/* Tip box */}
              <div style={{
                background: WARNING_DIM, borderRadius: 12,
                border: `1px solid ${WARNING_BORDER}`, padding: '10px 14px', fontSize: 11, color: WARNING, lineHeight: 1.6,
              }}>
                <span style={{ color: WARNING, fontWeight: 600 }}>⚡ Auto-submit:</span> Mic stops after 4s of silence
              </div>
            </div>

            {/* RIGHT: Conversation */}
            <div>
              {/* Chat log */}
              <div style={{
                background: CARD, borderRadius: 20,
                border: `1px solid ${BORDER}`, padding: '20px 20px 16px',
                marginBottom: 14, minHeight: 380, maxHeight: 520, overflowY: 'auto',
              }}>
                {messages.map((msg, i) => (
                  <ChatBubble key={i} msg={msg} isNew={i === messages.length - 1} />
                ))}
                {isLoadingNext && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0', color: TEXT_DIM, fontSize: 13 }}>
                    <Loader2 size={16} color={NEON} style={{ animationName: 'spin', animationDuration: '1s', animationTimingFunction: 'linear', animationIterationCount: 'infinite' }} />
                    Preparing next question…
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Answer section — shown whenever it's the student's turn to respond.
                  After submitting, the flow goes straight to the next question
                  (or final summary) with no intermediate evaluation card. */}
              {awaitingAnswer && !isLoadingNext && (
                <div style={{
                  background: CARD, borderRadius: 16,
                  border: `1px solid ${BORDER}`, padding: 16, marginBottom: 14,
                }}>
                  {isTalking && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                      background: NEON_BG, borderRadius: 10, marginBottom: 12,
                      border: `1px solid ${NEON_BORDER}`,
                    }}>
                      <Waveform active={true} color={NEON} bars={8} />
                      <p style={{ fontSize: 13, color: NEON, margin: 0, fontWeight: 600 }}>Prof. Charles is speaking — mic is locked</p>
                    </div>
                  )}

                  {isListening && (
                    <LiveTranscript text={userAnswer} interim={interimTranscript} />
                  )}

                  {userAnswer && !isListening && !showTextInput && (
                    <div style={{
                      padding: '10px 14px', background: SUCCESS_DIM, borderRadius: 10,
                      border: `1px solid rgba(52,211,153,0.3)`, marginBottom: 12,
                    }}>
                      <p style={{ fontSize: 10, fontWeight: 700, color: SUCCESS, margin: '0 0 4px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Your Answer</p>
                      <p style={{ fontSize: 13, color: TEXT, margin: 0, lineHeight: 1.5 }}>{userAnswer}</p>
                    </div>
                  )}

                  {showTextInput && (
                    <div style={{ marginBottom: 10 }}>
                      <textarea
                        ref={textareaRef} value={userAnswer}
                        onChange={e => setUserAnswer(e.target.value)}
                        placeholder="Type your answer…" rows={4}
                        style={{
                          width: '100%', padding: '12px 14px', borderRadius: 10, fontSize: 13,
                          border: `1px solid ${BORDER}`, background: BG_SUBTLE,
                          color: TEXT, fontFamily: 'inherit', outline: 'none', resize: 'vertical',
                          lineHeight: 1.6, boxSizing: 'border-box',
                        }} />
                    </div>
                  )}

                  {/* Input controls */}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button onClick={toggleMic} disabled={isTalking} style={{
                      flex: showTextInput ? 'none' : 1, padding: '11px 16px', borderRadius: 12,
                      border: isListening ? `1.5px solid ${DANGER}` : `1px solid ${BORDER}`,
                      background: isTalking ? 'rgba(255,255,255,0.03)' : isListening ? DANGER_DIM : 'rgba(255,255,255,0.03)',
                      fontSize: 13, fontWeight: 600, cursor: isTalking ? 'not-allowed' : 'pointer',
                      color: isTalking ? TEXT_DIM : isListening ? DANGER : TEXT_SEC,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                      opacity: isTalking ? 0.5 : 1,
                    }}>
                      {isListening ? (
                        <><MicOff size={15} /> Stop <Waveform active={true} color={DANGER} bars={6} /></>
                      ) : (
                        <><Mic size={15} /> {isTalking ? 'Wait…' : 'Speak'}</>
                      )}
                    </button>

                    <button onClick={() => { setShowTextInput(t => !t); setTimeout(() => textareaRef.current?.focus(), 80); }}
                      disabled={isTalking} style={{
                        padding: '11px 14px', borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: isTalking ? 'not-allowed' : 'pointer',
                        border: showTextInput ? `1.5px solid ${NEON}` : `1px solid ${BORDER}`,
                        background: showTextInput ? NEON_BG : 'rgba(255,255,255,0.03)',
                        color: showTextInput ? NEON : TEXT_SEC, opacity: isTalking ? 0.5 : 1,
                        display: 'flex', alignItems: 'center', gap: 5,
                      }}>
                      <MessageSquare size={14} />
                    </button>

                    {userAnswer.trim() && !isListening && (
                      <button onClick={() => submitAnswer()} disabled={isEvaluating || isTalking} style={{
                        padding: '11px 22px', borderRadius: 12, border: 'none',
                        background: NEON,
                        fontSize: 13, fontWeight: 700, color: BG, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 6,
                        boxShadow: NEON_GLOW,
                      }}>
                        {isEvaluating ? <Loader2 size={14} style={{ animationName: 'spin', animationDuration: '1s', animationTimingFunction: 'linear', animationIterationCount: 'infinite' }} /> : <Send size={14} />}
                        Submit
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Evaluating / transitioning state — shown right after submit,
                  while we wait for assess + (next-question or summarize) to
                  resolve. No scores or feedback are surfaced here. */}
              {isEvaluating && !awaitingAnswer && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px',
                  background: CARD, borderRadius: 16, border: `1px solid ${BORDER}`,
                  marginBottom: 14, color: TEXT_DIM, fontSize: 13,
                }}>
                  <Loader2 size={16} color={WARNING} style={{ animationName: 'spin', animationDuration: '1s', animationTimingFunction: 'linear', animationIterationCount: 'infinite' }} />
                  Prof. Charles is considering your answer…
                </div>
              )}

              {error && <p style={{ fontSize: 13, color: DANGER, marginTop: 10, background: DANGER_DIM, padding: '10px 14px', borderRadius: 8, border: `1px solid rgba(239,68,68,0.3)` }}>⚠ {error}</p>}
            </div>
          </div>
        )}

        {/* ─── DONE ─────────────────────────────────────────────────────────── */}
        {phase === 'done' && (
          <div style={{ maxWidth: 720, margin: '0 auto' }}>
            {/* Score card */}
            <div style={{
              background: CARD, borderRadius: 20,
              border: `1px solid ${BORDER}`, padding: 32, textAlign: 'center', marginBottom: 18,
              boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
            }}>
              <div style={{ width: 100, height: 100, margin: '0 auto 16px' }}>
                <ProfessorFace talking={false} listening={false} thinking={false}
                  expression={Number(avgScore) >= 7 ? 'happy' : Number(avgScore) >= 5 ? 'neutral' : 'disappointed'} />
              </div>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: TEXT, margin: '0 0 4px', letterSpacing: '-0.02em' }}>Viva Complete</h2>
              <p style={{ fontSize: 13, color: TEXT_DIM, margin: '0 0 28px', letterSpacing: '0.02em' }}>{getTopicLabel()} · {level} · {formatTime(elapsed)}</p>

              <div style={{ display: 'flex', justifyContent: 'center', gap: 40, marginBottom: 28 }}>
                {[
                  { val: avgScore, label: 'Average', color: NEON },
                  { val: String(history.length), label: 'Questions', color: '#60A5FA' },
                  { val: formatTime(elapsed), label: 'Duration', color: SUCCESS },
                ].map(s => (
                  <div key={s.label}>
                    <p style={{ fontSize: 36, fontWeight: 800, color: s.color, margin: '0 0 4px', letterSpacing: '-0.03em', textShadow: `0 0 20px ${s.color}33` }}>{s.val}</p>
                    <p style={{ fontSize: 11, color: TEXT_DIM, margin: 0, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{s.label}</p>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
                {[
                  { label: 'Clarity', key: 'clarity', color: '#60A5FA' },
                  { label: 'Accuracy', key: 'accuracy', color: SUCCESS },
                  { label: 'Depth', key: 'depth', color: '#A78BFA' },
                  { label: 'Communication', key: 'communication', color: WARNING },
                ].map(m => {
                  const av = history.length > 0 ? (history.reduce((s, q) => s + (q[m.key] || 0), 0) / history.length).toFixed(1) : '—';
                  return (
                    <div key={m.key} style={{ padding: '10px 20px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}`, textAlign: 'center', minWidth: 90 }}>
                      <p style={{ fontSize: 22, fontWeight: 800, color: m.color, margin: '0 0 2px' }}>{av}</p>
                      <p style={{ fontSize: 10, color: TEXT_DIM, margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{m.label}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Full feedback reveal */}
            <div style={{ marginBottom: 18 }}>
              <button onClick={() => setShowFinalFeedback(f => !f)} style={{
                width: '100%', padding: '14px 20px', borderRadius: 14, cursor: 'pointer',
                background: NEON_BG, border: `1px solid ${NEON_BORDER}`,
                color: NEON, fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8,
                justifyContent: 'space-between',
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Award size={16} /> Prof. Charles's Full Assessment</span>
                {showFinalFeedback ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>

              {showFinalFeedback && (
                <div style={{
                  marginTop: 8, background: CARD, borderRadius: 14,
                  border: `1px solid ${BORDER}`, padding: 22,
                  animationName: 'bubbleIn', animationDuration: '0.3s', animationTimingFunction: 'cubic-bezier(0.34,1.56,0.64,1)',
                }}>
                  {isEvaluating && !summary ? (
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                      <Loader2 size={22} color={NEON} style={{ animationName: 'spin', animationDuration: '1s', animationTimingFunction: 'linear', animationIterationCount: 'infinite', margin: '0 auto 10px' }} />
                      <p style={{ fontSize: 13, color: TEXT_DIM, margin: 0 }}>Generating assessment…</p>
                    </div>
                  ) : summary ? (
                    <div style={{ fontSize: 14, color: TEXT_SEC, lineHeight: 1.8 }}
                      dangerouslySetInnerHTML={{ __html: summary.replace(/\*\*(.*?)\*\*/g, `<strong style="color:${TEXT}">$1</strong>`).replace(/\n/g, '<br/>') }} />
                  ) : null}
                </div>
              )}
            </div>

            {/* Per-question breakdown */}
            <div style={{
              background: CARD, borderRadius: 16,
              border: `1px solid ${BORDER}`, padding: 22, marginBottom: 18,
            }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: TEXT_DIM, margin: '0 0 16px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Question Breakdown</h3>
              {history.map((q, i) => (
                <div key={i} style={{
                  padding: 14, borderRadius: 12, background: 'rgba(255,255,255,0.03)',
                  border: `1px solid ${BORDER}`, marginBottom: 10,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: TEXT, flex: 1, marginRight: 10 }}>
                      Q{i + 1}: {q.question.length > 80 ? q.question.slice(0, 80) + '…' : q.question}
                    </span>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                      {q.sentiment && <SentimentChip sentiment={q.sentiment} />}
                      <ScoreBadge score={q.score || 0} />
                    </div>
                  </div>
                  {q.userAnswer && <p style={{ fontSize: 12, color: TEXT_DIM, margin: '0 0 5px' }}><span style={{ color: TEXT_SEC, fontWeight: 600 }}>Your answer:</span> {q.userAnswer.slice(0, 120)}{q.userAnswer.length > 120 ? '…' : ''}</p>}
                  {q.feedback && <p style={{ fontSize: 12, color: TEXT_DIM, margin: 0, lineHeight: 1.5 }}>{q.feedback.slice(0, 180)}{q.feedback.length > 180 ? '…' : ''}</p>}
                </div>
              ))}
            </div>

            <button onClick={reset} style={{
              width: '100%', padding: 15, borderRadius: 12, border: 'none',
              background: NEON,
              color: BG, fontSize: 15, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: NEON_GLOW,
            }}>
              <RotateCcw size={16} /> Start New Session
            </button>
          </div>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes waveBar { from { transform: scaleY(0.25); } to { transform: scaleY(1); } }
        @keyframes orbPulse { 0% { transform: scale(1); opacity: 0.4; } 100% { transform: scale(1.08); opacity: 0.1; } }
        @keyframes breathe { from { transform: scale(1); opacity: 0.7; } to { transform: scale(1.15); opacity: 1; } }
        @keyframes float { from { transform: translateY(0px); } to { transform: translateY(-12px); } }
        @keyframes bubbleIn { from { opacity: 0; transform: scale(0.96) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        * { box-sizing: border-box; }
        button, select, textarea, input { font-family: 'DM Sans', inherit; }
        textarea { resize: vertical; }
        select { -webkit-appearance: none; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: ${BG}; }
        ::-webkit-scrollbar-thumb { background: #2A2A35; border-radius: 2px; }
        textarea:focus, input:focus { border-color: ${NEON} !important; }
      `}</style>
    </div>
  );
}