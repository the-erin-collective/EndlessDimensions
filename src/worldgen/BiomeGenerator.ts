/// <reference types="@epi-studio/moud-sdk" />
import { Logger } from '../utils/Logger';
import { DimensionConfig } from '../core/DimensionGenerator';

// Type definitions for biome generation
interface BiomeConfig {
    id: string;
    name: string;
    temperature: number;
    downfall: number;
    precipitation: 'rain' | 'snow' | 'none';
    has_precipitation: boolean;
    temperature_modifier: 'none' | 'frozen';
    effects: BiomeEffects;
    features: string[];
    spawns: BiomeSpawnEntry[];
    colors: BiomeColors;
}

interface BiomeEffects {
    sky_color: number;
    fog_color: number;
    water_color: number;
    water_fog_color: number;
    grass_color?: number;
    foliage_color?: number;
    ambient_sound?: string;
    mood_sound?: string;
    additions_sound?: string;
    music?: string;
    particle?: BiomeParticle;
}

interface BiomeParticle {
    options: {
        type: string;
        [key: string]: any;
    };
    probability: number;
}

interface BiomeSpawnEntry {
    type: string;
    weight: number;
    minCount: number;
    maxCount: number;
}

interface BiomeColors {
    sky: number;
    fog: number;
    water: number;
    water_fog: number;
    grass?: number;
    foliage?: number;
}

/**
 * Biome Generator - Procedural biome generation matching Java RandomBiome functionality
 * Creates unique biomes for each dimension with varied properties and features
 */
export class BiomeGenerator {
    private logger: Logger;
    private namespace: string;
    private biomeConfigs: Map<string, BiomeConfig> = new Map();
    private dimensionBiomes: Map<string, string[]> = new Map(); // dimensionId -> biomeIds

    constructor(namespace: string = 'endlessdimensions') {
        this.logger = new Logger('BiomeGenerator');
        this.namespace = namespace;
    }

    /**
     * Generate biomes for a dimension
     */
    public generateBiomes(dimensionConfig: DimensionConfig, seed: number): string[] {
        try {
            this.logger.info(`Generating biomes for dimension: ${dimensionConfig.id}`);
            
            const biomeIds: string[] = [];
            const biomeCount = this.calculateBiomeCount(seed);
            
            for (let i = 0; i < biomeCount; i++) {
                const biomeSeed = seed + i * 1000;
                const biomeId = this.generateBiome(dimensionConfig, biomeSeed);
                biomeIds.push(biomeId);
            }
            
            // Store biomes for this dimension
            this.dimensionBiomes.set(dimensionConfig.id, biomeIds);
            
            this.logger.info(`Generated ${biomeCount} biomes for dimension ${dimensionConfig.id}`);
            return biomeIds;
            
        } catch (error) {
            this.logger.error(`Failed to generate biomes for dimension ${dimensionConfig.id}:`, error);
            return [];
        }
    }

    /**
     * Calculate number of biomes to generate
     */
    private calculateBiomeCount(seed: number): number {
        const random = this.createSeededRandom(seed);
        return Math.floor(random() * 5) + 2; // 2-6 biomes per dimension
    }

    /**
     * Generate a single biome
     */
    private generateBiome(dimensionConfig: DimensionConfig, seed: number): string {
        const random = this.createSeededRandom(seed);
        
        // Generate biome ID
        const biomeId = `${this.namespace}:biome_${Math.abs(seed)}`;
        
        // Generate biome properties
        const temperature = this.generateTemperature(random, dimensionConfig);
        const downfall = this.generateDownfall(random, dimensionConfig);
        const precipitation = this.determinePrecipitation(random, temperature);
        const colors = this.generateBiomeColors(random, temperature, dimensionConfig);
        const effects = this.generateBiomeEffects(random, colors, dimensionConfig);
        const features = this.generateBiomeFeatures(random, dimensionConfig);
        const spawns = this.generateBiomeSpawns(random, dimensionConfig);
        
        const biomeConfig: BiomeConfig = {
            id: biomeId,
            name: this.generateBiomeName(random, dimensionConfig),
            temperature,
            downfall,
            precipitation,
            has_precipitation: precipitation !== 'none',
            temperature_modifier: temperature < 0.2 ? 'frozen' : 'none',
            effects,
            features,
            spawns,
            colors
        };
        
        // Store biome configuration
        this.biomeConfigs.set(biomeId, biomeConfig);
        
        this.logger.debug(`Generated biome: ${biomeConfig.name} (${biomeId})`);
        return biomeId;
    }

