/// <reference types="@epi-studio/moud-sdk" />
import { Logger } from '../utils/Logger';
import { BiomeJsonCompiler, CompiledDimensionJson } from './BiomeJsonCompiler';
import * as path from 'path';

export interface InjectedDimension {
    id: string;
    name: string;
    filePath: string;
    biomeFiles: string[];
    createdAt: string;
    jsonConfig: CompiledDimensionJson;
}

export class DynamicRegistryInjector {
    private api: MoudAPI;
    private logger: Logger;
    private biomeCompiler: BiomeJsonCompiler;
    private datapackPath: string;
    private injectedDimensions: Map<string, InjectedDimension>;

    constructor(api: MoudAPI) {
        this.api = api;
        this.logger = new Logger('DynamicRegistryInjector');
        this.biomeCompiler = new BiomeJsonCompiler();
        this.injectedDimensions = new Map();
        this.datapackPath = path.join(process.cwd(), 'world', 'datapacks', 'endless');
        // IMPORTANT: Do NOT call ensureDatapackStructure() here - wait for initialize()
        this.logger.info('DynamicRegistryInjector constructor completed - datapack structure will be created when needed');
    }

    /**
     * Initialize the injector (call this when Moud API is ready)
     */
    public async initialize(): Promise<void> {
        this.logger.info('Initializing DynamicRegistryInjector...');
        await this.ensureDatapackStructure();
        this.logger.info('DynamicRegistryInjector initialized successfully');
    }

    /**
     * Ensure the datapack folder structure exists
     */
    private async ensureDatapackStructure(): Promise<void> {
        try {
            const folders = [
                this.datapackPath,
                path.join(this.datapackPath, 'data', 'endless', 'dimension'),
                path.join(this.datapackPath, 'data', 'endless', 'worldgen', 'biome'),
                path.join(this.datapackPath, 'data', 'endless', 'worldgen', 'configured_feature'),
                path.join(this.datapackPath, 'data', 'endless', 'worldgen', 'placed_feature')
            ];

            // Wait for Moud API to be available
            await this.waitForMoudApi();

            for (const folder of folders) {
                try {
                    if (!(await this.fileExists(folder))) {
                        await this.api.internal.fs.mkdir(folder, { recursive: true });
                        this.logger.debug(`Created folder: ${folder}`);
                    }
                } catch (folderError) {
                    this.logger.warn(`Failed to create folder ${folder}: ${folderError}`);
                }
            }

            // Create pack.mcmeta if it doesn't exist
            const packMcmetaPath = path.join(this.datapackPath, 'pack.mcmeta');
            try {
                if (!(await this.fileExists(packMcmetaPath))) {
                    const packMcmeta = {
                        pack: {
                            pack_format: 48,
                            description: 'Endless Dimensions - Dynamic Dimensions'
                        }
                    };
                    await this.api.internal.fs.writeFile(packMcmetaPath, JSON.stringify(packMcmeta, null, 2));
                    this.logger.info('Created pack.mcmeta for endless datapack');
                }
            } catch (metaError) {
                this.logger.warn(`Failed to create pack.mcmeta: ${metaError}`);
            }

        } catch (error) {
            this.logger.error('Failed to ensure datapack structure', error);
        }
    }

    /**
     * Wait for Moud API to be available
     */
    private async waitForMoudApi(): Promise<void> {
        const maxWaitTime = 10000; // 10 seconds max wait
        const checkInterval = 100; // Check every 100ms
        let waitTime = 0;

        return new Promise<void>((resolve, reject) => {
            const checkApi = () => {
                try {
                    if (this.api && this.api.internal && this.api.internal.fs) {
                        // Test if we can actually use the API
                        this.api.internal.fs.stat('.');
                        resolve();
                    } else {
                        waitTime += checkInterval;
                        if (waitTime >= maxWaitTime) {
                            reject(new Error('Moud API not available after maximum wait time'));
                        } else {
                            setTimeout(checkApi, checkInterval);
                        }
                    }
                } catch (error) {
                    waitTime += checkInterval;
                    if (waitTime >= maxWaitTime) {
                        reject(new Error('Moud API not available after maximum wait time'));
                    } else {
                        setTimeout(checkApi, checkInterval);
                    }
                }
            };

            checkApi();
        });
    }

