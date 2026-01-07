/// <reference types="@epi-studio/moud-sdk" />
import { Logger } from '../utils/Logger';
import { getCentralizedStateManager } from '../core/CentralizedStateManager';

// Type definitions for audio system
interface Vec3 {
  x: number;
  y: number;
  z: number;
}

interface AudioConfig {
  soundId: string;
  volume: number;
  pitch: number;
  loop: boolean;
  fadeDuration?: number;
  distance?: number;
  category?: 'master' | 'music' | 'record' | 'weather' | 'block' | 'hostile' | 'neutral' | 'player' | 'ambient' | 'voice';
}

interface DimensionAudioProfile {
  id: string;
  name: string;
  ambient: AudioConfig;
  music: AudioConfig;
  effects: AudioConfig[];
  transitions: {
    enter: AudioConfig;
    exit: AudioConfig;
  };
  weather: {
    rain: AudioConfig;
    thunder: AudioConfig;
    wind: AudioConfig;
  };
}

interface AudioRegion {
  id: string;
  dimension: string;
  center: Vec3;
  radius: number;
  audioProfile: string;
  isActive: boolean;
  players: Set<string>;
}

interface ActiveSound {
  id: string;
  playerId?: string;
  soundId: string;
  position: Vec3;
  config: AudioConfig;
  startTime: number;
  duration?: number;
  isLooping: boolean;
}

interface AudioStatistics {
  totalSoundsPlayed: number;
  activeSounds: number;
  activeRegions: number;
  dimensionProfiles: number;
  averagePlayTime: number;
  lastPlayTime: number;
}

/**
 * Maudio Integration - Use Maudio library for dimension-specific ambient sounds and audio effects
 * Provides comprehensive spatial audio system for dimension immersion
 */
export class MaudioIntegration {
  private logger: Logger;
  private stateManager: any;
  private dimensionProfiles: Map<string, DimensionAudioProfile> = new Map();
  private audioRegions: Map<string, AudioRegion> = new Map();
  private activeSounds: Map<string, ActiveSound> = new Map();
  private playerAudioStates: Map<string, Set<string>> = new Map();
  private isInitialized: boolean = false;
  private audioEngine: any; // Maudio instance
  private maxDistance: number = 64; // 64 block audio range
  private updateInterval: number = 1000; // 1 second update interval
  private statistics: AudioStatistics;

  constructor() {
    this.logger = new Logger('MaudioIntegration');
    this.stateManager = getCentralizedStateManager();
    this.statistics = {
      totalSoundsPlayed: 0,
      activeSounds: 0,
      activeRegions: 0,
      dimensionProfiles: 0,
      averagePlayTime: 0,
      lastPlayTime: 0
    };
  }

  /**
   * Initialize Maudio integration
   */
  public async initialize(): Promise<void> {
    try {
      // Initialize Maudio engine
      await this.initializeAudioEngine();

      // Initialize dimension audio profiles
      this.initializeDimensionProfiles();

      // Subscribe to state changes
      this.subscribeToStateChanges();

      // Start audio update loop
      this.startAudioUpdateLoop();

      this.isInitialized = true;
      this.logger.info('MaudioIntegration initialized successfully');

    } catch (error) {
      this.logger.error('Failed to initialize MaudioIntegration:', error);
      throw error;
    }
  }

  /**
   * Initialize audio engine
   */
  private async initializeAudioEngine(): Promise<void> {
    try {
      // Try to import Maudio (assuming it's available)
      try {
        const Maudio = require('maudio');
        this.audioEngine = new Maudio({
          maxDistance: this.maxDistance,
          spatialAudio: true,
          dopplerEffect: true,
          reverb: true
        });
        
        this.logger.info('Maudio engine initialized successfully');
      } catch (importError) {
        this.logger.warn('Maudio library not found, using fallback audio system');
        this.initializeFallbackAudio();
      }

    } catch (error) {
      this.logger.error('Failed to initialize audio engine:', error);
      throw error;
    }
  }

