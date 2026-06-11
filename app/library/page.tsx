'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Search, BookOpen, Sparkles, Calendar, Clock, Brain,
  FileText, Upload, MessageCircle, Star, X, Bell,
  TrendingUp, RotateCcw, Trash2, BookMarked, Send,
  ChevronRight, AlertCircle, CheckCircle2, Plus,
  Library, Zap, GraduationCap,
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
};

type ResourceItem = {
  id: string;
  title: string;
  subject: string;
  uploadedAt: string;
};

// ─── AI ──────────────────────────────────────────────────────────────────────

async function callGemini(prompt: string): Promise<string> {
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

// ─── Placeholder ─────────────────────────────────────────────────────────────

const PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='440' viewBox='0 0 300 440'%3E%3Crect width='300' height='440' fill='%231a1a2e'/%3E%3Crect x='110' y='160' width='80' height='100' rx='6' fill='%2316213e'/%3E%3Ctext x='150' y='300' text-anchor='middle' fill='%234a4a6a' font-size='13' font-family='sans-serif'%3ENo Cover%3C/text%3E%3C/svg%3E";

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SmartLibraryPage() {
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
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([{
    role: 'assistant',
    content: "Hello! I'm your Smart Library AI. Ask me for book recommendations, summaries, study tips, or any academic help.",
  }]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [activeSection, setActiveSection] = useState('search');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatSectionRef = useRef<HTMLDivElement>(null);

  // ── Persist ──────────────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const b = localStorage.getItem('sl_borrowedBooks');
      const n = localStorage.getItem('sl_notes');
      const p = localStorage.getItem('sl_papers');
      if (b) setBorrowedBooks(JSON.parse(b));
      if (n) setNotes(JSON.parse(n));
      if (p) setPapers(JSON.parse(p));
    } catch (_) {}
  }, []);

  useEffect(() => { localStorage.setItem('sl_borrowedBooks', JSON.stringify(borrowedBooks)); }, [borrowedBooks]);
  useEffect(() => { localStorage.setItem('sl_notes', JSON.stringify(notes)); }, [notes]);
  useEffect(() => { localStorage.setItem('sl_papers', JSON.stringify(papers)); }, [papers]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

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
  const searchBooks = async () => {
    if (!query.trim()) return;
    setLoadingBooks(true);
    setBooks([]);
    try {
      const res = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=20`);
      const data = await res.json();
      setBooks(data.docs?.slice(0, 20) ?? []);
    } catch {
      setBooks([]);
    } finally {
      setLoadingBooks(false);
    }
  };

  // ── Borrow / Return ──────────────────────────────────────────────────────
  const borrowBook = (book: OpenLibraryBook) => {
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
  };

  const returnBook = (id: string) => setBorrowedBooks((prev) => prev.filter((b) => b.id !== id));

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

  const deletePaper = (id: string) => setPapers((prev) => prev.filter((p) => p.id !== id));
  const deleteNote = (id: string) => setNotes((prev) => prev.filter((n) => n.id !== id));

  // ── AI Chat ──────────────────────────────────────────────────────────────
  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = chatInput.trim();
    setChatMessages((prev) => [...prev, { role: 'user', content: userMsg }]);
    setChatInput('');
    setChatLoading(true);
    const reply = await callGemini(
      `You are a Smart Library AI assistant for university students in India. Be helpful, concise, and friendly.\n\nStudent question: ${userMsg}\n\nProvide a clear helpful answer under 200 words. Suggest books or study resources when relevant.`
    );
    setChatMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    setChatLoading(false);
  };

  const summarizeBook = async (book: OpenLibraryBook) => {
    setSelectedBook(null);
    setTimeout(() => chatSectionRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    setChatMessages((prev) => [...prev, {
      role: 'user',
      content: `Give me an AI summary of "${book.title}" by ${book.author_name?.join(', ') || 'Unknown'}`,
    }]);
    setChatLoading(true);
    const summary = await callGemini(
      `Summarize this book for a university student.\n\nTitle: ${book.title}\nAuthor: ${book.author_name?.join(', ') || 'Unknown'}\n\nProvide:\n1. Short overview (2-3 sentences)\n2. Key topics covered\n3. Who should read it\n4. Difficulty level`
    );
    setChatMessages((prev) => [...prev, { role: 'assistant', content: summary }]);
    setChatLoading(false);
  };

  const recommendBooks = async (book: OpenLibraryBook) => {
    setSelectedBook(null);
    setTimeout(() => chatSectionRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    setChatMessages((prev) => [...prev, {
      role: 'user',
      content: `Recommend 5 books similar to "${book.title}"`,
    }]);
    setChatLoading(true);
    const recs = await callGemini(
      `Recommend 5 books similar to "${book.title}" for university students in India. For each, give title, author, and a one-sentence reason. Format clearly.`
    );
    setChatMessages((prev) => [...prev, { role: 'assistant', content: recs }]);
    setChatLoading(false);
  };

  const navItems = [
    { id: 'search', label: 'Discover', icon: Search },
    { id: 'borrowed', label: 'My Books', icon: BookMarked },
    { id: 'resources', label: 'Resources', icon: FileText },
    { id: 'ai', label: 'AI Chat', icon: Brain },
  ];

  const scrollTo = (id: string) => {
    setActiveSection(id);
    setSidebarOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{
      background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
      fontFamily: "'Inter', system-ui, sans-serif",
      color: '#e8e6f0',
    }}>

      {/* Sidebar overlay (mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside style={{
        position: 'fixed', top: 0, left: 0, height: '100vh', width: '240px', zIndex: 50,
        background: 'rgba(15, 12, 41, 0.95)',
        borderRight: '1px solid rgba(255,255,255,0.07)',
        backdropFilter: 'blur(20px)',
        display: 'flex', flexDirection: 'column',
        transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.3s ease',
      }} className="md:translate-x-0">
        {/* Logo */}
        <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '38px', height: '38px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Library size={18} color="white" />
            </div>
            <div>
              <p style={{ fontWeight: 700, fontSize: '15px', margin: 0, letterSpacing: '-0.3px' }}>SmartLib</p>
              <p style={{ fontSize: '11px', color: '#6b6b8a', margin: 0 }}>AI Campus Library</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ padding: '16px 12px', flex: 1 }}>
          <p style={{ fontSize: '10px', fontWeight: 600, color: '#4a4a6a', letterSpacing: '1px', textTransform: 'uppercase', padding: '0 8px', marginBottom: '8px' }}>Navigation</p>
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => scrollTo(id)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                background: activeSection === id ? 'rgba(124, 58, 237, 0.2)' : 'transparent',
                color: activeSection === id ? '#a78bfa' : '#8585a8',
                fontSize: '14px', fontWeight: activeSection === id ? 600 : 400,
                transition: 'all 0.15s', textAlign: 'left',
                marginBottom: '2px',
              }}
            >
              <Icon size={16} />
              {label}
              {activeSection === id && <ChevronRight size={14} style={{ marginLeft: 'auto' }} />}
            </button>
          ))}

          <div style={{ marginTop: '24px' }}>
            <p style={{ fontSize: '10px', fontWeight: 600, color: '#4a4a6a', letterSpacing: '1px', textTransform: 'uppercase', padding: '0 8px', marginBottom: '8px' }}>Library</p>
            {[
              { id: 'tracker', label: 'Due Dates', icon: Clock },
              { id: 'analytics', label: 'Analytics', icon: TrendingUp },
              { id: 'faculty', label: 'Faculty Picks', icon: Star },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '10px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                  background: 'transparent', color: '#8585a8',
                  fontSize: '14px', transition: 'all 0.15s', textAlign: 'left',
                  marginBottom: '2px',
                }}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </div>
        </nav>

        {/* Stats sidebar footer */}
        {stats.overdue > 0 && (
          <div style={{
            margin: '0 12px 16px', padding: '12px',
            background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px',
            border: '1px solid rgba(239, 68, 68, 0.2)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={14} color="#f87171" />
              <span style={{ fontSize: '12px', color: '#f87171', fontWeight: 600 }}>{stats.overdue} book{stats.overdue > 1 ? 's' : ''} overdue</span>
            </div>
          </div>
        )}
      </aside>

      {/* Main layout */}
      <div style={{ marginLeft: '0', paddingLeft: '0' }} className="md:ml-60">

        {/* Top bar */}
        <header style={{
          position: 'sticky', top: 0, zIndex: 30,
          background: 'rgba(15, 12, 41, 0.85)', backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          padding: '0 24px', height: '60px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <button
            onClick={() => setSidebarOpen(true)}
            style={{ background: 'none', border: 'none', color: '#8585a8', cursor: 'pointer', padding: '8px', borderRadius: '6px' }}
            className="md:hidden"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
          <div className="hidden md:flex" style={{ alignItems: 'center', gap: '6px' }}>
            <GraduationCap size={16} color="#7c3aed" />
            <span style={{ fontSize: '13px', color: '#8585a8' }}>Smart Library System</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
            {stats.overdue > 0 && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: '20px', padding: '5px 12px',
              }}>
                <Bell size={12} color="#f87171" />
                <span style={{ fontSize: '12px', color: '#f87171', fontWeight: 600 }}>{stats.overdue} overdue</span>
              </div>
            )}
            <div style={{
              width: '34px', height: '34px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '13px', fontWeight: 700, color: 'white',
            }}>S</div>
          </div>
        </header>

        <main style={{ padding: '32px 24px 80px', maxWidth: '1100px', margin: '0 auto' }}>

          {/* Hero */}
          <section style={{ marginBottom: '40px' }}>
            <div style={{
              background: 'linear-gradient(135deg, rgba(124,58,237,0.15) 0%, rgba(79,70,229,0.1) 100%)',
              border: '1px solid rgba(124,58,237,0.2)',
              borderRadius: '20px', padding: '32px',
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute', right: '-60px', top: '-60px',
                width: '250px', height: '250px', borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(124,58,237,0.2) 0%, transparent 70%)',
              }} />
              <p style={{ fontSize: '12px', fontWeight: 600, color: '#7c3aed', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '8px' }}>Welcome back</p>
              <h1 style={{ fontSize: '28px', fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.5px' }}>
                Your Academic <span style={{ color: '#a78bfa' }}>Library</span>
              </h1>
              <p style={{ fontSize: '14px', color: '#8585a8', margin: 0 }}>Search, borrow, track and study smarter with AI.</p>

              {/* Stat pills */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '24px' }}>
                {[
                  { label: 'Borrowed', value: stats.borrowed, color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
                  { label: 'Due Soon', value: stats.dueSoon, color: '#fbbf24', bg: 'rgba(251,191,36,0.1)' },
                  { label: 'Overdue', value: stats.overdue, color: '#f87171', bg: 'rgba(248,113,113,0.1)' },
                  { label: 'Resources', value: stats.resources, color: '#34d399', bg: 'rgba(52,211,153,0.1)' },
                ].map(({ label, value, color, bg }) => (
                  <div key={label} style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    background: bg, borderRadius: '30px', padding: '8px 16px',
                    border: `1px solid ${color}22`,
                  }}>
                    <span style={{ fontSize: '18px', fontWeight: 800, color }}>{value}</span>
                    <span style={{ fontSize: '12px', color: '#8585a8' }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Search */}
          <Section id="search" icon={<Search size={18} color="#a78bfa" />} title="Discover Books" color="#7c3aed">
            <div style={{ marginBottom: '20px' }}>
              <div style={{
                display: 'flex', gap: '10px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '14px', padding: '8px',
              }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search size={16} color="#6b6b8a" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && searchBooks()}
                    placeholder="Search by title, author, or subject…"
                    style={{
                      width: '100%', background: 'transparent',
                      border: 'none', outline: 'none', padding: '12px 16px 12px 40px',
                      fontSize: '14px', color: '#e8e6f0',
                      caretColor: '#a78bfa',
                    }}
                  />
                </div>
                <button
                  onClick={searchBooks}
                  disabled={loadingBooks}
                  style={{
                    padding: '12px 24px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                    background: loadingBooks ? 'rgba(124,58,237,0.4)' : 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                    color: 'white', fontSize: '13px', fontWeight: 600,
                    transition: 'all 0.15s', whiteSpace: 'nowrap',
                  }}
                >
                  {loadingBooks ? 'Searching…' : 'Search'}
                </button>
              </div>
            </div>

            {loadingBooks ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px' }}>
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} style={{ borderRadius: '14px', overflow: 'hidden', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ height: '220px', background: 'rgba(255,255,255,0.05)', animation: 'pulse 1.5s ease-in-out infinite' }} />
                    <div style={{ padding: '14px' }}>
                      <div style={{ height: '14px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', marginBottom: '8px', width: '70%' }} />
                      <div style={{ height: '11px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', width: '50%' }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : books.length === 0 ? (
              <EmptyState
                icon={<BookOpen size={36} color="#4a4a6a" />}
                title="Search your library"
                description="Type a title, author, or subject to find books from the Open Library catalogue."
              />
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px' }}>
                {books.map((book) => {
                  const isBorrowed = borrowedBooks.some((b) => b.id === book.key);
                  const cover = book.cover_i
                    ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg`
                    : PLACEHOLDER;
                  return (
                    <div
                      key={book.key}
                      style={{
                        borderRadius: '14px', overflow: 'hidden',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.07)',
                        transition: 'all 0.2s',
                        display: 'flex', flexDirection: 'column',
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(124,58,237,0.5)';
                        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.07)';
                        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                      }}
                    >
                      <div style={{ position: 'relative' }}>
                        <img
                          src={cover}
                          alt={book.title}
                          style={{ width: '100%', height: '210px', objectFit: 'cover', background: '#1a1a2e', display: 'block' }}
                          onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER; }}
                        />
                        <div style={{
                          position: 'absolute', top: '10px', right: '10px',
                          background: isBorrowed ? 'rgba(251,191,36,0.9)' : 'rgba(52,211,153,0.9)',
                          color: isBorrowed ? '#78350f' : '#064e3b',
                          fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '20px',
                        }}>
                          {isBorrowed ? 'Borrowed' : 'Available'}
                        </div>
                      </div>
                      <div style={{ padding: '14px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <h3 style={{ fontSize: '13px', fontWeight: 600, margin: '0 0 4px', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{book.title}</h3>
                        <p style={{ fontSize: '11px', color: '#6b6b8a', margin: '0 0 12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {book.author_name?.join(', ') || 'Unknown Author'}
                        </p>
                        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <button
                            onClick={() => setSelectedBook(book)}
                            style={{
                              padding: '8px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)',
                              background: 'rgba(255,255,255,0.04)', color: '#c4c4d4',
                              fontSize: '12px', fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s',
                            }}
                          >View Details</button>
                          {!isBorrowed && (
                            <button
                              onClick={() => borrowBook(book)}
                              style={{
                                padding: '8px', borderRadius: '8px', border: 'none',
                                background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                                color: 'white', fontSize: '12px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
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
          </Section>

          {/* Borrowed Books */}
          <Section id="borrowed" icon={<BookMarked size={18} color="#818cf8" />} title="My Borrowed Books" color="#4f46e5">
            {borrowedBooks.length === 0 ? (
              <EmptyState
                icon={<BookMarked size={36} color="#4a4a6a" />}
                title="No books borrowed yet"
                description="Search for a book and click Borrow to add it here."
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {borrowedBooks.map((book) => {
                  const today = new Date();
                  const due = new Date(book.dueDate);
                  const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                  const isOverdue = diff < 0;
                  const isDueSoon = !isOverdue && diff <= 3;
                  const statusColor = isOverdue ? '#f87171' : isDueSoon ? '#fbbf24' : '#34d399';
                  const statusBg = isOverdue ? 'rgba(248,113,113,0.1)' : isDueSoon ? 'rgba(251,191,36,0.1)' : 'rgba(52,211,153,0.1)';
                  return (
                    <div
                      key={book.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '16px',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.07)',
                        borderRadius: '14px', padding: '14px',
                      }}
                    >
                      <img
                        src={book.cover || PLACEHOLDER}
                        alt={book.title}
                        style={{ width: '44px', height: '60px', borderRadius: '6px', objectFit: 'cover', background: '#1a1a2e', flexShrink: 0 }}
                        onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER; }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{book.title}</h3>
                        <p style={{ fontSize: '12px', color: '#6b6b8a', margin: 0 }}>{book.author}</p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                        <span style={{
                          fontSize: '12px', fontWeight: 600, padding: '5px 12px', borderRadius: '20px',
                          background: statusBg, color: statusColor,
                        }}>
                          {isOverdue ? `Overdue ${Math.abs(diff)}d` : isDueSoon ? `Due in ${diff}d` : due.toLocaleDateString('en-IN')}
                        </span>
                        <button
                          onClick={() => returnBook(book.id)}
                          title="Return book"
                          style={{
                            padding: '8px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)',
                            background: 'rgba(255,255,255,0.03)', color: '#6b6b8a', cursor: 'pointer',
                            transition: 'all 0.15s', display: 'flex', alignItems: 'center',
                          }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(248,113,113,0.15)'; (e.currentTarget as HTMLButtonElement).style.color = '#f87171'; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.03)'; (e.currentTarget as HTMLButtonElement).style.color = '#6b6b8a'; }}
                        >
                          <RotateCcw size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Section>

          {/* Due Date Tracker */}
          <Section id="tracker" icon={<Clock size={18} color="#fbbf24" />} title="Due Date Tracker" color="#f59e0b">
            {borrowedBooks.length === 0 ? (
              <EmptyState
                icon={<Clock size={36} color="#4a4a6a" />}
                title="No active borrowings"
                description="Borrow books to track their due dates here."
              />
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
                {borrowedBooks.map((book) => {
                  const today = new Date();
                  const due = new Date(book.dueDate);
                  const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                  const progress = Math.max(0, Math.min(100, (diff / 14) * 100));
                  const color = diff < 0 ? '#f87171' : diff <= 3 ? '#fbbf24' : '#34d399';
                  return (
                    <div key={book.id} style={{
                      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                      borderRadius: '14px', padding: '16px',
                    }}>
                      <h3 style={{ fontSize: '13px', fontWeight: 600, margin: '0 0 6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{book.title}</h3>
                      <p style={{ fontSize: '11px', color: '#6b6b8a', margin: '0 0 12px' }}>
                        Due: {due.toLocaleDateString('en-IN')}
                      </p>
                      <div style={{ height: '4px', background: 'rgba(255,255,255,0.07)', borderRadius: '2px', marginBottom: '8px' }}>
                        <div style={{ height: '100%', width: `${progress}%`, background: color, borderRadius: '2px', transition: 'width 0.5s ease' }} />
                      </div>
                      <p style={{ fontSize: '12px', fontWeight: 600, color, margin: 0 }}>
                        {diff < 0 ? `Overdue by ${Math.abs(diff)} days` : diff === 0 ? 'Due today!' : `${diff} days remaining`}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </Section>

          {/* Resources */}
          <Section id="resources" icon={<FileText size={18} color="#f87171" />} title="Study Resources" color="#ef4444">
            {/* Papers */}
            <div style={{ marginBottom: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <div style={{ width: '3px', height: '18px', background: 'linear-gradient(#f87171, #fb923c)', borderRadius: '2px' }} />
                <h3 style={{ fontSize: '14px', fontWeight: 600, margin: 0 }}>Previous Year Papers</h3>
              </div>
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px',
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '14px', padding: '14px', marginBottom: '14px',
              }}>
                <input
                  type="text"
                  value={paperTitle}
                  onChange={(e) => setPaperTitle(e.target.value)}
                  placeholder="Paper title (e.g. OS 2023)"
                  style={inputStyle}
                />
                <input
                  type="text"
                  value={paperSubject}
                  onChange={(e) => setPaperSubject(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addPaper()}
                  placeholder="Subject"
                  style={inputStyle}
                />
                <button
                  onClick={addPaper}
                  disabled={!paperTitle.trim()}
                  style={{
                    ...addBtnStyle,
                    background: paperTitle.trim() ? 'linear-gradient(135deg, #ef4444, #f97316)' : 'rgba(255,255,255,0.05)',
                  }}
                >
                  <Plus size={14} /> Add Paper
                </button>
              </div>
              {papers.length === 0 ? (
                <p style={{ fontSize: '13px', color: '#4a4a6a', textAlign: 'center', padding: '16px' }}>No papers added yet.</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
                  {papers.map((paper) => (
                    <ResourceCard key={paper.id} item={paper} icon={<FileText size={16} color="#f87171" />} color="#f87171" onDelete={() => deletePaper(paper.id)} />
                  ))}
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <div style={{ width: '3px', height: '18px', background: 'linear-gradient(#34d399, #10b981)', borderRadius: '2px' }} />
                <h3 style={{ fontSize: '14px', fontWeight: 600, margin: 0 }}>Notes Repository</h3>
              </div>
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px',
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '14px', padding: '14px', marginBottom: '14px',
              }}>
                <input
                  type="text"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  placeholder="Note title"
                  style={inputStyle}
                />
                <input
                  type="text"
                  value={noteSubject}
                  onChange={(e) => setNoteSubject(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addNote()}
                  placeholder="Subject"
                  style={inputStyle}
                />
                <button
                  onClick={addNote}
                  disabled={!noteTitle.trim()}
                  style={{
                    ...addBtnStyle,
                    background: noteTitle.trim() ? 'linear-gradient(135deg, #059669, #10b981)' : 'rgba(255,255,255,0.05)',
                  }}
                >
                  <Plus size={14} /> Add Note
                </button>
              </div>
              {notes.length === 0 ? (
                <p style={{ fontSize: '13px', color: '#4a4a6a', textAlign: 'center', padding: '16px' }}>No notes added yet.</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
                  {notes.map((note) => (
                    <ResourceCard key={note.id} item={note} icon={<BookOpen size={16} color="#34d399" />} color="#34d399" onDelete={() => deleteNote(note.id)} />
                  ))}
                </div>
              )}
            </div>
          </Section>

          {/* Analytics */}
          <Section id="analytics" icon={<TrendingUp size={18} color="#38bdf8" />} title="Reading Analytics" color="#0ea5e9">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '14px' }}>
              {[
                { label: 'Total books borrowed', value: borrowedBooks.length, color: '#a78bfa', icon: <BookOpen size={18} color="#a78bfa" /> },
                { label: 'Notes saved', value: notes.length, color: '#34d399', icon: <BookOpen size={18} color="#34d399" /> },
                { label: 'Papers added', value: papers.length, color: '#f87171', icon: <FileText size={18} color="#f87171" /> },
                { label: 'Active resources', value: notes.length + papers.length, color: '#38bdf8', icon: <TrendingUp size={18} color="#38bdf8" /> },
              ].map(({ label, value, color, icon }) => (
                <div key={label} style={{
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: '14px', padding: '20px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <p style={{ fontSize: '13px', color: '#6b6b8a', margin: 0 }}>{label}</p>
                    {icon}
                  </div>
                  <p style={{ fontSize: '36px', fontWeight: 800, color, margin: 0 }}>{value}</p>
                </div>
              ))}
            </div>
          </Section>

          {/* Faculty Picks */}
          <Section id="faculty" icon={<Star size={18} color="#fbbf24" />} title="Faculty Picks" color="#f59e0b">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '14px' }}>
              {[
                { title: 'Introduction to Algorithms', author: 'Cormen, Leiserson, Rivest & Stein', tag: 'Computer Science', rank: '01' },
                { title: 'Computer Networks', author: 'Andrew S. Tanenbaum', tag: 'Networking', rank: '02' },
                { title: 'Database System Concepts', author: 'Silberschatz, Korth & Sudarshan', tag: 'Databases', rank: '03' },
              ].map((book) => (
                <div key={book.rank} style={{
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: '14px', padding: '20px',
                  display: 'flex', gap: '16px', alignItems: 'flex-start',
                }}>
                  <span style={{
                    fontSize: '22px', fontWeight: 800, color: 'rgba(251,191,36,0.25)',
                    fontVariantNumeric: 'tabular-nums', flexShrink: 0, lineHeight: 1,
                  }}>{book.rank}</span>
                  <div>
                    <span style={{
                      display: 'inline-block', fontSize: '10px', fontWeight: 600,
                      color: '#fbbf24', background: 'rgba(251,191,36,0.1)',
                      borderRadius: '20px', padding: '2px 8px', marginBottom: '6px',
                    }}>{book.tag}</span>
                    <h3 style={{ fontSize: '13px', fontWeight: 600, margin: '0 0 4px', lineHeight: 1.4 }}>{book.title}</h3>
                    <p style={{ fontSize: '11px', color: '#6b6b8a', margin: 0 }}>{book.author}</p>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* New Arrivals */}
          {books.length > 0 && (
            <Section id="arrivals" icon={<Sparkles size={18} color="#c084fc" />} title="New Arrivals" color="#9333ea">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
                {books.slice(0, 3).map((book) => (
                  <div key={book.key} style={{
                    background: 'rgba(192,132,252,0.05)', border: '1px solid rgba(192,132,252,0.15)',
                    borderRadius: '14px', padding: '18px',
                  }}>
                    <span style={{
                      display: 'inline-block', fontSize: '10px', fontWeight: 700,
                      background: 'rgba(192,132,252,0.15)', color: '#c084fc',
                      borderRadius: '20px', padding: '3px 10px', marginBottom: '10px',
                    }}>New</span>
                    <h3 style={{ fontSize: '13px', fontWeight: 600, margin: '0 0 4px', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{book.title}</h3>
                    <p style={{ fontSize: '11px', color: '#6b6b8a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {book.author_name?.join(', ') || 'Unknown Author'}
                    </p>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* AI Chat */}
          <Section id="ai" icon={<Brain size={18} color="#818cf8" />} title="AI Librarian" badge="Gemini 2.5 Flash" color="#6366f1" sectionRef={chatSectionRef}>
            <div style={{
              background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '16px', overflow: 'hidden',
            }}>
              {/* Messages */}
              <div style={{ height: '380px', overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {chatMessages.map((msg, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: '8px' }}>
                    {msg.role === 'assistant' && (
                      <div style={{
                        width: '28px', height: '28px', borderRadius: '50%',
                        background: 'rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <Brain size={13} color="#818cf8" />
                      </div>
                    )}
                    <div style={{
                      maxWidth: '75%', padding: '12px 16px', borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                      background: msg.role === 'user' ? 'linear-gradient(135deg, #7c3aed, #4f46e5)' : 'rgba(255,255,255,0.05)',
                      fontSize: '13px', lineHeight: 1.6, color: '#e8e6f0', whiteSpace: 'pre-wrap',
                    }}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Brain size={13} color="#818cf8" />
                    </div>
                    <div style={{ padding: '14px 18px', borderRadius: '18px 18px 18px 4px', background: 'rgba(255,255,255,0.05)', display: 'flex', gap: '5px', alignItems: 'center' }}>
                      {[0, 150, 300].map((delay) => (
                        <span key={delay} style={{
                          width: '7px', height: '7px', borderRadius: '50%', background: '#818cf8',
                          animation: 'bounce 1.2s ease-in-out infinite',
                          animationDelay: `${delay}ms`,
                        }} />
                      ))}
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Quick prompts */}
              <div style={{ padding: '12px 16px 8px', borderTop: '1px solid rgba(255,255,255,0.04)', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {['Suggest CS books for beginners', 'Study tips for exams', 'What is data structures?', 'Best books for competitive exams'].map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => setChatInput(prompt)}
                    style={{
                      fontSize: '11px', padding: '5px 12px', borderRadius: '20px',
                      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
                      color: '#8585a8', cursor: 'pointer', transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(2, 2, 6, 0.15)'; (e.currentTarget as HTMLButtonElement).style.color = '#818cf8'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'; (e.currentTarget as HTMLButtonElement).style.color = '#8585a8'; }}
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              {/* Input */}
              <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.04)', display: 'flex', gap: '10px' }}>
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendChat()}
                  placeholder="Ask about books, study tips, or get recommendations…"
                  disabled={chatLoading}
                  style={{
                    flex: 1, background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px',
                    padding: '12px 16px', fontSize: '13px', color: '#e8e6f0',
                    outline: 'none', transition: 'border-color 0.15s',
                    opacity: chatLoading ? 0.5 : 1,
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                />
                <button
                  onClick={sendChat}
                  disabled={chatLoading || !chatInput.trim()}
                  style={{
                    padding: '12px 20px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                    background: (chatLoading || !chatInput.trim()) ? 'rgba(99,102,241,0.3)' : 'linear-gradient(135deg, #6366f1, #4f46e5)',
                    color: 'white', fontSize: '13px', fontWeight: 600,
                    display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.15s',
                  }}
                >
                  <Send size={14} />
                  <span className="hidden sm:inline">Send</span>
                </button>
              </div>
            </div>
          </Section>

        </main>
      </div>

      {/* Book Detail Modal */}
      {selectedBook && (
        <div
          onClick={() => setSelectedBook(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 60,
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#141429', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '20px', maxWidth: '720px', width: '100%',
              overflow: 'hidden', maxHeight: '90vh', overflowY: 'auto',
            }}
          >
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)',
            }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Book Details</h2>
              <button
                onClick={() => setSelectedBook(null)}
                style={{
                  padding: '8px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)',
                  background: 'rgba(255,255,255,0.04)', color: '#8585a8', cursor: 'pointer',
                }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '24px' }} className="sm:grid-cols-none">
              <img
                src={selectedBook.cover_i ? `https://covers.openlibrary.org/b/id/${selectedBook.cover_i}-L.jpg` : PLACEHOLDER}
                alt={selectedBook.title}
                style={{ width: '160px', borderRadius: '12px', objectFit: 'cover', background: '#1a1a2e', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}
                onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER; }}
              />
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 6px', letterSpacing: '-0.3px', lineHeight: 1.3 }}>{selectedBook.title}</h3>
                <p style={{ fontSize: '14px', color: '#8585a8', margin: '0 0 4px' }}>{selectedBook.author_name?.join(', ') || 'Unknown Author'}</p>
                {selectedBook.first_publish_year && (
                  <p style={{ fontSize: '12px', color: '#4a4a6a', margin: '0 0 16px' }}>First published {selectedBook.first_publish_year}</p>
                )}
                {selectedBook.subject && selectedBook.subject.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '20px' }}>
                    {selectedBook.subject.slice(0, 6).map((s) => (
                      <span key={s} style={{
                        fontSize: '11px', padding: '3px 10px', borderRadius: '20px',
                        background: 'rgba(255,255,255,0.06)', color: '#c4c4d4',
                      }}>{s}</span>
                    ))}
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                  <button
                    onClick={() => summarizeBook(selectedBook)}
                    style={{
                      padding: '11px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                      background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                      color: 'white', fontSize: '13px', fontWeight: 600,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    }}
                  >
                    <Sparkles size={14} /> AI Summary
                  </button>
                  <button
                    onClick={() => recommendBooks(selectedBook)}
                    style={{
                      padding: '11px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                      background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                      color: 'white', fontSize: '13px', fontWeight: 600,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    }}
                  >
                    <Star size={14} /> Recommendations
                  </button>
                </div>
                <button
                  onClick={() => { borrowBook(selectedBook); setSelectedBook(null); }}
                  disabled={borrowedBooks.some((b) => b.id === selectedBook.key)}
                  style={{
                    width: '100%', padding: '11px', borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'rgba(255,255,255,0.04)', color: '#c4c4d4',
                    fontSize: '13px', fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s',
                    opacity: borrowedBooks.some((b) => b.id === selectedBook.key) ? 0.5 : 1,
                  }}
                >
                  {borrowedBooks.some((b) => b.id === selectedBook.key) ? '✓ Already Borrowed' : 'Borrow This Book'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
          40% { transform: scale(1.2); opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @media (min-width: 768px) {
          .md\\:translate-x-0 { transform: translateX(0) !important; }
          .md\\:ml-60 { margin-left: 240px !important; }
          .md\\:hidden { display: none !important; }
          .md\\:flex { display: flex !important; }
        }
        @media (min-width: 640px) {
          .sm\\:grid-cols-none { grid-template-columns: auto 1fr !important; }
          .sm\\:inline { display: inline !important; }
        }
        .hidden { display: none; }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
        input::placeholder { color: #4a4a6a; }
        input:focus { outline: none; }
      `}</style>
    </div>
  );
}

// ─── Shared styles ────────────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: '#e8e6f0',
  outline: 'none', width: '100%', transition: 'border-color 0.15s',
};

const addBtnStyle: React.CSSProperties = {
  padding: '10px 16px', borderRadius: '10px', border: 'none', cursor: 'pointer',
  color: 'white', fontSize: '13px', fontWeight: 600,
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
  transition: 'all 0.15s',
};

// ─── Helper Components ────────────────────────────────────────────────────────

function Section({
  id, icon, title, badge, color, children, sectionRef,
}: {
  id: string;
  icon: React.ReactNode;
  title: string;
  badge?: string;
  color: string;
  children: React.ReactNode;
  sectionRef?: React.RefObject<HTMLDivElement>;
}) {
  return (
    <section id={id} ref={sectionRef} style={{ marginBottom: '44px', scrollMarginTop: '80px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
        <div style={{
          width: '34px', height: '34px', borderRadius: '9px',
          background: `${color}20`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {icon}
        </div>
        <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0, letterSpacing: '-0.2px' }}>{title}</h2>
        {badge && (
          <span style={{
            fontSize: '10px', fontWeight: 700, letterSpacing: '0.5px',
            padding: '3px 8px', borderRadius: '20px',
            background: 'rgba(99,102,241,0.15)', color: '#818cf8',
          }}>{badge}</span>
        )}
      </div>
      {children}
    </section>
  );
}

function EmptyState({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)',
      borderRadius: '16px', padding: '48px 24px', textAlign: 'center',
    }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '14px' }}>{icon}</div>
      <h3 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 6px' }}>{title}</h3>
      <p style={{ fontSize: '13px', color: '#4a4a6a', margin: 0, maxWidth: '320px', marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>{description}</p>
    </div>
  );
}

function ResourceCard({ item, icon, color, onDelete }: { item: ResourceItem; icon: React.ReactNode; color: string; onDelete: () => void }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: '12px', padding: '14px',
      display: 'flex', gap: '10px', alignItems: 'flex-start',
      transition: 'border-color 0.15s',
    }}>
      <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h4 style={{ fontSize: '13px', fontWeight: 600, margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</h4>
        <p style={{ fontSize: '11px', color: '#6b6b8a', margin: 0 }}>{item.subject}</p>
        <p style={{ fontSize: '10px', color: '#3a3a5a', margin: '3px 0 0' }}>Added {item.uploadedAt}</p>
      </div>
      <button
        onClick={onDelete}
        style={{
          padding: '5px', borderRadius: '6px', border: 'none',
          background: 'transparent', color: '#6e6ef1ff', cursor: 'pointer',
          transition: 'all 0.15s', flexShrink: 0,
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(248,113,113,0.1)'; (e.currentTarget as HTMLButtonElement).style.color = '#f87171'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = '#3a3a5a'; }}
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}