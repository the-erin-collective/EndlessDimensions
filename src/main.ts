/// <reference types="@epi-studio/moud-sdk" />

const MOD_VERSION = '1.0.8';
console.log(`[MAIN] Endless Dimensions Mod v${MOD_VERSION} starting...`);

// Import core logic
import { DimensionGenerator } from './core/DimensionGenerator';
import { HashEngine } from './core/HashEngine';
import { BlockRegistry } from './core/BlockRegistry';
import { PortalHandler } from './events/PortalHandler';
import { EasterEggDimensionManager } from './core/EasterEggDimensionManager';
import { CentralizedStateManager } from './core/CentralizedStateManager';
import { CustomBlockRegistry } from './core/CustomBlockRegistry';
import { BridgePluginManager } from './services/BridgePluginManager';
import { DimensionService } from './services/DimensionService';
import { LootService } from './services/LootService';

// Import enhanced systems
import { getCustomBlockRegistry } from './enhanced/CustomBlockRegistry';
import { getBiomeGenerator } from './worldgen/biomeGenerator';
import { getStructureGenerator } from './worldgen/StructureGenerator';
import { getWorldFeatureIntegration } from './worldgen/WorldFeatureIntegration';
import { getSoundSystem } from './enhanced/SoundSystem';
import { getParticleSystem } from './enhanced/ParticleSystem';

// Import Terra Bridge example
import { demonstrateTerraBridge } from './examples/TerraBridgeExample';

// Import Polar Bridge example
import { demonstratePolarBridge } from './examples/PolarBridgeExample';

// Helper to log all available keys on the API object
export const debugGlobalScope = () => {
    try {
        const keys = Object.getOwnPropertyNames(globalThis);
        console.log("[DEBUG] Available Globals:", JSON.stringify(keys));
        console.log("[DEBUG] moud object exists:", !!(globalThis as any).moud);
        if ((globalThis as any).moud) {
            console.log("[DEBUG] moud keys:", Object.getOwnPropertyNames((globalThis as any).moud));
        }
        console.log("[DEBUG] Java global exists:", !!(globalThis as any).Java);
        console.log("[DEBUG] Packages global exists:", !!(globalThis as any).Packages);
    } catch (e) {
        console.error("[DEBUG] Global scope probe failed:", e);
    }
};

debugGlobalScope();

function logDetailedApi(obj: any, label: string = 'api'): void {
    console.log(`[MAIN] --- NUCLEAR DISCOVERY START (v6) ---`);

    const probe = (target: any, name: string, depth = 0) => {
        if (!target || depth > 3) return;
        try {
            // Use getOwnPropertyNames to find hidden keys
            const keys = Object.getOwnPropertyNames(target);
            console.log(`[DISCOVERY] Exploring ${name} (${keys.length} keys, Depth: ${depth})`);

            keys.forEach(key => {
                try {
                    const val = target[key];
                    const type = typeof val;
                    const str = String(val).substring(0, 50);

                    console.log(`[DISCOVERY]   KEY: ${key} | TYPE: ${type} | STR: ${str}`);

                    // Look for Java/State/Native triggers
                    const lkey = key.toLowerCase();
                    if (lkey.includes('java') || lkey.includes('state') || lkey.includes('native') || lkey.includes('bridge') || lkey.includes('getclass') || lkey.includes('type')) {
                        console.log(`⭐ INTERESTING KEY: ${name}.${key} (Type: ${type})`);
                    }

                    // Call zero-arg getters
                    if (type === 'function' && (key.startsWith('get') || key.startsWith('is')) && key.length > 2) {
                        try {
                            const result = val.call(target);
                            console.log(`⤴️ GETTER CALL: ${name}.${key}() -> Result: ${typeof result} (${String(result).substring(0, 30)})`);
                        } catch (e) { }
                    }

                    // Recurse
                    if (type === 'object' && val !== null && !Array.isArray(val) && depth < 2) {
                        probe(val, `${name}.${key}`, depth + 1);
                    }
                } catch (e) { }
            });
        } catch (e) {
            console.log(`[DISCOVERY] Failed to probe ${name}: ${e}`);
        }
    };

    // Probe Globals
    const g: any = globalThis;
    if (typeof (g as any).Moud !== 'undefined') probe((g as any).Moud, 'Moud');
    if (typeof (g as any).moud !== 'undefined') probe((g as any).moud, 'moud');
    if (typeof (g as any).api !== 'undefined') probe((g as any).api, 'api');

    // Module Require Quest v6
    console.log('[MAIN] Module Require Quest v6...');
    const modulesToTest = ['moud', 'api', 'state', 'shared-value', 'shared-values', '@epi-studio/moud-sdk', 'native'];
    modulesToTest.forEach(mod => {
        try {
            const r = (globalThis as any).require || (typeof require !== 'undefined' ? require : null);
            if (!r) return;
            const result = r(mod);
            if (result) {
                console.log(`[MAIN] REQUIRE SUCCESS: "${mod}" -> ${typeof result} (${Object.prototype.toString.call(result)})`);
                probe(result, `require("${mod}")`);
            }
        } catch (e) { }
    });

    console.log('[MAIN] --- NUCLEAR DISCOVERY END (v6) ---');
}

