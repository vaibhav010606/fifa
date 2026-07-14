import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';

let app;

beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test_secret_123';
    process.env.STAFF_ID = 'TEST_ADMIN';
    process.env.STAFF_PASSWORD = 'TEST_PASSWORD';
    
    const module = await import('../server.js');
    app = module.default;
});

describe('Backend Security Tests', () => {
    it('should authenticate valid staff and issue JWT', async () => {
        const res = await request(app)
            .post('/api/login')
            .send({ id: 'TEST_ADMIN', password: 'TEST_PASSWORD' });
        expect(res.status).toBe(200);
        expect(res.body.token).toBeDefined();
    });

    it('should reject invalid credentials', async () => {
        const res = await request(app)
            .post('/api/login')
            .send({ id: 'TEST_ADMIN', password: 'wrong_password' });
        expect(res.status).toBe(401);
    });

    it('should block unauthenticated telemetry stream access', async () => {
        const res = await request(app).get('/api/telemetry/stream');
        expect(res.status).toBe(401);
    });



    it('should rate limit chat API', async () => {
        for (let i = 0; i < 10; i++) {
            await request(app).post('/api/chat').send({ messages: [] });
        }
        const res = await request(app).post('/api/chat').send({ messages: [] });
        expect(res.status).toBe(429);
    });
});