  /**
   * Initialize fallback audio system
   */
  private initializeFallbackAudio(): void {
    try {
      this.audioEngine = {
        playSound: (soundId: string, config: any) => {
          // Use Minecraft's built-in audio commands
          const command = this.buildMinecraftAudioCommand(soundId, config);
          if (api.server && api.server.executeCommand) {
            api.server.executeCommand(command);
          }
        },
        stopSound: (soundId: string) => {
          const command = `/stopsound @a ${soundId}`;
          if (api.server && api.server.executeCommand) {
            api.server.executeCommand(command);
          }
        },
        setVolume: (volume: number) => {
          const command = `/volume @a ${volume}`;
          if (api.server && api.server.executeCommand) {
            api.server.executeCommand(command);
          }
        }
      };

      this.logger.info('Fallback audio system initialized');
    } catch (error) {
      this.logger.error('Failed to initialize fallback audio:', error);
    }
  }

  /**
   * Build Minecraft audio command
   */
  private buildMinecraftAudioCommand(soundId: string, config: AudioConfig): string {
    const position = config.position || { x: 0, y: 0, z: 0 };
    const volume = config.volume || 1.0;
    const pitch = config.pitch || 1.0;
    const category = config.category || 'master';
    
    let command = `/playsound ${soundId} ${category}`;
    
    if (config.position) {
      command += ` ${position.x} ${position.y} ${position.z}`;
    } else {
      command += ` @a`;
    }
    
    command += ` ${volume} ${pitch}`;
    
    if (config.minDistance) {
      command += ` ${config.minDistance}`;
    }
    
    return command;
  }