// Simple API wait function
function waitForMoudApi(): Promise<void> {
    return new Promise<void>((resolve) => {
        const checkDetailedApi = () => {
            const potentialApi = (globalThis as any).api;
            if (potentialApi) {
                // Focus on core sub-systems confirmed to exist in SDK 0.7.3
                const hasServer = !!potentialApi.server;
                const hasWorld = !!potentialApi.world;
                const hasAsync = !!potentialApi.async;

                if (hasServer && hasWorld && hasAsync) {
                    return true;
                }
            }
            return false;
        };

        if (checkDetailedApi()) {
            resolve();
            return;
        }

        const poll = setInterval(() => {
            if (checkDetailedApi()) {
                clearInterval(poll);
                resolve();
            }
        }, 100);

        // Timeout fallback
        setTimeout(() => {
            if (!checkDetailedApi()) {
                console.warn('[MAIN] API check timed out after 5s, proceeding with available sub-systems.');
                clearInterval(poll);
                resolve();
            }
        }, 5000);
    });
}

// Mod state variables
let dimensionGenerator: DimensionGenerator;
let hashEngine: HashEngine;
let blockRegistry: BlockRegistry;
let portalHandler: PortalHandler;
let easterEggManager: EasterEggDimensionManager;
let stateManager: CentralizedStateManager; // Original declaration
let customBlockRegistry: CustomBlockRegistry;
let enhancedCustomBlockRegistry: any;
let biomeGenerator: any;
let structureGenerator: any;
let worldFeatureIntegration: any;
let soundSystem: any;
let particleSystem: any;
let dimensionService: DimensionService;
let lootService: LootService; // Added

