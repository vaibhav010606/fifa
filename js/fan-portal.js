// js/fan-portal.js - Fan Portal Logic & AI Assistant Controller

import { AI_KNOWLEDGE_BASE, TRANSPORTATION_DATA, FOOD_DATA, ALL_FACILITIES } from './data.js';
import { StadiumAIGraph } from './ai/stadium-graph.js';
import { sanitizeInput, checkActionCooldown, announceToScreenReader } from './utils.js';



import { appStore } from './store.js';

export class FanPortalController {
    constructor(app) {
        this.app = app;
        this.chatHistory = [
            {
                sender: 'ai',
                text: "👋 Welcome to the **MatchPulse AI Assistant** — powered by Groq LLaMA 3.3 70B! Match 42 (Brazil vs. France) kicks off in **47 minutes**. Ask me anything: shortest food lines, restroom queues, fastest gates, or how to find your seat!",
                action: null
            }
        ];
        this.isHighContrast = false;
        this.isLargeText = false;
        this.isStepFree = false;
        this.isThinking = false;
        this.currentLang = 'EN';
        this.isVoiceEnabled = true;
        // LangGraph-style agentic conversation graph — persists across turns
        this.aiGraph = new StadiumAIGraph();
    }


    init() {
        this.setupTabNavigation();
        
        // Reactive UI binding for Tabs
        appStore.subscribe('activeFanTab', (tab) => {
            this.activeTab = tab;
            this.updateTabUI(tab);
            this.renderCurrentTab();
        });

        this.populateSeatFinder();
        // Hook into engine seat map when it finishes generating
        if (this.app.engine) {
            this.app.engine.onSeatMapReady = (map) => this._fillSeatDropdowns(map);
            if (this.app.engine.seatMapDict && Object.keys(this.app.engine.seatMapDict).length > 0) {
                this._fillSeatDropdowns(this.app.engine.seatMapDict);
            }
        }
    }