  /**
   * Initialize dimension audio profiles
   */
  private initializeDimensionProfiles(): void {
    try {
      // Overworld profile
      this.dimensionProfiles.set('overworld', {
        id: 'overworld',
        name: 'Overworld',
        ambient: {
          soundId: 'minecraft:ambient.cave',
          volume: 0.3,
          pitch: 1.0,
          loop: true,
          category: 'ambient'
        },
        music: {
          soundId: 'minecraft:music.game',
          volume: 0.4,
          pitch: 1.0,
          loop: true,
          category: 'music'
        },
        effects: [],
        transitions: {
          enter: {
            soundId: 'minecraft:block.portal.ambient',
            volume: 0.8,
            pitch: 1.0,
            loop: false,
            category: 'block'
          },
          exit: {
            soundId: 'minecraft:block.portal.ambient',
            volume: 0.8,
            pitch: 1.0,
            loop: false,
            category: 'block'
          }
        },
        weather: {
          rain: {
            soundId: 'minecraft:weather.rain',
            volume: 0.5,
            pitch: 1.0,
            loop: true,
            category: 'weather'
          },
          thunder: {
            soundId: 'minecraft:entity.lightning_bolt.thunder',
            volume: 0.8,
            pitch: 1.0,
            loop: false,
            category: 'weather'
          },
          wind: {
            soundId: 'minecraft:ambient.weather.thunder',
            volume: 0.2,
            pitch: 1.0,
            loop: true,
            category: 'weather'
          }
        }
      });

      // Nether profile
      this.dimensionProfiles.set('nether', {
        id: 'nether',
        name: 'Nether',
        ambient: {
          soundId: 'minecraft:ambient.nether_wastes',
          volume: 0.4,
          pitch: 1.0,
          loop: true,
          category: 'ambient'
        },
        music: {
          soundId: 'minecraft:music.nether',
          volume: 0.4,
          pitch: 1.0,
          loop: true,
          category: 'music'
        },
        effects: [
          {
            soundId: 'minecraft:block.lava.ambient',
            volume: 0.3,
            pitch: 1.0,
            loop: true,
            category: 'block'
          },
          {
            soundId: 'minecraft:entity.ghast.ambient',
            volume: 0.2,
            pitch: 1.0,
            loop: false,
            category: 'hostile'
          }
        ],
        transitions: {
          enter: {
            soundId: 'minecraft:block.portal.travel',
            volume: 0.8,
            pitch: 1.0,
            loop: false,
            category: 'block'
          },
          exit: {
            soundId: 'minecraft:block.portal.travel',
            volume: 0.8,
            pitch: 1.0,
            loop: false,
            category: 'block'
          }
        },
        weather: {
          rain: { soundId: '', volume: 0, pitch: 1.0, loop: false },
          thunder: { soundId: '', volume: 0, pitch: 1.0, loop: false },
          wind: {
            soundId: 'minecraft:ambient.nether_wastes',
            volume: 0.3,
            pitch: 1.0,
            loop: true,
            category: 'ambient'
          }
        }
      });

      // End profile
      this.dimensionProfiles.set('end', {
        id: 'end',
        name: 'The End',
        ambient: {
          soundId: 'minecraft:ambient.end_loop',
          volume: 0.5,
          pitch: 1.0,
          loop: true,
          category: 'ambient'
        },
        music: {
          soundId: 'minecraft:music.end',
          volume: 0.4,
          pitch: 1.0,
          loop: true,
          category: 'music'
        },
        effects: [
          {
            soundId: 'minecraft:entity.ender_dragon.ambient',
            volume: 0.3,
            pitch: 1.0,
            loop: false,
            category: 'hostile'
          },
          {
            soundId: 'minecraft:entity.ender_eye.death',
            volume: 0.2,
            pitch: 1.0,
            loop: false,
            category: 'hostile'
          }
        ],
        transitions: {
          enter: {
            soundId: 'minecraft:block.portal.end',
            volume: 0.8,
            pitch: 1.0,
            loop: false,
            category: 'block'
          },
          exit: {
            soundId: 'minecraft:block.portal.end',
            volume: 0.8,
            pitch: 1.0,
            loop: false,
            category: 'block'
          }
        },
        weather: {
          rain: { soundId: '', volume: 0, pitch: 1.0, loop: false },
          thunder: { soundId: '', volume: 0, pitch: 1.0, loop: false },
          wind: {
            soundId: 'minecraft:ambient.end_loop',
            volume: 0.4,
            pitch: 1.0,
            loop: true,
            category: 'ambient'
          }
        }
      });

      // Custom dimension profile template
      this.dimensionProfiles.set('custom', {
        id: 'custom',
        name: 'Custom Dimension',
        ambient: {
          soundId: 'minecraft:ambient.crimson_forest',
          volume: 0.3,
          pitch: 1.0,
          loop: true,
          category: 'ambient'
        },
        music: {
          soundId: 'minecraft:music.creative',
          volume: 0.4,
          pitch: 1.0,
          loop: true,
          category: 'music'
        },
        effects: [],
        transitions: {
          enter: {
            soundId: 'minecraft:block.enchantment_table.use',
            volume: 0.8,
            pitch: 1.0,
            loop: false,
            category: 'block'
          },
          exit: {
            soundId: 'minecraft:block.enchantment_table.use',
            volume: 0.8,
            pitch: 1.0,
            loop: false,
            category: 'block'
          }
        },
        weather: {
          rain: {
            soundId: 'minecraft:weather.rain',
            volume: 0.4,
            pitch: 1.2,
            loop: true,
            category: 'weather'
          },
          thunder: {
            soundId: 'minecraft:entity.lightning_bolt.thunder',
            volume: 0.6,
            pitch: 1.2,
            loop: false,
            category: 'weather'
          },
          wind: {
            soundId: 'minecraft:ambient.crimson_forest',
            volume: 0.3,
            pitch: 1.1,
            loop: true,
            category: 'ambient'
          }
        }
      });

      this.statistics.dimensionProfiles = this.dimensionProfiles.size;
      this.logger.info(`Initialized ${this.dimensionProfiles.size} dimension audio profiles`);
    } catch (error) {
      this.logger.error('Failed to initialize dimension profiles:', error);
    }
  }

  /**
   * Subscribe to state changes
   */
  private subscribeToStateChanges(): void {
    try {
      // Subscribe to player dimension changes
      this.stateManager.subscribe('players', (change) => {
        this.handlePlayerDimensionChange(change);
      }, {
        id: 'maudio_integration',
        priority: 7
      });

      // Subscribe to dimension creation
      this.stateManager.subscribe('dimensions', (change) => {
        this.handleDimensionCreation(change);
      }, {
        id: 'maudio_integration',
        priority: 7
      });

      this.logger.debug('Subscribed to state changes');
    } catch (error) {
      this.logger.error('Failed to subscribe to state changes:', error);
    }
  }

