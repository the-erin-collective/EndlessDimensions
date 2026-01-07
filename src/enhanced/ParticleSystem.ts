/// <reference types="@epi-studio/moud-sdk" />
import { Logger } from '../utils/Logger';
import { DimensionConfig } from '../core/DimensionGenerator';

// Type definitions for particle system
interface ParticleConfig {
    id: string;
    name: string;
    type: string;
    material: string;
    size: number;
    color: number;
    alpha: number;
    lifetime: number;
    count: number;
    speed: number;
    gravity: number;
    collision: boolean;
    glow: boolean;
    trail: boolean;
}

interface DimensionParticleProfile {
    dimensionId: string;
    ambientParticles: ParticleConfig[];
    weatherParticles: ParticleConfig[];
    specialParticles: ParticleConfig[];
    blockParticles: Map<string, ParticleConfig>;
    entityParticles: Map<string, ParticleConfig>;
    particleEffects: ParticleEffect[];
}

interface ParticleEffect {
    id: string;
    name: string;
    type: 'burst' | 'stream' | 'cloud' | 'trail' | 'explosion';
    particles: string[];
    config: ParticleEffectConfig;
}

interface ParticleEffectConfig {
    duration: number;
    radius: number;
    intensity: number;
    color: number;
    alpha: number;
    size: number;
    speed: number;
}

/**
 * Enhanced Particle Effects System - Dynamic particle generation for visual feedback
 * Creates immersive particle effects tailored to each dimension's characteristics
 */
export class ParticleSystem {
    private logger: Logger;
    private namespace: string;
    private particleConfigs: Map<string, ParticleConfig> = new Map();
    private dimensionProfiles: Map<string, DimensionParticleProfile> = new Map();

    constructor(namespace: string = 'endlessdimensions') {
        this.logger = new Logger('ParticleSystem');
        this.namespace = namespace;
    }

    /**
     * Generate particle profile for a dimension
     */
    public generateDimensionParticles(dimensionConfig: DimensionConfig, seed: number): DimensionParticleProfile {
        try {
            this.logger.info(`Generating particle profile for dimension: ${dimensionConfig.id}`);
            
            const random = this.createSeededRandom(seed);
            
            // Generate ambient particles
            const ambientParticles = this.generateAmbientParticles(dimensionConfig, random);
            
            // Generate weather particles
            const weatherParticles = this.generateWeatherParticles(dimensionConfig, random);
            
            // Generate special particles
            const specialParticles = this.generateSpecialParticles(dimensionConfig, random);
            
            // Generate block particles
            const blockParticles = this.generateBlockParticles(dimensionConfig, random);
            
            // Generate entity particles
            const entityParticles = this.generateEntityParticles(dimensionConfig, random);
            
            // Generate particle effects
            const particleEffects = this.generateParticleEffects(dimensionConfig, random);
            
            const profile: DimensionParticleProfile = {
                dimensionId: dimensionConfig.id,
                ambientParticles,
                weatherParticles,
                specialParticles,
                blockParticles,
                entityParticles,
                particleEffects
            };
            
            // Store profile
            this.dimensionProfiles.set(dimensionConfig.id, profile);
            
            this.logger.info(`Generated particle profile for dimension ${dimensionConfig.id}`);
            return profile;
            
        } catch (error) {
            this.logger.error(`Failed to generate particle profile for dimension ${dimensionConfig.id}:`, error);
            throw error;
        }
    }

    /**
     * Generate ambient particles
     */
    private generateAmbientParticles(dimensionConfig: DimensionConfig, random: () => number): ParticleConfig[] {
        const particles: ParticleConfig[] = [];
        
        const particleTypes = this.getAmbientParticleTypes(dimensionConfig);
        const particleCount = Math.floor(random() * 2) + 1; // 1-2 ambient particles
        
        for (let i = 0; i < particleCount; i++) {
            const particleType = particleTypes[Math.floor(random() * particleTypes.length)];
            const particleId = `${this.namespace}:ambient_${particleType}_${Math.floor(random() * 1000)}`;
            
            const particle: ParticleConfig = {
                id: particleId,
                name: `${dimensionConfig.name} Ambient ${particleType}`,
                type: particleType,
                material: this.getParticleMaterial(particleType, dimensionConfig),
                size: 0.1 + random() * 0.4, // 0.1-0.5
                color: this.generateParticleColor(random, dimensionConfig),
                alpha: 0.3 + random() * 0.4, // 0.3-0.7
                lifetime: 20 + Math.floor(random() * 40), // 20-60 ticks
                count: Math.floor(random() * 3) + 1, // 1-3 particles
                speed: 0.01 + random() * 0.09, // 0.01-0.1
                gravity: random() > 0.5 ? 0.01 + random() * 0.09 : 0,
                collision: random() > 0.7,
                glow: random() > 0.6,
                trail: random() > 0.5
            };
            
            particles.push(particle);
            this.particleConfigs.set(particleId, particle);
        }
        
        return particles;
    }

