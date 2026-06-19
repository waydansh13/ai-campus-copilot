'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
    Users, Plus, Search, ArrowLeft, Send, FileText,
    X, ChevronDown, Trash2, Circle, Video, Mic, MicOff,
    VideoOff, PhoneOff, Phone,
} from 'lucide-react';
import {
    LiveKitRoom,
    VideoConference,
    useLocalParticipant,
    useRoomContext,
    ControlBar,
    GridLayout,
    ParticipantTile,
    useTracks,
    RoomAudioRenderer,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import '@livekit/components-styles';

// ---------------------------------------------------------------------------
// Supabase client (browser-safe: only needs anon key + public URL)
// ---------------------------------------------------------------------------
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type Message = {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    userName?: string;
    timestamp: number;
};

type Room = {
    id: string;
    name: string;
    subject: string;
    description: string;
    color: string;
    createdAt: string;
    notes: string;
    messages: Message[];
    activeUsers: { id: string; name: string }[];
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const SUBJECTS = [
    'General', 'Mathematics', 'Physics', 'Chemistry',
    'Computer Science', 'Biology', 'Data Structures',
    'Machine Learning', 'Operating Systems', 'Algorithms',
];

const ROOM_COLORS = [
    { name: 'Blue', value: 'blue', from: 'from-blue-600', to: 'to-cyan-500', bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30', glow: '0 0 20px rgba(59,130,246,0.35)', neon: '#3b82f6', neonDim: 'rgba(59,130,246,0.15)' },
    { name: 'Purple', value: 'purple', from: 'from-purple-600', to: 'to-pink-500', bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30', glow: '0 0 20px rgba(168,85,247,0.35)', neon: '#a855f7', neonDim: 'rgba(168,85,247,0.15)' },
    { name: 'Green', value: 'green', from: 'from-emerald-600', to: 'to-teal-500', bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30', glow: '0 0 20px rgba(16,185,129,0.35)', neon: '#10b981', neonDim: 'rgba(16,185,129,0.15)' },
    { name: 'Orange', value: 'orange', from: 'from-orange-600', to: 'to-amber-500', bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30', glow: '0 0 20px rgba(249,115,22,0.35)', neon: '#f97316', neonDim: 'rgba(249,115,22,0.15)' },
    { name: 'Rose', value: 'rose', from: 'from-rose-600', to: 'to-red-500', bg: 'bg-rose-500/20', text: 'text-rose-400', border: 'border-rose-500/30', glow: '0 0 20px rgba(244,63,94,0.35)', neon: '#f43f5e', neonDim: 'rgba(244,63,94,0.15)' },
];

function getColorTheme(colorValue: string) {
    return ROOM_COLORS.find(c => c.value === colorValue) || ROOM_COLORS[0];
}

// ---------------------------------------------------------------------------
// Persistent user identity (localStorage)
// ---------------------------------------------------------------------------
function getUserId(): string {
    if (typeof window === 'undefined') return '';
    let id = localStorage.getItem('campus-user-id');
    if (!id) {
        id = 'user-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
        localStorage.setItem('campus-user-id', id);
    }
    return id;
}

function getUserName(): string {
    if (typeof window === 'undefined') return 'Anonymous';
    return localStorage.getItem('campus-user-name') || 'Anonymous';
}

// ---------------------------------------------------------------------------
// Root page
// ---------------------------------------------------------------------------
export default function StudyRooms() {
    const [rooms, setRooms] = useState<Room[]>([]);
    const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
    const [showCreate, setShowCreate] = useState(false);
    const [search, setSearch] = useState('');
    const [filterSubject, setFilterSubject] = useState('All');
    const [userName, setUserName] = useState('');
    const [hasSetName, setHasSetName] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const stored = getUserName();
        if (stored && stored !== 'Anonymous') {
            setUserName(stored);
            setHasSetName(true);
        }
        fetchRooms();
    }, []);

    useEffect(() => {
        if (currentRoom) return;
        const channel = supabase
            .channel('rooms-list')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, () => fetchRooms())
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [currentRoom]);

    const fetchRooms = async () => {
        try {
            const res = await fetch('/api/rooms');
            const data = await res.json();
            setRooms(data);
        } catch (e) {
            console.error('Failed to fetch rooms:', e);
        }
        setLoading(false);
    };

    const saveName = (name: string) => {
        setUserName(name);
        localStorage.setItem('campus-user-name', name);
        setHasSetName(true);
    };

    const joinRoom = async (room: Room) => {
        try {
            const res = await fetch('/api/rooms', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'join', roomId: room.id }),
            });
            const data = await res.json();
            setCurrentRoom(data);
        } catch (e) {
            console.error('Failed to join room:', e);
        }
    };

    const leaveRoom = async () => {
        if (!currentRoom) return;
        setCurrentRoom(null);
        fetchRooms();
    };

    const deleteRoom = async (roomId: string) => {
        try {
            await fetch('/api/rooms', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'delete', roomId }),
            });
            fetchRooms();
        } catch (e) {
            console.error('Failed to delete room:', e);
        }
    };

    const filtered = rooms.filter(r => {
        const matchSearch = r.name.toLowerCase().includes(search.toLowerCase()) ||
            r.subject.toLowerCase().includes(search.toLowerCase());
        const matchSubject = filterSubject === 'All' || r.subject === filterSubject;
        return matchSearch && matchSubject;
    });

    if (!hasSetName) return <NamePrompt onSave={saveName} />;

    if (currentRoom) {
        return (
            <RoomView
                room={currentRoom}
                userName={userName}
                userId={getUserId()}
                onLeave={leaveRoom}
                onRoomUpdate={setCurrentRoom}
            />
        );
    }

    return (
        <div className="flex flex-col h-full bg-[#0a0a0f]">
            {/* Header */}
            <div
                className="flex items-center justify-between px-6 py-4 border-b border-white/5"
                style={{ background: 'rgba(15,15,23,0.85)', backdropFilter: 'blur(16px)' }}
            >
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                        <Users size={15} className="text-emerald-400" />
                    </div>
                    <h2 className="text-sm font-semibold text-white tracking-wide">Study Rooms</h2>
                    <span className="text-[11px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-lg">
                        {rooms.length} active
                    </span>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-[11px] text-zinc-600">
                        <span className="text-zinc-400">{userName}</span>
                    </span>
                    <button
                        onClick={() => setShowCreate(true)}
                        className="flex items-center gap-1.5 text-[12px] bg-emerald-500 hover:bg-emerald-400 text-black px-3.5 py-2 rounded-xl font-semibold transition-all"
                        style={{ boxShadow: '0 0 16px rgba(16,185,129,0.3)' }}
                    >
                        <Plus size={13} /> New Room
                    </button>
                </div>
            </div>

            {/* Search & Filter */}
            <div className="px-6 py-3 flex items-center gap-3 border-b border-white/5" style={{ background: 'rgba(12,12,18,0.6)' }}>
                <div className="relative flex-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search rooms..."
                        className="w-full bg-white/4 border border-white/7 rounded-xl pl-9 pr-4 py-2 text-[13px] focus:outline-none focus:border-emerald-500/40 placeholder-zinc-600 text-white"
                        style={{ background: 'rgba(255,255,255,0.04)' }}
                    />
                </div>
                <div className="relative">
                    <select
                        value={filterSubject}
                        onChange={e => setFilterSubject(e.target.value)}
                        className="appearance-none text-zinc-400 text-[13px] rounded-xl px-3.5 py-2 pr-8 focus:outline-none cursor-pointer border border-white/7"
                        style={{ background: 'rgba(255,255,255,0.04)' }}
                    >
                        <option>All</option>
                        {SUBJECTS.map(s => <option key={s}>{s}</option>)}
                    </select>
                    <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                </div>
            </div>

            {/* Room Grid */}
            <div className="flex-1 overflow-y-auto p-6" style={{ background: '#0a0a0f' }}>
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-zinc-600 text-sm">Loading rooms...</div>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <div className="w-16 h-16 rounded-2xl border border-white/5 bg-white/3 flex items-center justify-center mb-4" style={{ background: 'rgba(255,255,255,0.03)' }}>
                            <Users size={24} className="text-zinc-700" />
                        </div>
                        <p className="text-zinc-500 text-sm">{rooms.length === 0 ? 'No rooms yet.' : 'No rooms match.'}</p>
                        <p className="text-zinc-700 text-xs mt-1">{rooms.length === 0 ? 'Create one to get started.' : 'Try a different filter.'}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl mx-auto">
                        {filtered.map(room => {
                            const theme = getColorTheme(room.color);
                            return (
                                <button
                                    key={room.id}
                                    onClick={() => joinRoom(room)}
                                    className="text-left rounded-3xl p-6 transition-all group relative border border-white/5 hover:border-white/10"
                                    style={{
                                        background: 'rgba(15,15,22,0.8)',
                                        backdropFilter: 'blur(12px)',
                                    }}
                                    onMouseEnter={e => {
                                        (e.currentTarget as HTMLElement).style.boxShadow = theme.glow;
                                        (e.currentTarget as HTMLElement).style.borderColor = `${theme.neon}30`;
                                    }}
                                    onMouseLeave={e => {
                                        (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                                        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.05)';
                                    }}
                                >
                                    <div
                                        className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={e => { e.stopPropagation(); deleteRoom(room.id); }}
                                    >
                                        <Trash2 size={16} className="text-zinc-600 hover:text-red-400 transition-colors" />
                                    </div>
                                    {/* Color dot accent */}
                                    <div className="flex items-center gap-2.5 mb-3">
                                        <div
                                            className="w-3 h-3 rounded-full"
                                            style={{ background: theme.neon, boxShadow: `0 0 10px ${theme.neon}` }}
                                        />
                                        <span className="text-[12px] font-medium" style={{ color: theme.neon }}>{room.subject}</span>
                                    </div>
                                    <h3 className="text-white font-semibold text-[16px] mb-2 truncate pr-6">{room.name}</h3>
                                    {room.description && (
                                        <p className="text-[13px] text-zinc-500 mb-4 line-clamp-2 leading-relaxed">{room.description}</p>
                                    )}
                                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-emerald-400" style={{ boxShadow: '0 0 8px #10b981' }} />
                                            <span className="text-[12px] text-zinc-400">{room.activeUsers?.length || 0} online</span>
                                        </div>
                                        <span className="text-[12px] text-zinc-600">{room.messages?.length || 0} msgs</span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {showCreate && (
                <CreateRoomModal
                    onClose={() => setShowCreate(false)}
                    onCreated={() => { setShowCreate(false); fetchRooms(); }}
                />
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Name Prompt
// ---------------------------------------------------------------------------
function NamePrompt({ onSave }: { onSave: (name: string) => void }) {
    const [name, setName] = useState('');
    return (
        <div className="flex items-center justify-center h-full p-8" style={{ background: '#0a0a0f' }}>
            <div className="w-full max-w-sm">
                <div
                    className="rounded-2xl p-8 text-center border border-white/7"
                    style={{ background: 'rgba(15,15,22,0.9)', backdropFilter: 'blur(20px)', boxShadow: '0 0 40px rgba(16,185,129,0.08)' }}
                >
                    <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-5"
                        style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}
                    >
                        👋
                    </div>
                    <h2 className="text-[17px] font-semibold text-white mb-2">Welcome to Study Rooms</h2>
                    <p className="text-zinc-500 text-[13px] mb-6">Enter your name so others know who you are.</p>
                    <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && name.trim() && onSave(name.trim())}
                        placeholder="Your display name..."
                        className="w-full border text-white rounded-xl px-4 py-3 text-[13px] focus:outline-none placeholder-zinc-600 mb-4"
                        style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)', outline: 'none' }}
                        onFocus={e => { e.target.style.borderColor = 'rgba(16,185,129,0.4)'; }}
                        onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                        autoFocus
                    />
                    <button
                        onClick={() => name.trim() && onSave(name.trim())}
                        disabled={!name.trim()}
                        className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-30 disabled:cursor-not-allowed text-black py-3 rounded-xl font-semibold transition-all text-[13px]"
                        style={{ boxShadow: name.trim() ? '0 0 20px rgba(16,185,129,0.3)' : 'none' }}
                    >
                        Continue
                    </button>
                </div>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Create Room Modal
// ---------------------------------------------------------------------------
function CreateRoomModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
    const [form, setForm] = useState({ name: '', subject: 'Computer Science', description: '', color: 'blue' });
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);

    const handleCreate = async () => {
        if (!form.name.trim()) return;
        setCreating(true);
        setCreateError(null);
        try {
            const res = await fetch('/api/rooms', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'create', ...form }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to create room');
            onCreated();
        } catch (e: any) {
            setCreateError(e.message || 'Something went wrong. Please try again.');
        }
        setCreating(false);
    };

    return (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
            <div
                className="rounded-2xl p-6 w-full max-w-md border border-white/8"
                style={{ background: 'rgba(13,13,20,0.95)', backdropFilter: 'blur(24px)', boxShadow: '0 0 60px rgba(0,0,0,0.6)' }}
            >
                <div className="flex items-center justify-between mb-5">
                    <h3 className="text-white font-semibold text-[15px]">Create Study Room</h3>
                    <button onClick={onClose} className="text-zinc-600 hover:text-zinc-300 transition-colors"><X size={18} /></button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="text-[11px] text-zinc-500 mb-1.5 block uppercase tracking-wider">Room Name</label>
                        <input
                            type="text"
                            value={form.name}
                            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                            placeholder="e.g. DSA Study Group..."
                            className="w-full border text-white rounded-xl px-4 py-3 text-[13px] focus:outline-none placeholder-zinc-600"
                            style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}
                            onFocus={e => { e.target.style.borderColor = 'rgba(16,185,129,0.4)'; }}
                            onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="text-[11px] text-zinc-500 mb-1.5 block uppercase tracking-wider">Subject</label>
                        <select
                            value={form.subject}
                            onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                            className="w-full border text-white rounded-xl px-4 py-3 text-[13px] focus:outline-none"
                            style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}
                        >
                            {SUBJECTS.map(s => <option key={s}>{s}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-[11px] text-zinc-500 mb-1.5 block uppercase tracking-wider">Description</label>
                        <textarea
                            value={form.description}
                            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                            placeholder="What will you study?"
                            rows={2}
                            className="w-full border text-white rounded-xl px-4 py-3 text-[13px] focus:outline-none placeholder-zinc-600 resize-none"
                            style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}
                        />
                    </div>
                    <div>
                        <label className="text-[11px] text-zinc-500 mb-1.5 block uppercase tracking-wider">Color</label>
                        <div className="flex gap-2">
                            {ROOM_COLORS.map(c => (
                                <button
                                    key={c.value}
                                    onClick={() => setForm(f => ({ ...f, color: c.value }))}
                                    className="flex-1 py-2.5 rounded-xl text-[11px] font-medium border transition-all"
                                    style={{
                                        background: form.color === c.value ? c.neonDim : 'rgba(255,255,255,0.03)',
                                        borderColor: form.color === c.value ? `${c.neon}50` : 'rgba(255,255,255,0.07)',
                                        color: form.color === c.value ? c.neon : '#52525b',
                                        boxShadow: form.color === c.value ? `0 0 12px ${c.neon}30` : 'none',
                                    }}
                                >
                                    {c.name}
                                </button>
                            ))}
                        </div>
                    </div>
                    {createError && (
                        <p className="text-[12px] text-red-400 bg-red-500/8 border border-red-500/15 rounded-xl px-4 py-2.5">
                            {createError}
                        </p>
                    )}
                    <div className="flex gap-3 pt-1">
                        <button onClick={onClose} className="flex-1 border border-white/8 hover:border-white/15 text-zinc-400 py-3 rounded-xl font-medium transition-colors text-[13px]" style={{ background: 'rgba(255,255,255,0.03)' }}>
                            Cancel
                        </button>
                        <button
                            onClick={handleCreate}
                            disabled={!form.name.trim() || creating}
                            className="flex-1 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-30 disabled:cursor-not-allowed text-black py-3 rounded-xl font-semibold transition-all text-[13px]"
                            style={{ boxShadow: '0 0 20px rgba(16,185,129,0.25)' }}
                        >
                            {creating ? 'Creating...' : 'Create Room'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Room Interior View — redesigned: chat-first, panels as overlays
// ---------------------------------------------------------------------------
function RoomView({
    room: initialRoom,
    userName,
    userId,
    onLeave,
    onRoomUpdate,
}: {
    room: Room;
    userName: string;
    userId: string;
    onLeave: () => void;
    onRoomUpdate: (room: Room) => void;
}) {
    const [messages, setMessages] = useState<Message[]>(initialRoom.messages ?? []);
    const [notes, setNotes] = useState(initialRoom.notes ?? '');
    const [input, setInput] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [activeUsers, setActiveUsers] = useState<{ id: string; name: string }[]>([]);

    // Panel state: null = closed, 'notes' | 'call' = open as overlay
    const [openPanel, setOpenPanel] = useState<null | 'notes' | 'call'>(null);

    const [livekitToken, setLivekitToken] = useState<string | null>(null);
    const [livekitUrl, setLivekitUrl] = useState<string>('');
    const [callMode, setCallMode] = useState<'video' | 'audio'>('video');
    const [callConnecting, setCallConnecting] = useState(false);
    const [showPeople, setShowPeople] = useState(false);

    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const notesTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const optimisticIds = useRef<Set<string>>(new Set());
    const roomChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

    const theme = getColorTheme(initialRoom.color);

    // ── Supabase Realtime ──────────────────────────────────────────────────
    useEffect(() => {
        let isMounted = true;

        const syncPresence = (channel: ReturnType<typeof supabase.channel>) => {
            const state = channel.presenceState<{ name: string }>();
            const users = Object.entries(state).map(([id, presences]) => ({
                id,
                name: (presences as any[])[0]?.name ?? 'Anonymous',
            }));
            if (isMounted) setActiveUsers(users);
        };

        const roomChannel = supabase.channel(`room-${initialRoom.id}`, {
            config: { presence: { key: userId } },
        });

        roomChannelRef.current = roomChannel;

        roomChannel
            .on('broadcast', { event: 'new-message' }, ({ payload }) => {
                if (!isMounted) return;
                const msg = payload as Message;
                if (optimisticIds.current.has(msg.id)) return;
                setMessages(prev => {
                    if (prev.some(m => m.id === msg.id)) return prev;
                    return [...prev, msg];
                });
            })
            .on('broadcast', { event: 'notes-update' }, ({ payload }) => {
                if (!isMounted) return;
                if (typeof payload.notes === 'string') setNotes(payload.notes);
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${initialRoom.id}` }, (payload) => {
                if (!isMounted) return;
                const updated = payload.new as any;
                if (Array.isArray(updated.messages)) {
                    setMessages(prev => {
                        if (updated.messages.length >= prev.filter(m => !optimisticIds.current.has(m.id)).length) {
                            optimisticIds.current.clear();
                            return updated.messages;
                        }
                        return prev;
                    });
                }
                if (typeof updated.notes === 'string') setNotes(updated.notes);
            })
            .on('presence', { event: 'sync' }, () => syncPresence(roomChannel))
            .on('presence', { event: 'join' }, () => syncPresence(roomChannel))
            .on('presence', { event: 'leave' }, () => syncPresence(roomChannel))
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED' && isMounted) {
                    await roomChannel.track({ name: userName });
                }
            });

        return () => {
            isMounted = false;
            roomChannelRef.current = null;
            supabase.removeChannel(roomChannel);
        };
    }, [initialRoom.id, userId, userName]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isAiLoading]);

    // ── Notes sync ─────────────────────────────────────────────────────────
    const syncNotes = useCallback((newNotes: string) => {
        if (notesTimeoutRef.current) clearTimeout(notesTimeoutRef.current);
        notesTimeoutRef.current = setTimeout(async () => {
            try {
                if (roomChannelRef.current) {
                    await roomChannelRef.current.send({ type: 'broadcast', event: 'notes-update', payload: { notes: newNotes } });
                }
                await fetch('/api/rooms', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'update-notes', roomId: initialRoom.id, notes: newNotes, userName }),
                });
            } catch { }
        }, 500);
    }, [initialRoom.id, userName]);

    const handleNotesChange = (newNotes: string) => {
        setNotes(newNotes);
        syncNotes(newNotes);
    };

    // ── Join LiveKit call ──────────────────────────────────────────────────
    const joinCall = async (mode: 'video' | 'audio') => {
        setCallMode(mode);
        setCallConnecting(true);
        try {
            const res = await fetch('/api/livekit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roomName: `room-${initialRoom.id}`, participantName: userName, userId }),
            });
            const data = await res.json();
            if (data.token) {
                const serverUrl = data.url || process.env.NEXT_PUBLIC_LIVEKIT_URL || '';
                if (!serverUrl) { alert('LiveKit URL not configured.'); return; }
                setLivekitUrl(serverUrl);
                setLivekitToken(data.token);
                setOpenPanel('call');
            } else {
                alert(`Could not start call: ${data.error ?? 'Unknown error'}`);
            }
        } catch (e) {
            alert('Could not connect to call server. Please try again.');
        } finally {
            setCallConnecting(false);
        }
    };

    const leaveCall = () => {
        setLivekitToken(null);
        setOpenPanel(null);
    };

    // ── Send message ───────────────────────────────────────────────────────
    const sendMessage = async () => {
        if (!input.trim()) return;
        const content = input.trim();
        setInput('');

        const optimisticId = 'opt-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
        const optimisticMsg: Message = { id: optimisticId, role: 'user', content, userName, timestamp: Date.now() };
        optimisticIds.current.add(optimisticId);
        setMessages(prev => [...prev, optimisticMsg]);
        inputRef.current?.focus();

        try {
            if (roomChannelRef.current) {
                await roomChannelRef.current.send({
                    type: 'broadcast', event: 'new-message',
                    payload: { id: optimisticId, role: 'user', content, userName, timestamp: Date.now() },
                });
            }

            await fetch('/api/rooms', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'message', roomId: initialRoom.id, content, userName, userId }),
            });

            if (content.toLowerCase().startsWith('@ai')) {
                const cleanQuery = content.replace(/^@ai\s*/i, '');
                setIsAiLoading(true);
                try {
                    const aiRes = await fetch('/api/chat', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            message: cleanQuery,
                            history: messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
                            systemPrompt: `You are a helpful AI study assistant in a collaborative study room focused on "${initialRoom.subject}". Keep responses concise and helpful.`,
                        }),
                    });
                    
                    if (!aiRes.ok) {
                        const errText = await aiRes.text();
                        console.error("AI HTTP Error:", errText);
                        alert(`AI server error: ${aiRes.status} ${errText}`);
                        return;
                    }
                    
                    const aiData = await aiRes.json();
                    
                    if (!aiData || !aiData.reply) {
                        alert("AI API did not return a reply field.");
                        return;
                    }
                    
                    // Create AI message object
                    const aiMsgId = 'ai-' + Date.now().toString(36);
                    const aiMsg: Message = {
                        id: aiMsgId,
                        role: 'assistant',
                        content: aiData.reply,
                        userName: 'AI Assistant',
                        timestamp: Date.now()
                    };

                    // Optimistically add it to local state
                    setMessages(prev => [...prev, aiMsg]);

                    // Broadcast via Realtime to all other users in the room
                    if (roomChannelRef.current) {
                        await roomChannelRef.current.send({
                            type: 'broadcast', event: 'new-message',
                            payload: aiMsg,
                        });
                    }
                    
                    // Attempt to persist to DB (fire-and-forget, will fail if schema doesn't match)
                    fetch('/api/rooms', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'ai-message', roomId: initialRoom.id, content: aiData.reply }),
                    }).catch(() => {});
                    
                } catch (err: any) {
                    console.error("Network or parse error in AI call:", err);
                    alert("Network error while calling AI: " + err.message);
                } finally {
                    setIsAiLoading(false);
                }
            }
        } catch (e) {
            optimisticIds.current.delete(optimisticId);
            setMessages(prev => prev.filter(m => m.id !== optimisticId));
        }
    };

    const togglePanel = (panel: 'notes' | 'call') => {
        if (openPanel === panel) {
            setOpenPanel(null);
        } else {
            setOpenPanel(panel);
        }
    };

    return (
        <div className="flex flex-col h-full relative overflow-hidden" style={{ background: '#080810' }}>

            {/* ── Top Header ── */}
            <div
                className="flex items-center justify-between px-5 py-3 border-b border-white/5 flex-shrink-0 z-10"
                style={{ background: 'rgba(10,10,18,0.9)', backdropFilter: 'blur(20px)' }}
            >
                {/* Left: back + room info */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={onLeave}
                        className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-white/5 transition-all"
                    >
                        <ArrowLeft size={16} />
                    </button>
                    <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold text-white"
                        style={{ background: `linear-gradient(135deg, ${theme.neon}60, ${theme.neon}30)`, border: `1px solid ${theme.neon}30` }}
                    >
                        {initialRoom.name?.charAt(0)?.toUpperCase() ?? '?'}
                    </div>
                    <div>
                        <h2 className="text-[13px] font-semibold text-white leading-tight">{initialRoom.name}</h2>
                        <p className="text-[11px] leading-tight" style={{ color: theme.neon }}>{initialRoom.subject}</p>
                    </div>
                </div>

                {/* Right: people count + action icons */}
                <div className="flex items-center gap-2">
                    {/* People pill — click to see names */}
                    <button
                        onClick={() => setShowPeople(v => !v)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/7 hover:border-white/12 transition-all"
                        style={{ background: 'rgba(255,255,255,0.04)' }}
                    >
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#10b981', boxShadow: '0 0 5px #10b981' }} />
                        <span className="text-[12px] text-zinc-400">{activeUsers.length}</span>
                        <Users size={12} className="text-zinc-600" />
                    </button>

                    {/* Notes icon button */}
                    <button
                        onClick={() => togglePanel('notes')}
                        title="Shared Notes"
                        className="w-8 h-8 flex items-center justify-center rounded-lg border transition-all"
                        style={{
                            background: openPanel === 'notes' ? `${theme.neon}15` : 'rgba(255,255,255,0.04)',
                            borderColor: openPanel === 'notes' ? `${theme.neon}40` : 'rgba(255,255,255,0.07)',
                            color: openPanel === 'notes' ? theme.neon : '#52525b',
                            boxShadow: openPanel === 'notes' ? `0 0 12px ${theme.neon}25` : 'none',
                        }}
                    >
                        <FileText size={14} />
                    </button>

                    {/* Call icon buttons */}
                    <button
                        onClick={() => livekitToken ? togglePanel('call') : joinCall('video')}
                        disabled={callConnecting}
                        title="Video call"
                        className="w-8 h-8 flex items-center justify-center rounded-lg border transition-all disabled:opacity-40"
                        style={{
                            background: openPanel === 'call' && livekitToken ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.04)',
                            borderColor: openPanel === 'call' && livekitToken ? 'rgba(239,68,68,0.35)' : 'rgba(255,255,255,0.07)',
                            color: openPanel === 'call' && livekitToken ? '#ef4444' : '#52525b',
                        }}
                    >
                        <Video size={14} />
                    </button>

                    <button
                        onClick={() => joinCall('audio')}
                        disabled={callConnecting}
                        title="Audio call"
                        className="w-8 h-8 flex items-center justify-center rounded-lg border border-white/7 text-zinc-600 hover:text-zinc-300 hover:border-white/12 transition-all disabled:opacity-40"
                        style={{ background: 'rgba(255,255,255,0.04)' }}
                    >
                        <Phone size={14} />
                    </button>
                </div>
            </div>

            {/* People dropdown */}
            {showPeople && (
                <div
                    className="absolute top-[52px] right-4 z-30 rounded-xl border border-white/8 p-3 min-w-[180px]"
                    style={{ background: 'rgba(12,12,20,0.97)', backdropFilter: 'blur(20px)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
                >
                    <p className="text-[11px] text-zinc-600 mb-2 uppercase tracking-wider px-1">Online now</p>
                    {activeUsers.length === 0 ? (
                        <p className="text-[12px] text-zinc-600 px-1">Just you</p>
                    ) : activeUsers.map(u => (
                        <div key={u.id} className="flex items-center gap-2 px-1 py-1">
                            <div
                                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                                style={{ background: `${theme.neon}30`, border: `1px solid ${theme.neon}30` }}
                            >
                                {u.name?.charAt(0)?.toUpperCase() ?? '?'}
                            </div>
                            <span className="text-[12px] text-zinc-300">{u.name}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Main area: chat always visible, panels as side overlays ── */}
            <div className="flex-1 flex overflow-hidden relative">

                {/* Chat — always full width */}
                <div
                    className="flex flex-col transition-all duration-300"
                    style={{ flex: openPanel ? '0 0 55%' : '1 1 100%', minWidth: 0 }}
                >
                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto px-5 py-5 space-y-2">
                        {messages.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-full text-center py-16">
                                <div
                                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl mb-4"
                                    style={{ background: `${theme.neon}12`, border: `1px solid ${theme.neon}20` }}
                                >
                                    💬
                                </div>
                                <p className="text-zinc-500 text-[13px] mb-1">No messages yet</p>
                                <p className="text-zinc-700 text-[12px]">
                                    Type <span style={{ color: theme.neon }}>@ai</span> to ask the study assistant
                                </p>
                            </div>
                        )}

                        {messages.map((msg) => (
                            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} items-end gap-2`}>
                                {msg.role === 'assistant' && (
                                    <div
                                        className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0 mb-0.5"
                                        style={{ background: `${theme.neon}30`, border: `1px solid ${theme.neon}30` }}
                                    >
                                        AI
                                    </div>
                                )}
                                <div className="max-w-[78%]">
                                    {msg.role === 'user' && msg.userName && (
                                        <p className="text-[10px] text-zinc-600 mb-0.5 text-right">{msg.userName}</p>
                                    )}
                                    <div
                                        className="px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed whitespace-pre-wrap"
                                        style={msg.role === 'user' ? {
                                            background: `linear-gradient(135deg, ${theme.neon}25, ${theme.neon}15)`,
                                            border: `1px solid ${theme.neon}25`,
                                            color: '#e4e4e7',
                                            borderBottomRightRadius: '6px',
                                        } : {
                                            background: 'rgba(255,255,255,0.05)',
                                            border: '1px solid rgba(255,255,255,0.06)',
                                            color: '#d4d4d8',
                                            borderBottomLeftRadius: '6px',
                                        }}
                                    >
                                        {msg.content}
                                    </div>
                                </div>
                            </div>
                        ))}

                        {isAiLoading && (
                            <div className="flex items-end gap-2">
                                <div
                                    className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                                    style={{ background: `${theme.neon}30`, border: `1px solid ${theme.neon}30` }}
                                >
                                    AI
                                </div>
                                <div
                                    className="px-3.5 py-2.5 rounded-2xl flex gap-1.5 items-center"
                                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)' }}
                                >
                                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce [animation-delay:0ms]" />
                                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce [animation-delay:150ms]" />
                                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce [animation-delay:300ms]" />
                                </div>
                            </div>
                        )}
                        <div ref={bottomRef} />
                    </div>

                    {/* Message Input */}
                    <div
                        className="px-4 py-3 border-t border-white/5 flex-shrink-0"
                        style={{ background: 'rgba(8,8,16,0.85)', backdropFilter: 'blur(12px)' }}
                    >
                        <div className="flex gap-2 items-center">
                            <input
                                ref={inputRef}
                                type="text"
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                                placeholder="Message... (@ai for help)"
                                className="flex-1 rounded-xl px-4 py-2.5 text-[13px] focus:outline-none placeholder-zinc-600 text-zinc-200 border border-white/6 transition-all"
                                style={{ background: 'rgba(255,255,255,0.05)' }}
                                onFocus={e => { e.target.style.borderColor = `${theme.neon}35`; }}
                                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.06)'; }}
                            />
                            <button
                                onClick={sendMessage}
                                disabled={!input.trim()}
                                className="w-9 h-9 flex items-center justify-center rounded-xl transition-all flex-shrink-0 disabled:opacity-30"
                                style={{
                                    background: input.trim() ? `${theme.neon}` : 'rgba(255,255,255,0.05)',
                                    boxShadow: input.trim() ? `0 0 16px ${theme.neon}40` : 'none',
                                    border: '1px solid rgba(255,255,255,0.07)',
                                }}
                            >
                                <Send size={15} className={input.trim() ? 'text-black' : 'text-zinc-600'} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* ── Side Panel: Notes or Call ── */}
                {openPanel && (
                    <div
                        className="flex flex-col border-l border-white/6 transition-all duration-300"
                        style={{
                            flex: '0 0 45%',
                            background: 'rgba(10,10,18,0.95)',
                            backdropFilter: 'blur(16px)',
                        }}
                    >
                        {/* Panel header */}
                        <div
                            className="flex items-center justify-between px-4 py-3 border-b border-white/5 flex-shrink-0"
                            style={{ background: 'rgba(12,12,20,0.8)' }}
                        >
                            <div className="flex items-center gap-2">
                                {openPanel === 'notes' ? (
                                    <>
                                        <FileText size={13} style={{ color: theme.neon }} />
                                        <span className="text-[12px] font-medium text-zinc-300">Shared Notes</span>
                                    </>
                                ) : (
                                    <>
                                        <Phone size={13} style={{ color: theme.neon }} />
                                        <span className="text-[12px] font-medium text-zinc-300">
                                            {livekitToken ? 'In Call' : 'Group Call'}
                                        </span>
                                        {livekitToken && (
                                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                        )}
                                    </>
                                )}
                            </div>
                            <button
                                onClick={() => setOpenPanel(null)}
                                className="text-zinc-600 hover:text-zinc-300 transition-colors"
                            >
                                <X size={15} />
                            </button>
                        </div>

                        {/* Panel content */}
                        <div className="flex-1 overflow-hidden flex flex-col">
                            {openPanel === 'notes' && (
                                <>
                                    <div className="px-3 py-1.5 border-b border-white/5">
                                        <span className="text-[10px] text-zinc-700 uppercase tracking-wider">Synced in real-time</span>
                                    </div>
                                    <textarea
                                        value={notes}
                                        onChange={e => handleNotesChange(e.target.value)}
                                        placeholder="Start typing notes... Everyone in this room can see and edit."
                                        className="flex-1 text-zinc-300 text-[13px] p-4 resize-none focus:outline-none placeholder-zinc-700 leading-relaxed font-mono"
                                        style={{ background: 'transparent' }}
                                    />
                                </>
                            )}

                            {openPanel === 'call' && (
                                <div className="flex-1 flex flex-col">
                                    {livekitToken ? (
                                        <GroupCallPanel
                                            token={livekitToken}
                                            serverUrl={livekitUrl}
                                            mode={callMode}
                                            onLeave={leaveCall}
                                            theme={theme}
                                        />
                                    ) : (
                                        <CallLobby
                                            theme={theme}
                                            roomName={initialRoom.name}
                                            connecting={callConnecting}
                                            onJoinVideo={() => joinCall('video')}
                                            onJoinAudio={() => joinCall('audio')}
                                        />
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Dismiss dropdown on outside click */}
            {showPeople && (
                <div className="fixed inset-0 z-20" onClick={() => setShowPeople(false)} />
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Call Lobby
// ---------------------------------------------------------------------------
function CallLobby({
    theme, roomName, connecting, onJoinVideo, onJoinAudio,
}: {
    theme: ReturnType<typeof getColorTheme>;
    roomName: string;
    connecting: boolean;
    onJoinVideo: () => void;
    onJoinAudio: () => void;
}) {
    return (
        <div className="flex-1 flex flex-col items-center justify-center gap-5 p-8">
            <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl"
                style={{ background: `${theme.neon}15`, border: `1px solid ${theme.neon}25`, boxShadow: `0 0 24px ${theme.neon}15` }}
            >
                📞
            </div>
            <div className="text-center">
                <h3 className="text-white text-[14px] font-semibold mb-1">{roomName}</h3>
                <p className="text-zinc-600 text-[12px]">Join a live call with your study group</p>
            </div>
            <div className="flex flex-col gap-2 w-full max-w-[200px]">
                <button
                    onClick={onJoinVideo}
                    disabled={connecting}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium transition-all text-[13px] text-black disabled:opacity-50"
                    style={{ background: theme.neon, boxShadow: `0 0 16px ${theme.neon}40` }}
                >
                    <Video size={14} />
                    {connecting ? 'Connecting...' : 'Join with Video'}
                </button>
                <button
                    onClick={onJoinAudio}
                    disabled={connecting}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium transition-all text-[13px] text-zinc-300 disabled:opacity-50 border border-white/8 hover:border-white/15"
                    style={{ background: 'rgba(255,255,255,0.05)' }}
                >
                    <Mic size={14} />
                    {connecting ? 'Connecting...' : 'Audio Only'}
                </button>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Group Call Panel
// ---------------------------------------------------------------------------
function GroupCallPanel({
    token, serverUrl, mode, onLeave, theme,
}: {
    token: string;
    serverUrl: string;
    mode: 'video' | 'audio';
    onLeave: () => void;
    theme: ReturnType<typeof getColorTheme>;
}) {
    const leavingRef = useRef(false);

    if (!serverUrl) {
        return (
            <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center">
                    <p className="text-red-400 font-semibold mb-2 text-[13px]">Config error</p>
                    <p className="text-zinc-600 text-[12px]">Set NEXT_PUBLIC_LIVEKIT_URL in .env.local</p>
                    <button onClick={onLeave} className="mt-4 text-[12px] text-zinc-600 underline">Go back</button>
                </div>
            </div>
        );
    }

    const handleDisconnected = useCallback(() => {
        if (leavingRef.current) return;
        leavingRef.current = true;
        onLeave();
    }, [onLeave]);

    const handleLeaveButton = useCallback(() => {
        if (leavingRef.current) return;
        leavingRef.current = true;
        onLeave();
    }, [onLeave]);

    return (
        <div className="flex-1 flex flex-col h-full">
            <LiveKitRoom
                token={token}
                serverUrl={serverUrl}
                connect={true}
                video={mode === 'video'}
                audio={true}
                onDisconnected={handleDisconnected}
                className="flex-1 flex flex-col"
                style={{ background: 'transparent' }}
            >
                <RoomAudioRenderer />
                <CallContent mode={mode} onLeave={handleLeaveButton} theme={theme} />
            </LiveKitRoom>
        </div>
    );
}

// Inner component for LiveKit hooks
function CallContent({
    mode, onLeave, theme,
}: {
    mode: 'video' | 'audio';
    onLeave: () => void;
    theme: ReturnType<typeof getColorTheme>;
}) {
    const tracks = useTracks(
        [
            { source: Track.Source.Camera, withPlaceholder: true },
            { source: Track.Source.Microphone, withPlaceholder: true },
            { source: Track.Source.ScreenShare, withPlaceholder: false },
        ],
        { onlySubscribed: false }
    );

    const { localParticipant } = useLocalParticipant();
    const [micEnabled, setMicEnabled] = useState(true);
    const [camEnabled, setCamEnabled] = useState(mode === 'video');

    const toggleMic = () => {
        localParticipant.setMicrophoneEnabled(!micEnabled);
        setMicEnabled(v => !v);
    };

    const toggleCam = () => {
        localParticipant.setCameraEnabled(!camEnabled);
        setCamEnabled(v => !v);
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 overflow-hidden p-2">
                {mode === 'video' ? (
                    <GridLayout tracks={tracks} style={{ height: '100%' }}>
                        <ParticipantTile />
                    </GridLayout>
                ) : (
                    <AudioOnlyView tracks={tracks} theme={theme} />
                )}
            </div>
            {/* Call controls */}
            <div
                className="flex items-center justify-center gap-2.5 px-4 py-3 border-t border-white/5"
                style={{ background: 'rgba(8,8,16,0.8)' }}
            >
                <button
                    onClick={toggleMic}
                    className="w-9 h-9 flex items-center justify-center rounded-xl transition-all"
                    style={{
                        background: micEnabled ? 'rgba(255,255,255,0.07)' : 'rgba(239,68,68,0.15)',
                        border: micEnabled ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(239,68,68,0.3)',
                        color: micEnabled ? '#a1a1aa' : '#ef4444',
                    }}
                    title={micEnabled ? 'Mute' : 'Unmute'}
                >
                    {micEnabled ? <Mic size={15} /> : <MicOff size={15} />}
                </button>
                {mode === 'video' && (
                    <button
                        onClick={toggleCam}
                        className="w-9 h-9 flex items-center justify-center rounded-xl transition-all"
                        style={{
                            background: camEnabled ? 'rgba(255,255,255,0.07)' : 'rgba(239,68,68,0.15)',
                            border: camEnabled ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(239,68,68,0.3)',
                            color: camEnabled ? '#a1a1aa' : '#ef4444',
                        }}
                        title={camEnabled ? 'Stop camera' : 'Start camera'}
                    >
                        {camEnabled ? <Video size={15} /> : <VideoOff size={15} />}
                    </button>
                )}
                <button
                    onClick={onLeave}
                    className="w-9 h-9 flex items-center justify-center rounded-xl transition-all"
                    style={{ background: '#ef4444', boxShadow: '0 0 14px rgba(239,68,68,0.4)' }}
                    title="Leave call"
                >
                    <PhoneOff size={15} className="text-white" />
                </button>
            </div>
        </div>
    );
}

// Audio-only participant view
function AudioOnlyView({ tracks, theme }: { tracks: ReturnType<typeof useTracks>; theme: ReturnType<typeof getColorTheme> }) {
    const audioTracks = tracks.filter(t => t.source === Track.Source.Microphone);

    if (audioTracks.length === 0) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <div className="text-3xl mb-3">🎙️</div>
                    <p className="text-zinc-600 text-[12px]">Waiting for others...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-wrap gap-3 items-center justify-center h-full p-4">
            {audioTracks.map((track) => (
                <div
                    key={track.participant.identity}
                    className="flex flex-col items-center gap-2 p-4 rounded-2xl"
                    style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${theme.neon}20` }}
                >
                    <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white"
                        style={{ background: `${theme.neon}20`, border: `1px solid ${theme.neon}30` }}
                    >
                        {track.participant.name?.charAt(0)?.toUpperCase() ?? '?'}
                    </div>
                    <span className="text-[11px] text-zinc-500">{track.participant.name ?? track.participant.identity}</span>
                    <Mic size={11} className="text-emerald-400" style={{ filter: 'drop-shadow(0 0 4px #10b981)' }} />
                </div>
            ))}
        </div>
    );
}