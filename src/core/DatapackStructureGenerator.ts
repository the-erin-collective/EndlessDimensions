/// <reference types="@epi-studio/moud-sdk" />
import { Logger } from '../utils/Logger';

/**
 * Datapack Structure Generator - Creates and manages Minecraft datapack folder hierarchy
 * Ensures proper structure for dimension registration and world generation
 */
export class DatapackStructureGenerator {
    private logger: Logger;
    private basePath: string;
    private namespace: string;
    private packFormat: number;

    constructor(basePath: string = 'world/datapacks/endless', namespace: string = 'endlessdimensions') {
        this.logger = new Logger('DatapackStructureGenerator');
        this.basePath = basePath;
        this.namespace = namespace;
        this.packFormat = 48; // Latest format for 1.21+
    }

    /**
     * Generate complete datapack structure
     */
    public async generateStructure(): Promise<boolean> {
        try {
            this.logger.info('Generating datapack structure...');
            
            // Create main directories
            await this.createMainDirectories();
            
            // Create pack.mcmeta
            await this.createPackMcmeta();
            
            // Create namespace directories
            await this.createNamespaceDirectories();
            
            // Create worldgen directories
            await this.createWorldgenDirectories();
            
            // Create dimension-specific directories
            await this.createDimensionDirectories();
            
            // Create example files for validation
            await this.createExampleFiles();
            
            this.logger.info('Datapack structure generated successfully');
            return true;
            
        } catch (error) {
            this.logger.error('Failed to generate datapack structure:', error);
            return false;
        }
    }

    /**
     * Create main datapack directories
     */
    private async createMainDirectories(): Promise<void> {
        const directories = [
            this.basePath,
            `${this.basePath}/data`
        ];

        for (const dir of directories) {
            await this.ensureDirectory(dir);
        }
        
        this.logger.debug('Main directories created');
    }

    /**
     * Create pack.mcmeta file
     */
    private async createPackMcmeta(): Promise<void> {
        const packMcmeta = {
            pack: {
                pack_format: this.packFormat,
                description: 'Endless Dimensions - Dynamic Dimension Generation',
                supported_formats: {
                    min_inclusive: this.packFormat,
                    max_inclusive: this.packFormat
                }
            }
        };

        const mcmetaPath = `${this.basePath}/pack.mcmeta`;
        await this.writeFile(mcmetaPath, JSON.stringify(packMcmeta, null, 2));
        
        this.logger.debug('pack.mcmeta created');
    }

    /**
     * Create namespace directories
     */
    private async createNamespaceDirectories(): Promise<void> {
        const namespaceDirs = [
            `${this.basePath}/data/${this.namespace}`,
            `${this.basePath}/data/${this.namespace}/dimension`,
            `${this.basePath}/data/${this.namespace}/dimension_type`,
            `${this.basePath}/data/${this.namespace}/worldgen`,
            `${this.basePath}/data/${this.namespace}/tags`,
            `${this.basePath}/data/${this.namespace}/tags/worldgen`,
            `${this.basePath}/data/${this.namespace}/tags/worldgen/biome`,
            `${this.basePath}/data/${this.namespace}/tags/worldgen/structure`,
            `${this.basePath}/data/${this.namespace}/tags/worldgen/feature`,
            `${this.basePath}/data/${this.namespace}/advancements`,
            `${this.basePath}/data/${this.namespace}/recipes`,
            `${this.basePath}/data/${this.namespace}/loot_tables`,
            `${this.basePath}/data/${this.namespace}/functions`
        ];

        for (const dir of namespaceDirs) {
            await this.ensureDirectory(dir);
        }
        
        this.logger.debug('Namespace directories created');
    }

    /**
     * Create worldgen directories
     */
    private async createWorldgenDirectories(): Promise<void> {
        const worldgenDirs = [
            `${this.basePath}/data/${this.namespace}/worldgen/biome`,
            `${this.basePath}/data/${this.namespace}/worldgen/configured_carver`,
            `${this.basePath}/data/${this.namespace}/worldgen/configured_feature`,
            `${this.basePath}/data/${this.namespace}/worldgen/density_function`,
            `${this.basePath}/data/${this.namespace}/worldgen/multi_noise_biome_source_parameter_list`,
            `${this.basePath}/data/${this.namespace}/worldgen/noise`,
            `${this.basePath}/data/${this.namespace}/worldgen/noise_settings`,
            `${this.basePath}/data/${this.namespace}/worldgen/placed_feature`,
            `${this.basePath}/data/${this.namespace}/worldgen/processor_list`,
            `${this.basePath}/data/${this.namespace}/worldgen/structure`,
            `${this.basePath}/data/${this.namespace}/worldgen/structure_set`,
            `${this.basePath}/data/${this.namespace}/worldgen/template_pool`,
            `${this.basePath}/data/${this.namespace}/worldgen/trivially_generated`
        ];

        for (const dir of worldgenDirs) {
            await this.ensureDirectory(dir);
        }
        
        this.logger.debug('Worldgen directories created');
    }

