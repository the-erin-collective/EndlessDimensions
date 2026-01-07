/// <reference types="@epi-studio/moud-sdk" />
import { HashEngine, EasterEggDimension } from './HashEngine';
import { BlockRegistry } from './BlockRegistry';

export interface DimensionConfig {
    id: string;
    name: string;
    generatorType: 'noise' | 'flat' | 'void' | 'floating_islands' | 'the_end' | 'custom';
    defaultBlock: string;
    defaultFluid: string;
    seaLevel: number;
    minY: number;
    height: number;
    additionalBlocks: string[];
    specialFeatures: string[];
}

export class DimensionGenerator {
    private api: MoudAPI;
    private hashEngine: HashEngine;
    private blockRegistry: BlockRegistry;
    private generatedDimensions: Map<string, DimensionConfig>;

    constructor(api: MoudAPI, hashEngine: HashEngine, blockRegistry: BlockRegistry) {
        this.api = api;
        this.hashEngine = hashEngine;
        this.blockRegistry = blockRegistry;
        this.generatedDimensions = new Map();
    }

    /**
     * Generate a dimension configuration based on text input
     * @param text The input text from a written book
     * @returns Dimension configuration for the generated dimension
     */
    public generateDimension(text: string): DimensionConfig {
        // Check for easter egg dimensions first
        const easterEgg = this.hashEngine.checkEasterEgg(text);
        if (easterEgg) {
            return this.createEasterEggDimension(easterEgg, text);
        }

        // Generate procedural dimension
        return this.createProceduralDimension(text);
    }

    /**
     * Create an easter egg dimension with predefined properties
     * @param easterEgg The easter egg configuration
     * @param text The original input text
     * @returns Easter egg dimension configuration
     */
    private createEasterEggDimension(easterEgg: EasterEggDimension, text: string): DimensionConfig {
        const seed = this.hashEngine.getDimensionSeed(text);
        const seedBigInt = this.hashEngine.getDimensionSeedBigInt(text);
        const dimensionId = this.hashEngine.getDimensionId(seedBigInt);

        const config: DimensionConfig = {
            id: dimensionId,
            name: easterEgg.displayName,
            generatorType: easterEgg.generatorType as 'noise' | 'flat' | 'void' | 'floating_islands' | 'the_end' | 'custom',
            defaultBlock: easterEgg.defaultBlock,
            defaultFluid: this.selectFluid(seed + 1),
            seaLevel: this.calculateSeaLevel(seed + 2, easterEgg.generatorType as 'flat' | 'custom' | 'void' | 'noise' | 'the_end' | 'floating_islands'),
            minY: this.calculateMinY(seed + 3, easterEgg.generatorType as 'flat' | 'custom' | 'void' | 'noise' | 'the_end' | 'floating_islands'),
            height: this.calculateHeight(seed + 4, easterEgg.generatorType as 'flat' | 'custom' | 'void' | 'noise' | 'the_end' | 'floating_islands'),
            additionalBlocks: this.generateAdditionalBlocks(seedBigInt + 5n, 8),
            specialFeatures: easterEgg.specialFeatures
        };

        this.generatedDimensions.set(dimensionId, config);
        return config;
    }

    /**
     * Create a procedurally generated dimension
     * @param text The input text
     * @returns Procedural dimension configuration
     */
    private createProceduralDimension(text: string): DimensionConfig {
        const seed = this.hashEngine.getDimensionSeed(text);
        const seedBigInt = this.hashEngine.getDimensionSeedBigInt(text);
        const dimensionId = this.hashEngine.getDimensionId(seedBigInt);

        // Select random properties based on seed
        const generatorType = this.selectGeneratorType(seed);
        const defaultBlock = this.blockRegistry.getRandomBlockBigInt(seedBigInt);
        const defaultFluid = this.selectFluid(seed + 1);
        const seaLevel = this.calculateSeaLevel(seed + 2, generatorType);
        const minY = this.calculateMinY(seed + 3, generatorType);
        const height = this.calculateHeight(seed + 4, generatorType);
        const additionalBlocks = this.generateAdditionalBlocks(seedBigInt + 5n, 12);
        const specialFeatures = this.generateSpecialFeatures(seed + 6);

        const config: DimensionConfig = {
            id: dimensionId,
            name: `Dimension #${Math.abs(seed)}`,
            generatorType,
            defaultBlock,
            defaultFluid,
            seaLevel,
            minY,
            height,
            additionalBlocks,
            specialFeatures
        };

        this.generatedDimensions.set(dimensionId, config);
        return config;
    }

