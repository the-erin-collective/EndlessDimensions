import { Logger } from '../utils/Logger';
import { getFileSystemManager } from './useFileSystem';

// Type definitions for block configurations
interface BlockConfig {
  type: string;
  properties: Record<string, any>;
  behavior?: BlockBehavior;
  experimental?: boolean;
  discovery?: string;
}

interface BlockBehavior {
  heal_amount?: number;
  damage_on_touch?: boolean;
  particle_effect?: string;
  sound_event?: string;
  light_level?: number;
  custom_drops?: string[];
  custom_properties?: Record<string, any>;
}

interface DataMapEntry {
  type: string;
  values: Record<string, any>;
}

/**
 * Data Pack Sync Manager - Implements useDataPackSync hook for dynamic block registration
 * Uses experimental 1.21+ data-driven architecture for script-driven content
 */
export class DataPackSyncManager {
  private logger: Logger;
  private fileSystemManager: any;
  private blockRegistry: Map<string, BlockConfig> = new Map();
  private dataMaps: Map<string, BlockBehavior> = new Map();
  private isInitialized: boolean = false;
  private supportedVersion: string = "1.21";
  private reloadInProgress: boolean = false;
  private reloadQueue: Array<() => Promise<void>> = [];

  constructor() {
    this.logger = new Logger('DataPackSyncManager');
    this.fileSystemManager = getFileSystemManager();
  }

  /**
   * Initialize the data pack sync manager
   */
  public async initialize(): Promise<void> {
    try {
      // Ensure filesystem manager is ready
      await this.fileSystemManager.initialize();

      // Check server version compatibility
      if (!this.isExperimentalSupported()) {
        this.logger.warn(`Experimental block registration requires ${this.supportedVersion}+`);
        this.logger.info('Falling back to proxy block system');
        return;
      }

      // Initialize state storage
      this.initializeStateStorage();

      this.isInitialized = true;
      this.logger.info('DataPackSyncManager initialized successfully');

    } catch (error) {
      this.logger.error('Failed to initialize DataPackSyncManager:', error);
      throw error;
    }
  }

