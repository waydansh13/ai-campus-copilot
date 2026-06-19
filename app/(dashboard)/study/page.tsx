'use client';

import { useState, useRef, useEffect, CSSProperties } from 'react';
import { createClient } from '@/lib/supabase-client';
import {
  Send, Search, Edit3, BookOpen, Calculator,
  PenTool, Lightbulb, Mic, Paperclip,
  Plus, X, Copy, Check, Volume2, Trash2, MicOff,
  FileText, History,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Message {
  role: string;
  content: string;
  attachment?: string;
}

interface ChatSession {
  id: string;
  title: string;
  preview: string;
  messages: Message[];
  subject: string;
  timestamp: number;
}

interface SessionGroup {
  section: string;
  items: ChatSession[];
}

interface QuickAction {
  icon: React.ElementType;
  label: string;
  desc: string;
  color: string;
  bg: string;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

// ─── Neon Dark Theme Constants ───────────────────────────────────────────────

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

// ─── Constants ───────────────────────────────────────────────────────────────

const QUICK_ACTIONS: QuickAction[] = [
  {
    icon: BookOpen,
    label: 'Explain a concept',
    desc: 'Get simple explanations for any topic',
    color: '#A78BFA',
    bg: 'rgba(167,139,250,0.1)',
  },
  {
    icon: Calculator,
    label: 'Solve a problem',
    desc: 'Get step-by-step solutions for math & science',
    color: '#34D399',
    bg: 'rgba(52,211,153,0.1)',
  },
  {
    icon: PenTool,
    label: 'Write or improve',
    desc: 'Improve essays, answers and written content',
    color: '#60A5FA',
    bg: 'rgba(96,165,250,0.1)',
  },
  {
    icon: Lightbulb,
    label: 'Study smarter',
    desc: 'Tips, strategies and study guides tailored for you',
    color: '#FBBF24',
    bg: 'rgba(251,191,36,0.1)',
  },
];

// ─── localStorage helpers ────────────────────────────────────────────────────

const STORAGE_KEY = 'studyai_sessions';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function loadSessions(): ChatSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveSessions(sessions: ChatSession[]): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions)); } catch { }
}

function getSessionTitle(messages: Message[]): string {
  const first = messages.find((m) => m.role === 'user');
  if (!first) return 'New chat';
  const text = first.content.replace(/^Help me with: /, '');
  return text.length > 50 ? text.slice(0, 50) + '…' : text;
}

function getSessionPreview(messages: Message[]): string {
  const last = [...messages].reverse().find((m) => m.role === 'assistant');
  if (!last) return '';
  const text = last.content.replace(/\*\*/g, '').replace(/\n/g, ' ');
  return text.length > 60 ? text.slice(0, 60) + '…' : text;
}

function formatSessionTime(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d >= today) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (d >= yesterday) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function groupSessionsByDate(sessions: ChatSession[]): SessionGroup[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const groups: SessionGroup[] = [];
  const todayItems = sessions.filter((s) => new Date(s.timestamp) >= today);
  const yesterdayItems = sessions.filter((s) => {
    const d = new Date(s.timestamp);
    return d >= yesterday && d < today;
  });
  const weekItems = sessions.filter((s) => {
    const d = new Date(s.timestamp);
    return d >= weekAgo && d < yesterday;
  });
  const olderItems = sessions.filter((s) => new Date(s.timestamp) < weekAgo);

  if (todayItems.length) groups.push({ section: 'Today', items: todayItems });
  if (yesterdayItems.length) groups.push({ section: 'Yesterday', items: yesterdayItems });
  if (weekItems.length) groups.push({ section: 'Previous 7 Days', items: weekItems });
  if (olderItems.length) groups.push({ section: 'Older', items: olderItems });
  return groups;
}

// ─── Robot Avatar ─────────────────────────────────────────────────────────────