    /**
     * Get ambient particle types based on dimension
     */
    private getAmbientParticleTypes(dimensionConfig: DimensionConfig): string[] {
        switch (dimensionConfig.generatorType) {
            case 'the_end':
                return ['crystal', 'star', 'void_dust', 'ethereal'];
            case 'nether':
                return ['fire', 'ash', 'soul', 'lava_spark'];
            case 'void':
                return ['void_dust', 'shadow', 'echo', 'empty'];
            case 'floating_islands':
                return ['cloud', 'air', 'sparkle', 'mist'];
            case 'flat':
                return ['dust', 'pollen', 'leaf', 'nature'];
            case 'noise':
            default:
                return ['dust', 'sparkle', 'nature', 'ambient'];
        }
    }

    /**
     * Get particle material
     */
    private getParticleMaterial(particleType: string, dimensionConfig: DimensionConfig): string {
        const materials: { [key: string]: string } = {
            'crystal': 'minecraft:end_rod',
            'star': 'minecraft:firework',
            'void_dust': 'minecraft:ash',
            'ethereal': 'minecraft:enchant',
            'fire': 'minecraft:flame',
            'ash': 'minecraft:white_ash',
            'soul': 'minecraft:soul_fire',
            'lava_spark': 'minecraft:lava',
            'shadow': 'minecraft:smoke',
            'echo': 'minecraft:enchant',
            'empty': 'minecraft:entity_effect',
            'cloud': 'minecraft:cloud',
            'air': 'minecraft:enchant',
            'sparkle': 'minecraft:happy_villager',
            'mist': 'minecraft:cloud',
            'dust': 'minecraft:dust',
            'pollen': 'minecraft:entity_effect',
            'leaf': 'minecraft:falling_dust',
            'nature': 'minecraft:happy_villager',
            'ambient': 'minecraft:entity_effect'
        };
        
        return materials[particleType] || 'minecraft:entity_effect';
    }

