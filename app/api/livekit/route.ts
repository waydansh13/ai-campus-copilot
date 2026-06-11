import { NextRequest, NextResponse } from 'next/server';
import * as jose from 'jose';

// livekit-server-sdk@2.15.4 builds the JWT with setProtectedHeader({ alg: 'HS256' })
// but omits the 'kid' field. LiveKit Cloud uses 'kid' to look up which API key signed
// the token — without it the server cannot verify the signature and returns "invalid token".
// Fix: build the JWT directly with jose (already a transitive dep of the SDK) and add kid.

function normaliseWsUrl(raw: string): string {
    const s = raw.trim();
    if (s.startsWith('wss://') || s.startsWith('ws://')) return s;
    if (s.startsWith('https://')) return 'wss://' + s.slice(8);
    if (s.startsWith('http://')) return 'ws://' + s.slice(7);
    return 'wss://' + s;
}

export async function POST(req: NextRequest) {
    try {
        const { roomName, participantName, userId } = await req.json();

        if (!roomName?.trim() || !participantName?.trim()) {
            return NextResponse.json(
                { error: 'roomName and participantName are required' },
                { status: 400 }
            );
        }

        // Trim everything — a stray newline/space breaks HMAC signature matching
        const apiKey = (process.env.LIVEKIT_API_KEY ?? '').trim();
        const apiSecret = (process.env.LIVEKIT_API_SECRET ?? '').trim();
        const rawUrl = (process.env.LIVEKIT_URL ?? process.env.NEXT_PUBLIC_LIVEKIT_URL ?? '').trim();

        if (!apiKey || !apiSecret) {
            console.error('[livekit] Missing LIVEKIT_API_KEY or LIVEKIT_API_SECRET');
            return NextResponse.json({ error: 'LiveKit credentials not configured' }, { status: 500 });
        }
        if (!rawUrl) {
            console.error('[livekit] Missing LIVEKIT_URL / NEXT_PUBLIC_LIVEKIT_URL');
            return NextResponse.json({ error: 'LiveKit server URL not configured' }, { status: 500 });
        }

        const wsUrl = normaliseWsUrl(rawUrl);
        const identity = (userId?.trim()) || participantName.trim();
        const secret = new TextEncoder().encode(apiSecret);

        // Build JWT manually so we can set kid in the protected header.
        // The SDK's AccessToken.toJwt() omits kid, which LiveKit Cloud requires.
        const token = await new jose.SignJWT({
            video: {
                roomJoin: true,
                room: roomName.trim(),
                canPublish: true,
                canSubscribe: true,
                canPublishData: true,
            },
            name: participantName.trim(),
        })
            .setProtectedHeader({ alg: 'HS256', kid: apiKey })  // ← kid is required by LiveKit Cloud
            .setIssuer(apiKey)
            .setSubject(identity)
            .setExpirationTime('4h')
            .setNotBefore(new Date())
            .sign(secret);

        console.log(
            `[livekit] Token OK | key="${apiKey.substring(0, 6)}..." keyLen=${apiKey.length} secretLen=${apiSecret.length} identity="${identity}" room="${roomName}" url="${wsUrl}"`
        );

        return NextResponse.json({ token, url: wsUrl });

    } catch (error) {
        console.error('[livekit] Token generation error:', error);
        return NextResponse.json(
            {
                error: 'Failed to generate token',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}