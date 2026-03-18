/************************
* debug-logger.js v1.3
* - Switched DEBUG_MODE to true for development/debugging.
************************/

// --- MASTER DEBUG SWITCH ---
// Set to true to see all debug messages in the console.
// Set to false to hide them.
const DEBUG_MODE = true;

export const Logger = {
    log: (...args) => {
        if (DEBUG_MODE) {
            console.log('%c[LOG]', 'color: #3b82f6;', ...args);
            Logger._appendToScreen('LOG', '#3b82f6', args);
        }
    },
    warn: (...args) => {
        if (DEBUG_MODE) {
            console.warn('%c[WARN]', 'color: #f59e0b;', ...args);
            Logger._appendToScreen('WARN', '#f59e0b', args);
        }
    },
    error: (...args) => {
        if (DEBUG_MODE) {
            console.error('%c[ERROR]', 'color: #ef4444;', ...args);
            Logger._appendToScreen('ERROR', '#ef4444', args);
        }
    },
    success: (...args) => {
        if (DEBUG_MODE) {
            console.log('%c[SUCCESS]', 'color: #22c55e;', ...args);
            Logger._appendToScreen('SUCCESS', '#22c55e', args);
        }
    },
    _appendToScreen: (level, color, args) => {
        const display = document.getElementById('debug-log-display');
        if (display) {
            const msg = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
            const line = document.createElement('div');
            line.style.borderBottom = '1px solid #eee';
            line.style.padding = '2px 0';
            line.innerHTML = `<span style="color:${color};font-weight:bold">[${level}]</span> ${msg}`;
            display.appendChild(line);
            display.scrollTop = display.scrollHeight;
        }
    }
};
