import dotenv from 'dotenv';

dotenv.config();

// Security: Reject well-known placeholder values that ship in the example .env.
// This prevents accidentally deploying with default credentials.
export const KNOWN_PLACEHOLDERS = new Set([
    'replace_with_a_long_random_secret_string',
    'replace_with_a_strong_password',
    'your_groq_api_key_here',
    'password123',
    'secret',
    'changeme',
]);

export const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.error('FATAL: JWT_SECRET environment variable is not set. Refusing to start.');
    process.exit(1);
}

if (KNOWN_PLACEHOLDERS.has(JWT_SECRET)) {
    console.error('FATAL: JWT_SECRET is set to a known placeholder value. Set a real secret before starting.');
    process.exit(1);
}

export const STAFF_CREDENTIALS = {
    id: process.env.STAFF_ID,
    password: process.env.STAFF_PASSWORD,
};

if (!STAFF_CREDENTIALS.id || !STAFF_CREDENTIALS.password) {
    console.error('FATAL: STAFF_ID and STAFF_PASSWORD environment variables are not set. Refusing to start.');
    process.exit(1);
}

if (KNOWN_PLACEHOLDERS.has(STAFF_CREDENTIALS.password)) {
    console.error('FATAL: STAFF_PASSWORD is set to a known placeholder value. Set a real password before starting.');
    process.exit(1);
}

export const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:3000', 'http://localhost:3001'];

export const GROQ_KEYS = process.env.GROQ_KEYS ? process.env.GROQ_KEYS.split(',') : [];
export const PORT = process.env.PORT || 3001;
export const NODE_ENV = process.env.NODE_ENV;
