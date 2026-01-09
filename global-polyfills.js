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

if (typeof Graal !== 'undefined') {
    try {
        const graalKeys = Object.getOwnPropertyNames(Graal);
        console.log(`[POLYFILL] Graal keys: ${graalKeys.join(', ')}`);
        graalKeys.forEach(k => {
            try {
                const val = Graal[k];
                console.log(`[POLYFILL] Graal.${k} type: ${typeof val} (${Object.prototype.toString.call(val)})`);
            } catch (e) { }
        });
    } catch (e) { }
}

if (typeof Moud !== 'undefined') {
    try {
        const moudKeys = Object.getOwnPropertyNames(Moud);
        console.log(`[POLYFILL] Moud keys: ${moudKeys.join(', ')}`);
    } catch (e) { }
}

if (typeof Java !== 'undefined') {
    console.log('[POLYFILL] Java global found, exposing to globalThis.');
    globalThis.Java = Java;
} else {
    // Aggressive Discovery Quest
    let foundJava = false;

    const trySetJava = (obj, sourceName) => {
        if (!obj) return false;

        const hasType = typeof obj.type === 'function';
        const hasGetClass = typeof obj.getClass === 'function';
        const hasLoad = typeof obj.load === 'function';
        const hasGetNative = typeof obj.getNativeClass === 'function';

        if (hasType || hasGetClass || hasLoad || hasGetNative) {
            console.log(`[POLYFILL] SUCCESS: Found Java-like bridge in ${sourceName}!`);

            // Create a robust wrapper
            const wrapper = {
                ...obj,
                type: (name) => {
                    if (hasType) return obj.type(name);
                    if (hasGetClass) return obj.getClass(name);
                    if (hasGetNative) return obj.getNativeClass(name);
                    if (hasLoad) return obj.load(name);
                    throw new Error(`Java bridge in ${sourceName} missing type/getClass/load`);
                },
                _raw: obj
            };

            globalThis.Java = wrapper;
            foundJava = true;
            return true;
        }
        return false;
    };

    // 1. Check common GraalVM globals
    if (typeof Polyglot !== 'undefined' && Polyglot.import) {
        try {
            const polyJava = Polyglot.import('java');
            if (trySetJava(polyJava, 'Polyglot.import("java")')) foundJava = true;
        } catch (e) { }
    }

    // 2. Check Graal/Moud/api members (including non-enumerable)
    const checkObjRecursive = (obj, name, depth = 0) => {
        if (!obj || depth > 2 || foundJava) return;
        try {
            const keys = Object.getOwnPropertyNames(obj);
            for (const key of keys) {
                if (key.toLowerCase() === 'java' || key === 'native') {
                    if (trySetJava(obj[key], `${name}.${key}`)) return;
                }
                if (typeof obj[key] === 'object' && obj[key] !== null) {
                    checkObjRecursive(obj[key], `${name}.${key}`, depth + 1);
                }
            }
        } catch (e) { }
    };

    if (!foundJava && typeof Graal !== 'undefined') checkObjRecursive(Graal, 'Graal');
    if (!foundJava && typeof Moud !== 'undefined') checkObjRecursive(Moud, 'Moud');

    // 3. Try lowercase moud (Moud 0.7.x spec)
    if (!foundJava && typeof moud !== 'undefined') {
        checkObjRecursive(moud, 'moud');
    }

    // 4. Try it through require (Aggressive Speculative Probing)
    if (!foundJava && (typeof require !== 'undefined' || globalThis.require)) {
        const r = globalThis['require'] || require;
        const tryMod = (modName) => {
            try {
                const mod = r(modName);
                if (mod) {
                    // Speculative check for methods even if not enumerable
                    if (typeof mod.type === 'function' || typeof mod.getClass === 'function' || typeof mod.load === 'function' || typeof mod.getNativeClass === 'function') {
                        return trySetJava(mod, `require("${modName}") [Speculative Match]`);
                    }
                    // Depth check for sub-keys
                    return checkObjRecursive(mod, `require("${modName}")`);
                }
            } catch (e) { }
            return false;
        };

        if (tryMod('native')) foundJava = true;
        if (!foundJava && tryMod('moud')) foundJava = true;
        if (!foundJava && tryMod('api')) foundJava = true;
    }

    // 5. Moud 0.7.x Specific: Check for a hidden 'native' object in global scope
    if (!foundJava) {
        try {
            if (typeof native !== 'undefined' && (native.type || native.getClass)) {
                if (trySetJava(native, 'global.native')) foundJava = true;
            }
        } catch (e) { }
    }

    // 6. Fallback to Packages
    if (!foundJava && typeof Packages !== 'undefined') {
        console.log('[POLYFILL] Java not found, but Packages is available. Using Packages as Java shim.');
        globalThis.Java = {
            type: (name) => {
                const parts = name.split('.');
                let curr = Packages;
                for (const p of parts) {
                    if (!curr[p]) throw new Error(`Class ${name} not found in Packages`);
                    curr = curr[p];
                }
                return curr;
            }
        };
        foundJava = true;
    }

    if (!foundJava) {
        console.log('[POLYFILL] Warning: Neither Java nor Packages found in global scope.');
    }
}

// --- 0.1 State Normalization ---
if (typeof require !== 'undefined' || globalThis.require) {
    const r = globalThis['require'] || require;
    try {
        const stateMod = r('state');
        if (stateMod && !globalThis.moud_state) {
            globalThis.moud_state = stateMod;
            console.log('[POLYFILL] State module found and exposed as moud_state');
        }
    } catch (e) { }
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
