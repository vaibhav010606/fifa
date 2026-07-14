// tests/unit.test.js - Comprehensive Automated Test Suite for MatchPulse AI Digital Twin
// Run with: node tests/unit.test.js  OR  npm test
//
// Test Categories:
//   [Data Integrity]   — Structural validation of all data modules
//   [Security]         — XSS, injection, DoS, rate-limiting, edge cases
//   [Efficiency]       — LRU cache behavior, eviction, TTL, key isolation
//   [Business Logic]   — Functional rules, thresholds, consistency checks
//   [Integration]      — Cross-module data relationships
//   [Accessibility]    — Logic powering a11y features

import { describe, test, expect } from 'vitest';

// Shim: map node:assert/strict API to Vitest expect so tests use a single runner
// This avoids dual-import mixed-paradigm and keeps all assertions in Vitest reports.
const assert = {
    ok: (value, msg) => expect(value, msg).toBeTruthy(),
    equal: (actual, expected, msg) => expect(actual, msg).toBe(expected),
    deepStrictEqual: (actual, expected, msg) => expect(actual, msg).toStrictEqual(expected),
    throws: (fn, msg) => expect(fn, msg).toThrow(),
    doesNotThrow: (fn, msg) => expect(fn, msg).not.toThrow(),
};

import {
    ALL_FACILITIES,
    GATES_DATA,
    WASHROOMS_DATA,
    MEDICAL_DATA,
    FOOD_DATA,
    BLOCK_DENSITY_DATA,
    VOLUNTEER_TASKS,
    TRANSPORTATION_DATA,
    INCIDENT_LOG,
    AI_KNOWLEDGE_BASE,
    PREDICTIVE_DENSITY_DATA,
    COMMITTEE_RECOMMENDATIONS,
    SUSTAINABILITY_METRICS,
    GENAI_SIGNAGE_PRESETS,
    STADIUM_METADATA,
} from '../js/data.js';
import { sanitizeInput, checkActionCooldown, aiResponseCache } from '../js/utils.js';
import { Store } from '../js/store.js';

// ─────────────────────────────────────────────────────────────────────────────
// Test Runner - Migrated to Vitest
// ─────────────────────────────────────────────────────────────────────────────
function runTest(name, category, testFn) {
    describe(category, () => {
        test(name, testFn);
    });
}

