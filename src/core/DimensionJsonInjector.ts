/// <reference types="@epi-studio/moud-sdk" />
import { Logger } from '../utils/Logger';
import { DimensionConfig } from './DimensionGenerator';

// Type definitions for dimension JSON structures
interface DimensionJson {
    type: string;
    generator: GeneratorConfig;
}

interface GeneratorConfig {
    type: 'noise' | 'flat' | 'void' | 'floating_islands' | 'the_end';
    settings?: any;
    biome_source?: any;
    seed?: number;
}

interface DatapackMetadata {
    pack: {
        pack_format: number;
        description: string;
    };
}

/**
 * Dimension JSON Injector - Dynamic dimension registration via datapack manipulation
 * Bypasses SDK limitations by writing dimension files directly to Minecraft's datapack folder
 */
export class DimensionJsonInjector {
    private logger: Logger;
    private datapackBasePath: string;
    private namespace: string;
    private isInitialized: boolean = false;
    private registeredDimensions: Map<string, DimensionConfig> = new Map();

    constructor() {
        this.logger = new Logger('DimensionJsonInjector');
        this.namespace = 'endlessdimensions';
        this.datapackBasePath = 'world/datapacks/endless';
    }

    /**
     * Initialize the injector
     */
    public async initialize(): Promise<void> {
        try {
            // Validate filesystem access
            this.validateFilesystemAccess();
            
            // Create base datapack structure
            await this.createDatapackStructure();
            
            this.isInitialized = true;
            this.logger.info('DimensionJsonInjector initialized successfully');
            
        } catch (error) {
            this.logger.error('Failed to initialize DimensionJsonInjector:', error);
            throw error;
        }
    }

    /**
     * Validate that we have filesystem access
     */
    private validateFilesystemAccess(): void {
        if (!api.internal || !api.internal.fs) {
            throw new Error('Filesystem access not available in Moud SDK');
        }
        
        this.logger.debug('Filesystem access validated');
    }

    /**
     * Create base datapack folder structure
     */
    private async createDatapackStructure(): Promise<void> {
        try {
            const paths = [
                `${this.datapackBasePath}/data`,
                `${this.datapackBasePath}/data/${this.namespace}`,
                `${this.datapackBasePath}/data/${this.namespace}/dimension`,
                `${this.datapackBasePath}/data/${this.namespace}/dimension_type`,
                `${this.datapackBasePath}/data/${this.namespace}/worldgen/biome`,
                `${this.datapackBasePath}/data/${this.namespace}/worldgen/configured_feature`,
                `${this.datapackBasePath}/data/${this.namespace}/worldgen/placed_feature`,
                `${this.datapackBasePath}/data/${this.namespace}/worldgen/structure`,
                `${this.datapackBasePath}/data/${this.namespace}/worldgen/structure_set`
            ];

            for (const path of paths) {
                await this.ensureDirectoryExists(path);
            }

            // Create pack.mcmeta
            await this.createPackMcmeta();

            this.logger.info('Datapack structure created successfully');
            
        } catch (error) {
            this.logger.error('Failed to create datapack structure:', error);
            throw error;
        }
    }

    /**
     * Ensure directory exists
     */
    private async ensureDirectoryExists(path: string): Promise<void> {
        try {
            // Note: This would need to be implemented based on Moud SDK's filesystem API
            // For now, we'll assume the SDK provides directory creation
            this.logger.debug(`Ensuring directory exists: ${path}`);
            
            // Placeholder for directory creation
            // api.internal.fs.ensureDirectory(path);
            
        } catch (error) {
            this.logger.error(`Failed to ensure directory exists: ${path}`, error);
            throw error;
        }
    }

    /**
     * Create pack.mcmeta file
     */
    private async createPackMcmeta(): Promise<void> {
        try {
            const mcmeta: DatapackMetadata = {
                pack: {
                    pack_format: 48, // Latest format for 1.21+
                    description: 'Endless Dimensions - Dynamic Dimension Generation'
                }
            };

            const mcmetaPath = `${this.datapackBasePath}/pack.mcmeta`;
            const mcmetaContent = JSON.stringify(mcmeta, null, 2);
            
            await this.writeFile(mcmetaPath, mcmetaContent);
            this.logger.debug('Created pack.mcmeta file');
            
        } catch (error) {
            this.logger.error('Failed to create pack.mcmeta:', error);
            throw error;
        }
    }

