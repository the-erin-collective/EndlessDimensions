/// <reference types="@epi-studio/moud-sdk" />
import { Logger } from '../utils/Logger';
import { DimensionConfig } from '../core/DimensionGenerator';
import { getBiomeGenerator, BiomeConfig } from './BiomeGenerator';
import { getStructureGenerator, StructureConfig } from './StructureGenerator';

// Type definitions for world feature integration
interface WorldFeatureConfig {
    dimensionId: string;
    biomes: BiomeConfig[];
    structures: StructureConfig[];
    configuredFeatures: ConfiguredFeature[];
    placedFeatures: PlacedFeature[];
    noiseSettings: NoiseSettings;
    biomeSources: BiomeSource[];
}

interface ConfiguredFeature {
    id: string;
    name: string;
    type: string;
    config: any;
    biomes: string[];
}

interface PlacedFeature {
    id: string;
    name: string;
    feature: string;
    placement: PlacementModifier[];
    biomes: string[];
}

interface PlacementModifier {
    type: string;
    config?: any;
}

interface NoiseSettings {
    id: string;
    name: string;
    settings: any;
}

interface BiomeSource {
    id: string;
    name: string;
    type: string;
    config: any;
}

/**
 * World Feature Integration - Integrates biomes and structures into coherent world generation
 * Connects all world generation components and creates the final world configuration
 */
export class WorldFeatureIntegration {
    private logger: Logger;
    private namespace: string;
    private biomeGenerator: any;
    private structureGenerator: any;
    private worldConfigs: Map<string, WorldFeatureConfig> = new Map();

    constructor(namespace: string = 'endlessdimensions') {
        this.logger = new Logger('WorldFeatureIntegration');
        this.namespace = namespace;
        this.biomeGenerator = getBiomeGenerator();
        this.structureGenerator = getStructureGenerator();
    }

    /**
     * Integrate world features for a dimension
     */
    public async integrateWorldFeatures(dimensionConfig: DimensionConfig, seed: number): Promise<WorldFeatureConfig> {
        try {
            this.logger.info(`Integrating world features for dimension: ${dimensionConfig.id}`);
            
            // Generate biomes
            const biomeIds = this.biomeGenerator.generateBiomes(dimensionConfig, seed);
            const biomes = this.getBiomeConfigs(biomeIds);
            
            // Generate structures
            const structureIds = this.structureGenerator.generateStructures(dimensionConfig, seed + 1000, biomeIds);
            const structures = this.getStructureConfigs(structureIds);
            
            // Generate configured features
            const configuredFeatures = this.generateConfiguredFeatures(dimensionConfig, seed + 2000, biomes);
            
            // Generate placed features
            const placedFeatures = this.generatePlacedFeatures(dimensionConfig, seed + 3000, configuredFeatures);
            
            // Generate noise settings
            const noiseSettings = this.generateNoiseSettings(dimensionConfig, seed + 4000);
            
            // Generate biome sources
            const biomeSources = this.generateBiomeSources(dimensionConfig, seed + 5000, biomes);
            
            const worldConfig: WorldFeatureConfig = {
                dimensionId: dimensionConfig.id,
                biomes,
                structures,
                configuredFeatures,
                placedFeatures,
                noiseSettings,
                biomeSources
            };
            
            // Store world configuration
            this.worldConfigs.set(dimensionConfig.id, worldConfig);
            
            this.logger.info(`World features integrated for dimension ${dimensionConfig.id}`);
            return worldConfig;
            
        } catch (error) {
            this.logger.error(`Failed to integrate world features for dimension ${dimensionConfig.id}:`, error);
            throw error;
        }
    }

    /**
     * Get biome configurations
     */
    private getBiomeConfigs(biomeIds: string[]): BiomeConfig[] {
        const biomes: BiomeConfig[] = [];
        
        for (const biomeId of biomeIds) {
            const biomeConfig = this.biomeGenerator.getBiomeConfig(biomeId);
            if (biomeConfig) {
                biomes.push(biomeConfig);
            }
        }
        
        return biomes;
    }