    /**
     * Create dimension-specific directories
     */
    private async createDimensionDirectories(): Promise<void> {
        const dimensionDirs = [
            `${this.basePath}/data/${this.namespace}/dimension`,
            `${this.basePath}/data/${this.namespace}/dimension_type`
        ];

        for (const dir of dimensionDirs) {
            await this.ensureDirectory(dir);
        }
        
        this.logger.debug('Dimension directories created');
    }

    /**
     * Create example files for validation
     */
    private async createExampleFiles(): Promise<void> {
        // Create example dimension
        const exampleDimension = {
            type: `${this.namespace}:example`,
            generator: {
                type: 'minecraft:noise',
                settings: {
                    biome: 'minecraft:plains',
                    sea_level: 63,
                    disable_mob_generation: false,
                    aquifers_enabled: true,
                    ore_veins_enabled: true,
                    legacy_random_source: false,
                    noise: 'minecraft:overworld'
                }
            }
        };

        const dimensionPath = `${this.basePath}/data/${this.namespace}/dimension/example.json`;
        await this.writeFile(dimensionPath, JSON.stringify(exampleDimension, null, 2));

        // Create example dimension type
        const exampleDimensionType = {
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
            logical_height: 256,
            infiniburn: '#minecraft:infiniburn_overworld',
            effects: 'minecraft:overworld',
            min_y: -64,
            height: 384
        };

        const dimensionTypePath = `${this.basePath}/data/${this.namespace}/dimension_type/example.json`;
        await this.writeFile(dimensionTypePath, JSON.stringify(exampleDimensionType, null, 2));

        // Create example biome
        const exampleBiome = {
            effects: {
                sky_color: 7907327,
                fog_color: 12638463,
                water_color: 4159204,
                water_fog_color: 329011,
                grass_color: 8771793,
                foliage_color: 8771793
            },
            precipitation: 'rain',
            temperature: 0.8,
            downfall: 0.4,
            has_precipitation: true,
            temperature_modifier: 'none'
        };

        const biomePath = `${this.basePath}/data/${this.namespace}/worldgen/biome/example.json`;
        await this.writeFile(biomePath, JSON.stringify(exampleBiome, null, 2));

        this.logger.debug('Example files created');
    }

    /**
     * Validate datapack structure
     */
    public async validateStructure(): Promise<boolean> {
        try {
            const requiredPaths = [
                `${this.basePath}/pack.mcmeta`,
                `${this.basePath}/data/${this.namespace}`,
                `${this.basePath}/data/${this.namespace}/dimension`,
                `${this.basePath}/data/${this.namespace}/worldgen`
            ];

            for (const path of requiredPaths) {
                if (!await this.pathExists(path)) {
                    this.logger.error(`Missing required path: ${path}`);
                    return false;
                }
            }

            // Validate pack.mcmeta format
            const mcmetaPath = `${this.basePath}/pack.mcmeta`;
            const mcmetaContent = await this.readFile(mcmetaPath);
            const mcmeta = JSON.parse(mcmetaContent);
            
            if (mcmeta.pack?.pack_format !== this.packFormat) {
                this.logger.error(`Invalid pack format in pack.mcmeta`);
                return false;
            }

            this.logger.info('Datapack structure validation passed');
            return true;
            
        } catch (error) {
            this.logger.error('Datapack structure validation failed:', error);
            return false;
        }
    }

    /**
     * Clean up old dimension files
     */
    public async cleanupOldDimensions(activeDimensions: Set<string>): Promise<void> {
        try {
            const dimensionDir = `${this.basePath}/data/${this.namespace}/dimension`;
            const files = await this.listDirectory(dimensionDir);
            
            for (const file of files) {
                if (file.endsWith('.json')) {
                    const dimensionId = file.replace('.json', '');
                    
                    if (!activeDimensions.has(dimensionId)) {
                        const filePath = `${dimensionDir}/${file}`;
                        await this.removeFile(filePath);
                        this.logger.info(`Cleaned up old dimension: ${dimensionId}`);
                    }
                }
            }
            
        } catch (error) {
            this.logger.error('Failed to cleanup old dimensions:', error);
        }
    }

