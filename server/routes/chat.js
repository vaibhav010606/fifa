import express from 'express';
import { GROQ_KEYS } from '../config.js';
import { chatLimiter } from '../middleware/rate-limit.js';

const router = express.Router();

const MODEL = 'llama-3.3-70b-versatile';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
let _keyIndex = 0;

function nextKey() {
    if (GROQ_KEYS.length === 0) return null;
    const key = GROQ_KEYS[_keyIndex];
    _keyIndex = (_keyIndex + 1) % GROQ_KEYS.length;
    return key;
}

router.post('/chat', chatLimiter, async (req, res, next) => {
    try {
        const { messages, opts = {} } = req.body;

        // Security: Validate messages payload — prevent prompt injection and malformed input
        if (!Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({ error: 'messages must be a non-empty array.' });
        }
        if (messages.length > 20) {
            return res.status(400).json({ error: 'messages array exceeds maximum length of 20.' });
        }
        const validRoles = new Set(['user', 'assistant']);
        for (const msg of messages) {
            if (typeof msg.role !== 'string' || typeof msg.content !== 'string') {
                return res.status(400).json({ error: 'Each message must have string role and content.' });
            }
            // Security: Block client-injected 'system' role to prevent system prompt override
            if (!validRoles.has(msg.role)) {
                return res.status(400).json({ error: `Invalid message role: "${msg.role}". Only user/assistant allowed.` });
            }
            if (msg.content.length > 2000) {
                return res.status(400).json({ error: 'Message content exceeds 2000 character limit.' });
            }
        }

        // Security: Clamp opts to safe server-side ranges — client cannot override these
        const temperature = Math.min(1.0, Math.max(0.0, Number(opts.temperature) || 0.65));
        const max_tokens  = Math.min(1024, Math.max(64, Number(opts.max_tokens)  || 512));

        const key = nextKey();
        if (!key) {
            return res.status(500).json({ error: 'No Groq API keys configured on server.' });
        }

        // Resilience: abort if Groq takes longer than 15 s to prevent hung requests
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        let groqRes;
        try {
            groqRes = await fetch(GROQ_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${key}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: MODEL,
                    messages,
                    temperature,
                    max_tokens,
                    stream: false,
                }),
                signal: controller.signal,
            });
        } catch (fetchErr) {
            clearTimeout(timeoutId);
            if (fetchErr.name === 'AbortError') {
                return res.status(503).json({ error: 'AI service timed out. Please try again.' });
            }
            throw fetchErr;
        }
        clearTimeout(timeoutId);

        if (!groqRes.ok) {
            const err = await groqRes.text();
            return res.status(groqRes.status).json({ error: `Groq API ${groqRes.status}: ${err}` });
        }

        const data = await groqRes.json();
        res.json(data);
    } catch (error) {
        next(error);
    }
});

export default router;
