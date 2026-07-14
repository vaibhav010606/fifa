import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config.js';

/**
 * @middleware verifyToken
 * @desc Validates the JWT from Authorization header or query parameter
 */
export const verifyToken = (req, res, next) => {
    // Support both Authorization header and query param (needed for EventSource/SSE)
    const authHeader = req.headers.authorization;
    const queryToken = req.query.token;
    const token = authHeader && authHeader.startsWith('Bearer ')
        ? authHeader.split(' ')[1]
        : queryToken;

    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Forbidden' });
        req.user = user;
        next();
    });
};