    /**
     * Generate biome temperature
     */
    private generateTemperature(random: () => number, dimensionConfig: DimensionConfig): number {
        // Base temperature on dimension type
        let baseTemp = 0.5; // Default temperate
        
        switch (dimensionConfig.generatorType) {
            case 'the_end':
                baseTemp = 0.5;
                break;
            case 'nether':
                baseTemp = 2.0;
                break;
            case 'void':
                baseTemp = 0.8;
                break;
            case 'floating_islands':
                baseTemp = 0.6;
                break;
            case 'flat':
                baseTemp = 0.7;
                break;
            case 'noise':
            default:
                baseTemp = 0.5 + (random() - 0.5) * 0.8; // 0.1 to 0.9
                break;
        }
        
        // Add random variation
        const variation = (random() - 0.5) * 0.4;
        let temperature = Math.max(0.0, Math.min(2.0, baseTemp + variation));
        
        // Round to 2 decimal places
        return Math.round(temperature * 100) / 100;
    }

    /**
     * Generate biome downfall (humidity)
     */
    private generateDownfall(random: () => number, dimensionConfig: DimensionConfig): number {
        // Base downfall on dimension type
        let baseDownfall = 0.5;
        
        switch (dimensionConfig.generatorType) {
            case 'the_end':
                baseDownfall = 0.0;
                break;
            case 'nether':
                baseDownfall = 0.0;
                break;
            case 'void':
                baseDownfall = 0.3;
                break;
            case 'floating_islands':
                baseDownfall = 0.4;
                break;
            case 'flat':
                baseDownfall = 0.6;
                break;
            case 'noise':
            default:
                baseDownfall = 0.3 + random() * 0.6; // 0.3 to 0.9
                break;
        }
        
        // Add random variation
        const variation = (random() - 0.5) * 0.3;
        let downfall = Math.max(0.0, Math.min(1.0, baseDownfall + variation));
        
        // Round to 2 decimal places
        return Math.round(downfall * 100) / 100;
    }

    /**
     * Determine precipitation type
     */
    private determinePrecipitation(random: () => number, temperature: number): 'rain' | 'snow' | 'none' {
        if (temperature < 0.15) {
            return 'snow';
        } else if (temperature < 0.8 && random() > 0.3) {
            return 'rain';
        } else {
            return 'none';
        }
    }

    /**
     * Generate biome colors
     */
    private generateBiomeColors(random: () => number, temperature: number, dimensionConfig: DimensionConfig): BiomeColors {
        // Generate colors based on temperature and dimension type
        const baseHue = this.getBaseHue(random, dimensionConfig);
        const saturation = this.getSaturation(random, temperature);
        const brightness = this.getBrightness(random, temperature);
        
        const skyColor = this.hslToRgb(baseHue, saturation * 0.8, brightness * 0.8);
        const fogColor = this.hslToRgb(baseHue, saturation * 0.6, brightness * 0.7);
        const waterColor = this.hslToRgb(baseHue + 180, saturation * 0.4, brightness * 0.5);
        const waterFogColor = this.hslToRgb(baseHue + 180, saturation * 0.3, brightness * 0.4);
        
        // Generate grass and foliage colors
        const grassColor = temperature > 0.2 ? this.hslToRgb(120, saturation * 0.7, brightness * 0.6) : undefined;
        const foliageColor = temperature > 0.2 ? this.hslToRgb(120, saturation * 0.8, brightness * 0.7) : undefined;
        
        return {
            sky: skyColor,
            fog: fogColor,
            water: waterColor,
            water_fog: waterFogColor,
            grass: grassColor,
            foliage: foliageColor
        };
    }

    /**
     * Get base hue for biome
     */
    private getBaseHue(random: () => number, dimensionConfig: DimensionConfig): number {
        switch (dimensionConfig.generatorType) {
            case 'the_end':
                return 200 + random() * 60; // Purple to blue range
            case 'nether':
                return random() * 60; // Red to orange range
            case 'void':
                return 200 + random() * 40; // Blue range
            case 'floating_islands':
                return 180 + random() * 60; // Cyan to blue range
            case 'flat':
                return 90 + random() * 60; // Green to yellow range
            case 'noise':
            default:
                return random() * 360; // Full spectrum
        }
    }

    /**
     * Get saturation based on temperature
     */
    private getSaturation(random: () => number, temperature: number): number {
        // Higher saturation for moderate temperatures
        if (temperature > 0.3 && temperature < 0.8) {
            return 0.6 + random() * 0.4;
        } else {
            return 0.3 + random() * 0.4;
        }
    }

