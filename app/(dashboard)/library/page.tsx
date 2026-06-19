'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  Search, BookOpen, Sparkles, Clock,
  FileText, Star, X, Bell,
  TrendingUp, RotateCcw, Trash2, BookMarked, Send,
  ChevronRight, AlertCircle, Plus,
  Library, Brain, MessageCircle, Loader2,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type OpenLibraryBook = {
  key: string;
  title: string;
  author_name?: string[];
  cover_i?: number;
  first_publish_year?: number;
  subject?: string[];
  isbn?: string[];
};

type BorrowedBook = {
  id: string;
  title: string;
  author: string;
  cover: string;
  borrowedAt: string;
  dueDate: string;
};

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  books?: OpenLibraryBook[];
};

type ResourceItem = {
  id: string;
  title: string;
  subject: string;
  uploadedAt: string;
};

// ─── AI ──────────────────────────────────────────────────────────────────────

async function callLibraryAI(prompt: string): Promise<string> {
  try {
    const response = await fetch('/api/library/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });
    const data = await response.json();
    return data?.reply || 'No response generated.';
  } catch (error) {
    console.error('Library AI Error:', error);
    return 'Failed to connect to Library AI.';
  }
}

async function searchOpenLibrary(q: string): Promise<OpenLibraryBook[]> {
  try {
    const res = await fetch(
      `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=6`
    );
    const data = await res.json();
    return data.docs?.slice(0, 6) ?? [];
  } catch {
    return [];
  }
}

// ─── Placeholder ─────────────────────────────────────────────────────────────

const PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='440' viewBox='0 0 300 440'%3E%3Crect width='300' height='440' fill='%23111116'/%3E%3Ctext x='150' y='230' text-anchor='middle' fill='%2300f0ff33' font-size='13' font-family='sans-serif'%3ENo Cover%3C/text%3E%3C/svg%3E";

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SmartLibraryPage() {
  // ── State ──────────────────────────────────────────────────────────────
  const [query, setQuery] = useState('');
  const [loadingBooks, setLoadingBooks] = useState(false);
  const [books, setBooks] = useState<OpenLibraryBook[]>([]);
  const [selectedBook, setSelectedBook] = useState<OpenLibraryBook | null>(null);
  const [borrowedBooks, setBorrowedBooks] = useState<BorrowedBook[]>([]);
  const [papers, setPapers] = useState<ResourceItem[]>([]);
  const [paperTitle, setPaperTitle] = useState('');
  const [paperSubject, setPaperSubject] = useState('');
  const [notes, setNotes] = useState<ResourceItem[]>([]);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteSubject, setNoteSubject] = useState('');
  const [activeTab, setActiveTab] = useState<'discover' | 'mybooks' | 'resources' | 'analytics'>('discover');
  const [hasInitialized, setHasInitialized] = useState(false);

  // Floating bot state
  const [botOpen, setBotOpen] = useState(false);
  const [botMessages, setBotMessages] = useState<ChatMessage[]>([{
    role: 'assistant',
    content: "Hi! I'm your AI Librarian. Ask me to recommend books on any topic, and I'll find real books for you from our catalogue.",
  }]);
  const [botInput, setBotInput] = useState('');
  const [botLoading, setBotLoading] = useState(false);
  const botEndRef = useRef<HTMLDivElement>(null);

  // ── Persist (without triggering scroll) ───────────────────────────────
  // Use a ref to track if we've done the initial load
  const didLoad = useRef(false);

  useEffect(() => {
    if (didLoad.current) return;
    didLoad.current = true;
    try {
      const b = localStorage.getItem('sl_borrowedBooks');
      const n = localStorage.getItem('sl_notes');
      const p = localStorage.getItem('sl_papers');
      if (b) setBorrowedBooks(JSON.parse(b));
      if (n) setNotes(JSON.parse(n));
      if (p) setPapers(JSON.parse(p));
    } catch (_) { }
    // Mark initialized AFTER loading, so saves don't trigger on first render
    setTimeout(() => setHasInitialized(true), 0);
  }, []);

  // Only persist after initialization to avoid scroll-triggering re-renders on mount
  useEffect(() => {
    if (!hasInitialized) return;
    localStorage.setItem('sl_borrowedBooks', JSON.stringify(borrowedBooks));
  }, [borrowedBooks, hasInitialized]);

  useEffect(() => {
    if (!hasInitialized) return;
    localStorage.setItem('sl_notes', JSON.stringify(notes));
  }, [notes, hasInitialized]);

  useEffect(() => {
    if (!hasInitialized) return;
    localStorage.setItem('sl_papers', JSON.stringify(papers));
  }, [papers, hasInitialized]);

  useEffect(() => {
    if (botOpen) {
      setTimeout(() => botEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  }, [botMessages, botOpen]);

  const stats = useMemo(() => {
    const today = new Date();
    const overdue = borrowedBooks.filter((b) => new Date(b.dueDate) < today).length;
    const dueSoon = borrowedBooks.filter((b) => {
      const diff = (new Date(b.dueDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
      return diff >= 0 && diff <= 3;
    }).length;
    return { borrowed: borrowedBooks.length, overdue, dueSoon, resources: notes.length + papers.length };
  }, [borrowedBooks, notes, papers]);

  // ── Search ───────────────────────────────────────────────────────────────
  const searchBooks = useCallback(async () => {
    if (!query.trim()) return;
    setLoadingBooks(true);
    setBooks([]);
    const results = await searchOpenLibrary(query);
    setBooks(results);
    setLoadingBooks(false);
  }, [query]);

  // ── Borrow / Return ──────────────────────────────────────────────────────
  const borrowBook = useCallback((book: OpenLibraryBook) => {
    if (borrowedBooks.find((b) => b.id === book.key)) return;
    const today = new Date();
    const due = new Date();
    due.setDate(today.getDate() + 14);
    setBorrowedBooks((prev) => [...prev, {
      id: book.key,
      title: book.title,
      author: book.author_name?.join(', ') || 'Unknown Author',
      cover: book.cover_i ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg` : '',
      borrowedAt: today.toISOString(),
      dueDate: due.toISOString(),
    }]);
  }, [borrowedBooks]);

  const returnBook = useCallback((id: string) => {
    setBorrowedBooks((prev) => prev.filter((b) => b.id !== id));
  }, []);

  // ── Resources ────────────────────────────────────────────────────────────
  const addPaper = () => {
    if (!paperTitle.trim()) return;
    setPapers((prev) => [...prev, {
      id: Date.now().toString(),
      title: paperTitle.trim(),
      subject: paperSubject.trim() || 'General',
      uploadedAt: new Date().toLocaleDateString('en-IN'),
    }]);
    setPaperTitle(''); setPaperSubject('');
  };

  const addNote = () => {
    if (!noteTitle.trim()) return;
    setNotes((prev) => [...prev, {
      id: Date.now().toString(),
      title: noteTitle.trim(),
      subject: noteSubject.trim() || 'General',
      uploadedAt: new Date().toLocaleDateString('en-IN'),
    }]);
    setNoteTitle(''); setNoteSubject('');
  };

  // ── Bot Chat (book recommendations only) ─────────────────────────────────
  const sendBotMessage = async () => {
    if (!botInput.trim() || botLoading) return;
    const userMsg = botInput.trim();
    setBotInput('');
    setBotMessages((prev) => [...prev, { role: 'user', content: userMsg }]);
    setBotLoading(true);

    // Step 1: Extract search query from user message via AI
    const extractReply = await callLibraryAI(
      `You are a book recommendation assistant. The user said: "${userMsg}"\n\nRespond ONLY with a JSON object like: {"searchQuery": "machine learning", "message": "Here are some great books on machine learning I found for you:"}\n\nThe searchQuery should be 2-4 words perfect for searching OpenLibrary. The message should be a friendly 1-sentence intro. No other text.`
    );

    let searchQuery = userMsg;
    let intro = `Here are some books I found for "${userMsg}":`;

    try {
      const clean = extractReply.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(clean);
      searchQuery = parsed.searchQuery || userMsg;
      intro = parsed.message || intro;
    } catch (_) { }

    // Step 2: Search OpenLibrary for real books
    const foundBooks = await searchOpenLibrary(searchQuery);

    setBotMessages((prev) => [...prev, {
      role: 'assistant',
      content: foundBooks.length > 0
        ? intro
        : `I searched for "${searchQuery}" but couldn't find matching books right now. Try a different topic or check the Discover section.`,
      books: foundBooks.length > 0 ? foundBooks : undefined,
    }]);
    setBotLoading(false);
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ position: 'relative', minHeight: '100%', background: '#09090B', color: '#F0F2F5' }}>

      {/* ── Dashboard Header ────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '28px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '10px',
            background: 'rgba(0,240,255,0.08)', border: '1px solid rgba(0,240,255,0.35)',
            boxShadow: '0 0 16px rgba(0,240,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Library size={20} color="#00F0FF" />
          </div>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: '#F0F2F5', letterSpacing: '-0.3px' }}>
              Smart Library
            </h1>
            <p style={{ fontSize: '12px', color: 'rgba(0,240,255,0.4)', margin: 0 }}>AI-powered campus library system</p>
          </div>
        </div>

        {/* Stat pills */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { label: 'Borrowed', value: stats.borrowed, color: '#00F0FF', bg: 'rgba(0,240,255,0.08)', border: 'rgba(0,240,255,0.2)' },
            { label: 'Overdue', value: stats.overdue, color: '#EF4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)' },
            { label: 'Resources', value: stats.resources, color: '#34D399', bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.2)' },
          ].map(({ label, value, color, bg, border }) => (
            <div key={label} style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: bg, borderRadius: '20px', padding: '6px 12px',
              border: `1px solid ${border}`,
            }}>
              <span style={{ fontSize: '15px', fontWeight: 800, color, textShadow: `0 0 8px ${color}` }}>{value}</span>
              <span style={{ fontSize: '11px', color: 'rgba(240,242,245,0.45)' }}>{label}</span>
            </div>
          ))}
          {stats.overdue > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '20px', padding: '6px 12px',
            }}>
              <Bell size={11} color="#EF4444" />
              <span style={{ fontSize: '11px', color: '#EF4444', fontWeight: 600 }}>{stats.overdue} overdue</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Tab Nav ─────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', gap: '4px',
        background: 'rgba(0,240,255,0.03)',
        border: '1px solid rgba(0,240,255,0.1)',
        borderRadius: '12px', padding: '4px',
        marginBottom: '24px', overflowX: 'auto',
      }}>
        {([
          { id: 'discover', label: 'Discover', icon: Search },
          { id: 'mybooks', label: 'My Books', icon: BookMarked },
          { id: 'resources', label: 'Resources', icon: FileText },
          { id: 'analytics', label: 'Analytics', icon: TrendingUp },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            style={{
              display: 'flex', alignItems: 'center', gap: '7px',
              padding: '9px 16px', borderRadius: '9px', border: 'none', cursor: 'pointer',
              background: activeTab === id ? 'rgba(0,240,255,0.1)' : 'transparent',
              color: activeTab === id ? '#00F0FF' : 'rgba(0,240,255,0.4)',
              fontSize: '13px', fontWeight: activeTab === id ? 600 : 400,
              boxShadow: activeTab === id ? 'inset 0 0 0 1px rgba(0,240,255,0.25)' : 'none',
              transition: 'all 0.15s', whiteSpace: 'nowrap', flexShrink: 0,
            }}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab: Discover ───────────────────────────────────────────── */}
      {activeTab === 'discover' && (
        <div>
          {/* Search bar */}
          <div style={{
            display: 'flex', gap: '10px',
            background: 'rgba(0,240,255,0.03)',
            border: '1px solid rgba(0,240,255,0.12)',
            borderRadius: '14px', padding: '8px',
            marginBottom: '20px',
          }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={15} color="rgba(0,240,255,0.4)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchBooks()}
                placeholder="Search by title, author, or subject…"
                style={{
                  width: '100%', background: 'transparent', border: 'none', outline: 'none',
                  padding: '11px 14px 11px 38px', fontSize: '14px', color: '#F0F2F5', caretColor: '#00F0FF',
                }}
              />
            </div>
            <button
              onClick={searchBooks}
              disabled={loadingBooks}
              style={{
                padding: '11px 22px', borderRadius: '10px', border: '1px solid rgba(0,240,255,0.3)',
                background: 'rgba(0,240,255,0.1)', color: '#00F0FF', fontSize: '13px', fontWeight: 600,
                cursor: 'pointer', boxShadow: '0 0 14px rgba(0,240,255,0.15)', transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap',
              }}
            >
              {loadingBooks ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Search size={14} />}
              {loadingBooks ? 'Searching…' : 'Search'}
            </button>
          </div>

          {/* Results */}
          {loadingBooks ? (
            <SkeletonGrid />
          ) : books.length === 0 ? (
            <EmptyState icon={<BookOpen size={36} color="rgba(0,240,255,0.2)" />} title="Search your library" description="Type a title, author, or subject to discover books from the Open Library catalogue." />
          ) : (
            <BookGrid books={books} borrowedBooks={borrowedBooks} onBorrow={borrowBook} onViewDetails={setSelectedBook} />
          )}

          {/* Faculty Picks */}
          <div style={{ marginTop: '36px' }}>
            <SectionHeader icon={<Star size={16} color="#FBBF24" />} title="Faculty Picks" color="#FBBF24" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
              {[
                { title: 'Introduction to Algorithms', author: 'Cormen, Leiserson, Rivest & Stein', tag: 'Computer Science', rank: '01' },
                { title: 'Computer Networks', author: 'Andrew S. Tanenbaum', tag: 'Networking', rank: '02' },
                { title: 'Database System Concepts', author: 'Silberschatz, Korth & Sudarshan', tag: 'Databases', rank: '03' },
              ].map((book) => (
                <div key={book.rank} style={{
                  background: '#111116', border: '1px solid rgba(251,191,36,0.12)',
                  borderRadius: '12px', padding: '16px', display: 'flex', gap: '14px', alignItems: 'flex-start',
                }}>
                  <span style={{ fontSize: '20px', fontWeight: 800, color: 'rgba(251,191,36,0.2)', flexShrink: 0, textShadow: '0 0 12px rgba(251,191,36,0.25)' }}>{book.rank}</span>
                  <div>
                    <span style={{
                      display: 'inline-block', fontSize: '10px', fontWeight: 600, color: '#FBBF24',
                      background: 'rgba(251,191,36,0.08)', borderRadius: '20px', padding: '2px 8px',
                      marginBottom: '5px', border: '1px solid rgba(251,191,36,0.2)',
                    }}>{book.tag}</span>
                    <h3 style={{ fontSize: '13px', fontWeight: 600, margin: '0 0 3px', color: '#F0F2F5', lineHeight: 1.4 }}>{book.title}</h3>
                    <p style={{ fontSize: '11px', color: 'rgba(251,191,36,0.35)', margin: 0 }}>{book.author}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: My Books ───────────────────────────────────────────── */}
      {activeTab === 'mybooks' && (
        <div>
          <SectionHeader icon={<BookMarked size={16} color="#A78BFA" />} title="Borrowed Books" color="#A78BFA" />
          {borrowedBooks.length === 0 ? (
            <EmptyState icon={<BookMarked size={36} color="rgba(167,139,250,0.2)" />} title="No books borrowed yet" description="Discover books and click Borrow to track them here." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '32px' }}>
              {borrowedBooks.map((book) => {
                const today = new Date();
                const due = new Date(book.dueDate);
                const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                const isOverdue = diff < 0;
                const isDueSoon = !isOverdue && diff <= 3;
                const statusColor = isOverdue ? '#EF4444' : isDueSoon ? '#FBBF24' : '#34D399';
                const statusBg = isOverdue ? 'rgba(239,68,68,0.08)' : isDueSoon ? 'rgba(251,191,36,0.08)' : 'rgba(52,211,153,0.08)';
                const statusBorder = isOverdue ? 'rgba(239,68,68,0.25)' : isDueSoon ? 'rgba(251,191,36,0.25)' : 'rgba(52,211,153,0.25)';
                return (
                  <div key={book.id} style={{
                    display: 'flex', alignItems: 'center', gap: '14px',
                    background: '#111116', border: '1px solid rgba(167,139,250,0.12)',
                    borderRadius: '12px', padding: '12px',
                  }}>
                    <img src={book.cover || PLACEHOLDER} alt={book.title}
                      style={{ width: '42px', height: '58px', borderRadius: '6px', objectFit: 'cover', flexShrink: 0, border: '1px solid rgba(167,139,250,0.2)' }}
                      onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER; }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#F0F2F5' }}>{book.title}</h3>
                      <p style={{ fontSize: '12px', color: 'rgba(167,139,250,0.45)', margin: 0 }}>{book.author}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      <span style={{
                        fontSize: '12px', fontWeight: 600, padding: '4px 10px', borderRadius: '20px',
                        background: statusBg, color: statusColor, border: `1px solid ${statusBorder}`,
                      }}>
                        {isOverdue ? `Overdue ${Math.abs(diff)}d` : isDueSoon ? `Due in ${diff}d` : due.toLocaleDateString('en-IN')}
                      </span>
                      <button onClick={() => returnBook(book.id)} title="Return book"
                        style={{ padding: '7px', borderRadius: '8px', border: '1px solid rgba(0,240,255,0.12)', background: 'rgba(0,240,255,0.04)', color: 'rgba(0,240,255,0.35)', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.15s' }}
                        onMouseEnter={(e) => { const b = e.currentTarget; b.style.background = 'rgba(239,68,68,0.1)'; b.style.color = '#EF4444'; b.style.borderColor = 'rgba(239,68,68,0.3)'; }}
                        onMouseLeave={(e) => { const b = e.currentTarget; b.style.background = 'rgba(0,240,255,0.04)'; b.style.color = 'rgba(0,240,255,0.35)'; b.style.borderColor = 'rgba(0,240,255,0.12)'; }}
                      ><RotateCcw size={13} /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Due Date Tracker */}
          {borrowedBooks.length > 0 && (
            <>
              <SectionHeader icon={<Clock size={16} color="#FBBF24" />} title="Due Date Tracker" color="#FBBF24" />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
                {borrowedBooks.map((book) => {
                  const today = new Date();
                  const due = new Date(book.dueDate);
                  const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                  const progress = Math.max(0, Math.min(100, (diff / 14) * 100));
                  const color = diff < 0 ? '#EF4444' : diff <= 3 ? '#FBBF24' : '#34D399';
                  const glow = diff < 0 ? 'rgba(239,68,68,0.25)' : diff <= 3 ? 'rgba(251,191,36,0.25)' : 'rgba(52,211,153,0.25)';
                  return (
                    <div key={book.id} style={{ background: '#111116', border: '1px solid rgba(251,191,36,0.1)', borderRadius: '12px', padding: '14px' }}>
                      <h3 style={{ fontSize: '13px', fontWeight: 600, margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#F0F2F5' }}>{book.title}</h3>
                      <p style={{ fontSize: '11px', color: 'rgba(251,191,36,0.4)', margin: '0 0 10px' }}>Due: {due.toLocaleDateString('en-IN')}</p>
                      <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', marginBottom: '7px' }}>
                        <div style={{ height: '100%', width: `${progress}%`, background: color, borderRadius: '2px', boxShadow: `0 0 6px ${glow}` }} />
                      </div>
                      <p style={{ fontSize: '12px', fontWeight: 600, color, margin: 0 }}>
                        {diff < 0 ? `Overdue by ${Math.abs(diff)} days` : diff === 0 ? 'Due today!' : `${diff} days remaining`}
                      </p>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Tab: Resources ──────────────────────────────────────────── */}
      {activeTab === 'resources' && (
        <div>
          {/* Papers */}
          <SectionHeader icon={<FileText size={16} color="#EF4444" />} title="Previous Year Papers" color="#EF4444" />
          <div style={{ background: 'rgba(239,68,68,0.02)', border: '1px solid rgba(239,68,68,0.1)', borderRadius: '12px', padding: '14px', marginBottom: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
              <input type="text" value={paperTitle} onChange={(e) => setPaperTitle(e.target.value)} placeholder="Paper title (e.g. OS 2023)" style={inputStyle} />
              <input type="text" value={paperSubject} onChange={(e) => setPaperSubject(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addPaper()} placeholder="Subject" style={inputStyle} />
              <button onClick={addPaper} disabled={!paperTitle.trim()} style={{
                ...addBtnStyle,
                background: paperTitle.trim() ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.03)',
                color: paperTitle.trim() ? '#EF4444' : 'rgba(255,255,255,0.2)',
                border: `1px solid ${paperTitle.trim() ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.06)'}`,
              }}><Plus size={13} /> Add Paper</button>
            </div>
          </div>
          {papers.length === 0 ? (
            <p style={{ fontSize: '13px', color: 'rgba(0,240,255,0.2)', textAlign: 'center', padding: '16px' }}>No papers added yet.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px', marginBottom: '32px' }}>
              {papers.map((p) => (
                <ResourceCard key={p.id} item={p} icon={<FileText size={15} color="#EF4444" />} color="#EF4444" onDelete={() => setPapers((prev) => prev.filter((x) => x.id !== p.id))} />
              ))}
            </div>
          )}

          {/* Notes */}
          <SectionHeader icon={<BookOpen size={16} color="#34D399" />} title="Notes Repository" color="#34D399" />
          <div style={{ background: 'rgba(52,211,153,0.02)', border: '1px solid rgba(52,211,153,0.1)', borderRadius: '12px', padding: '14px', marginBottom: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
              <input type="text" value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} placeholder="Note title" style={inputStyle} />
              <input type="text" value={noteSubject} onChange={(e) => setNoteSubject(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addNote()} placeholder="Subject" style={inputStyle} />
              <button onClick={addNote} disabled={!noteTitle.trim()} style={{
                ...addBtnStyle,
                background: noteTitle.trim() ? 'rgba(52,211,153,0.08)' : 'rgba(255,255,255,0.03)',
                color: noteTitle.trim() ? '#34D399' : 'rgba(255,255,255,0.2)',
                border: `1px solid ${noteTitle.trim() ? 'rgba(52,211,153,0.3)' : 'rgba(255,255,255,0.06)'}`,
              }}><Plus size={13} /> Add Note</button>
            </div>
          </div>
          {notes.length === 0 ? (
            <p style={{ fontSize: '13px', color: 'rgba(0,240,255,0.2)', textAlign: 'center', padding: '16px' }}>No notes added yet.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
              {notes.map((n) => (
                <ResourceCard key={n.id} item={n} icon={<BookOpen size={15} color="#34D399" />} color="#34D399" onDelete={() => setNotes((prev) => prev.filter((x) => x.id !== n.id))} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Analytics ──────────────────────────────────────────── */}
      {activeTab === 'analytics' && (
        <div>
          <SectionHeader icon={<TrendingUp size={16} color="#00F0FF" />} title="Reading Analytics" color="#00F0FF" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '14px' }}>
            {[
              { label: 'Total borrowed', value: borrowedBooks.length, color: '#00F0FF', icon: <BookOpen size={18} color="#00F0FF" /> },
              { label: 'Notes saved', value: notes.length, color: '#34D399', icon: <BookOpen size={18} color="#34D399" /> },
              { label: 'Papers added', value: papers.length, color: '#EF4444', icon: <FileText size={18} color="#EF4444" /> },
              { label: 'Active resources', value: notes.length + papers.length, color: '#A78BFA', icon: <TrendingUp size={18} color="#A78BFA" /> },
            ].map(({ label, value, color, icon }) => (
              <div key={label} style={{ background: '#111116', border: `1px solid ${color}22`, borderRadius: '14px', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <p style={{ fontSize: '13px', color: `${color}66`, margin: 0 }}>{label}</p>
                  {icon}
                </div>
                <p style={{ fontSize: '36px', fontWeight: 800, color, margin: 0, textShadow: `0 0 14px ${color}` }}>{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Book Detail Modal ────────────────────────────────────────── */}
      {selectedBook && (
        <div onClick={() => setSelectedBook(null)} style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(9,9,11,0.85)', backdropFilter: 'blur(16px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: '#111116', border: '1px solid rgba(0,240,255,0.2)',
            borderRadius: '20px', maxWidth: '680px', width: '100%',
            overflow: 'hidden', maxHeight: '90vh', overflowY: 'auto',
            boxShadow: '0 0 60px rgba(0,240,255,0.1)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 22px', borderBottom: '1px solid rgba(0,240,255,0.08)' }}>
              <h2 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: '#00F0FF' }}>Book Details</h2>
              <button onClick={() => setSelectedBook(null)} style={{ padding: '7px', borderRadius: '7px', border: '1px solid rgba(0,240,255,0.15)', background: 'rgba(0,240,255,0.05)', color: 'rgba(0,240,255,0.5)', cursor: 'pointer', display: 'flex' }}>
                <X size={15} />
              </button>
            </div>
            <div style={{ padding: '22px', display: 'flex', gap: '22px', flexWrap: 'wrap' }}>
              <img
                src={selectedBook.cover_i ? `https://covers.openlibrary.org/b/id/${selectedBook.cover_i}-L.jpg` : PLACEHOLDER}
                alt={selectedBook.title}
                style={{ width: '140px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0, boxShadow: '0 0 24px rgba(0,240,255,0.12)', border: '1px solid rgba(0,240,255,0.15)' }}
                onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER; }}
              />
              <div style={{ flex: 1, minWidth: '200px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 5px', lineHeight: 1.3, color: '#F0F2F5' }}>{selectedBook.title}</h3>
                <p style={{ fontSize: '13px', color: 'rgba(0,240,255,0.45)', margin: '0 0 3px' }}>{selectedBook.author_name?.join(', ') || 'Unknown Author'}</p>
                {selectedBook.first_publish_year && (
                  <p style={{ fontSize: '11px', color: 'rgba(0,240,255,0.25)', margin: '0 0 14px' }}>First published {selectedBook.first_publish_year}</p>
                )}
                {selectedBook.subject && selectedBook.subject.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '18px' }}>
                    {selectedBook.subject.slice(0, 5).map((s) => (
                      <span key={s} style={{ fontSize: '11px', padding: '3px 9px', borderRadius: '20px', background: 'rgba(0,240,255,0.06)', color: 'rgba(0,240,255,0.55)', border: '1px solid rgba(0,240,255,0.12)' }}>{s}</span>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => { borrowBook(selectedBook); setSelectedBook(null); }}
                  disabled={borrowedBooks.some((b) => b.id === selectedBook.key)}
                  style={{
                    width: '100%', padding: '11px', borderRadius: '10px',
                    border: '1px solid rgba(52,211,153,0.2)', background: 'rgba(52,211,153,0.06)',
                    color: borrowedBooks.some((b) => b.id === selectedBook.key) ? 'rgba(52,211,153,0.3)' : '#34D399',
                    fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                    opacity: borrowedBooks.some((b) => b.id === selectedBook.key) ? 0.5 : 1,
                    boxShadow: borrowedBooks.some((b) => b.id === selectedBook.key) ? 'none' : '0 0 12px rgba(52,211,153,0.1)',
                  }}
                >
                  {borrowedBooks.some((b) => b.id === selectedBook.key) ? '✓ Already Borrowed' : 'Borrow This Book'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Floating AI Librarian Bot ────────────────────────────────── */}
      {/* Toggle button */}
      <button
        onClick={() => setBotOpen((o) => !o)}
        style={{
          position: 'fixed', bottom: '24px', right: '24px', zIndex: 150,
          width: '52px', height: '52px', borderRadius: '50%',
          background: botOpen ? 'rgba(167,139,250,0.2)' : 'rgba(167,139,250,0.12)',
          border: `1px solid ${botOpen ? 'rgba(167,139,250,0.6)' : 'rgba(167,139,250,0.4)'}`,
          boxShadow: `0 0 20px rgba(167,139,250,${botOpen ? '0.4' : '0.2'})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', transition: 'all 0.2s',
        }}
        title="AI Librarian"
      >
        {botOpen ? <X size={20} color="#A78BFA" /> : <MessageCircle size={20} color="#A78BFA" />}
      </button>

      {/* Bot panel */}
      {botOpen && (
        <div style={{
          position: 'fixed', bottom: '86px', right: '24px', zIndex: 150,
          width: '380px', maxWidth: 'calc(100vw - 48px)',
          background: '#111116', border: '1px solid rgba(167,139,250,0.25)',
          borderRadius: '18px', overflow: 'hidden',
          boxShadow: '0 0 40px rgba(167,139,250,0.15), 0 20px 60px rgba(0,0,0,0.5)',
        }}>
          {/* Header */}
          <div style={{
            padding: '14px 16px', borderBottom: '1px solid rgba(167,139,250,0.1)',
            background: 'rgba(167,139,250,0.04)',
            display: 'flex', alignItems: 'center', gap: '10px',
          }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%',
              background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.4)',
              boxShadow: '0 0 10px rgba(167,139,250,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Brain size={15} color="#A78BFA" />
            </div>
            <div>
              <p style={{ fontSize: '13px', fontWeight: 700, margin: 0, color: '#A78BFA' }}>AI Librarian</p>
              <p style={{ fontSize: '10px', color: 'rgba(167,139,250,0.4)', margin: 0 }}>Book recommendations only</p>
            </div>
            <div style={{ marginLeft: 'auto', width: '8px', height: '8px', borderRadius: '50%', background: '#34D399', boxShadow: '0 0 6px rgba(52,211,153,0.8)' }} />
          </div>

          {/* Messages */}
          <div style={{ height: '340px', overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {botMessages.map((msg, i) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: '7px' }}>
                  {msg.role === 'assistant' && (
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Brain size={11} color="#A78BFA" />
                    </div>
                  )}
                  <div style={{
                    maxWidth: '82%', padding: '10px 13px',
                    borderRadius: msg.role === 'user' ? '14px 14px 3px 14px' : '14px 14px 14px 3px',
                    background: msg.role === 'user' ? 'rgba(0,240,255,0.08)' : 'rgba(167,139,250,0.06)',
                    border: msg.role === 'user' ? '1px solid rgba(0,240,255,0.18)' : '1px solid rgba(167,139,250,0.12)',
                    fontSize: '12px', lineHeight: 1.6, color: '#F0F2F5', whiteSpace: 'pre-wrap',
                  }}>
                    {msg.content}
                  </div>
                </div>

                {/* Book cards from recommendation */}
                {msg.books && msg.books.length > 0 && (
                  <div style={{ marginTop: '10px', marginLeft: '31px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {msg.books.map((book) => {
                      const isBorrowed = borrowedBooks.some((b) => b.id === book.key);
                      const cover = book.cover_i ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg` : PLACEHOLDER;
                      return (
                        <div key={book.key} style={{
                          display: 'flex', gap: '10px',
                          background: '#16161D', border: '1px solid rgba(167,139,250,0.12)',
                          borderRadius: '10px', padding: '10px', alignItems: 'center',
                          transition: 'border-color 0.15s',
                        }}>
                          <img src={cover} alt={book.title}
                            style={{ width: '36px', height: '50px', borderRadius: '5px', objectFit: 'cover', flexShrink: 0, border: '1px solid rgba(167,139,250,0.15)' }}
                            onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER; }}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <h4 style={{ fontSize: '11px', fontWeight: 600, margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#F0F2F5' }}>{book.title}</h4>
                            <p style={{ fontSize: '10px', color: 'rgba(167,139,250,0.4)', margin: '0 0 5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{book.author_name?.join(', ') || 'Unknown'}</p>
                            <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                              <span style={{
                                fontSize: '9px', fontWeight: 700, padding: '2px 6px', borderRadius: '20px',
                                background: isBorrowed ? 'rgba(251,191,36,0.12)' : 'rgba(52,211,153,0.12)',
                                color: isBorrowed ? '#FBBF24' : '#34D399',
                                border: `1px solid ${isBorrowed ? 'rgba(251,191,36,0.3)' : 'rgba(52,211,153,0.3)'}`,
                              }}>{isBorrowed ? 'Borrowed' : 'Available'}</span>
                              {!isBorrowed && (
                                <button
                                  onClick={() => borrowBook(book)}
                                  style={{
                                    fontSize: '9px', fontWeight: 600, padding: '2px 8px', borderRadius: '20px',
                                    background: 'rgba(0,240,255,0.08)', color: '#00F0FF',
                                    border: '1px solid rgba(0,240,255,0.25)', cursor: 'pointer',
                                  }}
                                >Borrow</button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}

            {botLoading && (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '7px' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Brain size={11} color="#A78BFA" />
                </div>
                <div style={{ padding: '10px 14px', borderRadius: '14px 14px 14px 3px', background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.12)', display: 'flex', gap: '4px', alignItems: 'center' }}>
                  {[0, 120, 240].map((d) => (
                    <span key={d} style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#A78BFA', display: 'inline-block', animation: 'bounce 1.2s ease-in-out infinite', animationDelay: `${d}ms` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={botEndRef} />
          </div>

          {/* Quick prompts */}
          <div style={{ padding: '8px 12px', borderTop: '1px solid rgba(167,139,250,0.07)', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {['Machine learning books', 'Python for beginners', 'Data structures', 'OS concepts'].map((p) => (
              <button key={p} onClick={() => setBotInput(p)} style={{
                fontSize: '10px', padding: '4px 10px', borderRadius: '20px',
                background: 'rgba(167,139,250,0.05)', border: '1px solid rgba(167,139,250,0.12)',
                color: 'rgba(167,139,250,0.55)', cursor: 'pointer', transition: 'all 0.15s',
              }}>{p}</button>
            ))}
          </div>

          {/* Input */}
          <div style={{ padding: '10px 12px', borderTop: '1px solid rgba(167,139,250,0.07)', display: 'flex', gap: '8px' }}>
            <input
              value={botInput}
              onChange={(e) => setBotInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendBotMessage()}
              placeholder="Ask for book recommendations…"
              disabled={botLoading}
              style={{
                flex: 1, background: 'rgba(167,139,250,0.04)', border: '1px solid rgba(167,139,250,0.15)',
                borderRadius: '9px', padding: '10px 12px', fontSize: '12px', color: '#F0F2F5',
                outline: 'none', caretColor: '#A78BFA', opacity: botLoading ? 0.5 : 1,
              }}
            />
            <button
              onClick={sendBotMessage}
              disabled={botLoading || !botInput.trim()}
              style={{
                padding: '10px 14px', borderRadius: '9px',
                border: `1px solid ${(!botLoading && botInput.trim()) ? 'rgba(167,139,250,0.35)' : 'rgba(167,139,250,0.1)'}`,
                background: (!botLoading && botInput.trim()) ? 'rgba(167,139,250,0.12)' : 'rgba(167,139,250,0.04)',
                color: (!botLoading && botInput.trim()) ? '#A78BFA' : 'rgba(167,139,250,0.25)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.15s',
                boxShadow: (!botLoading && botInput.trim()) ? '0 0 12px rgba(167,139,250,0.2)' : 'none',
              }}
            >
              <Send size={13} />
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes bounce { 0%,80%,100%{transform:scale(0.8);opacity:0.5} 40%{transform:scale(1.2);opacity:1} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        input::placeholder { color: rgba(0,240,255,0.2) !important; }
        input:focus { outline: none; }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(0,240,255,0.12); border-radius: 2px; }
      `}</style>
    </div>
  );
}

// ─── Shared Styles ────────────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  background: 'rgba(0,240,255,0.03)', border: '1px solid rgba(0,240,255,0.1)',
  borderRadius: '9px', padding: '9px 12px', fontSize: '13px', color: '#F0F2F5',
  outline: 'none', width: '100%',
};

const addBtnStyle: React.CSSProperties = {
  padding: '9px 14px', borderRadius: '9px', cursor: 'pointer',
  fontSize: '12px', fontWeight: 600,
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
  transition: 'all 0.15s',
};

// ─── Helper Components ────────────────────────────────────────────────────────

function SectionHeader({ icon, title, color }: { icon: React.ReactNode; title: string; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '14px' }}>
      <div style={{
        width: '30px', height: '30px', borderRadius: '8px',
        background: `${color}12`, border: `1px solid ${color}20`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>{icon}</div>
      <h2 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: '#F0F2F5' }}>{title}</h2>
    </div>
  );
}

function BookGrid({
  books, borrowedBooks, onBorrow, onViewDetails,
}: {
  books: OpenLibraryBook[];
  borrowedBooks: BorrowedBook[];
  onBorrow: (b: OpenLibraryBook) => void;
  onViewDetails: (b: OpenLibraryBook) => void;
}) {
  const PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='440' viewBox='0 0 300 440'%3E%3Crect width='300' height='440' fill='%23111116'/%3E%3Ctext x='150' y='230' text-anchor='middle' fill='%2300f0ff33' font-size='13' font-family='sans-serif'%3ENo Cover%3C/text%3E%3C/svg%3E";
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))', gap: '14px' }}>
      {books.map((book) => {
        const isBorrowed = borrowedBooks.some((b) => b.id === book.key);
        const cover = book.cover_i ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg` : PLACEHOLDER;
        return (
          <div key={book.key} style={{
            borderRadius: '12px', overflow: 'hidden',
            background: '#111116', border: '1px solid rgba(0,240,255,0.09)',
            display: 'flex', flexDirection: 'column', transition: 'all 0.2s',
          }}
            onMouseEnter={(e) => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = 'rgba(0,240,255,0.4)'; el.style.transform = 'translateY(-3px)'; el.style.boxShadow = '0 0 20px rgba(0,240,255,0.1)'; }}
            onMouseLeave={(e) => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = 'rgba(0,240,255,0.09)'; el.style.transform = 'translateY(0)'; el.style.boxShadow = 'none'; }}
          >
            <div style={{ position: 'relative' }}>
              <img src={cover} alt={book.title} style={{ width: '100%', height: '200px', objectFit: 'cover', background: '#111116', display: 'block' }}
                onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER; }} />
              <div style={{
                position: 'absolute', top: '8px', right: '8px',
                background: isBorrowed ? 'rgba(251,191,36,0.15)' : 'rgba(52,211,153,0.15)',
                color: isBorrowed ? '#FBBF24' : '#34D399',
                fontSize: '9px', fontWeight: 700, padding: '3px 7px', borderRadius: '20px',
                border: `1px solid ${isBorrowed ? 'rgba(251,191,36,0.4)' : 'rgba(52,211,153,0.4)'}`,
                backdropFilter: 'blur(8px)',
              }}>{isBorrowed ? 'Borrowed' : 'Available'}</div>
            </div>
            <div style={{ padding: '12px', flex: 1, display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: '12px', fontWeight: 600, margin: '0 0 3px', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', color: '#F0F2F5' }}>{book.title}</h3>
              <p style={{ fontSize: '10px', color: 'rgba(0,240,255,0.35)', margin: '0 0 10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{book.author_name?.join(', ') || 'Unknown Author'}</p>
              <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <button onClick={() => onViewDetails(book)} style={{
                  padding: '7px', borderRadius: '7px', border: '1px solid rgba(0,240,255,0.14)',
                  background: 'rgba(0,240,255,0.04)', color: 'rgba(0,240,255,0.65)',
                  fontSize: '11px', fontWeight: 500, cursor: 'pointer',
                }}>View Details</button>
                {!isBorrowed && (
                  <button onClick={() => onBorrow(book)} style={{
                    padding: '7px', borderRadius: '7px',
                    border: '1px solid rgba(0,240,255,0.28)', background: 'rgba(0,240,255,0.08)',
                    color: '#00F0FF', fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                    boxShadow: '0 0 10px rgba(0,240,255,0.08)',
                  }}>Borrow</button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))', gap: '14px' }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} style={{ borderRadius: '12px', overflow: 'hidden', background: 'rgba(0,240,255,0.02)', border: '1px solid rgba(0,240,255,0.06)' }}>
          <div style={{ height: '200px', background: 'rgba(0,240,255,0.04)', animation: 'pulse 1.5s ease-in-out infinite' }} />
          <div style={{ padding: '12px' }}>
            <div style={{ height: '12px', background: 'rgba(0,240,255,0.06)', borderRadius: '3px', marginBottom: '7px', width: '75%' }} />
            <div style={{ height: '10px', background: 'rgba(0,240,255,0.03)', borderRadius: '3px', width: '55%' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div style={{ background: 'rgba(0,240,255,0.01)', border: '1px dashed rgba(0,240,255,0.08)', borderRadius: '14px', padding: '44px 20px', textAlign: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>{icon}</div>
      <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 5px', color: '#F0F2F5' }}>{title}</h3>
      <p style={{ fontSize: '12px', color: 'rgba(0,240,255,0.22)', margin: 0, maxWidth: '280px', marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>{description}</p>
    </div>
  );
}

function ResourceCard({ item, icon, color, onDelete }: { item: ResourceItem; icon: React.ReactNode; color: string; onDelete: () => void }) {
  return (
    <div style={{ background: '#111116', border: `1px solid ${color}18`, borderRadius: '10px', padding: '12px', display: 'flex', gap: '9px', alignItems: 'flex-start' }}
      onMouseEnter={(e) => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = `${color}30`; }}
      onMouseLeave={(e) => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = `${color}18`; }}
    >
      <div style={{ width: '30px', height: '30px', borderRadius: '7px', background: `${color}0f`, border: `1px solid ${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h4 style={{ fontSize: '12px', fontWeight: 600, margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#F0F2F5' }}>{item.title}</h4>
        <p style={{ fontSize: '10px', color: `${color}55`, margin: 0 }}>{item.subject}</p>
        <p style={{ fontSize: '9px', color: 'rgba(0,240,255,0.15)', margin: '2px 0 0' }}>Added {item.uploadedAt}</p>
      </div>
      <button onClick={onDelete} style={{ padding: '4px', borderRadius: '5px', border: 'none', background: 'transparent', color: 'rgba(0,240,255,0.2)', cursor: 'pointer' }}
        onMouseEnter={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.background = 'rgba(239,68,68,0.1)'; b.style.color = '#EF4444'; }}
        onMouseLeave={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.background = 'transparent'; b.style.color = 'rgba(0,240,255,0.2)'; }}
      ><Trash2 size={12} /></button>
    </div>
  );
}