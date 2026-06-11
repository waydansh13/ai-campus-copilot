'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Send, Search, Edit3, Clock, BookOpen, Calculator,
  PenTool, Lightbulb, Mic, Paperclip, ChevronRight,
  Plus, X, Copy, Check, Volume2, Trash2, MicOff, Upload,
  FileText, Award
} from 'lucide-react';

const SUBJECTS = [

];

const QUICK_ACTIONS = [
  {
    icon: BookOpen,
    label: 'Explain a concept',
    desc: 'Get simple explanations for any topic',
    color: '#7C6FF7',
    bg: '#F0EFFE',
  },
  {
    icon: Calculator,
    label: 'Solve a problem',
    desc: 'Get step-by-step solutions for math & science',
    color: '#22C55E',
    bg: '#EDFDF4',
  },
  {
    icon: PenTool,
    label: 'Write or improve',
    desc: 'Improve essays, answers and written content',
    color: '#3B82F6',
    bg: '#EFF6FF',
  },
  {
    icon: Lightbulb,
    label: 'Study smarter',
    desc: 'Tips, strategies and study guides tailored for you',
    color: '#F59E0B',
    bg: '#FFFBEB',
  },
];

// --- localStorage-based session helpers ---
const STORAGE_KEY = 'studyai_sessions';

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function loadSessions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveSessions(sessions) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions)); } catch {}
}

function getSessionTitle(messages) {
  const first = messages.find(m => m.role === 'user');
  if (!first) return 'New chat';
  const text = first.content.replace(/^Help me with: /, '');
  return text.length > 50 ? text.slice(0, 50) + '…' : text;
}

function getSessionPreview(messages) {
  const last = [...messages].reverse().find(m => m.role === 'assistant');
  if (!last) return '';
  const text = last.content.replace(/\*\*/g, '').replace(/\n/g, ' ');
  return text.length > 60 ? text.slice(0, 60) + '…' : text;
}

function formatSessionTime(ts) {
  const d = new Date(ts);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  if (d >= today) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (d >= yesterday) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function groupSessionsByDate(sessions) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);

  const groups = [];
  const todayItems = sessions.filter(s => new Date(s.timestamp) >= today);
  const yesterdayItems = sessions.filter(s => { const d = new Date(s.timestamp); return d >= yesterday && d < today; });
  const weekItems = sessions.filter(s => { const d = new Date(s.timestamp); return d >= weekAgo && d < yesterday; });
  const olderItems = sessions.filter(s => new Date(s.timestamp) < weekAgo);

  if (todayItems.length) groups.push({ section: 'Today', items: todayItems });
  if (yesterdayItems.length) groups.push({ section: 'Yesterday', items: yesterdayItems });
  if (weekItems.length) groups.push({ section: 'Previous 7 Days', items: weekItems });
  if (olderItems.length) groups.push({ section: 'Older', items: olderItems });
  return groups;
}

function RobotAvatar() {
  return (
    <div style={{
      width: 80, height: 80,
      borderRadius: '50%',
      background: 'linear-gradient(135deg, #EEF0FF 0%, #E8F4FF 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      marginBottom: 20, position: 'relative',
      border: '2px solid #E0E4FF',
    }}>
      <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
        <rect x="8" y="14" width="28" height="20" rx="6" fill="#7C6FF7" />
        <rect x="12" y="18" width="8" height="6" rx="2" fill="white" opacity="0.9" />
        <rect x="24" y="18" width="8" height="6" rx="2" fill="white" opacity="0.9" />
        <rect x="18" y="26" width="8" height="3" rx="1.5" fill="white" opacity="0.6" />
        <rect x="16" y="10" width="12" height="5" rx="2.5" fill="#9D97FF" />
        <circle cx="22" cy="8" r="2" fill="#7C6FF7" />
        <rect x="6" y="18" width="3" height="8" rx="1.5" fill="#9D97FF" />
        <rect x="35" y="18" width="3" height="8" rx="1.5" fill="#9D97FF" />
        <rect x="14" y="34" width="6" height="4" rx="2" fill="#9D97FF" />
        <rect x="24" y="34" width="6" height="4" rx="2" fill="#9D97FF" />
      </svg>
      <div style={{
        position: 'absolute', top: 4, right: 4,
        width: 10, height: 10, borderRadius: '50%',
        background: '#7C6FF7',
      }} />
      <div style={{
        position: 'absolute', top: 0, right: 10,
        width: 6, height: 6, borderRadius: '50%',
        background: '#B8B3FF',
      }} />
    </div>
  );
}