    /**
     * Get structure configurations
     */
    private getStructureConfigs(structureIds: string[]): StructureConfig[] {
        const structures: StructureConfig[] = [];
        
        for (const structureId of structureIds) {
            const structureConfig = this.structureGenerator.getStructureConfig(structureId);
            if (structureConfig) {
                structures.push(structureConfig);
            }
        }
        
        return structures;
    }

    /**
     * Generate configured features
     */
    private generateConfiguredFeatures(dimensionConfig: DimensionConfig, seed: number, biomes: BiomeConfig[]): ConfiguredFeature[] {
        const features: ConfiguredFeature[] = [];
        const random = this.createSeededRandom(seed);
        
        // Generate ore features
        const oreFeatures = this.generateOreFeatures(random, dimensionConfig, biomes);
        features.push(...oreFeatures);
        
        // Generate vegetation features
        const vegetationFeatures = this.generateVegetationFeatures(random, dimensionConfig, biomes);
        features.push(...vegetationFeatures);
        
        // Generate tree features
        const treeFeatures = this.generateTreeFeatures(random, dimensionConfig, biomes);
        features.push(...treeFeatures);
        
        // Generate decorative features
        const decorativeFeatures = this.generateDecorativeFeatures(random, dimensionConfig, biomes);
        features.push(...decorativeFeatures);
        
        return features;
    }

    /**
     * Generate ore features
     */
    private generateOreFeatures(random: () => number, dimensionConfig: DimensionConfig, biomes: BiomeConfig[]): ConfiguredFeature[] {
        const features: ConfiguredFeature[] = [];
        const oreTypes = ['coal', 'iron', 'gold', 'diamond', 'lapis', 'redstone', 'copper', 'emerald'];
        
        // Skip ore generation in some dimension types
        if (dimensionConfig.generatorType === 'void' || dimensionConfig.generatorType === 'the_end') {
            return features;
        }
        
        for (const oreType of oreTypes) {
            const oreSeed = random() * 10000;
            const featureId = `${this.namespace}:ore_${oreType}_${Math.floor(oreSeed)}`;
            
            // Select biomes for this ore
            const oreBiomes = this.selectBiomesForFeature(random, biomes, oreType);
            
            const feature: ConfiguredFeature = {
                id: featureId,
                name: `Ore ${oreType}`,
                type: 'minecraft:ore',
                config: this.generateOreConfig(oreType, random, dimensionConfig),
                biomes: oreBiomes.map(b => b.id)
            };
            
            features.push(feature);
        }
        
        return features;
    }

    /**
     * Generate ore configuration
     */
    private generateOreConfig(oreType: string, random: () => number, dimensionConfig: DimensionConfig): any {
        const oreConfigs: { [key: string]: any } = {
            coal: {
                targets: [
                    { target: 'minecraft:stone', state: { Name: 'minecraft:coal_ore' } },
                    { target: 'minecraft:deepslate', state: { Name: 'minecraft:deepslate_coal_ore' } }
                ],
                size: 17,
                discard_on_air_chance: 0
            },
            iron: {
                targets: [
                    { target: 'minecraft:stone', state: { Name: 'minecraft:iron_ore' } },
                    { target: 'minecraft:deepslate', state: { Name: 'minecraft:deepslate_iron_ore' } }
                ],
                size: 9,
                discard_on_air_chance: 0
            },
            gold: {
                targets: [
                    { target: 'minecraft:stone', state: { Name: 'minecraft:gold_ore' } },
                    { target: 'minecraft:deepslate', state: { Name: 'minecraft:deepslate_gold_ore' } }
                ],
                size: 9,
                discard_on_air_chance: 0
            },
            diamond: {
                targets: [
                    { target: 'minecraft:deepslate', state: { Name: 'minecraft:deepslate_diamond_ore' } }
                ],
                size: 8,
                discard_on_air_chance: 0
            },
            lapis: {
                targets: [
                    { target: 'minecraft:stone', state: { Name: 'minecraft:lapis_ore' } },
                    { target: 'minecraft:deepslate', state: { Name: 'minecraft:deepslate_lapis_ore' } }
                ],
                size: 7,
                discard_on_air_chance: 0
            },
            redstone: {
                targets: [
                    { target: 'minecraft:stone', state: { Name: 'minecraft:redstone_ore' } },
                    { target: 'minecraft:deepslate', state: { Name: 'minecraft:deepslate_redstone_ore' } }
                ],
                size: 8,
                discard_on_air_chance: 0
            },
            copper: {
                targets: [
                    { target: 'minecraft:stone', state: { Name: 'minecraft:copper_ore' } },
                    { target: 'minecraft:deepslate', state: { Name: 'minecraft:deepslate_copper_ore' } }
                ],
                size: 6,
                discard_on_air_chance: 0
            },
            emerald: {
                targets: [
                    { target: 'minecraft:stone', state: { Name: 'minecraft:emerald_ore' } }
                ],
                size: 3,
                discard_on_air_chance: 0
            }
        };
        
        return oreConfigs[oreType] || oreConfigs.coal;
    }