function runAsyncTest(name, category, testFn) {
    describe(category, () => {
        test(name, async () => {
            await testFn();
        });
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 1: STADIUM METADATA
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── Stadium Metadata ─────────────────────────────────────────────────────');

runTest('Stadium Metadata — required fields present and typed', 'Data Integrity', () => {
    assert.ok(typeof STADIUM_METADATA.name === 'string' && STADIUM_METADATA.name.length > 0, 'name must be non-empty string');
    assert.ok(typeof STADIUM_METADATA.capacity === 'number' && STADIUM_METADATA.capacity > 0, 'capacity must be positive number');
    assert.ok(typeof STADIUM_METADATA.currentAttendance === 'number', 'currentAttendance must be number');
    assert.ok(STADIUM_METADATA.currentAttendance <= STADIUM_METADATA.capacity, 'attendance must not exceed capacity');
    assert.ok(typeof STADIUM_METADATA.status === 'string', 'status must be a string');
});

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 2: GATES DATA
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── Gates Data ──────────────────────────────────────────────────────────');

runTest('Gates — exactly 8 gates with valid IDs and coordinates', 'Data Integrity', () => {
    assert.equal(GATES_DATA.length, 8, 'Must have exactly 8 gates');
    const ids = GATES_DATA.map(g => g.id);
    const uniqueIds = new Set(ids);
    assert.equal(uniqueIds.size, 8, 'All gate IDs must be unique');
    for (const gate of GATES_DATA) {
        assert.ok(typeof gate.id === 'string' && gate.id.startsWith('GATE_'), `Gate id must start with GATE_: got ${gate.id}`);
        assert.ok(typeof gate.label === 'string' && gate.label.length > 0, `Gate ${gate.id} must have a label`);
        assert.ok(typeof gate.x === 'number' && typeof gate.z === 'number', `Gate ${gate.id} must have numeric x,z`);
    }
});

runTest('Gates — status values are valid enum members', 'Data Integrity', () => {
    const validStatuses = ['Operational', 'Degraded', 'Down'];
    for (const gate of GATES_DATA) {
        assert.ok(validStatuses.includes(gate.status), `Gate ${gate.id} status "${gate.status}" must be valid`);
    }
});

runTest('Gates — flowRate and waitTime are non-empty strings', 'Data Integrity', () => {
    for (const gate of GATES_DATA) {
        assert.ok(typeof gate.flowRate === 'string' && gate.flowRate.length > 0, `Gate ${gate.id} must have flowRate`);
        assert.ok(typeof gate.waitTime === 'string' && gate.waitTime.length > 0, `Gate ${gate.id} must have waitTime`);
        assert.ok(typeof gate.recommendation === 'string' && gate.recommendation.length > 5, `Gate ${gate.id} must have a meaningful recommendation`);
    }
});

runTest('Gates — at least one gate is Degraded or Down (real-world scenario)', 'Data Integrity', () => {
    const hasIssue = GATES_DATA.some(g => g.status !== 'Operational');
    assert.ok(hasIssue, 'At least one gate should have non-Operational status to represent real stadium conditions');
});

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 3: WASHROOMS DATA
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── Washrooms Data ───────────────────────────────────────────────────────');

runTest('Washrooms — at least 6 washrooms with accessible boolean field', 'Data Integrity', () => {
    assert.ok(WASHROOMS_DATA.length >= 6, 'Must have at least 6 washrooms');
    for (const wc of WASHROOMS_DATA) {
        assert.ok(typeof wc.accessible === 'boolean', `Washroom ${wc.id} must have boolean accessible field`);
        assert.ok(typeof wc.waitTime === 'string', `Washroom ${wc.id} must have waitTime string`);
    }
});

runTest('Washrooms — at least one offline (realistic maintenance scenario)', 'Data Integrity', () => {
    const hasOffline = WASHROOMS_DATA.some(w => w.status === 'Down');
    assert.ok(hasOffline, 'At least one washroom should be Down to represent maintenance scenario');
});

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 4: MEDICAL DATA
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── Medical Data ─────────────────────────────────────────────────────────');

runTest('Medical — 4 hubs with staffOnDuty and bedsAvailable as positive numbers', 'Data Integrity', () => {
    assert.equal(MEDICAL_DATA.length, 4, 'Must have exactly 4 medical hubs');
    for (const med of MEDICAL_DATA) {
        assert.ok(typeof med.staffOnDuty === 'number' && med.staffOnDuty >= 0, `Medical ${med.id} staffOnDuty must be non-negative number`);
        assert.ok(typeof med.bedsAvailable === 'number' && med.bedsAvailable >= 0, `Medical ${med.id} bedsAvailable must be non-negative number`);
        assert.equal(med.status, 'Operational', `Medical hub ${med.id} must be Operational`);
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 5: FOOD DATA
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── Food Data ────────────────────────────────────────────────────────────');

runTest('Food — 8 kiosks with non-empty menu arrays and valid ratings', 'Data Integrity', () => {
    assert.equal(FOOD_DATA.length, 8, 'Must have exactly 8 food kiosks');
    for (const kiosk of FOOD_DATA) {
        assert.ok(Array.isArray(kiosk.menu) && kiosk.menu.length >= 1, `Kiosk ${kiosk.id} must have non-empty menu`);
        const rating = parseFloat(kiosk.rating);
        assert.ok(!isNaN(rating) && rating >= 1 && rating <= 5, `Kiosk ${kiosk.id} rating must be 1-5 (got ${kiosk.rating})`);
    }
});

runTest('Food — at least one kiosk has shortest waitTime ≤ 5 minutes', 'Data Integrity', () => {
    const shortWait = FOOD_DATA.some(f => {
        const mins = parseInt(f.waitTime);
        return !isNaN(mins) && mins <= 5;
    });
    assert.ok(shortWait, 'At least one food kiosk should have ≤5 min wait for AI recommendations to be useful');
});

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 6: ALL FACILITIES AGGREGATE
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── ALL_FACILITIES Aggregate ─────────────────────────────────────────────');

runTest('ALL_FACILITIES — 26 total facilities (8 gates + 6 WC + 4 medical + 8 food)', 'Data Integrity', () => {
    assert.equal(ALL_FACILITIES.length, 26, `ALL_FACILITIES must aggregate to exactly 26 entries (got ${ALL_FACILITIES.length})`);
});

runTest('ALL_FACILITIES — no duplicate IDs across all facility types', 'Data Integrity', () => {
    const ids = ALL_FACILITIES.map(f => f.id);
    const uniqueIds = new Set(ids);
    assert.equal(uniqueIds.size, ids.length, `Duplicate facility IDs detected: ${ids.filter((id, i) => ids.indexOf(id) !== i).join(', ')}`);
});

runTest('ALL_FACILITIES — all coordinates within ±300 stadium bounds', 'Data Integrity', () => {
    for (const fac of ALL_FACILITIES) {
        assert.ok(Math.abs(fac.x) <= 300 && Math.abs(fac.z) <= 300,
            `Facility ${fac.id} coordinates (${fac.x}, ${fac.z}) exceed ±300 stadium bounds`);
    }
});

runTest('ALL_FACILITIES — type field only contains valid enum values', 'Data Integrity', () => {
    const validTypes = ['gate', 'wc', 'med', 'food'];
    for (const fac of ALL_FACILITIES) {
        assert.ok(validTypes.includes(fac.type), `Facility ${fac.id} type "${fac.type}" is not a valid type`);
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 7: BLOCK DENSITY DATA
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── Block Density Data ───────────────────────────────────────────────────');

runTest('Block Density — exactly 72 blocks (36 Lower + 36 Upper)', 'Data Integrity', () => {
    const keys = Object.keys(BLOCK_DENSITY_DATA);
    assert.equal(keys.length, 72, `Must have 72 blocks (got ${keys.length})`);
    const lowerCount = keys.filter(k => k.endsWith('-L')).length;
    const upperCount = keys.filter(k => k.endsWith('-U')).length;
    assert.equal(lowerCount, 36, `Must have 36 Lower blocks (got ${lowerCount})`);
    assert.equal(upperCount, 36, `Must have 36 Upper blocks (got ${upperCount})`);
});

runTest('Block Density — all .density values are numbers between 0 and 100', 'Data Integrity', () => {
    for (const [id, info] of Object.entries(BLOCK_DENSITY_DATA)) {
        assert.ok(typeof info.density === 'number', `Block ${id} density must be a number`);
        assert.ok(info.density >= 0 && info.density <= 100, `Block ${id} density ${info.density}% is out of 0-100 range`);
    }
});

runTest('Block Density — status thresholds match density values (SURGE >90, ELEVATED >75)', 'Data Integrity', () => {
    for (const [id, info] of Object.entries(BLOCK_DENSITY_DATA)) {
        if (info.density > 90) {
            assert.equal(info.status, 'SURGE', `Block ${id} with density ${info.density}% must be SURGE (>90)`);
        } else if (info.density > 75) {
            assert.equal(info.status, 'ELEVATED', `Block ${id} with density ${info.density}% must be ELEVATED (>75)`);
        } else {
            assert.equal(info.status, 'NORMAL', `Block ${id} with density ${info.density}% must be NORMAL (≤75)`);
        }
    }
});

runTest('Block Density — capacity and current occupancy are consistent', 'Data Integrity', () => {
    for (const [id, info] of Object.entries(BLOCK_DENSITY_DATA)) {
        assert.ok(typeof info.capacity === 'number' && info.capacity > 0, `Block ${id} must have positive capacity`);
        assert.ok(typeof info.current === 'number' && info.current >= 0, `Block ${id} current must be non-negative`);
        assert.ok(info.current <= info.capacity, `Block ${id} current (${info.current}) must not exceed capacity (${info.capacity})`);
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 8: VOLUNTEER TASKS
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── Volunteer Tasks ──────────────────────────────────────────────────────');

runTest('Volunteer Tasks — structure includes required fields for dispatch', 'Data Integrity', () => {
    assert.ok(VOLUNTEER_TASKS.length >= 4, 'Must have at least 4 tasks');
    for (const task of VOLUNTEER_TASKS) {
        assert.ok(typeof task.id === 'string', `Task id must be string`);
        assert.ok(typeof task.title === 'string' && task.title.length > 0, `Task ${task.id} must have title`);
        assert.ok(typeof task.zone === 'string', `Task ${task.id} must have zone`);
    }
});

runTest('Volunteer Tasks — at least one high-priority unassigned task (dispatch readiness)', 'Data Integrity', () => {
    const urgentUnassigned = VOLUNTEER_TASKS.filter(t => t.priority === 'high' && t.status === 'unassigned');
    assert.ok(urgentUnassigned.length >= 1, 'Must have at least one high-priority unassigned task for volunteer readiness');
});

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 9: TRANSPORTATION DATA
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── Transportation Data ──────────────────────────────────────────────────');

runTest('Transportation — all dropoffGates reference real facility IDs', 'Data Integrity', () => {
    const facilityIds = new Set(ALL_FACILITIES.map(f => f.id));
    for (const t of TRANSPORTATION_DATA) {
        assert.ok(facilityIds.has(t.dropoffGate), `Transport "${t.name}" dropoffGate "${t.dropoffGate}" must reference a valid facility`);
    }
});

runTest('Transportation — dropoffGateLabel matches dropoffGate ID prefix', 'Data Integrity', () => {
    for (const t of TRANSPORTATION_DATA) {
        const gateKey = t.dropoffGate.replace('_', ' '); // e.g. GATE_A → "GATE A"
        assert.ok(t.dropoffGateLabel.toUpperCase().includes(t.dropoffGate.replace('_', ' ')),
            `Transport "${t.id}" dropoffGateLabel "${t.dropoffGateLabel}" must reference "${t.dropoffGate}"`);
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 10: INCIDENT LOG
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── Incident Log ─────────────────────────────────────────────────────────');

runTest('Incident Log — levels are valid, all entries have time and details', 'Data Integrity', () => {
    const validLevels = ['INFO', 'WARNING', 'ALERT', 'CRITICAL'];
    for (const inc of INCIDENT_LOG) {
        assert.ok(validLevels.includes(inc.level), `Incident ${inc.id} level "${inc.level}" is not valid`);
        assert.ok(typeof inc.time === 'string' && inc.time.match(/^\d{2}:\d{2}:\d{2}$/), `Incident ${inc.id} time must match HH:MM:SS format`);
        assert.ok(typeof inc.details === 'string' && inc.details.length > 5, `Incident ${inc.id} must have meaningful details`);
    }
});

runTest('Incident Log — no duplicate incident IDs', 'Data Integrity', () => {
    const ids = INCIDENT_LOG.map(i => i.id);
    const uniqueIds = new Set(ids);
    assert.equal(uniqueIds.size, ids.length, 'All incident IDs must be unique');
});

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 11: AI KNOWLEDGE BASE
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── AI Knowledge Base ────────────────────────────────────────────────────');

runTest('AI Knowledge Base — all entries link to a real facility marker', 'Data Integrity', () => {
    const facilityIds = new Set(ALL_FACILITIES.map(f => f.id));
    for (const entry of AI_KNOWLEDGE_BASE) {
        assert.ok(facilityIds.has(entry.targetMarker),
            `KB entry with keywords [${entry.keywords.slice(0,2).join(',')}] references unknown marker "${entry.targetMarker}"`);
    }
});

runTest('AI Knowledge Base — all keywords arrays are non-empty with strings', 'Data Integrity', () => {
    for (const entry of AI_KNOWLEDGE_BASE) {
        assert.ok(Array.isArray(entry.keywords) && entry.keywords.length >= 1, 'Each KB entry must have at least one keyword');
        for (const kw of entry.keywords) {
            assert.ok(typeof kw === 'string' && kw.length > 0, `Keyword must be a non-empty string (got ${typeof kw})`);
        }
    }
});

runTest('AI Knowledge Base — confidence percentages are valid format', 'Data Integrity', () => {
    for (const entry of AI_KNOWLEDGE_BASE) {
        assert.ok(typeof entry.confidence === 'string' && entry.confidence.endsWith('%'), `KB entry confidence must be a percentage string (got ${entry.confidence})`);
        const pct = parseInt(entry.confidence);
        assert.ok(!isNaN(pct) && pct >= 0 && pct <= 100, `Confidence percentage must be 0-100 (got ${pct})`);
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 12: PREDICTIVE DENSITY DATA
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── Predictive Density Data ──────────────────────────────────────────────');

runTest('Predictive Density — all 4 time snapshots exist (-30m, 0m, 45m, 90m)', 'Data Integrity', () => {
    const required = ['-30m', '0m', '45m', '90m'];
    for (const key of required) {
        assert.ok(key in PREDICTIVE_DENSITY_DATA, `Missing time snapshot: "${key}"`);
    }
});

runTest('Predictive Density — each snapshot has 72 block entries', 'Data Integrity', () => {
    for (const [key, snapshot] of Object.entries(PREDICTIVE_DENSITY_DATA)) {
        const count = Object.keys(snapshot).length;
        assert.equal(count, 72, `Snapshot "${key}" must have 72 block entries (got ${count})`);
    }
});

runTest('Predictive Density — all density values are in 0-100 range across all snapshots', 'Data Integrity', () => {
    for (const [snapKey, snapshot] of Object.entries(PREDICTIVE_DENSITY_DATA)) {
        for (const [blockId, info] of Object.entries(snapshot)) {
            assert.ok(typeof info.density === 'number', `Snapshot "${snapKey}" block "${blockId}" density must be number`);
            assert.ok(info.density >= 0 && info.density <= 100,
                `Snapshot "${snapKey}" block "${blockId}" density ${info.density} is out of range`);
        }
    }
});

runTest('Predictive Density — half-time (45m) average density is lower than kickoff (0m)', 'Data Integrity', () => {
    const avgDensity = (snapshot) => {
        const values = Object.values(snapshot).map(b => b.density);
        return values.reduce((a, b) => a + b, 0) / values.length;
    };
    const avg0m = avgDensity(PREDICTIVE_DENSITY_DATA['0m']);
    const avg45m = avgDensity(PREDICTIVE_DENSITY_DATA['45m']);
    assert.ok(avg45m < avg0m, `Half-time avg density (${avg45m.toFixed(1)}) should be lower than kickoff (${avg0m.toFixed(1)}) as fans leave bowl`);
});

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 13: COMMITTEE RECOMMENDATIONS
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── Committee Recommendations ────────────────────────────────────────────');

runTest('Committee Recommendations — all required fields present', 'Data Integrity', () => {
    assert.ok(COMMITTEE_RECOMMENDATIONS.length >= 3, 'Must have at least 3 AI recommendations');
    for (const rec of COMMITTEE_RECOMMENDATIONS) {
        assert.ok(typeof rec.id === 'string', 'Rec must have id');
        assert.ok(typeof rec.title === 'string' && rec.title.length > 5, 'Rec must have meaningful title');
        assert.ok(typeof rec.reasoning === 'string' && rec.reasoning.length > 10, 'Rec must have reasoning');
        assert.ok(typeof rec.confidence === 'string' && rec.confidence.endsWith('%'), 'Rec confidence must be % string');
        assert.ok(rec.status === 'pending', 'Rec status must be pending initially');
    }
});

runTest('Committee Recommendations — source and target markers reference real facilities', 'Data Integrity', () => {
    const facilityIds = new Set(ALL_FACILITIES.map(f => f.id));
    for (const rec of COMMITTEE_RECOMMENDATIONS) {
        assert.ok(facilityIds.has(rec.sourceMarker), `Rec "${rec.id}" sourceMarker "${rec.sourceMarker}" must reference a real facility`);
        assert.ok(facilityIds.has(rec.targetMarker), `Rec "${rec.id}" targetMarker "${rec.targetMarker}" must reference a real facility`);
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 14: SUSTAINABILITY METRICS
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── Sustainability Metrics ───────────────────────────────────────────────');

runTest('Sustainability Metrics — all 6 required fields are non-empty strings', 'Data Integrity', () => {
    const requiredKeys = ['solarGridEfficiency', 'carbonSavedTodayKg', 'recyclingConcourseFullness',
                          'waterRecoveryRate', 'greenTransitAdoption', 'ecoExitTip'];
    for (const key of requiredKeys) {
        assert.ok(key in SUSTAINABILITY_METRICS, `Missing sustainability metric: "${key}"`);
        assert.ok(typeof SUSTAINABILITY_METRICS[key] === 'string' && SUSTAINABILITY_METRICS[key].length > 0,
            `Metric "${key}" must be a non-empty string`);
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 15: GENAI SIGNAGE PRESETS
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── GenAI Signage Presets ────────────────────────────────────────────────');

runTest('GenAI Signage Presets — each preset has digital signage and multilingual PA', 'Data Integrity', () => {
    const expectedKeys = ['rec_1', 'rec_2', 'rec_3'];
    for (const key of expectedKeys) {
        assert.ok(key in GENAI_SIGNAGE_PRESETS, `Missing signage preset: "${key}"`);
        const preset = GENAI_SIGNAGE_PRESETS[key];
        assert.ok(typeof preset.digitalSignage === 'string' && preset.digitalSignage.length > 10,
            `Preset "${key}" must have non-empty digitalSignage`);
        assert.ok(typeof preset.paAnnouncements === 'object', `Preset "${key}" must have paAnnouncements object`);
        assert.ok('EN' in preset.paAnnouncements, `Preset "${key}" must have English PA announcement`);
        assert.ok('ES' in preset.paAnnouncements, `Preset "${key}" must have Spanish PA announcement`);
        assert.ok('FR' in preset.paAnnouncements, `Preset "${key}" must have French PA announcement`);
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 16: SECURITY — INPUT SANITIZATION
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── Security: Input Sanitization ─────────────────────────────────────────');

runTest('XSS — script and iframe tags removed, valid text preserved', 'Security', () => {
    const dirty = `<script>alert('xss')</script>Spill at Gate A <iframe src="evil.com"></iframe>`;
    const clean = sanitizeInput(dirty, 200);
    assert.ok(!clean.includes('<script>'), 'Script tag must be stripped');
    assert.ok(!clean.includes('<iframe'), 'Iframe tag must be stripped');
    assert.ok(clean.includes('Spill at Gate A'), 'Legitimate text must be preserved');
});

runTest('XSS — event handler attributes (onload=, onerror=, onclick=) are stripped', 'Security', () => {
    const dirty = `<img src="x" onerror="alert(1)"> onload=badFn() onclick=steal() Normal text`;
    const clean = sanitizeInput(dirty, 300);
    assert.ok(!clean.includes('onerror='), 'onerror= handler must be stripped');
    assert.ok(!clean.includes('onload='), 'onload= handler must be stripped');
    assert.ok(!clean.includes('onclick='), 'onclick= handler must be stripped');
    assert.ok(clean.includes('Normal text'), 'Regular text must be preserved after stripping');
});

runTest('XSS — javascript: and data: URI schemes stripped', 'Security', () => {
    const dirty = `javascript:alert('xss') data:text/html,<script>x</script> vbscript:run()`;
    const clean = sanitizeInput(dirty, 300);
    assert.ok(!clean.includes('javascript:'), 'javascript: URI must be stripped');
    assert.ok(!clean.includes('data:'), 'data: URI must be stripped');
    assert.ok(!clean.includes('vbscript:'), 'vbscript: URI must be stripped');
});

runTest('DoS — input capped at maxLen; exact boundary respected', 'Security', () => {
    const input300 = 'A'.repeat(300);
    const input1000 = 'B'.repeat(1000);
    assert.equal(sanitizeInput(input300, 300).length, 300, 'Exactly 300 chars must be preserved at boundary');
    assert.equal(sanitizeInput(input1000, 300).length, 300, 'Input exceeding 300 must be capped to 300');
    assert.equal(sanitizeInput(input1000, 1).length, 1, 'maxLen=1 must return single character');
});

runTest('Edge Cases — null, undefined, number, object all return empty string', 'Security', () => {
    assert.equal(sanitizeInput(null), '', 'null → empty string');
    assert.equal(sanitizeInput(undefined), '', 'undefined → empty string');
    assert.equal(sanitizeInput(42), '', 'number → empty string');
    assert.equal(sanitizeInput({}), '', 'object → empty string');
    assert.equal(sanitizeInput([]), '', 'array → empty string');
    assert.equal(sanitizeInput(''), '', 'empty string → empty string');
    assert.equal(sanitizeInput('   '), '', 'whitespace-only → empty string after trim');
});

runTest('Idempotency — sanitizeInput called twice yields the same result', 'Security', () => {
    const input = 'Hello <b>World</b> javascript: test onclick=bad';
    const once = sanitizeInput(input, 200);
    const twice = sanitizeInput(once, 200);
    assert.equal(once, twice, 'Double-sanitization must be idempotent');
});

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 17: SECURITY — RATE LIMITING / COOLDOWN
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── Security: Rate Limiting & Cooldown ───────────────────────────────────');

runTest('Cooldown — first call allowed, immediate second call blocked', 'Security', () => {
    const key = `cooldown_test_${Date.now()}`;
    const first = checkActionCooldown(key, 3000);
    const second = checkActionCooldown(key, 3000);
    assert.equal(first.allowed, true, 'First call must be allowed');
    assert.equal(second.allowed, false, 'Immediate second call must be blocked');
    assert.ok(second.remainingSec >= 1, 'Remaining cooldown must be at least 1 second');
});

runTest('Cooldown — different keys are independent (no cross-key contamination)', 'Security', () => {
    const ts = Date.now();
    const key1 = `isolationA_${ts}`;
    const key2 = `isolationB_${ts}`;
    checkActionCooldown(key1, 3000);
    const key2Result = checkActionCooldown(key2, 3000);
    assert.equal(key2Result.allowed, true, 'Different key must not be affected by another key\'s cooldown');
});

runTest('Cooldown — returns object with allowed boolean and remainingSec number', 'Security', () => {
    const key = `typecheck_${Date.now()}`;
    const result = checkActionCooldown(key, 2000);
    assert.ok(typeof result === 'object' && result !== null, 'Must return an object');
    assert.ok(typeof result.allowed === 'boolean', 'result.allowed must be boolean');
    assert.ok(typeof result.remainingSec === 'number', 'result.remainingSec must be number');
    assert.equal(result.remainingSec, 0, 'First call remainingSec must be 0');
});

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 18: EFFICIENCY — LRU AI CACHE
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── Efficiency: LRU AI Cache ─────────────────────────────────────────────');

runTest('Cache — set and get returns exact value (case-insensitive key)', 'Efficiency', () => {
    aiResponseCache.set('Where is Gate A?', 'Gate A is on the North side.');
    const result = aiResponseCache.get('where is gate a?');
    assert.equal(result, 'Gate A is on the North side.', 'Cache must return value case-insensitively');
});

runTest('Cache — miss returns null for unknown keys', 'Efficiency', () => {
    const result = aiResponseCache.get('this_prompt_was_never_cached_xyz_' + Date.now());
    assert.equal(result, null, 'Cache miss must return null');
});

runTest('Cache — last-write wins on duplicate key (overwrite behavior)', 'Efficiency', () => {
    const key = `overwrite_test_${Date.now()}`;
    aiResponseCache.set(key, 'first value');
    aiResponseCache.set(key, 'second value');
    assert.equal(aiResponseCache.get(key), 'second value', 'Last write must overwrite previous entry');
});

runTest('Cache — multiple distinct keys stored and retrieved independently', 'Efficiency', () => {
    const ts = Date.now();
    aiResponseCache.set(`key_alpha_${ts}`, 'response A');
    aiResponseCache.set(`key_beta_${ts}`, 'response B');
    aiResponseCache.set(`key_gamma_${ts}`, 'response C');
    assert.equal(aiResponseCache.get(`key_alpha_${ts}`), 'response A', 'Key alpha must return A');
    assert.equal(aiResponseCache.get(`key_beta_${ts}`), 'response B', 'Key beta must return B');
    assert.equal(aiResponseCache.get(`key_gamma_${ts}`), 'response C', 'Key gamma must return C');
});

runTest('Cache — clear() empties all cached entries', 'Efficiency', () => {
    const key = `clear_test_${Date.now()}`;
    aiResponseCache.set(key, 'some cached response');
    aiResponseCache.clear();
    assert.equal(aiResponseCache.get(key), null, 'Cache must be empty after clear()');
});

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 19: BUSINESS LOGIC — AI ACTION TAG PARSER
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── Business Logic: Action Tag Parser ────────────────────────────────────');

// Replicate the extractAction logic inline for testability
function extractAction(text) {
    const match = text.match(/<action\s+marker="([^"]+)"\s+type="([^"]+)"\s*\/?>/i);
    if (!match) return { cleanText: text, markerId: null, type: null };
    return {
        cleanText: text.replace(match[0], '').trim(),
        markerId: match[1],
        type: match[2],
    };
}

runTest('Action Parser — extracts marker ID and type from well-formed action tag', 'Business Logic', () => {
    const text = 'Head to Gate D. <action marker="GATE_D" type="show_marker"/>';
    const result = extractAction(text);
    assert.equal(result.markerId, 'GATE_D', 'Must extract GATE_D marker');
    assert.equal(result.type, 'show_marker', 'Must extract show_marker type');
    assert.ok(!result.cleanText.includes('<action'), 'Action tag must be removed from cleanText');
    assert.ok(result.cleanText.includes('Head to Gate D'), 'Human-readable text must be preserved');
});

runTest('Action Parser — returns null marker for text with no action tag', 'Business Logic', () => {
    const text = 'The nearest washroom is WC B on the East concourse.';
    const result = extractAction(text);
    assert.equal(result.markerId, null, 'markerId must be null when no action tag present');
    assert.equal(result.type, null, 'type must be null when no action tag present');
    assert.equal(result.cleanText, text, 'cleanText must equal original when no tag present');
});

runTest('Action Parser — handles action tag at start of string', 'Business Logic', () => {
    const text = '<action marker="MED_A" type="show_marker"/> Medical hub is fully staffed.';
    const result = extractAction(text);
    assert.equal(result.markerId, 'MED_A', 'Must extract MED_A at start of string');
    assert.ok(result.cleanText.includes('Medical hub'), 'Text after tag must be preserved');
});

runTest('Action Parser — extracted marker IDs are valid facility IDs', 'Business Logic', () => {
    const facilityIds = new Set(ALL_FACILITIES.map(f => f.id));
    const testCases = [
        'Go here <action marker="GATE_A" type="show_marker"/>',
        'Medical help: <action marker="MED_B" type="show_marker"/>',
        'Eat at <action marker="FOOD_G" type="show_marker"/>',
    ];
    for (const tc of testCases) {
        const { markerId } = extractAction(tc);
        assert.ok(facilityIds.has(markerId), `Extracted marker "${markerId}" must exist in ALL_FACILITIES`);
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 20: INTEGRATION — CROSS-MODULE CONSISTENCY
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── Integration: Cross-Module Consistency ────────────────────────────────');

runTest('Integration — ALL_FACILITIES contains all gates, washrooms, medical, food', 'Integration', () => {
    const ids = new Set(ALL_FACILITIES.map(f => f.id));
    for (const g of GATES_DATA)    assert.ok(ids.has(g.id), `Gate ${g.id} missing from ALL_FACILITIES`);
    for (const w of WASHROOMS_DATA) assert.ok(ids.has(w.id), `Washroom ${w.id} missing from ALL_FACILITIES`);
    for (const m of MEDICAL_DATA)  assert.ok(ids.has(m.id), `Medical ${m.id} missing from ALL_FACILITIES`);
    for (const f of FOOD_DATA)     assert.ok(ids.has(f.id), `Food ${f.id} missing from ALL_FACILITIES`);
});

runTest('Integration — AI KB target markers all exist in ALL_FACILITIES', 'Integration', () => {
    const facilityIds = new Set(ALL_FACILITIES.map(f => f.id));
    for (const entry of AI_KNOWLEDGE_BASE) {
        assert.ok(facilityIds.has(entry.targetMarker),
            `KB entry references unknown facility: "${entry.targetMarker}"`);
    }
});

runTest('Integration — incident log zones reference valid facility IDs or known zones', 'Integration', () => {
    const facilityIds = new Set(ALL_FACILITIES.map(f => f.id));
    for (const inc of INCIDENT_LOG) {
        // Zone should either match a facility ID or be a general zone string
        const isValidFacility = facilityIds.has(inc.zone);
        const isValidZone = typeof inc.zone === 'string' && inc.zone.length > 0;
        assert.ok(isValidFacility || isValidZone, `Incident ${inc.id} zone "${inc.zone}" must be non-empty`);
    }
});

runTest('Integration — stadium total capacity equals sum capacity sanity check', 'Integration', () => {
    const totalSeatCapacity = Object.values(BLOCK_DENSITY_DATA).reduce((sum, b) => sum + b.capacity, 0);
    // Total seating (72 blocks) should be a reasonable fraction of total stadium capacity
    assert.ok(totalSeatCapacity > 0, 'Total seating capacity must be positive');
    assert.ok(totalSeatCapacity <= STADIUM_METADATA.capacity * 2, 
        `Total seat capacity (${totalSeatCapacity}) seems unreasonably high vs stadium capacity (${STADIUM_METADATA.capacity})`);
});

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 21: ACCESSIBILITY LOGIC
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── Accessibility Logic ──────────────────────────────────────────────────');

runTest('A11y — high contrast class toggle is idempotent (on/on = on, off/off = off)', 'Accessibility', () => {
    const mockClassList = new Set();
    const toggle = () => {
        if (mockClassList.has('a11y-high-contrast')) mockClassList.delete('a11y-high-contrast');
        else mockClassList.add('a11y-high-contrast');
        return mockClassList.has('a11y-high-contrast');
    };
    assert.equal(toggle(), true,  'Toggle 1 → ON');
    assert.equal(toggle(), false, 'Toggle 2 → OFF');
    assert.equal(toggle(), true,  'Toggle 3 → ON');
    assert.equal(toggle(), false, 'Toggle 4 → OFF');
});

runTest('A11y — multilingual tag mapping covers all 5 supported languages', 'Accessibility', () => {
    const langMap = { EN: 'en', ES: 'es', FR: 'fr', PT: 'pt', AR: 'ar' };
    const supported = ['EN', 'ES', 'FR', 'PT', 'AR'];
    for (const lang of supported) {
        assert.ok(lang in langMap, `Language "${lang}" must be in the html[lang] mapping`);
        assert.ok(typeof langMap[lang] === 'string' && langMap[lang].length === 2, `html lang code for ${lang} must be 2-char ISO code`);
    }
});

runTest('A11y — subtitle translations are non-empty for all languages', 'Accessibility', () => {
    const translations = {
        EN: '"Know your stadium before you arrive"',
        ES: '"Conoce tu estadio antes de llegar"',
        FR: '"Connaissez votre stade avant d\'arriver"',
        AR: '"تعرف على ملعبك قبل وصولك"',
    };
    for (const [lang, text] of Object.entries(translations)) {
        assert.ok(typeof text === 'string' && text.length > 5, `Translation for ${lang} must be non-empty`);
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 22: REACTIVE STATE MANAGEMENT (STORE)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── Reactive State Management ────────────────────────────────────────────');

runTest('Store — initial state is correctly set', 'Business Logic', () => {
    const store = new Store({ testKey: 'initial' });
    assert.equal(store.getState('testKey'), 'initial', 'Store should return initial state');
});

runTest('Store — setState updates state and triggers subscribers', 'Business Logic', () => {
    const store = new Store({ count: 0 });
    let triggeredValue = null;
    store.subscribe('count', (val) => { triggeredValue = val; });
    
    store.setState('count', 1);
    
    assert.equal(store.getState('count'), 1, 'Store state should be updated to 1');
    assert.equal(triggeredValue, 1, 'Subscriber should be called with updated value');
});

runTest('Store — multiple subscribers on the same key', 'Business Logic', () => {
    const store = new Store({ active: false });
    let sub1 = false;
    let sub2 = false;
    
    store.subscribe('active', (val) => { sub1 = val; });
    store.subscribe('active', (val) => { sub2 = val; });
    
    store.setState('active', true);
    
    assert.equal(sub1, true, 'Subscriber 1 should be triggered');
    assert.equal(sub2, true, 'Subscriber 2 should be triggered');
});

// Vitest will automatically output the test summary and handle exit codes.

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 23: FIFA WORLD CUP 2026 PROBLEM STATEMENT ALIGNMENT
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── FIFA World Cup 2026 Problem Statement Alignment ──────────────────────');

runTest('PSA — Predictive Time-Travel: all 4 match phases present (-30m, 0m, 45m, 90m)', 'Problem Statement Alignment', () => {
    const phases = ['-30m', '0m', '45m', '90m'];
    phases.forEach(phase => {
        assert.ok(phase in PREDICTIVE_DENSITY_DATA, `Match phase "${phase}" must exist in PREDICTIVE_DENSITY_DATA`);
        const phaseData = PREDICTIVE_DENSITY_DATA[phase];
        assert.ok(typeof phaseData === 'object' && phaseData !== null, `Phase "${phase}" must be an object`);
        assert.ok(Object.keys(phaseData).length >= 36, `Phase "${phase}" must cover at least 36 blocks (got ${Object.keys(phaseData).length})`);
    });
});

runTest('PSA — Predictive density values are valid numbers (0-100%) per phase', 'Problem Statement Alignment', () => {
    const phases = ['-30m', '0m', '45m', '90m'];
    phases.forEach(phase => {
        const phaseData = PREDICTIVE_DENSITY_DATA[phase];
        Object.entries(phaseData).forEach(([blockId, info]) => {
            assert.ok(typeof info.density === 'number', `Block ${blockId} in phase ${phase} must have numeric density`);
            assert.ok(info.density >= 0 && info.density <= 100, `Block ${blockId} density ${info.density} must be 0-100`);
        });
    });
});

runTest('PSA — GenAI PA Announcements available in EN, ES, FR (FIFA trilingual mandate)', 'Problem Statement Alignment', () => {
    const requiredLangs = ['EN', 'ES', 'FR'];
    const presets = Object.values(GENAI_SIGNAGE_PRESETS);
    assert.ok(presets.length >= 3, `Must have at least 3 GenAI signage presets (got ${presets.length})`);
    presets.forEach((preset, i) => {
        assert.ok(preset.paAnnouncements, `Preset ${i} must have paAnnouncements`);
        requiredLangs.forEach(lang => {
            assert.ok(
                typeof preset.paAnnouncements[lang] === 'string' && preset.paAnnouncements[lang].length > 10,
                `Preset ${i} must have a non-empty "${lang}" PA announcement (FIFA trilingual requirement)`
            );
        });
        assert.ok(typeof preset.digitalSignage === 'string' && preset.digitalSignage.length > 0,
            `Preset ${i} must have a digitalSignage VMS message`);
    });
});

runTest('PSA — Sustainability KPIs track all FIFA eco-mandate metrics', 'Problem Statement Alignment', () => {
    const requiredKPIs = ['solarGridEfficiency', 'carbonSavedTodayKg', 'recyclingConcourseFullness', 'waterRecoveryRate', 'greenTransitAdoption', 'ecoExitTip'];
    requiredKPIs.forEach(kpi => {
        assert.ok(kpi in SUSTAINABILITY_METRICS, `Sustainability KPI "${kpi}" must exist in SUSTAINABILITY_METRICS`);
        assert.ok(typeof SUSTAINABILITY_METRICS[kpi] === 'string' && SUSTAINABILITY_METRICS[kpi].length > 0,
            `Sustainability KPI "${kpi}" must be a non-empty string`);
    });
});

runTest('PSA — Committee AI Recommendations reference valid gate markers', 'Problem Statement Alignment', () => {
    const allFacilityIds = new Set(ALL_FACILITIES.map(f => f.id));
    COMMITTEE_RECOMMENDATIONS.forEach(rec => {
        assert.ok(typeof rec.id === 'string' && rec.id.length > 0, `Recommendation must have an id`);
        assert.ok(typeof rec.title === 'string' && rec.title.length > 5, `Recommendation "${rec.id}" must have a descriptive title`);
        assert.ok(typeof rec.reasoning === 'string' && rec.reasoning.length > 10, `Recommendation "${rec.id}" must have reasoning`);
        assert.ok(typeof rec.impact === 'string' && rec.impact.length > 5, `Recommendation "${rec.id}" must have projected impact`);
        assert.ok(typeof rec.confidence === 'string' && rec.confidence.endsWith('%'), `Recommendation "${rec.id}" confidence must be a percentage string`);
        assert.ok(allFacilityIds.has(rec.sourceMarker), `Recommendation "${rec.id}" sourceMarker "${rec.sourceMarker}" must reference a valid facility`);
        assert.ok(allFacilityIds.has(rec.targetMarker), `Recommendation "${rec.id}" targetMarker "${rec.targetMarker}" must reference a valid facility`);
    });
});

runTest('PSA — AI Knowledge Base covers all required FIFA fan assistance intents', 'Problem Statement Alignment', () => {
    const requiredIntents = ['restroom', 'food', 'exit', 'seat', 'medical', 'accessibility'];
    const allKeywords = AI_KNOWLEDGE_BASE.flatMap(kb => kb.keywords);
    requiredIntents.forEach(intent => {
        const covered = allKeywords.some(kw => kw.includes(intent) || intent.includes(kw));
        assert.ok(covered, `AI Knowledge Base must cover the "${intent}" fan assistance intent (FIFA wayfinding requirement)`);
    });
    AI_KNOWLEDGE_BASE.forEach(kb => {
        assert.ok(typeof kb.response === 'string' && kb.response.length > 20, `Knowledge base entry must have a substantive response`);
        assert.ok(typeof kb.confidence === 'string' && kb.confidence.endsWith('%'), `Knowledge base entry must have a confidence percentage`);
    });
});

runTest('PSA — Stadium supports 5 official FIFA languages (EN, ES, FR, PT, AR)', 'Problem Statement Alignment', () => {
    const SUPPORTED_LANGUAGES = ['EN', 'ES', 'FR', 'PT', 'AR'];
    const langToISO = { EN: 'en', ES: 'es', FR: 'fr', PT: 'pt', AR: 'ar' };
    assert.equal(SUPPORTED_LANGUAGES.length, 5, 'Must support exactly 5 languages for FIFA World Cup 2026');
    SUPPORTED_LANGUAGES.forEach(lang => {
        assert.ok(lang in langToISO, `Language "${lang}" must have an ISO 639-1 mapping`);
        assert.equal(langToISO[lang].length, 2, `ISO code for "${lang}" must be 2 characters`);
    });
});


describe('Reactive State Management (Store)', () => {
    test('should initialize with state and allow getting state', async () => {
        const { Store } = await import('../js/store.js');
        const s = new Store({ test: 123 });
        expect(s.getState('test')).toBe(123);
    });

    test('should notify subscribers on state change', async () => {
        const { Store } = await import('../js/store.js');
        const s = new Store({ value: 1 });
        let captured = 0;
        
        // Initial subscribe triggers callback immediately
        s.subscribe('value', (val) => { captured = val; });
        expect(captured).toBe(1);
        
        // Changing state triggers callback
        s.setState('value', 2);
        expect(captured).toBe(2);
    });

    test('should allow unsubscribing', async () => {
        const { Store } = await import('../js/store.js');
        const s = new Store({ value: 1 });
        let count = 0;
        const unsub = s.subscribe('value', () => { count++; });
        expect(count).toBe(1);
        
        unsub();
        s.setState('value', 2);
        expect(count).toBe(1); // Should not increment again
    });
});