function formatMessage(content) {
  let f = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  f = f.replace(/\*(.*?)\*/g, '<em>$1</em>');
  f = f.replace(/^### (.+)$/gm, '<h3 style="font-size:15px;font-weight:600;color:#1a1a1a;margin:12px 0 4px">$1</h3>');
  f = f.replace(/^## (.+)$/gm, '<h2 style="font-size:17px;font-weight:600;color:#1a1a1a;margin:14px 0 6px">$1</h2>');
  f = f.replace(/^\* (.+)$/gm, '<li style="margin-left:16px;list-style:disc;color:#374151">$1</li>');
  f = f.replace(/^- (.+)$/gm, '<li style="margin-left:16px;list-style:disc;color:#374151">$1</li>');
  f = f.replace(/^\d+\. (.+)$/gm, '<li style="margin-left:16px;list-style:decimal;color:#374151">$1</li>');
  f = f.replace(/(<li[\s\S]*?<\/li>)/g, '<ul style="margin:8px 0">$1</ul>');
  f = f.replace(
    /```(\w+)?\n([\s\S]*?)```/g,
    '<pre style="background:#F8F9FC;border:1px solid #E5E7EB;border-radius:8px;padding:12px;margin:10px 0;overflow-x:auto;font-size:12px;font-family:monospace;color:#1F2937;white-space:pre">$2</pre>'
  );
  f = f.replace(/`([^`]+)`/g, '<code style="background:#F3F4F6;color:#7C6FF7;padding:2px 6px;border-radius:4px;font-size:12px;font-family:monospace">$1</code>');
  f = f.replace(/\n\n/g, '<br/><br/>');
  f = f.replace(/\n/g, '<br/>');
  return f;
}

export default function StudyAssistant() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hi! I'm your AI Study Assistant. Choose a topic below or ask me anything to get started!" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [subject, setSubject] = useState('General');
  const [isListening, setIsListening] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [fileContent, setFileContent] = useState('');
  const [chatSessions, setChatSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(generateId);
  const [historySearch, setHistorySearch] = useState('');

  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isLoading]);

  // Load sessions from localStorage on mount
  useEffect(() => {
    setChatSessions(loadSessions());
  }, []);

  // Auto-save current session whenever messages change (if there's user content)
  useEffect(() => {
    const hasUserMsg = messages.some(m => m.role === 'user');
    if (!hasUserMsg || !showChat) return;
    const session = {
      id: currentSessionId,
      title: getSessionTitle(messages),
      preview: getSessionPreview(messages),
      messages,
      subject,
      timestamp: Date.now(),
    };
    setChatSessions(prev => {
      const filtered = prev.filter(s => s.id !== currentSessionId);
      const updated = [session, ...filtered];
      saveSessions(updated);
      return updated;
    });
  }, [messages]);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['.pdf', '.ppt', '.pptx', '.doc', '.docx', '.txt'];
    if (!allowed.some(ext => file.name.toLowerCase().endsWith(ext))) {
      alert('Supported formats: PDF, PPT/PPTX, DOC/DOCX, TXT');
      return;
    }
    setUploadedFile(file);
    setFileName(file.name);
    setIsProcessingFile(true);
    setShowChat(true);

    let extractedText = '';

    try {
      // For text files, read directly in the browser
      if (file.name.toLowerCase().endsWith('.txt')) {
        extractedText = await file.text();
      } else if (file.name.toLowerCase().endsWith('.pdf')) {
        // Send the actual file to /api/parse-pdf to extract text
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
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `⚠️ **Could not extract text from ${file.name}.** The file may be scanned or image-based. Please try a different file or paste the content manually.`
      }]);
      setIsProcessingFile(false);
      return;
    }

    // Store extracted text
    setFileContent(extractedText);

    // Now send the extracted content to the AI for a proper summary
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
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `📎 **Document uploaded:** ${file.name} (${extractedText.length.toLocaleString()} characters extracted)\n\n${data.reply || "I've read your document. Ask me anything about it!"}`
      }]);
    } catch {
      setMessages(prev => [...prev, {
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

  const sendMessage = async (text) => {
    const messageText = text || input;
    if (!messageText.trim() || isLoading) return;

    setShowChat(true);
    const userMessage = { role: 'user', content: messageText, attachment: uploadedFile ? fileName : undefined };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    try {
      // Build document context with actual extracted text
      let context = '';
      let messageToSend = messageText;
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

  const handleQuickAction = (action) => {
    sendMessage(`Help me with: ${action.label}`);
  };

  const startNewChat = () => {
    window.speechSynthesis?.cancel();
    // Start a fresh session
    const newId = generateId();
    setCurrentSessionId(newId);
    setMessages([{ role: 'assistant', content: "Hi! I'm your AI Study Assistant. Ask me anything or upload a document to get started!" }]);
    removeFile();
    setShowChat(false);
  };

  const deleteSession = (sessionId) => {
    setChatSessions(prev => {
      const updated = prev.filter(s => s.id !== sessionId);
      saveSessions(updated);
      return updated;
    });
    if (sessionId === currentSessionId) {
      startNewChat();
    }
  };

  const copyMessage = (content, index) => {
    navigator.clipboard.writeText(content.replace(/<[^>]*>/g, ''));
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1800);
  };

  const speakMessage = (content) => {
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
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setInput(prev => prev + transcript);
    };
    recognition.onend = () => setIsListening(false);
    recognition.start();
    recognitionRef.current = recognition;
    setIsListening(true);
  };

  const handleHistoryClick = (session) => {
    if (session.id === currentSessionId) return;
    // Load the full session
    setCurrentSessionId(session.id);
    setMessages(session.messages || []);
    setSubject(session.subject || 'General');
    removeFile();
    setShowChat(true);
  };

  // Filter sessions for search
  const filteredSessions = historySearch.trim()
    ? chatSessions.filter(s =>
        s.title.toLowerCase().includes(historySearch.toLowerCase()) ||
        (s.preview || '').toLowerCase().includes(historySearch.toLowerCase())
      )
    : chatSessions;
  const groupedHistory = groupSessionsByDate(filteredSessions);

  const styles = {
    container: {
      display: 'flex',
      height: '100%',
      background: '#FAFAFA',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      overflow: 'hidden',
    },
    mainPanel: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      background: '#FFFFFF',
    },
    historyPanel: {
      width: 300,
      borderLeft: '1px solid #F0F0F0',
      background: '#FFFFFF',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    },
    historyHeader: {
      padding: '20px 20px 16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottom: '1px solid #F5F5F5',
    },
    historyTitle: {
      fontSize: 17,
      fontWeight: 600,
      color: '#111827',
      margin: 0,
    },
    historyIcons: {
      display: 'flex',
      gap: 8,
    },
    historyIconBtn: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      color: '#9CA3AF',
      padding: 4,
      borderRadius: 6,
      display: 'flex',
      alignItems: 'center',
    },
    historyList: {
      flex: 1,
      overflowY: 'auto',
      padding: '0 0 16px',
    },
    historySection: {
      padding: '16px 20px 6px',
    },
    historySectionTitle: {
      fontSize: 12,
      fontWeight: 600,
      color: '#6B7280',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      marginBottom: 8,
    },
    historyItem: {
      padding: '10px 20px',
      cursor: 'pointer',
      borderRadius: 0,
      transition: 'background 0.15s',
      display: 'flex',
      alignItems: 'flex-start',
      gap: 10,
    },
    historyItemIcon: {
      marginTop: 2,
      color: '#9CA3AF',
      flexShrink: 0,
    },
    historyItemContent: {
      flex: 1,
      minWidth: 0,
    },
    historyItemTitle: {
      fontSize: 13.5,
      fontWeight: 500,
      color: '#111827',
      marginBottom: 2,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    },
    historyItemPreview: {
      fontSize: 12,
      color: '#9CA3AF',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    },
    historyItemTime: {
      fontSize: 11,
      color: '#9CA3AF',
      flexShrink: 0,
    },
    viewAllBtn: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: '10px 20px',
      color: '#6B7280',
      fontSize: 13,
      cursor: 'pointer',
      background: 'none',
      border: 'none',
      width: '100%',
      borderTop: '1px solid #F5F5F5',
      marginTop: 8,
    },
    chatArea: {
      flex: 1,
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
    },
    welcomeArea: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 24px',
    },
    greeting: {
      fontSize: 32,
      fontWeight: 700,
      color: '#111827',
      marginBottom: 8,
      textAlign: 'center',
    },
    subGreeting: {
      fontSize: 16,
      color: '#6B7280',
      marginBottom: 40,
      textAlign: 'center',
    },
    actionGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: 12,
      width: '100%',
      maxWidth: 560,
    },
    actionCard: {
      padding: '18px 20px',
      borderRadius: 14,
      border: '1px solid #F0F0F0',
      cursor: 'pointer',
      background: '#FFFFFF',
      textAlign: 'left',
      transition: 'all 0.2s',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    },
    actionIcon: {
      width: 40,
      height: 40,
      borderRadius: 10,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 10,
    },
    actionLabel: {
      fontSize: 14,
      fontWeight: 600,
      color: '#111827',
      marginBottom: 4,
    },
    actionDesc: {
      fontSize: 12,
      color: '#9CA3AF',
      lineHeight: 1.4,
    },
    messagesArea: {
      padding: '24px 32px',
      display: 'flex',
      flexDirection: 'column',
      gap: 20,
    },
    messageBubble: (role) => ({
      display: 'flex',
      justifyContent: role === 'user' ? 'flex-end' : 'flex-start',
      alignItems: 'flex-start',
      gap: 10,
    }),
    aiAvatar: {
      width: 34,
      height: 34,
      borderRadius: '50%',
      background: 'linear-gradient(135deg, #EEF0FF, #E8F4FF)',
      border: '1.5px solid #E0E4FF',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    bubble: (role) => ({
      maxWidth: '72%',
      padding: '12px 16px',
      borderRadius: role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
      fontSize: 14.5,
      lineHeight: 1.65,
      background: role === 'user' ? '#7C6FF7' : '#F7F7F8',
      color: role === 'user' ? '#FFFFFF' : '#1F2937',
      border: role === 'user' ? 'none' : '1px solid #EFEFEF',
    }),
    msgActions: {
      display: 'flex',
      gap: 12,
      marginTop: 6,
      paddingLeft: 4,
    },
    msgActionBtn: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      color: '#D1D5DB',
      padding: 2,
      display: 'flex',
      alignItems: 'center',
      transition: 'color 0.15s',
    },
    inputSection: {
      padding: '0 24px 24px',
      borderTop: '1px solid #F5F5F5',
      background: '#FFFFFF',
    },
    inputWrapper: {
      border: '1.5px solid #E5E7EB',
      borderRadius: 16,
      background: '#FFFFFF',
      transition: 'border-color 0.2s',
      overflow: 'hidden',
    },
    inputRow: {
      display: 'flex',
      alignItems: 'center',
      padding: '4px 8px 4px 16px',
      gap: 8,
    },
    textInput: {
      flex: 1,
      background: 'none',
      border: 'none',
      outline: 'none',
      fontSize: 15,
      color: '#111827',
      padding: '12px 0',
      fontFamily: 'inherit',
    },
    inputActions: {
      display: 'flex',
      alignItems: 'center',
      gap: 4,
    },
    inputActionBtn: (active) => ({
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: '7px 12px',
      borderRadius: 10,
      border: '1px solid #E5E7EB',
      background: active ? '#FEE2E2' : '#FFFFFF',
      color: active ? '#EF4444' : '#6B7280',
      fontSize: 13,
      fontWeight: 500,
      cursor: 'pointer',
      transition: 'all 0.15s',
    }),
    sendBtn: (enabled) => ({
      width: 38,
      height: 38,
      borderRadius: '50%',
      background: enabled ? '#7C6FF7' : '#E5E7EB',
      border: 'none',
      cursor: enabled ? 'pointer' : 'default',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: enabled ? '#FFFFFF' : '#9CA3AF',
      flexShrink: 0,
      transition: 'all 0.15s',
    }),
    disclaimer: {
      textAlign: 'center',
      fontSize: 12,
      color: '#9CA3AF',
      marginTop: 8,
    },
    fileBar: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '8px 16px',
      background: '#F0FDF4',
      borderBottom: '1px solid #DCFCE7',
    },
    loadingDot: {
      width: 8,
      height: 8,
      borderRadius: '50%',
      background: '#7C6FF7',
    },
    subjectBadge: {
      padding: '4px 12px',
      borderRadius: 20,
      background: '#F0EFFE',
      color: '#7C6FF7',
      fontSize: 12,
      fontWeight: 600,
      border: 'none',
      cursor: 'pointer',
    },
  };

  return (
    <div style={styles.container}>
      {/* Main Chat Panel */}
      <div style={styles.mainPanel}>
        {/* Subject selector strip */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 24px', borderBottom: '1px solid #F5F5F5',
          overflowX: 'auto', flexShrink: 0,
        }}>
          {SUBJECTS.map(s => (
            <button
              key={s}
              onClick={() => setSubject(s)}
              style={{
                ...styles.subjectBadge,
                background: subject === s ? '#7C6FF7' : '#F5F5F7',
                color: subject === s ? '#FFFFFF' : '#6B7280',
                whiteSpace: 'nowrap',
              }}
            >
              {s}
            </button>
          ))}
          <button
            onClick={startNewChat}
            style={{
              marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4,
              padding: '4px 12px', borderRadius: 20, background: 'none',
              border: '1px solid #E0E4FF', color: '#7C6FF7',
              fontSize: 12, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            <Plus size={13} /> New Chat
          </button>
        </div>

        {/* Chat / Welcome area */}
        <div style={styles.chatArea}>
          {!showChat ? (
            <div style={styles.welcomeArea}>
              <RobotAvatar />
              <h1 style={styles.greeting}>Hello, bachooooo! 👋</h1>
              <p style={styles.subGreeting}>How can I help you with your studies today?</p>
              <div style={styles.actionGrid}>
                {QUICK_ACTIONS.map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.label}
                      onClick={() => handleQuickAction(action)}
                      style={styles.actionCard}
                      onMouseEnter={e => {
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
                        e.currentTarget.style.borderColor = '#E0E0E0';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)';
                        e.currentTarget.style.borderColor = '#F0F0F0';
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
                        <rect x="8" y="14" width="28" height="20" rx="6" fill="#7C6FF7" />
                        <rect x="12" y="18" width="8" height="6" rx="2" fill="white" opacity="0.9" />
                        <rect x="24" y="18" width="8" height="6" rx="2" fill="white" opacity="0.9" />
                        <rect x="18" y="26" width="8" height="3" rx="1.5" fill="white" opacity="0.6" />
                        <rect x="16" y="10" width="12" height="5" rx="2.5" fill="#9D97FF" />
                        <circle cx="22" cy="8" r="2" fill="#7C6FF7" />
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
                          onMouseEnter={e => e.currentTarget.style.color = '#6B7280'}
                          onMouseLeave={e => e.currentTarget.style.color = '#D1D5DB'}
                        >
                          {copiedIndex === i
                            ? <Check size={14} style={{ color: '#22C55E' }} />
                            : <Copy size={14} />}
                        </button>
                        <button
                          onClick={() => speakMessage(msg.content)}
                          style={styles.msgActionBtn}
                          title="Speak"
                          onMouseEnter={e => e.currentTarget.style.color = '#6B7280'}
                          onMouseLeave={e => e.currentTarget.style.color = '#D1D5DB'}
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
                      <rect x="8" y="14" width="28" height="20" rx="6" fill="#7C6FF7" />
                      <rect x="12" y="18" width="8" height="6" rx="2" fill="white" opacity="0.9" />
                      <rect x="24" y="18" width="8" height="6" rx="2" fill="white" opacity="0.9" />
                    </svg>
                  </div>
                  <div style={{ ...styles.bubble('assistant'), padding: '14px 18px' }}>
                    <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                      {[0, 150, 300].map(delay => (
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
            <FileText size={14} color="#16A34A" />
            <span style={{ fontSize: 13, color: '#15803D', fontWeight: 500 }}>{fileName}</span>
            <span style={{ fontSize: 11, color: '#86EFAC' }}>• Attached</span>
            <button onClick={removeFile} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}>
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
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                placeholder={uploadedFile ? `Ask about ${fileName}...` : "Message StudyAI..."}
                style={styles.textInput}
              />
            </div>
            <div style={{
              display: 'flex', alignItems: 'center',
              padding: '6px 10px', borderTop: '1px solid #F5F5F5',
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
      <div style={styles.historyPanel}>
        <div style={styles.historyHeader}>
          <h2 style={styles.historyTitle}>Chat History</h2>
          <div style={styles.historyIcons}>
            <button
              onClick={startNewChat}
              style={styles.historyIconBtn}
              title="New chat"
            >
              <Edit3 size={17} />
            </button>
          </div>
        </div>

        {/* Search bar */}
        <div style={{ padding: '8px 16px', borderBottom: '1px solid #F5F5F5' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '6px 10px', borderRadius: 8,
            background: '#F7F7F8', border: '1px solid #EFEFEF',
          }}>
            <Search size={14} color="#9CA3AF" />
            <input
              value={historySearch}
              onChange={e => setHistorySearch(e.target.value)}
              placeholder="Search chats..."
              style={{
                flex: 1, border: 'none', background: 'none', outline: 'none',
                fontSize: 13, color: '#374151', fontFamily: 'inherit',
              }}
            />
            {historySearch && (
              <button
                onClick={() => setHistorySearch('')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 0, display: 'flex' }}
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        <div style={styles.historyList}>
          {groupedHistory.length === 0 && (
            <div style={{ padding: '32px 20px', textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>
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
                    background: session.id === currentSessionId ? '#F0EFFE' : 'transparent',
                  }}
                  onMouseEnter={e => { if (session.id !== currentSessionId) e.currentTarget.style.background = '#F9F9FB'; }}
                  onMouseLeave={e => { if (session.id !== currentSessionId) e.currentTarget.style.background = 'transparent'; }}
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
                        color: session.id === currentSessionId ? '#7C6FF7' : '#111827',
                      }}>
                        {session.title}
                      </div>
                      <div style={styles.historyItemPreview}>{session.preview}</div>
                    </div>
                    <span style={styles.historyItemTime}>{formatSessionTime(session.timestamp)}</span>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteSession(session.id); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#D1D5DB', padding: 4, borderRadius: 4, display: 'flex', flexShrink: 0 }}
                    title="Delete chat"
                    onMouseEnter={e => e.currentTarget.style.color = '#EF4444'}
                    onMouseLeave={e => e.currentTarget.style.color = '#D1D5DB'}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div style={{
          padding: '10px 16px', borderTop: '1px solid #F5F5F5',
          fontSize: 12, color: '#9CA3AF', textAlign: 'center',
        }}>
          {chatSessions.length} saved session{chatSessions.length !== 1 ? 's' : ''}
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-5px); }
        }
        * { box-sizing: border-box; }
        button { font-family: inherit; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #E5E7EB; border-radius: 4px; }
      `}</style>
    </div>
  );
}