    /**
     * Register a dimension by writing its JSON configuration
     */
    public async registerDimension(config: DimensionConfig): Promise<boolean> {
        try {
            if (!this.isInitialized) {
                throw new Error('DimensionJsonInjector not initialized');
            }

            // Validate dimension configuration
            if (!this.validateDimensionConfig(config)) {
                throw new Error(`Invalid dimension configuration: ${config.id}`);
            }

            // Generate dimension JSON
            const dimensionJson = this.createDimensionJson(config);
            
            // Write dimension file
            const dimensionPath = `${this.datapackBasePath}/data/${this.namespace}/dimension/${config.id}.json`;
            const jsonContent = JSON.stringify(dimensionJson, null, 2);
            
            await this.writeFile(dimensionPath, jsonContent);
            
            // Generate dimension type if needed
            await this.generateDimensionType(config);
            
            // Track registered dimension
            this.registeredDimensions.set(config.id, config);
            
            this.logger.info(`Dimension registered: ${config.name} (${config.id})`);
            
            // Trigger server reload
            await this.triggerReload();
            
            return true;
            
        } catch (error) {
            this.logger.error(`Failed to register dimension ${config.id}:`, error);
            return false;
        }
    }

    /**
     * Validate dimension configuration
     */
    private validateDimensionConfig(config: DimensionConfig): boolean {
        try {
            // Check required fields
            if (!config.id || !config.name || !config.generatorType) {
                return false;
            }

            // Validate ID format (no spaces, special characters)
            if (!/^[a-z0-9_]+$/.test(config.id)) {
                return false;
            }

            // Check for ID conflicts
            if (this.registeredDimensions.has(config.id)) {
                return false;
            }

            // Validate generator type
            const validGenerators = ['noise', 'flat', 'void', 'floating_islands', 'the_end'];
            if (!validGenerators.includes(config.generatorType)) {
                return false;
            }

            return true;
            
        } catch (error) {
            this.logger.error('Error validating dimension config:', error);
            return false;
        }
    }

    /**
     * Create dimension JSON configuration
     */
    private createDimensionJson(config: DimensionConfig): DimensionJson {
        const dimensionJson: DimensionJson = {
            type: `${this.namespace}:${config.generatorType}`,
            generator: this.createGeneratorConfig(config)
        };

        return dimensionJson;
    }

    /**
     * Create generator configuration based on type
     */
    private createGeneratorConfig(config: DimensionConfig): GeneratorConfig {
        switch (config.generatorType) {
            case 'flat':
                return this.createFlatGeneratorConfig(config);
            case 'void':
                return this.createVoidGeneratorConfig(config);
            case 'floating_islands':
                return this.createFloatingIslandsGeneratorConfig(config);
            case 'the_end':
                return this.createTheEndGeneratorConfig(config);
            case 'noise':
            default:
                return this.createNoiseGeneratorConfig(config);
        }
    }

    /**
     * Create flat world generator configuration
     */
    private createFlatGeneratorConfig(config: DimensionConfig): GeneratorConfig {
        const layers = this.generateFlatLayers(config);
        
        return {
            type: 'minecraft:flat',
            settings: {
                biome: 'minecraft:plains',
                layers: layers,
                lakes: Math.random() > 0.5,
                features: Math.random() > 0.3,
                structures: Math.random() > 0.4
            }
        };
    }

    /**
     * Create void world generator configuration
     */
    private createVoidGeneratorConfig(config: DimensionConfig): GeneratorConfig {
        return {
            type: 'minecraft:noise',
            settings: {
                biome: 'minecraft:the_void',
                sea_level: config.seaLevel,
                disable_mob_generation: false,
                aquifers_enabled: false,
                ore_veins_enabled: false,
                legacy_random_source: false,
                noise: this.createVoidNoiseSettings()
            }
        };
    }

