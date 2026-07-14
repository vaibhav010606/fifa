import express from 'express';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

let clients = [];

router.get('/telemetry/stream', verifyToken, (req, res, next) => {
    try {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // Add client
        clients.push(res);
        req.on('close', () => {
            clients = clients.filter(client => client !== res);
        });
    } catch (err) {
        next(err);
    }
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

export default router;
export { clients }; // Exported to allow E2E/integration test inspection if needed
