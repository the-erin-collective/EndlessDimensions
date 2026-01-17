import { Logger } from '../utils/Logger';
import { DimensionConfig } from '../types/DimensionConfig';

// Type definitions for sound system
interface SoundConfig {
    id: string;
    name: string;
    category: 'ambient' | 'music' | 'mood' | 'weather' | 'block' | 'entity';
    volume: number;
    pitch: number;
    weight: number;
    stream: boolean;
    attenuation_distance: number;
    subtitle?: string;
}

interface DimensionSoundProfile {
    dimensionId: string;
    ambientSounds: SoundConfig[];
    musicTracks: SoundConfig[];
    moodSounds: SoundConfig[];
    weatherSounds: SoundConfig[];
    blockSounds: Map<string, SoundConfig>;
    entitySounds: Map<string, SoundConfig>;
    soundEvents: SoundEvent[];
}

interface SoundEvent {
    id: string;
    name: string;
    sounds: string[];
    category: string;
    replace: boolean;
    subtitle?: string;
}

/**
 * Advanced Sound System - Dimension-specific audio with dynamic sound generation
 * Creates immersive audio experiences tailored to each dimension's characteristics
 */
export class SoundSystem {
    private logger: Logger;
    private namespace: string;
    private soundConfigs: Map<string, SoundConfig> = new Map();
    private dimensionProfiles: Map<string, DimensionSoundProfile> = new Map();
    private soundRegistry: Map<string, SoundEvent> = new Map();

    constructor(namespace: string = 'endlessdimensions') {
        this.logger = new Logger('SoundSystem');
        this.namespace = namespace;
    }

    /**
     * Generate sound profile for a dimension
     */
    public generateDimensionSounds(dimensionConfig: DimensionConfig, seed: number): DimensionSoundProfile {
        try {
            this.logger.info(`Generating sound profile for dimension: ${dimensionConfig.id}`);
            
            const random = this.createSeededRandom(seed);
            
            // Generate ambient sounds
            const ambientSounds = this.generateAmbientSounds(dimensionConfig, random);
            
            // Generate music tracks
            const musicTracks = this.generateMusicTracks(dimensionConfig, random);
            
            // Generate mood sounds
            const moodSounds = this.generateMoodSounds(dimensionConfig, random);
            
            // Generate weather sounds
            const weatherSounds = this.generateWeatherSounds(dimensionConfig, random);
            
            // Generate block sounds
            const blockSounds = this.generateBlockSounds(dimensionConfig, random);
            
            // Generate entity sounds
            const entitySounds = this.generateEntitySounds(dimensionConfig, random);
            
            // Generate sound events
            const soundEvents = this.generateSoundEvents(dimensionConfig, random);
            
            const profile: DimensionSoundProfile = {
                dimensionId: dimensionConfig.id,
                ambientSounds,
                musicTracks,
                moodSounds,
                weatherSounds,
                blockSounds,
                entitySounds,
                soundEvents
            };
            
            // Store profile
            this.dimensionProfiles.set(dimensionConfig.id, profile);
            
            this.logger.info(`Generated sound profile for dimension ${dimensionConfig.id}`);
            return profile;
            
        } catch (error) {
            this.logger.error(`Failed to generate sound profile for dimension ${dimensionConfig.id}:`, error);
            throw error;
        }
    }

    /**
     * Generate ambient sounds
     */
    private generateAmbientSounds(dimensionConfig: DimensionConfig, random: () => number): SoundConfig[] {
        const sounds: SoundConfig[] = [];
        
        const ambientTypes = this.getAmbientSoundTypes(dimensionConfig);
        const soundCount = Math.floor(random() * 3) + 1; // 1-3 ambient sounds
        
        for (let i = 0; i < soundCount; i++) {
            const soundType = ambientTypes[Math.floor(random() * ambientTypes.length)];
            const soundId = `${this.namespace}:ambient_${soundType}_${Math.floor(random() * 1000)}`;
            
            const sound: SoundConfig = {
                id: soundId,
                name: `${dimensionConfig.name} Ambient ${soundType}`,
                category: 'ambient',
                volume: 0.3 + random() * 0.4, // 0.3-0.7
                pitch: 0.8 + random() * 0.4, // 0.8-1.2
                weight: Math.floor(random() * 100) + 1,
                stream: false,
                attenuation_distance: 16 + Math.floor(random() * 16), // 16-32
                subtitle: `Ambient ${soundType}`
            };
            
            sounds.push(sound);
            this.soundConfigs.set(soundId, sound);
        }
        
        return sounds;
    }

