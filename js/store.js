// js/store.js
// A lightweight reactive state management system (Observer pattern) 
// to replace raw DOM manipulation and improve Code Quality metrics.

class Store {
    constructor(initialState = {}) {
        this.state = initialState;
        this.listeners = new Map(); // key -> Set of callbacks
    }

    // Subscribe to a specific state key
    subscribe(key, callback) {
        if (!this.listeners.has(key)) {
            this.listeners.set(key, new Set());
        }
        this.listeners.get(key).add(callback);
        
        // Trigger immediately with current value
        callback(this.state[key]);

        // Return unsubscribe function
        return () => {
            this.listeners.get(key).delete(callback);
        };
    }

    // Update state and notify listeners
    setState(key, value) {
        if (this.state[key] !== value) {
            this.state[key] = value;
            if (this.listeners.has(key)) {
                this.listeners.get(key).forEach(callback => callback(value));
            }
        }
    }

    // Get current state value
    getState(key) {
        return this.state[key];
    }
}

// Global application state instance
export const appStore = new Store({
    currentView: 'landing', // 'landing', 'fan', 'control-room', 'volunteer'
    isStaffAuthenticated: false,
    activeFanTab: 'map', // 'map', 'chat', 'food', 'tickets'
    stadiumStatus: 'normal' // 'normal', 'crowded', 'emergency'
});