    /**
     * Get datapack statistics
     */
    public async getStatistics(): Promise<any> {
        try {
            const stats = {
                basePath: this.basePath,
                namespace: this.namespace,
                packFormat: this.packFormat,
                directoryCount: 0,
                fileCount: 0,
                dimensionCount: 0,
                biomeCount: 0,
                structureCount: 0
            };

            // Count directories and files
            const allPaths = await this.listDirectoryRecursive(this.basePath);
            
            for (const path of allPaths) {
                if (path.endsWith('/')) {
                    stats.directoryCount++;
                } else {
                    stats.fileCount++;
                    
                    if (path.includes('/dimension/')) {
                        stats.dimensionCount++;
                    } else if (path.includes('/worldgen/biome/')) {
                        stats.biomeCount++;
                    } else if (path.includes('/worldgen/structure/')) {
                        stats.structureCount++;
                    }
                }
            }

            return stats;
            
        } catch (error) {
            this.logger.error('Failed to get datapack statistics:', error);
            return null;
        }
    }

    /**
     * Ensure directory exists
     */
    private async ensureDirectory(path: string): Promise<void> {
        try {
            // Note: This would need to be implemented based on Moud SDK's filesystem API
            this.logger.debug(`Ensuring directory exists: ${path}`);
            
            // Placeholder for directory creation
            // api.internal.fs.ensureDirectory(path);
            
        } catch (error) {
            this.logger.error(`Failed to ensure directory: ${path}`, error);
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
     * Read file from filesystem
     */
    private async readFile(path: string): Promise<string> {
        try {
            // Note: This would need to be implemented based on Moud SDK's filesystem API
            this.logger.debug(`Reading file: ${path}`);
            
            // Placeholder for file reading
            // return api.internal.fs.readFile(path);
            return '{}'; // Placeholder
            
        } catch (error) {
            this.logger.error(`Failed to read file: ${path}`, error);
            throw error;
        }
    }

    /**
     * Check if path exists
     */
    private async pathExists(path: string): Promise<boolean> {
        try {
            // Note: This would need to be implemented based on Moud SDK's filesystem API
            // return api.internal.fs.pathExists(path);
            return true; // Placeholder
            
        } catch (error) {
            return false;
        }
    }

    /**
     * List directory contents
     */
    private async listDirectory(path: string): Promise<string[]> {
        try {
            // Note: This would need to be implemented based on Moud SDK's filesystem API
            // return api.internal.fs.listDirectory(path);
            return []; // Placeholder
            
        } catch (error) {
            this.logger.error(`Failed to list directory: ${path}`, error);
            return [];
        }
    }

    /**
     * List directory recursively
     */
    private async listDirectoryRecursive(path: string): Promise<string[]> {
        try {
            const results: string[] = [];
            const items = await this.listDirectory(path);
            
            for (const item of items) {
                const itemPath = `${path}/${item}`;
                results.push(itemPath);
                
                // Recursively list subdirectories
                if (item.endsWith('/')) {
                    const subItems = await this.listDirectoryRecursive(itemPath);
                    results.push(...subItems);
                }
            }
            
            return results;
            
        } catch (error) {
            this.logger.error(`Failed to list directory recursively: ${path}`, error);
            return [];
        }
    }

    /**
     * Remove file
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
     * Update pack format for new Minecraft version
     */
    public updatePackFormat(newFormat: number): void {
        this.packFormat = newFormat;
        this.logger.info(`Updated pack format to: ${newFormat}`);
    }

    /**
     * Get namespace
     */
    public getNamespace(): string {
        return this.namespace;
    }

    /**
     * Get base path
     */
    public getBasePath(): string {
        return this.basePath;
    }
}

// Singleton instance for global access
let globalDatapackStructureGenerator: DatapackStructureGenerator | null = null;

/**
 * Get global datapack structure generator instance
 */
export function getDatapackStructureGenerator(): DatapackStructureGenerator {
    if (!globalDatapackStructureGenerator) {
        globalDatapackStructureGenerator = new DatapackStructureGenerator();
    }
    return globalDatapackStructureGenerator;
}
