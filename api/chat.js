export const config = {
    runtime: 'edge',
};

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

export default async function handler(req) {
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
    }

    try {
        const body = await req.json();
        const { messages, opts = {} } = body;
        
        // Vercel Edge accesses env vars via process.env
        const GROQ_KEYS = process.env.GROQ_KEYS ? process.env.GROQ_KEYS.split(',') : [];
        if (GROQ_KEYS.length === 0) {
            return new Response(JSON.stringify({ error: 'No Groq API keys configured in Vercel.' }), { status: 500 });
        }

        // Just pick a random key for the edge function to avoid statefulness issues
        const key = GROQ_KEYS[Math.floor(Math.random() * GROQ_KEYS.length)];

        const groqRes = await fetch(GROQ_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${key}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages,
                temperature: opts.temperature ?? 0.65,
                max_tokens: opts.max_tokens ?? 512,
                stream: false,
            }),
        });

        if (!groqRes.ok) {
            const err = await groqRes.text();
            return new Response(JSON.stringify({ error: `Groq API Error: ${err}` }), { status: groqRes.status });
        }

        const data = await groqRes.json();
        return new Response(JSON.stringify(data), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error("Vercel Edge API Error:", error);
        return new Response(JSON.stringify({ error: `Internal server error: ${error.message || String(error)}`, stack: error.stack }), { status: 500 });
    }
}