    /**
     * Generate vegetation features
     */
    private generateVegetationFeatures(random: () => number, dimensionConfig: DimensionConfig, biomes: BiomeConfig[]): ConfiguredFeature[] {
        const features: ConfiguredFeature[] = [];
        
        // Skip vegetation in some dimension types
        if (dimensionConfig.generatorType === 'void' || dimensionConfig.generatorType === 'nether') {
            return features;
        }
        
        const vegetationTypes = ['grass', 'tall_grass', 'flowers', 'sugar_cane', 'cactus', 'pumpkin', 'melon'];
        
        for (const vegType of vegetationTypes) {
            const vegSeed = random() * 10000;
            const featureId = `${this.namespace}:vegetation_${vegType}_${Math.floor(vegSeed)}`;
            
            // Select biomes for this vegetation
            const vegBiomes = this.selectBiomesForFeature(random, biomes, vegType);
            
            const feature: ConfiguredFeature = {
                id: featureId,
                name: `Vegetation ${vegType}`,
                type: this.getVegetationType(vegType),
                config: this.generateVegetationConfig(vegType, random, dimensionConfig),
                biomes: vegBiomes.map(b => b.id)
            };
            
            features.push(feature);
        }
        
        return features;
    }

    /**
     * Get vegetation feature type
     */
    private getVegetationType(vegType: string): string {
        const typeMap: { [key: string]: string } = {
            'grass': 'minecraft:patch_grass',
            'tall_grass': 'minecraft:patch_tall_grass',
            'flowers': 'minecraft:flower',
            'sugar_cane': 'minecraft:patch_sugar_cane',
            'cactus': 'minecraft:patch_cactus',
            'pumpkin': 'minecraft:patch_pumpkin',
            'melon': 'minecraft:patch_melon'
        };
        
        return typeMap[vegType] || 'minecraft:patch_grass';
    }

    /**
     * Generate vegetation configuration
     */
    private generateVegetationConfig(vegType: string, random: () => number, dimensionConfig: DimensionConfig): any {
        const configs: { [key: string]: any } = {
            'grass': {
                attempts: 32,
                xz_spread: 7,
                y_spread: 3
            },
            'tall_grass': {
                attempts: 64,
                xz_spread: 8,
                y_spread: 4
            },
            'flowers': {
                attempts: 128,
                xz_spread: 7,
                y_spread: 3
            },
            'sugar_cane': {
                attempts: 10,
                xz_spread: 16,
                y_spread: 16
            },
            'cactus': {
                attempts: 10,
                xz_spread: 16,
                y_spread: 16
            },
            'pumpkin': {
                attempts: 64,
                xz_spread: 7,
                y_spread: 3
            },
            'melon': {
                attempts: 64,
                xz_spread: 7,
                y_spread: 3
            }
        };
        
        return configs[vegType] || configs.grass;
    }

