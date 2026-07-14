// js/control-room.js - Rebalanced Committee Control Room & Mission Control Operations

import { BLOCK_DENSITY_DATA, ALL_FACILITIES, COMMITTEE_RECOMMENDATIONS, VOLUNTEER_TASKS, INCIDENT_LOG, PREDICTIVE_DENSITY_DATA, GENAI_SIGNAGE_PRESETS, SUSTAINABILITY_METRICS } from './data.js';

import { appStore } from './store.js';
import { sanitizeInput } from './utils.js';

/**
 * ControlRoomController
 * Manages the UI and interactions for the Committee Control Room.
 * Handles telemetry data, density heatmaps, and AI recommendations.
 */
export class ControlRoomController {
    constructor(app) {
        this.app = app;
        this.isCriticalAlertActive = false;
        this.currentTimeTravel = '0m'; // '-30m', '0m', '45m', '90m'
        this.currentOverlay = 'density'; // track locally in sync with store
        this.recommendations = [...COMMITTEE_RECOMMENDATIONS];
        this.tasks = [...VOLUNTEER_TASKS];
        this.incidents = [...INCIDENT_LOG];
    }


    /**
     * Initializes the controller, sets up reactive store bindings,
     * renders initial panels, and binds global events.
     */
    init() {
        // Reactive bindings for Control Room State
        appStore.subscribe('currentOverlay', () => {
            this.renderMapOverlayBar();
            this.applyDefaultOverlay();
        });
        appStore.subscribe('activeOpsTab', () => {
            this.renderOpsCenterTabbedPanel();
        });

        this.renderAllPanels();
        this.bindGlobalControls();
    }

    applyDefaultOverlay() {
        setTimeout(() => {
            if (this.app.engine && this.currentOverlay === 'density') {
                this.app.engine.recolorDensityHeatmap(BLOCK_DENSITY_DATA);
            } else if (this.app.engine && this.currentOverlay === 'normal') {
                this.app.engine.updateLabelDisplay('normal');
            }
        }, 150);
    }

    /**
     * Renders all control room panels with error boundaries.
     */
    renderAllPanels() {
        try { this.renderHeader(); } catch (e) { console.error("Error rendering Header:", e); }
        try { this.renderDensityPanel(); } catch (e) { console.error("Error rendering Density Panel:", e); }
        try { this.renderFacilityBoard(); } catch (e) { console.error("Error rendering Facility Board:", e); }
        try { this.renderMapOverlayBar(); } catch (e) { console.error("Error rendering Map Overlay Bar:", e); }
        try { this.renderOpsCenterTabbedPanel(); } catch (e) { console.error("Error rendering Ops Center Panel:", e); }
        try { this.renderAiRecommendations(); } catch (e) { console.error("Error rendering AI Recommendations Panel:", e); }
    }

    renderHeader() {
        const headerEl = document.getElementById('control-header');
        if (!headerEl) return;

        headerEl.innerHTML = `
            <div class="flex items-center justify-between w-full h-full px-5 glass-panel rounded-2xl border border-white/10">
                <div class="flex items-center gap-4">
                    <h1 class="font-bebas text-3xl text-white tracking-widest text-glow flex items-center gap-2.5">
                        <span>MATCHPULSE</span>
                        <span class="text-xs font-sans font-semibold px-2.5 py-0.5 rounded bg-red-600/30 text-red-400 border border-red-500/40 tracking-wider">COMMAND & CONTROL</span>
                    </h1>
                    <div class="hidden md:flex items-center gap-2 text-xs text-white/70 bg-white/5 px-3 py-1 rounded-full border border-white/10">
                        <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        <span class="font-mono-num" data-sse-status>SYNCED (100% TELEMETRY)</span>
                    </div>
                    <!-- Sustainability & Energy KPI Gauge -->
                    <div class="hidden lg:flex items-center gap-2.5 bg-green-950/40 border border-green-500/30 px-3.5 py-1 rounded-xl text-xs text-green-300">
                        <span>🌱 Solar Grid: <strong class="text-white font-mono-num">${SUSTAINABILITY_METRICS.solarGridEfficiency}</strong></span>
                        <span class="text-white/20">|</span>
                        <span>CO₂ Saved: <strong class="text-white font-mono-num">${SUSTAINABILITY_METRICS.carbonSavedTodayKg}</strong></span>
                    </div>
                </div>


                <div class="flex items-center gap-3">
                    <div class="flex items-center gap-2 bg-white/5 px-3.5 py-1.5 rounded-xl border border-white/10 text-xs">
                        <span class="text-white/50">Operator:</span>
                        <span class="text-white font-mono-num font-semibold">ST-8821</span>
                        <span class="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-semibold ml-1">Lead Ops</span>
                    </div>
                    
                    <button id="btn-switch-to-fan" class="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-lg shadow-blue-600/30 cursor-pointer flex items-center gap-1.5">
                        <span>🎟️ Switch to Fan Portal</span>
                    </button>
                    <button id="btn-logout" class="bg-white/10 hover:bg-white/20 text-white/80 hover:text-white text-xs px-3.5 py-2 rounded-xl transition-all cursor-pointer">
                        <span>Log Out</span>
                    </button>
                </div>
            </div>
        `;

        document.getElementById('btn-switch-to-fan')?.addEventListener('click', () => {
            this.app.switchView('fan');
        });
        document.getElementById('btn-logout')?.addEventListener('click', () => {
            this.app.switchView('landing');
        });
    }

