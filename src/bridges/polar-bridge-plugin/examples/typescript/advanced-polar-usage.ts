/**
 * Advanced Polar Bridge Plugin Usage Example
 * Demonstrates advanced features including conversion, batch operations, and error handling
 */

import { Logger } from '../../../src/utils/Logger';

export class AdvancedPolarExample {
    private logger: Logger;

    constructor() {
        this.logger = new Logger('AdvancedPolarExample');
    }

    /**
     * Demonstrate advanced Polar bridge plugin usage
     */
    public async demonstrateAdvancedUsage(): Promise<void> {
        this.logger.info('=== Advanced Polar Bridge Plugin Example ===');

        try {
            // Check if Polar bridge plugin is available
            if (typeof (globalThis as any).Polar === 'undefined') {
                this.logger.error('Polar bridge plugin not available!');
                return;
            }

            this.logger.info('✅ Polar bridge plugin detected!');

            // Example 1: Batch world loading
            await this.batchLoadWorlds();

            // Example 2: Anvil to Polar conversion
            await this.convertAnvilToPolar();

            // Example 3: Batch save operations
            await this.batchSaveWorlds();

            // Example 4: Memory management
            await this.memoryManagement();

            // Example 5: Error handling and recovery
            await this.errorHandling();

            // Example 6: Performance monitoring
            await this.performanceMonitoring();

            this.logger.info('✅ Advanced Polar bridge plugin example completed successfully!');

        } catch (error) {
            this.logger.error('❌ Advanced Polar example failed:', error);
        }
    }

    /**
     * Batch load multiple worlds
     */
    private async batchLoadWorlds(): Promise<void> {
        this.logger.info('--- Batch Loading Worlds ---');

        const worlds = [
            { id: 'lobby', file: 'lobby.polar' },
            { id: 'survival', file: 'survival.polar' },
            { id: 'creative', file: 'creative.polar' },
            { id: 'minigames', file: 'minigames.polar' }
        ];

        try {
            // Load all worlds concurrently
            const loadPromises = worlds.map(async world => {
                const result = await (globalThis as any).Polar.load(world.id, world.file);
                return { id: world.id, result };
            });

            const results = await Promise.all(loadPromises);

            // Process results
            let successCount = 0;
            let errorCount = 0;

            results.forEach(({ id, result }) => {
                if (result.isSuccess()) {
                    successCount++;
                    this.logger.info(`✅ Successfully loaded world: ${id}`);
                } else {
                    errorCount++;
                    this.logger.error(`❌ Failed to load world ${id}: ${result.getMessage()}`);
                }
            });

            this.logger.info(`📊 Batch load completed: ${successCount} successful, ${errorCount} failed`);

        } catch (error) {
            this.logger.error('❌ Error during batch loading:', error);
        }
    }

    /**
     * Convert Anvil world to Polar format
     */
    private async convertAnvilToPolar(): Promise<void> {
        this.logger.info('--- Converting Anvil to Polar ---');

        try {
            // Convert an existing Anvil world to Polar
            const result = await (globalThis as any).Polar.convertFromAnvil(
                'worlds/old_anvil_world',
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
                this.logger.error(`❌ Conversion failed: ${result.getMessage()}`);
            }

        } catch (error) {
            this.logger.error('❌ Error during conversion:', error);
        }
    }

    /**
     * Batch save all loaded worlds
     */
    private async batchSaveWorlds(): Promise<void> {
        this.logger.info('--- Batch Saving Worlds ---');

        try {
            // Save all loaded worlds
            const result = await (globalThis as any).Polar.saveAll();

            if (result.isSuccess()) {
                this.logger.info('✅ All worlds saved successfully');
            } else {
                this.logger.error(`❌ Batch save failed: ${result.getMessage()}`);
            }

        } catch (error) {
            this.logger.error('❌ Error during batch save:', error);
        }
    }