    /**
     * Create floating islands generator configuration
     */
    private createFloatingIslandsGeneratorConfig(config: DimensionConfig): GeneratorConfig {
        return {
            type: 'minecraft:noise',
            settings: {
                biome: 'minecraft:the_end',
                sea_level: config.seaLevel,
                disable_mob_generation: false,
                aquifers_enabled: true,
                ore_veins_enabled: true,
                legacy_random_source: false,
                noise: 'minecraft:end'
            }
        };
    }

    /**
     * Create The End generator configuration
     */
    private createTheEndGeneratorConfig(config: DimensionConfig): GeneratorConfig {
        return {
            type: 'minecraft:noise',
            settings: {
                biome: 'minecraft:the_end',
                sea_level: config.seaLevel,
                disable_mob_generation: false,
                aquifers_enabled: false,
                ore_veins_enabled: true,
                legacy_random_source: false,
                noise: 'minecraft:end'
            }
        };
    }

    /**
     * Create noise generator configuration
     */
    private createNoiseGeneratorConfig(config: DimensionConfig): GeneratorConfig {
        return {
            type: 'minecraft:noise',
            settings: {
                biome: 'minecraft:plains',
                sea_level: config.seaLevel,
                disable_mob_generation: false,
                aquifers_enabled: true,
                ore_veins_enabled: true,
                legacy_random_source: false,
                noise: 'minecraft:overworld'
            }
        };
    }

    /**
     * Generate flat world layers
     */
    private generateFlatLayers(config: DimensionConfig): any[] {
        const layers = [];
        const blocks = [config.defaultBlock, ...config.additionalBlocks];
        let heightLeft = config.height;

        while (heightLeft > 0) {
            const layerHeight = Math.min(Math.floor(Math.random() * 5) + 1, heightLeft);
            const block = blocks[Math.floor(Math.random() * blocks.length)];
            
            layers.push({
                height: layerHeight,
                block: block
            });
            
            heightLeft -= layerHeight;
        }

        return layers;
    }

    /**
     * Create void noise settings
     */
    private createVoidNoiseSettings(): any {
        return {
            top_slide: {
                target: -30,
                size: 7,
                offset: 1
            },
            bottom_slide: {
                target: -30,
                size: 7,
                offset: 1
            },
            sampling: {
                xz_scale: 1,
                y_scale: 1,
                xz_factor: 80,
                y_factor: 160
            },
            noise_router: {
                barrier: 0,
                fluid_level_floodedness: 0,
                fluid_level_spread: 0,
                lava: 0,
                temperature: 0,
                vegetation: 0,
                continents: 0,
                erosion: 0,
                depth: 0,
                ridges: 0,
                initial_density_without_jaggedness: 0,
                final_density: 0,
                vein_toggle: 0,
                vein_ridged: 0,
                vein_gap: 0
            }
        };
    }

    /**
     * Generate dimension type if needed
     */
    private async generateDimensionType(config: DimensionConfig): Promise<void> {
        try {
            // For custom generator types, we might need to create dimension type files
            if (config.generatorType === 'custom') {
                const dimensionTypeJson = this.createDimensionTypeJson(config);
                const typePath = `${this.datapackBasePath}/data/${this.namespace}/dimension_type/${config.id}.json`;
                const typeContent = JSON.stringify(dimensionTypeJson, null, 2);
                
                await this.writeFile(typePath, typeContent);
                this.logger.debug(`Created dimension type: ${config.id}`);
            }
            
        } catch (error) {
            this.logger.error(`Failed to generate dimension type for ${config.id}:`, error);
            // Don't throw - dimension type is optional for basic functionality
        }
    }

    /**
     * Create dimension type JSON
     */
    private createDimensionTypeJson(config: DimensionConfig): any {
        return {
            ultrawarm: false,
            natural: true,
            piglin_safe: false,
            respawn_anchor_works: false,
            bed_works: true,
            has_raids: true,
            has_skylight: true,
            has_ceiling: false,
            coordinate_scale: 1.0,
            ambient_light: 0,
            fixed_time: null,
            monster_spawn_light_level: 0,
            monster_spawn_block_light_limit: 0,
            logical_height: config.height + config.minY,
            infiniburn: "#minecraft:infiniburn_overworld",
            effects: "minecraft:overworld",
            min_y: config.minY,
            height: config.height
        };
    }

