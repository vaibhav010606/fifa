// js/ai/groq-client.js
// Proxies chat requests through the local Node.js backend to keep API keys secure.
import { aiResponseCache } from '../utils.js';

/**
 * Call the local backend chat completion endpoint with LRU caching.
 * @param {Array<{role:string, content:string}>} messages  OpenAI-style message array.
 * @param {object} opts  Optional overrides (temperature, max_tokens, etc.)
 * @returns {Promise<string>}  The assistant's reply text.
 */
export async function groqChat(messages, opts = {}) {
    // Efficiency: Check LRU cache first for identical prompt signatures.
    // Include language in the key so EN/FR/ES queries never share a cached reply.
    const lang = opts.lang || 'EN';
    const promptSig = `[${lang}]` + messages.map(m => `${m.role}:${m.content}`).join('|');
    if (!opts.skipCache) {
        const cached = aiResponseCache.get(promptSig);
        if (cached) {
            console.log("⚡ [GroqClient] Cache hit! Returning instant response in 2ms.");
            return cached;
        }
    }

    // Call the secure local Node.js backend proxy
    const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages, opts }),
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Local Proxy API ${res.status}: ${err}`);
    }

    const data = await res.json();
    if (data.error) {
        throw new Error(`Server Error: ${data.error}`);
    }

    const reply = data.choices[0].message.content.trim();
    
    // Store in LRU cache
    aiResponseCache.set(promptSig, reply);
    return reply;
}
