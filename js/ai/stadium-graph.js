// js/ai/stadium-graph.js
// LangGraph-style agentic conversation graph for the MatchPulse AI Assistant.
//
// Architecture:
//   START → [intent_router] → one of:
//     wayfinding_agent | food_agent | medical_agent |
//     seat_agent | transport_agent | general_agent
//   → END
//
// Each node receives the full GraphState and returns a partial state update.
// The graph is compiled once and reused across turns (stateful message history).

import { groqChat } from './groq-client.js';
import { ALL_FACILITIES, GATES_DATA, FOOD_DATA, WASHROOMS_DATA, MEDICAL_DATA, SUSTAINABILITY_METRICS } from '../data.js';

// ─── Stadium knowledge injected into every system prompt ───────────────────
const STADIUM_CONTEXT = `
You are MatchPulse AI, the official FIFA World Cup 2026 Stadium Assistant for the Olympic Stadium.
Tonight's match: Brazil vs. France — Quarter-Final (Match 42). Kick-off: 20:00 EST.
Stadium capacity: 68,400. Current attendance: 59,850. Security Level: 2 (Elevated).
Weather: 22°C, Clear, Wind 8 km/h NE.

SUSTAINABILITY & ECO-METRICS:
  Solar/LED Grid Efficiency: ${SUSTAINABILITY_METRICS.solarGridEfficiency}
  Carbon Saved Today: ${SUSTAINABILITY_METRICS.carbonSavedTodayKg}
  Green Transit Recommendation: ${SUSTAINABILITY_METRICS.ecoExitTip}

GATES (8 total):
${GATES_DATA.map(g => `  ${g.label}: Status=${g.status}, Wait=${g.waitTime}, Flow=${g.flowRate}. ${g.recommendation}`).join('\n')}

WASHROOMS (6):
${WASHROOMS_DATA.map(w => `  ${w.label}: Status=${w.status}, Wait=${w.waitTime}`).join('\n')}

MEDICAL HUBS (4):
${MEDICAL_DATA.map(m => `  ${m.label}: Status=${m.status}, Staff=${m.staffOnDuty}, Beds=${m.BedsAvailable}`).join('\n')}

FOOD COURTS (8):
${FOOD_DATA.map(f => `  ${f.label}: Wait=${f.waitTime}, Rating=${f.rating}/5, Menu: ${f.menu?.slice(0,2).join(', ')}`).join('\n')}

Rules:
- Be concise (2-4 sentences max).
- Always recommend the fastest or best option. Highlight sustainability/green savings when discussing transportation or exits.
- Speak in a helpful, energetic tone.
- If asked to show on map, respond with a JSON action tag: <action marker="MARKER_ID" type="show_marker"/>
- Valid marker IDs: ${ALL_FACILITIES.map(f => f.id).join(', ')}
`.trim();


// ─── Graph State ────────────────────────────────────────────────────────────
/**
 * @typedef {{
 *   messages: Array<{role:string, content:string}>,
 *   intent: string,
 *   targetMarkerId: string|null,
 *   responseText: string,
 *   userLang: string,
 * }} GraphState
 */

function createInitialState() {
    return {
        messages: [{ role: 'system', content: STADIUM_CONTEXT }],
        intent: 'general',
        targetMarkerId: null,
        responseText: '',
        userLang: 'EN',
    };
}

// ─── Intent Classifier Node ─────────────────────────────────────────────────
async function intentRouter(state) {
    const lastUser = [...state.messages].reverse().find(m => m.role === 'user');
    if (!lastUser) return { intent: 'general' };

    const classifyPrompt = [
        {
            role: 'system',
            content: `Classify the user's stadium query into exactly one category.
Reply with ONLY the category name, nothing else.
Categories: wayfinding | food | medical | seat | transport | alerts | general`,
        },
        { role: 'user', content: lastUser.content },
    ];

    try {
        const intent = (await groqChat(classifyPrompt, { max_tokens: 10, temperature: 0 }))
            .toLowerCase().trim().replace(/[^a-z]/g, '');
        const valid = ['wayfinding', 'food', 'medical', 'seat', 'transport', 'alerts', 'general'];
        return { intent: valid.includes(intent) ? intent : 'general' };
    } catch {
        return { intent: 'general' };
    }
}

// ─── Specialist Agent Nodes ─────────────────────────────────────────────────
async function wayfinderAgent(state) {
    const langRule = `\n\nIMPORTANT LANGUAGE RULE: You MUST respond entirely in ${state.userLang || 'EN'} language (EN=English, ES=Spanish, FR=French, PT=Portuguese, AR=Arabic).`;
    const messages = [
        { role: 'system', content: STADIUM_CONTEXT + '\n\nFocus: Gate entry, routes, walking directions, concourse navigation. Recommend the fastest gate. If relevant, include an <action> tag.' + langRule },
        ...state.messages.filter(m => m.role !== 'system'),
    ];
    const text = await groqChat(messages, { max_tokens: 350 });
    return { responseText: text };
}

async function foodAgent(state) {
    const langRule = `\n\nIMPORTANT LANGUAGE RULE: You MUST respond entirely in ${state.userLang || 'EN'} language (EN=English, ES=Spanish, FR=French, PT=Portuguese, AR=Arabic).`;
    const messages = [
        { role: 'system', content: STADIUM_CONTEXT + '\n\nFocus: Food courts, wait times, menu items, dietary options. Recommend the shortest queue. Include an <action> tag for the best food option.' + langRule },
        ...state.messages.filter(m => m.role !== 'system'),
    ];
    const text = await groqChat(messages, { max_tokens: 350 });
    return { responseText: text };
}

