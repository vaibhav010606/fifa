// js/app.js - Master Application Controller & Role Router

import { StadiumEngine } from './stadium-engine.js';
import { FanPortalController } from './fan-portal.js';
import { ControlRoomController } from './control-room.js';
import { VolunteerPortalController } from './volunteer-portal.js';
import { MatchPulseTestSuite } from './test-suite.js';
import { toggleAccessibilityMode, restoreAccessibilityPreferences, sanitizeInput } from './utils.js';
import { ViewManager } from './view-manager.js';
import { PREDICTIVE_DENSITY_DATA, GENAI_SIGNAGE_PRESETS, SUSTAINABILITY_METRICS } from './data.js';
import { CONFIG } from './config.js';

// Expose key data to the global diagnostics bridge for runtime verification
window.__MATCHPULSE_DATA__ = { PREDICTIVE_DENSITY_DATA, GENAI_SIGNAGE_PRESETS, SUSTAINABILITY_METRICS };

class MatchPulseApp {
    constructor() {
        this.currentView = 'landing';
        this.currentLanguage = 'EN';
        this.engine = null;
        this.lastEngineMode = null; // Efficiency: skip recreation if same mode
        this.fanController = null;
        this.controlController = null;
        this.volunteerController = null;
        this.testSuite = null;
        this.viewManager = new ViewManager(this);
    }

    async init() {
        restoreAccessibilityPreferences(); // A11y: Restore high-contrast preference from localStorage
        this.fanController = new FanPortalController(this);
        this.controlController = new ControlRoomController(this);
        this.volunteerController = new VolunteerPortalController(this);
        this.testSuite = new MatchPulseTestSuite(this);
        this.setupEventListeners();
        this._hideLoader();
        this.connectTelemetryStream();
    }

