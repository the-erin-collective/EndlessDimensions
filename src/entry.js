// Load polyfills first before anything else
console.log('[ENTRY] Loading polyfills...');
require('./global-polyfills.js');
console.log('[ENTRY] Polyfills loaded, loading main.js...');

// Then load the actual mod - try different possible locations
try {
    require('./main.js');
    console.log('[ENTRY] Main.js loaded successfully!');
} catch (error) {
    console.log('[ENTRY] main.js not found, trying src/main.js...');
    try {
        require('./src/main.js');
        console.log('[ENTRY] src/main.js loaded successfully!');
    } catch (error2) {
        console.log('[ENTRY] src/main.js not found, trying src/main.ts...');
        try {
            require('./src/main.ts');
            console.log('[ENTRY] src/main.ts loaded successfully!');
        } catch (error3) {
            console.log('[ENTRY] ERROR: Could not find main module in any location');
            console.log('[ENTRY] Error details:', error3.message);
        }
    }
}