async function medicalAgent(state) {
    const langRule = `\n\nIMPORTANT LANGUAGE RULE: You MUST respond entirely in ${state.userLang || 'EN'} language (EN=English, ES=Spanish, FR=French, PT=Portuguese, AR=Arabic).`;
    const messages = [
        { role: 'system', content: STADIUM_CONTEXT + '\n\nFocus: Medical hubs, first aid, accessible facilities. Direct to nearest available hub. This is a priority response — be calm and efficient. Include an <action> tag.' + langRule },
        ...state.messages.filter(m => m.role !== 'system'),
    ];
    const text = await groqChat(messages, { max_tokens: 300 });
    return { responseText: text };
}

async function seatAgent(state) {
    const langRule = `\n\nIMPORTANT LANGUAGE RULE: You MUST respond entirely in ${state.userLang || 'EN'} language (EN=English, ES=Spanish, FR=French, PT=Portuguese, AR=Arabic).`;
    const messages = [
        { role: 'system', content: STADIUM_CONTEXT + '\n\nFocus: Seat locations, block/row numbers, nearest gate for a seat block, tier info (Lower/Upper). Be specific and helpful.' + langRule },
        ...state.messages.filter(m => m.role !== 'system'),
    ];
    const text = await groqChat(messages, { max_tokens: 300 });
    return { responseText: text };
}

async function transportAgent(state) {
    const langRule = `\n\nIMPORTANT LANGUAGE RULE: You MUST respond entirely in ${state.userLang || 'EN'} language (EN=English, ES=Spanish, FR=French, PT=Portuguese, AR=Arabic).`;
    const messages = [
        { role: 'system', content: STADIUM_CONTEXT + '\n\nFocus: Metro/subway, buses, parking, ride-share, exit strategy after the match. Give specific timing advice and highlight our Eco-Exit (Metro Red Line) for maximum carbon savings!' + langRule },
        ...state.messages.filter(m => m.role !== 'system'),
    ];
    const text = await groqChat(messages, { max_tokens: 350 });
    return { responseText: text };
}

async function alertsAgent(state) {
    const langRule = `\n\nIMPORTANT LANGUAGE RULE: You MUST respond entirely in ${state.userLang || 'EN'} language (EN=English, ES=Spanish, FR=French, PT=Portuguese, AR=Arabic).`;
    const messages = [
        { role: 'system', content: STADIUM_CONTEXT + '\n\nFocus: Live match alerts, crowd surges, security notices, gate advisories, half-time announcements. Be factual and brief.' + langRule },
        ...state.messages.filter(m => m.role !== 'system'),
    ];
    const text = await groqChat(messages, { max_tokens: 250 });
    return { responseText: text };
}

async function generalAgent(state) {
    const langRule = `\n\nIMPORTANT LANGUAGE RULE: You MUST respond entirely in ${state.userLang || 'EN'} language (EN=English, ES=Spanish, FR=French, PT=Portuguese, AR=Arabic).`;
    const messages = [
        { role: 'system', content: STADIUM_CONTEXT + langRule },
        ...state.messages.filter(m => m.role !== 'system'),
    ];
    const text = await groqChat(messages, { max_tokens: 400 });
    return { responseText: text };
}


// ─── Action Tag Parser ───────────────────────────────────────────────────────
function extractAction(text) {
    const match = text.match(/<action\s+marker="([^"]+)"\s+type="([^"]+)"\s*\/?>/i);
    if (!match) return { cleanText: text, markerId: null, type: null };
    return {
        cleanText: text.replace(match[0], '').trim(),
        markerId: match[1],
        type: match[2],
    };
}

// ─── StateGraph ──────────────────────────────────────────────────────────────
const AGENT_MAP = {
    wayfinding: wayfinderAgent,
    food: foodAgent,
    medical: medicalAgent,
    seat: seatAgent,
    transport: transportAgent,
    alerts: alertsAgent,
    general: generalAgent,
};

export class StadiumAIGraph {
    constructor() {
        /** @type {GraphState} */
        this.state = createInitialState();
    }

    /**
     * Run one turn of the conversation graph.
     * @param {string} userMessage
     * @param {string} userLang
     * @returns {Promise<{text:string, markerId:string|null, actionType:string|null, intent:string}>}
     */
    async invoke(userMessage, userLang = 'EN') {
        this.state.userLang = userLang;
        // 1. Append user message to state
        this.state.messages = [
            ...this.state.messages,
            { role: 'user', content: userMessage },
        ];

        // 2. Intent router node
        const routerUpdate = await intentRouter(this.state);
        this.state = { ...this.state, ...routerUpdate };

        // 3. Specialist agent node (based on intent)
        const agentFn = AGENT_MAP[this.state.intent] ?? generalAgent;
        const agentUpdate = await agentFn(this.state);
        this.state = { ...this.state, ...agentUpdate };

        // 4. Parse any embedded action tags from response
        const { cleanText, markerId, type } = extractAction(this.state.responseText);

        // 5. Append assistant response to conversation history
        this.state.messages = [
            ...this.state.messages,
            { role: 'assistant', content: cleanText },
        ];

        // Keep context window manageable (system + last 12 messages)
        if (this.state.messages.length > 14) {
            this.state.messages = [
                this.state.messages[0], // keep system prompt
                ...this.state.messages.slice(-12),
            ];
        }

        return {
            text: cleanText,
            markerId,
            actionType: type,
            intent: this.state.intent,
        };
    }

    /** Reset conversation history but keep the system prompt. */
    reset() {
        this.state = createInitialState();
    }
}