    /**
     * Get ambient sound types based on dimension
     */
    private getAmbientSoundTypes(dimensionConfig: DimensionConfig): string[] {
        switch (dimensionConfig.generatorType) {
            case 'the_end':
                return ['wind', 'crystal', 'void', 'ethereal'];
            case 'nether':
                return ['fire', 'lava', 'soul', 'demonic'];
            case 'void':
                return ['silence', 'whisper', 'echo', 'empty'];
            case 'floating_islands':
                return ['wind', 'cloud', 'sky', 'airy'];
            case 'flat':
                return ['wind', 'plains', 'calm', 'peaceful'];
            case 'noise':
            default:
                return ['wind', 'nature', 'forest', 'wilderness'];
        }
    }

    /**
     * Generate music tracks
     */
    private generateMusicTracks(dimensionConfig: DimensionConfig, random: () => number): SoundConfig[] {
        const tracks: SoundConfig[] = [];
        
        const musicTypes = this.getMusicTypes(dimensionConfig);
        const trackCount = Math.floor(random() * 2) + 1; // 1-2 music tracks
        
        for (let i = 0; i < trackCount; i++) {
            const musicType = musicTypes[Math.floor(random() * musicTypes.length)];
            const trackId = `${this.namespace}:music_${musicType}_${Math.floor(random() * 1000)}`;
            
            const track: SoundConfig = {
                id: trackId,
                name: `${dimensionConfig.name} Music ${musicType}`,
                category: 'music',
                volume: 0.4 + random() * 0.3, // 0.4-0.7
                pitch: 0.9 + random() * 0.2, // 0.9-1.1
                weight: Math.floor(random() * 50) + 1,
                stream: true,
                attenuation_distance: 0, // Music plays everywhere
                subtitle: `Music: ${musicType}`
            };
            
            tracks.push(track);
            this.soundConfigs.set(trackId, track);
        }
        
        return tracks;
    }

    /**
     * Get music types based on dimension
     */
    private getMusicTypes(dimensionConfig: DimensionConfig): string[] {
        switch (dimensionConfig.generatorType) {
            case 'the_end':
                return ['mysterious', 'cosmic', 'ethereal', 'otherworldly'];
            case 'nether':
                return ['hellish', 'intense', 'dramatic', 'ominous'];
            case 'void':
                return ['minimal', 'ambient', 'meditative', 'empty'];
            case 'floating_islands':
                return ['peaceful', 'majestic', 'airy', 'serene'];
            case 'flat':
                return ['calm', 'peaceful', 'serene', 'gentle'];
            case 'noise':
            default:
                return ['adventurous', 'exploration', 'nature', 'mysterious'];
        }
    }

    /**
     * Generate mood sounds
     */
    private generateMoodSounds(dimensionConfig: DimensionConfig, random: () => number): SoundConfig[] {
        const sounds: SoundConfig[] = [];
        
        const moodTypes = this.getMoodSoundTypes(dimensionConfig);
        const soundCount = Math.floor(random() * 2) + 1; // 1-2 mood sounds
        
        for (let i = 0; i < soundCount; i++) {
            const moodType = moodTypes[Math.floor(random() * moodTypes.length)];
            const soundId = `${this.namespace}:mood_${moodType}_${Math.floor(random() * 1000)}`;
            
            const sound: SoundConfig = {
                id: soundId,
                name: `${dimensionConfig.name} Mood ${moodType}`,
                category: 'mood',
                volume: 0.2 + random() * 0.3, // 0.2-0.5
                pitch: 0.7 + random() * 0.6, // 0.7-1.3
                weight: Math.floor(random() * 80) + 1,
                stream: false,
                attenuation_distance: 32 + Math.floor(random() * 32), // 32-64
                subtitle: `Mood: ${moodType}`
            };
            
            sounds.push(sound);
            this.soundConfigs.set(soundId, sound);
        }
        
        return sounds;
    }

    /**
     * Get mood sound types based on dimension
     */
    private getMoodSoundTypes(dimensionConfig: DimensionConfig): string[] {
        switch (dimensionConfig.generatorType) {
            case 'the_end':
                return ['eerie', 'haunting', 'mysterious', 'unsettling'];
            case 'nether':
                return ['ominous', 'threatening', 'dangerous', 'sinister'];
            case 'void':
                return ['empty', 'lonely', 'isolated', 'silent'];
            case 'floating_islands':
                return ['peaceful', 'serene', 'calm', 'tranquil'];
            case 'flat':
                return ['peaceful', 'calm', 'serene', 'gentle'];
            case 'noise':
            default:
                return ['mysterious', 'adventurous', 'curious', 'exploratory'];
        }
    }

