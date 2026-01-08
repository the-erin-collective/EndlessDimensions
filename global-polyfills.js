/**
 * MOUD API Polyfill & Compatibility Layer
 * Features: require() shim, Proxy-guarded FS, and Ready-state Queue.
 */

console.log('[POLYFILL] Starting polyfill initialization...');

// --- 1. require() shim ---
if (typeof globalThis.require === 'undefined' || typeof require === 'undefined') {
    const requireShim = function (module) {
        if (module === 'fs') return globalThis.fs;
        if (module === 'path') {
            return {
                join: (...args) => args.filter(Boolean).map(a => String(a)).join('/').replace(/\/+/g, '/'),
                dirname: (p) => p.split('/').slice(0, -1).join('/') || '.',
                basename: (p) => p.split('/').pop(),
                resolve: (...args) => args.filter(Boolean).map(a => String(a)).join('/').replace(/\/+/g, '/'),
                sep: '/'
            };
        }
        if (module === 'https' || module === 'http') {
            return {
                get: (url, callback) => {
                    console.log('[POLYFILL] https.get called (shim): ' + url);
                    return { on: (event, cb) => ({ on: (evt, c) => { } }) };
                }
            };
        }
        if (globalThis[module]) return globalThis[module];
        return {};
    };

    if (typeof globalThis.require === 'undefined') globalThis.require = requireShim;
}

// --- 2. State Management ---
const MoudBridge = {
    ready: false,
    queue: [],

    check: function () {
        let currentApi = null;
        try { currentApi = globalThis.api || (typeof api !== 'undefined' ? api : null); } catch (e) { }

        // Relaxed check: we only absolutely need the 'api' object and 'fs' polyfill
        const hasApi = !!currentApi;
        const hasFs = typeof globalThis.fs !== 'undefined';

        if (hasApi && hasFs) {
            this.init(currentApi);
        } else {
            setTimeout(() => this.check(), 50);
        }
    },

    init: function (apiInstance) {
        if (this.ready) return;

        globalThis.api = apiInstance;
        this.ready = true;

        console.log("§a[Moud Polyfill] Bridge ready.");

        while (this.queue.length > 0) {
            const cb = this.queue.shift();
            try { cb(); } catch (e) { console.error("[Moud Callback Error]", e); }
        }
    },

    onReady: function (cb) {
        if (this.ready) cb();
        else this.queue.push(cb);
    }
};

const waitForReady = (label) => {
    if (!MoudBridge.ready) {
        const start = Date.now();
        // Busy wait should be minimized
        while (!MoudBridge.ready && Date.now() - start < 2000) { }
    }
};

// --- 3. Patch FS ---
const patchFs = () => {
    if (typeof globalThis.fs !== 'undefined' && !globalThis.fs.__patched) {
        const originalFs = globalThis.fs;
        const methods = ['readFileSync', 'existsSync', 'mkdirSync', 'readdirSync', 'unlinkSync', 'statSync', 'writeFileSync'];

        methods.forEach(method => {
            const original = originalFs[method];
            if (typeof original === 'function') {
                originalFs[method] = function (...args) {
                    waitForReady(`fs.${method}`);
                    return original.apply(this, args);
                };
            }
        });

        globalThis.fs.__patched = true;
        console.log('[POLYFILL] Global fs patched.');
        return true;
    }
    return !!(globalThis.fs && globalThis.fs.__patched);
};

if (!patchFs()) {
    const fsPoll = setInterval(() => {
        if (patchFs()) clearInterval(fsPoll);
    }, 10);
}

// --- 4. Globals ---
globalThis.onMoudReady = (cb) => MoudBridge.onReady(cb);
globalThis.moudApiReady = () => MoudBridge.ready;

MoudBridge.check();
console.log('[POLYFILL] Polyfill initialization completed.');
