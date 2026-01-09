/**
 * MOUD API Polyfill & Compatibility Layer v1.0.8
 * Features: require() shim, process shim, Timer fixes, and Ready-state Queue.
 */

console.log('[POLYFILL] Starting polyfill initialization...');

// --- 0. Java Exposure ---
console.log(`[POLYFILL] globalThis.fs type: ${typeof globalThis.fs}`);
console.log(`[POLYFILL] Java type: ${typeof Java}`);
console.log(`[POLYFILL] Graal type: ${typeof Graal}`);
console.log(`[POLYFILL] Moud type: ${typeof Moud}`);
console.log(`[POLYFILL] Polyglot type: ${typeof Polyglot}`);
console.log(`[POLYFILL] java type: ${typeof java}`);
console.log(`[POLYFILL] Packages type: ${typeof Packages}`);

if (typeof Java !== 'undefined') {
    console.log('[POLYFILL] Java global found, exposing to globalThis.');
    globalThis.Java = Java;
} else if (typeof Packages !== 'undefined') {
    console.log('[POLYFILL] Java not found, but Packages is available.');
} else {
    console.log('[POLYFILL] Warning: Neither Java nor Packages found in global scope.');
}

// --- 1. Timer Fixes ---
// Some GraalJS environments have setTimeout but missing clearTimeout/setInterval/clearInterval
if (typeof globalThis.clearTimeout === 'undefined' && typeof setTimeout !== 'undefined') {
    globalThis.clearTimeout = function () { /* dummy */ };
}
if (typeof globalThis.setInterval === 'undefined' && typeof setTimeout !== 'undefined') {
    globalThis.setInterval = function (cb, ms) {
        const tick = () => { cb(); setTimeout(tick, ms); };
        setTimeout(tick, ms);
        return 1;
    };
    globalThis.clearInterval = function () { /* dummy */ };
}

// --- 2. process shim ---
if (typeof globalThis.process === 'undefined') {
    globalThis.process = {
        cwd: () => '.',
        env: { MOUD_DEV_MODE: 'true' },
        platform: 'win32',
        nextTick: (cb) => setTimeout(cb, 0),
        version: 'v18.0.0'
    };
    globalThis.__dirname = '.';
    console.log('[POLYFILL] process shim installed.');
}

// --- 3. fs shim (Minimal with Logging) ---
if (typeof globalThis.fs === 'undefined') {
    console.log('[POLYFILL] Installing minimal fs shim...');
    globalThis.fs = {
        existsSync: (p) => {
            console.log(`[FS SHIM] existsSync("${p}") -> false`);
            return false;
        },
        readFileSync: (p) => {
            console.log(`[FS SHIM] readFileSync("${p}") -> FAIL`);
            throw new Error('fs.readFileSync not supported');
        },
        mkdirSync: (p) => {
            console.log(`[FS SHIM] mkdirSync("${p}")`);
        },
        readdirSync: (p) => {
            console.log(`[FS SHIM] readdirSync("${p}") -> []`);
            return [];
        },
        writeFileSync: (p, d) => {
            console.log(`[FS SHIM] writeFileSync("${p}")`);
        },
        unlinkSync: (p) => {
            console.log(`[FS SHIM] unlinkSync("${p}")`);
        },
        statSync: (p) => {
            console.log(`[FS SHIM] statSync("${p}")`);
            return { isDirectory: () => false, size: 0 };
        }
    };
}

// --- 4. require() shim ---
if (typeof globalThis.require === 'undefined' || typeof require === 'undefined') {
    const requireShim = function (moduleName) {
        if (moduleName === 'fs') return globalThis.fs;
        if (moduleName === 'path') {
            return {
                join: (...args) => {
                    const parts = args.filter(Boolean).map(a => String(a)).join('/').split(/\/+/);
                    const resolved = [];
                    for (const part of parts) {
                        if (part === '..') resolved.pop();
                        else if (part !== '.') resolved.push(part);
                    }
                    return resolved.join('/') || '.';
                },
                dirname: (p) => p.split('/').slice(0, -1).join('/') || '.',
                basename: (p) => p.split('/').pop(),
                resolve: (...args) => {
                    // Resolution in this context is similar to join for now
                    const parts = args.filter(Boolean).map(a => String(a)).join('/').split(/\/+/);
                    const resolved = [];
                    for (const part of parts) {
                        if (part === '..') resolved.pop();
                        else if (part !== '.') resolved.push(part);
                    }
                    return resolved.join('/') || '.';
                },
                sep: '/'
            };
        }
        if (moduleName === 'https' || moduleName === 'http') {
            return {
                get: (url, callback) => {
                    console.log('[POLYFILL] https.get called: ' + url);
                    // Safe error return - wait for BlockRegistry timeout to trigger fallbacks naturally
                    const mockReq = { on: function (ev, cb) { return this; } };
                    return mockReq;
                }
            };
        }
        if (globalThis[moduleName]) return globalThis[moduleName];
        return {};
    };
    if (typeof globalThis.require === 'undefined') globalThis.require = requireShim;
}

// --- 5. Bridge Management ---
const MoudBridge = {
    ready: false,
    queue: [],
    check: function () {
        let currentApi = null;
        try { currentApi = globalThis.api || (typeof api !== 'undefined' ? api : null); } catch (e) { }
        if (currentApi && (currentApi.server || currentApi.on)) {
            this.init(currentApi);
        } else {
            setTimeout(() => this.check(), 50);
        }
    },
    init: function (apiInstance) {
        if (this.ready) return;
        globalThis.api = apiInstance;
        this.ready = true;
        console.log("§a[Moud Polyfill] Ready.");
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

globalThis.onMoudReady = (cb) => MoudBridge.onReady(cb);
MoudBridge.check();
console.log('[POLYFILL] Polyfill initialization completed.');
