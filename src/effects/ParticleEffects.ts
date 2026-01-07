/// <reference types="@epi-studio/moud-sdk" />
import { Logger } from '../utils/Logger';
import { getCentralizedStateManager } from '../core/CentralizedStateManager';

// Type definitions for particle effects
interface Vec3 {
  x: number;
  y: number;
  z: number;
}

interface ParticleConfig {
  type: string;
  count: number;
  speed: number;
  delta: Vec3;
  offset: Vec3;
  longDistance: boolean;
  force: boolean;
  color?: string;
  material?: string;
  block?: string;
  item?: string;
}

interface ParticleEffect {
  id: string;
  name: string;
  config: ParticleConfig;
  duration: number;
  repeat: boolean;
  interval: number;
  targets: string[];
  conditions?: {
    dimension?: string;
    biome?: string;
    timeOfDay?: string;
    weather?: string;
  };
}

interface DimensionParticleProfile {
  dimensionId: string;
  name: string;
  creationEffects: ParticleEffect[];
  ambientEffects: ParticleEffect[];
  portalEffects: ParticleEffect[];
  weatherEffects: ParticleEffect[];
  transitionEffects: {
    enter: ParticleEffect[];
    exit: ParticleEffect[];
  };
}

interface ActiveParticleEffect {
  id: string;
  effect: ParticleEffect;
  startTime: number;
  endTime: number;
  position: Vec3;
  currentRepeats: number;
  isActive: boolean;
}

interface ParticleStatistics {
  totalEffectsPlayed: number;
  activeEffects: number;
  dimensionProfiles: number;
  particlesGenerated: number;
  averageDuration: number;
  lastPlayTime: number;
}

/**
 * Particle Effects System - Use vanilla `/particle` command for visual effects
 * Provides comprehensive particle system for dimension creation and travel
 */
export class ParticleEffectsSystem {
  private logger: Logger;
  private stateManager: any;
  private dimensionProfiles: Map<string, DimensionParticleProfile> = new Map();
  private activeEffects: Map<string, ActiveParticleEffect> = new Map();
  private effectQueue: ParticleEffect[] = [];
  private isInitialized: boolean = false;
  private updateInterval: number = 100; // 100ms update interval
  private maxActiveEffects: number = 100; // Max concurrent effects
  private statistics: ParticleStatistics;

  constructor() {
    this.logger = new Logger('ParticleEffectsSystem');
    this.stateManager = getCentralizedStateManager();
    this.statistics = {
      totalEffectsPlayed: 0,
      activeEffects: 0,
      dimensionProfiles: 0,
      particlesGenerated: 0,
      averageDuration: 0,
      lastPlayTime: 0
    };
  }

  /**
   * Initialize particle effects system
   */
  public async initialize(): Promise<void> {
    try {
      // Initialize dimension particle profiles
      this.initializeDimensionProfiles();

      // Subscribe to state changes
      this.subscribeToStateChanges();

      // Start effect update loop
      this.startEffectUpdateLoop();

      this.isInitialized = true;
      this.logger.info('ParticleEffectsSystem initialized successfully');

    } catch (error) {
      this.logger.error('Failed to initialize ParticleEffectsSystem:', error);
      throw error;
    }
  }