    /**
     * Select a generator type based on seed
     * @param seed The seed value
     * @returns Generator type
     */
    private selectGeneratorType(seed: number): DimensionConfig['generatorType'] {
        const types: DimensionConfig['generatorType'][] = ['noise', 'flat', 'void', 'floating_islands', 'the_end'];
        const random = this.createSeededRandom(seed);
        const index = Math.floor(random() * types.length);
        return types[index];
    }

    /**
     * Select a fluid type based on seed
     * @param seed The seed value
     * @returns Fluid block ID
     */
    private selectFluid(seed: number): string {
        return this.blockRegistry.getRandomFluid(seed);
    }

    /**
     * Calculate sea level based on seed and generator type
     * @param seed The seed value
     * @param generatorType The generator type
     * @returns Sea level value
     */
    private calculateSeaLevel(seed: number, generatorType: DimensionConfig['generatorType']): number {
        const random = this.createSeededRandom(seed);
        
        switch (generatorType) {
            case 'the_end':
                return 0;
            case 'void':
                return -64;
            case 'floating_islands':
                return Math.floor(random() * 32) + 32; // 32-63
            case 'flat':
                return Math.floor(random() * 64) + 32; // 32-95
            case 'noise':
            default:
                return Math.floor(random() * 64) + 32; // 32-95
        }
    }

    /**
     * Calculate minimum Y level based on seed and generator type
     * @param seed The seed value
     * @param generatorType The generator type
     * @returns Minimum Y value
     */
    private calculateMinY(seed: number, generatorType: DimensionConfig['generatorType']): number {
        const random = this.createSeededRandom(seed);
        
        switch (generatorType) {
            case 'void':
                return -64;
            case 'floating_islands':
                return Math.floor(random() * 32) - 32; // -32 to 0
            case 'the_end':
                return 0;
            case 'flat':
                return 0;
            case 'noise':
            default:
                return Math.floor(random() * 16) - 64; // -64 to -48
        }
    }

    /**
     * Calculate dimension height based on seed and generator type
     * @param seed The seed value
     * @param generatorType The generator type
     * @returns Dimension height
     */
    private calculateHeight(seed: number, generatorType: DimensionConfig['generatorType']): number {
        const random = this.createSeededRandom(seed);
        
        switch (generatorType) {
            case 'void':
                return 128;
            case 'flat':
                return Math.floor(random() * 64) + 64; // 64-127
            case 'floating_islands':
                return Math.floor(random() * 128) + 128; // 128-255
            case 'the_end':
                return 256;
            case 'noise':
            default:
                return Math.floor(random() * 256) + 128; // 128-383
        }
    }

    /**
     * Generate additional blocks for dimension variety
     * @param seed BigInt seed for deterministic selection
     * @param count Number of additional blocks to generate
     * @returns Array of additional block IDs
     */
    private generateAdditionalBlocks(seed: bigint, count: number): string[] {
        const blocks: string[] = [];
        let currentSeed = seed;
        
        for (let i = 0; i < count; i++) {
            const block = this.blockRegistry.getRandomBlockBigInt(currentSeed);
            if (!blocks.includes(block)) {
                blocks.push(block);
            }
            currentSeed += 1n;
        }
        
        return blocks;
    }

