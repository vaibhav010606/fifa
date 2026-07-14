import express from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { STAFF_CREDENTIALS, JWT_SECRET } from '../config.js';
import { loginLimiter } from '../middleware/rate-limit.js';

const router = express.Router();

/**
 * @route POST /api/login
 * @desc Authenticate staff and return JWT
 * @security Rate limited (max 10 failed attempts per 15 mins)
 */
router.post('/login', loginLimiter, (req, res, next) => {
    try {
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
                const token = jwt.sign({ role: 'staff', id }, JWT_SECRET, { expiresIn: '8h' });
                return res.json({ token });
            }
        }
        
        res.status(401).json({ error: 'Invalid credentials' });
    } catch (err) {
        next(err);
    }
});

export default router;
