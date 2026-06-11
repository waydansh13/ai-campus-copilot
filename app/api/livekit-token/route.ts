import { AccessToken } from 'livekit-server-sdk';

export async function POST(req: Request) {
  const { roomName, userName } = await req.json();

  const token = new AccessToken(
    process.env.LIVEKIT_API_KEY!,
    process.env.LIVEKIT_API_SECRET!,
    {
      identity: userName,
    }
  );

  token.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
  });

  return Response.json({
    token: await token.toJwt(),
  });
}