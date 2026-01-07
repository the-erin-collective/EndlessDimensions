/// <reference types="@epi-studio/moud-sdk" />
import { Logger } from '../utils/Logger';
import { getFileSystemManager } from '../hooks/useFileSystem';
import { getCentralizedStateManager } from './CentralizedStateManager';

// Type definitions for dimension configuration
interface DimensionConfig {
  id: string;
  name: string;
  generator: {
    type: 'noise' | 'flat' | 'void' | 'floating_islands' | 'the_end' | 'custom';
    seed?: number;
    settings?: any;
  };
  biome: {
    id: string;
    name: string;
    temperature: number;
    downfall: number;
    precipitation: 'none' | 'rain' | 'snow';
    effects?: {
      fog_color?: string;
      sky_color?: string;
      water_color?: string;
      water_fog_color?: string;
      grass_color?: string;
      foliage_color?: string;
      mood_sound?: {
        sound: string;
        tick_delay: number;
        block_search_extent: number;
        offset: number;
      };
      additions?: {
        sound: string;
        tick_chance: number;
      }[];
      ambient?: {
        sound: string;
        tick_chance: number;
      };
      music?: {
        sound: string;
        min_delay: number;
        max_delay: number;
        replace_current_music: boolean;
      };
    };
  };
  properties: {
    min_y: number;
    height: number;
    sea_level: number;
    logical_height: number;
    coordinate_scale: number;
    bed_works: boolean;
    respawn_anchor_works: boolean;
    has_raids: boolean;
    has_skylight: boolean;
    has_ceiling: boolean;
    ultrawarm: boolean;
    natural: boolean;
    piglin_safe: boolean;
    fixed_time?: number;
  };
  features?: {
    structures?: string[];
    carvers?: string[];
    features?: string[];
    spawns?: {
      type: string;
      weight: number;
      minCount: number;
      maxCount: number;
    }[];
  };
  custom_properties?: Record<string, any>;
}

interface DimensionRegistration {
  config: DimensionConfig;
  registeredAt: number;
  isActive: boolean;
  jsonPath: string;
  biomePath: string;
  reloadRequired: boolean;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * JSON Injection System - Generates and writes dimension JSON files dynamically
 * Provides comprehensive dimension creation with full Minecraft datapack integration
 */
export class JsonInjectionSystem {
  private logger: Logger;
  private fileSystemManager: any;
  private stateManager: any;
  private registeredDimensions: Map<string, DimensionRegistration> = new Map();
  private dimensionTemplates: Map<string, Partial<DimensionConfig>> = new Map();
  private isInitialized: boolean = false;
  private dimensionNamespace: string = "endless";
  private basePath: string = "world/datapacks/endless/data";

  constructor() {
    this.logger = new Logger('JsonInjectionSystem');
    this.fileSystemManager = getFileSystemManager();
    this.stateManager = getCentralizedStateManager();
  }

  /**
   * Initialize the JSON injection system
   */
  public async initialize(): Promise<void> {
    try {
      // Initialize dimension templates
      this.initializeDimensionTemplates();

      // Subscribe to state changes
      this.subscribeToStateChanges();

      // Ensure directories exist
      await this.ensureDirectoryStructure();

      // Load existing dimensions
      await this.loadExistingDimensions();

      this.isInitialized = true;
      this.logger.info('JsonInjectionSystem initialized successfully');

    } catch (error) {
      this.logger.error('Failed to initialize JsonInjectionSystem:', error);
      throw error;
    }
  }