// Register event handlers
api.on('server.load', async () => {
    console.log(`[MAIN] server.load received (v${MOD_VERSION})`);

    // Wait for the bridge to confirm sub-systems are available
    await waitForMoudApi();

    console.log('[MAIN] Starting full system initialization...');
    logDetailedApi((globalThis as any).api);

    try {
        // Step 1: Initialize enhanced systems
        const customBlockRegistry = getCustomBlockRegistry();
        const soundSystem = getSoundSystem();
        const particleSystem = getParticleSystem();
        const structureGenerator = getStructureGenerator();
        const worldFeatureIntegration = getWorldFeatureIntegration();

        // Initialize services
        const dimensionService = new DimensionService(api);
        const lootService = new LootService();

        // Initialize services in parallel
        await Promise.all([
            dimensionService.initialize(),
            lootService.initialize()
        ]);

        console.log('[MAIN] All services initialized successfully');

        // Step 3: Initialize core systems
        hashEngine = new HashEngine();
        blockRegistry = new BlockRegistry(api);

        console.log('[MAIN] Loading block registry data...');
        await blockRegistry.initialize();

        dimensionGenerator = new DimensionGenerator(api, hashEngine, blockRegistry);
        easterEggManager = new EasterEggDimensionManager(api);

        console.log('[MAIN] Loading easter egg dimensions...');
        await easterEggManager.initialize();

        stateManager = new CentralizedStateManager(api);
        portalHandler = new PortalHandler(api, dimensionGenerator, hashEngine, easterEggManager);

        // Step 4: Initialize Services (already done above)
        // dimensionService and lootService are already initialized

        // Initialize Combat (MinestomPvP)
        const getJava = () => {
            const candidates = [
                (globalThis as any).Java,
                (globalThis as any).moud?.java,
                (globalThis as any).moud?.native,
                (globalThis as any).require ? (globalThis as any).require('native') : null,
                (globalThis as any).require ? (globalThis as any).require('moud') : null
            ];

            for (const c of candidates) {
                if (!c) continue;
                // Check for capability
                const hasType = typeof c.type === 'function';
                const hasGetClass = typeof c.getClass === 'function';
                const hasGetNative = typeof c.getNativeClass === 'function';

                if (hasType || hasGetClass || hasGetNative) {
                    // Create a wrapper to ensure .type() exists
                    return {
                        ...c,
                        type: (name: string) => {
                            if (hasType) return c.type(name);
                            if (hasGetClass) return c.getClass(name);
                            if (hasGetNative) return c.getNativeClass(name);
                            throw new Error('Java bridge capability lost');
                        },
                        _raw: c
                    };
                }
            }
            return undefined;
        };
        const java = getJava();
        if (typeof java !== 'undefined' && java.type) {
            try {
                const CombatFeatures = java.type('io.github.togar2.pvp.feature.CombatFeatures');
                const combatNode = CombatFeatures.modernVanilla().createNode();

                // Add combat features to the global server event node
                // Note: api.events.getGlobalNode() or similar might be needed
                // For now we'll assume api.on can be used or we find the node
                console.log('[Main] MinestomPvP combat features initialized.');
            } catch (e) {
                console.error('[Main] Failed to initialize MinestomPvP:', e);
            }
        }

        // Initialize Loot Service (already done above)
        // lootService.initialize() is already called in the parallel initialization

        // Step 5: Initialize state manager
        console.log('[MAIN] Initializing state synchronization...');
        await stateManager.initialize();

        // Step 6: Register event handlers
        portalHandler.registerEvents();

        // Step 7: Demonstrate Terra Bridge Plugin usage
        await demonstrateTerraBridge();

        // Step 8: Demonstrate Polar Bridge Plugin usage
        await demonstratePolarBridge();

        console.log(`[MAIN] Endless Dimensions Mod v${MOD_VERSION} initialization complete!`);
    } catch (error) {
        console.error('[MAIN] FATAL ERROR during initialization:', error);
    }
});

api.on('server.shutdown', () => {
    console.log('[MAIN] Mod shutting down...');
    if (portalHandler) portalHandler.unregisterEvents();
    if (stateManager) stateManager.shutdown();
    if (enhancedCustomBlockRegistry) enhancedCustomBlockRegistry.clearCustomBlocks();
    if (biomeGenerator) biomeGenerator.clearBiomes();
    if (structureGenerator) structureGenerator.clearStructures();
    if (worldFeatureIntegration) worldFeatureIntegration.clearWorldFeatures();
    if (soundSystem) soundSystem.clearSounds();
    if (particleSystem) particleSystem.clearParticles();
    console.log('[MAIN] Shutdown complete.');
});

console.log(`[MAIN] Mod loading complete (v${MOD_VERSION})`);
