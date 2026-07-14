import express from 'express';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

const volunteerTasks = [
    { id: 'T-101', title: 'Restock Concessions', zone: 'Sector B', priority: 'medium', status: 'pending' },
    { id: 'T-102', title: 'Medical Assist', zone: 'Gate C', priority: 'high', status: 'pending' }
];
let _taskIdCounter = 103; // Monotonic counter — avoids Math.random() collision risk

router.get('/tasks', verifyToken, (req, res, next) => {
    try {
        res.json(volunteerTasks);
    } catch (err) {
        next(err);
    }
});

router.post('/tasks', verifyToken, (req, res, next) => {
    try {
        const { title, zone, priority } = req.body;
        if (!title || !zone || !priority) return res.status(400).json({ error: 'Missing fields' });

        const newTask = {
            id: 'T-' + _taskIdCounter++,
            title, zone, priority, status: 'pending'
        };
        volunteerTasks.push(newTask);
        res.status(201).json(newTask);
    } catch (err) {
        next(err);
    }
});

export default router;
