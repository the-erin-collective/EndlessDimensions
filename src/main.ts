/// <reference types="@epi-studio/moud-sdk" />
import { DimensionGenerator } from './core/DimensionGenerator';
import { HashEngine } from './core/HashEngine';
import { BlockRegistry } from './core/BlockRegistry';
import { PortalHandler } from './events/PortalHandler';
import { CustomBlockRegistry } from './core/CustomBlockRegistry';

console.log('Endless Dimensions Mod starting...');

// Initialize core systems
let dimensionGenerator: DimensionGenerator;
let hashEngine: HashEngine;
let blockRegistry: BlockRegistry;
let portalHandler: PortalHandler;
let customBlockRegistry: CustomBlockRegistry;

// Initialize when the server loads
api.on('server.load', () => {
    console.log('Initializing Endless Dimensions Mod...');
    
    try {
        // Step 1: Register custom blocks first
        console.log('Creating CustomBlockRegistry...');
        customBlockRegistry = new CustomBlockRegistry(api);
        console.log('CustomBlockRegistry created:', customBlockRegistry);
        
        console.log('Calling registerCustomBlocks...');
        customBlockRegistry.registerCustomBlocks();
        console.log('registerCustomBlocks completed');
        
        // Step 2: Initialize core systems (now with custom blocks in registry)
        hashEngine = new HashEngine();
        blockRegistry = new BlockRegistry(api);
        dimensionGenerator = new DimensionGenerator(api, hashEngine, blockRegistry);
        portalHandler = new PortalHandler(api, dimensionGenerator, hashEngine);
        
        // Step 3: Register event handlers
        portalHandler.registerEvents();
        
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
});

console.log('Endless Dimensions Mod loaded!');