    /**
     * Generate tree features
     */
    private generateTreeFeatures(random: () => number, dimensionConfig: DimensionConfig, biomes: BiomeConfig[]): ConfiguredFeature[] {
        const features: ConfiguredFeature[] = [];
        
        // Skip trees in some dimension types
        if (dimensionConfig.generatorType === 'void' || dimensionConfig.generatorType === 'nether') {
            return features;
        }
        
        const treeTypes = ['oak', 'birch', 'spruce', 'jungle', 'acacia', 'dark_oak'];
        
        for (const treeType of treeTypes) {
            const treeSeed = random() * 10000;
            const featureId = `${this.namespace}:tree_${treeType}_${Math.floor(treeSeed)}`;
            
            // Select biomes for this tree
            const treeBiomes = this.selectBiomesForFeature(random, biomes, treeType);
            
            const feature: ConfiguredFeature = {
                id: featureId,
                name: `Tree ${treeType}`,
                type: `minecraft:${treeType}`,
                config: this.generateTreeConfig(treeType, random, dimensionConfig),
                biomes: treeBiomes.map(b => b.id)
            };
            
            features.push(feature);
        }
        
        return features;
    }

    /**
     * Generate tree configuration
     */
    private generateTreeConfig(treeType: string, random: () => number, dimensionConfig: DimensionConfig): any {
        const configs: { [key: string]: any } = {
            'oak': {
                decorators: ['minecraft:trunk_vine', 'minecraft:leaves_vine']
            },
            'birch': {
                decorators: []
            },
            'spruce': {
                decorators: []
            },
            'jungle': {
                decorators: ['minecraft:trunk_vine', 'minecraft:leaves_vine']
            },
            'acacia': {
                decorators: []
            },
            'dark_oak': {
                decorators: []
            }
        };
        
        return configs[treeType] || configs.oak;
    }

    /**
     * Generate decorative features
     */
    private generateDecorativeFeatures(random: () => number, dimensionConfig: DimensionConfig, biomes: BiomeConfig[]): ConfiguredFeature[] {
        const features: ConfiguredFeature[] = [];
        
        const decorativeTypes = ['disk_sand', 'disk_clay', 'disk_gravel', 'boulder', 'iceberg'];
        
        for (const decoType of decorativeTypes) {
            const decoSeed = random() * 10000;
            const featureId = `${this.namespace}:decorative_${decoType}_${Math.floor(decoSeed)}`;
            
            // Select biomes for this decoration
            const decoBiomes = this.selectBiomesForFeature(random, biomes, decoType);
            
            const feature: ConfiguredFeature = {
                id: featureId,
                name: `Decorative ${decoType}`,
                type: this.getDecorativeType(decoType),
                config: this.generateDecorativeConfig(decoType, random, dimensionConfig),
                biomes: decoBiomes.map(b => b.id)
            };
            
            features.push(feature);
        }
        
        return features;
    }

    /**
     * Get decorative feature type
     */
    private getDecorativeType(decoType: string): string {
        const typeMap: { [key: string]: string } = {
            'disk_sand': 'minecraft:disk_sand',
            'disk_clay': 'minecraft:disk_clay',
            'disk_gravel': 'minecraft:disk_gravel',
            'boulder': 'minecraft:boulder',
            'iceberg': 'minecraft:iceberg'
        };
        
        return typeMap[decoType] || 'minecraft:disk_sand';
    }

    /**
     * Generate decorative configuration
     */
    private generateDecorativeConfig(decoType: string, random: () => number, dimensionConfig: DimensionConfig): any {
        const configs: { [key: string]: any } = {
            'disk_sand': {
                state: { Name: 'minecraft:sand' },
                radius: Math.floor(random() * 3) + 2,
                half_height: 1,
                targets: {
                    'minecraft:grass_block': 1,
                    'minecraft:dirt': 1,
                    'minecraft:podzol': 1,
                    'minecraft:coarse_dirt': 1,
                    'minecraft:mycelium': 1
                }
            },
            'disk_clay': {
                state: { Name: 'minecraft:clay' },
                radius: Math.floor(random() * 2) + 1,
                half_height: 1,
                targets: {
                    'minecraft:sand': 1,
                    'minecraft:gravel': 1,
                    'minecraft:dirt': 1
                }
            },
            'disk_gravel': {
                state: { Name: 'minecraft:gravel' },
                radius: Math.floor(random() * 2) + 1,
                half_height: 1,
                targets: {
                    'minecraft:grass_block': 1,
                    'minecraft:dirt': 1,
                    'minecraft:stone': 1,
                    'minecraft:deepslate': 1
                }
            },
            'boulder': {
                state: { Name: 'minecraft:andesite' }
            },
            'iceberg': {
                state: { Name: 'minecraft:ice' }
            }
        };
        
        return configs[decoType] || configs.disk_sand;
    }