  /**
   * Initialize dimension templates
   */
  private initializeDimensionTemplates(): void {
    try {
      // Noise dimension template
      this.dimensionTemplates.set('noise', {
        generator: {
          type: 'noise',
          settings: {
            sampling: {
              xz_scale: 1.0,
              y_scale: 1.0,
              xz_factor: 80.0,
              y_factor: 80.0
            },
            top_slide: {
              target: -0.07,
              size: 2,
              offset: 1
            },
            bottom_slide: {
              target: -0.07,
              size: 2,
              offset: 1
            },
            noise: {
              top: {
                target: 1.0,
                size: 1,
                offset: 0
              },
              bottom: {
                target: -1.0,
                size: 1,
                offset: 0
              },
              size_horizontal: 1,
              size_vertical: 2,
              density_factor: 1.0,
              density_offset: 0.0,
              weirdness_scale: 0.0
            }
          }
        },
        properties: {
          min_y: -64,
          height: 384,
          sea_level: 63,
          natural: true,
          has_skylight: true
        }
      });

      // Flat dimension template
      this.dimensionTemplates.set('flat', {
        generator: {
          type: 'flat',
          settings: {
            layers: [
              {
                block: "minecraft:bedrock",
                height: 1
              },
              {
                block: "minecraft:dirt",
                height: 3
              },
              {
                block: "minecraft:grass_block",
                height: 1
              }
            ],
            structures: {
              stronghold: {
                distance: 32,
                spread: 3,
                count: 128
              }
            }
          }
        },
        properties: {
          min_y: 0,
          height: 256,
          sea_level: 0,
          natural: false,
          has_skylight: true
        }
      });

      // Void dimension template
      this.dimensionTemplates.set('void', {
        generator: {
          type: 'void'
        },
        properties: {
          min_y: 0,
          height: 256,
          sea_level: 0,
          natural: false,
          has_skylight: false,
          has_ceiling: false
        }
      });

      // Floating islands template
      this.dimensionTemplates.set('floating_islands', {
        generator: {
          type: 'noise',
          settings: {
            sampling: {
              xz_scale: 2.0,
              y_scale: 2.0,
              xz_factor: 80.0,
              y_factor: 160.0
            },
            top_slide: {
              target: 0.3,
              size: 7,
              offset: 1
            },
            bottom_slide: {
              target: -0.07,
              size: 3,
              offset: 1
            },
            noise: {
              top: {
                target: 2.0,
                size: 1,
                offset: 0
              },
              bottom: {
                target: -1.0,
                size: 2,
                offset: 0
              },
              size_horizontal: 2,
              size_vertical: 1,
              density_factor: 0.0,
              density_offset: 0.0,
              weirdness_scale: 0.0
            }
          }
        },
        properties: {
          min_y: 0,
          height: 256,
          sea_level: 32,
          natural: true,
          has_skylight: true,
          has_ceiling: false
        }
      });

      this.logger.info(`Initialized ${this.dimensionTemplates.size} dimension templates`);
    } catch (error) {
      this.logger.error('Failed to initialize dimension templates:', error);
    }
  }

  /**
   * Subscribe to state changes
   */
  private subscribeToStateChanges(): void {
    try {
      // Subscribe to dimension creation requests
      this.stateManager.subscribe('dimensions', (change) => {
        this.handleDimensionStateChange(change);
      }, {
        id: 'json_injection_system',
        priority: 10
      });

      this.logger.debug('Subscribed to dimension state changes');
    } catch (error) {
      this.logger.error('Failed to subscribe to state changes:', error);
    }
  }

  /**
   * Handle dimension state changes
   */
  private handleDimensionStateChange(change: any): void {
    try {
      if (change.delta.changeType === 'add') {
        const config = change.delta.newValue;
        if (config && config.id) {
          this.registerDimension(config);
        }
      } else if (change.delta.changeType === 'remove') {
        const config = change.delta.oldValue;
        if (config && config.id) {
          this.unregisterDimension(config.id);
        }
      }
    } catch (error) {
      this.logger.error('Failed to handle dimension state change:', error);
    }
  }

  /**
   * Ensure directory structure exists
   */
  private async ensureDirectoryStructure(): Promise<void> {
    try {
      const directories = [
        `${this.basePath}/${this.dimensionNamespace}/dimension`,
        `${this.basePath}/${this.dimensionNamespace}/dimension_type`,
        `${this.basePath}/${this.dimensionNamespace}/worldgen/biome`,
        `${this.basePath}/${this.dimensionNamespace}/worldgen/configured_feature`,
        `${this.basePath}/${this.dimensionNamespace}/worldgen/placed_feature`
      ];

      for (const dir of directories) {
        await this.fileSystemManager.ensureDirectory(dir);
      }

      this.logger.debug('Directory structure ensured');
    } catch (error) {
      this.logger.error('Failed to ensure directory structure:', error);
    }
  }