    /**
     * Generate particle color
     */
    private generateParticleColor(random: () => number, dimensionConfig: DimensionConfig): number {
        switch (dimensionConfig.generatorType) {
            case 'the_end':
                return this.hslToRgb(270 + random() * 60, 0.7 + random() * 0.3, 0.6 + random() * 0.4); // Purple to blue
            case 'nether':
                return this.hslToRgb(random() * 60, 0.8 + random() * 0.2, 0.5 + random() * 0.5); // Red to orange
            case 'void':
                return this.hslToRgb(200 + random() * 40, 0.3 + random() * 0.3, 0.2 + random() * 0.3); // Dark blue
            case 'floating_islands':
                return this.hslToRgb(180 + random() * 60, 0.6 + random() * 0.4, 0.7 + random() * 0.3); // Cyan to blue
            case 'flat':
                return this.hslToRgb(90 + random() * 60, 0.5 + random() * 0.5, 0.6 + random() * 0.4); // Green to yellow
            case 'noise':
            default:
                return this.hslToRgb(random() * 360, 0.5 + random() * 0.5, 0.5 + random() * 0.5); // Full spectrum
        }
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
     * Generate weather particles
     */
    private generateWeatherParticles(dimensionConfig: DimensionConfig, random: () => number): ParticleConfig[] {
        const particles: ParticleConfig[] = [];
        
        const weatherTypes = this.getWeatherParticleTypes(dimensionConfig);
        const particleCount = Math.floor(random() * 2); // 0-1 weather particles
        
        for (let i = 0; i < particleCount; i++) {
            const weatherType = weatherTypes[Math.floor(random() * weatherTypes.length)];
            const particleId = `${this.namespace}:weather_${weatherType}_${Math.floor(random() * 1000)}`;
            
            const particle: ParticleConfig = {
                id: particleId,
                name: `${dimensionConfig.name} Weather ${weatherType}`,
                type: weatherType,
                material: this.getParticleMaterial(weatherType, dimensionConfig),
                size: 0.2 + random() * 0.3, // 0.2-0.5
                color: this.generateParticleColor(random, dimensionConfig),
                alpha: 0.4 + random() * 0.4, // 0.4-0.8
                lifetime: 40 + Math.floor(random() * 60), // 40-100 ticks
                count: Math.floor(random() * 5) + 2, // 2-6 particles
                speed: 0.05 + random() * 0.15, // 0.05-0.2
                gravity: weatherType.includes('rain') || weatherType.includes('snow') ? 0.1 + random() * 0.1 : 0,
                collision: false,
                glow: weatherType.includes('crystal') || weatherType.includes('soul'),
                trail: weatherType.includes('rain') || weatherType.includes('crystal')
            };
            
            particles.push(particle);
            this.particleConfigs.set(particleId, particle);
        }
        
        return particles;
    }

    /**
     * Get weather particle types based on dimension
     */
    private getWeatherParticleTypes(dimensionConfig: DimensionConfig): string[] {
        switch (dimensionConfig.generatorType) {
            case 'the_end':
                return ['void_rain', 'crystal_snow', 'ethereal_mist'];
            case 'nether':
                return ['ash_rain', 'lava_drip', 'soul_rain'];
            case 'void':
                return ['shadow_mist', 'echo_dust', 'empty_space'];
            case 'floating_islands':
                return ['cloud_rain', 'air_mist', 'sparkle_dust'];
            case 'flat':
                return ['gentle_rain', 'light_snow', 'calm_mist'];
            case 'noise':
            default:
                return ['rain', 'snow', 'mist'];
        }
    }

    /**
     * Generate special particles
     */
    private generateSpecialParticles(dimensionConfig: DimensionConfig, random: () => number): ParticleConfig[] {
        const particles: ParticleConfig[] = [];
        
        const specialTypes = this.getSpecialParticleTypes(dimensionConfig);
        const particleCount = Math.floor(random() * 2) + 1; // 1-2 special particles
        
        for (let i = 0; i < particleCount; i++) {
            const specialType = specialTypes[Math.floor(random() * specialTypes.length)];
            const particleId = `${this.namespace}:special_${specialType}_${Math.floor(random() * 1000)}`;
            
            const particle: ParticleConfig = {
                id: particleId,
                name: `${dimensionConfig.name} Special ${specialType}`,
                type: specialType,
                material: this.getParticleMaterial(specialType, dimensionConfig),
                size: 0.3 + random() * 0.4, // 0.3-0.7
                color: this.generateParticleColor(random, dimensionConfig),
                alpha: 0.6 + random() * 0.4, // 0.6-1.0
                lifetime: 30 + Math.floor(random() * 50), // 30-80 ticks
                count: Math.floor(random() * 4) + 1, // 1-4 particles
                speed: 0.02 + random() * 0.08, // 0.02-0.1
                gravity: specialType.includes('float') ? 0 : 0.01 + random() * 0.09,
                collision: random() > 0.8,
                glow: true, // Special particles always glow
                trail: random() > 0.3
            };
            
            particles.push(particle);
            this.particleConfigs.set(particleId, particle);
        }
        
        return particles;
    }

    /**
     * Get special particle types based on dimension
     */
    private getSpecialParticleTypes(dimensionConfig: DimensionConfig): string[] {
        switch (dimensionConfig.generatorType) {
            case 'the_end':
                return ['portal_energy', 'crystal_burst', 'void_orb', 'ethereal_sphere'];
            case 'nether':
                return ['fire_burst', 'soul_orb', 'lava_bubble', 'inferno_spark'];
            case 'void':
                return ['void_orb', 'shadow_sphere', 'echo_bubble', 'empty_energy'];
            case 'floating_islands':
                return ['cloud_bubble', 'air_orb', 'sky_sparkle', 'float_energy'];
            case 'flat':
                return ['nature_orb', 'peace_sphere', 'calm_bubble', 'serene_spark'];
            case 'noise':
            default:
                return ['magic_orb', 'energy_bubble', 'sparkle_sphere', 'mystic_burst'];
        }
    }

    /**
     * Generate block particles
     */
    private generateBlockParticles(dimensionConfig: DimensionConfig, random: () => number): Map<string, ParticleConfig> {
        const blockParticles = new Map<string, ParticleConfig>();
        
        const blockTypes = this.getBlockParticleTypes(dimensionConfig);
        
        for (const blockType of blockTypes) {
            const particleId = `${this.namespace}:block_${blockType}_${Math.floor(random() * 1000)}`;
            
            const particle: ParticleConfig = {
                id: particleId,
                name: `${dimensionConfig.name} Block ${blockType}`,
                type: blockType,
                material: this.getParticleMaterial(blockType, dimensionConfig),
                size: 0.2 + random() * 0.3, // 0.2-0.5
                color: this.generateParticleColor(random, dimensionConfig),
                alpha: 0.5 + random() * 0.5, // 0.5-1.0
                lifetime: 10 + Math.floor(random() * 20), // 10-30 ticks
                count: Math.floor(random() * 3) + 1, // 1-3 particles
                speed: 0.1 + random() * 0.2, // 0.1-0.3
                gravity: 0.1 + random() * 0.2, // 0.1-0.3
                collision: true,
                glow: random() > 0.7,
                trail: false
            };
            
            blockParticles.set(blockType, particle);
            this.particleConfigs.set(particleId, particle);
        }
        
        return blockParticles;
    }

    /**
     * Get block particle types based on dimension
     */
    private getBlockParticleTypes(dimensionConfig: DimensionConfig): string[] {
        switch (dimensionConfig.generatorType) {
            case 'the_end':
                return ['end_stone', 'obsidian', 'crystal', 'purpur'];
            case 'nether':
                return ['netherrack', 'soul_sand', 'nether_brick', 'basalt'];
            case 'void':
                return ['void_stone', 'empty_block', 'crystal_block'];
            case 'floating_islands':
                return ['cloud_block', 'sky_stone', 'air_crystal'];
            case 'flat':
                return ['grass_block', 'dirt', 'stone', 'sand'];
            case 'noise':
            default:
                return ['stone', 'dirt', 'grass_block', 'wood'];
        }
    }

    /**
     * Generate entity particles
     */
    private generateEntityParticles(dimensionConfig: DimensionConfig, random: () => number): Map<string, ParticleConfig> {
        const entityParticles = new Map<string, ParticleConfig>();
        
        const entityTypes = this.getEntityParticleTypes(dimensionConfig);
        
        for (const entityType of entityTypes) {
            const particleId = `${this.namespace}:entity_${entityType}_${Math.floor(random() * 1000)}`;
            
            const particle: ParticleConfig = {
                id: particleId,
                name: `${dimensionConfig.name} Entity ${entityType}`,
                type: entityType,
                material: this.getParticleMaterial(entityType, dimensionConfig),
                size: 0.15 + random() * 0.25, // 0.15-0.4
                color: this.generateParticleColor(random, dimensionConfig),
                alpha: 0.4 + random() * 0.4, // 0.4-0.8
                lifetime: 15 + Math.floor(random() * 25), // 15-40 ticks
                count: Math.floor(random() * 2) + 1, // 1-2 particles
                speed: 0.05 + random() * 0.15, // 0.05-0.2
                gravity: 0.01 + random() * 0.09,
                collision: false,
                glow: random() > 0.6,
                trail: random() > 0.5
            };
            
            entityParticles.set(entityType, particle);
            this.particleConfigs.set(particleId, particle);
        }
        
        return entityParticles;
    }

    /**
     * Get entity particle types based on dimension
     */
    private getEntityParticleTypes(dimensionConfig: DimensionConfig): string[] {
        switch (dimensionConfig.generatorType) {
            case 'the_end':
                return ['enderman', 'shulker', 'endermite', 'phantom'];
            case 'nether':
                return ['piglin', 'ghast', 'blaze', 'wither_skeleton'];
            case 'void':
                return ['void_walker', 'shadow_creature', 'echo_being'];
            case 'floating_islands':
                return ['sky_whale', 'cloud_spirit', 'air_elemental'];
            case 'flat':
                return ['villager', 'cow', 'pig', 'sheep'];
            case 'noise':
            default:
                return ['zombie', 'skeleton', 'spider', 'creeper'];
        }
    }

    /**
     * Generate particle effects
     */
    private generateParticleEffects(dimensionConfig: DimensionConfig, random: () => number): ParticleEffect[] {
        const effects: ParticleEffect[] = [];
        
        const effectTypes = ['burst', 'stream', 'cloud', 'trail', 'explosion'];
        const effectCount = Math.floor(random() * 3) + 1; // 1-3 effects
        
        for (let i = 0; i < effectCount; i++) {
            const effectType = effectTypes[Math.floor(random() * effectTypes.length)];
            const effectId = `${this.namespace}:effect_${effectType}_${Math.floor(random() * 1000)}`;
            
            const particles = this.generateEffectParticles(effectType, dimensionConfig, random);
            
            const effect: ParticleEffect = {
                id: effectId,
                name: `${dimensionConfig.name} ${effectType} Effect`,
                type: effectType as ParticleEffect['type'],
                particles,
                config: this.generateEffectConfig(effectType, random, dimensionConfig)
            };
            
            effects.push(effect);
        }
        
        return effects;
    }

    /**
     * Generate effect particles
     */
    private generateEffectParticles(effectType: string, dimensionConfig: DimensionConfig, random: () => number): string[] {
        const particleCount = Math.floor(random() * 3) + 1; // 1-3 particles
        const particles: string[] = [];
        
        for (let i = 0; i < particleCount; i++) {
            const particleId = `${this.namespace}:effect_${effectType}_particle_${Math.floor(random() * 1000)}`;
            particles.push(particleId);
        }
        
        return particles;
    }

    /**
     * Generate effect configuration
     */
    private generateEffectConfig(effectType: string, random: () => number, dimensionConfig: DimensionConfig): ParticleEffectConfig {
        const baseConfig = {
            duration: 20 + Math.floor(random() * 60), // 20-80 ticks
            radius: 1 + random() * 4, // 1-5 blocks
            intensity: 0.3 + random() * 0.7, // 0.3-1.0
            color: this.generateParticleColor(random, dimensionConfig),
            alpha: 0.4 + random() * 0.4, // 0.4-0.8
            size: 0.2 + random() * 0.6, // 0.2-0.8
            speed: 0.05 + random() * 0.15 // 0.05-0.2
        };
        
        // Adjust based on effect type
        switch (effectType) {
            case 'burst':
                return { ...baseConfig, duration: 10, intensity: 1.0, speed: 0.3 };
            case 'stream':
                return { ...baseConfig, duration: 60, radius: 0.5, speed: 0.1 };
            case 'cloud':
                return { ...baseConfig, duration: 40, radius: 3, speed: 0.02 };
            case 'trail':
                return { ...baseConfig, duration: 30, radius: 0.3, speed: 0.15 };
            case 'explosion':
                return { ...baseConfig, duration: 15, intensity: 1.0, speed: 0.5 };
            default:
                return baseConfig;
        }
    }

    /**
     * Get dimension particle profile
     */
    public getDimensionProfile(dimensionId: string): DimensionParticleProfile | null {
        return this.dimensionProfiles.get(dimensionId) || null;
    }

    /**
     * Get particle configuration
     */
    public getParticleConfig(particleId: string): ParticleConfig | null {
        return this.particleConfigs.get(particleId) || null;
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
     * Get particle system statistics
     */
    public getStatistics(): any {
        return {
            totalParticles: this.particleConfigs.size,
            dimensionProfiles: this.dimensionProfiles.size,
            averageParticlesPerDimension: this.dimensionProfiles.size > 0 ? 
                Array.from(this.dimensionProfiles.values()).reduce((sum, profile) => 
                    sum + profile.ambientParticles.length + profile.weatherParticles.length + 
                    profile.specialParticles.length, 0) / this.dimensionProfiles.size : 0
        };
    }

    /**
     * Clear all particle data
     */
    public clearParticles(): void {
        this.particleConfigs.clear();
        this.dimensionProfiles.clear();
        this.logger.info('All particle data cleared');
    }
}

// Singleton instance for global access
let globalParticleSystem: ParticleSystem | null = null;

/**
 * Get global particle system instance
 */
export function getParticleSystem(): ParticleSystem {
    if (!globalParticleSystem) {
        globalParticleSystem = new ParticleSystem();
    }
    return globalParticleSystem;
}