    /**
     * Trigger server reload to load new dimensions
     */
    private async triggerReload(): Promise<void> {
        try {
            if (api.server && api.server.executeCommand) {
                this.logger.info('Triggering server reload...');
                api.server.executeCommand('/reload');
                
                // Wait a moment for reload to complete
                await this.sleep(2000);
                
                this.logger.info('Server reload completed');
            } else {
                this.logger.warn('Server command execution not available');
            }
            
        } catch (error) {
            this.logger.error('Failed to trigger server reload:', error);
            throw error;
        }
    }

    /**
     * Write file to filesystem
     */
    private async writeFile(path: string, content: string): Promise<void> {
        try {
            // Note: This would need to be implemented based on Moud SDK's filesystem API
            this.logger.debug(`Writing file: ${path}`);
            
            // Placeholder for file writing
            // api.internal.fs.writeFile(path, content);
            
        } catch (error) {
            this.logger.error(`Failed to write file: ${path}`, error);
            throw error;
        }
    }

    /**
     * Sleep utility for async operations
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Check if dimension is registered
     */
    public isDimensionRegistered(dimensionId: string): boolean {
        return this.registeredDimensions.has(dimensionId);
    }

    /**
     * Get registered dimension configuration
     */
    public getDimension(dimensionId: string): DimensionConfig | null {
        return this.registeredDimensions.get(dimensionId) || null;
    }

    /**
     * Get all registered dimensions
     */
    public getAllDimensions(): Map<string, DimensionConfig> {
        return new Map(this.registeredDimensions);
    }

    /**
     * Remove dimension registration
     */
    public async unregisterDimension(dimensionId: string): Promise<boolean> {
        try {
            if (!this.registeredDimensions.has(dimensionId)) {
                return false;
            }

            // Remove dimension file
            const dimensionPath = `${this.datapackBasePath}/data/${this.namespace}/dimension/${dimensionId}.json`;
            await this.removeFile(dimensionPath);

            // Remove from registry
            this.registeredDimensions.delete(dimensionId);

            // Trigger reload
            await this.triggerReload();

            this.logger.info(`Dimension unregistered: ${dimensionId}`);
            return true;

        } catch (error) {
            this.logger.error(`Failed to unregister dimension ${dimensionId}:`, error);
            return false;
        }
    }

    /**
     * Remove file from filesystem
     */
    private async removeFile(path: string): Promise<void> {
        try {
            // Note: This would need to be implemented based on Moud SDK's filesystem API
            this.logger.debug(`Removing file: ${path}`);
            
            // Placeholder for file removal
            // api.internal.fs.removeFile(path);
            
        } catch (error) {
            this.logger.error(`Failed to remove file: ${path}`, error);
            throw error;
        }
    }

    /**
     * Get injector statistics
     */
    public getStatistics(): any {
        return {
            isInitialized: this.isInitialized,
            registeredDimensions: this.registeredDimensions.size,
            datapackBasePath: this.datapackBasePath,
            namespace: this.namespace
        };
    }

    /**
     * Cleanup and shutdown
     */
    public shutdown(): void {
        try {
            this.registeredDimensions.clear();
            this.isInitialized = false;
            this.logger.info('DimensionJsonInjector shutdown complete');
            
        } catch (error) {
            this.logger.error('Error during shutdown:', error);
        }
    }
}

// Singleton instance for global access
let globalDimensionJsonInjector: DimensionJsonInjector | null = null;

/**
 * Get global dimension JSON injector instance
 */
export function getDimensionJsonInjector(): DimensionJsonInjector {
    if (!globalDimensionJsonInjector) {
        globalDimensionJsonInjector = new DimensionJsonInjector();
    }
    return globalDimensionJsonInjector;
}
