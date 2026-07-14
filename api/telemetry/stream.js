export const config = {
    runtime: 'edge',
};

export default function handler(_req) {
    const stream = new ReadableStream({
        start(controller) {
            const data = {
                timestamp: Date.now(),
                ping: 'keep-alive',
                event: 'heartbeat'
            };
            const msg = `data: ${JSON.stringify(data)}\n\n`;
            controller.enqueue(new TextEncoder().encode(msg));
            controller.close(); // Close immediately to avoid edge timeouts; EventSource will auto-reconnect
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
}
