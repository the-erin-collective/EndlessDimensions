/// <reference types="@epi-studio/moud-sdk" />
import { DimensionGenerator } from './core/DimensionGenerator';
import { HashEngine } from './core/HashEngine';
import { BlockRegistry } from './core/BlockRegistry';
import { PortalHandler } from './events/PortalHandler';
import { CustomBlockRegistry } from './core/CustomBlockRegistry';
import { getCustomBlockRegistry } from './enhanced/CustomBlockRegistry';
import { getBiomeGenerator } from './worldgen/BiomeGenerator';
import { getStructureGenerator } from './worldgen/StructureGenerator';
import { getWorldFeatureIntegration } from './worldgen/WorldFeatureIntegration';
import { getSoundSystem } from './enhanced/SoundSystem';
import { getParticleSystem } from './enhanced/ParticleSystem';

console.log('Endless Dimensions Mod starting...');

// Initialize core systems
let dimensionGenerator: DimensionGenerator;
let hashEngine: HashEngine;
let blockRegistry: BlockRegistry;
let portalHandler: PortalHandler;
let customBlockRegistry: CustomBlockRegistry;
let enhancedCustomBlockRegistry: any;
let biomeGenerator: any;
let structureGenerator: any;
let worldFeatureIntegration: any;
let soundSystem: any;
let particleSystem: any;

// Initialize when the server loads
api.on('server.load', () => {
    console.log('Initializing Endless Dimensions Mod...');
    
    try {
        // Step 1: Initialize Enhanced Systems
        console.log('Initializing Enhanced Systems...');
        enhancedCustomBlockRegistry = getCustomBlockRegistry();
        biomeGenerator = getBiomeGenerator();
        structureGenerator = getStructureGenerator();
        worldFeatureIntegration = getWorldFeatureIntegration();
        soundSystem = getSoundSystem();
        particleSystem = getParticleSystem();
        console.log('Enhanced Systems initialized');
        
        // Step 2: Register custom blocks (legacy system)
        console.log('Creating CustomBlockRegistry...');
        customBlockRegistry = new CustomBlockRegistry(api);
        console.log('CustomBlockRegistry created:', customBlockRegistry);
        
        console.log('Calling registerCustomBlocks...');
        customBlockRegistry.registerCustomBlocks();
        console.log('registerCustomBlocks completed');
        
        // Step 3: Initialize core systems (now with custom blocks in registry)
        hashEngine = new HashEngine();
        blockRegistry = new BlockRegistry(api);
        dimensionGenerator = new DimensionGenerator(api, hashEngine, blockRegistry);
        portalHandler = new PortalHandler(api, dimensionGenerator, hashEngine);
        
        // Step 4: Register event handlers
        portalHandler.registerEvents();
        
        // Step 5: Log initialization statistics
        console.log('Enhanced Systems Statistics:');
        console.log('  Custom Block Registry:', enhancedCustomBlockRegistry.getStatistics());
        console.log('  Biome Generator:', biomeGenerator.getStatistics());
        console.log('  Structure Generator:', structureGenerator.getStatistics());
        console.log('  World Feature Integration:', worldFeatureIntegration.getStatistics());
        console.log('  Sound System:', soundSystem.getStatistics());
        console.log('  Particle System:', particleSystem.getStatistics());
        
        console.log('Endless Dimensions Mod initialized successfully!');
    } catch (error) {
        console.error('Error during initialization:', error);
    }
});

// Clean up on server shutdown
api.on('server.shutdown', () => {
    console.log('Endless Dimensions Mod shutting down...');
    if (portalHandler) {
        portalHandler.unregisterEvents();
    }
    
    // Clean up enhanced systems
    if (enhancedCustomBlockRegistry) {
        enhancedCustomBlockRegistry.clearCustomBlocks();
    }
    
    if (biomeGenerator) {
        biomeGenerator.clearBiomes();
    }
    
    if (structureGenerator) {
        structureGenerator.clearStructures();
    }
    
    if (worldFeatureIntegration) {
        worldFeatureIntegration.clearWorldFeatures();
    }
    
    if (soundSystem) {
        soundSystem.clearSounds();
    }
    
    if (particleSystem) {
        particleSystem.clearParticles();
    }
    
    console.log('Endless Dimensions Mod shutdown complete');
});

console.log('Endless Dimensions Mod loaded!');