  /**
   * Initialize dimension particle profiles
   */
  private initializeDimensionProfiles(): void {
    try {
      // Overworld profile
      this.dimensionProfiles.set('overworld', {
        dimensionId: 'overworld',
        name: 'Overworld',
        creationEffects: [
          {
            id: 'creation_sparkle',
            name: 'Creation Sparkle',
            config: {
              type: 'minecraft:end_rod',
              count: 30,
              speed: 0.5,
              delta: { x: 0.5, y: 0.5, z: 0.5 },
              offset: { x: 0, y: 1, z: 0 },
              longDistance: true,
              force: true
            },
            duration: 3000,
            repeat: false,
            interval: 0,
            targets: ['@a']
          }
        ],
        ambientEffects: [
          {
            id: 'ambient_dust',
            name: 'Ambient Dust',
            config: {
              type: 'minecraft:dust_color_transition',
              count: 2,
              speed: 0.1,
              delta: { x: 0.1, y: 0.1, z: 0.1 },
              offset: { x: 0, y: 0.5, z: 0 },
              longDistance: false,
              force: false,
              color: '#d4af37' // Grass green
            },
            duration: 0,
            repeat: true,
            interval: 2000,
            targets: ['@a']
          }
        ],
        portalEffects: [
          {
            id: 'portal_ambient',
            name: 'Portal Ambient',
            config: {
              type: 'minecraft:portal',
              count: 5,
              speed: 0.2,
              delta: { x: 0.2, y: 0.2, z: 0.2 },
              offset: { x: 0, y: 0, z: 0 },
              longDistance: true,
              force: true
            },
            duration: 0,
            repeat: true,
            interval: 1000,
            targets: ['@a']
          }
        ],
        weatherEffects: [],
        transitionEffects: {
          enter: [
            {
              id: 'enter_burst',
              name: 'Enter Burst',
              config: {
                type: 'minecraft:dragon_breath',
                count: 20,
                speed: 1.0,
                delta: { x: 1.0, y: 1.0, z: 1.0 },
                offset: { x: 0, y: 0, z: 0 },
                longDistance: true,
                force: true
              },
              duration: 2000,
              repeat: false,
              interval: 0,
              targets: ['@a']
            }
          ],
          exit: [
            {
              id: 'exit_burst',
              name: 'Exit Burst',
              config: {
                type: 'minecraft:dragon_breath',
                count: 20,
                speed: 1.0,
                delta: { x: 1.0, y: 1.0, z: 1.0 },
                offset: { x: 0, y: 0, z: 0 },
                longDistance: true,
                force: true
              },
              duration: 2000,
              repeat: false,
              interval: 0,
              targets: ['@a']
            }
          ]
        }
      });

      // Nether profile
      this.dimensionProfiles.set('nether', {
        dimensionId: 'nether',
        name: 'Nether',
        creationEffects: [
          {
            id: 'nether_creation',
            name: 'Nether Creation',
            config: {
              type: 'minecraft:flame',
              count: 50,
              speed: 0.8,
              delta: { x: 1.0, y: 1.0, z: 1.0 },
              offset: { x: 0, y: 0, z: 0 },
              longDistance: true,
              force: true
            },
            duration: 4000,
            repeat: false,
            interval: 0,
            targets: ['@a']
          }
        ],
        ambientEffects: [
          {
            id: 'nether_ambient',
            name: 'Nether Ambient',
            config: {
              type: 'minecraft:ash',
              count: 3,
              speed: 0.1,
              delta: { x: 0.1, y: 0.05, z: 0.1 },
              offset: { x: 0, y: 0.5, z: 0 },
              longDistance: false,
              force: false
            },
            duration: 0,
            repeat: true,
            interval: 3000,
            targets: ['@a']
          }
        ],
        portalEffects: [
          {
            id: 'nether_portal',
            name: 'Nether Portal',
            config: {
              type: 'minecraft:smoke',
              count: 8,
              speed: 0.3,
              delta: { x: 0.3, y: 0.5, z: 0.3 },
              offset: { x: 0, y: 0, z: 0 },
              longDistance: true,
              force: true
            },
            duration: 0,
            repeat: true,
            interval: 800,
            targets: ['@a']
          }
        ],
        weatherEffects: [],
        transitionEffects: {
          enter: [
            {
              id: 'nether_enter',
              name: 'Nether Enter',
              config: {
                type: 'minecraft:large_flame',
                count: 10,
                speed: 1.2,
                delta: { x: 1.2, y: 1.2, z: 1.2 },
                offset: { x: 0, y: 0, z: 0 },
                longDistance: true,
                force: true
              },
              duration: 2500,
              repeat: false,
              interval: 0,
              targets: ['@a']
            }
          ],
          exit: [
            {
              id: 'nether_exit',
              name: 'Nether Exit',
              config: {
                type: 'minecraft:large_flame',
                count: 10,
                speed: 1.2,
                delta: { x: 1.2, y: 1.2, z: 1.2 },
                offset: { x: 0, y: 0, z: 0 },
                longDistance: true,
                force: true
              },
              duration: 2500,
              repeat: false,
              interval: 0,
              targets: ['@a']
            }
          ]
        }
      });

      // End profile
      this.dimensionProfiles.set('end', {
        dimensionId: 'end',
        name: 'The End',
        creationEffects: [
          {
            id: 'end_creation',
            name: 'End Creation',
            config: {
              type: 'minecraft:end_rod',
              count: 40,
              speed: 0.6,
              delta: { x: 0.8, y: 0.8, z: 0.8 },
              offset: { x: 0, y: 2, z: 0 },
              longDistance: true,
              force: true
            },
            duration: 5000,
            repeat: false,
            interval: 0,
            targets: ['@a']
          }
        ],
        ambientEffects: [
          {
            id: 'end_ambient',
            name: 'End Ambient',
            config: {
              type: 'minecraft:portal',
              count: 2,
              speed: 0.1,
              delta: { x: 0.1, y: 0.1, z: 0.1 },
              offset: { x: 0, y: 1, z: 0 },
              longDistance: false,
              force: false
            },
            duration: 0,
            repeat: true,
            interval: 4000,
            targets: ['@a']
          }
        ],
        portalEffects: [
          {
            id: 'end_portal',
            name: 'End Portal',
            config: {
              type: 'minecraft:dragon_breath',
              count: 6,
              speed: 0.4,
              delta: { x: 0.4, y: 0.4, z: 0.4 },
              offset: { x: 0, y: 0, z: 0 },
              longDistance: true,
              force: true
            },
            duration: 0,
            repeat: true,
            interval: 1200,
            targets: ['@a']
          }
        ],
        weatherEffects: [],
        transitionEffects: {
          enter: [
            {
              id: 'end_enter',
              name: 'End Enter',
              config: {
                type: 'minecraft:reverse_portal',
                count: 15,
                speed: 1.5,
                delta: { x: 1.5, y: 1.5, z: 1.5 },
                offset: { x: 0, y: 0, z: 0 },
                longDistance: true,
                force: true
              },
              duration: 3000,
              repeat: false,
              interval: 0,
              targets: ['@a']
            }
          ],
          exit: [
            {
              id: 'end_exit',
              name: 'End Exit',
              config: {
                type: 'minecraft:reverse_portal',
                count: 15,
                speed: 1.5,
                delta: { x: 1.5, y: 1.5, z: 1.5 },
                offset: { x: 0, y: 0, z: 0 },
                longDistance: true,
                force: true
              },
              duration: 3000,
              repeat: false,
              interval: 0,
              targets: ['@a']
            }
          ]
        }
      });

      // Custom dimension profile template
      this.dimensionProfiles.set('custom', {
        dimensionId: 'custom',
        name: 'Custom Dimension',
        creationEffects: [
          {
            id: 'custom_creation',
            name: 'Custom Creation',
            config: {
              type: 'minecraft:enchant',
              count: 35,
              speed: 0.7,
              delta: { x: 0.7, y: 0.7, z: 0.7 },
              offset: { x: 0, y: 1, z: 0 },
              longDistance: true,
              force: true
            },
            duration: 4000,
            repeat: false,
            interval: 0,
            targets: ['@a']
          }
        ],
        ambientEffects: [
          {
            id: 'custom_ambient',
            name: 'Custom Ambient',
            config: {
              type: 'minecraft:witch',
              count: 1,
              speed: 0.1,
              delta: { x: 0.1, y: 0.1, z: 0.1 },
              offset: { x: 0, y: 0, z: 0 },
              longDistance: false,
              force: false
            },
            duration: 0,
            repeat: true,
            interval: 5000,
            targets: ['@a']
          }
        ],
        portalEffects: [
          {
            id: 'custom_portal',
            name: 'Custom Portal',
            config: {
              type: 'minecraft:crit',
              count: 4,
              speed: 0.3,
              delta: { x: 0.3, y: 0.3, z: 0.3 },
              offset: { x: 0, y: 0, z: 0 },
              longDistance: true,
              force: true
            },
            duration: 0,
            repeat: true,
            interval: 1500,
            targets: ['@a']
          }
        ],
        weatherEffects: [],
        transitionEffects: {
          enter: [
            {
              id: 'custom_enter',
              name: 'Custom Enter',
              config: {
                type: 'minecraft:enchant',
                count: 25,
                speed: 1.0,
                delta: { x: 1.0, y: 1.0, z: 1.0 },
                offset: { x: 0, y: 0, z: 0 },
                longDistance: true,
                force: true
              },
              duration: 3500,
              repeat: false,
              interval: 0,
              targets: ['@a']
            }
          ],
          exit: [
            {
              id: 'custom_exit',
              name: 'Custom Exit',
              config: {
                type: 'minecraft:enchant',
                count: 25,
                speed: 1.0,
                delta: { x: 1.0, y: 1.0, z: 1.0 },
                offset: { x: 0, y: 0, z: 0 },
                longDistance: true,
                force: true
              },
              duration: 3500,
              repeat: false,
              interval: 0,
              targets: ['@a']
            }
          ]
        }
      });

      this.statistics.dimensionProfiles = this.dimensionProfiles.size;
      this.logger.info(`Initialized ${this.dimensionProfiles.size} dimension particle profiles`);
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
        id: 'particle_effects_system',
        priority: 9
      });

