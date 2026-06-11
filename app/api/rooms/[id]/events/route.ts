import { sseClients, generateId } from '../../store';

// Prevent Next.js from caching this route
export const dynamic = 'force-dynamic';

// GET /api/rooms/[id]/events — SSE stream for real-time room updates
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: roomId } = await params;
  const clientId = generateId();

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Register this client
      sseClients.set(clientId, { controller, roomId });

      // Send initial connection event
      controller.enqueue(
        encoder.encode(`event: connected\ndata: ${JSON.stringify({ clientId })}\n\n`)
      );

      // Keep-alive ping every 15 seconds
      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: keepalive\n\n`));
        } catch {
          clearInterval(keepAlive);
          sseClients.delete(clientId);
        }
      }, 15000);

      // Clean up on abort
      request.signal.addEventListener('abort', () => {
        clearInterval(keepAlive);
        sseClients.delete(clientId);
        try {
          controller.close();
        } catch {
          // Already closed
        }
      });
    },
    cancel() {
      sseClients.delete(clientId);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
