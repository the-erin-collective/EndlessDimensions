// Moud API polyfills for GraalJS compatibility
// These polyfills use Moud's internal APIs instead of Node.js built-in modules

// Node.js globals
globalThis.__dirname = '.';
globalThis.__filename = 'main.js';
globalThis.process = {
    env: {},
    platform: 'minecraft',
    arch: 'graaljs',
    version: '1.0.0',
    versions: {
        node: '18.0.0'
    },
    cwd: () => '.',
    exit: (code) => {
        console.log(`Process exit with code: ${code}`);
    }
};

// Custom require function to intercept Node.js module imports
globalThis.require = function(moduleName) {
    console.log(`Intercepting require() call for: ${moduleName}`);
    
    // Return the appropriate global polyfill
    switch(moduleName) {
        case 'crypto':
            return globalThis.crypto;
        case 'fs':
            return globalThis.fs;
        case 'path':
            return globalThis.path;
        case 'https':
            return globalThis.https;
        case 'http':
            return globalThis.http;
        case 'os':
            return globalThis.os;
        case 'util':
            return globalThis.util;
        case 'events':
            return globalThis.events;
        case 'stream':
            return globalThis.stream;
        case 'buffer':
            return globalThis.buffer;
        case 'child_process':
            return globalThis.child_process;
        case 'cluster':
            return globalThis.cluster;
        case 'dgram':
            return globalThis.dgram;
        case 'dns':
            return globalThis.dns;
        case 'net':
            return globalThis.net;
        case 'readline':
            return globalThis.readline;
        case 'repl':
            return globalThis.repl;
        case 'tls':
            return globalThis.tls;
        case 'url':
            return globalThis.url;
        case 'zlib':
            return globalThis.zlib;
        default:
            console.warn(`Unknown module requested: ${moduleName}`);
            return {};
    }
};

// Crypto polyfill using simple hash function
globalThis.crypto = {
    createHash: (algorithm) => ({
        update: (data) => ({
            digest: (encoding) => {
                // Simple hash implementation for basic compatibility
                const str = typeof data === 'string' ? data : String(data);
                let hash = 0;
                for (let i = 0; i < str.length; i++) {
                    const char = str.charCodeAt(i);
                    hash = ((hash << 5) - hash) + char;
                    hash = hash & hash; // Convert to 32-bit integer
                }
                
                if (encoding === 'hex') {
                    return Math.abs(hash).toString(16).padStart(8, '0');
                }
                
                // Return buffer-like object for other encodings
                const buffer = new Array(32);
                for (let i = 0; i < 32; i++) {
                    buffer[i] = (hash >> (i * 8)) & 0xFF;
                }
                return {
                    readInt32LE: (offset) => (buffer[offset] | (buffer[offset + 1] << 8) | (buffer[offset + 2] << 16) | (buffer[offset + 3] << 24)) >>> 0
                };
            }
        })
    })
};

// FS polyfill using Moud's api.internal.fs
// Note: This will only work when the 'api' global is available (during runtime)
globalThis.fs = {
    existsSync: function(path) {
        try {
            if (typeof api !== 'undefined' && api.internal && api.internal.fs) {
                // Use Moud's filesystem API
                api.internal.fs.stat(path);
                return true;
            }
            console.warn('Moud API not available, using fallback for fs.existsSync()');
            return false; // Fallback for when api is not available
        } catch (error) {
            console.warn('Error in fs.existsSync():', error);
            return false;
        }
    },
    
    readFileSync: function(path, encoding) {
        if (typeof api !== 'undefined' && api.internal && api.internal.fs) {
            return api.internal.fs.readFile(path, encoding || 'utf8');
        }
        console.warn('Moud API not available, using fallback for fs.readFileSync()');
        return ''; // Fallback
    },
    
    writeFileSync: function(path, data, encoding) {
        if (typeof api !== 'undefined' && api.internal && api.internal.fs) {
            return api.internal.fs.writeFile(path, data, encoding || 'utf8');
        }
        console.warn('Moud API not available, using fallback for fs.writeFileSync()');
        // No-op fallback
    },
    
    mkdirSync: function(path, options) {
        if (typeof api !== 'undefined' && api.internal && api.internal.fs) {
            return api.internal.fs.mkdir(path, options);
        }
        console.warn('Moud API not available, using fallback for fs.mkdirSync()');
        // No-op fallback
    },
    
    readdirSync: function(path) {
        if (typeof api !== 'undefined' && api.internal && api.internal.fs) {
            return api.internal.fs.readdir(path);
        }
        console.warn('Moud API not available, using fallback for fs.readdirSync()');
        return []; // Fallback
    },
    
    statSync: function(path) {
        if (typeof api !== 'undefined' && api.internal && api.internal.fs) {
            return api.internal.fs.stat(path);
        }
        console.warn('Moud API not available, using fallback for fs.statSync()');
        return { isFile: () => false, isDirectory: () => false }; // Fallback
    },
    
    unlinkSync: function(path) {
        if (typeof api !== 'undefined' && api.internal && api.internal.fs) {
            return api.internal.fs.unlink(path);
        }
        console.warn('Moud API not available, using fallback for fs.unlinkSync()');
        // No-op fallback
    }
};

// Path polyfill (pure JavaScript, no API needed)
globalThis.path = {
    join: (...paths) => paths.join('/').replace(/\/+/g, '/'),
    resolve: (...paths) => paths.join('/').replace(/\/+/g, '/'),
    dirname: (path) => path.split('/').slice(0, -1).join('/'),
    basename: (path) => path.split('/').pop(),
    extname: (path) => {
        const name = path.split('/').pop();
        const dot = name.lastIndexOf('.');
        return dot > 0 ? name.substring(dot) : '';
    }
};

// HTTPS polyfill (minimal - would need Moud HTTP API if available)
globalThis.https = {
    get: (url, callback) => {
        // Placeholder - would need actual implementation via Moud's HTTP APIs
        console.warn('HTTPS requests not yet implemented in Moud polyfill');
        if (callback) callback({ on: () => {} });
        return { on: () => {} };
    }
};

// Export empty objects for other modules (basic compatibility)
globalThis.os = {
    platform: () => 'minecraft',
    arch: () => 'graaljs'
};
globalThis.util = {};
globalThis.events = {};
globalThis.stream = {};
globalThis.buffer = {};
globalThis.child_process = {};
globalThis.cluster = {};
globalThis.dgram = {};
globalThis.dns = {};
globalThis.http = {
    get: globalThis.https.get
};
globalThis.net = {};
globalThis.readline = {};
globalThis.repl = {};
globalThis.tls = {};
globalThis.url = {
    parse: (url) => ({ href: url, pathname: url })
};
globalThis.zlib = {};

console.log('Moud API polyfills with custom require() loaded for GraalJS compatibility');