    /**
     * Memory management and monitoring
     */
    private async memoryManagement(): Promise<void> {
        this.logger.info('--- Memory Management ---');

        try {
            // Get current memory usage
            const memoryUsage = (globalThis as any).Polar.getMemoryUsage();
            this.logger.info(`💾 Current memory usage: ${memoryUsage}`);

            // Get loaded world count
            const worldCount = (globalThis as any).Polar.getLoadedWorldCount();
            this.logger.info(`🔢 Loaded worlds: ${worldCount}`);

            // If memory usage is high, unload some worlds
            if (worldCount > 5) {
                this.logger.warn('⚠ High memory usage detected, unloading some worlds...');
                
                const loadedDimensions = (globalThis as any).Polar.getLoadedDimensions();
                
                // Unload the last few worlds
                for (let i = Math.max(0, loadedDimensions.length - 2); i < loadedDimensions.length; i++) {
                    const dimensionId = loadedDimensions[i];
                    const success = (globalThis as any).Polar.unload(dimensionId);
                    
                    if (success) {
                        this.logger.info(`✅ Unloaded world: ${dimensionId}`);
                    } else {
                        this.logger.warn(`⚠ Failed to unload world: ${dimensionId}`);
                    }
                }

                // Check memory usage again
                const newMemoryUsage = (globalThis as any).Polar.getMemoryUsage();
                this.logger.info(`💾 New memory usage: ${newMemoryUsage}`);
            }

        } catch (error) {
            this.logger.error('❌ Error during memory management:', error);
        }
    }

    /**
     * Error handling and recovery
     */
    private async errorHandling(): Promise<void> {
        this.logger.info('--- Error Handling and Recovery ---');

        try {
            // Try to load a non-existent file
            const result = await (globalThis as any).Polar.load('nonexistent', 'missing.polar');
            
            if (result.isError()) {
                this.logger.info(`✅ Expected error caught: ${result.getMessage()}`);
                
                // Try to load with a fallback file
                const fallbackResult = await (globalThis as any).Polar.load('fallback', 'lobby.polar');
                
                if (fallbackResult.isSuccess()) {
                    this.logger.info('✅ Fallback world loaded successfully');
                }
            }

        } catch (error) {
            this.logger.error('❌ Unexpected error:', error);
        }
    }

    /**
     * Performance monitoring
     */
    private async performanceMonitoring(): Promise<void> {
        this.logger.info('--- Performance Monitoring ---');

        try {
            // Get initial statistics
            const initialStats = (globalThis as any).Polar.getStatistics();
            this.logger.info(`📈 Initial stats: ${initialStats}`);

            // Perform multiple operations
            const startTime = Date.now();

            for (let i = 0; i < 10; i++) {
                const testId = `test_world_${i}`;
                
                // Load world
                await (globalThis as any).Polar.load(testId, 'lobby.polar');
                
                // Get metadata
                (globalThis as any).Polar.getMetadata(testId);
                
                // Save world
                await (globalThis as any).Polar.save(testId);
                
                // Unload world
                (globalThis as any).Polar.unload(testId);
            }

            const endTime = Date.now();
            const duration = endTime - startTime;

            // Get final statistics
            const finalStats = (globalThis as any).Polar.getStatistics();
            this.logger.info(`📈 Final stats: ${finalStats}`);

            this.logger.info(`⏱️ Performance test completed in ${duration}ms`);
            this.logger.info(`📊 Average operation time: ${duration / 10}ms per world cycle`);

        } catch (error) {
            this.logger.error('❌ Error during performance monitoring:', error);
        }
    }

    /**
     * Demonstrate concurrent operations
     */
    public async demonstrateConcurrentOperations(): Promise<void> {
        this.logger.info('--- Concurrent Operations ---');

        try {
            // Create multiple concurrent operations
            const operations = [];

            // Concurrent loads
            for (let i = 0; i < 5; i++) {
                operations.push(
                    (globalThis as any).Polar.load(`concurrent_${i}`, 'lobby.polar')
                );
            }

            // Concurrent saves
            for (let i = 0; i < 3; i++) {
                operations.push(
                    (globalThis as any).Polar.save('lobby')
                );
            }

            // Wait for all operations to complete
            const results = await Promise.all(operations);

            // Count successful operations
            const successCount = results.filter(r => r.isSuccess()).length;
            const errorCount = results.filter(r => r.isError()).length;

            this.logger.info(`📊 Concurrent operations completed: ${successCount} successful, ${errorCount} failed`);

        } catch (error) {
            this.logger.error('❌ Error during concurrent operations:', error);
        }
    }
}

// Export for use in other modules
export default AdvancedPolarExample;