function RobotAvatar() {
  return (
    <div style={{
      width: 80, height: 80,
      borderRadius: '50%',
      background: `linear-gradient(135deg, ${CARD} 0%, ${BG_SUBTLE} 100%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      marginBottom: 20, position: 'relative',
      border: `2px solid ${NEON_BORDER}`,
      boxShadow: NEON_GLOW,
    }}>
      <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
        <rect x="8" y="14" width="28" height="20" rx="6" fill={NEON} />
        <rect x="12" y="18" width="8" height="6" rx="2" fill={BG} opacity="0.9" />
        <rect x="24" y="18" width="8" height="6" rx="2" fill={BG} opacity="0.9" />
        <rect x="18" y="26" width="8" height="3" rx="1.5" fill={BG} opacity="0.6" />
        <rect x="16" y="10" width="12" height="5" rx="2.5" fill={NEON_DIM} />
        <circle cx="22" cy="8" r="2" fill={NEON} />
        <rect x="6" y="18" width="3" height="8" rx="1.5" fill={NEON_DIM} />
        <rect x="35" y="18" width="3" height="8" rx="1.5" fill={NEON_DIM} />
        <rect x="14" y="34" width="6" height="4" rx="2" fill={NEON_DIM} />
        <rect x="24" y="34" width="6" height="4" rx="2" fill={NEON_DIM} />
      </svg>
      <div style={{
        position: 'absolute', top: 4, right: 4,
        width: 10, height: 10, borderRadius: '50%',
        background: NEON,
        boxShadow: '0 0 8px rgba(0,240,255,0.5)',
      }} />
      <div style={{
        position: 'absolute', top: 0, right: 10,
        width: 6, height: 6, borderRadius: '50%',
        background: NEON_DIM,
      }} />
    </div>
  );
}

// ─── Message formatter ────────────────────────────────────────────────────────

function formatMessage(content: string): string {
  let f = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  f = f.replace(/\*(.*?)\*/g, '<em>$1</em>');
  f = f.replace(/^### (.+)$/gm, `<h3 style="font-size:15px;font-weight:600;color:${TEXT};margin:12px 0 4px">$1</h3>`);
  f = f.replace(/^## (.+)$/gm, `<h2 style="font-size:17px;font-weight:600;color:${TEXT};margin:14px 0 6px">$1</h2>`);
  f = f.replace(/^\* (.+)$/gm, `<li style="margin-left:16px;list-style:disc;color:${TEXT_SEC}">$1</li>`);
  f = f.replace(/^- (.+)$/gm, `<li style="margin-left:16px;list-style:disc;color:${TEXT_SEC}">$1</li>`);
  f = f.replace(/^\d+\. (.+)$/gm, `<li style="margin-left:16px;list-style:decimal;color:${TEXT_SEC}">$1</li>`);
  f = f.replace(/(<li[\s\S]*?<\/li>)/g, '<ul style="margin:8px 0">$1</ul>');
  f = f.replace(
    /```(\w+)?\n([\s\S]*?)```/g,
    `<pre style="background:${BG};border:1px solid ${BORDER};border-radius:8px;padding:12px;margin:10px 0;overflow-x:auto;font-size:12px;font-family:monospace;color:${NEON};white-space:pre">$2</pre>`
  );
  f = f.replace(/`([^`]+)`/g, `<code style="background:rgba(0,240,255,0.08);color:${NEON};padding:2px 6px;border-radius:4px;font-size:12px;font-family:monospace">$1</code>`);
  f = f.replace(/\n\n/g, '<br/><br/>');
  f = f.replace(/\n/g, '<br/>');
  return f;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function StudyAssistant() {
  const [userName, setUserName] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Hi! I'm your AI Study Assistant. Choose a topic below or ask me anything to get started!" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [subject, setSubject] = useState('General');
  const [isListening, setIsListening] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [fileContent, setFileContent] = useState('');
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>(generateId);
  const [historySearch, setHistorySearch] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isLoading]);

  useEffect(() => {
    async function fetchUser() {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (data?.user?.user_metadata?.full_name) {
        setUserName(data.user.user_metadata.full_name);
      }
    }
    fetchUser();
  }, []);

  // Load sessions from localStorage on mount
  useEffect(() => {
    setChatSessions(loadSessions());
  }, []);

  // Auto-save current session whenever messages change (if there's user content)
  useEffect(() => {
    const hasUserMsg = messages.some((m) => m.role === 'user');
    if (!hasUserMsg || !showChat) return;
    const session: ChatSession = {
      id: currentSessionId,
      title: getSessionTitle(messages),
      preview: getSessionPreview(messages),
      messages,
      subject,
      timestamp: Date.now(),
    };
    setChatSessions((prev) => {
      const filtered = prev.filter((s) => s.id !== currentSessionId);
      const updated = [session, ...filtered];
      saveSessions(updated);
      return updated;
    });
  }, [messages]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['.pdf', '.ppt', '.pptx', '.doc', '.docx', '.txt'];
    if (!allowed.some((ext) => file.name.toLowerCase().endsWith(ext))) {
      alert('Supported formats: PDF, PPT/PPTX, DOC/DOCX, TXT');
      return;
    }
    setUploadedFile(file);
    setFileName(file.name);
    setIsProcessingFile(true);
    setShowChat(true);

    let extractedText = '';

    try {
      if (file.name.toLowerCase().endsWith('.txt')) {
        extractedText = await file.text();
      } else if (file.name.toLowerCase().endsWith('.pdf')) {
        const formData = new FormData();
        formData.append('file', file);
        const parseRes = await fetch('/api/parse-pdf', {
          method: 'POST',
          body: formData,
        });
        const parseData = await parseRes.json();
        if (parseRes.ok && parseData.text) {
          extractedText = parseData.text;
        } else {
          throw new Error(parseData.error || 'Failed to parse PDF');
        }
      }
    } catch (err) {
      console.error('File parsing error:', err);
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: `⚠️ **Could not extract text from ${file.name}.** The file may be scanned or image-based. Please try a different file or paste the content manually.`
      }]);
      setIsProcessingFile(false);
      return;
    }

    setFileContent(extractedText);

    try {
      const preview = extractedText.length > 15000
        ? extractedText.slice(0, 15000) + '\n\n[...content truncated for preview...]'
        : extractedText;

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `I've uploaded a document: "${file.name}". Here is the extracted content:\n\n---\n${preview}\n---\n\nPlease provide a brief summary of this document and let me know you're ready to answer questions about it.`,
          history: [],
          systemPrompt: `You are an expert AI Study Assistant. The user has uploaded a document. Read the extracted content carefully, provide a concise summary of what the document contains (key topics, structure, important points), and let the user know you're ready to help with questions about it.`,
        }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: `📎 **Document uploaded:** ${file.name} (${extractedText.length.toLocaleString()} characters extracted)\n\n${data.reply || "I've read your document. Ask me anything about it!"}`
      }]);
    } catch {
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: `📎 **Document uploaded:** ${file.name} (${extractedText.length.toLocaleString()} characters extracted)\n\nI've read the document. Ask me anything about it!`
      }]);
    } finally {
      setIsProcessingFile(false);
    }
  };

  const removeFile = () => {
    setUploadedFile(null);
    setFileName('');
    setFileContent('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // `text` is optional — when called from the send button/Enter key, it reads `input` state
  const sendMessage = async (text?: string) => {
    const messageText = text ?? input;
    if (!messageText.trim() || isLoading) return;

    setShowChat(true);
    const userMessage: Message = {
      role: 'user',
      content: messageText,
      attachment: uploadedFile ? fileName : undefined,
    };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    try {
      let context = '';
      const messageToSend = messageText;
      if (uploadedFile && fileContent) {
        const docText = fileContent.length > 30000
          ? fileContent.slice(0, 30000) + '\n\n[...content truncated...]'
          : fileContent;
        context = `The user has uploaded a document: "${fileName}". Here is the full extracted text of the document:\n\n---DOCUMENT START---\n${docText}\n---DOCUMENT END---\n\nUse this document content to answer the user's questions accurately. Always reference specific parts of the document when relevant.`;
      } else if (uploadedFile) {
        context = `The user has uploaded "${fileName}" but no text could be extracted.`;
      }
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageToSend,
          history: messages,
          systemPrompt: `You are a friendly, expert AI Study Assistant specializing in making complex topics easy to understand.
${context}
Current subject: ${subject}.
Always structure responses clearly with examples and practice questions when helpful. Use markdown formatting.`,
        }),
      });
      const data = await response.json();
      setMessages([...updatedMessages, { role: 'assistant', content: data.reply }]);
    } catch {
      setMessages([...updatedMessages, {
        role: 'assistant',
        content: "Sorry, I'm having trouble connecting right now. Please try again.",
      }]);
    }
    setIsLoading(false);
  };

  const handleQuickAction = (action: QuickAction) => {
    sendMessage(`Help me with: ${action.label}`);
  };

  const startNewChat = () => {
    window.speechSynthesis?.cancel();
    const newId = generateId();
    setCurrentSessionId(newId);
    setMessages([{ role: 'assistant', content: "Hi! I'm your AI Study Assistant. Ask me anything or upload a document to get started!" }]);
    removeFile();
    setShowChat(false);
  };

  const deleteSession = (sessionId: string) => {
    setChatSessions((prev) => {
      const updated = prev.filter((s) => s.id !== sessionId);
      saveSessions(updated);
      return updated;
    });
    if (sessionId === currentSessionId) {
      startNewChat();
    }
  };

  const copyMessage = (content: string, index: number) => {
    navigator.clipboard.writeText(content.replace(/<[^>]*>/g, ''));
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1800);
  };

  const speakMessage = (content: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const plain = content.replace(/<[^>]*>/g, '').replace(/\n/g, ' ');
    const utterance = new SpeechSynthesisUtterance(plain);
    utterance.rate = 0.92;
    window.speechSynthesis.speak(utterance);
  };

  const toggleVoice = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Voice input is not supported in your browser.');
      return;
    }
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    // Use a typed constructor via bracket access to avoid TS property errors
    const SpeechRecognitionCtor = (
      window as Window & { SpeechRecognition?: new () => SpeechRecognitionInstance; webkitSpeechRecognition?: new () => SpeechRecognitionInstance }
    ).SpeechRecognition ?? (
      window as Window & { webkitSpeechRecognition?: new () => SpeechRecognitionInstance }
    ).webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) return;
    const recognition = new SpeechRecognitionCtor();
    recognition.lang = 'en-US';
    recognition.onresult = (e: SpeechRecognitionEvent) => {
      const transcript = e.results[0][0].transcript;
      setInput((prev) => prev + transcript);
    };
    recognition.onend = () => setIsListening(false);
    recognition.start();
    recognitionRef.current = recognition;
    setIsListening(true);
  };

  const handleHistoryClick = (session: ChatSession) => {
    if (session.id === currentSessionId) return;
    setCurrentSessionId(session.id);
    setMessages(session.messages || []);
    setSubject(session.subject || 'General');
    removeFile();
    setShowChat(true);
  };

  // Filter sessions for search
  const filteredSessions = historySearch.trim()
    ? chatSessions.filter((s) =>
      s.title.toLowerCase().includes(historySearch.toLowerCase()) ||
      (s.preview || '').toLowerCase().includes(historySearch.toLowerCase())
    )
    : chatSessions;
  const groupedHistory = groupSessionsByDate(filteredSessions);

  // ─── Styles ──────────────────────────────────────────────────────────────────

  const styles = {
    container: {
      display: 'flex',
      height: '100%',
      background: BG,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      overflow: 'hidden',
    } as CSSProperties,
    mainPanel: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column' as const,
      overflow: 'hidden',
      background: BG_SUBTLE,
    } as CSSProperties,
    historyPanel: {
      width: 300,
      borderLeft: `1px solid ${BORDER}`,
      background: CARD,
      display: 'flex',
      flexDirection: 'column' as const,
      overflow: 'hidden',
    } as CSSProperties,
    historyHeader: {
      padding: '20px 20px 16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottom: `1px solid ${BORDER}`,
    } as CSSProperties,
    historyTitle: {
      fontSize: 17,
      fontWeight: 600,
      color: TEXT,
      margin: 0,
    } as CSSProperties,
    historyIcons: {
      display: 'flex',
      gap: 8,
    } as CSSProperties,
    historyIconBtn: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      color: TEXT_DIM,
      padding: 4,
      borderRadius: 6,
      display: 'flex',
      alignItems: 'center',
    } as CSSProperties,
    historyList: {
      flex: 1,
      overflowY: 'auto' as const,
      padding: '0 0 16px',
    } as CSSProperties,
    historySection: {
      padding: '16px 20px 6px',
    } as CSSProperties,
    historySectionTitle: {
      fontSize: 12,
      fontWeight: 600,
      color: TEXT_DIM,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.05em',
      marginBottom: 8,
    } as CSSProperties,
    historyItem: {
      padding: '10px 20px',
      cursor: 'pointer',
      borderRadius: 0,
      transition: 'background 0.15s',
      display: 'flex',
      alignItems: 'flex-start',
      gap: 10,
    } as CSSProperties,
    historyItemIcon: {
      marginTop: 2,
      color: TEXT_DIM,
      flexShrink: 0,
    } as CSSProperties,
    historyItemContent: {
      flex: 1,
      minWidth: 0,
    } as CSSProperties,
    historyItemTitle: {
      fontSize: 13.5,
      fontWeight: 500,
      color: TEXT,
      marginBottom: 2,
      whiteSpace: 'nowrap' as const,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    } as CSSProperties,
    historyItemPreview: {
      fontSize: 12,
      color: TEXT_DIM,
      whiteSpace: 'nowrap' as const,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    } as CSSProperties,
    historyItemTime: {
      fontSize: 11,
      color: TEXT_DIM,
      flexShrink: 0,
    } as CSSProperties,
    viewAllBtn: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: '10px 20px',
      color: TEXT_SEC,
      fontSize: 13,
      cursor: 'pointer',
      background: 'none',
      border: 'none',
      width: '100%',
      borderTop: `1px solid ${BORDER}`,
      marginTop: 8,
    } as CSSProperties,
    chatArea: {
      flex: 1,
      overflowY: 'auto' as const,
      display: 'flex',
      flexDirection: 'column' as const,
    } as CSSProperties,
    welcomeArea: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 24px',
    } as CSSProperties,
    greeting: {
      fontSize: 32,
      fontWeight: 700,
      color: TEXT,
      marginBottom: 8,
      textAlign: 'center' as const,
    } as CSSProperties,
    subGreeting: {
      fontSize: 16,
      color: TEXT_SEC,
      marginBottom: 40,
      textAlign: 'center' as const,
    } as CSSProperties,
    actionGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: 12,
      width: '100%',
      maxWidth: 560,
    } as CSSProperties,
    actionCard: {
      padding: '18px 20px',
      borderRadius: 14,
      border: `1px solid ${BORDER}`,
      cursor: 'pointer',
      background: CARD,
      textAlign: 'left' as const,
      transition: 'all 0.2s',
      boxShadow: 'none',
    } as CSSProperties,
    actionIcon: {
      width: 40,
      height: 40,
      borderRadius: 10,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 10,
    } as CSSProperties,
    actionLabel: {
      fontSize: 14,
      fontWeight: 600,
      color: TEXT,
      marginBottom: 4,
    } as CSSProperties,
    actionDesc: {
      fontSize: 12,
      color: TEXT_DIM,
      lineHeight: 1.4,
    } as CSSProperties,
    messagesArea: {
      padding: '24px 32px',
      display: 'flex',
      flexDirection: 'column' as const,
      gap: 20,
    } as CSSProperties,
    messageBubble: (role: string): CSSProperties => ({
      display: 'flex',
      justifyContent: role === 'user' ? 'flex-end' : 'flex-start',
      alignItems: 'flex-start',
      gap: 10,
    }),
    aiAvatar: {
      width: 34,
      height: 34,
      borderRadius: '50%',
      background: `linear-gradient(135deg, ${CARD}, ${CARD_ELEVATED})`,
      border: `1.5px solid ${NEON_BORDER}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    } as CSSProperties,
    bubble: (role: string): CSSProperties => ({
      maxWidth: '72%',
      padding: '12px 16px',
      borderRadius: role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
      fontSize: 14.5,
      lineHeight: 1.65,
      background: role === 'user' ? NEON : CARD_ELEVATED,
      color: role === 'user' ? BG : TEXT,
      border: role === 'user' ? 'none' : `1px solid ${BORDER}`,
      boxShadow: role === 'user' ? '0 0 15px rgba(0,240,255,0.2)' : 'none',
    }),
    msgActions: {
      display: 'flex',
      gap: 12,
      marginTop: 6,
      paddingLeft: 4,
    } as CSSProperties,
    msgActionBtn: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      color: TEXT_DIM,
      padding: 2,
      display: 'flex',
      alignItems: 'center',
      transition: 'color 0.15s',
    } as CSSProperties,
    inputSection: {
      padding: '0 24px 24px',
      borderTop: `1px solid ${BORDER}`,
      background: BG_SUBTLE,
    } as CSSProperties,
    inputWrapper: {
      border: `1.5px solid ${BORDER_HOVER}`,
      borderRadius: 16,
      background: CARD,
      transition: 'border-color 0.2s',
      overflow: 'hidden',
    } as CSSProperties,
    inputRow: {
      display: 'flex',
      alignItems: 'center',
      padding: '4px 8px 4px 16px',
      gap: 8,
    } as CSSProperties,
    textInput: {
      flex: 1,
      background: 'none',
      border: 'none',
      outline: 'none',
      fontSize: 15,
      color: TEXT,
      padding: '12px 0',
      fontFamily: 'inherit',
    } as CSSProperties,
    inputActions: {
      display: 'flex',
      alignItems: 'center',
      gap: 4,
    } as CSSProperties,
    inputActionBtn: (active: boolean): CSSProperties => ({
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: '7px 12px',
      borderRadius: 10,
      border: `1px solid ${active ? 'rgba(239,68,68,0.3)' : BORDER_HOVER}`,
      background: active ? 'rgba(239,68,68,0.1)' : 'transparent',
      color: active ? '#EF4444' : TEXT_SEC,
      fontSize: 13,
      fontWeight: 500,
      cursor: 'pointer',
      transition: 'all 0.15s',
    }),
    sendBtn: (enabled: boolean): CSSProperties => ({
      width: 38,
      height: 38,
      borderRadius: '50%',
      background: enabled ? NEON : 'rgba(255,255,255,0.06)',
      border: 'none',
      cursor: enabled ? 'pointer' : 'default',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: enabled ? BG : TEXT_DIM,
      flexShrink: 0,
      transition: 'all 0.15s',
      boxShadow: enabled ? '0 0 12px rgba(0,240,255,0.3)' : 'none',
    }),
    disclaimer: {
      textAlign: 'center' as const,
      fontSize: 12,
      color: TEXT_DIM,
      marginTop: 8,
    } as CSSProperties,
    fileBar: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '8px 16px',
      background: 'rgba(0,240,255,0.06)',
      borderBottom: `1px solid ${NEON_BORDER}`,
    } as CSSProperties,
    loadingDot: {
      width: 8,
      height: 8,
      borderRadius: '50%',
      background: NEON,
    } as CSSProperties,
    subjectBadge: {
      padding: '4px 12px',
      borderRadius: 20,
      background: NEON_BG,
      color: NEON,
      fontSize: 12,
      fontWeight: 600,
      border: 'none',
      cursor: 'pointer',
    } as CSSProperties,
  };

  return (
    <div style={styles.container}>
      {/* Main Chat Panel */}
      <div style={styles.mainPanel}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px 24px',
            borderBottom: `1px solid ${BORDER}`,
          }}
        >
          <button
            onClick={startNewChat}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 12px',
              borderRadius: 20,
              background: 'none',
              border: `1px solid ${NEON_BORDER}`,
              color: NEON,
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <Plus size={13} />
            New Chat
          </button>
          <button
            onClick={() => setShowHistory((prev) => !prev)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 12px',
              borderRadius: 20,
              background: showHistory ? NEON_BG : 'none',
              border: `1px solid ${NEON_BORDER}`,
              color: NEON,
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
            }}
            title={showHistory ? 'Hide chat history' : 'Show chat history'}
          >
            <History size={13} />
            History
          </button>
        </div>
        {/* Chat / Welcome area */}
        <div style={styles.chatArea}>
          {!showChat ? (
            <div style={styles.welcomeArea}>
              <RobotAvatar />
              <h1 style={styles.greeting}>Hello{userName ? `, ${userName}` : ''} 👋</h1>
              <p style={styles.subGreeting}>How can I help you with your studies today?</p>
              <div style={styles.actionGrid}>
                {QUICK_ACTIONS.map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.label}
                      onClick={() => handleQuickAction(action)}
                      style={styles.actionCard}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = NEON_BORDER;
                        e.currentTarget.style.boxShadow = '0 0 20px rgba(0,240,255,0.06)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = BORDER;
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.transform = 'none';
                      }}
                    >
                      <div style={{ ...styles.actionIcon, background: action.bg }}>
                        <Icon size={20} color={action.color} />
                      </div>
                      <div style={styles.actionLabel}>{action.label}</div>
                      <div style={styles.actionDesc}>{action.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div style={styles.messagesArea}>
              {messages.map((msg, i) => (
                <div key={i} style={styles.messageBubble(msg.role)}>
                  {msg.role === 'assistant' && (
                    <div style={styles.aiAvatar}>
                      <svg width="18" height="18" viewBox="0 0 44 44" fill="none">
                        <rect x="8" y="14" width="28" height="20" rx="6" fill={NEON} />
                        <rect x="12" y="18" width="8" height="6" rx="2" fill={BG} opacity="0.9" />
                        <rect x="24" y="18" width="8" height="6" rx="2" fill={BG} opacity="0.9" />
                        <rect x="18" y="26" width="8" height="3" rx="1.5" fill={BG} opacity="0.6" />
                        <rect x="16" y="10" width="12" height="5" rx="2.5" fill={NEON_DIM} />
                        <circle cx="22" cy="8" r="2" fill={NEON} />
                      </svg>
                    </div>
                  )}
                  <div>
                    <div style={styles.bubble(msg.role)}>
                      {msg.role === 'assistant' ? (
                        <div dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }} />
                      ) : (
                        <p style={{ margin: 0 }}>{msg.content}</p>
                      )}
                      {msg.attachment && (
                        <p style={{ fontSize: 11, marginTop: 6, opacity: 0.7 }}>📎 {msg.attachment}</p>
                      )}
                    </div>
                    {msg.role === 'assistant' && (
                      <div style={styles.msgActions}>
                        <button
                          onClick={() => copyMessage(msg.content, i)}
                          style={styles.msgActionBtn}
                          title="Copy"
                          onMouseEnter={(e) => (e.currentTarget.style.color = NEON)}
                          onMouseLeave={(e) => (e.currentTarget.style.color = TEXT_DIM)}
                        >
                          {copiedIndex === i
                            ? <Check size={14} style={{ color: '#34D399' }} />
                            : <Copy size={14} />}
                        </button>
                        <button
                          onClick={() => speakMessage(msg.content)}
                          style={styles.msgActionBtn}
                          title="Speak"
                          onMouseEnter={(e) => (e.currentTarget.style.color = NEON)}
                          onMouseLeave={(e) => (e.currentTarget.style.color = TEXT_DIM)}
                        >
                          <Volume2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div style={styles.messageBubble('assistant')}>
                  <div style={styles.aiAvatar}>
                    <svg width="18" height="18" viewBox="0 0 44 44" fill="none">
                      <rect x="8" y="14" width="28" height="20" rx="6" fill={NEON} />
                      <rect x="12" y="18" width="8" height="6" rx="2" fill={BG} opacity="0.9" />
                      <rect x="24" y="18" width="8" height="6" rx="2" fill={BG} opacity="0.9" />
                    </svg>
                  </div>
                  <div style={{ ...styles.bubble('assistant'), padding: '14px 18px' }}>
                    <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                      {[0, 150, 300].map((delay) => (
                        <div
                          key={delay}
                          style={{
                            ...styles.loadingDot,
                            animation: `bounce 1s ${delay}ms infinite`,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* File bar */}
        {uploadedFile && (
          <div style={styles.fileBar}>
            <FileText size={14} color={NEON} />
            <span style={{ fontSize: 13, color: NEON, fontWeight: 500 }}>{fileName}</span>
            <span style={{ fontSize: 11, color: NEON_DIM }}>• Attached</span>
            <button onClick={removeFile} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: TEXT_DIM }}>
              <X size={15} />
            </button>
          </div>
        )}

        {/* Input section */}
        <div style={styles.inputSection}>
          <div style={{ paddingTop: 16, marginBottom: 4 }} />
          <div style={styles.inputWrapper}>
            <div style={styles.inputRow}>
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                placeholder={uploadedFile ? `Ask about ${fileName}...` : 'Message StudyAI...'}
                style={styles.textInput}
              />
            </div>
            <div style={{
              display: 'flex', alignItems: 'center',
              padding: '6px 10px', borderTop: `1px solid ${BORDER}`,
              gap: 6,
            }}>
              <button
                onClick={() => fileInputRef.current?.click()}
                style={styles.inputActionBtn(false)}
                disabled={isProcessingFile}
              >
                <Paperclip size={14} />
                {isProcessingFile ? 'Processing...' : 'Upload'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                style={{ display: 'none' }}
                accept=".pdf,.ppt,.pptx,.doc,.docx,.txt"
                onChange={handleFileUpload}
              />
              <button
                onClick={toggleVoice}
                style={styles.inputActionBtn(isListening)}
              >
                {isListening ? <MicOff size={14} /> : <Mic size={14} />}
                {isListening ? 'Stop' : 'Speak'}
              </button>
              <div style={{ flex: 1 }} />
              <button
                onClick={() => sendMessage()}
                disabled={isLoading || !input.trim()}
                style={styles.sendBtn(!!input.trim() && !isLoading)}
              >
                <Send size={16} />
              </button>
            </div>
          </div>
          <p style={styles.disclaimer}>StudyAI can make mistakes. Please double-check important information.</p>
        </div>
      </div>

      {/* History Panel */}
      {showHistory && (
        <div style={{ ...styles.historyPanel, animation: 'slideIn 0.18s ease' }}>
          <div style={styles.historyHeader}>
            <h2 style={styles.historyTitle}>Chat History</h2>
            <div style={styles.historyIcons}>
              <button
                onClick={startNewChat}
                style={styles.historyIconBtn}
                title="New chat"
                onMouseEnter={(e) => (e.currentTarget.style.color = NEON)}
                onMouseLeave={(e) => (e.currentTarget.style.color = TEXT_DIM)}
              >
                <Edit3 size={17} />
              </button>
              <button
                onClick={() => setShowHistory(false)}
                style={styles.historyIconBtn}
                title="Hide history"
                onMouseEnter={(e) => (e.currentTarget.style.color = NEON)}
                onMouseLeave={(e) => (e.currentTarget.style.color = TEXT_DIM)}
              >
                <X size={17} />
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div style={{ padding: '8px 16px', borderBottom: `1px solid ${BORDER}` }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 10px', borderRadius: 8,
              background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}`,
            }}>
              <Search size={14} color={TEXT_DIM} />
              <input
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Search chats..."
                style={{
                  flex: 1, border: 'none', background: 'none', outline: 'none',
                  fontSize: 13, color: TEXT, fontFamily: 'inherit',
                }}
              />
              {historySearch && (
                <button
                  onClick={() => setHistorySearch('')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: TEXT_DIM, padding: 0, display: 'flex' }}
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          <div style={styles.historyList}>
            {groupedHistory.length === 0 && (
              <div style={{ padding: '32px 20px', textAlign: 'center', color: TEXT_DIM, fontSize: 13 }}>
                {historySearch ? 'No matching chats found.' : 'No chat history yet. Start a conversation!'}
              </div>
            )}
            {groupedHistory.map((group) => (
              <div key={group.section}>
                <div style={styles.historySection}>
                  <p style={styles.historySectionTitle}>{group.section}</p>
                </div>
                {group.items.map((session) => (
                  <div
                    key={session.id}
                    style={{
                      ...styles.historyItem,
                      background: session.id === currentSessionId ? NEON_BG : 'transparent',
                    }}
                    onMouseEnter={(e) => { if (session.id !== currentSessionId) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                    onMouseLeave={(e) => { if (session.id !== currentSessionId) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <button
                      onClick={() => handleHistoryClick(session)}
                      style={{ flex: 1, display: 'flex', alignItems: 'flex-start', gap: 10, background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left', fontFamily: 'inherit' }}
                    >
                      <span style={styles.historyItemIcon}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                      </span>
                      <div style={styles.historyItemContent}>
                        <div style={{
                          ...styles.historyItemTitle,
                          color: session.id === currentSessionId ? NEON : TEXT,
                        }}>
                          {session.title}
                        </div>
                        <div style={styles.historyItemPreview}>{session.preview}</div>
                      </div>
                      <span style={styles.historyItemTime}>{formatSessionTime(session.timestamp)}</span>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteSession(session.id); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: TEXT_DIM, padding: 4, borderRadius: 4, display: 'flex', flexShrink: 0 }}
                      title="Delete chat"
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#EF4444')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = TEXT_DIM)}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div style={{
            padding: '10px 16px', borderTop: `1px solid ${BORDER}`,
            fontSize: 12, color: TEXT_DIM, textAlign: 'center',
          }}>
            {chatSessions.length} saved session{chatSessions.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-5px); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(16px); }
          to { opacity: 1; transform: translateX(0); }
        }
        * { box-sizing: border-box; }
        button { font-family: inherit; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #2A2A35; border-radius: 4px; }
      `}</style>
    </div >
  );
}