    /**
     * Generate special features for the dimension
     * @param seed The seed value
     * @returns Array of special feature names
     */
    private generateSpecialFeatures(seed: number): string[] {
        const allFeatures = [
            'ore_veins',
            'caves',
            'ravines',
            'lakes',
            'dungeons',
            'strongholds',
            'villages',
            'temples',
            'mineshafts',
            'monuments',
            'mansions',
            'ocean_ruins',
            'shipwrecks',
            'pillager_outposts',
            'bastions',
            'fortresses',
            'end_cities',
            'fossils',
            'geodes',
            'nether_fossils',
            'bamboo_jungles',
            'icebergs',
            'mushroom_fields',
            'flower_forests',
            'modified_jungles',
            'badlands',
            'eroded_badlands',
            'wooded_badlands',
            'desert_lakes',
            'gravelly_mountains',
            'shattered_savannas',
            'snowy_mountains',
            'snowy_taiga_mountains',
            'giant_tree_taiga',
            'giant_spruce_taiga',
            'modified_wooded_badlands',
            'modified_badlands'
        ];

        const random = this.createSeededRandom(seed);
        const featureCount = Math.floor(random() * 8) + 3; // 3-10 features
        const selectedFeatures: string[] = [];

        for (let i = 0; i < featureCount && i < allFeatures.length; i++) {
            const index = Math.floor(random() * allFeatures.length);
            const feature = allFeatures[index];
            if (!selectedFeatures.includes(feature)) {
                selectedFeatures.push(feature);
            }
        }
    }

    return selectedFeatures;
}
    }

    /**
     * Create the JSON configuration for a dimension
     * @param config The dimension configuration
     * @returns Dimension JSON configuration
     */
    private createDimensionJson(config: DimensionConfig): any {
        const baseConfig = {
            type: `endlessdimensions:${config.generatorType}`,
            generator: this.createGeneratorConfig(config)
        };

        return baseConfig;
    }

    /**
     * Create the generator configuration
     * @param config The dimension configuration
     * @returns Generator configuration
     */
    private createGeneratorConfig(config: DimensionConfig): any {
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
     * Create a flat world generator configuration
     * @param config The dimension configuration
     * @returns Flat generator configuration
     */
    private createFlatGeneratorConfig(config: DimensionConfig): any {
        const layers = [];
        const remainingHeight = config.height;
        
        // Generate random layers
        let heightLeft = remainingHeight;
        const blocks = [config.defaultBlock, ...config.additionalBlocks];
        
        while (heightLeft > 0) {
            const layerHeight = Math.min(Math.floor(Math.random() * 5) + 1, heightLeft);
            const block = blocks[Math.floor(Math.random() * blocks.length)];
            
            layers.push({
                height: layerHeight,
                block: block
            });
            
            heightLeft -= layerHeight;
        }

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
     * Create a void world generator configuration
     * @param config The dimension configuration
     * @returns Void generator configuration
     */
    private createVoidGeneratorConfig(config: DimensionConfig): any {
        return {
            type: 'minecraft:noise',
            settings: {
                biome: 'minecraft:the_void',
                sea_level: config.seaLevel,
                disable_mob_generation: false,
                aquifers_enabled: false,
                ore_veins_enabled: false,
                legacy_random_source: false,
                noise: {
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
                }
            }
        };
    }

    /**
     * Create a floating islands generator configuration
     * @param config The dimension configuration
     * @returns Floating islands generator configuration
     */
    private createFloatingIslandsGeneratorConfig(config: DimensionConfig): any {
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
     * Create a The End-like generator configuration
     * @param config The dimension configuration
     * @returns The End generator configuration
     */
    private createTheEndGeneratorConfig(config: DimensionConfig): any {
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
     * Create a noise generator configuration
     * @param config The dimension configuration
     * @returns Noise generator configuration
     */
    private createNoiseGeneratorConfig(config: DimensionConfig): any {
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
     * Get a previously generated dimension configuration
     * @param dimensionId The dimension ID
     * @returns Dimension configuration if found, null otherwise
     */
    public getDimension(dimensionId: string): DimensionConfig | null {
        return this.generatedDimensions.get(dimensionId) || null;
    }

    /**
     * Get all generated dimensions
     * @returns Map of all generated dimensions
     */
    public getAllDimensions(): Map<string, DimensionConfig> {
        return new Map(this.generatedDimensions);
    }

    /**
     * Create a seeded random number generator
     * @param seed The seed value
     * @returns A random function that produces deterministic values
     */
    private createSeededRandom(seed: number): () => number {
        let s = seed;
        return () => {
            s = (s * 9301 + 49297) % 233280;
            return s / 233280;
        };
    }
}