  /**
   * Handle player dimension changes
   */
  private handlePlayerDimensionChange(change: any): void {
    try {
      const { key, delta } = change;
      const playerData = delta.newValue;

      if (!playerData) return;

      const playerId = key;
      const currentDimension = playerData.dimension;
      const previousDimension = delta.oldValue?.dimension;

      // Handle dimension leave
      if (previousDimension && previousDimension !== currentDimension) {
        this.handlePlayerLeaveDimension(playerId, previousDimension);
      }

      // Handle dimension join
      if (currentDimension && currentDimension !== previousDimension) {
        this.handlePlayerJoinDimension(playerId, currentDimension);
      }

    } catch (error) {
      this.logger.error('Failed to handle player dimension change:', error);
    }
  }

  /**
   * Handle player leaving dimension
   */
  private handlePlayerLeaveDimension(playerId: string, dimensionId: string): void {
    try {
      // Stop dimension-specific audio
      this.stopDimensionAudio(playerId, dimensionId);

      // Play exit transition
      this.playTransitionSound(playerId, dimensionId, 'exit');

      // Update player audio state
      const playerState = this.playerAudioStates.get(playerId);
      if (playerState) {
        playerState.delete(dimensionId);
      }

    } catch (error) {
      this.logger.error('Failed to handle player leave dimension:', error);
    }
  }

  /**
   * Handle player joining dimension
   */
  private handlePlayerJoinDimension(playerId: string, dimensionId: string): void {
    try {
      // Update player audio state
      if (!this.playerAudioStates.has(playerId)) {
        this.playerAudioStates.set(playerId, new Set());
      }
      this.playerAudioStates.get(playerId)!.add(dimensionId);

      // Play enter transition
      this.playTransitionSound(playerId, dimensionId, 'enter');

      // Start dimension audio
      this.startDimensionAudio(playerId, dimensionId);

    } catch (error) {
      this.logger.error('Failed to handle player join dimension:', error);
    }
  }

  /**
   * Handle dimension creation
   */
  private handleDimensionCreation(change: any): void {
    try {
      const { delta } = change;

      if (delta.changeType === 'add') {
        const config = delta.newValue;
        if (config && config.id) {
          this.createDimensionAudioProfile(config);
        }
      } else if (delta.changeType === 'remove') {
        const config = delta.oldValue;
        if (config && config.id) {
          this.removeDimensionAudioProfile(config.id);
        }
      }
    } catch (error) {
      this.logger.error('Failed to handle dimension creation:', error);
    }
  }

  /**
   * Create dimension audio profile
   */
  private createDimensionAudioProfile(config: any): void {
    try {
      const profile: DimensionAudioProfile = {
        id: config.id,
        name: config.name,
        ambient: this.generateAmbientConfig(config),
        music: this.generateMusicConfig(config),
        effects: this.generateEffectConfigs(config),
        transitions: {
          enter: {
            soundId: 'minecraft:block.enchantment_table.use',
            volume: 0.8,
            pitch: 1.0,
            loop: false,
            category: 'block'
          },
          exit: {
            soundId: 'minecraft:block.enchantment_table.use',
            volume: 0.8,
            pitch: 1.0,
            loop: false,
            category: 'block'
          }
        },
        weather: {
          rain: {
            soundId: 'minecraft:weather.rain',
            volume: 0.4,
            pitch: 1.0,
            loop: true,
            category: 'weather'
          },
          thunder: {
            soundId: 'minecraft:entity.lightning_bolt.thunder',
            volume: 0.6,
            pitch: 1.0,
            loop: false,
            category: 'weather'
          },
          wind: {
            soundId: 'minecraft:ambient.crimson_forest',
            volume: 0.3,
            pitch: 1.0,
            loop: true,
            category: 'ambient'
          }
        }
      };

      this.dimensionProfiles.set(config.id, profile);
      this.statistics.dimensionProfiles = this.dimensionProfiles.size;

      this.logger.info(`Created audio profile for dimension: ${config.id}`);
    } catch (error) {
      this.logger.error('Failed to create dimension audio profile:', error);
    }
  }

  /**
   * Generate ambient config
   */
  private generateAmbientConfig(config: any): AudioConfig {
    try {
      const generatorType = config.generator?.type || 'noise';
      
      // Select ambient sound based on generator type
      const ambientSounds = {
        'noise': 'minecraft:ambient.cave',
        'flat': 'minecraft:ambient.plains',
        'void': 'minecraft:ambient.soul_sand_valley',
        'floating_islands': 'minecraft:ambient.crimson_forest',
        'the_end': 'minecraft:ambient.end_loop',
        'custom': 'minecraft:ambient.warped_forest'
      };

      return {
        soundId: ambientSounds[generatorType] || ambientSounds['custom'],
        volume: 0.3,
        pitch: 1.0,
        loop: true,
        category: 'ambient'
      };
    } catch (error) {
      this.logger.error('Failed to generate ambient config:', error);
      return {
        soundId: 'minecraft:ambient.cave',
        volume: 0.3,
        pitch: 1.0,
        loop: true,
        category: 'ambient'
      };
    }
  }

