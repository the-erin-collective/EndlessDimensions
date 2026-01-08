/**
 * MOUD API Polyfill & Compatibility Layer v1.0.8
 * Features: require() shim, process shim, Timer fixes, and Ready-state Queue.
 */

console.log('[POLYFILL] Starting polyfill initialization...');

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

// --- 3. fs shim ---
if (typeof globalThis.fs === 'undefined') {
    if (typeof Java !== 'undefined') {
        console.log('[POLYFILL] globalThis.fs missing, installing Java-backed shim...');
        try {
            const Files = Java.type('java.nio.file.Files');
            const Paths = Java.type('java.nio.file.Paths');
            const StandardOpenOption = Java.type('java.nio.file.StandardOpenOption');

            globalThis.fs = {
                readFileSync: (path, encoding) => {
                    const p = Paths.get(String(path));
                    const bytes = Files.readAllBytes(p);
                    return String(new (Java.type('java.lang.String'))(bytes, encoding || "UTF-8"));
                },
                existsSync: (path) => {
                    try { return Files.exists(Paths.get(String(path))); } catch (e) { return false; }
                },
                mkdirSync: (path, options) => {
                    Files.createDirectories(Paths.get(String(path)));
                },
                readdirSync: (path) => {
                    const stream = Files.list(Paths.get(String(path)));
                    const list = [];
                    stream.forEach(p => list.push(String(p.getFileName())));
                    return list;
                },
                writeFileSync: (path, data) => {
                    Files.write(Paths.get(String(path)), new (Java.type('java.lang.String'))(data).getBytes(), [StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING]);
                },
                unlinkSync: (path) => {
                    Files.delete(Paths.get(String(path)));
                },
                statSync: (path) => {
                    const p = Paths.get(String(path));
                    return { isDirectory: () => Files.isDirectory(p), size: 0 };
                }
            };
        } catch (e) { console.error('[POLYFILL] Java fs failed:', e); }
    }

    // Ensure we ALWAYS have a basic fs object to prevent crashes
    if (!globalThis.fs) {
        globalThis.fs = {
            readFileSync: () => { throw new Error('fs.readFileSync not supported'); },
            existsSync: () => false,
            mkdirSync: () => { },
            readdirSync: () => [],
            writeFileSync: () => { },
            unlinkSync: () => { },
            statSync: () => ({ isDirectory: () => false, size: 0 })
        };
    }
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
