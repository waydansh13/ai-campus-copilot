'use client';

import {
  LiveKitRoom,
  VideoConference,
} from '@livekit/components-react';

import '@livekit/components-styles';

export default function VideoRoom({
  token,
}: {
  token: string;
}) {
  return (
    <LiveKitRoom
      token={token}
      serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
      connect
      video
      audio
    >
      <VideoConference />
    </LiveKitRoom>
  );
}