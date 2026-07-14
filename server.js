import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

// -----------------------------------------------------------------------------
// AI Proxy (Security)
// -----------------------------------------------------------------------------
const GROQ_KEYS = process.env.GROQ_KEYS ? process.env.GROQ_KEYS.split(',') : [];
const MODEL = 'llama-3.3-70b-versatile';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
let _keyIndex = 0;

function nextKey() {
    if (GROQ_KEYS.length === 0) return null;
    const key = GROQ_KEYS[_keyIndex];
    _keyIndex = (_keyIndex + 1) % GROQ_KEYS.length;
    return key;
}

app.post('/api/chat', async (req, res) => {
    try {
        const { messages, opts = {} } = req.body;
        const key = nextKey();
        
        if (!key) {
            return res.status(500).json({ error: 'No Groq API keys configured on server.' });
        }

        const groqRes = await fetch(GROQ_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${key}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: MODEL,
                messages,
                temperature: opts.temperature ?? 0.65,
                max_tokens: opts.max_tokens ?? 512,
                stream: false,
            }),
        });

        if (!groqRes.ok) {
            const err = await groqRes.text();
            return res.status(groqRes.status).json({ error: `Groq API ${groqRes.status}: ${err}` });
        }

        const data = await groqRes.json();
        res.json(data);
    } catch (error) {
        console.error("Server API Error:", error);
        res.status(500).json({ error: 'Internal server error processing AI request.' });
    }
});

// -----------------------------------------------------------------------------
// Real-time Telemetry (Efficiency) — Server-Sent Events (SSE)
// -----------------------------------------------------------------------------
let clients = [];

app.get('/api/telemetry/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Add client
    clients.push(res);
    req.on('close', () => {
        clients = clients.filter(client => client !== res);
    });
});

// Simulate real-time backend data updates every 5 seconds
setInterval(() => {
    const data = {
        timestamp: Date.now(),
        ping: 'keep-alive',
        // In a real app, updated density or incident objects would be sent here
        event: 'heartbeat'
    };
    const message = `data: ${JSON.stringify(data)}\n\n`;
    clients.forEach(client => client.write(message));
}, 5000);

// -----------------------------------------------------------------------------
// Production Frontend Serving
// -----------------------------------------------------------------------------
// Serve static frontend files from 'dist' when NODE_ENV is production
if (process.env.NODE_ENV === 'production') {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const distPath = path.join(__dirname, 'dist');
    
    app.use(express.static(distPath));
    
    // Fallback to index.html for Single Page Application routing
    app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
    });
}

app.listen(PORT, () => {
    console.log(`🚀 MatchPulse API Server running securely on port ${PORT}`);
    if (GROQ_KEYS.length === 0) {
        console.warn('⚠️ WARNING: GROQ_KEYS not found in .env');
    } else {
        console.log(`🔐 Loaded ${GROQ_KEYS.length} AI API Keys into secure environment.`);
    }
});