    /**
     * Select biomes for a feature
     */
    private selectBiomesForFeature(random: () => number, biomes: BiomeConfig[], featureType: string): BiomeConfig[] {
        // Filter biomes based on feature type
        let suitableBiomes = biomes;
        
        // Some features only work in certain temperature ranges
        if (featureType === 'iceberg') {
            suitableBiomes = biomes.filter(b => b.temperature < 0.2);
        } else if (featureType === 'cactus') {
            suitableBiomes = biomes.filter(b => b.temperature > 0.8 && b.downfall < 0.3);
        } else if (featureType === 'sugar_cane') {
            suitableBiomes = biomes.filter(b => b.downfall > 0.5);
        }
        
        // Select random biomes
        const biomeCount = Math.floor(random() * Math.min(3, suitableBiomes.length)) + 1;
        const selectedBiomes: BiomeConfig[] = [];
        
        for (let i = 0; i < biomeCount && i < suitableBiomes.length; i++) {
            const biome = suitableBiomes[Math.floor(random() * suitableBiomes.length)];
            if (!selectedBiomes.includes(biome)) {
                selectedBiomes.push(biome);
            }
        }
        
        return selectedBiomes;
    }

    /**
     * Generate placed features
     */
    private generatePlacedFeatures(dimensionConfig: DimensionConfig, seed: number, configuredFeatures: ConfiguredFeature[]): PlacedFeature[] {
        const features: PlacedFeature[] = [];
        const random = this.createSeededRandom(seed);
        
        for (const configFeature of configuredFeatures) {
            const placedSeed = random() * 10000;
            const featureId = `${this.namespace}:placed_${configFeature.id}_${Math.floor(placedSeed)}`;
            
            const placement = this.generatePlacementModifiers(random, configFeature.type);
            
            const placedFeature: PlacedFeature = {
                id: featureId,
                name: `Placed ${configFeature.name}`,
                feature: configFeature.id,
                placement,
                biomes: configFeature.biomes
            };
            
            features.push(placedFeature);
        }
        
        return features;
    }

    /**
     * Generate placement modifiers
     */
    private generatePlacementModifiers(random: () => number, featureType: string): PlacementModifier[] {
        const modifiers: PlacementModifier[] = [];
        
        // Common modifiers
        modifiers.push({
            type: 'minecraft:in_square'
        });
        
        // Height modifier
        if (featureType.includes('ore')) {
            modifiers.push({
                type: 'minecraft:height_range',
                config: {
                    height: {
                        type: 'uniform',
                        min_inclusive: -64,
                        max_inclusive: 320
                    }
                }
            });
        } else {
            modifiers.push({
                type: 'minecraft:heightmap',
                config: {
                    heightmap: 'WORLD_SURFACE_WG'
                }
            });
        }
        
        // Rarity modifier
        modifiers.push({
            type: 'minecraft:biome_filter'
        });
        
        return modifiers;
    }

    /**
     * Generate noise settings
     */
    private generateNoiseSettings(dimensionConfig: DimensionConfig, seed: number): NoiseSettings {
        const random = this.createSeededRandom(seed);
        const noiseId = `${this.namespace}:noise_${dimensionConfig.id}`;
        
        const settings = this.generateNoiseConfig(dimensionConfig, random);
        
        return {
            id: noiseId,
            name: `Noise Settings for ${dimensionConfig.name}`,
            settings
        };
    }