    /**
     * Check if a file exists using Moud API
     */
    private async fileExists(filePath: string): Promise<boolean> {
        try {
            await this.api.internal.fs.stat(filePath);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Inject a dimension configuration into the datapack
     * @param dimensionId The unique dimension ID
     * @param jsonConfig The compiled dimension JSON
     * @param grid The synthesizer grid (for biome generation)
     */
    public async injectDimension(
        dimensionId: string, 
        jsonConfig: CompiledDimensionJson,
        grid: any // SynthesizerGrid type
    ): Promise<boolean> {
        try {
            this.logger.info(`Injecting dimension: ${dimensionId}`);

            // Write dimension JSON
            const dimensionFilePath = await this.writeDimensionJson(dimensionId, jsonConfig);
            
            // Generate and write biome JSONs
            const biomeFiles = await this.writeBiomeJsons(dimensionId, grid);
            
            // Generate and write feature JSONs
            const featureFiles = await this.writeFeatureJsons(dimensionId, grid);

            // Track the injected dimension
            const injectedDimension: InjectedDimension = {
                id: dimensionId,
                name: `Synthesizer Dimension ${dimensionId}`,
                filePath: dimensionFilePath,
                biomeFiles,
                createdAt: new Date().toISOString(),
                jsonConfig
            };
            this.injectedDimensions.set(dimensionId, injectedDimension);

            // Trigger datapack reload
            await this.triggerDatapackReload();

            this.logger.info(`Successfully injected dimension: ${dimensionId}`);
            return true;

        } catch (error) {
            this.logger.error(`Failed to inject dimension: ${dimensionId}`, error);
            return false;
        }
    }

    /**
     * Write the main dimension JSON file
     */
    private async writeDimensionJson(dimensionId: string, jsonConfig: CompiledDimensionJson): Promise<string> {
        const dimensionPath = path.join(this.datapackPath, 'data', 'endless', 'dimension');
        const filePath = path.join(dimensionPath, `${dimensionId}.json`);
        
        const dimensionJson = {
            type: jsonConfig.type,
            generator: jsonConfig.generator
        };

        fs.writeFileSync(filePath, JSON.stringify(dimensionJson, null, 2));
        this.logger.debug(`Wrote dimension JSON: ${filePath}`);
        return filePath;
    }

    /**
     * Write biome JSON files for the dimension
     */
    private async writeBiomeJsons(dimensionId: string, grid: any): Promise<string[]> {
        const biomePath = path.join(this.datapackPath, 'data', 'endless', 'worldgen', 'biome');
        const biomeJsons = this.biomeCompiler.generateBiomeJsons(grid);
        const biomeFiles: string[] = [];

        for (const [biomeId, biomeJson] of biomeJsons.entries()) {
            const fileName = `${biomeId.replace('endless:', '')}.json`;
            const filePath = path.join(biomePath, fileName);
            
            fs.writeFileSync(filePath, JSON.stringify(biomeJson, null, 2));
            biomeFiles.push(filePath);
            this.logger.debug(`Wrote biome JSON: ${filePath}`);
        }

        return biomeFiles;
    }

    /**
     * Write feature JSON files for ores and other features
     */
    private async writeFeatureJsons(dimensionId: string, grid: any): Promise<string[]> {
        const featurePath = path.join(this.datapackPath, 'data', 'endless', 'worldgen', 'configured_feature');
        const placedFeaturePath = path.join(this.datapackPath, 'data', 'endless', 'worldgen', 'placed_feature');
        const featureFiles: string[] = [];

        // Generate ore features for each column
        for (const column of grid.columns) {
            if (!column.unlocked) continue;
            
            if (column.oreLayout && column.oreLayout !== 'minecraft:air') {
                const oreFeature = this.createOreFeature(column.oreLayout);
                const fileName = `ore_${column.oreLayout.replace('minecraft:', '')}.json`;
                const filePath = path.join(featurePath, fileName);
                
                fs.writeFileSync(filePath, JSON.stringify(oreFeature, null, 2));
                featureFiles.push(filePath);
                this.logger.debug(`Wrote ore feature: ${filePath}`);

                // Create placed feature
                const placedFeature = this.createPlacedOreFeature(`endless:ore_${column.oreLayout.replace('minecraft:', '')}`);
                const placedFilePath = path.join(placedFeaturePath, fileName);
                fs.writeFileSync(placedFilePath, JSON.stringify(placedFeature, null, 2));
                featureFiles.push(placedFilePath);
            }
        }

        return featureFiles;
    }

    /**
     * Create an ore feature configuration
     */
    private createOreFeature(oreBlock: string): any {
        return {
            type: "minecraft:ore",
            config: {
                size: 8,
                discard_chance_on_air_exposure: 0.0,
                targets: [
                    {
                        target: {
                            state: {
                                Name: "minecraft:stone"
                            },
                            predicate: {
                                type: "minecraft:tag_test",
                                tag: "minecraft:stone_ore_replaceables"
                            }
                        },
                        state: {
                            Name: oreBlock
                        }
                    }
                ]
            }
        };
    }

    /**
     * Create a placed ore feature configuration
     */
    private createPlacedOreFeature(featureName: string): any {
        return {
            feature: featureName,
            placement: [
                {
                    type: "minecraft:count",
                    count: 10
                },
                {
                    type: "minecraft:in_square"
                },
                {
                    type: "minecraft:height_range",
                    height: {
                        type: "minecraft:uniform",
                        min: {
                            absolute: -64
                        },
                        max: {
                            absolute: 320
                        }
                    }
                },
                {
                    type: "minecraft:biome"
                }
            ]
        };
    }

    /**
     * Trigger a datapack reload to register the new dimension
     */
    private async triggerDatapackReload(): Promise<void> {
        try {
            // Execute reload command
            await this.api.server.executeCommand("/reload");
            this.logger.info("Triggered datapack reload");
            
            // Wait a moment for the reload to complete
            await new Promise(resolve => setTimeout(resolve, 2000));
            
        } catch (error) {
            this.logger.error("Failed to trigger datapack reload", error);
            throw error;
        }
    }

    /**
     * Check if a dimension is already injected
     */
    public isDimensionInjected(dimensionId: string): boolean {
        return this.injectedDimensions.has(dimensionId);
    }

    /**
     * Get an injected dimension by ID
     */
    public getInjectedDimension(dimensionId: string): InjectedDimension | null {
        return this.injectedDimensions.get(dimensionId) || null;
    }

    /**
     * Get all injected dimensions
     */
    public getAllInjectedDimensions(): Map<string, InjectedDimension> {
        return new Map(this.injectedDimensions);
    }

    /**
     * Remove an injected dimension
     */
    public async removeDimension(dimensionId: string): Promise<boolean> {
        try {
            const injectedDimension = this.injectedDimensions.get(dimensionId);
            if (!injectedDimension) {
                this.logger.warn(`Dimension not found for removal: ${dimensionId}`);
                return false;
            }

            // Remove dimension file
            if (fs.existsSync(injectedDimension.filePath)) {
                fs.unlinkSync(injectedDimension.filePath);
            }

            // Remove biome files
            for (const biomeFile of injectedDimension.biomeFiles) {
                if (fs.existsSync(biomeFile)) {
                    fs.unlinkSync(biomeFile);
                }
            }

            // Remove from tracking
            this.injectedDimensions.delete(dimensionId);

            // Trigger reload
            await this.triggerDatapackReload();

            this.logger.info(`Successfully removed dimension: ${dimensionId}`);
            return true;

        } catch (error) {
            this.logger.error(`Failed to remove dimension: ${dimensionId}`, error);
            return false;
        }
    }

    /**
     * Clean up old dimensions (older than specified hours)
     */
    public async cleanupOldDimensions(maxAgeHours: number = 24): Promise<number> {
        const now = new Date();
        let cleanedCount = 0;

        for (const [dimensionId, dimension] of this.injectedDimensions.entries()) {
            const createdAt = new Date(dimension.createdAt);
            const ageInHours = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

            if (ageInHours > maxAgeHours) {
                if (await this.removeDimension(dimensionId)) {
                    cleanedCount++;
                }
            }
        }

        if (cleanedCount > 0) {
            this.logger.info(`Cleaned up ${cleanedCount} old dimensions`);
        }

        return cleanedCount;
    }

    /**
     * Get statistics about injected dimensions
     */
    public getStatistics(): {
        totalDimensions: number;
        datapackPath: string;
        dimensions: string[];
        oldestDimension: string | null;
        newestDimension: string | null;
    } {
        const dimensions = Array.from(this.injectedDimensions.keys());
        let oldestDimension: string | null = null;
        let newestDimension: string | null = null;

        if (dimensions.length > 0) {
            const sortedDimensions = dimensions
                .map(id => ({ id, createdAt: this.injectedDimensions.get(id)!.createdAt }))
                .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

            oldestDimension = sortedDimensions[0].id;
            newestDimension = sortedDimensions[sortedDimensions.length - 1].id;
        }

        return {
            totalDimensions: this.injectedDimensions.size,
            datapackPath: this.datapackPath,
            dimensions,
            oldestDimension,
            newestDimension
        };
    }
}
