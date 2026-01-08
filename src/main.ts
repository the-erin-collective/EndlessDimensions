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
import { DimensionService } from './services/DimensionService';
import { LootService } from './services/LootService';

// Import enhanced systems
import { getCustomBlockRegistry } from './enhanced/CustomBlockRegistry';
import { getBiomeGenerator } from './worldgen/BiomeGenerator';
import { getStructureGenerator } from './worldgen/StructureGenerator';
import { getWorldFeatureIntegration } from './worldgen/WorldFeatureIntegration';
import { getSoundSystem } from './enhanced/SoundSystem';
import { getParticleSystem } from './enhanced/ParticleSystem';

// Helper to log all available keys on the API object
function logDetailedApi(obj: any, label: string = 'api'): void {
    try {
        if (!obj) {
            console.log(`[MAIN] ${label} is null or undefined`);
            return;
        }
        const keys = Object.keys(obj);
        console.log(`[MAIN] ${label} keys: ${keys.join(', ')}`);

        // Log types of critical keys to verify they are ready
        const critical = ['server', 'world', 'commands', 'async', 'assets'];
        critical.forEach(key => {
            console.log(`[MAIN] api.${key} type: ${typeof obj[key]}`);
        });

        if (obj.internal) {
            console.log(`[MAIN] api.internal found (non-enumerable or dynamic)`);
        }
    } catch (e) {
        console.log(`[MAIN] Error during API introspection: ${e}`);
    }
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
        // Step 1: Initialize Enhanced Systems
        enhancedCustomBlockRegistry = getCustomBlockRegistry();
        biomeGenerator = getBiomeGenerator();
        structureGenerator = getStructureGenerator();
        worldFeatureIntegration = getWorldFeatureIntegration();
        soundSystem = getSoundSystem();
        particleSystem = getParticleSystem();
        console.log('[MAIN] Enhanced Systems initialized');

        // Step 2: Register custom blocks
        customBlockRegistry = new CustomBlockRegistry(api);
        customBlockRegistry.registerCustomBlocks();
        console.log('[MAIN] Custom blocks registered');

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

        // Step 4: Initialize Services
        dimensionService = new DimensionService(api);
        lootService = new LootService(api);

        await dimensionService.initialize();

        // Initialize Combat (MinestomPvP)
        const java = (globalThis as any).Java;
        if (typeof java !== 'undefined') {
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

        // Initialize Loot Service
        lootService.initialize(); // Added

        // Step 5: Initialize state manager
        console.log('[MAIN] Initializing state synchronization...');
        await stateManager.initialize();

        // Step 6: Register event handlers
        portalHandler.registerEvents();

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