    /**
     * Generate noise configuration
     */
    private generateNoiseConfig(dimensionConfig: DimensionConfig, random: () => number): any {
        const baseConfigs: { [key: string]: any } = {
            'noise': {
                noise: 'minecraft:overworld',
                noise_router: this.generateNoiseRouter(random, 'overworld'),
                spawning: {
                    sea_creature_spawn_cost: 8,
                    ambient_spawn_cost: 1,
                    monster_spawn_cost: 2,
                    underground_water_creature_spawn_cost: 8
                },
                surface: 'minecraft:sandstone',
                sea_level: dimensionConfig.seaLevel,
                disable_mob_generation: false,
                aquifers_enabled: true,
                noise_caves_enabled: true,
                deepslate_enabled: true,
                ore_veins_enabled: true,
                noodle_caves_enabled: false,
                caves_enabled: true,
                min_y: dimensionConfig.minY,
                height: dimensionConfig.height,
                logical_height: 384,
                infiniburn: '#minecraft:infiniburn_overworld',
                legacy_random_source: false
            },
            'flat': {
                noise: 'minecraft:flat',
                noise_router: this.generateNoiseRouter(random, 'flat'),
                spawning: {
                    sea_creature_spawn_cost: 8,
                    ambient_spawn_cost: 1,
                    monster_spawn_cost: 2,
                    underground_water_creature_spawn_cost: 8
                },
                surface: 'minecraft:grass_block',
                sea_level: dimensionConfig.seaLevel,
                disable_mob_generation: false,
                aquifers_enabled: false,
                noise_caves_enabled: false,
                deepslate_enabled: false,
                ore_veins_enabled: true,
                noodle_caves_enabled: false,
                caves_enabled: false,
                min_y: dimensionConfig.minY,
                height: dimensionConfig.height,
                logical_height: 384,
                infiniburn: '#minecraft:infiniburn_overworld',
                legacy_random_source: false
            },
            'void': {
                noise: 'minecraft:void',
                noise_router: this.generateNoiseRouter(random, 'void'),
                spawning: {
                    sea_creature_spawn_cost: 8,
                    ambient_spawn_cost: 1,
                    monster_spawn_cost: 2,
                    underground_water_creature_spawn_cost: 8
                },
                surface: 'minecraft:air',
                sea_level: dimensionConfig.seaLevel,
                disable_mob_generation: false,
                aquifers_enabled: false,
                noise_caves_enabled: false,
                deepslate_enabled: false,
                ore_veins_enabled: false,
                noodle_caves_enabled: false,
                caves_enabled: false,
                min_y: dimensionConfig.minY,
                height: dimensionConfig.height,
                logical_height: 384,
                infiniburn: '#minecraft:infiniburn_overworld',
                legacy_random_source: false
            },
            'floating_islands': {
                noise: 'minecraft:end',
                noise_router: this.generateNoiseRouter(random, 'end'),
                spawning: {
                    sea_creature_spawn_cost: 8,
                    ambient_spawn_cost: 1,
                    monster_spawn_cost: 2,
                    underground_water_creature_spawn_cost: 8
                },
                surface: 'minecraft:end_stone',
                sea_level: dimensionConfig.seaLevel,
                disable_mob_generation: false,
                aquifers_enabled: false,
                noise_caves_enabled: false,
                deepslate_enabled: false,
                ore_veins_enabled: true,
                noodle_caves_enabled: false,
                caves_enabled: false,
                min_y: dimensionConfig.minY,
                height: dimensionConfig.height,
                logical_height: 384,
                infiniburn: '#minecraft:infiniburn_end',
                legacy_random_source: false
            },
            'the_end': {
                noise: 'minecraft:end',
                noise_router: this.generateNoiseRouter(random, 'end'),
                spawning: {
                    sea_creature_spawn_cost: 8,
                    ambient_spawn_cost: 1,
                    monster_spawn_cost: 2,
                    underground_water_creature_spawn_cost: 8
                },
                surface: 'minecraft:end_stone',
                sea_level: dimensionConfig.seaLevel,
                disable_mob_generation: false,
                aquifers_enabled: false,
                noise_caves_enabled: false,
                deepslate_enabled: false,
                ore_veins_enabled: true,
                noodle_caves_enabled: false,
                caves_enabled: false,
                min_y: dimensionConfig.minY,
                height: dimensionConfig.height,
                logical_height: 384,
                infiniburn: '#minecraft:infiniburn_end',
                legacy_random_source: false
            }
        };
        
        return baseConfigs[dimensionConfig.generatorType] || baseConfigs.noise;
    }

