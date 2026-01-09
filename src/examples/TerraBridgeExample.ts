/**
 * Example demonstrating how to use the Terra Bridge Plugin
 * This replaces the need for direct Java interop with the clean TypeScript API
 */

import { Logger } from '../utils/Logger';

export class TerraBridgeExample {
    private logger: Logger;

    constructor() {
        this.logger = new Logger('TerraBridgeExample');
    }

    /**
     * Example of using Terra bridge plugin for world generation
     */
    public async demonstrateTerraBridge(): Promise<void> {
        this.logger.info('=== Terra Bridge Plugin Example ===');

        try {
            // Check if Terra bridge plugin is available
            if (typeof (globalThis as any).Terra === 'undefined') {
                this.logger.error('Terra bridge plugin not available!');
                return;
            }

            this.logger.info('✅ Terra bridge plugin detected!');

            // Example 1: Basic world generation with default pack
            await this.basicWorldGeneration();

            // Example 2: World generation with custom pack
            await this.customPackGeneration();

            // Example 3: Advanced configuration with entity factories
            await this.advancedWorldGeneration();

            // Example 4: Cache configuration
            await this.configureCache();

            // Example 5: Get statistics
            await this.getStatistics();

            this.logger.info('✅ Terra bridge plugin example completed successfully!');

        } catch (error) {
            this.logger.error('❌ Terra bridge example failed:', error);
        }
    }

    /**
     * Basic world generation using Terra bridge
     */
    private async basicWorldGeneration(): Promise<void> {
        this.logger.info('--- Basic World Generation ---');

        // Use Terra bridge plugin API
        const world = (globalThis as any).Terra.defaultPack()
            .seed(1234567890123456789n) // Use BigInt for large seeds
            .attach();

        this.logger.info(`✅ Basic world generated: ${world}`);
    }

    /**
     * World generation with custom pack
     */
    private async customPackGeneration(): Promise<void> {
        this.logger.info('--- Custom Pack Generation ---');

        try {
            // Use Terra bridge plugin to load custom pack
            const customWorld = (globalThis as any).Terra.packById('custom_realms')
                .seed(42n)
                .attach();

            this.logger.info(`✅ Custom pack world generated: ${customWorld}`);
        } catch (error) {
            this.logger.warn(`⚠ Custom pack not available, using default: ${error}`);
            
            // Fallback to default pack
            const fallbackWorld = (globalThis as any).Terra.defaultPack()
                .seed(42n)
                .attach();
            
            this.logger.info(`✅ Fallback world generated: ${fallbackWorld}`);
        }
    }

    /**
     * Advanced world generation with entity factories
     */
    private async advancedWorldGeneration(): Promise<void> {
        this.logger.info('--- Advanced World Generation ---');

        // Define entity factory function
        const entityFactory = (entityType: string, position: any) => {
            this.logger.debug(`🎮 Spawning entity: ${entityType} at position: ${JSON.stringify(position)}`);
            
            // Custom entity spawning logic
            return {
                type: entityType,
                health: 20,
                position,
                customData: 'spawned_via_terra_bridge'
            };
        };

        // Define block entity factory function
        const blockEntityFactory = (blockType: string, position: any) => {
            this.logger.debug(`🧱 Creating block entity: ${blockType} at position: ${JSON.stringify(position)}`);
            
            // Custom block entity logic
            return {
                type: blockType,
                position,
                inventory: [],
                customData: 'created_via_terra_bridge'
            };
        };

        // Create world with custom factories
        const advancedWorld = (globalThis as any).Terra.defaultPack()
            .seed(9876543210987654321n)
            .entityFactory(entityFactory)
            .blockEntityFactory(blockEntityFactory)
            .attach();

        this.logger.info(`✅ Advanced world generated: ${advancedWorld}`);
    }

    /**
     * Configure Terra cache settings
     */
    private async configureCache(): Promise<void> {
        this.logger.info('--- Cache Configuration ---');

        // Configure cache using Terra bridge plugin
        (globalThis as any).Terra.configureCache({
            maximumSize: 2048, // Larger cache for better performance
            expireAfterWrite: 15, // 15 minutes expiration
            recordStats: true // Enable statistics recording
        });

        this.logger.info('✅ Cache configured successfully');
    }

    /**
     * Get Terra statistics
     */
    private async getStatistics(): Promise<void> {
        this.logger.info('--- Terra Statistics ---');

        // Get statistics using Terra bridge plugin
        const stats = (globalThis as any).Terra.getStats();
        const cacheStats = (globalThis as any).getTerraCacheStats();

        this.logger.info(`📊 Terra Statistics: ${stats}`);
        this.logger.info(`🗄️ Cache Statistics: ${cacheStats}`);
    }

    /**
     * Demonstrate async chunk generation
     */
    public async demonstrateAsyncGeneration(): Promise<void> {
        this.logger.info('--- Async Chunk Generation ---');

        try {
            // Generate chunks asynchronously using Terra bridge plugin
            const chunkPromises = [];
            
            for (let x = 0; x < 3; x++) {
                for (let z = 0; z < 3; z++) {
                    const chunkPromise = (globalThis as any).Terra.defaultPack()
                        .seed(123456789n)
                        .attach()
                        .generateChunkAsync(x, z);
                    
                    chunkPromises.push(chunkPromise);
                }
            }

            // Wait for all chunks to generate
            const chunks = await Promise.all(chunkPromises);
            
            this.logger.info(`✅ Generated ${chunks.length} chunks asynchronously`);
            
            chunks.forEach((chunk, index) => {
                const [x, z] = [Math.floor(index / 3), index % 3];
                this.logger.debug(`  Chunk (${x}, ${z}): ${chunk}`);
            });

        } catch (error) {
            this.logger.error('❌ Async generation failed:', error);
        }
    }
}

// Export for use in other modules
export default TerraBridgeExample;

// Export the demonstration function for easy access
export async function demonstrateTerraBridge(): Promise<void> {
    const example = new TerraBridgeExample();
    await example.demonstrateTerraBridge();
}