  /**
   * Register a custom block with experimental data-driven approach
   */
  public async registerBlock(blockId: string, blockConfig: BlockConfig): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.isInitialized) {
        return { success: false, error: "DataPackSyncManager not initialized" };
      }

      // Validate block configuration
      const validation = this.validateBlockConfig(blockId, blockConfig);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      this.logger.info(`Registering experimental block: ${blockId}`);

      // Write block definition to datapack
      await this.writeBlockDefinition(blockId, blockConfig);

      // Write data map for behavioral modifications
      if (blockConfig.behavior) {
        await this.writeDataMap(blockId, blockConfig.behavior);
      }

      // Store in local registry
      this.blockRegistry.set(blockId, blockConfig);
      if (blockConfig.behavior) {
        this.dataMaps.set(blockId, blockConfig.behavior);
      }

      // Queue reload if not already in progress
      this.queueReload();

      this.logger.info(`Successfully registered block: ${blockId}`);
      return { success: true };

    } catch (error) {
      this.logger.error(`Failed to register block ${blockId}:`, error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Validate block configuration
   */
  private validateBlockConfig(blockId: string, config: BlockConfig): { valid: boolean; error?: string } {
    try {
      // Check required fields
      if (!blockId || !config.type) {
        return { valid: false, error: "Missing blockId or type" };
      }

      // Validate block type
      if (!config.type.startsWith('minecraft:')) {
        return { valid: false, error: "Block type must start with 'minecraft:'" };
      }

      // Validate properties
      if (!config.properties || typeof config.properties !== 'object') {
        return { valid: false, error: "Properties must be an object" };
      }

      // Ensure endless:type property exists
      if (!config.properties['endless:type']) {
        config.properties['endless:type'] = blockId;
      }

      // Validate behavior if present
      if (config.behavior) {
        const behaviorValidation = this.validateBlockBehavior(config.behavior);
        if (!behaviorValidation.valid) {
          return behaviorValidation;
        }
      }

      return { valid: true };

    } catch (error) {
      return { valid: false, error: `Validation error: ${error}` };
    }
  }

  /**
   * Validate block behavior configuration
   */
  private validateBlockBehavior(behavior: BlockBehavior): { valid: boolean; error?: string } {
    try {
      // Check for invalid behavior properties
      const invalidProps = Object.keys(behavior).filter(key => {
        const value = behavior[key as keyof BlockBehavior];
        return typeof value !== 'number' && typeof value !== 'boolean' && typeof value !== 'string' && !Array.isArray(value);
      });

      if (invalidProps.length > 0) {
        return { valid: false, error: `Invalid behavior properties: ${invalidProps.join(', ')}` };
      }

      return { valid: true };

    } catch (error) {
      return { valid: false, error: `Behavior validation error: ${error}` };
    }
  }

  /**
   * Write block definition to datapack
   */
  private async writeBlockDefinition(blockId: string, config: BlockConfig): Promise<void> {
    try {
      const blockDef = {
        type: config.type,
        properties: {
          "endless:type": blockId,
          "experimental": config.experimental || true,
          "discovery": config.discovery || "data_driven",
          ...config.properties
        }
      };

      const filePath = `world/datapacks/endless/data/endless/blocks/${blockId}.json`;
      const result = await this.fileSystemManager.writeFile(filePath, JSON.stringify(blockDef, null, 2));

      if (!result.success) {
        throw new Error(`Failed to write block definition: ${result.error}`);
      }

      this.logger.debug(`Block definition written: ${filePath}`);

    } catch (error) {
      this.logger.error(`Failed to write block definition for ${blockId}:`, error);
      throw error;
    }
  }

  /**
   * Write data map for behavioral modifications
   */
  private async writeDataMap(blockId: string, behavior: BlockBehavior): Promise<void> {
    try {
      const dataMap: DataMapEntry = {
        type: "minecraft:data_map",
        values: {
          [`endless:${blockId}`]: {
            // Custom behavior properties
            heal_amount: behavior.heal_amount || 0,
            damage_on_touch: behavior.damage_on_touch || false,
            particle_effect: behavior.particle_effect || "minecraft:happy_villager",
            sound_event: behavior.sound_event || "minecraft:block.amethyst_cluster.step",
            light_level: behavior.light_level || 0,
            custom_drops: behavior.custom_drops || [],
            ...behavior.custom_properties
          }
        }
      };

      const filePath = `world/datapacks/endless/data/endless/data_maps/${blockId}_behavior.json`;
      const result = await this.fileSystemManager.writeFile(filePath, JSON.stringify(dataMap, null, 2));

      if (!result.success) {
        throw new Error(`Failed to write data map: ${result.error}`);
      }

      this.logger.debug(`Data map written: ${filePath}`);

    } catch (error) {
      this.logger.error(`Failed to write data map for ${blockId}:`, error);
      throw error;
    }
  }

  /**
   * Check if experimental block discovery is supported
   */
  private isExperimentalSupported(): boolean {
    try {
      // Check server version and experimental features
      const serverVersion = this.getServerVersion();
      return this.compareVersions(serverVersion, this.supportedVersion) >= 0;
    } catch (error) {
      this.logger.error('Failed to check experimental support:', error);
      return false;
    }
  }

  /**
   * Get server version
   */
  private getServerVersion(): string {
    try {
      // Try to get version from Moud API
      if (api.server && api.server.getVersion) {
        return api.server.getVersion();
      }
      
      // Fallback: try to get from server.properties or other means
      return "1.20.1"; // Conservative fallback
    } catch (error) {
      this.logger.error('Failed to get server version:', error);
      return "1.20.1";
    }
  }

  /**
   * Compare version strings
   */
  private compareVersions(current: string, required: string): number {
    try {
      const currentParts = current.split('.').map(Number);
      const requiredParts = required.split('.').map(Number);
      
      for (let i = 0; i < Math.max(currentParts.length, requiredParts.length); i++) {
        const currentPart = currentParts[i] || 0;
        const requiredPart = requiredParts[i] || 0;
        
        if (currentPart > requiredPart) return 1;
        if (currentPart < requiredPart) return -1;
      }
      
      return 0;
    } catch (error) {
      this.logger.error('Version comparison failed:', error);
      return -1;
    }
  }

  /**
   * Initialize state storage for block metadata
   */
  private initializeStateStorage(): void {
    try {
      // Initialize global state for experimental blocks
      if (api.state) {
        api.state.set("experimentalBlocks", {});
        api.state.set("dataMapValues", {});
        this.logger.info('Initialized global state storage for experimental blocks');
      }
    } catch (error) {
      this.logger.error('Failed to initialize state storage:', error);
    }
  }

  /**
   * Queue a server reload
   */
  private queueReload(): void {
    if (this.reloadInProgress) {
      this.logger.debug('Reload already in progress, queuing...');
      return;
    }

    this.reloadQueue.push(async () => {
      await this.triggerReload();
    });

    // Process reload queue if this is the first request
    if (this.reloadQueue.length === 1) {
      this.processReloadQueue();
    }
  }

  /**
   * Process reload queue
   */
  private async processReloadQueue(): Promise<void> {
    if (this.reloadInProgress || this.reloadQueue.length === 0) {
      return;
    }

    this.reloadInProgress = true;

    try {
      while (this.reloadQueue.length > 0) {
        const reloadTask = this.reloadQueue.shift()!;
        await reloadTask();
        
        // Small delay between reloads to prevent overwhelming
        await this.sleep(500);
      }
    } finally {
      this.reloadInProgress = false;
    }
  }

  /**
   * Trigger server reload
   */
  private async triggerReload(): Promise<void> {
    try {
      this.logger.info('Triggering server reload for experimental blocks...');

      // Trigger server reload
      const result = await this.fileSystemManager.triggerServerReload();

      if (!result.success) {
        throw new Error(`Failed to trigger server reload: ${result.error}`);
      }

      // Wait for reload to complete
      await this.sleep(1000);

      // Update global state with new block data
      this.updateGlobalState();

      this.logger.info('Server reload completed successfully');

    } catch (error) {
      this.logger.error('Failed to trigger server reload:', error);
      throw error;
    }
  }

  /**
   * Update global state with new block data
   */
  private updateGlobalState(): void {
    try {
      if (!api.state) return;

      // Update experimental blocks registry
      const experimentalBlocks: Record<string, any> = {};
      for (const [blockId, config] of this.blockRegistry) {
        experimentalBlocks[blockId] = {
          type: config.type,
          properties: config.properties,
          experimental: config.experimental,
          registeredAt: Date.now()
        };
      }
      api.state.set("experimentalBlocks", experimentalBlocks);

      // Update data map values
      const dataMapValues: Record<string, any> = {};
      for (const [blockId, behavior] of this.dataMaps) {
        dataMapValues[`endless:${blockId}`] = behavior;
      }
      api.state.set("dataMapValues", dataMapValues);

      this.logger.debug('Global state updated with new block data');

    } catch (error) {
      this.logger.error('Failed to update global state:', error);
    }
  }

  /**
   * Get block configuration
   */
  public getBlockConfig(blockId: string): BlockConfig | null {
    return this.blockRegistry.get(blockId) || null;
  }

  /**
   * Get block behavior
   */
  public getBlockBehavior(blockId: string): BlockBehavior | null {
    return this.dataMaps.get(blockId) || null;
  }

  /**
   * Get all registered blocks
   */
  public getRegisteredBlocks(): Map<string, BlockConfig> {
    return new Map(this.blockRegistry);
  }

  /**
   * Get all data maps
   */
  public getDataMaps(): Map<string, BlockBehavior> {
    return new Map(this.dataMaps);
  }

  /**
   * Check if block is registered
   */
  public isBlockRegistered(blockId: string): boolean {
    return this.blockRegistry.has(blockId);
  }

  /**
   * Get data map value at runtime
   */
  public getDataMapValue(blockId: string, property: string): any {
    try {
      // Use Moud's data map access
      if (api.state && api.state.getDataMap) {
        return api.state.getDataMap(`endless:${blockId}`, property);
      }

      // Fallback to local data
      const behavior = this.dataMaps.get(blockId);
      return behavior ? behavior[property as keyof BlockBehavior] : null;

    } catch (error) {
      this.logger.error(`Failed to get data map value:`, error);
      return null;
    }
  }

  /**
   * Get statistics
   */
  public getStatistics(): any {
    return {
      isInitialized: this.isInitialized,
      supportedVersion: this.supportedVersion,
      registeredBlocksCount: this.blockRegistry.size,
      dataMapsCount: this.dataMaps.size,
      reloadInProgress: this.reloadInProgress,
      queuedReloads: this.reloadQueue.length,
      experimentalMode: this.isExperimentalSupported()
    };
  }

  /**
   * Sleep utility function
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Shutdown data pack sync manager
   */
  public shutdown(): void {
    try {
      this.blockRegistry.clear();
      this.dataMaps.clear();
      this.reloadQueue = [];
      this.reloadInProgress = false;
      this.isInitialized = false;
      this.logger.info('DataPackSyncManager shutdown complete');
    } catch (error) {
      this.logger.error('Error during DataPackSyncManager shutdown:', error);
    }
  }
}

// Singleton instance for global access
let globalDataPackSyncManager: DataPackSyncManager | null = null;

/**
 * Get global data pack sync manager instance
 */
export function getDataPackSyncManager(): DataPackSyncManager {
  if (!globalDataPackSyncManager) {
    globalDataPackSyncManager = new DataPackSyncManager();
  }
  return globalDataPackSyncManager;
}

/**
 * Convenience function to register an experimental block
 */
export async function registerExperimentalBlock(
  blockId: string, 
  blockConfig: BlockConfig
): Promise<{ success: boolean; error?: string }> {
  const manager = getDataPackSyncManager();
  return await manager.registerBlock(blockId, blockConfig);
}

/**
 * Convenience function to get data map value
 */
export function getDataMapValue(blockId: string, property: string): any {
  const manager = getDataPackSyncManager();
  return manager.getDataMapValue(blockId, property);
}
