// js/volunteer-portal.js - Volunteer Companion & AI Field Report Controller
import { VOLUNTEER_TASKS, INCIDENT_LOG, ALL_FACILITIES } from './data.js';
import { groqChat } from './ai/groq-client.js';
import { sanitizeInput, checkActionCooldown } from './utils.js';


export class VolunteerPortalController {
    constructor(app) {
        this.app = app;
        this.activeTab = 'copilot'; // 'copilot' or 'tasks'
        this.tasks = [...VOLUNTEER_TASKS];
        this.reports = [];
        this.isSubmitting = false;
    }

    init() {
        this.setupTabNavigation();
        this.renderCurrentTab();
    }

    setupTabNavigation() {
        const tabBtns = document.querySelectorAll('.vol-tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                tabBtns.forEach(b => {
                    b.classList.remove('active', 'bg-white/10', 'border-white/30', 'text-white');
                    b.classList.add('text-white/60', 'hover:text-white', 'hover:bg-white/5');
                    b.setAttribute('aria-selected', 'false'); // A11y: deactivate all tabs
                });

                btn.classList.add('active', 'bg-white/10', 'border-white/30', 'text-white');
                btn.classList.remove('text-white/60', 'hover:text-white', 'hover:bg-white/5');
                btn.setAttribute('aria-selected', 'true'); // A11y: mark selected tab

