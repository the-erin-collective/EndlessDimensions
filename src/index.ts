import { Mod } from 'moud';
import { DimensionGenerator } from './core/DimensionGenerator';
import { HashEngine } from './core/HashEngine';
import { BlockRegistry } from './core/BlockRegistry';
import { PortalHandler } from './events/PortalHandler';

export class EndlessDimensionsMod extends Mod {
    private dimensionGenerator: DimensionGenerator;
    private hashEngine: HashEngine;
    private blockRegistry: BlockRegistry;
    private portalHandler: PortalHandler;

    onInitialize() {
        this.logger.info('Initializing Endless Dimensions Mod...');
        
        // Initialize core systems
        this.hashEngine = new HashEngine();
        this.blockRegistry = new BlockRegistry(this.minecraft);
        this.dimensionGenerator = new DimensionGenerator(this.minecraft, this.hashEngine, this.blockRegistry);
        this.portalHandler = new PortalHandler(this.minecraft, this.dimensionGenerator, this.hashEngine);
        
        // Register event handlers
        this.portalHandler.registerEvents();
        
        this.logger.info('Endless Dimensions Mod initialized successfully!');
    }

    onShutdown() {
        this.logger.info('Endless Dimensions Mod shutting down...');
    }
}

// Export the mod class for Moud
export default EndlessDimensionsMod;