  /**
   * Generate music config
   */
  private generateMusicConfig(config: any): AudioConfig {
    try {
      const bookData = config.bookData;
      
      // Select music based on book content
      if (bookData) {
        const title = bookData.title?.toLowerCase() || '';
        
        if (title.includes('chaos') || title.includes('disorder')) {
          return {
            soundId: 'minecraft:misc.nether_travel',
            volume: 0.4,
            pitch: 1.0,
            loop: true,
            category: 'music'
          };
        } else if (title.includes('peace') || title.includes('calm')) {
          return {
            soundId: 'minecraft:music.game',
            volume: 0.4,
            pitch: 0.8,
            loop: true,
            category: 'music'
          };
        } else if (title.includes('end') || title.includes('void')) {
          return {
            soundId: 'minecraft:music.end',
            volume: 0.4,
            pitch: 1.0,
            loop: true,
            category: 'music'
          };
        }
      }

      // Default music
      return {
        soundId: 'minecraft:music.creative',
        volume: 0.4,
        pitch: 1.0,
        loop: true,
        category: 'music'
      };
    } catch (error) {
      this.logger.error('Failed to generate music config:', error);
      return {
        soundId: 'minecraft:music.creative',
        volume: 0.4,
        pitch: 1.0,
        loop: true,
        category: 'music'
      };
    }
  }

  /**
   * Generate effect configs
   */
  private generateEffectConfigs(config: any): AudioConfig[] {
    try {
      const effects: AudioConfig[] = [];
      const generatorType = config.generator?.type || 'noise';

      // Add generator-specific effects
      if (generatorType === 'void') {
        effects.push({
          soundId: 'minecraft:ambient.warped_forest',
          volume: 0.2,
          pitch: 0.5,
          loop: true,
          category: 'ambient'
        });
      } else if (generatorType === 'floating_islands') {
        effects.push({
          soundId: 'minecraft:entity.parrot.ambient',
          volume: 0.1,
          pitch: 1.0,
          loop: false,
          category: 'neutral'
        });
      }

      return effects;
    } catch (error) {
      this.logger.error('Failed to generate effect configs:', error);
      return [];
    }
  }

  /**
   * Remove dimension audio profile
   */
  private removeDimensionAudioProfile(dimensionId: string): void {
    try {
      this.dimensionProfiles.delete(dimensionId);
      this.statistics.dimensionProfiles = this.dimensionProfiles.size;

      // Stop all audio for this dimension
      for (const [playerId, activeSounds] of this.playerAudioStates.entries()) {
        if (activeSounds.has(dimensionId)) {
          this.stopDimensionAudio(playerId, dimensionId);
        }
      }

      this.logger.info(`Removed audio profile for dimension: ${dimensionId}`);
    } catch (error) {
      this.logger.error('Failed to remove dimension audio profile:', error);
    }
  }

  /**
   * Start audio update loop
   */
  private startAudioUpdateLoop(): void {
    try {
      setInterval(() => {
        this.updateAudioStates();
      }, this.updateInterval);

      this.logger.debug('Started audio update loop');
    } catch (error) {
      this.logger.error('Failed to start audio update loop:', error);
    }
  }

  /**
   * Update audio states
   */
  private updateAudioStates(): void {
    try {
      // Update active sounds
      this.updateActiveSounds();

      // Update audio regions
      this.updateAudioRegions();

      // Update statistics
      this.updateStatistics();

    } catch (error) {
      this.logger.error('Failed to update audio states:', error);
    }
  }

  /**
   * Update active sounds
   */
  private updateActiveSounds(): void {
    try {
      const now = Date.now();
      const soundsToRemove: string[] = [];

      for (const [soundId, sound] of this.activeSounds.entries()) {
        // Check if sound should be stopped
        if (sound.duration && (now - sound.startTime) > sound.duration) {
          soundsToRemove.push(soundId);
        }
      }

      // Remove expired sounds
      for (const soundId of soundsToRemove) {
        this.stopSound(soundId);
      }

    } catch (error) {
      this.logger.error('Failed to update active sounds:', error);
    }
  }