                this.activeTab = btn.dataset.tab;
                this.renderCurrentTab();
            });
        });

        document.getElementById('vol-btn-home')?.addEventListener('click', () => {
            this.app.switchView('landing');
        });
        document.getElementById('vol-btn-reset-cam')?.addEventListener('click', () => {
            if (this.app.engine) this.app.engine.resetCamera();
        });
    }

    renderCurrentTab() {
        const panel = document.getElementById('volunteer-content-area');
        if (!panel) return;

        if (this.activeTab === 'copilot') {
            panel.innerHTML = this.renderCopilotTab();
            this.bindCopilotEvents();
        } else {
            panel.innerHTML = this.renderTasksTab();
            this.bindTasksEvents();
        }
    }

    renderCopilotTab() {
        const reportsHtml = this.reports.length === 0 ? `
            <div class="text-center py-6 text-white/40 text-xs italic">
                No field reports dispatched yet. Use the prompt below or mic to report spills, scanner jams, or medical issues instantly to Command.
            </div>
        ` : this.reports.map(r => {
            let badgeStyle = 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30';
            if (r.level === 'CRITICAL' || r.level === 'ALERT') {
                badgeStyle = 'bg-red-500/20 text-red-400 border border-red-500/30';
            } else if (r.level === 'INFO') {
                badgeStyle = 'bg-blue-500/20 text-blue-300 border border-blue-500/30';
            }
            return `
            <div class="glass-panel p-3.5 rounded-xl border border-white/15 space-y-2 text-xs animate-fadeIn shadow-lg">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                        <span class="px-2 py-0.5 rounded font-bold ${badgeStyle}">${r.level}</span>
                        <span class="text-[10px] text-yellow-400 font-semibold px-2 py-0.5 rounded bg-yellow-500/10 border border-yellow-500/20 flex items-center gap-1">
                            <span>🤖 Groq LLaMA 3.3 Classified</span>
                        </span>
                    </div>
                    <span class="text-[10px] text-white/40 font-mono-num">${r.time} · Zone: ${r.zone}</span>
                </div>
                <div class="font-semibold text-white text-sm">${r.title}</div>
                <div class="text-white/75 leading-relaxed">${r.details}</div>
                
                ${r.sopAction ? `
                <div class="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-2.5 text-yellow-200 space-y-1 mt-1">
                    <div class="font-bold text-[10px] uppercase tracking-wider text-yellow-300 flex items-center gap-1">
                        <span>⚡ AI Field Copilot SOP Action Plan:</span>
                    </div>
                    <div class="text-[11px] leading-relaxed font-sans text-yellow-100/90">${r.sopAction}</div>
                </div>
                ` : ''}

                <div class="text-[10px] text-green-400 font-semibold pt-1.5 border-t border-white/10 flex items-center justify-between">
                    <span>📡 Live Sync: Control Room Feed & Steward Roster</span>
                    <span class="text-white/40 font-mono-num">Task Created (#${r.id.slice(-4)})</span>
                </div>
            </div>
            `;
        }).join('');


        return `
            <div class="flex flex-col h-full justify-between space-y-4">
                <div class="space-y-1 shrink-0">
                    <h3 class="font-bebas text-2xl tracking-widest text-glow text-white">🧑‍🔧 VOLUNTEER AI COPILOT & FIELD REPORTER</h3>
                    <p class="text-xs text-white/60">Report incidents in natural language. LLaMA 3.3 auto-categorizes severity and alerts Command instantly.</p>
                </div>

                <!-- Live Field Reports Feed -->
                <div class="flex-1 overflow-y-auto space-y-3 pr-1">
                    ${reportsHtml}
                </div>

                <!-- Quick Incident Chips -->
                <div class="py-2 border-t border-white/10 shrink-0">
                    <p class="text-[10px] text-white/40 uppercase tracking-widest font-semibold mb-1.5">⚡ Quick Field Dispatch:</p>
                    <div class="flex flex-wrap gap-1.5">
                        <button class="vol-quick-chip bg-white/5 hover:bg-yellow-500/20 text-white/80 hover:text-yellow-300 text-[11px] px-3 py-1.5 rounded-lg border border-white/10 transition-all cursor-pointer">
                            🥤 Drink Spill at Section B14 walkway
                        </button>
                        <button class="vol-quick-chip bg-white/5 hover:bg-red-500/20 text-white/80 hover:text-red-300 text-[11px] px-3 py-1.5 rounded-lg border border-white/10 transition-all cursor-pointer">
                            🚨 Gate B barcode scanner #4 jammed & backing up
                        </button>
                        <button class="vol-quick-chip bg-white/5 hover:bg-blue-500/20 text-white/80 hover:text-blue-300 text-[11px] px-3 py-1.5 rounded-lg border border-white/10 transition-all cursor-pointer">
                            🚻 Restroom D paper towel dispenser jammed
                        </button>
                    </div>
                </div>

                <!-- Natural Language Reporter Box -->
                <div class="flex gap-2 items-center bg-black/60 p-1.5 rounded-xl border border-white/15 focus-within:border-yellow-500/70 transition-all shrink-0">
                    <button id="vol-mic-btn" title="Speak field report" class="bg-white/10 hover:bg-red-500/80 text-white/80 hover:text-white p-2.5 rounded-lg transition-all cursor-pointer shrink-0">
                        🎙️
                    </button>
                    <input type="text" id="vol-report-input" placeholder="Type or speak field incident (e.g. Spill at B14)..." class="bg-transparent text-white text-sm px-2 py-2 flex-1 focus:outline-none placeholder-white/30" />
                    <button id="vol-submit-btn" class="bg-yellow-600 hover:bg-yellow-500 text-black font-bold px-4 py-2.5 rounded-lg transition-all shadow-lg shadow-yellow-600/30 cursor-pointer shrink-0 text-xs">
                        ⚡ Dispatch Report
                    </button>
                </div>
            </div>
        `;
    }

    bindCopilotEvents() {
        const inputEl = document.getElementById('vol-report-input');
        const submitBtn = document.getElementById('vol-submit-btn');
        const micBtn = document.getElementById('vol-mic-btn');

        document.querySelectorAll('.vol-quick-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                this.dispatchFieldReport(chip.textContent.trim());
            });
        });

        if (micBtn) {
            micBtn.addEventListener('click', () => {
                const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                if (!SpeechRecognition) {
                    this._showInlineError('Speech recognition is not supported in this browser. Please type your field report.');
                    return;
                }
                const recognition = new SpeechRecognition();
                recognition.lang = 'en-US';
                micBtn.classList.add('bg-red-600', 'animate-pulse');
                inputEl.placeholder = "🎙️ Listening for field incident...";

                recognition.onresult = (event) => {
                    const speechText = event.results[0][0].transcript;
                    inputEl.value = speechText;
                    micBtn.classList.remove('bg-red-600', 'animate-pulse');
                    inputEl.placeholder = "Type or speak field incident...";
                    this.dispatchFieldReport(speechText);
                };
                recognition.onerror = () => micBtn.classList.remove('bg-red-600', 'animate-pulse');
                recognition.onend = () => micBtn.classList.remove('bg-red-600', 'animate-pulse');
                recognition.start();
            });
        }

        const handleSend = () => {
            const text = inputEl.value.trim();
            if (!text) return;
            inputEl.value = '';
            this.dispatchFieldReport(text);
        };

        if (submitBtn) submitBtn.addEventListener('click', handleSend);
        if (inputEl) inputEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleSend(); });
    }

    async dispatchFieldReport(rawText) {
        if (this.isSubmitting) return;

        // Security: Sanitize field report input and check cooldown
        const text = sanitizeInput(rawText, 350);
        if (!text) return;

        const cd = checkActionCooldown('vol_dispatch_user', 1500);
        if (!cd.allowed) {
            this._showInlineError(`⚠️ Anti-Spam Cooldown: Please wait ${cd.remainingSec}s before dispatching another field report.`);
            return;
        }

        this.isSubmitting = true;

        const submitBtn = document.getElementById('vol-submit-btn');
        if (submitBtn) submitBtn.textContent = "⏳ Dispatching...";


        const prompt = `
You are MatchPulse AI Field Dispatch Classifier & Copilot for FIFA World Cup stewards.
Analyze this volunteer field report: "${text}"

Determine:
1. level: "CRITICAL" (if scanner jammed, medical, surge, injury, or major hazard) or "WARNING" (if spill or minor jam) or "INFO".
2. title: Short professional summary (e.g. "Concourse Spill Hazard at Section B14").
3. details: Clear actionable description for Command.
4. zone: Best matching zone or marker ID from: GATE_A to GATE_H, WC_A to WC_F, MED_A to MED_D, FOOD_A to FOOD_H, or block name like B14-L or B12-L.
5. sopAction: Exact step-by-step Standard Operating Procedure (SOP) guidance for the steward on the ground (e.g. "1. Place wet-floor sign immediately. 2. Radio Janitorial Unit #4. 3. Keep walkway clear of fans.").

Respond ONLY with valid JSON:
{"level": "WARNING", "title": "Concourse Spill Hazard at Section B14", "details": "Drink spill reported...", "zone": "B14-L", "sopAction": "1. Deploy wet floor cone. 2. Notify custodial cart. 3. Secure walkway."}
        `.trim();

        let parsed = null;
        try {
            const raw = await groqChat([{ role: 'user', content: prompt }], { max_tokens: 250 });
            const jsonMatch = raw.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                parsed = JSON.parse(jsonMatch[0]);
            } else {
                parsed = { level: "WARNING", title: text.slice(0,30), details: text, zone: "Concourse", sopAction: "Follow standard protocol: Secure zone, notify nearby units, and verify resolution." };
            }
        } catch (err) {
            console.error("Report dispatch AI error:", err);
            parsed = {
                level: "WARNING",
                title: "Field Incident Report",
                details: text,
                zone: "Concourse",
                sopAction: "Standard procedure: Inspect incident area, alert zone supervisor, and log completion."
            };
        }

        const timeStr = new Date().toTimeString().split(' ')[0];
        const newReport = {
            id: `vol_${Date.now()}`,
            time: timeStr,
            level: parsed?.level || "WARNING",
            title: parsed?.title || text,
            details: parsed?.details || text,
            zone: parsed?.zone || "General Zone",
            sopAction: parsed?.sopAction || "Follow standard protocol: Secure zone, notify nearby units, and verify resolution."
        };

        this.reports.unshift(newReport);
        // Auto-append directly to global INCIDENT_LOG so Committee Control Room sees it live!
        INCIDENT_LOG.unshift(newReport);

        // Also auto-generate a claimable task in Assigned Tasks tab!
        const newTask = {
            id: `task_${Date.now()}`,
            title: newReport.title,
            zone: newReport.zone,
            priority: newReport.level === 'CRITICAL' || newReport.level === 'ALERT' ? 'high' : 'normal',
            status: 'pending'
        };
        this.tasks.unshift(newTask);
        VOLUNTEER_TASKS.unshift(newTask);

        this.renderCurrentTab();

        this.isSubmitting = false;

        // Highlight on 3D map safely outside the AI block
        try {
            if (this.app.engine && parsed?.zone) {
                if (ALL_FACILITIES.some(f => f.id === parsed.zone)) {
                    this.app.engine.flyToMarker(parsed.zone);
                } else if (parsed.zone.startsWith('B')) {
                    if (typeof this.app.engine.flyToBlock === 'function') {
                        this.app.engine.flyToBlock(parsed.zone);
                    }
                }
            }
        } catch (mapErr) {
            console.warn("Camera fly-to warning:", mapErr);
        }
    }


    renderTasksTab() {
        const tasksHtml = this.tasks.map(t => `
            <div class="glass-panel p-3.5 rounded-xl border border-white/10 flex items-center justify-between text-xs animate-fadeIn gap-3">
                <div class="space-y-1 flex-1">
                    <div class="flex items-center gap-2">
                        <span class="text-[10px] px-2 py-0.5 rounded font-bold uppercase ${t.priority === 'high' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-blue-500/20 text-blue-300'}">${t.priority} Priority</span>
                        <span class="text-white font-bold text-sm">${t.title}</span>
                    </div>
                    <div class="text-white/60">Zone: <strong class="text-white">${t.zone}</strong> · Status: <strong class="text-yellow-300 uppercase">${t.status.replace('_', ' ')}</strong></div>
                </div>
                <button class="vol-claim-btn bg-white/10 hover:bg-yellow-500 hover:text-black text-white text-xs font-bold px-3 py-2 rounded-xl transition-all cursor-pointer shrink-0" data-id="${t.id}">
                    ${t.status === 'done' ? '✅ Complete' : '⚡ Claim / Mark Done'}
                </button>
            </div>
        `).join('');

        return `
            <div class="space-y-4 animate-fadeIn">
                <div class="flex items-center justify-between">
                    <h3 class="font-bebas text-2xl tracking-widest text-glow text-white">📋 ASSIGNED ZONE TASKS & STEWARD ROSTER</h3>
                    <span class="text-[11px] px-2.5 py-1 rounded bg-yellow-500/20 text-yellow-300 font-medium border border-yellow-500/30">Steward Roster Live</span>
                </div>
                <p class="text-xs text-white/60">View high-priority tasks assigned by the Committee Control Room and mark them resolved upon completion.</p>
                <div class="space-y-2.5 pt-1">
                    ${tasksHtml}
                </div>
            </div>
        `;
    }

    bindTasksEvents() {
        document.querySelectorAll('.vol-claim-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                const task = this.tasks.find(t => t.id === id);
                if (task) {
                    task.status = task.status === 'done' ? 'in_progress' : 'done';
                    this.renderCurrentTab();
                }
            });
        });
    }

    /**
     * Displays a non-blocking inline error message near the report input area.
     * Replaces alert() to keep the UI responsive and accessible.
     * @param {string} message - Error text to display
     * @private
     */
    _showInlineError(message) {
        let errEl = document.getElementById('vol-inline-error');
        if (!errEl) {
            errEl = document.createElement('div');
            errEl.id = 'vol-inline-error';
            errEl.setAttribute('role', 'alert');
            errEl.setAttribute('aria-live', 'assertive');
            errEl.className = 'text-red-400 text-xs font-semibold px-2 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 mt-1';
            const inputArea = document.getElementById('vol-report-input');
            if (inputArea && inputArea.parentNode) {
                inputArea.parentNode.insertAdjacentElement('afterend', errEl);
            } else {
                document.getElementById('volunteer-content-area')?.prepend(errEl);
            }
        }
        errEl.textContent = message;
        setTimeout(() => {
            if (errEl) errEl.remove();
        }, 4000);
    }
}