    /**
     * Generate weather sounds
     */
    private generateWeatherSounds(dimensionConfig: DimensionConfig, random: () => number): SoundConfig[] {
        const sounds: SoundConfig[] = [];
        
        const weatherTypes = this.getWeatherSoundTypes(dimensionConfig);
        const soundCount = Math.floor(random() * 2); // 0-1 weather sounds
        
        for (let i = 0; i < soundCount; i++) {
            const weatherType = weatherTypes[Math.floor(random() * weatherTypes.length)];
            const soundId = `${this.namespace}:weather_${weatherType}_${Math.floor(random() * 1000)}`;
            
            const sound: SoundConfig = {
                id: soundId,
                name: `${dimensionConfig.name} Weather ${weatherType}`,
                category: 'weather',
                volume: 0.5 + random() * 0.3, // 0.5-0.8
                pitch: 0.9 + random() * 0.2, // 0.9-1.1
                weight: Math.floor(random() * 60) + 1,
                stream: false,
                attenuation_distance: 64 + Math.floor(random() * 64), // 64-128
                subtitle: `Weather: ${weatherType}`
            };
            
            sounds.push(sound);
            this.soundConfigs.set(soundId, sound);
        }
        
        return sounds;
    }

    /**
     * Get weather sound types based on dimension
     */
    private getWeatherSoundTypes(dimensionConfig: DimensionConfig): string[] {
        switch (dimensionConfig.generatorType) {
            case 'the_end':
                return ['void_wind', 'crystal_rain', 'ethereal_storm'];
            case 'nether':
                return ['ash_fall', 'lava_rain', 'soul_storm'];
            case 'void':
                return ['silence', 'echo_wind', 'empty_space'];
            case 'floating_islands':
                return ['sky_wind', 'cloud_drift', 'air_current'];
            case 'flat':
                return ['gentle_wind', 'calm_breeze', 'peaceful_air'];
            case 'noise':
            default:
                return ['wind', 'rain', 'thunder', 'storm'];
        }
    }

    /**
     * Generate block sounds
     */
    private generateBlockSounds(dimensionConfig: DimensionConfig, random: () => number): Map<string, SoundConfig> {
        const blockSounds = new Map<string, SoundConfig>();
        
        const blockTypes = this.getBlockTypes(dimensionConfig);
        
        for (const blockType of blockTypes) {
            const soundId = `${this.namespace}:block_${blockType}_${Math.floor(random() * 1000)}`;
            
            const sound: SoundConfig = {
                id: soundId,
                name: `${dimensionConfig.name} Block ${blockType}`,
                category: 'block',
                volume: 0.6 + random() * 0.3, // 0.6-0.9
                pitch: 0.8 + random() * 0.4, // 0.8-1.2
                weight: Math.floor(random() * 40) + 1,
                stream: false,
                attenuation_distance: 16,
                subtitle: `Block: ${blockType}`
            };
            
            blockSounds.set(blockType, sound);
            this.soundConfigs.set(soundId, sound);
        }
        
        return blockSounds;
    }