    /**
     * Get brightness based on temperature
     */
    private getBrightness(random: () => number, temperature: number): number {
        // Higher brightness for warmer temperatures
        return 0.4 + (temperature * 0.4) + (random() * 0.2);
    }

    /**
     * Convert HSL to RGB color
     */
    private hslToRgb(h: number, s: number, l: number): number {
        h = h % 360;
        s = Math.max(0, Math.min(1, s));
        l = Math.max(0, Math.min(1, l));
        
        const c = (1 - Math.abs(2 * l - 1)) * s;
        const x = c * (1 - Math.abs((h / 60) % 2 - 1));
        const m = l - c / 2;
        
        let r = 0, g = 0, b = 0;
        
        if (h < 60) {
            r = c; g = x; b = 0;
        } else if (h < 120) {
            r = x; g = c; b = 0;
        } else if (h < 180) {
            r = 0; g = c; b = x;
        } else if (h < 240) {
            r = 0; g = x; b = c;
        } else if (h < 300) {
            r = x; g = 0; b = c;
        } else {
            r = c; g = 0; b = x;
        }
        
        r = Math.round((r + m) * 255);
        g = Math.round((g + m) * 255);
        b = Math.round((b + m) * 255);
        
        return (r << 16) | (g << 8) | b;
    }

    /**
     * Generate biome effects
     */
    private generateBiomeEffects(random: () => number, colors: BiomeColors, dimensionConfig: DimensionConfig): BiomeEffects {
        const effects: BiomeEffects = {
            sky_color: colors.sky,
            fog_color: colors.fog,
            water_color: colors.water,
            water_fog_color: colors.water_fog
        };
        
        // Add grass and foliage colors if available
        if (colors.grass) {
            effects.grass_color = colors.grass;
        }
        if (colors.foliage) {
            effects.foliage_color = colors.foliage;
        }
        
        // Add ambient sounds
        if (random() > 0.5) {
            effects.ambient_sound = this.getRandomAmbientSound(random, dimensionConfig);
        }
        
        // Add mood sounds
        if (random() > 0.7) {
            effects.mood_sound = this.getRandomMoodSound(random, dimensionConfig);
        }
        
        // Add particles
        if (random() > 0.8) {
            effects.particle = this.getRandomParticle(random, dimensionConfig);
        }
        
        return effects;
    }

    /**
     * Get random ambient sound
     */
    private getRandomAmbientSound(random: () => number, dimensionConfig: DimensionConfig): string {
        const sounds = [
            'minecraft:ambient.cave',
            'minecraft:ambient.underwater',
            'minecraft:ambient.weather.rain',
            'minecraft:ambient.weather.thunder',
            'minecraft:music.overworld',
            'minecraft:music.nether',
            'minecraft:music.end'
        ];
        
        // Filter sounds based on dimension type
        let filteredSounds = sounds;
        
        switch (dimensionConfig.generatorType) {
            case 'the_end':
                filteredSounds = sounds.filter(s => s.includes('end') || s.includes('ambient'));
                break;
            case 'nether':
                filteredSounds = sounds.filter(s => s.includes('nether') || s.includes('ambient'));
                break;
            case 'void':
                filteredSounds = ['minecraft:ambient.cave'];
                break;
            case 'floating_islands':
                filteredSounds = sounds.filter(s => s.includes('ambient') || s.includes('overworld'));
                break;
        }
        
        return filteredSounds[Math.floor(random() * filteredSounds.length)];
    }

    /**
     * Get random mood sound
     */
    private getRandomMoodSound(random: () => number, dimensionConfig: DimensionConfig): string {
        const sounds = [
            'minecraft:ambient.crimson_forest.mood',
            'minecraft:ambient.warped_forest.mood',
            'minecraft:ambient.soul_sand_valley.mood',
            'minecraft:ambient.nether_wastes.mood'
        ];
        
        return sounds[Math.floor(random() * sounds.length)];
    }