  /**
   * Update audio regions
   */
  private updateAudioRegions(): void {
    try {
      if (!api.state) return;

      const players = api.state.get("players") || {};

      for (const [regionId, region] of this.audioRegions.entries()) {
        if (!region.isActive) continue;

        // Clear current players
        region.players.clear();

        // Check which players are in region
        for (const [playerId, playerData] of Object.entries(players)) {
          const player = playerData as any;
          if (player.position) {
            const distance = this.calculateDistance(player.position, region.center);
            if (distance <= region.radius) {
              region.players.add(playerId);
            }
          }
        }
      }

    } catch (error) {
      this.logger.error('Failed to update audio regions:', error);
    }
  }

  /**
   * Calculate distance between two positions
   */
  private calculateDistance(pos1: Vec3, pos2: Vec3): number {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    const dz = pos1.z - pos2.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Play dimension ambience
   */
  public playDimensionAmbience(dimensionType: string, position: Vec3, playerId?: string): string {
    try {
      const profile = this.dimensionProfiles.get(dimensionType) || this.dimensionProfiles.get('custom');
      if (!profile) {
        this.logger.warn(`No audio profile found for dimension: ${dimensionType}`);
        return '';
      }

      // Play ambient sound
      const soundId = this.playSound(profile.ambient.soundId, {
        ...profile.ambient,
        position
      });

      // Play music
      this.playSound(profile.music.soundId, {
        ...profile.music,
        position
      });

      // Play effects
      for (const effect of profile.effects) {
        this.playSound(effect.soundId, {
          ...effect,
          position
        });
      }

      this.logger.info(`Started dimension ambience for ${dimensionType}`);
      return soundId;

    } catch (error) {
      this.logger.error('Failed to play dimension ambience:', error);
      return '';
    }
  }

  /**
   * Play transition sound
   */
  private playTransitionSound(playerId: string, dimensionId: string, transitionType: 'enter' | 'exit'): void {
    try {
      const profile = this.dimensionProfiles.get(dimensionId) || this.dimensionProfiles.get('custom');
      if (!profile) return;

      const transition = profile.transitions[transitionType];
      if (transition) {
        this.playSound(transition.soundId, {
          ...transition,
          category: 'player'
        });
      }

    } catch (error) {
      this.logger.error('Failed to play transition sound:', error);
    }
  }

  /**
   * Start dimension audio
   */
  private startDimensionAudio(playerId: string, dimensionId: string): void {
    try {
      if (!api.state) return;

      const player = api.state.get(`players.${playerId}`);
      if (!player || !player.position) return;

      this.playDimensionAmbience(dimensionId, player.position, playerId);
    } catch (error) {
      this.logger.error('Failed to start dimension audio:', error);
    }
  }

  /**
   * Stop dimension audio
   */
  private stopDimensionAudio(playerId: string, dimensionId: string): void {
    try {
      // Stop all sounds for this player and dimension
      const soundsToRemove: string[] = [];

      for (const [soundId, sound] of this.activeSounds.entries()) {
        if (sound.playerId === playerId) {
          soundsToRemove.push(soundId);
        }
      }

      for (const soundId of soundsToRemove) {
        this.stopSound(soundId);
      }

    } catch (error) {
      this.logger.error('Failed to stop dimension audio:', error);
    }
  }

  /**
   * Play sound
   */
  public playSound(soundId: string, config: AudioConfig): string {
    try {
      const actualSoundId = `${soundId}_${Date.now()}_${Math.random()}`;
      
      const activeSound: ActiveSound = {
        id: actualSoundId,
        soundId,
        position: config.position || { x: 0, y: 0, z: 0 },
        config,
        startTime: Date.now(),
        isLooping: config.loop || false
      };

      // Play sound using audio engine
      if (this.audioEngine && this.audioEngine.playSound) {
        this.audioEngine.playSound(soundId, config);
      } else {
        // Fallback to Minecraft commands
        const command = this.buildMinecraftAudioCommand(soundId, config);
        if (api.server && api.server.executeCommand) {
          api.server.executeCommand(command);
        }
      }

      // Track active sound
      this.activeSounds.set(actualSoundId, activeSound);
      this.statistics.totalSoundsPlayed++;
      this.statistics.lastPlayTime = Date.now();

      return actualSoundId;

    } catch (error) {
      this.logger.error('Failed to play sound:', error);
      return '';
    }
  }

  /**
   * Stop sound
   */
  public stopSound(soundId: string): void {
    try {
      const sound = this.activeSounds.get(soundId);
      if (!sound) return;

      // Stop sound using audio engine
      if (this.audioEngine && this.audioEngine.stopSound) {
        this.audioEngine.stopSound(sound.soundId);
      } else {
        // Fallback to Minecraft commands
        const command = `/stopsound @a ${sound.soundId}`;
        if (api.server && api.server.executeCommand) {
          api.server.executeCommand(command);
        }
      }

      // Remove from active sounds
      this.activeSounds.delete(soundId);

    } catch (error) {
      this.logger.error('Failed to stop sound:', error);
    }
  }

  /**
   * Create audio region
   */
  public createAudioRegion(regionId: string, config: AudioRegion): void {
    try {
      this.audioRegions.set(regionId, config);
      this.statistics.activeRegions = this.audioRegions.size;

      this.logger.info(`Created audio region: ${regionId}`);
    } catch (error) {
      this.logger.error('Failed to create audio region:', error);
    }
  }

  /**
   * Remove audio region
   */
  public removeAudioRegion(regionId: string): void {
    try {
      this.audioRegions.delete(regionId);
      this.statistics.activeRegions = this.audioRegions.size;

      this.logger.info(`Removed audio region: ${regionId}`);
    } catch (error) {
      this.logger.error('Failed to remove audio region:', error);
    }
  }

  /**
   * Update statistics
   */
  private updateStatistics(): void {
    try {
      this.statistics.activeSounds = this.activeSounds.size;
      this.statistics.activeRegions = this.audioRegions.size;
      
      // Calculate average play time
      const now = Date.now();
      let totalPlayTime = 0;
      let soundCount = 0;

      for (const sound of this.activeSounds.values()) {
        if (!sound.isLooping) {
          totalPlayTime += now - sound.startTime;
          soundCount++;
        }
      }

      this.statistics.averagePlayTime = soundCount > 0 ? totalPlayTime / soundCount : 0;
    } catch (error) {
      this.logger.error('Failed to update statistics:', error);
    }
  }

  /**
   * Get statistics
   */
  public getStatistics(): AudioStatistics {
    return { ...this.statistics };
  }

  /**
   * Get dimension profile
   */
  public getDimensionProfile(dimensionId: string): DimensionAudioProfile | null {
    return this.dimensionProfiles.get(dimensionId) || null;
  }

  /**
   * Get all dimension profiles
   */
  public getAllDimensionProfiles(): Map<string, DimensionAudioProfile> {
    return new Map(this.dimensionProfiles);
  }

  /**
   * Shutdown Maudio integration
   */
  public shutdown(): void {
    try {
      // Stop all active sounds
      for (const soundId of this.activeSounds.keys()) {
        this.stopSound(soundId);
      }

      // Clear all data
      this.dimensionProfiles.clear();
      this.audioRegions.clear();
      this.activeSounds.clear();
      this.playerAudioStates.clear();

      this.isInitialized = false;
      this.logger.info('MaudioIntegration shutdown complete');
    } catch (error) {
      this.logger.error('Error during MaudioIntegration shutdown:', error);
    }
  }
}

// Singleton instance for global access
let globalMaudioIntegration: MaudioIntegration | null = null;

/**
 * Get global Maudio integration instance
 */
export function getMaudioIntegration(): MaudioIntegration {
  if (!globalMaudioIntegration) {
    globalMaudioIntegration = new MaudioIntegration();
  }
  return globalMaudioIntegration;
}

/**
 * Convenience function to play dimension ambience
 */
export function playDimensionAmbience(dimensionType: string, position: Vec3): string {
  const integration = getMaudioIntegration();
  return integration.playDimensionAmbience(dimensionType, position);
}

/**
 * Convenience function to play sound
 */
export function playSound(soundId: string, config: AudioConfig): string {
  const integration = getMaudioIntegration();
  return integration.playSound(soundId, config);
}
