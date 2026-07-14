// js/app.js - Master Application Controller & Role Router

import { StadiumEngine } from './stadium-engine.js';
import { FanPortalController } from './fan-portal.js';
import { ControlRoomController } from './control-room.js';
import { VolunteerPortalController } from './volunteer-portal.js';
import { MatchPulseTestSuite } from './test-suite.js';
import { toggleAccessibilityMode, sanitizeInput } from './utils.js';
import { ViewManager } from './view-manager.js';

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
        this.fanController = new FanPortalController(this);
        this.controlController = new ControlRoomController(this);
        this.volunteerController = new VolunteerPortalController(this);
        this.testSuite = new MatchPulseTestSuite(this);
        this.setupEventListeners();
        this._hideLoader();
        this.connectTelemetryStream();
    }

    connectTelemetryStream() {
        // Efficiency: True real-time push data via Server-Sent Events (SSE)
        try {
            const eventSource = new EventSource('/api/telemetry/stream');
            eventSource.onmessage = (event) => {
                const data = JSON.parse(event.data);
                console.log("📡 [SSE] Live Telemetry received:", data);
                // Real app would dispatch this data to the engine and UI state here
            };
            eventSource.onerror = (error) => {
                console.warn("📡 [SSE] Connection lost, retrying...", error);
            };
        } catch (e) {
            console.error("Failed to connect to SSE telemetry stream.", e);
        }
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



        document.getElementById('modal-btn-login')?.addEventListener('click', () => {
            const idVal = sanitizeInput(document.getElementById('staff-id-input')?.value || '', 20);
            const passVal = sanitizeInput(document.getElementById('staff-pass-input')?.value || '', 20);

            // Security: require ID in expected format AND minimum passcode length
            const idValid = /^ST-\d{4}$/i.test(idVal);
            const passValid = passVal.length >= 4;

            const errorEl = document.getElementById('staff-auth-error');
            if (idValid && passValid) {
                if (errorEl) errorEl.classList.add('hidden');
                this.closeStaffAuthModal();
                this.switchView('control-room');
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

        document.getElementById('modal-btn-quick-login')?.addEventListener('click', () => {
            const idEl = document.getElementById('staff-id-input');
            const passEl = document.getElementById('staff-pass-input');
            if (idEl) idEl.value = 'ST-8821';
            if (passEl) passEl.value = '2026';
            this.closeStaffAuthModal();
            this.switchView('control-room');
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
        document.getElementById('fan-btn-switch-control')?.addEventListener('click', (e) => {
            this.openStaffAuthModal(e.currentTarget);
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
        console.log(`mountEngine(${mode}): container=${containerId} size=${w}x${h}`);

        // Efficiency: skip full teardown if same mode is already mounted
        if (this.engine && this.lastEngineMode === mode) {
            console.log('mountEngine: same mode already active, skipping recreation.');
            return;
        }

        // Destroy previous engine instance fully
        if (this.engine) {
            try {
                if (this.engine.resizeObserver) this.engine.resizeObserver.disconnect();
                this.engine.renderer.dispose();
            } catch(e) { /* ignore */ }
            this.engine = null;
        }

        // Clear container
        container.innerHTML = '';

        // Create fresh engine
        try {
            this.engine = new StadiumEngine(container, mode);
            this.lastEngineMode = mode;
            console.log('mountEngine: engine created successfully');
        } catch(e) {
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
