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
import { getBookDataBridge } from './core/BookDataBridge';

console.log('Endless Dimensions Mod (Packet Interception) starting...');

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
let bookDataBridge: any;

// Initialize when the server loads
api.on('server.load', async () => {
    console.log('Initializing Endless Dimensions Mod with Packet Interception...');
    
    try {
        // Step 1: Initialize Packet Interception System FIRST
        console.log('Initializing BookDataBridge...');
        bookDataBridge = getBookDataBridge();
        await bookDataBridge.initialize();
        console.log('BookDataBridge initialized successfully');
        
        // Step 2: Initialize Enhanced Systems
        console.log('Initializing Enhanced Systems...');
        enhancedCustomBlockRegistry = getCustomBlockRegistry();
        biomeGenerator = getBiomeGenerator();
        structureGenerator = getStructureGenerator();
        worldFeatureIntegration = getWorldFeatureIntegration();
        soundSystem = getSoundSystem();
        particleSystem = getParticleSystem();
        console.log('Enhanced Systems initialized');
        
        // Step 3: Register custom blocks (legacy system)
        console.log('Creating CustomBlockRegistry...');
        customBlockRegistry = new CustomBlockRegistry(api);
        console.log('CustomBlockRegistry created:', customBlockRegistry);
        
        console.log('Calling registerCustomBlocks...');
        customBlockRegistry.registerCustomBlocks();
        console.log('registerCustomBlocks completed');
        
        // Step 4: Initialize core systems
        hashEngine = new HashEngine();
        blockRegistry = new BlockRegistry(api);
        dimensionGenerator = new DimensionGenerator(api, hashEngine, blockRegistry);
        portalHandler = new PortalHandler(api, dimensionGenerator, hashEngine);
        
        // Step 5: Register event handlers
        portalHandler.registerEvents();
        
        // Step 6: Set up book-based dimension generation events
        setupBookDimensionEvents();
        
        // Step 7: Log initialization statistics
        console.log('Enhanced Systems Statistics:');
        console.log('  Custom Block Registry:', enhancedCustomBlockRegistry.getStatistics());
        console.log('  Biome Generator:', biomeGenerator.getStatistics());
        console.log('  Structure Generator:', structureGenerator.getStatistics());
        console.log('  World Feature Integration:', worldFeatureIntegration.getStatistics());
        console.log('  Sound System:', soundSystem.getStatistics());
        console.log('  Particle System:', particleSystem.getStatistics());
        
        console.log('Endless Dimensions Mod (Packet Interception) initialized successfully!');
        console.log('Packet Interception Statistics:', bookDataBridge.getStatistics());
        
    } catch (error) {
        console.error('Error during initialization:', error);
    }
});

/**
 * Set up book-based dimension generation events
 */
function setupBookDimensionEvents(): void {
    try {
        if (!bookDataBridge) {
            console.warn('BookDataBridge not available for event setup');
            return;
        }

        // Subscribe to book events for dimension generation
        bookDataBridge.subscribeToBookEvents((playerId: string, bookData: any, source: string) => {
            console.log(`Book detected for player ${playerId} from ${source}: "${bookData.title}"`);
            
            // Check if book contains dimension data
            const dimensionData = bookDataBridge.extractDimensionData(bookData);
            if (dimensionData && dimensionData.hasDimensionData) {
                console.log(`Dimension data found in book: "${bookData.title}" by ${bookData.author}`);
                
                // Generate dimension based on book content
                generateDimensionFromBook(playerId, bookData, dimensionData);
            }
        });

        console.log('Book dimension events set up successfully');
        
    } catch (error) {
        console.error('Error setting up book dimension events:', error);
    }
}

/**
 * Generate dimension from book content
 */
function generateDimensionFromBook(playerId: string, bookData: any, dimensionData: any): void {
    try {
        if (!dimensionGenerator) {
            console.error('DimensionGenerator not initialized');
            return;
        }

        // Combine all pages into text content
        const bookText = dimensionData.pages ? dimensionData.pages.join(' ') : '';
        
        if (!bookText.trim()) {
            console.warn('Book has no content for dimension generation');
            return;
        }

        console.log(`Generating dimension from book text: "${bookText.substring(0, 100)}${bookText.length > 100 ? '...' : ''}"`);

        // Generate dimension configuration
        const dimensionConfig = dimensionGenerator.generateDimension(bookText);
        
        // Generate enhanced features for dimension
        console.log('Generating enhanced features for dimension...');
        const seed = dimensionGenerator.hashEngine.getDimensionSeed(bookText);
        
        // Generate custom blocks
        const customBlockProfile = enhancedCustomBlockRegistry.generateDimensionBlocks(dimensionConfig, seed);
        
        // Generate biomes
        const biomeIds = biomeGenerator.generateBiomes(dimensionConfig, seed);
        
        // Generate structures
        const structureIds = structureGenerator.generateStructures(dimensionConfig, seed + 1000, biomeIds);
        
        // Integrate world features
        const worldConfig = await worldFeatureIntegration.integrateWorldFeatures(dimensionConfig, seed + 2000);
        
        // Generate sound profile
        const soundProfile = soundSystem.generateDimensionSounds(dimensionConfig, seed + 3000);
        
        // Generate particle profile
        const particleProfile = particleSystem.generateDimensionParticles(dimensionConfig, seed + 4000);
        
        console.log('Enhanced features generated successfully');
        
        // Register the dimension
        await dimensionGenerator.registerDimension(dimensionConfig);
        
        // Notify player
        if (api.server && api.server.executeCommand) {
            const message = `§6Dimension Created: §e${dimensionConfig.name}§6!§r\n§7Based on book "${bookData.title}" by ${bookData.author}\n§7Features: ${biomeIds.length} biomes, ${structureIds.length} structures, ${customBlockProfile.customBlocks.length} custom blocks`;
            api.server.executeCommand(`/tell ${playerId} ${message}`);
        }
        
        console.log(`Dimension "${dimensionConfig.name}" created for player ${playerId}`);
        
    } catch (error) {
        console.error('Error generating dimension from book:', error);
        
        // Notify player of error
        if (api.server && api.server.executeCommand) {
            const message = `§cFailed to create dimension from book. Please try again.`;
            api.server.executeCommand(`/tell ${playerId} ${message}`);
        }
    }
}

// Clean up on server shutdown
api.on('server.shutdown', () => {
    console.log('Endless Dimensions Mod (Packet Interception) shutting down...');
    
    if (portalHandler) {
        portalHandler.unregisterEvents();
    }
    
    if (bookDataBridge) {
        bookDataBridge.shutdown();
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
    
    console.log('Endless Dimensions Mod (Packet Interception) shutdown complete');
});

console.log('Endless Dimensions Mod (Packet Interception) loaded!');