    /**
     * Get block types based on dimension
     */
    private getBlockTypes(dimensionConfig: DimensionConfig): string[] {
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
     * Generate entity sounds
     */
    private generateEntitySounds(dimensionConfig: DimensionConfig, random: () => number): Map<string, SoundConfig> {
        const entitySounds = new Map<string, SoundConfig>();
        
        const entityTypes = this.getEntityTypes(dimensionConfig);
        
        for (const entityType of entityTypes) {
            const soundId = `${this.namespace}:entity_${entityType}_${Math.floor(random() * 1000)}`;
            
            const sound: SoundConfig = {
                id: soundId,
                name: `${dimensionConfig.name} Entity ${entityType}`,
                category: 'entity',
                volume: 0.7 + random() * 0.3, // 0.7-1.0
                pitch: 0.7 + random() * 0.6, // 0.7-1.3
                weight: Math.floor(random() * 30) + 1,
                stream: false,
                attenuation_distance: 32,
                subtitle: `Entity: ${entityType}`
            };
            
            entitySounds.set(entityType, sound);
            this.soundConfigs.set(soundId, sound);
        }
        
        return entitySounds;
    }

    /**
     * Get entity types based on dimension
     */
    private getEntityTypes(dimensionConfig: DimensionConfig): string[] {
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
     * Generate sound events
     */
    private generateSoundEvents(dimensionConfig: DimensionConfig, random: () => number): SoundEvent[] {
        const events: SoundEvent[] = [];
        
        // Generate events for each category
        const categories = ['ambient', 'music', 'mood', 'weather', 'block', 'entity'];
        
        for (const category of categories) {
            const eventCount = Math.floor(random() * 2) + 1; // 1-2 events per category
            
            for (let i = 0; i < eventCount; i++) {
                const eventId = `${this.namespace}:${category}.${dimensionConfig.id}_${Math.floor(random() * 1000)}`;
                const sounds = this.generateSoundList(category, dimensionConfig, random);
                
                const event: SoundEvent = {
                    id: eventId,
                    name: `${dimensionConfig.name} ${category} Event ${i}`,
                    sounds,
                    category,
                    replace: false,
                    subtitle: `${dimensionConfig.name} ${category}`
                };
                
                events.push(event);
                this.soundRegistry.set(eventId, event);
            }
        }
        
        return events;
    }

    /**
     * Generate sound list for event
     */
    private generateSoundList(category: string, dimensionConfig: DimensionConfig, random: () => number): string[] {
        const sounds: string[] = [];
        const soundCount = Math.floor(random() * 3) + 1; // 1-3 sounds
        
        for (let i = 0; i < soundCount; i++) {
            const soundId = `${this.namespace}:${category}_${dimensionConfig.id}_${Math.floor(random() * 1000)}`;
            sounds.push(soundId);
        }
        
        return sounds;
    }

    /**
     * Get dimension sound profile
     */
    public getDimensionProfile(dimensionId: string): DimensionSoundProfile | null {
        return this.dimensionProfiles.get(dimensionId) || null;
    }

    /**
     * Get sound configuration
     */
    public getSoundConfig(soundId: string): SoundConfig | null {
        return this.soundConfigs.get(soundId) || null;
    }

    /**
     * Get sound event
     */
    public getSoundEvent(eventId: string): SoundEvent | null {
        return this.soundRegistry.get(eventId) || null;
    }

    /**
     * Generate JSON files for datapack
     */
    public async generateDatapackFiles(profile: DimensionSoundProfile): Promise<{ [key: string]: any }> {
        const files: { [key: string]: any } = {};
        
        // Generate sound definitions
        const soundDefinitions: { [key: string]: any } = {};
        
        // Add all sounds from the profile
        for (const sound of profile.ambientSounds) {
            soundDefinitions[sound.id] = this.generateSoundDefinition(sound);
        }
        
        for (const sound of profile.musicTracks) {
            soundDefinitions[sound.id] = this.generateSoundDefinition(sound);
        }
        
        for (const sound of profile.moodSounds) {
            soundDefinitions[sound.id] = this.generateSoundDefinition(sound);
        }
        
        for (const sound of profile.weatherSounds) {
            soundDefinitions[sound.id] = this.generateSoundDefinition(sound);
        }
        
        for (const [blockType, sound] of profile.blockSounds) {
            soundDefinitions[sound.id] = this.generateSoundDefinition(sound);
        }
        
        for (const [entityType, sound] of profile.entitySounds) {
            soundDefinitions[sound.id] = this.generateSoundDefinition(sound);
        }
        
        // Generate sound events file
        files[`assets/${this.namespace}/sounds.json`] = soundDefinitions;
        
        // Generate individual sound event files
        for (const event of profile.soundEvents) {
            files[`assets/${this.namespace}/sounds/${event.category}/${event.id.replace(`${this.namespace}:`, '')}.json`] = {
                sounds: event.sounds.map(sound => ({ name: sound })),
                subtitle: event.subtitle
            };
        }
        
        return files;
    }

    /**
     * Generate sound definition
     */
    private generateSoundDefinition(sound: SoundConfig): any {
        return {
            category: sound.category,
            sounds: [
                {
                    name: sound.id,
                    stream: sound.stream,
                    volume: sound.volume,
                    pitch: sound.pitch,
                    weight: sound.weight,
                    attenuation_distance: sound.attenuation_distance
                }
            ],
            subtitle: sound.subtitle
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
     * Get sound system statistics
     */
    public getStatistics(): any {
        return {
            totalSounds: this.soundConfigs.size,
            totalSoundEvents: this.soundRegistry.size,
            dimensionProfiles: this.dimensionProfiles.size,
            averageSoundsPerDimension: this.dimensionProfiles.size > 0 ? 
                Array.from(this.dimensionProfiles.values()).reduce((sum, profile) => 
                    sum + profile.ambientSounds.length + profile.musicTracks.length + 
                    profile.moodSounds.length + profile.weatherSounds.length, 0) / this.dimensionProfiles.size : 0
        };
    }

    /**
     * Clear all sound data
     */
    public clearSounds(): void {
        this.soundConfigs.clear();
        this.dimensionProfiles.clear();
        this.soundRegistry.clear();
        this.logger.info('All sound data cleared');
    }
}

// Singleton instance for global access
let globalSoundSystem: SoundSystem | null = null;

/**
 * Get global sound system instance
 */
export function getSoundSystem(): SoundSystem {
    if (!globalSoundSystem) {
        globalSoundSystem = new SoundSystem();
    }
    return globalSoundSystem;
}