    /**
     * Generate noise router
     */
    private generateNoiseRouter(random: () => number, type: string): any {
        // Simplified noise router - in a full implementation this would be much more complex
        return {
            barrier: 0,
            fluid_level_floodedness: 0,
            fluid_level_spread: 0,
            lava: 0,
            temperature: random() * 2 - 1,
            vegetation: random() * 2 - 1,
            continents: random() * 2 - 1,
            erosion: random() * 2 - 1,
            depth: random() * 2 - 1,
            ridges: random() * 2 - 1,
            initial_density_without_jaggedness: random() * 2 - 1,
            final_density: random() * 2 - 1,
            vein_toggle: random() * 2 - 1,
            vein_ridged: random() * 2 - 1,
            vein_gap: random() * 2 - 1
        };
    }

    /**
     * Generate biome sources
     */
    private generateBiomeSources(dimensionConfig: DimensionConfig, seed: number, biomes: BiomeConfig[]): BiomeSource[] {
        const sources: BiomeSource[] = [];
        const random = this.createSeededRandom(seed);
        
        // Generate a multi-noise biome source
        const sourceId = `${this.namespace}:biome_source_${dimensionConfig.id}`;
        
        const source: BiomeSource = {
            id: sourceId,
            name: `Biome Source for ${dimensionConfig.name}`,
            type: 'minecraft:multi_noise',
            config: this.generateBiomeSourceConfig(biomes, random, dimensionConfig)
        };
        
        sources.push(source);
        return sources;
    }

    /**
     * Generate biome source configuration
     */
    private generateBiomeSourceConfig(biomes: BiomeConfig[], random: () => number, dimensionConfig: DimensionConfig): any {
        // Generate biome parameters for each biome
        const parameters: any[] = [];
        
        for (const biome of biomes) {
            parameters.push({
                biome: biome.id,
                parameters: {
                    temperature: biome.temperature,
                    humidity: biome.downfall,
                    continentalness: random() * 2 - 1,
                    erosion: random() * 2 - 1,
                    weirdness: random() * 2 - 1,
                    depth: random() * 2 - 1,
                    offset: 0
                }
            });
        }
        
        return {
            // Use a preset if available, otherwise use custom parameters
            preset: this.getBiomePreset(dimensionConfig.generatorType),
            // biome_parameters: parameters // Custom parameters would go here
        };
    }

    /**
     * Get biome preset for dimension type
     */
    private getBiomePreset(generatorType: string): string {
        const presets: { [key: string]: string } = {
            'noise': 'minecraft:overworld',
            'flat': 'minecraft:overworld',
            'void': 'minecraft:void',
            'floating_islands': 'minecraft:end',
            'the_end': 'minecraft:end',
            'nether': 'minecraft:nether'
        };
        
        return presets[generatorType] || 'minecraft:overworld';
    }

    /**
     * Get world configuration
     */
    public getWorldConfig(dimensionId: string): WorldFeatureConfig | null {
        return this.worldConfigs.get(dimensionId) || null;
    }