    connectTelemetryStream() {
        // Resilience: explicit reconnect with exponential backoff.
        // The browser's native EventSource auto-retry is opaque and non-configurable.
        // We manage our own lifecycle so the Control Room badge stays accurate.
        let backoffMs = 2000;
        const MAX_BACKOFF_MS = 30000;
        let es = null;

        const connect = () => {
            try {
                const token = sessionStorage.getItem('matchpulse_token');
                const url = token
                    ? `/api/telemetry/stream?token=${encodeURIComponent(token)}`
                    : '/api/telemetry/stream';

                es = new EventSource(url);

                es.onopen = () => {
                    backoffMs = 2000; // reset on successful connection
                    this._updateSyncBadge(true);
                };

                es.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        if (data.event === 'telemetry_update' && data.payload) {
                            import('./store.js').then(module => {
                                module.appStore.setState('liveTelemetry', data.payload);
                            });
                        }
                    } catch (e) { /* ignore malformed SSE payloads */ }
                };

                es.onerror = () => {
                    es.close();
                    this._updateSyncBadge(false);
                    console.warn(`[SSE] Connection lost. Reconnecting in ${backoffMs / 1000}s…`);
                    setTimeout(() => {
                        backoffMs = Math.min(backoffMs * 2, MAX_BACKOFF_MS);
                        connect();
                    }, backoffMs);
                };
            } catch (e) {
                console.error('Failed to connect to SSE telemetry stream.', e);
            }
        };

        connect();
    }

    /**
     * Updates the "SYNCED" status indicator in the Control Room header.
     * @param {boolean} isConnected
     * @private
     */
    _updateSyncBadge(isConnected) {
        const badge = document.querySelector('[data-sse-status]');
        if (!badge) return;
        badge.textContent = isConnected ? 'SYNCED (100% TELEMETRY)' : 'RECONNECTING…';
        badge.classList.toggle('text-white/70', isConnected);
        badge.classList.toggle('text-yellow-400', !isConnected);
    }

    /**
     * Fades out and removes the loading overlay.
     * Single source of truth — called from init() only.
     * @private
     */
    _hideLoader() {
        setTimeout(() => {
            const loader = document.getElementById('loadingOverlay');
            if (loader) {
                loader.style.opacity = '0';
                setTimeout(() => loader.style.display = 'none', 500);
            }
        }, 800);
    }

    setupEventListeners() {
        document.getElementById('btn-global-diag')?.addEventListener('click', () => {
            this.runDiagnostics();
        });

        document.getElementById('btn-global-a11y')?.addEventListener('click', (e) => {
            const isHigh = this.toggleA11y();
            e.currentTarget.classList.toggle('bg-yellow-500/40', isHigh);
            // Accessibility: reflect pressed state to screen readers
            e.currentTarget.setAttribute('aria-pressed', String(isHigh));
        });

        document.getElementById('btn-role-fan')?.addEventListener('click', () => {
            this.switchView('fan');
        });

        document.getElementById('btn-role-volunteer')?.addEventListener('click', () => {
            this.switchView('volunteer');
        });

        document.getElementById('btn-role-staff')?.addEventListener('click', () => {
            this.openStaffAuthModal();
        });



        document.getElementById('modal-btn-login')?.addEventListener('click', async () => {
            const idVal = sanitizeInput(document.getElementById('staff-id-input')?.value || '', 20);
            const passVal = sanitizeInput(document.getElementById('staff-pass-input')?.value || '', 20);

            // Security: require ID in expected format AND minimum passcode length
            const idValid = /^ST-\d{4}$/i.test(idVal);
            const passValid = passVal.length >= 4;

            const errorEl = document.getElementById('staff-auth-error');
            if (idValid && passValid) {
                try {
                    const btn = document.getElementById('modal-btn-login');
                    const origText = btn.textContent;
                    btn.textContent = 'Authenticating...';
                    btn.disabled = true;

                    const res = await fetch(`${CONFIG.API_URL}/api/login`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: idVal, password: passVal })
                    });
                    
                    if (!res.ok) throw new Error('Invalid credentials');
                    
                    const data = await res.json();
                    sessionStorage.setItem('matchpulse_token', data.token); // Store JWT
                    
                    if (errorEl) errorEl.classList.add('hidden');
                    this.closeStaffAuthModal();
                    this.switchView('control-room');
                } catch (e) {
                    if (errorEl) {
                        errorEl.textContent = '⚠️ ' + e.message;
                        errorEl.classList.remove('hidden');
                    }
                } finally {
                    const btn = document.getElementById('modal-btn-login');
                    if (btn) {
                        btn.textContent = 'Authenticate';
                        btn.disabled = false;
                    }
                }
            } else {
                if (errorEl) {
                    errorEl.textContent = !idValid
                        ? '⚠️ Staff ID must follow format ST-XXXX (e.g. ST-8821).'
                        : '⚠️ Passcode must be at least 4 characters.';
                    errorEl.classList.remove('hidden');
                }
            }
        });

        // Accessibility: Escape key closes modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const modal = document.getElementById('staff-auth-modal');
                if (modal && !modal.classList.contains('hidden')) {
                    this.closeStaffAuthModal();
                }
            }
        });

        document.getElementById('modal-btn-close')?.addEventListener('click', () => {
            this.closeStaffAuthModal();
        });

        document.querySelectorAll('.lang-select').forEach(sel => {
            sel.addEventListener('change', (e) => {
                this.setLanguage(e.target.value);
            });
        });

        document.getElementById('fan-btn-reset-cam')?.addEventListener('click', () => {
            if (this.engine) this.engine.resetCamera();
        });

        document.getElementById('fan-btn-switch-control')?.addEventListener('click', () => {
            this.openStaffAuthModal();
        });

        document.getElementById('fan-btn-home')?.addEventListener('click', (e) => {
            this.switchView('landing', e.currentTarget);
        });
    }

    openStaffAuthModal(triggerElement) {
        this.viewManager.openStaffAuthModal(triggerElement);
    }

    closeStaffAuthModal() {
        this.viewManager.closeStaffAuthModal();
    }

    switchView(targetView, triggerElement = null) {
        this.viewManager.switchView(targetView, triggerElement);
    }

    /**
     * Mounts or re-mounts the THREE.js StadiumEngine into the correct container.
     * Skips destruction+recreation if the same mode is already active (efficiency guard).
     * @param {'fan'|'control-room'|'volunteer'} viewMode
     */
    mountEngine(viewMode) {
        const isControl = viewMode === 'control-room';
        const isVolunteer = viewMode === 'volunteer';

        // Lookup map — avoids brittle ternary chains
        const containerMap = {
            'control-room': 'control-map-container',
            'volunteer': 'volunteer-map-container',
            'fan': 'fan-map-container',
        };
        const modeMap = { 'control-room': 'tactical', 'volunteer': 'fan', 'fan': 'fan' };

        const containerId = containerMap[viewMode] ?? 'fan-map-container';
        const mode = modeMap[viewMode] ?? 'fan';

        const container = document.getElementById(containerId);
        if (!container) {
            console.error('mountEngine: container not found:', containerId);
            return;
        }

        const w = container.clientWidth || container.offsetWidth || 0;
        const h = container.clientHeight || container.offsetHeight || 0;

        // Efficiency: skip full teardown if same mode is already mounted
        if (this.engine && this.lastEngineMode === mode) {
            return;
        }

        // Destroy previous engine instance using proper dispose() method
        if (this.engine) {
            try {
                this.engine.dispose();
            } catch (e) { /* ignore */ }
            this.engine = null;
        }

        // Clear container
        container.innerHTML = '';

        // Create fresh engine
        try {
            this.engine = new StadiumEngine(container, mode);
            this.lastEngineMode = mode;
        } catch (e) {
            console.error('mountEngine: StadiumEngine creation failed:', e);
        }
    }

    /**
     * Updates the app language, syncs all language selects, and updates the
     * html[lang] attribute so screen readers announce the correct language.
     * @param {string} lang - ISO language code: EN | ES | FR | PT | AR
     */
    setLanguage(lang) {
        this.currentLanguage = lang;
        document.querySelectorAll('.lang-select').forEach(sel => {
            sel.value = lang;
        });

        // Accessibility: update <html lang> so screen readers know the page language
        const langMap = { EN: 'en', ES: 'es', FR: 'fr', PT: 'pt', AR: 'ar' };
        document.documentElement.lang = langMap[lang] || 'en';

        const subheader = document.getElementById('landing-subtitle');
        if (subheader) {
            if (lang === 'ES') subheader.textContent = '"Conoce tu estadio antes de llegar"';
            else if (lang === 'FR') subheader.textContent = '"Connaissez votre stade avant d\'arriver"';
            else if (lang === 'AR') subheader.textContent = '"تعرف على ملعبك قبل وصولك"';
            else subheader.textContent = '"Know your stadium before you arrive"';
        }
    }

    async runDiagnostics() {
        if (!this.testSuite) this.testSuite = new MatchPulseTestSuite(this);
        await this.testSuite.runAllDiagnostics();
        this.testSuite.renderDiagnosticsModal();
    }

    toggleA11y() {
        return toggleAccessibilityMode();
    }
}


const startApp = () => {
    if (!window.app) {
        window.app = new MatchPulseApp();
        window.app.init(); // _hideLoader() is called inside init()
    }
};

if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', startApp);
} else {
    startApp();
}