  /**
   * Load existing dimensions
   */
  private async loadExistingDimensions(): Promise<void> {
    try {
      const dimensionDir = `${this.basePath}/${this.dimensionNamespace}/dimension`;
      const files = await this.fileSystemManager.listFiles(dimensionDir);

      for (const fileName of files) {
        if (fileName.endsWith('.json')) {
          try {
            const filePath = `${dimensionDir}/${fileName}`;
            const content = await api.internal.fs.readFile(filePath);
            const dimensionData = JSON.parse(content);

            // Extract dimension ID from filename
            const dimensionId = fileName.replace('.json', '');
            
            // Create registration entry
            this.registeredDimensions.set(dimensionId, {
              config: dimensionData,
              registeredAt: Date.now(),
              isActive: true,
              jsonPath: filePath,
              biomePath: `${this.basePath}/${this.dimensionNamespace}/worldgen/biome/${dimensionId}.json`,
              reloadRequired: false
            });

          } catch (error) {
            this.logger.error(`Failed to load dimension from ${fileName}:`, error);
          }
        }
      }

      this.logger.info(`Loaded ${this.registeredDimensions.size} existing dimensions`);
    } catch (error) {
      this.logger.error('Failed to load existing dimensions:', error);
    }
  }

  /**
   * Register a dimension
   */
  public async registerDimension(config: DimensionConfig): Promise<{ success: boolean; error?: string; warnings?: string[] }> {
    try {
      if (!this.isInitialized) {
        return { success: false, error: "JsonInjectionSystem not initialized" };
      }

      // Validate configuration
      const validation = this.validateDimensionConfig(config);
      if (!validation.valid) {
        return { 
          success: false, 
          error: `Validation failed: ${validation.errors.join(', ')}`,
          warnings: validation.warnings
        };
      }

      this.logger.info(`Registering dimension: ${config.id}`);

      // Apply template if specified
      const finalConfig = this.applyTemplate(config);

      // Create dimension JSON
      const dimensionJson = this.createDimensionJson(finalConfig);

      // Write dimension JSON
      const jsonPath = `${this.basePath}/${this.dimensionNamespace}/dimension/${finalConfig.id}.json`;
      const writeResult = await this.fileSystemManager.writeFile(jsonPath, JSON.stringify(dimensionJson, null, 2));

      if (!writeResult.success) {
        throw new Error(`Failed to write dimension JSON: ${writeResult.error}`);
      }

      // Create biome JSON
      const biomeJson = this.createBiomeJson(finalConfig);
      const biomePath = `${this.basePath}/${this.dimensionNamespace}/worldgen/biome/${finalConfig.id}.json`;
      const biomeWriteResult = await this.fileSystemManager.writeFile(biomePath, JSON.stringify(biomeJson, null, 2));

      if (!biomeWriteResult.success) {
        throw new Error(`Failed to write biome JSON: ${biomeWriteResult.error}`);
      }

      // Create dimension type JSON
      const dimensionTypeJson = this.createDimensionTypeJson(finalConfig);
      const dimensionTypePath = `${this.basePath}/${this.dimensionNamespace}/dimension_type/${finalConfig.id}.json`;
      const dimensionTypeWriteResult = await this.fileSystemManager.writeFile(dimensionTypePath, JSON.stringify(dimensionTypeJson, null, 2));

      if (!dimensionTypeWriteResult.success) {
        throw new Error(`Failed to write dimension type JSON: ${dimensionTypeWriteResult.error}`);
      }

      // Store registration
      this.registeredDimensions.set(finalConfig.id, {
        config: finalConfig,
        registeredAt: Date.now(),
        isActive: true,
        jsonPath,
        biomePath,
        reloadRequired: true
      });

      // Update global state
      this.updateGlobalState(finalConfig.id, finalConfig);

      this.logger.info(`Successfully registered dimension: ${finalConfig.id}`);
      return { 
        success: true, 
        warnings: validation.warnings 
      };

    } catch (error) {
      this.logger.error(`Failed to register dimension ${config.id}:`, error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Validate dimension configuration
   */
  private validateDimensionConfig(config: DimensionConfig): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Check required fields
      if (!config.id || !config.name) {
        errors.push('Missing required fields: id or name');
      }

      if (!config.generator || !config.generator.type) {
        errors.push('Missing generator configuration');
      }

      if (!config.biome || !config.biome.id) {
        errors.push('Missing biome configuration');
      }

      if (!config.properties) {
        errors.push('Missing dimension properties');
      }

      // Validate ID format
      if (config.id && !/^[a-z0-9_]+$/.test(config.id)) {
        errors.push('Dimension ID must contain only lowercase letters, numbers, and underscores');
      }

      // Validate generator type
      if (config.generator && config.generator.type) {
        const validTypes = ['noise', 'flat', 'void', 'floating_islands', 'the_end', 'custom'];
        if (!validTypes.includes(config.generator.type)) {
          errors.push(`Invalid generator type: ${config.generator.type}`);
        }
      }

      // Validate properties ranges
      if (config.properties) {
        if (config.properties.min_y < -64 || config.properties.min_y > 384) {
          warnings.push('min_y should be between -64 and 384');
        }

        if (config.properties.height < 16 || config.properties.height > 4096) {
          warnings.push('height should be between 16 and 4096');
        }

        if (config.properties.sea_level < config.properties.min_y || 
            config.properties.sea_level > config.properties.min_y + config.properties.height) {
          errors.push('sea_level must be within dimension bounds');
        }
      }

      // Validate color formats
      if (config.biome.effects) {
        const colorFields = ['fog_color', 'sky_color', 'water_color', 'water_fog_color', 'grass_color', 'foliage_color'];
        for (const field of colorFields) {
          const color = config.biome.effects[field as keyof typeof config.biome.effects] as string;
          if (color && !/^#[0-9a-fA-F]{6}$/.test(color)) {
            errors.push(`Invalid color format for ${field}: must be #RRGGBB`);
          }
        }
      }

    } catch (error) {
      errors.push(`Validation error: ${error}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Apply template to configuration
   */
  private applyTemplate(config: DimensionConfig): DimensionConfig {
    try {
      const template = this.dimensionTemplates.get(config.generator.type);
      if (!template) {
        return config; // No template available
      }

      // Merge template with config
      const mergedConfig: DimensionConfig = {
        ...template,
        ...config,
        generator: {
          ...template.generator,
          ...config.generator,
          settings: {
            ...template.generator.settings,
            ...config.generator.settings
          }
        },
        properties: {
          ...template.properties,
          ...config.properties
        }
      };

      return mergedConfig;
    } catch (error) {
      this.logger.error('Failed to apply template:', error);
      return config;
    }
  }

  /**
   * Create dimension JSON
   */
  private createDimensionJson(config: DimensionConfig): any {
    return {
      type: `${this.dimensionNamespace}:${config.id}`,
      generator: {
        type: config.generator.type,
        seed: config.generator.seed || 0,
        ...config.generator.settings
      }
    };
  }

  /**
   * Create biome JSON
   */
  private createBiomeJson(config: DimensionConfig): any {
    return {
      type: "minecraft:biome",
      precipitation: config.biome.precipitation,
      temperature: config.biome.temperature,
      downfall: config.biome.downfall,
      effects: {
        fog_color: config.biome.effects?.fog_color || "#c0d8ff",
        sky_color: config.biome.effects?.sky_color || "#78a7ff",
        water_color: config.biome.effects?.water_color || "#3f76e4",
        water_fog_color: config.biome.effects?.water_fog_color || "#050533",
        grass_color: config.biome.effects?.grass_color || "#91bd59",
        foliage_color: config.biome.effects?.foliage_color || "#77ab2f",
        ...config.biome.effects
      },
      spawns: config.features?.spawns || [],
      generation: {
        features: config.features?.features || [],
        carvers: config.features?.carvers || []
      }
    };
  }

  /**
   * Create dimension type JSON
   */
  private createDimensionTypeJson(config: DimensionConfig): any {
    return {
      type: "minecraft:dimension_type",
      min_y: config.properties.min_y,
      height: config.properties.height,
      logical_height: config.properties.logical_height || config.properties.height,
      coordinate_scale: config.properties.coordinate_scale,
      bed_works: config.properties.bed_works,
      respawn_anchor_works: config.properties.respawn_anchor_works,
      has_raids: config.properties.has_raids,
      has_skylight: config.properties.has_skylight,
      has_ceiling: config.properties.has_ceiling,
      ultrawarm: config.properties.ultrawarm,
      natural: config.properties.natural,
      piglin_safe: config.properties.piglin_safe,
      fixed_time: config.properties.fixed_time,
      effects: config.biome.effects || {}
    };
  }

  /**
   * Unregister a dimension
   */
  public async unregisterDimension(dimensionId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const registration = this.registeredDimensions.get(dimensionId);
      if (!registration) {
        return { success: false, error: `Dimension ${dimensionId} not found` };
      }

      // Remove JSON files
      try {
        await api.internal.fs.deleteFile(registration.jsonPath);
      } catch (error) {
        this.logger.warn(`Failed to delete dimension JSON: ${error}`);
      }

      try {
        await api.internal.fs.deleteFile(registration.biomePath);
      } catch (error) {
        this.logger.warn(`Failed to delete biome JSON: ${error}`);
      }

      // Remove from registry
      this.registeredDimensions.delete(dimensionId);

      // Update global state
      if (api.state) {
        const dimensions = api.state.get("dimensions") || {};
        delete dimensions[dimensionId];
        api.state.set("dimensions", dimensions);
      }

      this.logger.info(`Unregistered dimension: ${dimensionId}`);
      return { success: true };

    } catch (error) {
      this.logger.error(`Failed to unregister dimension ${dimensionId}:`, error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Update global state
   */
  private updateGlobalState(dimensionId: string, config: DimensionConfig): void {
    try {
      if (api.state) {
        const dimensions = api.state.get("dimensions") || {};
        dimensions[dimensionId] = config;
        api.state.set("dimensions", dimensions);
      }
    } catch (error) {
      this.logger.error('Failed to update global state:', error);
    }
  }

  /**
   * Trigger server reload for dimensions
   */
  public async triggerDimensionReload(): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if any dimensions need reload
      const needsReload = Array.from(this.registeredDimensions.values())
        .some(reg => reg.reloadRequired);

      if (!needsReload) {
        return { success: true };
      }

      this.logger.info('Triggering dimension reload...');

      // Trigger server reload
      const reloadResult = await this.fileSystemManager.triggerServerReload();

      if (!reloadResult.success) {
        throw new Error(`Failed to trigger reload: ${reloadResult.error}`);
      }

      // Clear reload flags
      for (const registration of this.registeredDimensions.values()) {
        registration.reloadRequired = false;
      }

      this.logger.info('Dimension reload completed successfully');
      return { success: true };

    } catch (error) {
      this.logger.error('Failed to trigger dimension reload:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Get registered dimensions
   */
  public getRegisteredDimensions(): Map<string, DimensionRegistration> {
    return new Map(this.registeredDimensions);
  }

  /**
   * Get dimension configuration
   */
  public getDimensionConfig(dimensionId: string): DimensionConfig | null {
    const registration = this.registeredDimensions.get(dimensionId);
    return registration ? registration.config : null;
  }

  /**
   * Get available templates
   */
  public getAvailableTemplates(): string[] {
    return Array.from(this.dimensionTemplates.keys());
  }

  /**
   * Get statistics
   */
  public getStatistics(): any {
    return {
      isInitialized: this.isInitialized,
      registeredDimensionsCount: this.registeredDimensions.size,
      templateCount: this.dimensionTemplates.size,
      dimensionNamespace: this.dimensionNamespace,
      basePath: this.basePath
    };
  }

  /**
   * Shutdown JSON injection system
   */
  public shutdown(): void {
    try {
      this.registeredDimensions.clear();
      this.dimensionTemplates.clear();
      this.isInitialized = false;
      this.logger.info('JsonInjectionSystem shutdown complete');
    } catch (error) {
      this.logger.error('Error during JsonInjectionSystem shutdown:', error);
    }
  }
}

// Singleton instance for global access
let globalJsonInjectionSystem: JsonInjectionSystem | null = null;

/**
 * Get global JSON injection system instance
 */
export function getJsonInjectionSystem(): JsonInjectionSystem {
  if (!globalJsonInjectionSystem) {
    globalJsonInjectionSystem = new JsonInjectionSystem();
  }
  return globalJsonInjectionSystem;
}

/**
 * Convenience function to register a dimension
 */
export async function registerDimension(
  config: DimensionConfig
): Promise<{ success: boolean; error?: string; warnings?: string[] }> {
  const system = getJsonInjectionSystem();
  return await system.registerDimension(config);
}
