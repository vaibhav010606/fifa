import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';

dotenv.config();

const app = express();

// Security: Restrict CORS to same-origin or known trusted origins
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:3000', 'http://localhost:3001'];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (e.g. curl, Postman in dev) only in non-production
        if (!origin && process.env.NODE_ENV !== 'production') return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true
}));
app.use(express.json());

const PORT = process.env.PORT || 3001;

// -----------------------------------------------------------------------------
// Authentication & Security Middleware
// -----------------------------------------------------------------------------
// Security: Fail fast on missing secrets
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.error('FATAL: JWT_SECRET environment variable is not set. Refusing to start.');
    process.exit(1);
}
const EFFECTIVE_JWT_SECRET = JWT_SECRET;

const STAFF_CREDENTIALS = {
    id: process.env.STAFF_ID,
    password: process.env.STAFF_PASSWORD
};

if (!STAFF_CREDENTIALS.id || !STAFF_CREDENTIALS.password) {
    console.error('FATAL: STAFF_ID and STAFF_PASSWORD environment variables are not set. Refusing to start.');
    process.exit(1);
}

// Security: Reject well-known placeholder values that ship in the example .env.
// This prevents accidentally deploying with default credentials.
const KNOWN_PLACEHOLDERS = new Set([
    'replace_with_a_long_random_secret_string',
    'replace_with_a_strong_password',
    'your_groq_api_key_here',
    'password123',
    'secret',
    'changeme',
]);
if (KNOWN_PLACEHOLDERS.has(JWT_SECRET)) {
    console.error('FATAL: JWT_SECRET is set to a known placeholder value. Set a real secret before starting.');
    process.exit(1);
}
if (KNOWN_PLACEHOLDERS.has(STAFF_CREDENTIALS.password)) {
    console.error('FATAL: STAFF_PASSWORD is set to a known placeholder value. Set a real password before starting.');
    process.exit(1);
}

// Security: Rate limit login attempts to prevent brute-force
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
    skipSuccessfulRequests: true // Only count failed attempts
});

/**
 * @route POST /api/login
 * @desc Authenticate staff and return JWT
 * @security Rate limited (max 10 failed attempts per 15 mins)
 */
app.post('/api/login', loginLimiter, (req, res) => {
    const { id, password } = req.body;
    if (!id || !password) {
        return res.status(400).json({ error: 'Staff ID and password are required.' });
    }
    if (id === STAFF_CREDENTIALS.id) {
        const providedBuffer = Buffer.from(password, 'utf8');
        const expectedBuffer = Buffer.from(STAFF_CREDENTIALS.password, 'utf8');
        
        let isValid = false;
        if (providedBuffer.length === expectedBuffer.length) {
            isValid = crypto.timingSafeEqual(providedBuffer, expectedBuffer);
        }

        if (isValid) {
            const token = jwt.sign({ role: 'staff', id }, EFFECTIVE_JWT_SECRET, { expiresIn: '8h' });
            return res.json({ token });
        }
    }
    
    res.status(401).json({ error: 'Invalid credentials' });
});

/**
 * @middleware verifyToken
 * @desc Validates the JWT from Authorization header or query parameter
 */
const verifyToken = (req, res, next) => {
    // Support both Authorization header and query param (needed for EventSource/SSE)
    const authHeader = req.headers.authorization;
    const queryToken = req.query.token;
    const token = authHeader && authHeader.startsWith('Bearer ')
        ? authHeader.split(' ')[1]
        : queryToken;

    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    jwt.verify(token, EFFECTIVE_JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Forbidden' });
        req.user = user;
        next();
    });
};

const chatLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // limit each IP to 10 requests per windowMs
    message: { error: 'Too many AI requests from this IP, please try again later.' }
});

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

app.post('/api/chat', chatLimiter, async (req, res) => {
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
        console.error("Server API Error:", error);
        res.status(500).json({ error: 'Internal server error processing AI request.' });
    }
});

// -----------------------------------------------------------------------------
// Real-time Telemetry (Efficiency) — Server-Sent Events (SSE)
// -----------------------------------------------------------------------------
let clients = [];

app.get('/api/telemetry/stream', verifyToken, (req, res) => {
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
let densitySim = 75;
let lastTelemetryState = '{}';

if (process.env.NODE_ENV !== 'test') {
    setInterval(() => {
        // Only send if there's an actual update (Smart SSE)
        // Let's simulate a density change 30% of the time
        if (Math.random() > 0.7) {
            densitySim += (Math.random() * 10 - 5);
            densitySim = Math.max(10, Math.min(100, densitySim));

            const data = {
                timestamp: Date.now(),
                event: 'telemetry_update',
                payload: {
                    globalDensity: densitySim.toFixed(1),
                    criticalIncident: Math.random() > 0.95 // 5% chance of incident
                }
            };

            const stateStr = JSON.stringify(data);
            if (stateStr !== lastTelemetryState) {
                lastTelemetryState = stateStr;
                const message = `data: ${stateStr}\n\n`;
                clients.forEach(client => client.write(message));
            }
        }
    }, 2000);
}

// -----------------------------------------------------------------------------
// Tasks API (Persistent Backend Logic)
// -----------------------------------------------------------------------------
let volunteerTasks = [
    { id: 'T-101', title: 'Restock Concessions', zone: 'Sector B', priority: 'medium', status: 'pending' },
    { id: 'T-102', title: 'Medical Assist', zone: 'Gate C', priority: 'high', status: 'pending' }
];
let _taskIdCounter = 103; // Monotonic counter — avoids Math.random() collision risk

app.get('/api/tasks', verifyToken, (req, res) => {
    res.json(volunteerTasks);
});

app.post('/api/tasks', verifyToken, (req, res) => {
    const { title, zone, priority } = req.body;
    if (!title || !zone || !priority) return res.status(400).json({ error: 'Missing fields' });

    const newTask = {
        id: 'T-' + _taskIdCounter++,
        title, zone, priority, status: 'pending'
    };
    volunteerTasks.push(newTask);
    res.status(201).json(newTask);
});

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

// Centralized Express error handler — catches any error passed to next(err)
// or thrown synchronously in a route, returns a consistent JSON error envelope.
// Must be defined AFTER all routes and BEFORE app.listen.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    const status = err.status || err.statusCode || 500;
    const message = process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : (err.message || 'Internal server error');
    console.error(`[Error Handler] ${req.method} ${req.path} →`, err);
    res.status(status).json({ error: message });
});

if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`🚀 MatchPulse API Server running securely on port ${PORT}`);
        if (GROQ_KEYS.length === 0) {
            console.warn('⚠️ WARNING: GROQ_KEYS not found in .env');
        } else {
            console.log(`🔐 Loaded ${GROQ_KEYS.length} AI API Keys into secure environment.`);
        }
    });
}

export default app;
