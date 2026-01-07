/// <reference types="@epi-studio/moud-sdk" />
import { Logger } from '../utils/Logger';
import { SynthesizerGrid, BiomeColumn, WorldType } from './VirtualGridController';

export interface BiomeConfig {
    id: string;
    name: string;
    worldType: WorldType;
    baseBiome: string;
    replacements: {
        surfaceBlock?: string;
        stoneBlock?: string;
        liquidBlock?: string;
        treeLogs?: string;
        treeLeaves?: string;
        ores?: string;
    };
}

export interface CompiledDimensionJson {
    type: string;
    generator: {
        type: string;
        settings: any;
    };
}

export class BiomeJsonCompiler {
    private logger: Logger;

    constructor() {
        this.logger = new Logger('BiomeJsonCompiler');
    }

    /**
     * Compile a synthesizer grid into a dimension JSON configuration
     * @param grid The synthesizer grid to compile
     * @returns Compiled dimension JSON for Minecraft 1.21+
     */
    public compileGridToDimensionJson(grid: SynthesizerGrid): CompiledDimensionJson {
        this.logger.info(`Compiling grid with ${grid.columns.length} columns`);

        const definedBiomes = grid.columns.filter(col => col.unlocked && col.baseBiome !== null);
        
        if (definedBiomes.length === 0) {
            // Create empty world (superflat with air only)
            return this.createEmptyWorldJson();
        }

        // Group biomes by world type
        const biomesByWorldType = this.groupBiomesByWorldType(definedBiomes);
        
        // Create dimension JSON based on world types present
        return this.createDimensionJson(biomesByWorldType);
    }

    /**
     * Create an empty world JSON (all air)
     */
    private createEmptyWorldJson(): CompiledDimensionJson {
        return {
            type: "endlessdimensions:biome_synthesizer",
            generator: {
                type: "minecraft:flat",
                settings: {
                    biome: "minecraft:the_void",
                    layers: [
                        {
                            height: 1,
                            block: "minecraft:air"
                        }
                    ],
                    lakes: false,
                    features: false,
                    structures: false
                }
            }
        };
    }

    /**
     * Group biomes by their world type
     */
    private groupBiomesByWorldType(biomes: BiomeColumn[]): Map<WorldType, BiomeColumn[]> {
        const grouped = new Map<WorldType, BiomeColumn[]>();
        
        for (const biome of biomes) {
            if (!biome.worldType) continue;
            
            const existing = grouped.get(biome.worldType) || [];
            existing.push(biome);
            grouped.set(biome.worldType, existing);
        }

        return grouped;
    }

    /**
     * Create dimension JSON based on world types
     */
    private createDimensionJson(biomesByWorldType: Map<WorldType, BiomeColumn[]>): CompiledDimensionJson {
        const worldTypes = Array.from(biomesByWorldType.keys());
        
        // If only one world type, use that generator type
        if (worldTypes.length === 1) {
            return this.createSingleWorldTypeJson(worldTypes[0], biomesByWorldType.get(worldTypes[0])!);
        }

        // Multiple world types - use multi-noise
        return this.createMultiWorldTypeJson(biomesByWorldType);
    }

    /**
     * Create JSON for a single world type
     */
    private createSingleWorldTypeJson(worldType: WorldType, biomes: BiomeColumn[]): CompiledDimensionJson {
        const generatorSettings = this.createWorldTypeSettings(worldType, biomes);
        
        return {
            type: "endlessdimensions:biome_synthesizer",
            generator: generatorSettings
        };
    }

