// /home/workdir/ai-campus-copilot/app/api/rooms/store.ts

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// In-memory cache
let roomsCache = new Map<string, RoomData>();

export type Message = {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    userName?: string;
    timestamp: number;
};

export type RoomData = {
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

export const generateId = () => 'room-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 9);

export function serializeRoom(room: RoomData): any {
    return {
        ...room,
        messages: room.messages || [],
        activeUsers: room.activeUsers || [],
    };
}

// Broadcast via Supabase Realtime (or just update DB, since frontend subscribes)
export async function broadcastToRoom(roomId: string, update: Partial<RoomData>) {
    try {
        const { error } = await supabase
            .from('rooms')
            .update(update)
            .eq('id', roomId);

        if (error) console.error('Broadcast error:', error);
    } catch (e) {
        console.error('Failed to broadcast:', e);
    }
}

// Get all rooms
export async function getAllRooms(): Promise<RoomData[]> {
    try {
        const { data, error } = await supabase
            .from('rooms')
            .select('*')
            .order('createdAt', { ascending: false });

        if (error) throw error;

        return (data || []).map(r => ({
            ...r,
            messages: r.messages || [],
            activeUsers: r.activeUsers || [],
        }));
    } catch (e) {
        console.error('Failed to fetch rooms:', e);
        return Array.from(roomsCache.values());
    }
}

// Get single room
export async function getRoom(roomId: string): Promise<RoomData | null> {
    try {
        const cached = roomsCache.get(roomId);
        if (cached) return cached;

        const { data, error } = await supabase
            .from('rooms')
            .select('*')
            .eq('id', roomId)
            .single();

        if (error || !data) return null;

        const room: RoomData = {
            ...data,
            messages: data.messages || [],
            activeUsers: data.activeUsers || [],
        };
        roomsCache.set(roomId, room);
        return room;
    } catch (e) {
        console.error('Failed to get room:', e);
        return roomsCache.get(roomId) || null;
    }
}

// Create room
export async function createRoom(data: Omit<RoomData, 'id' | 'createdAt' | 'messages' | 'activeUsers' | 'notes'>): Promise<RoomData> {
    const room: RoomData = {
        id: generateId(),
        createdAt: new Date().toISOString(),
        notes: '',
        messages: [],
        activeUsers: [],
        ...data,
    };

    try {
        const { error } = await supabase
            .from('rooms')
            .insert([{
                ...room,
                messages: [],
                activeUsers: [],
            }]);

        if (error) throw error;

        roomsCache.set(room.id, room);
        return room;
    } catch (e) {
        console.error('Failed to create room:', e);
        roomsCache.set(room.id, room);
        return room;
    }
}

// Add message
export async function addMessage(roomId: string, message: Message) {
    const room = await getRoom(roomId);
    if (!room) return null;

    room.messages.push(message);
    room.messages = room.messages.slice(-100); // keep last 100

    await broadcastToRoom(roomId, { messages: room.messages });
    roomsCache.set(roomId, room);
    return room;
}

// Update notes
export async function updateNotes(roomId: string, notes: string, userName?: string) {
    const room = await getRoom(roomId);
    if (!room) return null;

    room.notes = notes;
    await broadcastToRoom(roomId, { notes });
    roomsCache.set(roomId, room);
    return room;
}

// Delete room
export async function deleteRoom(roomId: string) {
    try {
        await supabase.from('rooms').delete().eq('id', roomId);
        roomsCache.delete(roomId);
    } catch (e) {
        console.error('Failed to delete:', e);
    }
}

// Join (mostly handled by presence in frontend)
export async function joinRoom(roomId: string): Promise<RoomData | null> {
    return getRoom(roomId);
}