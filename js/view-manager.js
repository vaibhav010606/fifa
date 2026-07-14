// js/view-manager.js
// Handles view switching and modal state logic to decouple from AppController.

import { appStore } from './store.js';

export class ViewManager {
    constructor(appController) {
        this.app = appController;
        this._modalTrigger = null;
        this._trapFocus = null;
        this._escapeHandler = null;

        // Cache view elements once to eliminate redundant DOM queries
        this.views = {
            'landing': document.getElementById('view-landing'),
            'fan': document.getElementById('view-fan'),
            'control-room': document.getElementById('view-control-room'),
            'volunteer': document.getElementById('view-volunteer')
        };

        // State-driven UI binding (Reactivity)
        appStore.subscribe('currentView', (targetView) => {
            this._renderView(targetView);
        });
    }

    // Mutates state, triggering the reactive render automatically
    switchView(targetView, triggerElement = null) {
        appStore.setState('currentView', targetView);
    }

    _renderView(targetView) {
        // Hide all
        Object.values(this.views).forEach(v => {
            if (v) v.classList.add('view-hidden');
        });

        // Show target
        const target = this.views[targetView];
        if (target) {
            target.classList.remove('view-hidden');
        }

        // Initialize controllers and mount engine
        if (targetView === 'fan') {
            try { this.app.fanController.init(); } catch (e) { console.error("Fan controller init error:", e); }
            setTimeout(() => this.app.mountEngine('fan'), 450);
        } else if (targetView === 'control-room') {
            try { this.app.controlController.init(); } catch (e) { console.error("Control room controller init error:", e); }
            setTimeout(() => this.app.mountEngine('control-room'), 450);
        } else if (targetView === 'volunteer') {
            try { this.app.volunteerController.init(); } catch (e) { console.error("Volunteer controller init error:", e); }
            setTimeout(() => this.app.mountEngine('volunteer'), 450);
        }
    }

    openStaffAuthModal(triggerElement) {
        this._modalTrigger = triggerElement || null;
        const modal = document.getElementById('staff-auth-modal');
        if (!modal) return;
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        modal.setAttribute('aria-hidden', 'false');
        document.body.setAttribute('aria-busy', 'true');

        const firstInput = document.getElementById('staff-id-input');
        if (firstInput) setTimeout(() => firstInput.focus(), 50);

        this._trapFocus = (e) => {
            if (e.key !== 'Tab') return;
            const focusable = Array.from(modal.querySelectorAll(
                'button:not([disabled]), input:not([disabled]), [href], select:not([disabled]), [tabindex]:not([tabindex="-1"])'
            ));
            if (focusable.length === 0) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (e.shiftKey) {
                if (document.activeElement === first) { e.preventDefault(); last.focus(); }
            } else {
                if (document.activeElement === last) { e.preventDefault(); first.focus(); }
            }
        };
        modal.addEventListener('keydown', this._trapFocus);

        this._escapeHandler = (e) => {
            if (e.key === 'Escape') this.closeStaffAuthModal();
        };
        document.addEventListener('keydown', this._escapeHandler);
    }

    closeStaffAuthModal() {
        const modal = document.getElementById('staff-auth-modal');
        if (!modal) return;
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        modal.setAttribute('aria-hidden', 'true');
        document.body.removeAttribute('aria-busy');

        if (this._trapFocus) { modal.removeEventListener('keydown', this._trapFocus); this._trapFocus = null; }
        if (this._escapeHandler) { document.removeEventListener('keydown', this._escapeHandler); this._escapeHandler = null; }

        if (this._modalTrigger && typeof this._modalTrigger.focus === 'function') {
            this._modalTrigger.focus();
            this._modalTrigger = null;
        }
    }
}