    /**
     * Create JSON for multiple world types
     */
    private createMultiWorldTypeJson(biomesByWorldType: Map<WorldType, BiomeColumn[]>): CompiledDimensionJson {
        // Create multi-noise configuration with different regions for each world type
        const biomeConfigs: any[] = [];
        
        // Assign noise parameters to each world type
        const noiseParameters = {
            'NORMAL': { temperature: 0.0, humidity: 0.0, continentalness: 0.0, erosion: 0.0 },
            'NETHER': { temperature: 1.0, humidity: -0.5, continentalness: -0.5, erosion: 0.5 },
            'THE_END': { temperature: 0.5, humidity: 0.5, continentalness: 1.0, erosion: 1.0 },
            'SUPERFLAT': { temperature: 0.0, humidity: 0.0, continentalness: 0.0, erosion: -1.0 },
            'AMPLIFIED': { temperature: -0.5, humidity: 0.5, continentalness: 0.5, erosion: 1.0 }
        };

        for (const [worldType, biomes] of biomesByWorldType.entries()) {
            const params = noiseParameters[worldType];
            
            for (let i = 0; i < biomes.length; i++) {
                const biome = biomes[i];
                const biomeConfig = {
                    biome: `endless:dynamic_biome_${worldType.toLowerCase()}_${biome.id}`,
                    parameters: {
                        temperature: params.temperature + (i * 0.1),
                        humidity: params.humidity + (i * 0.1),
                        continentalness: params.continentalness + (i * 0.1),
                        erosion: params.erosion + (i * 0.1),
                        depth: 0.0,
                        weirdness: 0.0
                    }
                };
                biomeConfigs.push(biomeConfig);
            }
        }

        return {
            type: "endlessdimensions:biome_synthesizer",
            generator: {
                type: "minecraft:multi_noise",
                settings: {
                    biome_source: {
                        type: "minecraft:multi_noise",
                        biome: biomeConfigs
                    },
                    // Use amplified-style settings for variety
                    sea_level: 64,
                    disable_mob_generation: false,
                    aquifers_enabled: true,
                    ore_veins_enabled: true,
                    legacy_random_source: false,
                    noise: "minecraft:overworld"
                }
            }
        };
    }

    /**
     * Create generator settings for a specific world type
     */
    private createWorldTypeSettings(worldType: WorldType, biomes: BiomeColumn[]): any {
        switch (worldType) {
            case 'SUPERFLAT':
                return this.createSuperflatSettings(biomes);
            case 'THE_END':
                return this.createTheEndSettings(biomes);
            case 'NETHER':
                return this.createNetherSettings(biomes);
            case 'AMPLIFIED':
                return this.createAmplifiedSettings(biomes);
            case 'NORMAL':
            default:
                return this.createNormalSettings(biomes);
        }
    }

    /**
     * Create superflat world settings
     */
    private createSuperflatSettings(biomes: BiomeColumn[]): any {
        const biome = biomes[0]; // Superflat only allows 1 biome
        
        return {
            type: "minecraft:flat",
            settings: {
                biome: this.mapBiomeItemToVanilla(biome.baseBiome!),
                layers: this.createFlatLayers(biome),
                lakes: biome.liquidBlock !== null,
                features: biome.ores !== null,
                structures: true
            }
        };
    }

    /**
     * Create The End world settings
     */
    private createTheEndSettings(biomes: BiomeColumn[]): any {
        return {
            type: "minecraft:noise",
            settings: {
                biome: this.mapBiomeItemToVanilla(biomes[0].baseBiome!),
                sea_level: 0,
                disable_mob_generation: false,
                aquifers_enabled: false,
                ore_veins_enabled: true,
                legacy_random_source: false,
                noise: "minecraft:end"
            }
        };
    }

    /**
     * Create Nether world settings
     */
    private createNetherSettings(biomes: BiomeColumn[]): any {
        return {
            type: "minecraft:noise",
            settings: {
                biome: this.mapBiomeItemToVanilla(biomes[0].baseBiome!),
                sea_level: 32,
                disable_mob_generation: false,
                aquifers_enabled: false,
                ore_veins_enabled: true,
                legacy_random_source: false,
                noise: "minecraft:nether"
            }
        };
    }

    /**
     * Create amplified world settings
     */
    private createAmplifiedSettings(biomes: BiomeColumn[]): any {
        return {
            type: "minecraft:noise",
            settings: {
                biome: this.mapBiomeItemToVanilla(biomes[0].baseBiome!),
                sea_level: 64,
                disable_mob_generation: false,
                aquifers_enabled: true,
                ore_veins_enabled: true,
                legacy_random_source: false,
                noise: "minecraft:amplified"
            }
        };
    }

    /**
     * Create normal world settings
     */
    private createNormalSettings(biomes: BiomeColumn[]): any {
        return {
            type: "minecraft:noise",
            settings: {
                biome: this.mapBiomeItemToVanilla(biomes[0].baseBiome!),
                sea_level: 64,
                disable_mob_generation: false,
                aquifers_enabled: true,
                ore_veins_enabled: true,
                legacy_random_source: false,
                noise: "minecraft:overworld"
            }
        };
    }

    /**
     * Create flat world layers
     */
    private createFlatLayers(biome: BiomeColumn): any[] {
        const layers: any[] = [];
        
        // Surface block layer
        if (biome.surfaceBlock) {
            layers.push({
                height: 3,
                block: biome.surfaceBlock
            });
        }
        
        // Stone block layer
        if (biome.stoneBlock) {
            layers.push({
                height: biome.surfaceBlock ? 50 : 53,
                block: biome.stoneBlock
            });
        } else {
            layers.push({
                height: biome.surfaceBlock ? 50 : 53,
                block: "minecraft:stone"
            });
        }
        
        // Liquid layer (if any)
        if (biome.liquidBlock) {
            layers.push({
                height: 1,
                block: biome.liquidBlock
            });
        }

        return layers;
    }

