import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// Import split concerns from server/ directory
import { ALLOWED_ORIGINS, PORT, NODE_ENV } from './server/config.js';
import { errorHandler } from './server/middleware/error-handler.js';
import authRouter from './server/routes/auth.js';
import chatRouter from './server/routes/chat.js';
import telemetryRouter from './server/routes/telemetry.js';
import tasksRouter from './server/routes/tasks.js';

const app = express();

// Security: Restrict CORS to same-origin or known trusted origins
app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (e.g. curl, Postman in dev) only in non-production
        if (!origin && NODE_ENV !== 'production') return callback(null, true);
        if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true
}));

app.use(express.json());

// -----------------------------------------------------------------------------
// Route Mounts (Decoupled & Split concerns)
// -----------------------------------------------------------------------------
app.use('/api', authRouter);
app.use('/api', chatRouter);
app.use('/api', telemetryRouter);
app.use('/api', tasksRouter);

// -----------------------------------------------------------------------------
// Production Frontend Serving
// -----------------------------------------------------------------------------
if (NODE_ENV === 'production') {
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
// or thrown synchronously in any route.
app.use(errorHandler);

if (NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`🚀 MatchPulse API Server running securely on port ${PORT}`);
    });
}

export default app;
