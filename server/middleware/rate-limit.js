import rateLimit from 'express-rate-limit';

// Security: Tighter rate limits for sensitive routes

export const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
    skipSuccessfulRequests: true // Only count failed attempts
});

export const chatLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // limit each IP to 10 requests per windowMs
    message: { error: 'Too many AI requests from this IP, please try again later.' }
});