    /**
     * Map biome item to vanilla biome ID
     */
    private mapBiomeItemToVanilla(biomeItem: string): string {
        // This would contain mappings from biome items to vanilla biome IDs
        // For now, use a simple mapping
        const biomeMap: { [key: string]: string } = {
            'minecraft:oak_sapling': 'minecraft:plains',
            'minecraft:spruce_sapling': 'minecraft:snowy_plains',
            'minecraft:birch_sapling': 'minecraft:birch_forest',
            'minecraft:jungle_sapling': 'minecraft:jungle',
            'minecraft:acacia_sapling': 'minecraft:savanna',
            'minecraft:dark_oak_sapling': 'minecraft:dark_forest',
            'minecraft:mangrove_propagule': 'minecraft:mangrove_swamp',
            'minecraft:cherry_sapling': 'minecraft:cherry_grove',
            'minecraft:warped_fungus': 'minecraft:warped_forest',
            'minecraft:crimson_fungus': 'minecraft:crimson_forest'
        };

        return biomeMap[biomeItem] || 'minecraft:plains';
    }

    /**
     * Generate individual biome JSON files for each column
     */
    public generateBiomeJsons(grid: SynthesizerGrid): Map<string, any> {
        const biomeJsons = new Map<string, any>();
        const definedBiomes = grid.columns.filter(col => col.unlocked && col.baseBiome !== null);

        for (const biome of definedBiomes) {
            const biomeJson = this.createBiomeJson(biome);
            biomeJsons.set(`endless:dynamic_biome_${biome.worldType!.toLowerCase()}_${biome.id}`, biomeJson);
        }

        this.logger.info(`Generated ${biomeJsons.size} biome JSON files`);
        return biomeJsons;
    }

    /**
     * Create a single biome JSON configuration with replacements
     */
    private createBiomeJson(biome: BiomeColumn): any {
        const vanillaBiome = this.mapBiomeItemToVanilla(biome.baseBiome!);
        
        return {
            type: "minecraft:biome",
            effects: {
                sky_color: this.calculateSkyColor(biome),
                fog_color: this.calculateFogColor(biome),
                water_color: this.calculateWaterColor(biome),
                water_fog_color: this.calculateWaterFogColor(biome),
                grass_color: this.calculateGrassColor(biome),
                foliage_color: this.calculateFoliageColor(biome)
            },
            precipitation: this.determinePrecipitation(biome),
            temperature: this.determineTemperature(biome),
            downfall: this.determineDownfall(biome),
            creature_spawn_probability: 0.1,
            spawns: {
                ambient: [],
                creature: [],
                misc: [],
                monster: [],
                water_ambient: [],
                water_creature: [],
                underground_water_creature: []
            },
            generation_settings: {
                surface_builder: this.createSurfaceBuilder(biome),
                carvers: {},
                features: this.createFeatures(biome),
                spawn_costs: {}
            }
        };
    }

    /**
     * Create surface builder with block replacements
     */
    private createSurfaceBuilder(biome: BiomeColumn): any {
        const vanillaBiome = this.mapBiomeItemToVanilla(biome.baseBiome!);
        
        return {
            type: "minecraft:default",
            config: {
                top_material: biome.surfaceBlock ? { 
                    Name: biome.surfaceBlock,
                    Properties: {}
                } : this.getDefaultTopMaterial(vanillaBiome),
                under_material: biome.stoneBlock ? { 
                    Name: biome.stoneBlock,
                    Properties: {}
                } : this.getDefaultUnderMaterial(vanillaBiome),
                underwater_material: biome.surfaceBlock ? { 
                    Name: biome.surfaceBlock,
                    Properties: {}
                } : this.getDefaultUnderMaterial(vanillaBiome)
            }
        };
    }

