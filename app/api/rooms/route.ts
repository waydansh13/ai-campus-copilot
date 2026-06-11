import { supabase } from '@/lib/supabase';
import { NextRequest } from 'next/server';

function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

// GET /api/rooms — list all rooms from Supabase
export async function GET() {
    const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json(
        (data ?? []).map(room => ({
            ...room,
            activeUsers: [],
            messages: [],
        }))
    );
}

// POST /api/rooms — all actions persist directly to Supabase
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { action } = body;

        switch (action) {
            case 'create': {
                const { name, subject, description, color } = body;
                const id = generateId();

                const { data, error } = await supabase
                    .from('rooms')
                    .insert({
                        id,
                        name,
                        subject,
                        description,
                        color,
                        notes: '',
                        created_at: new Date().toISOString(),
                    })
                    .select();

                if (error) return Response.json({ error: error.message }, { status: 500 });
                return Response.json({ success: true, room: data?.[0] });
            }

            case 'join': {
                // Return current room data so the client can initialise
                const { roomId } = body;
                const { data, error } = await supabase
                    .from('rooms')
                    .select('*')
                    .eq('id', roomId)
                    .single();

                if (error || !data) return Response.json({ error: 'Room not found' }, { status: 404 });
                return Response.json({ ...data, activeUsers: [] });
            }

            case 'leave': {
                // Presence is handled client-side via Supabase Realtime — nothing to do server-side
                return Response.json({ success: true });
            }

            case 'heartbeat': {
                // Handled by Supabase Realtime presence — nothing to do server-side
                return Response.json({ success: true });
            }

            case 'message': {
                const { roomId, content, userName, userId } = body;

                // Fetch current messages
                const { data: room, error: fetchErr } = await supabase
                    .from('rooms')
                    .select('messages')
                    .eq('id', roomId)
                    .single();

                if (fetchErr || !room) return Response.json({ error: 'Room not found' }, { status: 404 });

                const msg = {
                    id: generateId(),
                    role: 'user' as const,
                    content,
                    userName,
                    userId,
                    timestamp: Date.now(),
                };

                const updatedMessages = [...(room.messages ?? []), msg];

                const { error: updateErr } = await supabase
                    .from('rooms')
                    .update({ messages: updatedMessages })
                    .eq('id', roomId);

                if (updateErr) return Response.json({ error: updateErr.message }, { status: 500 });
                return Response.json(msg);
            }

            case 'ai-message': {
                const { roomId, content } = body;

                const { data: room, error: fetchErr } = await supabase
                    .from('rooms')
                    .select('messages')
                    .eq('id', roomId)
                    .single();

                if (fetchErr || !room) return Response.json({ error: 'Room not found' }, { status: 404 });

                const msg = {
                    id: generateId(),
                    role: 'assistant' as const,
                    content,
                    userName: 'AI Assistant',
                    timestamp: Date.now(),
                };

                const updatedMessages = [...(room.messages ?? []), msg];

                const { error: updateErr } = await supabase
                    .from('rooms')
                    .update({ messages: updatedMessages })
                    .eq('id', roomId);

                if (updateErr) return Response.json({ error: updateErr.message }, { status: 500 });
                return Response.json(msg);
            }

            case 'update-notes': {
                const { roomId, notes } = body;

                const { error } = await supabase
                    .from('rooms')
                    .update({ notes })
                    .eq('id', roomId);

                if (error) return Response.json({ error: error.message }, { status: 500 });
                return Response.json({ success: true });
            }

            case 'get-room': {
                const { roomId } = body;
                const { data, error } = await supabase
                    .from('rooms')
                    .select('*')
                    .eq('id', roomId)
                    .single();

                if (error || !data) return Response.json({ error: 'Room not found' }, { status: 404 });
                return Response.json({
                    ...data,
                    activeUsers: [],
                    messages: [],
                });
            }

            case 'delete': {
                const { roomId } = body;
                await supabase.from('rooms').delete().eq('id', roomId);
                return Response.json({ success: true });
            }

            default:
                return Response.json({ error: 'Unknown action' }, { status: 400 });
        }
    } catch (error: any) {
        console.error('Rooms API error:', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
}