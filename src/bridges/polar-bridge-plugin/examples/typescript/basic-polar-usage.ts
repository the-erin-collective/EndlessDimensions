/**
 * Basic Polar Bridge Plugin Usage Example
 * Demonstrates fundamental Polar world loading and saving operations
 */

import { Logger } from '../../../src/utils/Logger';

export class BasicPolarExample {
    private logger: Logger;

    constructor() {
        this.logger = new Logger('BasicPolarExample');
    }

    /**
     * Demonstrate basic Polar bridge plugin usage
     */
    public async demonstrateBasicUsage(): Promise<void> {
        this.logger.info('=== Basic Polar Bridge Plugin Example ===');

        try {
            // Check if Polar bridge plugin is available
            if (typeof (globalThis as any).Polar === 'undefined') {
                this.logger.error('Polar bridge plugin not available!');
                return;
            }

            this.logger.info('✅ Polar bridge plugin detected!');

            // Example 1: Load a Polar world
            await this.loadPolarWorld();

            // Example 2: Check loaded worlds
            await this.checkLoadedWorlds();

            // Example 3: Save a world
            await this.saveWorld();

            // Example 4: Get world metadata
            await this.getWorldMetadata();

            // Example 5: Unload a world
            await this.unloadWorld();

            this.logger.info('✅ Basic Polar bridge plugin example completed successfully!');

        } catch (error) {
            this.logger.error('❌ Basic Polar example failed:', error);
        }
    }

    /**
     * Load a Polar world
     */
    private async loadPolarWorld(): Promise<void> {
        this.logger.info('--- Loading Polar World ---');

        try {
            // Load a Polar world file
            const result = await (globalThis as any).Polar.load('lobby', 'lobby.polar');

            if (result.isSuccess()) {
                this.logger.info(`✅ World loaded successfully: ${result.getData()}`);
            } else {
                this.logger.error(`❌ Failed to load world: ${result.getMessage()}`);
            }

        } catch (error) {
            this.logger.error('❌ Error loading world:', error);
        }
    }

    /**
     * Check loaded worlds
     */
    private async checkLoadedWorlds(): Promise<void> {
        this.logger.info('--- Checking Loaded Worlds ---');

        try {
            // Get all loaded dimensions
            const loadedDimensions = (globalThis as any).Polar.getLoadedDimensions();
            this.logger.info(`📋 Loaded dimensions: ${loadedDimensions.join(', ')}`);

            // Get loaded world count
            const worldCount = (globalThis as any).Polar.getLoadedWorldCount();
            this.logger.info(`🔢 Total loaded worlds: ${worldCount}`);

            // Check if specific world is loaded
            const isLobbyLoaded = (globalThis as any).Polar.isLoaded('lobby');
            this.logger.info(`🔍 Is lobby loaded? ${isLobbyLoaded}`);

        } catch (error) {
            this.logger.error('❌ Error checking loaded worlds:', error);
        }
    }

    /**
     * Save a world
     */
    private async saveWorld(): Promise<void> {
        this.logger.info('--- Saving World ---');

        try {
            // Save the lobby world
            const result = await (globalThis as any).Polar.save('lobby');

            if (result.isSuccess()) {
                this.logger.info(`✅ World saved successfully: ${result.getData()}`);
            } else {
                this.logger.error(`❌ Failed to save world: ${result.getMessage()}`);
            }

        } catch (error) {
            this.logger.error('❌ Error saving world:', error);
        }
    }

    /**
     * Get world metadata
     */
    private async getWorldMetadata(): Promise<void> {
        this.logger.info('--- Getting World Metadata ---');

        try {
            // Get metadata for the lobby world
            const metadata = (globalThis as any).Polar.getMetadata('lobby');

            if (metadata) {
                this.logger.info('📊 Lobby world metadata:');
                this.logger.info(`  Dimension ID: ${metadata.getDimensionId()}`);
                this.logger.info(`  File Path: ${metadata.getFilePath()}`);
                this.logger.info(`  File Size: ${metadata.getFileSizeFormatted()}`);
                this.logger.info(`  Load Time: ${metadata.getLoadTimeFormatted()}`);
            } else {
                this.logger.warn('⚠ No metadata found for lobby world');
            }

        } catch (error) {
            this.logger.error('❌ Error getting world metadata:', error);
        }
    }

    /**
     * Unload a world
     */
    private async unloadWorld(): Promise<void> {
        this.logger.info('--- Unloading World ---');

        try {
            // Unload the lobby world
            const success = (globalThis as any).Polar.unload('lobby');

            if (success) {
                this.logger.info('✅ World unloaded successfully');
            } else {
                this.logger.warn('⚠ World was not loaded or failed to unload');
            }

        } catch (error) {
            this.logger.error('❌ Error unloading world:', error);
        }
    }

    /**
     * Get Polar statistics
     */
    public async getStatistics(): Promise<void> {
        this.logger.info('--- Polar Statistics ---');

        try {
            // Get registry statistics
            const stats = (globalThis as any).Polar.getStatistics();
            this.logger.info(`📈 Registry Statistics: ${stats}`);

            // Get memory usage
            const memoryUsage = (globalThis as any).Polar.getMemoryUsage();
            this.logger.info(`💾 Memory Usage: ${memoryUsage}`);

        } catch (error) {
            this.logger.error('❌ Error getting statistics:', error);
        }
    }
}

// Export for use in other modules
export default BasicPolarExample;
