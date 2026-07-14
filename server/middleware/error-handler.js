import { NODE_ENV } from '../config.js';

// Centralized Express error handler — catches any error passed to next(err)
// or thrown synchronously in a route, returning a consistent JSON envelope.
// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
    const status = err.status || err.statusCode || 500;
    const message = NODE_ENV === 'production'
        ? 'Internal server error'
        : (err.message || 'Internal server error');
    console.error(`[Error Handler] ${req.method} ${req.path} →`, err);
    res.status(status).json({ error: message });
};
