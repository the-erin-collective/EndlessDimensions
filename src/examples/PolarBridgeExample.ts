/**
 * Polar Bridge Plugin Example for Endless Dimensions
 * Demonstrates how to use the Polar bridge plugin for world persistence
 */

import { Logger } from '../utils/Logger';

export class PolarBridgeExample {
    private logger: Logger;

    constructor() {
        this.logger = new Logger('PolarBridgeExample');
    }

    /**
     * Demonstrate Polar bridge plugin usage
     */
    public async demonstratePolarBridge(): Promise<void> {
        this.logger.info('=== Polar Bridge Plugin Example ===');

        try {
            // Check if Polar bridge plugin is available
            if (typeof (globalThis as any).Polar === 'undefined') {
                this.logger.error('Polar bridge plugin not available!');
                return;
            }

            this.logger.info('✅ Polar bridge plugin detected!');

            // Example 1: Load a lobby world
            await this.loadLobbyWorld();

            // Example 2: Load multiple worlds
            await this.loadMultipleWorlds();

            // Example 3: Convert Anvil world to Polar
            await this.convertAnvilWorld();

            // Example 4: Save all worlds
            await this.saveAllWorlds();

            // Example 5: Check statistics
            await this.checkStatistics();

            this.logger.info('✅ Polar bridge plugin example completed successfully!');

        } catch (error) {
            this.logger.error('❌ Polar bridge example failed:', error);
        }
    }

    /**
     * Load a lobby world
     */
    private async loadLobbyWorld(): Promise<void> {
        this.logger.info('--- Loading Lobby World ---');

        try {
            // Load lobby world
            const result = await (globalThis as any).Polar.load('lobby', 'lobby.polar');

            if (result.isSuccess()) {
                this.logger.info(`✅ Lobby world loaded: ${result.getData()}`);
                
                // Get metadata
                const metadata = (globalThis as any).Polar.getMetadata('lobby');
                if (metadata) {
                    this.logger.info(`📊 Lobby metadata: ${metadata.getFilePath()} (${metadata.getFileSizeFormatted()})`);
                }
            } else {
                this.logger.warn(`⚠ Lobby world load failed: ${result.getMessage()}`);
            }

        } catch (error) {
            this.logger.error('❌ Error loading lobby world:', error);
        }
    }

    /**
     * Load multiple worlds
     */
    private async loadMultipleWorlds(): Promise<void> {
        this.logger.info('--- Loading Multiple Worlds ---');

        const worlds = [
            { id: 'survival', file: 'survival.polar' },
            { id: 'creative', file: 'creative.polar' },
            { id: 'minigames', file: 'minigames.polar' }
        ];

        try {
            // Load worlds concurrently
            const loadPromises = worlds.map(async world => {
                const result = await (globalThis as any).Polar.load(world.id, world.file);
                return { id: world.id, success: result.isSuccess(), message: result.getMessage() };
            });

            const results = await Promise.all(loadPromises);

            results.forEach(({ id, success, message }) => {
                if (success) {
                    this.logger.info(`✅ World loaded: ${id}`);
                } else {
                    this.logger.warn(`⚠ World ${id} failed: ${message}`);
                }
            });

        } catch (error) {
            this.logger.error('❌ Error loading multiple worlds:', error);
        }
    }

    /**
     * Convert Anvil world to Polar
     */
    private async convertAnvilWorld(): Promise<void> {
        this.logger.info('--- Converting Anvil World ---');

        try {
            // Convert an existing Anvil world
            const result = await (globalThis as any).Polar.convertFromAnvil(
                'worlds/old_world',
                'worlds/converted_world.polar'
            );

            if (result.isSuccess()) {
                this.logger.info(`✅ Conversion completed: ${result.getData()}`);
                
                // Load the converted world
                const loadResult = await (globalThis as any).Polar.load('converted', 'converted_world.polar');
                if (loadResult.isSuccess()) {
                    this.logger.info('✅ Converted world loaded successfully');
                }
            } else {
                this.logger.warn(`⚠ Conversion failed: ${result.getMessage()}`);
            }

        } catch (error) {
            this.logger.error('❌ Error converting world:', error);
        }
    }

    /**
     * Save all loaded worlds
     */
    private async saveAllWorlds(): Promise<void> {
        this.logger.info('--- Saving All Worlds ---');

        try {
            // Save all loaded worlds
            const result = await (globalThis as any).Polar.saveAll();

            if (result.isSuccess()) {
                this.logger.info('✅ All worlds saved successfully');
            } else {
                this.logger.warn(`⚠ Batch save failed: ${result.getMessage()}`);
            }

        } catch (error) {
            this.logger.error('❌ Error saving worlds:', error);
        }
    }

    /**
     * Check statistics and memory usage
     */
    private async checkStatistics(): Promise<void> {
        this.logger.info('--- Checking Statistics ---');

        try {
            // Get registry statistics
            const stats = (globalThis as any).Polar.getStatistics();
            this.logger.info(`📈 Registry stats: ${stats}`);

            // Get memory usage
            const memoryUsage = (globalThis as any).Polar.getMemoryUsage();
            this.logger.info(`💾 Memory usage: ${memoryUsage}`);

            // Get loaded dimensions
            const loadedDimensions = (globalThis as any).Polar.getLoadedDimensions();
            this.logger.info(`📋 Loaded dimensions: ${loadedDimensions.join(', ')}`);

            // Get world count
            const worldCount = (globalThis as any).Polar.getLoadedWorldCount();
            this.logger.info(`🔢 Total worlds: ${worldCount}`);

        } catch (error) {
            this.logger.error('❌ Error checking statistics:', error);
        }
    }

    /**
     * Demonstrate world management
     */
    public async demonstrateWorldManagement(): Promise<void> {
        this.logger.info('--- World Management ---');

        try {
            // Check if lobby is loaded
            const isLobbyLoaded = (globalThis as any).Polar.isLoaded('lobby');
            this.logger.info(`🔍 Is lobby loaded? ${isLobbyLoaded}`);

            if (isLobbyLoaded) {
                // Save lobby
                const saveResult = await (globalThis as any).Polar.save('lobby');
                if (saveResult.isSuccess()) {
                    this.logger.info('✅ Lobby saved successfully');
                }

                // Unload lobby
                const unloadSuccess = (globalThis as any).Polar.unload('lobby');
                if (unloadSuccess) {
                    this.logger.info('✅ Lobby unloaded successfully');
                }
            }

        } catch (error) {
            this.logger.error('❌ Error in world management:', error);
        }
    }
}

// Export the demonstration function for easy access
export async function demonstratePolarBridge(): Promise<void> {
    const example = new PolarBridgeExample();
    await example.demonstratePolarBridge();
}

export default PolarBridgeExample;