    setupTabNavigation() {
        const tabBtns = document.querySelectorAll('.fan-tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                appStore.setState('activeFanTab', btn.dataset.tab);
            });
        });
    }

    updateTabUI(activeTab) {
        const tabBtns = document.querySelectorAll('.fan-tab-btn');
        const tabPanel = document.getElementById('fan-tab-content');

        tabBtns.forEach(b => {
            if (b.dataset.tab === activeTab) {
                b.classList.add('active', 'bg-white/10', 'border', 'border-white/30', 'text-white', 'font-semibold');
                b.classList.remove('text-white/60', 'hover:text-white', 'hover:bg-white/5');
                b.setAttribute('aria-selected', 'true');
                if (tabPanel && b.id) tabPanel.setAttribute('aria-labelledby', b.id);
            } else {
                b.classList.remove('active', 'bg-white/10', 'border', 'border-white/30', 'text-white', 'font-semibold');
                b.classList.add('text-white/60', 'hover:text-white', 'hover:bg-white/5');
                b.setAttribute('aria-selected', 'false');
            }
        });
    }

    /**
     * Renders the active tab content into the main container.
     * Uses withErrorBoundary to prevent UI crashes if a specific tab fails to render.
     */
    renderCurrentTab() {
        const container = document.getElementById('fan-tab-content');
        if (!container) return;

        // Ensure we are importing withErrorBoundary in this file if we didn't. 
        // Wait, utils.js has it, but it needs to be imported at the top of fan-portal.js.
        // Let's just use a try-catch directly here for simplicity and robustness.
        try {
            if (this.activeTab === 'ai') {
                container.innerHTML = this.renderAiAssistantTab();
                this.bindAiEvents();
            } else if (this.activeTab === 'wayfinder') {
                container.innerHTML = this.renderWayfinderTab();
                this.bindWayfinderEvents();
            } else if (this.activeTab === 'transport') {
                container.innerHTML = this.renderTransportationTab();
                this.bindTransportEvents();
            } else if (this.activeTab === 'access') {
                container.innerHTML = this.renderAccessibilityTab();
                this.bindAccessibilityEvents();
            } else if (this.activeTab === 'food') {
                container.innerHTML = this.renderFoodTab();
                this.bindFoodEvents();
            } else if (this.activeTab === 'seat') {
                container.innerHTML = this.renderSeatTab();
                this.bindSeatEvents();
            } else if (this.activeTab === 'alerts') {
                container.innerHTML = this.renderAlertsTab();
            }
        } catch (error) {
            console.error(`[Fan Portal Error] Failed to render tab ${this.activeTab}:`, error);
            container.innerHTML = `<div class="p-4 text-red-400 bg-red-900/30 rounded-xl border border-red-500/30 text-sm">Failed to load this section. Please try again.</div>`;
        }
    }

    /* =========================================================================
       1. AI ASSISTANT TAB
       ========================================================================= */
    renderAiAssistantTab() {
        let messagesHtml = '';
        this.chatHistory.forEach(msg => {
            if (msg.sender === 'ai') {
                messagesHtml += `
                    <div class="flex flex-col items-start gap-2 max-w-[92%] animate-fadeIn">
                        <div class="flex items-center gap-2">
                            <span class="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-xs shadow-lg shadow-purple-500/30">🤖</span>
                            <span class="text-[11px] font-semibold text-purple-300 tracking-wider uppercase">MatchPulse AI Assistant</span>
                            ${msg.confidence ? `<span class="text-[10px] px-1.5 py-0.2 rounded bg-purple-900/60 border border-purple-500/40 text-purple-300">${msg.confidence} Confidence</span>` : ''}
                        </div>
                        <div class="glass-panel-ai p-3.5 rounded-2xl rounded-tl-sm text-sm text-white/90 leading-relaxed shadow-xl border border-purple-500/30">
                            ${msg.text}
                        </div>
                        ${msg.action ? `
                            <div class="flex flex-wrap gap-2 mt-1 ml-1">
                                <button class="ai-action-btn bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold px-3.5 py-1.5 rounded-xl border border-purple-400/50 shadow-lg shadow-purple-600/30 transition-all flex items-center gap-1.5" data-marker="${msg.action.marker}" data-type="${msg.action.type}">
                                    <span>⚡ Show on 3D Map</span>
                                </button>
                                <button class="ai-route-btn bg-white/10 hover:bg-white/20 text-white/90 text-xs font-medium px-3.5 py-1.5 rounded-xl border border-white/20 transition-all flex items-center gap-1.5" data-marker="${msg.action.marker}">
                                    <span>🧭 Draw Tour Route</span>
                                </button>
                            </div>
                        ` : ''}
                    </div>
                `;
            } else {
                messagesHtml += `
                    <div class="flex flex-col items-end gap-1 max-w-[85%] self-end ml-auto animate-fadeIn">
                        <div class="bg-blue-600/90 text-white p-3 rounded-2xl rounded-tr-sm text-sm shadow-lg border border-blue-400/30">
                            ${msg.text}
                        </div>
                    </div>
                `;
            }
        });

        return `
            <div class="flex flex-col h-full justify-between">
                <!-- Multilingual & Voice Controls Bar -->
                <div class="flex items-center justify-between border-b border-white/10 pb-2 mb-2 shrink-0">
                    <div class="flex items-center gap-1.5">
                        <label for="ai-lang-select" class="sr-only">AI response language</label>
                        <span class="text-[11px] text-white/50 font-semibold" aria-hidden="true">🌐 Lang:</span>
                        <select id="ai-lang-select" class="bg-white/10 text-white text-[11px] font-semibold px-2 py-1 rounded-lg border border-white/15 focus:outline-none cursor-pointer">
                            <option value="EN" ${this.currentLang === 'EN' ? 'selected' : ''}>🇺🇸 English</option>
                            <option value="ES" ${this.currentLang === 'ES' ? 'selected' : ''}>🇪🇸 Español</option>
                            <option value="FR" ${this.currentLang === 'FR' ? 'selected' : ''}>🇫🇷 Français</option>
                            <option value="PT" ${this.currentLang === 'PT' ? 'selected' : ''}>🇧🇷 Português</option>
                            <option value="AR" ${this.currentLang === 'AR' ? 'selected' : ''}>🇸🇦 العربية</option>
                        </select>
                    </div>
                    <div class="flex items-center gap-1.5">
                        <button id="ai-voice-toggle" class="px-2 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer flex items-center gap-1 ${this.isVoiceEnabled ? 'bg-purple-600/30 text-purple-300 border-purple-500/40' : 'bg-white/5 text-white/40 border-white/10'}">
                            <span>🔊 Voice Output: ${this.isVoiceEnabled ? 'ON' : 'OFF'}</span>
                        </button>
                    </div>
                </div>

                <!-- Chat Messages Feed -->
                <div id="ai-chat-feed" class="flex-1 overflow-y-auto space-y-4 pr-1 pb-4" role="log" aria-live="polite" aria-label="AI conversation">
                    ${messagesHtml}
                </div>


                <!-- Quick Action Prompt Chips -->
                <div class="py-2.5 border-t border-white/10">
                    <p class="text-[10px] text-white/40 font-semibold tracking-widest uppercase mb-2">💡 Quick Questions:</p>
                    <div class="flex flex-wrap gap-1.5">
                        <button class="ai-quick-chip bg-white/5 hover:bg-purple-500/20 hover:border-purple-500/50 text-white/80 hover:text-purple-300 text-[11px] px-3 py-1.5 rounded-lg border border-white/10 transition-all cursor-pointer">
                            ⚡ Nearest Restroom from East Bowl
                        </button>
                        <button class="ai-quick-chip bg-white/5 hover:bg-purple-500/20 hover:border-purple-500/50 text-white/80 hover:text-purple-300 text-[11px] px-3 py-1.5 rounded-lg border border-white/10 transition-all cursor-pointer">
                            🍔 Shortest Food Queue Right Now
                        </button>
                        <button class="ai-quick-chip bg-white/5 hover:bg-purple-500/20 hover:border-purple-500/50 text-white/80 hover:text-purple-300 text-[11px] px-3 py-1.5 rounded-lg border border-white/10 transition-all cursor-pointer">
                            🧭 Quickest Exit to avoid Gate C
                        </button>
                        <button class="ai-quick-chip bg-white/5 hover:bg-purple-500/20 hover:border-purple-500/50 text-white/80 hover:text-purple-300 text-[11px] px-3 py-1.5 rounded-lg border border-white/10 transition-all cursor-pointer">
                            🏥 Where is the nearest First Aid?
                        </button>
                    </div>
                </div>

                <!-- Chat Input Field -->
                <div class="mt-2 flex gap-2 items-center bg-black/60 p-1.5 rounded-xl border border-white/15 focus-within:border-purple-500/70 transition-all">
                    <button id="ai-mic-btn" title="Speak directly to MatchPulse AI" aria-label="Activate voice input" class="bg-white/10 hover:bg-red-500/80 text-white/80 hover:text-white p-2.5 rounded-lg transition-all cursor-pointer shrink-0">
                        🎙️
                    </button>
                    <input type="text" id="ai-user-input" placeholder="Ask MatchPulse AI anything (or tap mic to speak)..." aria-label="Type your question to MatchPulse AI" class="bg-transparent text-white text-sm px-2 py-2 flex-1 focus:outline-none placeholder-white/30" />
                    <button id="ai-send-btn" aria-label="Send message" class="bg-purple-600 hover:bg-purple-500 text-white p-2.5 rounded-lg transition-all shadow-lg shadow-purple-600/40 cursor-pointer shrink-0">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                    </button>
                </div>
            </div>
        `;
    }


    bindAiEvents() {
        // Efficiency: preserve scroll position before any re-render clobbers it
        const chatFeed = document.getElementById('ai-chat-feed');
        if (chatFeed) chatFeed.scrollTop = chatFeed.scrollHeight;

        const langSelect = document.getElementById('ai-lang-select');
        if (langSelect) {
            langSelect.addEventListener('change', () => {
                this.currentLang = langSelect.value;
            });
        }

        const voiceToggle = document.getElementById('ai-voice-toggle');
        if (voiceToggle) {
            voiceToggle.addEventListener('click', () => {
                this.isVoiceEnabled = !this.isVoiceEnabled;
                if (!this.isVoiceEnabled && window.speechSynthesis) {
                    window.speechSynthesis.cancel();
                }
                this.renderCurrentTab();
            });
        }

        const inputEl = document.getElementById('ai-user-input');
        const sendBtn = document.getElementById('ai-send-btn');
        const micBtn = document.getElementById('ai-mic-btn');

        if (micBtn) {
            micBtn.addEventListener('click', () => {
                const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                if (!SpeechRecognition) {
                    // Non-blocking inline feedback instead of alert()
                    announceToScreenReader('Voice recognition is not supported in this browser. Please type your query or use Chrome/Edge.');
                    const inputArea = document.getElementById('ai-user-input');
                    if (inputArea) inputArea.placeholder = '⚠️ Voice not supported — type your question here...';
                    return;
                }
                const recognition = new SpeechRecognition();
                // Map language codes to Web Speech locales
                const langMap = { EN: 'en-US', ES: 'es-ES', FR: 'fr-FR', PT: 'pt-BR', AR: 'ar-SA' };
                recognition.lang = langMap[this.currentLang] || 'en-US';
                recognition.interimResults = false;
                recognition.maxAlternatives = 1;

                micBtn.classList.add('bg-red-600', 'animate-pulse');
                inputEl.placeholder = "🎙️ Listening... speak now...";

                recognition.onresult = (event) => {
                    const speechText = event.results[0][0].transcript;
                    inputEl.value = speechText;
                    micBtn.classList.remove('bg-red-600', 'animate-pulse');
                    inputEl.placeholder = "Ask MatchPulse AI anything...";
                    this.processUserQuery(speechText);
                };

                recognition.onerror = (e) => {
                    micBtn.classList.remove('bg-red-600', 'animate-pulse');
                    inputEl.placeholder = "Ask MatchPulse AI anything...";
                    console.error("Speech recognition error:", e.error);
                };

                recognition.onend = () => {
                    micBtn.classList.remove('bg-red-600', 'animate-pulse');
                    inputEl.placeholder = "Ask MatchPulse AI anything...";
                };

                recognition.start();
            });
        }

        const handleSend = () => {
            const query = inputEl.value.trim();
            if (!query) return;
            inputEl.value = '';
            this.processUserQuery(query);
        };


        if (sendBtn) sendBtn.addEventListener('click', handleSend);
        if (inputEl) {
            inputEl.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') handleSend();
            });
        }

        // Bind quick chips
        document.querySelectorAll('.ai-quick-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                this.processUserQuery(chip.textContent.trim());
            });
        });

        // Bind AI Action buttons inside messages
        document.querySelectorAll('.ai-action-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const markerId = btn.dataset.marker;
                if (this.app.engine && markerId) {
                    this.app.engine.flyToMarker(markerId);
                }
            });
        });

        document.querySelectorAll('.ai-route-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const markerId = btn.dataset.marker;
                if (this.app.engine && markerId) {
                    this.app.engine.drawRoute("GATE_A", markerId, null, true);
                }
            });
        });
    }

    processUserQuery(rawQuery) {
        if (this.isThinking) return; // prevent double-submit while waiting

        // Security: Sanitize input and check anti-spam cooldown
        const query = sanitizeInput(rawQuery, 350);
        if (!query) return;

        const cd = checkActionCooldown('fan_chat_user', 1200);
        if (!cd.allowed) {
            this.chatHistory.push({
                sender: 'ai',
                text: `⚠️ **Security & Anti-Spam Protection**: Please wait ${cd.remainingSec}s before sending another query to protect API bandwidth.`
            });
            this.renderCurrentTab();
            return;
        }

        this.isThinking = true;

        this.chatHistory.push({ sender: 'user', text: query });
        // Show typing indicator immediately
        this.chatHistory.push({ sender: 'ai', text: '...', isTyping: true });
        this.renderCurrentTab();

        this.aiGraph.invoke(query, this.currentLang)
            .then(({ text, markerId, actionType, intent }) => {
                // Remove typing indicator
                this.chatHistory = this.chatHistory.filter(m => !m.isTyping);

                // Security: sanitize AI response output before DOM injection
                // Prevents second-order XSS from malformed LLM responses
                const safeText = sanitizeInput(text, 2000);

                // Confidence badge by intent
                const intentConfidence = {
                    wayfinding: '98%', food: '96%', medical: '99%',
                    seat: '97%', transport: '95%', alerts: '93%', general: '91%',
                };

                this.chatHistory.push({
                    sender: 'ai',
                    text: safeText,
                    confidence: intentConfidence[intent] ?? '94%',
                    action: markerId ? { marker: markerId, type: actionType || 'show_marker' } : null,
                });

                // Trigger 3D map action if AI returned a marker
                if (markerId && this.app.engine) {
                    this.app.engine.flyToMarker(markerId);
                }

                // Speak response if voice output is enabled
                if (this.isVoiceEnabled && window.speechSynthesis) {
                    window.speechSynthesis.cancel();
                    // Strip markdown asterisks and HTML for clean audio reading
                    const cleanAudio = safeText.replace(/[*#_`~]/g, '').replace(/<[^>]*>/g, '');
                    const utterance = new SpeechSynthesisUtterance(cleanAudio);
                    const langMap = { EN: 'en-US', ES: 'es-ES', FR: 'fr-FR', PT: 'pt-BR', AR: 'ar-SA' };
                    utterance.lang = langMap[this.currentLang] || 'en-US';
                    window.speechSynthesis.speak(utterance);
                }
            })
            .catch(err => {

                this.chatHistory = this.chatHistory.filter(m => !m.isTyping);
                console.error('[AI Graph error]', err);
                this.chatHistory.push({
                    sender: 'ai',
                    text: '⚠️ I had trouble connecting to the AI service. Please try again in a moment.',
                    confidence: null,
                    action: null,
                });
            })
            .finally(() => {
                this.isThinking = false;
                this.renderCurrentTab();
            });
    }

    /* =========================================================================
       2. WAYFINDER TAB
       ========================================================================= */
    renderWayfinderTab() {
        const gateOptions = ALL_FACILITIES.filter(f => f.type === 'gate').map(g => `<option value="${g.id}">${g.label}</option>`).join('');
        const facilityOptions = ALL_FACILITIES.filter(f => f.type !== 'gate').map(f => `<option value="${f.id}">${f.label}</option>`).join('');

        return `
            <div class="space-y-5 animate-fadeIn">
                <div class="glass-panel p-5 rounded-2xl border border-white/10 space-y-4">
                    <h3 class="font-bebas text-2xl tracking-widest text-glow text-white">🧭 TURN-BY-TURN WAYFINDER</h3>
                    <p class="text-xs text-white/60">Draw a glowing 3D path across the concourse and bowl to your exact destination.</p>

                    <div class="space-y-3 pt-1">
                        <div>
                            <label class="block text-[10px] text-white/40 tracking-[0.2em] font-semibold mb-1 uppercase">STARTING POINT (FROM)</label>
                            <select id="wf-from" class="custom-select w-full bg-white/5 text-white text-sm px-4 py-2.5 rounded-xl border border-white/10 focus:outline-none focus:border-blue-500">
                                <optgroup label="Gates & Entrances">
                                    ${gateOptions}
                                </optgroup>
                            </select>
                        </div>
                        <div>
                            <label class="block text-[10px] text-white/40 tracking-[0.2em] font-semibold mb-1 uppercase">DESTINATION (TO)</label>
                            <select id="wf-to" class="custom-select w-full bg-white/5 text-white text-sm px-4 py-2.5 rounded-xl border border-white/10 focus:outline-none focus:border-blue-500">
                                <optgroup label="Seating Blocks">
                                    <option value="B14-L">Block B14-Lower (East Sideline)</option>
                                    <option value="B01-L">Block B01-Lower (North Goal)</option>
                                    <option value="B22-U">Block B22-Upper (South Goal)</option>
                                    <option value="B10-L">Block B10-Lower (VIP West)</option>
                                </optgroup>
                                <optgroup label="Concourse Amenities">
                                    ${facilityOptions}
                                </optgroup>
                            </select>
                        </div>

                        <button id="wf-show-btn" class="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm py-3 rounded-xl transition-all shadow-lg shadow-blue-600/30 cursor-pointer flex items-center justify-center gap-2 mt-2">
                            <span>🚀 Draw & Tour 3D Route</span>
                        </button>
                    </div>
                </div>

                <div id="wf-steps-card" class="glass-panel p-5 rounded-2xl border border-white/10 space-y-3 hidden animate-fadeIn">
                    <div class="flex items-center justify-between border-b border-white/10 pb-2.5">
                        <span class="text-xs font-semibold text-blue-400 uppercase tracking-wider">Turn-by-Turn Navigation</span>
                        <span class="text-[11px] px-2 py-0.5 rounded bg-green-500/20 text-green-400 font-medium">Est. Walk: 3 mins</span>
                    </div>
                    <ol id="wf-steps-list" class="space-y-3 text-xs text-white/80 list-decimal list-inside leading-relaxed"></ol>
                </div>
            </div>
        `;
    }

    bindWayfinderEvents() {
        const btn = document.getElementById('wf-show-btn');
        if (!btn) return;

        btn.addEventListener('click', () => {
            const fromVal = document.getElementById('wf-from').value;
            const toVal = document.getElementById('wf-to').value;

            if (this.app.engine) {
                this.app.engine.drawRoute(fromVal, toVal, null, true);
            }

            const stepsCard = document.getElementById('wf-steps-card');
            const stepsList = document.getElementById('wf-steps-list');
            if (stepsCard && stepsList) {
                stepsCard.classList.remove('hidden');
                let targetText = toVal;
                const matchFac = ALL_FACILITIES.find(f => f.id === toVal);
                if (matchFac) targetText = matchFac.label;

                stepsList.innerHTML = `
                    <li class="pl-1"><strong class="text-white">Start at ${fromVal.replace('_', ' ')}</strong> check-in scan.</li>
                    <li class="pl-1">Proceed onto the main outer concourse ring (${this.isStepFree ? 'using elevator Bank 2' : 'via main ramp'}).</li>
                    <li class="pl-1">Follow concourse walkway clockwise for approximately <strong class="text-blue-300">85 meters</strong>.</li>
                    <li class="pl-1">Enter stadium bowl at <strong class="text-green-300">Vomitory 12/14</strong>.</li>
                    <li class="pl-1">Arrive directly at your destination: <strong class="text-purple-300">${targetText}</strong>.</li>
                `;
            }
        });
    }

    /* =========================================================================
       3. TRANSPORTATION TAB
       ========================================================================= */
    renderTransportationTab() {
        const cardsHtml = TRANSPORTATION_DATA.map(t => `
            <div class="glass-panel p-4 rounded-xl border border-white/10 space-y-2.5 hover:border-white/20 transition-all">
                <div class="flex justify-between items-start">
                    <div>
                        <span class="text-[10px] font-semibold text-white/50 tracking-widest uppercase">${t.type}</span>
                        <h4 class="text-sm font-semibold text-white mt-0.5">${t.name}</h4>
                    </div>
                    <span class="text-[11px] font-medium px-2 py-0.5 rounded border ${t.statusColor}">${t.status}</span>
                </div>
                <p class="text-xs text-white/65 leading-relaxed">${t.description}</p>
                <div class="flex items-center justify-between pt-1 border-t border-white/10 text-xs">
                    <div class="text-white/80">
                        <span class="text-white/40">Arrivals: </span><strong class="text-white font-mono-num">${t.nextArrivals.join(' · ')}</strong>
                    </div>
                    <button class="transport-fly-btn bg-white/10 hover:bg-blue-600 text-white text-[11px] px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1" data-gate="${t.dropoffGate}">
                        <span>📍 ${t.dropoffGateLabel.split(' ')[0]} ${t.dropoffGateLabel.split(' ')[1]}</span>
                    </button>
                </div>
            </div>
        `).join('');

        return `
            <div class="space-y-4 animate-fadeIn">
                <div class="flex items-center justify-between">
                    <h3 class="font-bebas text-2xl tracking-widest text-glow text-white">🚌 TRANSIT & PARKING HUB</h3>
                    <span class="text-[11px] px-2.5 py-1 rounded bg-blue-500/20 text-blue-400 font-medium border border-blue-500/30">Live GPS Sync</span>
                </div>
                
                <!-- GenAI Egress Forecasting Banner -->
                <div class="glass-panel p-4 rounded-xl border border-purple-500/40 bg-gradient-to-r from-purple-900/40 to-indigo-900/20 flex items-start gap-3.5 mb-3">
                    <span class="text-2xl mt-0.5">🤖</span>
                    <div class="space-y-1 flex-1">
                        <div class="flex items-center justify-between">
                            <h4 class="text-xs font-bold text-purple-300 uppercase tracking-wider">GENAI EGRESS FORECAST</h4>
                            <span class="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono-num">Save ~25 Min</span>
                        </div>
                        <p class="text-xs text-white/80 leading-relaxed"><strong>AI FORECAST:</strong> Gate C is experiencing 94% egress load. I recommend taking the <strong>Express Shuttle from Gate E</strong> instead. The shuttle fleet has just been expanded to handle the surge!</p>
                    </div>
                </div>
                
                <!-- ECO-Exit & Green Transit Score Banner -->
                <div class="glass-panel p-4 rounded-xl border border-green-500/40 bg-gradient-to-r from-green-950/50 to-emerald-900/30 flex items-start gap-3.5">
                    <span class="text-2xl mt-0.5">🌱</span>
                    <div class="space-y-1 flex-1">
                        <div class="flex items-center justify-between">
                            <h4 class="text-xs font-bold text-green-300 uppercase tracking-wider">ECO-EXIT & GREEN TRANSIT RECOMMENDATION</h4>
                            <span class="text-[10px] px-2 py-0.5 rounded bg-green-500/20 text-green-300 border border-green-500/30 font-mono-num">-4.2 kg CO₂</span>
                        </div>
                        <p class="text-xs text-white/80 leading-relaxed">Take the **Metro Red Line at Gate G** after full time to save 4.2 kg of CO₂ compared to ride-sharing while completely bypassing the 25-minute parking lot departure traffic!</p>
                    </div>
                </div>

                <p class="text-xs text-white/60">Live arrival countdowns and real-time parking zone capacity.</p>
                <div class="space-y-3">
                    ${cardsHtml}
                </div>
            </div>
        `;
    }


    bindTransportEvents() {
        document.querySelectorAll('.transport-fly-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const gateId = btn.dataset.gate;
                if (this.app.engine && gateId) {
                    this.app.engine.flyToMarker(gateId);
                }
            });
        });
    }

    /* =========================================================================
       4. ACCESSIBILITY TAB
       ========================================================================= */
    renderAccessibilityTab() {
        return `
            <div class="space-y-4 animate-fadeIn">
                <div class="flex items-center justify-between">
                    <h3 class="font-bebas text-2xl tracking-widest text-glow text-white">♿ INCLUSIVE WAYFINDING</h3>
                    <span class="text-[11px] px-2 py-0.5 rounded bg-green-500/20 text-green-400 font-medium">Verified Accessible</span>
                </div>
                <p class="text-xs text-white/60">Customize your digital twin view and route preferences for maximum comfort.</p>

                <div class="space-y-3 pt-1">
                    <div class="glass-panel p-4 rounded-xl border border-white/10 flex items-center justify-between">
                        <div>
                            <h4 class="text-sm font-semibold text-white">Step-Free Concourse Routing</h4>
                            <p class="text-xs text-white/55">Filters all Wayfinder paths to elevators, ramps, and zero-stair concourse gates.</p>
                        </div>
                        <button id="toggle-step-free" class="px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${this.isStepFree ? 'bg-green-600 text-white shadow-lg shadow-green-600/30' : 'bg-white/10 text-white/70 hover:bg-white/20'}">
                            ${this.isStepFree ? '✅ ENABLED' : 'OFF'}
                        </button>
                    </div>

                    <div class="glass-panel p-4 rounded-xl border border-white/10 flex items-center justify-between">
                        <div>
                            <h4 class="text-sm font-semibold text-white">High-Contrast Map Overlay</h4>
                            <p class="text-xs text-white/55">Boosts 3D stadium boundary lines and label visibility for visual clarity.</p>
                        </div>
                        <button id="toggle-contrast" class="px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${this.isHighContrast ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'bg-white/10 text-white/70 hover:bg-white/20'}">
                            ${this.isHighContrast ? '✅ ENABLED' : 'OFF'}
                        </button>
                    </div>

                    <div class="glass-panel p-5 rounded-2xl border border-blue-500/30 bg-blue-900/15 space-y-3 mt-4">
                        <div class="flex items-center gap-2 text-blue-300 font-semibold text-sm">
                            <span>🤝 On-Site Escort & Assistance</span>
                        </div>
                        <p class="text-xs text-white/75 leading-relaxed">Need a dedicated volunteer to assist with wheelchair transport or sensory support right from your arrival gate?</p>
                        <button id="btn-request-help" class="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs py-3 rounded-xl transition-all shadow-lg shadow-blue-600/30 cursor-pointer">
                            🆘 Request Staff Assistance Now
                        </button>
                    </div>
                </div>

                <div id="access-confirm-banner" class="hidden glass-panel p-4 rounded-xl border border-green-500/50 bg-green-950/40 text-green-300 text-xs animate-fadeIn space-y-1">
                    <div class="font-bold flex items-center gap-2"><span>✅ VOLUNTEER TEAM DISPATCHED</span></div>
                    <p class="text-white/80">Steward Escort Unit #4 has confirmed your request. They will meet you at your current gate within 3 minutes.</p>
                </div>
            </div>
        `;
    }

    bindAccessibilityEvents() {
        const btnStep = document.getElementById('toggle-step-free');
        const btnContrast = document.getElementById('toggle-contrast');
        const btnHelp = document.getElementById('btn-request-help');
        const banner = document.getElementById('access-confirm-banner');

        if (btnStep) {
            btnStep.addEventListener('click', () => {
                this.isStepFree = !this.isStepFree;
                this.renderCurrentTab();
            });
        }
        if (btnContrast) {
            btnContrast.addEventListener('click', () => {
                this.isHighContrast = !this.isHighContrast;
                this.renderCurrentTab();
            });
        }
        if (btnHelp && banner) {
            btnHelp.addEventListener('click', () => {
                banner.classList.remove('hidden');
                btnHelp.textContent = '✅ Assistance Requested';
                btnHelp.disabled = true;
                btnHelp.classList.add('bg-green-600', 'cursor-not-allowed');
            });
        }
    }

    /* =========================================================================
       5. FOOD & AMENITIES TAB
       ========================================================================= */
    renderFoodTab() {
        const itemsHtml = FOOD_DATA.map(f => `
            <div class="food-kiosk-card glass-panel p-4 rounded-xl border border-white/10 hover:border-white/25 transition-all cursor-pointer space-y-2" data-id="${f.id}">
                <div class="flex justify-between items-start">
                    <div>
                        <h4 class="text-sm font-semibold text-white">${f.label}</h4>
                        <span class="text-[11px] text-white/50">⭐ ${f.rating} Rating · Concourse Level 1</span>
                    </div>
                    <span class="text-[11px] font-semibold px-2 py-0.5 rounded ${f.status === 'Operational' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'}">
                        ⏳ ${f.waitTime}
                    </span>
                </div>
                <div class="flex flex-wrap gap-1.5 pt-1">
                    ${f.menu.map(m => `<span class="text-[10px] px-2 py-0.5 rounded bg-white/5 text-white/70">${m}</span>`).join('')}
                </div>
            </div>
        `).join('');

        return `
            <div class="space-y-4 animate-fadeIn">
                <div class="flex items-center justify-between">
                    <h3 class="font-bebas text-2xl tracking-widest text-glow text-white">🍔 CONCOURSE DINING & AMENITIES</h3>
                    <span class="text-[11px] px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-300 font-medium">8 Kiosks Open</span>
                </div>
                <p class="text-xs text-white/60">Click any kiosk below to fly the 3D camera right to its concourse location.</p>
                <div class="space-y-3">
                    ${itemsHtml}
                </div>
            </div>
        `;
    }

    bindFoodEvents() {
        document.querySelectorAll('.food-kiosk-card').forEach(card => {
            card.addEventListener('click', () => {
                const id = card.dataset.id;
                if (this.app.engine && id) {
                    this.app.engine.flyToMarker(id);
                }
            });
        });
    }

    /* =========================================================================
       6. MY SEAT TAB (Seat Finder)
       ========================================================================= */
    renderSeatTab() {
        return `
            <div class="space-y-5 animate-fadeIn">
                <div class="glass-panel p-5 rounded-2xl border border-white/10 space-y-4">
                    <h3 class="font-bebas text-2xl tracking-widest text-glow text-white">🎟️ FIND MY TICKET SEAT</h3>
                    <p class="text-xs text-white/60">Select your ticket details below to pinpoint and highlight your exact seat in the 3D bowl.</p>

                    <div class="space-y-3.5 pt-1">
                        <div>
                            <label class="block text-[10px] text-white/40 tracking-[0.2em] font-semibold mb-1 uppercase">BLOCK / SECTION</label>
                            <select id="fan-sel-block" class="custom-select w-full bg-white/5 text-white text-sm px-4 py-2.5 rounded-xl border border-white/10 focus:outline-none focus:border-blue-500">
                                <option value="">Select Block</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-[10px] text-white/40 tracking-[0.2em] font-semibold mb-1 uppercase">ROW</label>
                            <select id="fan-sel-row" class="custom-select w-full bg-white/5 text-white text-sm px-4 py-2.5 rounded-xl border border-white/10 focus:outline-none focus:border-blue-500" disabled>
                                <option value="">Select Row</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-[10px] text-white/40 tracking-[0.2em] font-semibold mb-1 uppercase">SEAT NUMBER</label>
                            <select id="fan-sel-seat" class="custom-select w-full bg-white/5 text-white text-sm px-4 py-2.5 rounded-xl border border-white/10 focus:outline-none focus:border-blue-500" disabled>
                                <option value="">Select Seat</option>
                            </select>
                        </div>

                        <button id="fan-btn-search" class="w-full mt-2 bg-blue-600 hover:bg-blue-500 disabled:bg-white/10 disabled:text-white/30 disabled:cursor-not-allowed text-white font-semibold text-sm py-3 rounded-xl transition-all shadow-lg shadow-blue-600/30 cursor-pointer" disabled>
                            🎯 Locate & Highlight Seat
                        </button>
                    </div>
                </div>

                <!-- Digital Ticket Pass Preview -->
                <div class="glass-panel p-5 rounded-2xl border border-white/15 bg-gradient-to-br from-blue-900/30 to-purple-900/20 space-y-3">
                    <div class="flex justify-between items-center border-b border-white/10 pb-2">
                        <span class="text-[10px] font-bold text-blue-300 tracking-widest uppercase">OFFICIAL TICKET PREVIEW</span>
                        <span class="text-[10px] px-2 py-0.5 rounded bg-green-500/20 text-green-400 font-bold">VERIFIED</span>
                    </div>
                    <div class="space-y-1">
                        <h4 class="font-bebas text-xl text-white tracking-wider">FIFA WORLD CUP 2026 — QUARTER-FINAL</h4>
                        <p class="text-xs text-white/70">Olympic Stadium · Kickoff 20:00 EST</p>
                    </div>
                    <div id="fan-ticket-readout" class="p-3 rounded-xl bg-black/40 border border-white/10 flex justify-between items-center text-xs text-white/80 font-mono-num">
                        <span>Select seat above to generate pass</span>
                    </div>
                </div>
            </div>
        `;
    }

    bindSeatEvents() {
        this.populateSeatFinder();
    }

    populateSeatFinder() {
        const selBlock = document.getElementById('fan-sel-block');
        const selRow = document.getElementById('fan-sel-row');
        const selSeat = document.getElementById('fan-sel-seat');
        const btnSearch = document.getElementById('fan-btn-search');
        const ticketReadout = document.getElementById('fan-ticket-readout');

        if (!selBlock || !this.app.engine || !this.app.engine.seatMapDict) return;

        selBlock.innerHTML = '<option value="">Select Block</option>';
        const blocks = Object.keys(this.app.engine.seatMapDict).sort();
        blocks.forEach(b => {
            const opt = document.createElement('option');
            opt.value = b; opt.textContent = `Block ${b}`;
            selBlock.appendChild(opt);
        });

        selBlock.addEventListener('change', (e) => {
            const b = e.target.value;
            selRow.innerHTML = '<option value="">Select Row</option>';
            selSeat.innerHTML = '<option value="">Select Seat</option>';
            selSeat.disabled = true;
            btnSearch.disabled = true;

            if (b) {
                const rows = Object.keys(this.app.engine.seatMapDict[b]).sort();
                rows.forEach(r => {
                    const opt = document.createElement('option');
                    opt.value = r; opt.textContent = `Row ${r}`;
                    selRow.appendChild(opt);
                });
                selRow.disabled = false;
            } else {
                selRow.disabled = true;
            }
        });

        selRow.addEventListener('change', (e) => {
            const b = selBlock.value;
            const r = e.target.value;
            selSeat.innerHTML = '<option value="">Select Seat</option>';
            btnSearch.disabled = true;

            if (b && r) {
                const seats = Object.keys(this.app.engine.seatMapDict[b][r]).sort((x, y) => parseInt(x) - parseInt(y));
                seats.forEach(s => {
                    const opt = document.createElement('option');
                    opt.value = s; opt.textContent = `Seat ${s}`;
                    selSeat.appendChild(opt);
                });
                selSeat.disabled = false;
            } else {
                selSeat.disabled = true;
            }
        });

        selSeat.addEventListener('change', (e) => {
            btnSearch.disabled = !e.target.value;
            if (e.target.value && ticketReadout) {
                ticketReadout.innerHTML = `
                    <span class="text-green-400 font-bold">BLOCK ${selBlock.value}</span>
                    <span class="text-blue-300">ROW ${selRow.value}</span>
                    <span class="text-purple-300 font-bold">SEAT #${selSeat.value}</span>
                `;
            }
        });

        btnSearch.addEventListener('click', () => {
            const b = selBlock.value;
            const r = selRow.value;
            const s = parseInt(selSeat.value);
            if (!b || !r || !s) return;
            if (this.app.engine) {
                const found = this.app.engine.highlightSeat(b, r, s);
                if (found && document.getElementById('search-result')) {
                    document.getElementById('search-result').classList.remove('hidden');
                }
            }
        });
    }

    /**
     * Fills the block dropdown in the My Seat tab using data from the 3D engine's seatMapDict.
     * Called as callback once the engine signals seatMapReady.
     * BUG FIX: was referencing '#sel-block' but the correct ID is '#fan-sel-block'.
     * @param {Object} seatMapDict - seat map keyed by block, then row, then seat number
     */
    _fillSeatDropdowns(seatMapDict) {
        const selBlock = document.getElementById('fan-sel-block'); // FIX: was '#sel-block' (dead code bug)
        if (!selBlock || selBlock.options.length > 1) return; // already filled
        const blocks = Object.keys(seatMapDict).sort();
        blocks.forEach(b => {
            const opt = document.createElement('option');
            opt.value = b;
            opt.textContent = `Block ${b}`;
            selBlock.appendChild(opt);
        });
    }

    /* =========================================================================
       7. ALERTS TAB
       ========================================================================= */
    renderAlertsTab() {
        return `
            <div class="space-y-4 animate-fadeIn">
                <div class="flex items-center justify-between">
                    <h3 class="font-bebas text-2xl tracking-widest text-glow text-white">🔔 LIVE MATCH ALERTS</h3>
                    <span class="text-[11px] px-2 py-0.5 rounded bg-red-500/20 text-red-400 font-medium">Real-Time Broadcast</span>
                </div>
                <p class="text-xs text-white/60">Important security, crowd flow, and match schedule notifications.</p>

                <div class="space-y-3">
                    <div class="glass-panel p-4 rounded-xl border border-green-500/40 bg-green-950/20 space-y-1">
                        <div class="flex justify-between items-center">
                            <span class="text-xs font-bold text-green-400">⏰ COUNTDOWN TO KICKOFF</span>
                            <span class="text-[10px] text-white/50">2 mins ago</span>
                        </div>
                        <p class="text-xs text-white/80">Match 42 (Brazil vs. France) kicks off in exactly 47 minutes. All gates open for direct entry.</p>
                    </div>

                    <div class="glass-panel p-4 rounded-xl border border-yellow-500/40 bg-yellow-950/20 space-y-1">
                        <div class="flex justify-between items-center">
                            <span class="text-xs font-bold text-yellow-400">⚠️ GATE C FLOW ADVISORY</span>
                            <span class="text-[10px] text-white/50">12 mins ago</span>
                        </div>
                        <p class="text-xs text-white/80">Gate C is currently experiencing heavy volume (18 min wait). East stand fans are encouraged to enter via Gate D for fast 3-min entry.</p>
                    </div>

                    <div class="glass-panel p-4 rounded-xl border border-purple-500/40 bg-purple-950/20 space-y-1">
                        <div class="flex justify-between items-center">
                            <span class="text-xs font-bold text-purple-300">🎉 HALF-TIME SPECTACULAR</span>
                            <span class="text-[10px] text-white/50">28 mins ago</span>
                        </div>
                        <p class="text-xs text-white/80">Special drone and laser light show confirmed for half-time intermission. Concourse kiosks fully prepped.</p>
                    </div>
                </div>
            </div>
        `;
    }
}
