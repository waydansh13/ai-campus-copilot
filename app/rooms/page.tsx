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
    { name: 'Blue', value: 'blue', from: 'from-blue-600', to: 'to-cyan-500', bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
    { name: 'Purple', value: 'purple', from: 'from-purple-600', to: 'to-pink-500', bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30' },
    { name: 'Green', value: 'green', from: 'from-emerald-600', to: 'to-teal-500', bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' },
    { name: 'Orange', value: 'orange', from: 'from-orange-600', to: 'to-amber-500', bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30' },
    { name: 'Rose', value: 'rose', from: 'from-rose-600', to: 'to-red-500', bg: 'bg-rose-500/20', text: 'text-rose-400', border: 'border-rose-500/30' },
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

    // Subscribe to room list changes via Supabase Realtime
    useEffect(() => {
        if (currentRoom) return; // don't refresh lobby while inside a room

        const channel = supabase
            .channel('rooms-list')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'rooms' },
                () => fetchRooms()
            )
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
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900 flex-wrap gap-3">
                <div className="flex items-center gap-3">
                    <Users size={20} className="text-emerald-400" />
                    <h2 className="text-base font-semibold text-white">Study Rooms</h2>
                    <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-lg">
                        {rooms.length} rooms
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-500">
                        Joined as <span className="text-zinc-300 font-medium">{userName}</span>
                    </span>
                    <button
                        onClick={() => setShowCreate(true)}
                        className="flex items-center gap-2 text-sm bg-emerald-500 hover:bg-emerald-400 text-black px-4 py-2 rounded-xl font-medium transition-colors"
                    >
                        <Plus size={16} /> Create Room
                    </button>
                </div>
            </div>

            {/* Search & Filter */}
            <div className="px-6 py-4 flex items-center gap-3 border-b border-zinc-800">
                <div className="relative flex-1">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search rooms..."
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 placeholder-zinc-500 text-white"
                    />
                </div>
                <div className="relative">
                    <select
                        value={filterSubject}
                        onChange={e => setFilterSubject(e.target.value)}
                        className="appearance-none bg-zinc-800 border border-zinc-700 text-zinc-300 text-sm rounded-xl px-4 py-2.5 pr-8 focus:outline-none focus:border-emerald-500 cursor-pointer"
                    >
                        <option>All</option>
                        {SUBJECTS.map(s => <option key={s}>{s}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                </div>
            </div>

            {/* Room Grid */}
            <div className="flex-1 overflow-y-auto p-6">
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-zinc-500 text-sm">Loading rooms...</div>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <Users size={48} className="text-zinc-700 mb-4" />
                        <p className="text-zinc-500 text-sm">
                            {rooms.length === 0 ? 'No study rooms yet.' : 'No rooms match your search.'}
                        </p>
                        <p className="text-zinc-600 text-xs mt-1">
                            {rooms.length === 0 ? 'Create one to get started!' : 'Try a different filter.'}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
                        {filtered.map(room => {
                            const theme = getColorTheme(room.color);
                            return (
                                <button
                                    key={room.id}
                                    onClick={() => joinRoom(room)}
                                    className={`text-left bg-zinc-900 border ${theme.border} rounded-2xl p-5 hover:bg-zinc-800/80 transition-all group relative`}
                                >
                                    <div
                                        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={e => { e.stopPropagation(); deleteRoom(room.id); }}
                                    >
                                        <Trash2 size={14} className="text-zinc-600 hover:text-red-400 transition-colors" />
                                    </div>
                                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${theme.from} ${theme.to} flex items-center justify-center text-white text-sm font-bold mb-3`}>
                                        {room.name.charAt(0).toUpperCase()}
                                    </div>
                                    <h3 className="text-white font-semibold text-sm mb-1 truncate pr-6">{room.name}</h3>
                                    <p className={`text-xs ${theme.text} mb-2`}>{room.subject}</p>
                                    {room.description && (
                                        <p className="text-xs text-zinc-500 mb-3 line-clamp-2">{room.description}</p>
                                    )}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                            <Circle size={8} className="text-emerald-400 fill-emerald-400" />
                                            <span className="text-xs text-zinc-400">
                                                {room.activeUsers?.length || 0} online
                                            </span>
                                        </div>
                                        <span className="text-xs text-zinc-600">
                                            {room.messages?.length || 0} messages
                                        </span>
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
        <div className="flex items-center justify-center h-full p-8">
            <div className="w-full max-w-sm">
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-500 flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                        👋
                    </div>
                    <h2 className="text-xl font-semibold text-white mb-2">Welcome to Study Rooms</h2>
                    <p className="text-zinc-400 text-sm mb-6">Enter your name so others can see who you are.</p>
                    <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && name.trim() && onSave(name.trim())}
                        placeholder="Your display name..."
                        className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 placeholder-zinc-500 mb-4"
                        autoFocus
                    />
                    <button
                        onClick={() => name.trim() && onSave(name.trim())}
                        disabled={!name.trim()}
                        className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-700 disabled:cursor-not-allowed text-black py-3 rounded-xl font-medium transition-colors"
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
            console.error('Failed to create room:', e);
            setCreateError(e.message || 'Something went wrong. Please try again.');
        }
        setCreating(false);
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center p-4">
            <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
                <div className="flex items-center justify-between mb-5">
                    <h3 className="text-white font-semibold text-lg">Create Study Room</h3>
                    <button onClick={onClose} className="text-zinc-500 hover:text-white"><X size={20} /></button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="text-xs text-zinc-400 mb-1.5 block">Room Name *</label>
                        <input
                            type="text"
                            value={form.name}
                            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                            placeholder="e.g. DSA Study Group, ML Paper Reading..."
                            className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 placeholder-zinc-500"
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="text-xs text-zinc-400 mb-1.5 block">Subject</label>
                        <select
                            value={form.subject}
                            onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                            className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500"
                        >
                            {SUBJECTS.map(s => <option key={s}>{s}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs text-zinc-400 mb-1.5 block">Description (optional)</label>
                        <textarea
                            value={form.description}
                            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                            placeholder="What will you study in this room?"
                            rows={2}
                            className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 placeholder-zinc-500 resize-none"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-zinc-400 mb-1.5 block">Room Color</label>
                        <div className="flex gap-2">
                            {ROOM_COLORS.map(c => (
                                <button
                                    key={c.value}
                                    onClick={() => setForm(f => ({ ...f, color: c.value }))}
                                    className={`flex-1 py-2.5 rounded-xl text-xs font-medium border transition-all ${form.color === c.value
                                        ? `${c.bg} ${c.border} ${c.text}`
                                        : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600'}`}
                                >
                                    {c.name}
                                </button>
                            ))}
                        </div>
                    </div>
                    {createError && (
                        <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">
                            {createError}
                        </p>
                    )}
                    <div className="flex gap-3 pt-2">
                        <button onClick={onClose} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-3 rounded-xl font-medium transition-colors">
                            Cancel
                        </button>
                        <button
                            onClick={handleCreate}
                            disabled={!form.name.trim() || creating}
                            className="flex-1 bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-700 disabled:cursor-not-allowed text-black py-3 rounded-xl font-medium transition-colors"
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
// Room Interior View  —  SSE replaced with Supabase Realtime
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
    const [activePanel, setActivePanel] = useState<'chat' | 'notes' | 'call'>('chat');
    const [livekitToken, setLivekitToken] = useState<string | null>(null);
    const [livekitUrl, setLivekitUrl] = useState<string>('');
    const [callMode, setCallMode] = useState<'video' | 'audio'>('video');
    const [callConnecting, setCallConnecting] = useState(false);

    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const notesTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    // Track optimistically added message IDs to avoid duplicates from Realtime echo
    const optimisticIds = useRef<Set<string>>(new Set());

    const theme = getColorTheme(initialRoom.color);

    // ── Supabase Realtime: subscribe to row changes for this room ──────────
    // Keep a stable ref to the main channel so sendMessage can broadcast on it
    const roomChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

    useEffect(() => {
        let isMounted = true;

        // Helper: read presence state and update activeUsers
        const syncPresence = (channel: ReturnType<typeof supabase.channel>) => {
            const state = channel.presenceState<{ name: string }>();
            const users = Object.entries(state).map(([id, presences]) => ({
                id,
                name: (presences as any[])[0]?.name ?? 'Anonymous',
            }));
            if (isMounted) setActiveUsers(users);
        };

        // Single channel that handles: broadcast messages, presence, AND postgres_changes
        // Using broadcast means messages arrive instantly without needing postgres_changes replication
        const roomChannel = supabase.channel(`room-${initialRoom.id}`, {
            config: { presence: { key: userId } },
        });

        roomChannelRef.current = roomChannel;

        roomChannel
            // ── Broadcast: new chat message (instant, no DB roundtrip needed for display) ──
            .on('broadcast', { event: 'new-message' }, ({ payload }) => {
                if (!isMounted) return;
                const msg = payload as Message;
                // Skip if this is our own optimistic echo
                if (optimisticIds.current.has(msg.id)) return;
                setMessages(prev => {
                    // Avoid duplicates
                    if (prev.some(m => m.id === msg.id)) return prev;
                    return [...prev, msg];
                });
            })
            // ── Broadcast: notes update ──
            .on('broadcast', { event: 'notes-update' }, ({ payload }) => {
                if (!isMounted) return;
                if (typeof payload.notes === 'string') {
                    setNotes(payload.notes);
                }
            })
            // ── Postgres changes: fallback / initial sync if broadcast missed ──
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${initialRoom.id}` },
                (payload) => {
                    if (!isMounted) return;
                    const updated = payload.new as any;
                    if (Array.isArray(updated.messages)) {
                        setMessages(prev => {
                            // Only replace if DB has more messages than local state
                            if (updated.messages.length >= prev.filter(m => !optimisticIds.current.has(m.id)).length) {
                                optimisticIds.current.clear();
                                return updated.messages;
                            }
                            return prev;
                        });
                    }
                    if (typeof updated.notes === 'string') {
                        setNotes(updated.notes);
                    }
                }
            )
            // ── Presence ──
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

    // Auto-scroll
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isAiLoading]);

    // ── Debounced notes sync ───────────────────────────────────────────────
    const syncNotes = useCallback((newNotes: string) => {
        if (notesTimeoutRef.current) clearTimeout(notesTimeoutRef.current);
        notesTimeoutRef.current = setTimeout(async () => {
            try {
                // Broadcast to other clients immediately
                if (roomChannelRef.current) {
                    await roomChannelRef.current.send({
                        type: 'broadcast',
                        event: 'notes-update',
                        payload: { notes: newNotes },
                    });
                }
                // Persist to DB
                await fetch('/api/rooms', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'update-notes', roomId: initialRoom.id, notes: newNotes, userName }),
                });
            } catch { /* ignore */ }
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
                body: JSON.stringify({
                    roomName: `room-${initialRoom.id}`,
                    participantName: userName,
                    userId,
                }),
            });
            const data = await res.json();
            if (data.token) {
                // Use the server-normalised wss:// URL from the API response.
                // This fixes the case where NEXT_PUBLIC_LIVEKIT_URL is set to
                // https:// or is missing/wrong in the browser environment.
                const serverUrl = data.url || process.env.NEXT_PUBLIC_LIVEKIT_URL || '';
                console.log('[livekit] connecting to:', serverUrl);
                if (!serverUrl) {
                    alert('LiveKit URL not configured. Set NEXT_PUBLIC_LIVEKIT_URL in .env.local');
                    return;
                }
                setLivekitUrl(serverUrl);
                setLivekitToken(data.token);
                setActivePanel('call');
            } else {
                // API returned an error body — surface it so the user isn't stuck
                console.error('LiveKit token error:', data.error ?? data);
                alert(`Could not start call: ${data.error ?? 'Unknown error'}`);
            }
        } catch (e) {
            console.error('Failed to get LiveKit token:', e);
            alert('Could not connect to call server. Please try again.');
        } finally {
            // FIX: always reset — previously this was outside the try/catch
            // so a missing `token` field left buttons permanently disabled.
            setCallConnecting(false);
        }
    };

    const leaveCall = () => {
        setLivekitToken(null);
        setActivePanel('chat');
    };

    // ── Send message ───────────────────────────────────────────────────────
    const sendMessage = async () => {
        if (!input.trim()) return;
        const content = input.trim();
        setInput('');

        // Build the optimistic message immediately so the sender sees it right away
        const optimisticId = 'opt-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
        const optimisticMsg: Message = {
            id: optimisticId,
            role: 'user',
            content,
            userName,
            timestamp: Date.now(),
        };
        optimisticIds.current.add(optimisticId);
        setMessages(prev => [...prev, optimisticMsg]);
        inputRef.current?.focus();

        try {
            // 1. Broadcast instantly to all clients in the room via Realtime
            if (roomChannelRef.current) {
                const broadcastMsg: Message = {
                    id: optimisticId, // reuse optimistic id so sender doesn't duplicate
                    role: 'user',
                    content,
                    userName,
                    timestamp: Date.now(),
                };
                await roomChannelRef.current.send({
                    type: 'broadcast',
                    event: 'new-message',
                    payload: broadcastMsg,
                });
            }

            // 2. Persist to Supabase for message history
            await fetch('/api/rooms', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'message', roomId: initialRoom.id, content, userName, userId }),
            });

            const isAiQuery = content.toLowerCase().startsWith('@ai');

            if (isAiQuery) {
                const cleanQuery = content.replace(/^@ai\s*/i, '');
                setIsAiLoading(true);
                try {
                    const aiRes = await fetch('/api/chat', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            message: cleanQuery,
                            history: messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
                            systemPrompt: `You are a helpful AI study assistant in a collaborative study room focused on "${initialRoom.subject}". Keep responses concise and helpful. You're part of a group study session — be friendly and encourage collaboration.`,
                        }),
                    });
                    const aiData = await aiRes.json();
                    await fetch('/api/rooms', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'ai-message', roomId: initialRoom.id, content: aiData.reply }),
                    });
                } finally {
                    setIsAiLoading(false);
                }
            }
        } catch (e) {
            console.error('Failed to send message:', e);
            // Remove the optimistic message on failure so user knows to retry
            optimisticIds.current.delete(optimisticId);
            setMessages(prev => prev.filter(m => m.id !== optimisticId));
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Room Header */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-zinc-800 bg-zinc-900">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onLeave}
                        className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${theme.from} ${theme.to} flex items-center justify-center text-white text-xs font-bold`}>
                        {initialRoom.name?.charAt(0)?.toUpperCase() ?? '?'}
                    </div>
                    <div>
                        <h2 className="text-sm font-semibold text-white">{initialRoom.name}</h2>
                        <p className={`text-xs ${theme.text}`}>{initialRoom.subject}</p>
                    </div>
                </div>

                {/* Active users (from Realtime presence) */}
                <div className="flex items-center gap-2">
                    {/* Call buttons */}
                    <button
                        onClick={() => joinCall('video')}
                        disabled={callConnecting}
                        title="Start video call"
                        className="p-2 rounded-xl bg-zinc-800 hover:bg-emerald-500/20 hover:text-emerald-400 text-zinc-400 transition-colors disabled:opacity-50"
                    >
                        <Video size={16} />
                    </button>
                    <button
                        onClick={() => joinCall('audio')}
                        disabled={callConnecting}
                        title="Start audio call"
                        className="p-2 rounded-xl bg-zinc-800 hover:bg-blue-500/20 hover:text-blue-400 text-zinc-400 transition-colors disabled:opacity-50"
                    >
                        <Phone size={16} />
                    </button>
                    <div className="flex -space-x-2">
                        {activeUsers.slice(0, 5).map((u) => (
                            <div
                                key={u.id}
                                className={`w-7 h-7 rounded-full bg-gradient-to-br ${theme.from} ${theme.to} flex items-center justify-center text-[10px] font-bold text-white border-2 border-zinc-900`}
                                title={u.name}
                            >
                                {u.name?.charAt(0)?.toUpperCase() ?? '?'}
                            </div>
                        ))}
                    </div>
                    <span className="text-xs text-zinc-400">{activeUsers.length} online</span>
                </div>
            </div>

            {/* Panel Tabs */}
            <div className="flex border-b border-zinc-800 bg-zinc-900/50">
                <button
                    onClick={() => setActivePanel('chat')}
                    className={`flex-1 py-2.5 text-xs font-medium transition-colors ${activePanel === 'chat' ? `${theme.text} border-b-2 ${theme.border}` : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                    💬 Chat
                </button>
                <button
                    onClick={() => setActivePanel('notes')}
                    className={`flex-1 py-2.5 text-xs font-medium transition-colors ${activePanel === 'notes' ? `${theme.text} border-b-2 ${theme.border}` : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                    📝 Shared Notes
                </button>
                <button
                    onClick={() => {
                        if (activePanel === 'call') {
                            setActivePanel('chat');
                        } else if (livekitToken) {
                            setActivePanel('call');
                        } else {
                            setActivePanel('call'); // show lobby
                        }
                    }}
                    className={`flex-1 py-2.5 text-xs font-medium transition-colors ${activePanel === 'call' ? `${theme.text} border-b-2 ${theme.border}` : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                    {livekitToken ? '🔴 In Call' : '📞 Call'}
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 flex overflow-hidden">
                {/* Call Panel */}
                {activePanel === 'call' && (
                    <div className="flex-1 flex flex-col bg-zinc-950">
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
                {/* Chat Panel */}
                <div className={`flex flex-col ${activePanel === 'chat' ? 'flex-1' : 'hidden md:flex md:flex-1'} ${activePanel === 'call' ? '!hidden' : ''} border-r border-zinc-800`}>
                    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                        {messages.length === 0 && (
                            <div className="text-center py-8">
                                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${theme.from} ${theme.to} flex items-center justify-center text-xl mx-auto mb-3`}>
                                    💬
                                </div>
                                <p className="text-zinc-400 text-sm mb-1">Start chatting!</p>
                                <p className="text-zinc-600 text-xs">
                                    End your message with <span className="text-zinc-400">?</span> or start with <span className={theme.text}>@ai</span> to get AI help
                                </p>
                            </div>
                        )}

                        {messages.map((msg) => (
                            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                {msg.role === 'assistant' && (
                                    <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${theme.from} ${theme.to} flex items-center justify-center text-[10px] font-bold text-white mr-2 mt-1 flex-shrink-0`}>
                                        AI
                                    </div>
                                )}
                                <div className="max-w-[80%]">
                                    {msg.role === 'user' && msg.userName && (
                                        <p className="text-[10px] text-zinc-500 mb-0.5 text-right">{msg.userName}</p>
                                    )}
                                    <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${msg.role === 'user'
                                        ? `bg-gradient-to-r ${theme.from} ${theme.to} text-white rounded-br-sm`
                                        : 'bg-zinc-800 text-zinc-100 rounded-bl-sm'}`}>
                                        {msg.content}
                                    </div>
                                </div>
                            </div>
                        ))}

                        {isAiLoading && (
                            <div className="flex justify-start items-center gap-2">
                                <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${theme.from} ${theme.to} flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0`}>
                                    AI
                                </div>
                                <div className="bg-zinc-800 rounded-2xl rounded-bl-sm px-4 py-2.5 flex gap-1.5 items-center">
                                    <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce [animation-delay:0ms]" />
                                    <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce [animation-delay:150ms]" />
                                    <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce [animation-delay:300ms]" />
                                </div>
                            </div>
                        )}
                        <div ref={bottomRef} />
                    </div>

                    {/* Input */}
                    <div className="px-4 py-3 border-t border-zinc-800 bg-zinc-900">
                        <div className="flex gap-2 items-center">
                            <input
                                ref={inputRef}
                                type="text"
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                                placeholder="Type a message... (end with ? for AI help)"
                                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 placeholder-zinc-500 text-white"
                            />
                            <button
                                onClick={sendMessage}
                                disabled={!input.trim()}
                                className={`bg-gradient-to-r ${theme.from} ${theme.to} hover:opacity-90 disabled:bg-zinc-700 disabled:from-zinc-700 disabled:to-zinc-700 disabled:cursor-not-allowed p-2.5 rounded-2xl transition-all flex-shrink-0`}
                            >
                                <Send size={18} className="text-white" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Notes Panel */}
                <div className={`flex flex-col ${activePanel === 'notes' ? 'flex-1' : 'hidden md:flex md:flex-1'} ${activePanel === 'call' ? '!hidden' : ''}`}>
                    <div className="px-4 py-2.5 border-b border-zinc-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <FileText size={14} className="text-zinc-400" />
                            <span className="text-xs text-zinc-400 font-medium">Shared Notepad</span>
                        </div>
                        <span className="text-[10px] text-zinc-600">Synced in real-time</span>
                    </div>
                    <textarea
                        value={notes}
                        onChange={e => handleNotesChange(e.target.value)}
                        placeholder="Start typing notes... Everyone in this room can see and edit this notepad."
                        className="flex-1 bg-zinc-950 text-zinc-200 text-sm p-4 resize-none focus:outline-none placeholder-zinc-600 leading-relaxed font-mono"
                    />
                </div>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Call Lobby — shown before joining
// ---------------------------------------------------------------------------
function CallLobby({
    theme,
    roomName,
    connecting,
    onJoinVideo,
    onJoinAudio,
}: {
    theme: ReturnType<typeof getColorTheme>;
    roomName: string;
    connecting: boolean;
    onJoinVideo: () => void;
    onJoinAudio: () => void;
}) {
    return (
        <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8 bg-zinc-950">
            <div className={`w-20 h-20 rounded-3xl bg-gradient-to-br ${theme.from} ${theme.to} flex items-center justify-center text-3xl`}>
                📞
            </div>
            <div className="text-center">
                <h3 className="text-white text-lg font-semibold mb-1">Group Call</h3>
                <p className="text-zinc-400 text-sm">{roomName} · Join with others in this room</p>
            </div>
            <div className="flex gap-3 flex-wrap justify-center">
                <button
                    onClick={onJoinVideo}
                    disabled={connecting}
                    className={`flex items-center gap-2 bg-gradient-to-r ${theme.from} ${theme.to} hover:opacity-90 disabled:opacity-50 text-white px-6 py-3 rounded-2xl font-medium transition-all text-sm`}
                >
                    <Video size={16} />
                    {connecting ? 'Connecting...' : 'Join with Video'}
                </button>
                <button
                    onClick={onJoinAudio}
                    disabled={connecting}
                    className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-200 px-6 py-3 rounded-2xl font-medium transition-all text-sm"
                >
                    <Mic size={16} />
                    {connecting ? 'Connecting...' : 'Audio Only'}
                </button>
            </div>
            <p className="text-zinc-600 text-xs text-center max-w-xs">
                Works anywhere — study with friends 1000 km away in real-time
            </p>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Group Call Panel — LiveKit room
// ---------------------------------------------------------------------------
function GroupCallPanel({
    token,
    serverUrl,
    mode,
    onLeave,
    theme,
}: {
    token: string;
    serverUrl: string;
    mode: 'video' | 'audio';
    onLeave: () => void;
    theme: ReturnType<typeof getColorTheme>;
}) {
    // serverUrl is passed down from joinCall (already normalised to wss:// by the API)
    const leavingRef = useRef(false);

    if (!serverUrl) {
        return (
            <div className="flex-1 flex items-center justify-center p-8 bg-zinc-950">
                <div className="text-center">
                    <p className="text-red-400 font-semibold mb-2">Configuration error</p>
                    <p className="text-zinc-400 text-sm">
                        LiveKit server URL is not configured. Set{' '}
                        <code>NEXT_PUBLIC_LIVEKIT_URL</code> in <code>.env.local</code>.
                    </p>
                    <button onClick={onLeave} className="mt-4 text-xs text-zinc-500 underline">Go back</button>
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

// Inner component that uses LiveKit hooks (must be inside LiveKitRoom)
function CallContent({
    mode,
    onLeave,
    theme,
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
        <div className="flex flex-col h-full bg-zinc-950">
            {/* Video / audio grid */}
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
            <div className="flex items-center justify-center gap-3 px-4 py-3 border-t border-zinc-800 bg-zinc-900">
                <button
                    onClick={toggleMic}
                    className={`p-3 rounded-2xl transition-all ${micEnabled ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300' : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'}`}
                    title={micEnabled ? 'Mute mic' : 'Unmute mic'}
                >
                    {micEnabled ? <Mic size={18} /> : <MicOff size={18} />}
                </button>
                {mode === 'video' && (
                    <button
                        onClick={toggleCam}
                        className={`p-3 rounded-2xl transition-all ${camEnabled ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300' : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'}`}
                        title={camEnabled ? 'Turn off camera' : 'Turn on camera'}
                    >
                        {camEnabled ? <Video size={18} /> : <VideoOff size={18} />}
                    </button>
                )}
                <button
                    onClick={onLeave}
                    className="p-3 rounded-2xl bg-red-500 hover:bg-red-400 text-white transition-all"
                    title="Leave call"
                >
                    <PhoneOff size={18} />
                </button>
            </div>
        </div>
    );
}

// Audio-only participant avatars
function AudioOnlyView({
    tracks,
    theme,
}: {
    tracks: ReturnType<typeof useTracks>;
    theme: ReturnType<typeof getColorTheme>;
}) {
    // Filter to microphone tracks only (Camera tracks are useless in audio-only mode)
    const audioTracks = tracks.filter(t => t.source === Track.Source.Microphone);

    if (audioTracks.length === 0) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <div className="text-4xl mb-3">🎙️</div>
                    <p className="text-zinc-500 text-sm">Waiting for others to join...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-wrap gap-4 items-center justify-center h-full p-4">
            {audioTracks.map((track) => (
                <div
                    key={track.participant.identity}
                    className={`flex flex-col items-center gap-2 p-4 rounded-2xl bg-zinc-900 border ${theme.border}`}
                >
                    <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${theme.from} ${theme.to} flex items-center justify-center text-2xl font-bold text-white`}>
                        {track.participant.name?.charAt(0)?.toUpperCase() ?? '?'}
                    </div>
                    <span className="text-xs text-zinc-400">{track.participant.name ?? track.participant.identity}</span>
                    <Mic size={12} className="text-emerald-400" />
                </div>
            ))}
        </div>
    );
}