    /**
     * Get random particle
     */
    private getRandomParticle(random: () => number, dimensionConfig: DimensionConfig): BiomeParticle {
        const particles = [
            'minecraft:ash',
            'minecraft:white_ash',
            'minecraft:portal',
            'minecraft:end_rod',
            'minecraft:flame',
            'minecraft:soul_fire',
            'minecraft:totem_of_undying',
            'minecraft:enchant',
            'minecraft:happy_villager',
            'minecraft:angry_villager'
        ];
        
        // Filter particles based on dimension type
        let filteredParticles = particles;
        
        switch (dimensionConfig.generatorType) {
            case 'the_end':
                filteredParticles = ['minecraft:end_rod', 'minecraft:portal', 'minecraft:enchant'];
                break;
            case 'nether':
                filteredParticles = ['minecraft:flame', 'minecraft:soul_fire', 'minecraft:ash'];
                break;
            case 'void':
                filteredParticles = ['minecraft:soul_fire', 'minecraft:portal'];
                break;
        }
        
        const particleType = filteredParticles[Math.floor(random() * filteredParticles.length)];
        
        return {
            options: {
                type: particleType
            },
            probability: random() * 0.1 // 0-10% chance
        };
    }

    /**
     * Generate biome features
     */
    private generateBiomeFeatures(random: () => number, dimensionConfig: DimensionConfig): string[] {
        const allFeatures = [
            'minecraft:trees_plain',
            'minecraft:trees_flower_forest',
            'minecraft:trees_birch',
            'minecraft:trees_spruce',
            'minecraft:trees_jungle',
            'minecraft:trees_dark_forest',
            'minecraft:trees_taiga',
            'minecraft:trees_savanna',
            'minecraft:trees_desert',
            'minecraft:flower_default',
            'minecraft:flower_forest',
            'minecraft:flower_swamp',
            'minecraft:patch_grass_plain',
            'minecraft:patch_grass_forest',
            'minecraft:patch_tall_grass',
            'minecraft:patch_sugar_cane',
            'minecraft:patch_cactus',
            'minecraft:patch_pumpkin',
            'minecraft:patch_melon',
            'minecraft:ore_coal',
            'minecraft:ore_iron',
            'minecraft:ore_gold',
            'minecraft:ore_diamond',
            'minecraft:ore_lapis',
            'minecraft:ore_redstone',
            'minecraft:disk_sand',
            'minecraft:disk_clay',
            'minecraft:disk_gravel'
        ];
        
        // Filter features based on dimension type
        let filteredFeatures = allFeatures;
        
        switch (dimensionConfig.generatorType) {
            case 'the_end':
                filteredFeatures = ['minecraft:ore_coal', 'minecraft:ore_iron', 'minecraft:ore_gold'];
                break;
            case 'nether':
                filteredFeatures = ['minecraft:ore_coal', 'minecraft:ore_gold', 'minecraft:patch_pumpkin'];
                break;
            case 'void':
                filteredFeatures = []; // No features in void
                break;
        }
        
        // Select random features
        const featureCount = Math.floor(random() * 8) + 3; // 3-10 features
        const selectedFeatures: string[] = [];
        
        for (let i = 0; i < featureCount && i < filteredFeatures.length; i++) {
            const feature = filteredFeatures[Math.floor(random() * filteredFeatures.length)];
            if (!selectedFeatures.includes(feature)) {
                selectedFeatures.push(feature);
            }
        }
        
        return selectedFeatures;
    }

    /**
     * Generate biome spawns
     */
    private generateBiomeSpawns(random: () => number, dimensionConfig: DimensionConfig): BiomeSpawnEntry[] {
        const allSpawns = [
            { type: 'minecraft:cow', weight: 8, minCount: 2, maxCount: 4 },
            { type: 'minecraft:pig', weight: 10, minCount: 1, maxCount: 3 },
            { type: 'minecraft:sheep', weight: 12, minCount: 2, maxCount: 4 },
            { type: 'minecraft:chicken', weight: 10, minCount: 2, maxCount: 4 },
            { type: 'minecraft:horse', weight: 5, minCount: 1, maxCount: 3 },
            { type: 'minecraft:donkey', weight: 1, minCount: 1, maxCount: 2 },
            { type: 'minecraft:llama', weight: 1, minCount: 1, maxCount: 2 },
            { type: 'minecraft:wolf', weight: 5, minCount: 1, maxCount: 2 },
            { type: 'minecraft:cat', weight: 3, minCount: 1, maxCount: 2 },
            { type: 'minecraft:ocelot', weight: 2, minCount: 1, maxCount: 2 },
            { type: 'minecraft:parrot', weight: 1, minCount: 1, maxCount: 2 },
            { type: 'minecraft:rabbit', weight: 4, minCount: 2, maxCount: 3 }
        ];
        
        // Filter spawns based on dimension type
        let filteredSpawns = allSpawns;
        
        switch (dimensionConfig.generatorType) {
            case 'the_end':
                filteredSpawns = []; // No passive spawns in The End
                break;
            case 'nether':
                filteredSpawns = []; // No passive spawns in Nether
                break;
            case 'void':
                filteredSpawns = []; // No spawns in void
                break;
        }
        
        // Select random spawns
        const spawnCount = Math.floor(random() * 4) + 1; // 1-4 spawn types
        const selectedSpawns: BiomeSpawnEntry[] = [];
        
        for (let i = 0; i < spawnCount && i < filteredSpawns.length; i++) {
            const spawn = filteredSpawns[Math.floor(random() * filteredSpawns.length)];
            if (!selectedSpawns.some(s => s.type === spawn.type)) {
                selectedSpawns.push(spawn);
            }
        }
        
        return selectedSpawns;
    }