    /**
     * Get default top material for a vanilla biome
     */
    private getDefaultTopMaterial(biome: string): any {
        const defaults: { [key: string]: any } = {
            'minecraft:plains': { Name: 'minecraft:grass_block', Properties: {} },
            'minecraft:desert': { Name: 'minecraft:sand', Properties: {} },
            'minecraft:snowy_plains': { Name: 'minecraft:snow_block', Properties: {} },
            'minecraft:jungle': { Name: 'minecraft:grass_block', Properties: {} },
            'minecraft:savanna': { Name: 'minecraft:grass_block', Properties: {} },
            'minecraft:dark_forest': { Name: 'minecraft:grass_block', Properties: {} },
            'minecraft:birch_forest': { Name: 'minecraft:grass_block', Properties: {} },
            'minecraft:mangrove_swamp': { Name: 'minecraft:grass_block', Properties: {} },
            'minecraft:cherry_grove': { Name: 'minecraft:grass_block', Properties: {} },
            'minecraft:warped_forest': { Name: 'minecraft:warped_nylium', Properties: {} },
            'minecraft:crimson_forest': { Name: 'minecraft:crimson_nylium', Properties: {} }
        };

        return defaults[biome] || { Name: 'minecraft:grass_block', Properties: {} };
    }

    /**
     * Get default under material for a vanilla biome
     */
    private getDefaultUnderMaterial(biome: string): any {
        const defaults: { [key: string]: any } = {
            'minecraft:plains': { Name: 'minecraft:dirt', Properties: {} },
            'minecraft:desert': { Name: 'minecraft:sandstone', Properties: {} },
            'minecraft:snowy_plains': { Name: 'minecraft:dirt', Properties: {} },
            'minecraft:jungle': { Name: 'minecraft:dirt', Properties: {} },
            'minecraft:savanna': { Name: 'minecraft:dirt', Properties: {} },
            'minecraft:dark_forest': { Name: 'minecraft:dirt', Properties: {} },
            'minecraft:birch_forest': { Name: 'minecraft:dirt', Properties: {} },
            'minecraft:mangrove_swamp': { Name: 'minecraft:dirt', Properties: {} },
            'minecraft:cherry_grove': { Name: 'minecraft:dirt', Properties: {} },
            'minecraft:warped_forest': { Name: 'minecraft:warped_wart_block', Properties: {} },
            'minecraft:crimson_forest': { Name: 'minecraft:netherrack', Properties: {} }
        };

        return defaults[biome] || { Name: 'minecraft:stone', Properties: {} };
    }

    /**
     * Create features with ore replacements
     */
    private createFeatures(biome: BiomeColumn): any[] {
        const features: any[] = [];

        // Add ore features
        if (biome.ores) {
            features.push([
                `endless:ore_${biome.ores.replace('minecraft:', '')}`
            ]);
        }

        // Add liquid features
        if (biome.liquidBlock) {
            if (biome.liquidBlock === 'minecraft:lava') {
                features.push(['minecraft:lava_lake']);
            } else if (biome.liquidBlock === 'minecraft:water') {
                features.push(['minecraft:water_lake']);
            }
        }

        return features;
    }

    // Helper methods for calculating biome properties based on column configuration
    private calculateSkyColor(biome: BiomeColumn): number {
        const hash = this.hashString(biome.baseBiome! + biome.worldType!);
        return 0x7BA9FF + (hash % 0x1000000);
    }

    private calculateFogColor(biome: BiomeColumn): number {
        const hash = this.hashString(biome.baseBiome!);
        return 0xC0D8FF + (hash % 0x1000000);
    }

    private calculateWaterColor(biome: BiomeColumn): number {
        if (biome.liquidBlock === 'minecraft:lava') {
            return 0xFF3E0E;
        }
        return 0x3F76E4;
    }

    private calculateWaterFogColor(biome: BiomeColumn): number {
        if (biome.liquidBlock === 'minecraft:lava') {
            return 0xFF4B0B;
        }
        return 0x050533;
    }

    private calculateGrassColor(biome: BiomeColumn): number {
        const hash = this.hashString(biome.baseBiome!);
        return 0x7CBD6B + (hash % 0x1000000);
    }

    private calculateFoliageColor(biome: BiomeColumn): number {
        const hash = this.hashString(biome.baseBiome!);
        return 0x6DA36B + (hash % 0x1000000);
    }

    private determinePrecipitation(biome: BiomeColumn): string {
        if (biome.liquidBlock === 'minecraft:lava') {
            return 'none';
        }
        return 'rain';
    }

    private determineTemperature(biome: BiomeColumn): number {
        if (biome.liquidBlock === 'minecraft:lava') {
            return 2.0;
        }
        return 0.8;
    }

    private determineDownfall(biome: BiomeColumn): number {
        if (biome.liquidBlock === 'minecraft:water') {
            return 0.8;
        }
        return 0.4;
    }

    /**
     * Simple string hash for generating consistent colors
     */
    private hashString(str: string): number {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash);
    }
}