    renderMapOverlayBar() {
        const barEl = document.getElementById('control-map-controls');
        if (!barEl) return;

        barEl.innerHTML = `
            <div class="absolute top-3 left-3 right-3 z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pointer-events-none">
                <!-- Mode Selector -->
                <div class="glass-panel px-3 py-1.5 rounded-xl pointer-events-auto flex items-center gap-1.5 border border-white/15 shadow-xl">
                    <span class="text-[10px] text-white/50 uppercase tracking-wider font-semibold mr-1">Mode:</span>
                    <button class="overlay-toggle-btn px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${appStore.getState('currentOverlay') === 'density' ? 'bg-red-600/90 text-white border border-red-400/50 shadow-lg shadow-red-600/30' : 'bg-white/5 text-white/70 hover:bg-white/10'}" data-mode="density">
                        🔥 Density Heatmap
                    </button>
                    <button class="overlay-toggle-btn px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${appStore.getState('currentOverlay') === 'facility' ? 'bg-blue-600/90 text-white border border-blue-400/50 shadow-lg shadow-blue-600/30' : 'bg-white/5 text-white/70 hover:bg-white/10'}" data-mode="facility">
                        🛠️ Facility Health
                    </button>
                    <button class="overlay-toggle-btn px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${appStore.getState('currentOverlay') === 'normal' ? 'bg-white/20 text-white border border-white/40 shadow-md' : 'bg-white/5 text-white/70 hover:bg-white/10'}" data-mode="normal">
                        ✨ Standard Bowl
                    </button>
                </div>

                <!-- Predictive Time-Travel Slider Strip -->
                <div class="glass-panel px-3 py-1.5 rounded-xl pointer-events-auto flex items-center gap-1.5 border border-purple-500/30 bg-purple-950/30 shadow-xl">
                    <span class="text-[10px] text-purple-300 font-bold tracking-wider uppercase flex items-center gap-1">🔮 Time-Travel Predictor:</span>
                    <button class="time-travel-btn px-2.5 py-1 rounded text-[11px] font-mono-num font-semibold transition-all cursor-pointer ${this.currentTimeTravel === '-30m' ? 'bg-purple-600 text-white shadow' : 'bg-white/5 text-white/60 hover:text-white'}" data-time="-30m">-30m Pre</button>
                    <button class="time-travel-btn px-2.5 py-1 rounded text-[11px] font-mono-num font-semibold transition-all cursor-pointer ${this.currentTimeTravel === '0m' ? 'bg-purple-600 text-white shadow' : 'bg-white/5 text-white/60 hover:text-white'}" data-time="0m">🔴 LIVE (0m)</button>
                    <button class="time-travel-btn px-2.5 py-1 rounded text-[11px] font-mono-num font-semibold transition-all cursor-pointer ${this.currentTimeTravel === '45m' ? 'bg-purple-600 text-white shadow' : 'bg-white/5 text-white/60 hover:text-white'}" data-time="45m">+45m Half</button>
                    <button class="time-travel-btn px-2.5 py-1 rounded text-[11px] font-mono-num font-semibold transition-all cursor-pointer ${this.currentTimeTravel === '90m' ? 'bg-purple-600 text-white shadow' : 'bg-white/5 text-white/60 hover:text-white'}" data-time="90m">+90m Exit Surge</button>
                </div>

                <!-- Density Legend -->
                <div class="glass-panel px-3 py-1.5 rounded-xl pointer-events-auto flex items-center gap-2 text-[11px] text-white/80 shadow-xl">
                    <span class="w-2 h-2 rounded-sm bg-green-500"></span><span>&lt;60%</span>
                    <span class="w-2 h-2 rounded-sm bg-yellow-400"></span><span>60-75%</span>
                    <span class="w-2 h-2 rounded-sm bg-orange-400"></span><span>75-90%</span>
                    <span class="w-2 h-2 rounded-sm bg-red-500"></span><span>&gt;90%</span>
                </div>
            </div>
        `;

        document.querySelectorAll('.overlay-toggle-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = btn.dataset.mode;
                appStore.setState('currentOverlay', mode);

                if (this.app.engine) {
                    if (mode === 'density') {
                        const densitySet = this.currentTimeTravel === '0m' ? BLOCK_DENSITY_DATA : (PREDICTIVE_DENSITY_DATA[this.currentTimeTravel] || BLOCK_DENSITY_DATA);
                        this.app.engine.recolorDensityHeatmap(densitySet);
                    } else if (mode === 'facility') {
                        this.app.engine.recolorFacilityHealth(ALL_FACILITIES);
                    } else if (mode === 'normal') {
                        this.app.engine.resetSeatColors();
                    }
                }
            });
        });

        document.querySelectorAll('.time-travel-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const timeStr = btn.dataset.time;
                this.currentTimeTravel = timeStr;
                this.currentOverlay = 'density';
                this.renderMapOverlayBar();

                if (this.app.engine) {
                    const densitySet = timeStr === '0m' ? BLOCK_DENSITY_DATA : (PREDICTIVE_DENSITY_DATA[timeStr] || BLOCK_DENSITY_DATA);
                    this.app.engine.recolorDensityHeatmap(densitySet);
                }
            });
        });
    }


    renderDensityPanel() {
        const panel = document.getElementById('control-density-panel');
        if (!panel) return;

        // Sort blocks highest density first
        const sortedBlocks = Object.entries(BLOCK_DENSITY_DATA).sort((a, b) => b[1].density - a[1].density);

        let blocksHtml = sortedBlocks.slice(0, 6).map(([id, info]) => {
            let colorClass = 'text-green-400 border-green-500/30 bg-green-500/10';
            if (info.density >= 90) colorClass = 'text-red-400 border-red-500/30 bg-red-500/10 font-bold';
            else if (info.density >= 75) colorClass = 'text-orange-400 border-orange-500/30 bg-orange-500/10';
            else if (info.density >= 60) colorClass = 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10';

            return `
                <div class="block-density-item bg-white/5 p-2 rounded-xl border border-white/10 hover:border-white/25 transition-all flex items-center justify-between cursor-pointer" data-block="${sanitizeInput(String(id))}">
                    <div class="flex items-center gap-1.5">
                        <span class="font-mono-num font-bold text-xs text-white">${sanitizeInput(String(id))}</span>
                        <span class="text-[9px] text-white/40 uppercase">${sanitizeInput(String(info.tier))}</span>
                    </div>
                    <div class="flex items-center gap-1.5">
                        <span class="font-mono-num text-xs px-1.5 py-0.5 rounded border ${colorClass}">${sanitizeInput(String(info.density))}%</span>
                        ${info.status === 'SURGE' ? '<span class="text-[9px] px-1 rounded bg-red-600 text-white animate-pulse">SURGE</span>' : ''}
                    </div>
                </div>
            `;
        }).join('');

        panel.innerHTML = `
            <div class="flex flex-col h-full glass-panel p-3.5 rounded-2xl border border-white/10 space-y-2.5 overflow-hidden">
                <div class="flex items-center justify-between border-b border-white/10 pb-2">
                    <div>
                        <h2 class="font-bebas text-lg text-white tracking-widest leading-none">DENSITY & OCCUPANCY</h2>
                        <span class="text-[10px] text-white/50">Real-Time Optical & Gate Count</span>
                    </div>
                    <span class="text-[10px] font-mono-num px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30 font-semibold">87% Avg</span>
                </div>

                <div class="grid grid-cols-2 gap-1.5 text-center">
                    <div class="bg-white/5 p-1.5 rounded-xl border border-white/10">
                        <span class="text-[9px] text-white/50 block uppercase">Lower Tier</span>
                        <span class="font-mono-num text-sm font-bold text-orange-400">84.2%</span>
                    </div>
                    <div class="bg-white/5 p-1.5 rounded-xl border border-white/10">
                        <span class="text-[9px] text-white/50 block uppercase">Upper Tier</span>
                        <span class="font-mono-num text-sm font-bold text-yellow-400">62.8%</span>
                    </div>
                </div>

                <button id="btn-focus-surge" class="w-full bg-red-600 hover:bg-red-500 text-white font-semibold text-[11px] py-2 rounded-xl transition-all shadow-lg shadow-red-600/30 cursor-pointer flex items-center justify-center gap-1">
                    <span>🔥 Focus Surge Hotspot (B12-L)</span>
                </button>

                <div class="flex-1 overflow-y-auto space-y-1.5 pr-1">
                    <p class="text-[9px] text-white/40 tracking-widest uppercase font-semibold">Top Section Hotspots:</p>
                    ${blocksHtml}
                </div>
            </div>
        `;

        document.getElementById('btn-focus-surge')?.addEventListener('click', () => {
            if (this.app.engine) {
                this.currentOverlay = 'density';
                this.renderMapOverlayBar();
                this.app.engine.recolorDensityHeatmap(BLOCK_DENSITY_DATA);
                this.app.engine.flyToBlock('B12-L');
            }
        });

        document.querySelectorAll('.block-density-item').forEach(item => {
            item.addEventListener('click', () => {
                const bId = item.dataset.block;
                if (this.app.engine && bId) {
                    this.currentOverlay = 'density';
                    this.renderMapOverlayBar();
                    this.app.engine.recolorDensityHeatmap(BLOCK_DENSITY_DATA);
                    this.app.engine.flyToBlock(bId);
                }
            });
        });
    }

    renderFacilityBoard() {
        const panel = document.getElementById('control-facility-panel');
        if (!panel) return;

        // Sort facilities so Degraded & Down appear at the very top!
        const sortedFacs = [...ALL_FACILITIES].sort((a, b) => {
            const priority = { 'Down': 3, 'Degraded': 2, 'Operational': 1 };
            return (priority[b.status] || 1) - (priority[a.status] || 1);
        });

        const itemsHtml = sortedFacs.slice(0, 7).map(f => {
            let badgeHtml = '<span class="badge-operational px-1.5 py-0.2 rounded text-[10px] font-mono-num">🟢 Operational</span>';
            if (f.status === 'Down') badgeHtml = '<span class="badge-down px-1.5 py-0.2 rounded text-[10px] font-mono-num animate-pulse">🔴 DOWN</span>';
            else if (f.status === 'Degraded') badgeHtml = '<span class="badge-degraded px-1.5 py-0.2 rounded text-[10px] font-mono-num">🟡 DEGRADED</span>';

            return `
                <div class="facility-board-item bg-white/5 p-2 rounded-xl border border-white/10 hover:border-white/25 transition-all space-y-1.5" data-id="${f.id}">
                    <div class="flex items-center justify-between">
                        <span class="text-xs font-semibold text-white truncate max-w-[140px]">${f.label}</span>
                        ${badgeHtml}
                    </div>
                    <div class="flex items-center justify-between text-[10px] text-white/60 pt-1 border-t border-white/5">
                        <span>Wait: <strong class="text-white font-mono-num">${f.waitTime || f.flowRate || 'Normal'}</strong></span>
                        <button class="toggle-status-btn bg-white/10 hover:bg-white/20 text-white/90 px-2 py-0.5 rounded text-[9px] font-medium cursor-pointer" data-id="${f.id}">
                            ${f.status === 'Operational' ? '⚠️ Simulate Outage' : '✅ Restore'}
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        panel.innerHTML = `
            <div class="flex flex-col h-full glass-panel p-3.5 rounded-2xl border border-white/10 space-y-2.5 overflow-hidden">
                <div class="flex items-center justify-between border-b border-white/10 pb-2">
                    <div>
                        <h2 class="font-bebas text-lg text-white tracking-widest leading-none">FACILITY HEALTH</h2>
                        <span class="text-[10px] text-white/50">Gates · Washrooms · Medical · Food</span>
                    </div>
                    <span class="text-[10px] font-mono-num px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 font-semibold">24 Nodes</span>
                </div>

                <div class="grid grid-cols-4 gap-1 text-center text-[9px]">
                    <div class="bg-white/5 p-1 rounded-lg border border-white/10"><span>Gates</span><strong class="block text-green-400 font-mono-num">7🟢 1🟡</strong></div>
                    <div class="bg-white/5 p-1 rounded-lg border border-white/10"><span>WC</span><strong class="block text-blue-400 font-mono-num">5🟢 1🔴</strong></div>
                    <div class="bg-white/5 p-1 rounded-lg border border-white/10"><span>Med</span><strong class="block text-green-400 font-mono-num">4🟢</strong></div>
                    <div class="bg-white/5 p-1 rounded-lg border border-white/10"><span>Food</span><strong class="block text-yellow-400 font-mono-num">7🟢 1🟡</strong></div>
                </div>

                <div class="flex-1 overflow-y-auto space-y-1.5 pr-1">
                    ${itemsHtml}
                </div>
            </div>
        `;

        document.querySelectorAll('.facility-board-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.classList.contains('toggle-status-btn')) return;
                const fId = item.dataset.id;
                if (this.app.engine && fId) {
                    this.currentOverlay = 'facility';
                    this.renderMapOverlayBar();
                    this.app.engine.recolorFacilityHealth(ALL_FACILITIES);
                    this.app.engine.flyToMarker(fId);
                }
            });
        });

        document.querySelectorAll('.toggle-status-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const fId = btn.dataset.id;
                const fac = ALL_FACILITIES.find(f => f.id === fId);
                if (fac) {
                    if (fac.status === 'Operational') fac.status = 'Down';
                    else fac.status = 'Operational';

                    this.renderFacilityBoard();
                    if (this.app.engine) {
                        if (this.currentOverlay === 'facility') {
                            this.app.engine.recolorFacilityHealth(ALL_FACILITIES);
                        } else {
                            this.app.engine.updateLabelDisplay(this.currentOverlay, ALL_FACILITIES);
                        }
                    }
                }
            });
        });
    }

    renderOpsCenterTabbedPanel() {
        const panel = document.getElementById('control-ops-panel');
        if (!panel) return;

        // Top Tab Strip switching between Incidents & Logistics across full center width
        const tabStripHtml = `
            <div class="flex items-center justify-between border-b border-white/10 bg-black/40 px-4 py-2 shrink-0">
                <div class="flex items-center gap-2">
                    <button class="ops-tab-btn px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${appStore.getState('activeOpsTab') === 'incidents' ? 'bg-red-600/80 text-white border border-red-400/50 shadow-lg shadow-red-600/30' : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'}" data-tab="incidents">
                        <span>🚨 Incidents & Event Stream</span>
                        <span class="px-1.5 py-0.2 rounded bg-white/20 text-white text-[10px] font-mono-num ml-1">${this.incidents.length}</span>
                    </button>
                    <button class="ops-tab-btn px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${appStore.getState('activeOpsTab') === 'logistics' ? 'bg-purple-600/80 text-white border border-purple-400/50 shadow-lg shadow-purple-600/30' : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'}" data-tab="logistics">
                        <span>📦 Logistics & Volunteer Task Board</span>
                        <span class="px-1.5 py-0.2 rounded bg-white/20 text-white text-[10px] font-mono-num ml-1">${this.tasks.length}</span>
                    </button>
                </div>

                <div class="flex items-center gap-2">
                    ${appStore.getState('activeOpsTab') === 'incidents' ? `
                        <button id="btn-simulate-incident" class="bg-red-600 hover:bg-red-500 text-white font-semibold text-xs px-3.5 py-1.5 rounded-xl shadow-lg shadow-red-600/40 cursor-pointer animate-pulse flex items-center gap-1">
                            <span>🚨 Simulate Critical Gate C Surge</span>
                        </button>
                    ` : `
                        <span class="text-xs text-white/50 font-mono-num">Zone Coverage: 100% Active</span>
                    `}
                </div>
            </div>
        `;

        let contentHtml = '';
        const currentOpsTab = appStore.getState('activeOpsTab') || 'incidents';
        if (currentOpsTab === 'incidents') {
            const incItems = this.incidents.map(inc => {
                let lvlColor = 'text-blue-400 bg-blue-500/10 border-blue-500/30';
                if (inc.level === 'ALERT' || inc.level === 'CRITICAL') lvlColor = 'text-red-400 bg-red-500/10 border-red-500/30 font-bold';
                else if (inc.level === 'WARNING') lvlColor = 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';

                return `
                    <div class="bg-white/5 p-3 rounded-xl border border-white/10 flex items-start justify-between gap-4">
                        <div class="space-y-1 flex-1">
                            <div class="flex items-center gap-2">
                                <span class="px-2 py-0.5 rounded border text-[10px] ${lvlColor} font-mono-num">${sanitizeInput(inc.level)}</span>
                                <span class="text-xs font-bold text-white">${sanitizeInput(inc.title)}</span>
                                <span class="text-[10px] text-white/40 font-mono-num ml-auto">${sanitizeInput(inc.time)}</span>
                            </div>
                            <p class="text-xs text-white/75 leading-relaxed">${sanitizeInput(inc.details)}</p>
                        </div>
                        ${inc.level === 'CRITICAL' ? `
                            <button class="bg-red-600/30 text-red-300 border border-red-500/40 px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 cursor-pointer">View Hotspot</button>
                        ` : ''}
                    </div>
                `;
            }).join('');

            contentHtml = `
                <div class="flex-1 overflow-y-auto p-3 space-y-2">
                    ${incItems}
                </div>
            `;
        } else {
            const taskItems = this.tasks.map(t => `
                <div class="bg-white/5 p-3 rounded-xl border border-white/10 flex items-center justify-between text-xs">
                    <div class="space-y-1 flex-1 mr-4">
                        <div class="flex items-center gap-2">
                            <span class="text-[10px] px-2 py-0.5 rounded ${t.priority === 'high' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-blue-500/20 text-blue-300'} font-semibold uppercase">${sanitizeInput(t.priority)} priority</span>
                            <span class="font-bold text-white text-sm">${sanitizeInput(t.title)}</span>
                        </div>
                        <span class="text-xs text-white/60 block">Assigned Zone: <strong class="text-white">${sanitizeInput(t.zone)}</strong> · Status: <strong class="text-white uppercase font-mono-num">${sanitizeInput(t.status.replace('_', ' '))}</strong></span>
                    </div>
                    <button class="bg-white/10 hover:bg-green-600 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors cursor-pointer shrink-0">
                        ${t.status === 'done' ? '✅ Resolved' : 'Assign / Mark Done'}
                    </button>
                </div>
            `).join('');

            contentHtml = `
                <div class="flex-1 overflow-y-auto p-3 space-y-2">
                    ${taskItems}
                </div>
            `;
        }

        // Fix: contentHtml was computed above but never inserted. Wrap in a proper
        // container div so the tab body actually renders in the DOM.
        panel.innerHTML = `
            ${tabStripHtml}
            <div id="ops-tab-body" class="flex-1 overflow-hidden flex flex-col">
                ${contentHtml}
            </div>
        `;

        document.querySelectorAll('.ops-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                appStore.setState('activeOpsTab', btn.dataset.tab);
            });
        });

        document.getElementById('btn-simulate-incident')?.addEventListener('click', () => {
            this.triggerCriticalTakeoverState();
        });
    }

    /**
     * Renders the AI Recommendations panel, mapping through the recommendations
     * list to display confidence, impact, and actionable dispatch buttons.
     */
    renderAiRecommendations() {
        const panel = document.getElementById('control-ai-panel');
        if (!panel) return;

        // Render full-width cards vertically inside the 365px right column
        const cardsHtml = this.recommendations.map(rec => `
            <div class="glass-panel-ai p-4 rounded-2xl flex flex-col justify-between space-y-3.5 border border-purple-500/35 shadow-xl transition-all">
                <div class="space-y-2">
                    <div class="flex items-center justify-between">
                        <span class="text-[11px] font-bold text-purple-300 tracking-wider uppercase flex items-center gap-1.5">
                            <span>🤖 AI TACTICAL ADVISORY</span>
                        </span>
                        <span class="text-xs font-mono-num font-bold px-2.5 py-0.5 rounded bg-purple-900/80 text-purple-200 border border-purple-400/40">
                            ${rec.confidence} Confidence
                        </span>
                    </div>
                    <h3 class="text-sm sm:text-base font-bold text-white leading-snug">${sanitizeInput(rec.title)}</h3>
                    <div class="bg-black/45 p-3 rounded-xl border border-white/10 text-xs text-white/85 leading-relaxed space-y-2">
                        <div><strong class="text-purple-300">Reasoning:</strong> ${sanitizeInput(rec.reasoning)}</div>
                        <div class="pt-1 border-t border-white/5"><strong class="text-green-300">Projected Impact:</strong> ${sanitizeInput(rec.impact)}</div>
                    </div>
                </div>

                <div class="flex items-center justify-between pt-2 border-t border-purple-500/20 text-xs gap-2">
                    <button class="rec-show-btn bg-purple-600 hover:bg-purple-500 text-white font-semibold px-3 py-2 rounded-xl shadow-lg shadow-purple-600/30 transition-all flex items-center gap-1.5 cursor-pointer flex-1 justify-center" data-source="${rec.sourceMarker}" data-target="${rec.targetMarker}">
                        <span>⚡ Show on 3D Map</span>
                    </button>

                    ${rec.status === 'approved' ? `
                        <span class="text-green-400 font-bold px-3 py-2 bg-green-500/10 rounded-xl border border-green-500/30 text-center flex-1">✅ DEPLOYED</span>
                    ` : `
                        <button class="rec-approve-btn bg-green-600 hover:bg-green-500 text-white font-semibold px-3 py-2 rounded-xl shadow-lg shadow-green-600/30 transition-all cursor-pointer flex-1 text-center" data-id="${rec.id}">
                            ✅ Approve & Deploy
                        </button>
                        <button class="rec-dismiss-btn bg-white/10 hover:bg-white/20 text-white/60 hover:text-white px-3 py-2 rounded-xl transition-all cursor-pointer" data-id="${rec.id}">
                            ❌
                        </button>
                    `}
                </div>

                ${rec.status === 'approved' && GENAI_SIGNAGE_PRESETS[rec.id] ? `
                    <div class="mt-2 p-3 bg-black/60 rounded-xl border border-green-500/40 space-y-2 animate-fadeIn text-xs">
                        <div class="flex items-center justify-between">
                            <span class="text-green-300 font-bold tracking-wider uppercase text-[10px]">📺 GENAI DIGITAL SIGNAGE VMS:</span>
                            <span class="text-[9px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-300 border border-green-500/30 font-mono-num">AUTO-SYNCHED</span>
                        </div>
                        <div class="font-mono-num text-[11px] text-yellow-300 bg-black/80 p-2 rounded border border-white/10 leading-relaxed">${GENAI_SIGNAGE_PRESETS[rec.id].digitalSignage}</div>
                        
                        <div class="flex items-center justify-between pt-1 border-t border-white/10">
                            <span class="text-purple-300 font-bold tracking-wider uppercase text-[10px]">📢 MULTILINGUAL PA SCRIPT (EN/ES/FR):</span>
                            <button class="rec-play-pa-btn bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1" data-id="${rec.id}">
                                <span>🔊 Play PA Broadcast</span>
                            </button>
                        </div>
                        <p class="text-[11px] text-white/80 italic leading-relaxed">"${GENAI_SIGNAGE_PRESETS[rec.id].paAnnouncements.EN}"</p>
                    </div>
                ` : ''}
            </div>
        `).join('');

        panel.innerHTML = `
            <div class="flex flex-col h-full glass-panel p-4 rounded-2xl border border-white/10 space-y-3 overflow-hidden">
                <div class="flex items-center justify-between border-b border-white/10 pb-2.5 shrink-0">
                    <div class="flex items-center gap-2">
                        <h2 class="font-bebas text-xl text-white tracking-widest">💡 AI RECOMMENDATIONS</h2>
                    </div>
                    <span class="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 font-semibold uppercase">Autonomous Feed</span>
                </div>
                
                <div class="flex-1 overflow-y-auto space-y-3.5 pr-1">
                    ${cardsHtml}
                </div>
            </div>
        `;

        document.querySelectorAll('.rec-show-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const src = btn.dataset.source;
                const tgt = btn.dataset.target;
                if (this.app.engine && src && tgt) {
                    this.app.engine.drawRoute(src, tgt, null, true);
                } else if (this.app.engine && src) {
                    this.app.engine.flyToMarker(src);
                }
            });
        });

        document.querySelectorAll('.rec-approve-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const rId = btn.dataset.id;
                const rec = this.recommendations.find(r => r.id === rId);
                if (rec) {
                    rec.status = 'approved';
                    this.renderAiRecommendations();
                    if (this.app.engine && rec.sourceMarker && rec.targetMarker) {
                        this.app.engine.drawRoute(rec.sourceMarker, rec.targetMarker, null, false);
                    }
                }
            });
        });

        document.querySelectorAll('.rec-play-pa-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const rId = btn.dataset.id;
                const preset = GENAI_SIGNAGE_PRESETS[rId];
                if (preset && window.speechSynthesis) {
                    window.speechSynthesis.cancel();
                    const utterance = new SpeechSynthesisUtterance(preset.paAnnouncements.EN);
                    utterance.rate = 0.95; // slightly slower PA announcer pace
                    window.speechSynthesis.speak(utterance);
                }
            });
        });

        document.querySelectorAll('.rec-dismiss-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const rId = btn.dataset.id;
                this.recommendations = this.recommendations.filter(r => r.id !== rId);
                this.renderAiRecommendations();
            });
        });
    }


    triggerCriticalTakeoverState() {
        this.isCriticalAlertActive = true;
        document.body.classList.add('animate-pulse-red');

        // Fix: use appStore.setState so the reactive subscription actually fires
        appStore.setState('activeOpsTab', 'incidents');

        // Insert Critical Takeover Banner
        let bannerEl = document.getElementById('critical-takeover-banner');
        if (!bannerEl) {
            bannerEl = document.createElement('div');
            bannerEl.id = 'critical-takeover-banner';
            bannerEl.className = 'fixed top-0 left-0 right-0 z-50 bg-red-600 text-white p-3 shadow-2xl flex flex-col sm:flex-row items-center justify-between px-6 animate-fadeIn border-b-2 border-red-300';
            bannerEl.innerHTML = `
                <div class="flex items-center gap-3">
                    <span class="text-2xl animate-bounce">🚨</span>
                    <div>
                        <h3 class="font-bebas text-2xl tracking-wider text-white">CRITICAL INCIDENT TAKEOVER: GATE C & BLOCK B12-L SURGE</h3>
                        <p class="text-xs font-mono-num text-white/90">Entry bottleneck wait time exceeded 18 min threshold. Crowd density at 94%. Automated redirection standing by.</p>
                    </div>
                </div>
                <div class="flex gap-3 mt-2 sm:mt-0">
                    <button id="btn-execute-emergency" class="bg-white text-red-700 font-bold text-xs px-5 py-2.5 rounded-xl shadow-xl hover:bg-red-50 transition-all cursor-pointer">
                        ⚡ EXECUTE EMERGENCY REDIRECTION (GATE D)
                    </button>
                    <button id="btn-resolve-emergency" class="bg-red-900/80 hover:bg-red-900 text-white font-semibold text-xs px-4 py-2.5 rounded-xl border border-red-400/40 transition-all cursor-pointer">
                        ✅ Stand Down / Resolved
                    </button>
                </div>
            `;
            document.body.appendChild(bannerEl);

            document.getElementById('btn-execute-emergency').addEventListener('click', () => {
                if (this.app.engine) {
                    this.app.engine.drawRoute("GATE_C", "GATE_D", null, true);
                }
                const rec1 = this.recommendations.find(r => r.id === 'rec_1');
                if (rec1) rec1.status = 'approved';
                this.renderAiRecommendations();
                // Inline status notification instead of blocking alert()
                this._showStatusToast('🚨 Emergency Redirection Protocol Executed! Dynamic digital signs updated. 12 Crowd Marshals dispatched to Gate C.');
            });

            document.getElementById('btn-resolve-emergency').addEventListener('click', () => {
                this.isCriticalAlertActive = false;
                document.body.classList.remove('animate-pulse-red');
                bannerEl.remove();
            });
        }

        // Switch map to density and focus Gate C / Block B12
        this.currentOverlay = 'density';
        this.renderMapOverlayBar();
        if (this.app.engine) {
            this.app.engine.recolorDensityHeatmap(BLOCK_DENSITY_DATA);
            this.app.engine.flyToBlock('B12-L');
        }

        // Add to incident log and render
        this.incidents.unshift({
            id: `inc_emerg_${Date.now()}`,
            time: new Date().toTimeString().split(' ')[0],
            level: "CRITICAL",
            title: "CRITICAL CROWD SURGE TRIGGERED",
            details: "Operator activated simulation for Gate C bottleneck and Block B12 density surge.",
            zone: "GATE_C"
        });
        this.renderOpsCenterTabbedPanel();
    }

    bindGlobalControls() {}

    /**
     * Displays a non-blocking inline status toast notification.
     * Replaces alert() calls to avoid blocking the main thread and improve UX.
     * @param {string} message - The message to display
     * @param {'success'|'error'|'warning'} [type='success'] - Toast type
     * @private
     */
    _showStatusToast(message, type = 'success') {
        const colors = {
            success: 'bg-green-900/90 border-green-500/60 text-green-200',
            error: 'bg-red-900/90 border-red-500/60 text-red-200',
            warning: 'bg-yellow-900/90 border-yellow-500/60 text-yellow-200',
        };
        const toast = document.createElement('div');
        toast.setAttribute('role', 'status');
        toast.setAttribute('aria-live', 'polite');
        toast.className = `fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] px-6 py-3 rounded-2xl border shadow-2xl text-sm font-semibold max-w-xl text-center animate-fadeIn ${colors[type] || colors.success}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.4s';
            setTimeout(() => toast.remove(), 400);
        }, 4000);
    }
}