    /**
     * Generate biome name
     */
    private generateBiomeName(random: () => number, dimensionConfig: DimensionConfig): string {
        const prefixes = [
            'Mystic', 'Ancient', 'Forgotten', 'Ethereal', 'Celestial',
            'Shadow', 'Crystal', 'Golden', 'Silver', 'Azure',
            'Emerald', 'Ruby', 'Sapphire', 'Obsidian', 'Quartz'
        ];
        
        const suffixes = [
            'Plains', 'Forest', 'Hills', 'Mountains', 'Valley',
            'Woods', 'Meadow', 'Fields', 'Grove', 'Thicket',
            'Peaks', 'Ridge', 'Spires', 'Cliffs', 'Canyon'
        ];
        
        const prefix = prefixes[Math.floor(random() * prefixes.length)];
        const suffix = suffixes[Math.floor(random() * suffixes.length)];
        
        return `${prefix} ${suffix}`;
    }

    /**
     * Get biome configuration
     */
    public getBiomeConfig(biomeId: string): BiomeConfig | null {
        return this.biomeConfigs.get(biomeId) || null;
    }

    /**
     * Get all biomes for a dimension
     */
    public getDimensionBiomes(dimensionId: string): string[] {
        return this.dimensionBiomes.get(dimensionId) || [];
    }

    /**
     * Get all biome configurations
     */
    public getAllBiomeConfigs(): Map<string, BiomeConfig> {
        return new Map(this.biomeConfigs);
    }

    /**
     * Generate biome JSON for datapack
     */
    public generateBiomeJson(biomeConfig: BiomeConfig): any {
        return {
            effects: {
                sky_color: biomeConfig.effects.sky_color,
                fog_color: biomeConfig.effects.fog_color,
                water_color: biomeConfig.effects.water_color,
                water_fog_color: biomeConfig.effects.water_fog_color,
                ...(biomeConfig.effects.grass_color && { grass_color: biomeConfig.effects.grass_color }),
                ...(biomeConfig.effects.foliage_color && { foliage_color: biomeConfig.effects.foliage_color }),
                ...(biomeConfig.effects.ambient_sound && { ambient_sound: biomeConfig.effects.ambient_sound }),
                ...(biomeConfig.effects.mood_sound && { mood_sound: biomeConfig.effects.mood_sound }),
                ...(biomeConfig.effects.particle && { particle: biomeConfig.effects.particle })
            },
            precipitation: biomeConfig.precipitation,
            temperature: biomeConfig.temperature,
            downfall: biomeConfig.downfall,
            has_precipitation: biomeConfig.has_precipitation,
            temperature_modifier: biomeConfig.temperature_modifier
        };
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
     * Get biome statistics
     */
    public getStatistics(): any {
        return {
            totalBiomes: this.biomeConfigs.size,
            dimensionCount: this.dimensionBiomes.size,
            averageBiomesPerDimension: this.dimensionBiomes.size > 0 ? 
                Array.from(this.dimensionBiomes.values()).reduce((sum, biomes) => sum + biomes.length, 0) / this.dimensionBiomes.size : 0
        };
    }

    /**
     * Clear all biome data
     */
    public clearBiomes(): void {
        this.biomeConfigs.clear();
        this.dimensionBiomes.clear();
        this.logger.info('All biome data cleared');
    }
}

// Singleton instance for global access
let globalBiomeGenerator: BiomeGenerator | null = null;

/**
 * Get global biome generator instance
 */
export function getBiomeGenerator(): BiomeGenerator {
    if (!globalBiomeGenerator) {
        globalBiomeGenerator = new BiomeGenerator();
    }
    return globalBiomeGenerator;
}