    /**
     * Generate all JSON files for datapack
     */
    public async generateDatapackFiles(worldConfig: WorldFeatureConfig): Promise<{ [key: string]: any }> {
        const files: { [key: string]: any } = {};
        
        // Generate biome files
        for (const biome of worldConfig.biomes) {
            const biomeJson = this.biomeGenerator.generateBiomeJson(biome);
            files[`data/${this.namespace}/worldgen/biome/${biome.id.replace(`${this.namespace}:`, '')}.json`] = biomeJson;
        }
        
        // Generate structure files
        for (const structure of worldConfig.structures) {
            const structureJson = this.structureGenerator.generateStructureJson(structure);
            files[`data/${this.namespace}/worldgen/structure/${structure.id.replace(`${this.namespace}:`, '')}.json`] = structureJson;
            
            // Generate template pool
            const templatePool = this.structureGenerator.getTemplatePool(structure.components.start_pool);
            if (templatePool) {
                const poolJson = this.structureGenerator.generateTemplatePoolJson(templatePool);
                files[`data/${this.namespace}/worldgen/template_pool/${templatePool.name.replace(`${this.namespace}:`, '')}.json`] = poolJson;
            }
        }
        
        // Generate configured feature files
        for (const feature of worldConfig.configuredFeatures) {
            const featureJson = this.generateConfiguredFeatureJson(feature);
            files[`data/${this.namespace}/worldgen/configured_feature/${feature.id.replace(`${this.namespace}:`, '')}.json`] = featureJson;
        }
        
        // Generate placed feature files
        for (const feature of worldConfig.placedFeatures) {
            const featureJson = this.generatePlacedFeatureJson(feature);
            files[`data/${this.namespace}/worldgen/placed_feature/${feature.id.replace(`${this.namespace}:`, '')}.json`] = featureJson;
        }
        
        // Generate noise settings
        const noiseJson = this.generateNoiseSettingsJson(worldConfig.noiseSettings);
        files[`data/${this.namespace}/worldgen/noise_settings/${worldConfig.noiseSettings.id.replace(`${this.namespace}:`, '')}.json`] = noiseJson;
        
        // Generate biome source
        const sourceJson = this.generateBiomeSourceJson(worldConfig.biomeSources[0]);
        files[`data/${this.namespace}/worldgen/multi_noise_biome_source_parameter_list/${worldConfig.biomeSources[0].id.replace(`${this.namespace}:`, '')}.json`] = sourceJson;
        
        return files;
    }

    /**
     * Generate configured feature JSON
     */
    private generateConfiguredFeatureJson(feature: ConfiguredFeature): any {
        return {
            type: feature.type,
            config: feature.config
        };
    }

    /**
     * Generate placed feature JSON
     */
    private generatePlacedFeatureJson(feature: PlacedFeature): any {
        return {
            feature: feature.feature,
            placement: feature.placement
        };
    }

    /**
     * Generate noise settings JSON
     */
    private generateNoiseSettingsJson(noiseSettings: NoiseSettings): any {
        return noiseSettings.settings;
    }

    /**
     * Generate biome source JSON
     */
    private generateBiomeSourceJson(biomeSource: BiomeSource): any {
        return biomeSource.config;
    }

    /**
     * Create seeded random number generator
     */
    private createSeededRandom(seed: number): () => number {
        let s = seed;
        return () => {
            s = (s * 9301 + 49297) % 233280;
            return s / 233280;
        };
    }

    /**
     * Get world feature statistics
     */
    public getStatistics(): any {
        return {
            totalWorldConfigs: this.worldConfigs.size,
            averageBiomesPerDimension: this.worldConfigs.size > 0 ? 
                Array.from(this.worldConfigs.values()).reduce((sum, config) => sum + config.biomes.length, 0) / this.worldConfigs.size : 0,
            averageStructuresPerDimension: this.worldConfigs.size > 0 ? 
                Array.from(this.worldConfigs.values()).reduce((sum, config) => sum + config.structures.length, 0) / this.worldConfigs.size : 0,
            averageFeaturesPerDimension: this.worldConfigs.size > 0 ? 
                Array.from(this.worldConfigs.values()).reduce((sum, config) => sum + config.configuredFeatures.length, 0) / this.worldConfigs.size : 0
        };
    }

    /**
     * Clear all world feature data
     */
    public clearWorldFeatures(): void {
        this.worldConfigs.clear();
        this.logger.info('All world feature data cleared');
    }
}

// Singleton instance for global access
let globalWorldFeatureIntegration: WorldFeatureIntegration | null = null;

/**
 * Get global world feature integration instance
 */
export function getWorldFeatureIntegration(): WorldFeatureIntegration {
    if (!globalWorldFeatureIntegration) {
        globalWorldFeatureIntegration = new WorldFeatureIntegration();
    }
    return globalWorldFeatureIntegration;
}