      // Subscribe to dimension creation
      this.stateManager.subscribe('dimensions', (change) => {
        this.handleDimensionCreation(change);
      }, {
        id: 'particle_effects_system',
        priority: 9
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
      // Play exit transition effects
      this.playTransitionEffects(playerId, dimensionId, 'exit');

      // Stop dimension-specific ambient effects
      this.stopDimensionEffects(playerId, dimensionId);

    } catch (error) {
      this.logger.error('Failed to handle player leave dimension:', error);
    }
  }

  /**
   * Handle player joining dimension
   */
  private handlePlayerJoinDimension(playerId: string, dimensionId: string): void {
    try {
      // Play enter transition effects
      this.playTransitionEffects(playerId, dimensionId, 'enter');

      // Start dimension-specific ambient effects
      this.startDimensionEffects(playerId, dimensionId);

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
          this.playCreationEffects(config);
        }
      }
    } catch (error) {
      this.logger.error('Failed to handle dimension creation:', error);
    }
  }

  /**
   * Play creation effects
   */
  private playCreationEffects(config: any): void {
    try {
      const profile = this.getDimensionProfile(config.id) || this.getDimensionProfile('custom');
      if (!profile) return;

      // Get creation position (could be from book or portal)
      const position = this.getCreationPosition(config);

      // Play all creation effects
      for (const effect of profile.creationEffects) {
        this.playEffect(effect, position);
      }

      this.logger.info(`Played creation effects for dimension: ${config.id}`);
    } catch (error) {
      this.logger.error('Failed to play creation effects:', error);
    }
  }

  /**
   * Get creation position
   */
  private getCreationPosition(config: any): Vec3 {
    try {
      // Try to get position from book data
      if (config.bookData) {
        // Could be from portal collision or player position
        return { x: 0, y: 64, z: 0 }; // Default for now
      }

      return { x: 0, y: 64, z: 0 };
    } catch (error) {
      this.logger.error('Failed to get creation position:', error);
      return { x: 0, y: 64, z: 0 };
    }
  }

  /**
   * Play transition effects
   */
  private playTransitionEffects(playerId: string, dimensionId: string, transitionType: 'enter' | 'exit'): void {
    try {
      const profile = this.getDimensionProfile(dimensionId) || this.getDimensionProfile('custom');
      if (!profile) return;

      const effects = profile.transitionEffects[transitionType];
      if (!effects) return;

      // Get player position
      const position = this.getPlayerPosition(playerId);
      if (!position) return;

      // Play all transition effects
      for (const effect of effects) {
        this.playEffect(effect, position);
      }

    } catch (error) {
      this.logger.error('Failed to play transition effects:', error);
    }
  }

  /**
   * Start dimension effects
   */
  private startDimensionEffects(playerId: string, dimensionId: string): void {
    try {
      const profile = this.getDimensionProfile(dimensionId) || this.getDimensionProfile('custom');
      if (!profile) return;

      // Start ambient effects
      for (const effect of profile.ambientEffects) {
        this.startRepeatingEffect(effect, playerId);
      }

      // Start portal effects
      for (const effect of profile.portalEffects) {
        this.startRepeatingEffect(effect, playerId);
      }

    } catch (error) {
      this.logger.error('Failed to start dimension effects:', error);
    }
  }

  /**
   * Stop dimension effects
   */
  private stopDimensionEffects(playerId: string, dimensionId: string): void {
    try {
      // Stop all effects for this player
      const effectsToStop: string[] = [];

      for (const [effectId, activeEffect] of this.activeEffects.entries()) {
        if (activeEffect.effect.targets.includes(playerId) || 
            activeEffect.effect.targets.includes('@a')) {
          effectsToStop.push(effectId);
        }
      }

      for (const effectId of effectsToStop) {
        this.stopEffect(effectId);
      }

    } catch (error) {
      this.logger.error('Failed to stop dimension effects:', error);
    }
  }

  /**
   * Start effect update loop
   */
  private startEffectUpdateLoop(): void {
    try {
      setInterval(() => {
        this.updateEffects();
      }, this.updateInterval);

      this.logger.debug('Started effect update loop');
    } catch (error) {
      this.logger.error('Failed to start effect update loop:', error);
    }
  }

  /**
   * Update effects
   */
  private updateEffects(): void {
    try {
      const now = Date.now();
      const effectsToStop: string[] = [];

      for (const [effectId, activeEffect] of this.activeEffects.entries()) {
        // Check if effect should be stopped
        if (now > activeEffect.endTime) {
          effectsToStop.push(effectId);
        } else if (activeEffect.effect.repeat) {
          // Check if it's time to repeat
          const timeSinceStart = now - activeEffect.startTime;
          const repeatsDue = Math.floor(timeSinceStart / activeEffect.effect.interval);
          
          if (repeatsDue > activeEffect.currentRepeats) {
            this.executeEffectCommand(activeEffect.effect, activeEffect.position);
            activeEffect.currentRepeats = repeatsDue;
          }
        }
      }

      // Stop expired effects
      for (const effectId of effectsToStop) {
        this.stopEffect(effectId);
      }

    } catch (error) {
      this.logger.error('Failed to update effects:', error);
    }
  }

  /**
   * Play effect
   */
  public playEffect(effect: ParticleEffect, position: Vec3): string {
    try {
      if (this.activeEffects.size >= this.maxActiveEffects) {
        this.logger.warn('Maximum active effects reached, skipping effect');
        return '';
      }

      const effectId = `${effect.id}_${Date.now()}_${Math.random()}`;
      
      const activeEffect: ActiveParticleEffect = {
        id: effectId,
        effect,
        startTime: Date.now(),
        endTime: Date.now() + effect.duration,
        position,
        currentRepeats: 0,
        isActive: true
      };

      // Execute initial particle command
      this.executeEffectCommand(effect, position);

      // Track active effect
      this.activeEffects.set(effectId, activeEffect);
      this.statistics.totalEffectsPlayed++;
      this.statistics.lastPlayTime = Date.now();

      return effectId;

    } catch (error) {
      this.logger.error('Failed to play effect:', error);
      return '';
    }
  }

  /**
   * Start repeating effect
   */
  private startRepeatingEffect(effect: ParticleEffect, playerId: string): void {
    try {
      const position = this.getPlayerPosition(playerId);
      if (!position) return;

      const effectId = `${effect.id}_${playerId}_repeating`;
      
      const activeEffect: ActiveParticleEffect = {
        id: effectId,
        effect,
        startTime: Date.now(),
        endTime: 0, // Repeating effects don't expire
        position,
        currentRepeats: 0,
        isActive: true
      };

      // Track repeating effect
      this.activeEffects.set(effectId, activeEffect);

    } catch (error) {
      this.logger.error('Failed to start repeating effect:', error);
    }
  }

  /**
   * Stop effect
   */
  public stopEffect(effectId: string): void {
    try {
      const activeEffect = this.activeEffects.get(effectId);
      if (!activeEffect) return;

      activeEffect.isActive = false;
      this.activeEffects.delete(effectId);

    } catch (error) {
      this.logger.error('Failed to stop effect:', error);
    }
  }

  /**
   * Execute effect command
   */
  private executeEffectCommand(effect: ParticleEffect, position: Vec3): void {
    try {
      const config = effect.config;
      const command = this.buildParticleCommand(config, position);
      
      if (api.server && api.server.executeCommand) {
        api.server.executeCommand(command);
      }

      this.statistics.particlesGenerated += config.count;

    } catch (error) {
      this.logger.error('Failed to execute effect command:', error);
    }
  }

  /**
   * Build particle command
   */
  private buildParticleCommand(config: ParticleConfig, position: Vec3): string {
    try {
      let command = `/particle ${config.type}`;
      
      // Add position
      command += ` ${position.x} ${position.y} ${position.z}`;
      
      // Add delta
      command += ` ${config.delta.x} ${config.delta.y} ${config.delta.z}`;
      
      // Add speed
      command += ` ${config.speed}`;
      
      // Add count
      command += ` ${config.count}`;
      
      // Add optional parameters
      if (config.force) {
        command += ' force';
      }
      
      if (config.longDistance) {
        command += ' normal';
      }

      // Add target selectors
      if (config.material) {
        command += ` ${config.material}`;
      }
      
      if (config.block) {
        command += ` ${config.block}`;
      }
      
      if (config.item) {
        command += ` ${config.item}`;
      }

      return command;

    } catch (error) {
      this.logger.error('Failed to build particle command:', error);
      return `/particle minecraft:happy_villager 0 64 0 0 0 0 1 force`;
    }
  }

  /**
   * Get player position
   */
  private getPlayerPosition(playerId: string): Vec3 | null {
    try {
      if (!api.state) return null;

      const player = api.state.get(`players.${playerId}`);
      return player?.position || null;

    } catch (error) {
      this.logger.error('Failed to get player position:', error);
      return null;
    }
  }

  /**
   * Get dimension profile
   */
  private getDimensionProfile(dimensionId: string): DimensionParticleProfile | null {
    return this.dimensionProfiles.get(dimensionId) || null;
  }

  /**
   * Create portal effects
   */
  public createPortalEffects(position: Vec3, dimensionType: string): void {
    try {
      const profile = this.getDimensionProfile(dimensionType) || this.getDimensionProfile('custom');
      if (!profile) return;

      // Play portal effects
      for (const effect of profile.portalEffects) {
        this.playEffect(effect, position);
      }

      this.logger.info(`Created portal effects for ${dimensionType} at ${JSON.stringify(position)}`);
    } catch (error) {
      this.logger.error('Failed to create portal effects:', error);
    }
  }

  /**
   * Get particle for dimension
   */
  public getParticleForDimension(dimensionType: string): string {
    try {
      const profile = this.getDimensionProfile(dimensionType) || this.getDimensionProfile('custom');
      if (!profile || profile.creationEffects.length === 0) {
        return 'minecraft:happy_villager';
      }

      return profile.creationEffects[0].config.type;
    } catch (error) {
      this.logger.error('Failed to get particle for dimension:', error);
      return 'minecraft:happy_villager';
    }
  }

  /**
   * Update statistics
   */
  private updateStatistics(): void {
    try {
      this.statistics.activeEffects = this.activeEffects.size;
      
      // Calculate average duration
      let totalDuration = 0;
      let durationCount = 0;
      const now = Date.now();

      for (const activeEffect of this.activeEffects.values()) {
        if (activeEffect.effect.duration > 0) {
          const actualDuration = Math.min(now - activeEffect.startTime, activeEffect.effect.duration);
          totalDuration += actualDuration;
          durationCount++;
        }
      }

      this.statistics.averageDuration = durationCount > 0 ? totalDuration / durationCount : 0;

    } catch (error) {
      this.logger.error('Failed to update statistics:', error);
    }
  }

  /**
   * Get statistics
   */
  public getStatistics(): ParticleStatistics {
    this.updateStatistics();
    return { ...this.statistics };
  }

  /**
   * Get all dimension profiles
   */
  public getAllDimensionProfiles(): Map<string, DimensionParticleProfile> {
    return new Map(this.dimensionProfiles);
  }

  /**
   * Get active effects
   */
  public getActiveEffects(): Map<string, ActiveParticleEffect> {
    return new Map(this.activeEffects);
  }

  /**
   * Clear all effects
   */
  public clearAllEffects(): void {
    try {
      for (const effectId of this.activeEffects.keys()) {
        this.stopEffect(effectId);
      }

      this.logger.info('Cleared all particle effects');
    } catch (error) {
      this.logger.error('Failed to clear all effects:', error);
    }
  }

  /**
   * Shutdown particle effects system
   */
  public shutdown(): void {
    try {
      // Clear all effects
      this.clearAllEffects();

      // Clear all data
      this.dimensionProfiles.clear();
      this.activeEffects.clear();
      this.effectQueue = [];

      this.isInitialized = false;
      this.logger.info('ParticleEffectsSystem shutdown complete');
    } catch (error) {
      this.logger.error('Error during ParticleEffectsSystem shutdown:', error);
    }
  }
}

// Singleton instance for global access
let globalParticleEffectsSystem: ParticleEffectsSystem | null = null;

/**
 * Get global particle effects system instance
 */
export function getParticleEffectsSystem(): ParticleEffectsSystem {
  if (!globalParticleEffectsSystem) {
    globalParticleEffectsSystem = new ParticleEffectsSystem();
  }
  return globalParticleEffectsSystem;
}

/**
 * Convenience function to create portal effects
 */
export function createPortalEffects(position: Vec3, dimensionType: string): void {
  const system = getParticleEffectsSystem();
  system.createPortalEffects(position, dimensionType);
}

/**
 * Convenience function to get particle for dimension
 */
export function getParticleForDimension(dimensionType: string): string {
  const system = getParticleEffectsSystem();
  return system.getParticleForDimension(dimensionType);
}
