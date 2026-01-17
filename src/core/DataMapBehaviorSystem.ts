import { Logger } from '../utils/Logger';
// import { getDataPackSyncManager } from '../hooks/useDataPackSync'; // Removed

// Type definitions for behavior system
interface BehaviorDefinition {
  heal_amount?: number;
  damage_on_touch?: boolean;
  particle_effect?: string;
  sound_event?: string;
  light_level?: number;
  custom_drops?: string[];
  custom_properties?: Record<string, any>;
  on_break?: BehaviorEvent;
  on_place?: BehaviorEvent;
  on_interact?: BehaviorEvent;
  on_tick?: BehaviorEvent;
}

interface BehaviorEvent {
  type: 'command' | 'function' | 'effect' | 'sound' | 'particle' | 'custom';
  action: string;
  condition?: string;
  delay?: number;
  probability?: number;
}

interface DataMapEntry {
  type: string;
  values: Record<string, BehaviorDefinition>;
}

interface BehaviorRegistration {
  blockId: string;
  behavior: BehaviorDefinition;
  registeredAt: number;
  isActive: boolean;
  dataMapPath: string;
}

/**
 * Data Map Behavior System - Uses Data Maps API for reloadable block behaviors
 * Provides dynamic behavior modification without static registry limitations
 */
export class DataMapBehaviorSystem {
  private logger: Logger;
  // private dataPackSyncManager: any; // Removed
  private behaviorMaps: Map<string, BehaviorDefinition> = new Map();
  private registeredBehaviors: Map<string, BehaviorRegistration> = new Map();
  private behaviorSubscribers: Map<string, Set<Function>> = new Map();
  private isInitialized: boolean = false;
  private dataMapNamespace: string = "endless";
  private behaviorCache: Map<string, any> = new Map();
  private cacheValid: boolean = false;

  constructor() {
    this.logger = new Logger('DataMapBehaviorSystem');
    // this.dataPackSyncManager = getDataPackSyncManager(); // Removed
  }

  /**
   * Initialize the data map behavior system
   */
  public async initialize(): Promise<void> {
    try {
      // Initialize state storage
      this.initializeStateStorage();

      // Load existing behaviors from data maps
      await this.loadExistingBehaviors();

      // Subscribe to data map changes
      this.subscribeToDataMapChanges();

      this.isInitialized = true;
      this.logger.info('DataMapBehaviorSystem initialized successfully');

    } catch (error) {
      this.logger.error('Failed to initialize DataMapBehaviorSystem:', error);
      throw error;
    }
  }

  /**
   * Initialize state storage for behaviors
   */
  private initializeStateStorage(): void {
    try {
      if (api.state) {
        api.state.set("dataMapBehaviors", {});
        api.state.set("behaviorSubscriptions", {});
        this.logger.info('Initialized state storage for data map behaviors');
      }
    } catch (error) {
      this.logger.error('Failed to initialize state storage:', error);
    }
  }

  /**
   * Load existing behaviors from data maps
   */
  private async loadExistingBehaviors(): Promise<void> {
    try {
      // Try to load from existing data map files
      const dataMapFiles = await this.scanDataMapFiles();

      for (const filePath of dataMapFiles) {
        try {
          if (api.internal?.fs?.readFile) {
            const content = await api.internal.fs.readFile(filePath);
            const dataMap = JSON.parse(content);

            // Extract behaviors from data map
            for (const [key, value] of Object.entries(dataMap.values || {})) {
              if (key.startsWith(`${this.dataMapNamespace}:`)) {
                const blockId = key.substring(this.dataMapNamespace.length + 1);
                this.behaviorMaps.set(blockId, value as BehaviorDefinition);

                // Track registration
                this.registeredBehaviors.set(blockId, {
                  blockId,
                  behavior: value as BehaviorDefinition,
                  registeredAt: Date.now(),
                  isActive: true,
                  dataMapPath: filePath
                });
              }
            }
          }
        } catch (error) {
          this.logger.error(`Failed to load data map from ${filePath}:`, error);
        }
      }

      this.logger.info(`Loaded ${this.behaviorMaps.size} existing behaviors from data maps`);

    } catch (error) {
      this.logger.error('Failed to load existing behaviors:', error);
    }
  }

  /**
   * Scan for existing data map files
   */
  private async scanDataMapFiles(): Promise<string[]> {
    try {
      const files: string[] = [];
      const basePath = "world/datapacks/endless/data/endless/data_maps";

      // Try to list data map directory
      try {
        if (api.internal?.fs?.listFiles) {
          const dirList = await api.internal.fs.listFiles(basePath);

          for (const fileName of dirList) {
            if (fileName.endsWith('_behavior.json')) {
              files.push(`${basePath}/${fileName}`);
            }
          }
        }
      } catch (error) {
        this.logger.debug('Data map directory not found, starting fresh');
      }

      return files;

    } catch (error) {
      this.logger.error('Failed to scan data map files:', error);
      return [];
    }
  }

  /**
   * Subscribe to data map changes
   */
  private subscribeToDataMapChanges(): void {
    try {
      if (api.state?.subscribe) {
        // Subscribe to state changes that affect data maps
        api.state.subscribe("dataMapValues", (newValues) => {
          this.handleDataMapChange(newValues);
        });

        this.logger.debug('Subscribed to data map changes');
      }
    } catch (error) {
      this.logger.error('Failed to subscribe to data map changes:', error);
    }
  }

  /**
   * Handle data map changes
   */
  private handleDataMapChange(newValues: any): void {
    try {
      // Invalidate cache
      this.cacheValid = false;

      // Update local behavior maps
      if (typeof newValues === 'object' && newValues !== null) {
        for (const [key, value] of Object.entries(newValues || {})) {
          if (key.startsWith(`${this.dataMapNamespace}:`)) {
            const blockId = key.substring(this.dataMapNamespace.length + 1);
            this.behaviorMaps.set(blockId, value as BehaviorDefinition);

            // Notify subscribers
            this.notifyBehaviorSubscribers(blockId, value as BehaviorDefinition);
          }
        }
      }

      this.logger.debug('Data map changes processed');

    } catch (error) {
      this.logger.error('Failed to handle data map change:', error);
    }
  }

  /**
   * Notify behavior subscribers
   */
  private notifyBehaviorSubscribers(blockId: string, behavior: BehaviorDefinition): void {
    try {
      const subscribers = this.behaviorSubscribers.get(blockId);
      if (subscribers) {
        for (const callback of subscribers) {
          try {
            callback(blockId, behavior);
          } catch (error) {
            this.logger.error(`Behavior subscriber error for ${blockId}:`, error);
          }
        }
      }
    } catch (error) {
      this.logger.error('Failed to notify behavior subscribers:', error);
    }
  }

  /**
   * Register behavior for a block
   */
  public async registerBehavior(
    blockId: string,
    behavior: BehaviorDefinition
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.isInitialized) {
        return { success: false, error: "DataMapBehaviorSystem not initialized" };
      }

      // Validate behavior definition
      const validation = this.validateBehaviorDefinition(behavior);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      this.logger.info(`Registering behavior for block: ${blockId}`);

      // Create data map entry
      const dataMap = this.createDataMapEntry(blockId, behavior);

      // Write data map to filesystem
      const filePath = `world/datapacks/endless/data/endless/data_maps/${blockId}_behavior.json`;

      // Use internal api directly if available, bypassing removed dataPackManager
      if (api.internal?.fs?.writeFile) {
        await api.internal.fs.writeFile(
          filePath,
          JSON.stringify(dataMap, null, 2)
        );
      } else {
        this.logger.warn("Filesystem API not available, behavior registered in-memory only");
      }

      // Store in local registry
      this.behaviorMaps.set(blockId, behavior);
      this.registeredBehaviors.set(blockId, {
        blockId,
        behavior,
        registeredAt: Date.now(),
        isActive: true,
        dataMapPath: filePath
      });

      // Update global state
      this.updateGlobalState(blockId, behavior);

      // Invalidate cache
      this.cacheValid = false;

      this.logger.info(`Successfully registered behavior for ${blockId}`);
      return { success: true };

    } catch (error) {
      this.logger.error(`Failed to register behavior for ${blockId}:`, error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Validate behavior definition
   */
  private validateBehaviorDefinition(behavior: BehaviorDefinition): { valid: boolean; error?: string } {
    try {
      // Check for invalid property types
      const invalidProps = Object.keys(behavior).filter(key => {
        const value = behavior[key as keyof BehaviorDefinition];
        const validTypes = ['number', 'boolean', 'string', 'object'];
        return !validTypes.includes(typeof value) && !Array.isArray(value);
      });

      if (invalidProps.length > 0) {
        return { valid: false, error: `Invalid behavior properties: ${invalidProps.join(', ')}` };
      }

      // Validate numeric ranges
      if (behavior.heal_amount !== undefined && (behavior.heal_amount < -100 || behavior.heal_amount > 100)) {
        return { valid: false, error: "Heal amount must be between -100 and 100" };
      }

      if (behavior.light_level !== undefined && (behavior.light_level < 0 || behavior.light_level > 15)) {
        return { valid: false, error: "Light level must be between 0 and 15" };
      }

      // Validate events
      const events = ['on_break', 'on_place', 'on_interact', 'on_tick'];
      for (const event of events) {
        const eventData = behavior[event as keyof BehaviorDefinition] as BehaviorEvent;
        if (eventData) {
          const eventValidation = this.validateBehaviorEvent(eventData);
          if (!eventValidation.valid) {
            return eventValidation;
          }
        }
      }

      return { valid: true };

    } catch (error) {
      return { valid: false, error: `Behavior validation error: ${error}` };
    }
  }

  /**
   * Validate behavior event
   */
  private validateBehaviorEvent(event: BehaviorEvent): { valid: boolean; error?: string } {
    try {
      if (!event.type || !event.action) {
        return { valid: false, error: "Event must have type and action" };
      }

      const validTypes = ['command', 'function', 'effect', 'sound', 'particle', 'custom'];
      if (!validTypes.includes(event.type)) {
        return { valid: false, error: `Invalid event type: ${event.type}` };
      }

      if (event.probability !== undefined && (event.probability < 0 || event.probability > 1)) {
        return { valid: false, error: "Probability must be between 0 and 1" };
      }

      return { valid: true };

    } catch (error) {
      return { valid: false, error: `Event validation error: ${error}` };
    }
  }

  /**
   * Create data map entry
   */
  private createDataMapEntry(blockId: string, behavior: BehaviorDefinition): DataMapEntry {
    return {
      type: "minecraft:data_map",
      values: {
        [`${this.dataMapNamespace}:${blockId}`]: {
          // Core behavior properties
          heal_amount: behavior.heal_amount || 0,
          damage_on_touch: behavior.damage_on_touch || false,
          particle_effect: behavior.particle_effect || "minecraft:happy_villager",
          sound_event: behavior.sound_event || "minecraft:block.amethyst_cluster.step",
          light_level: behavior.light_level || 0,
          custom_drops: behavior.custom_drops || [],

          // Custom properties
          ...behavior.custom_properties,

          // Event handlers
          on_break: behavior.on_break,
          on_place: behavior.on_place,
          on_interact: behavior.on_interact,
          on_tick: behavior.on_tick
        }
      }
    };
  }

  /**
   * Update global state
   */
  private updateGlobalState(blockId: string, behavior: BehaviorDefinition): void {
    try {
      if (api.state) {
        const currentBehaviors = api.state.get("dataMapBehaviors") || {};
        currentBehaviors[blockId] = behavior;
        api.state.set("dataMapBehaviors", currentBehaviors);
      }
    } catch (error) {
      this.logger.error('Failed to update global state:', error);
    }
  }

  /**
   * Get behavior for a block
   */
  public getBehavior(blockId: string): BehaviorDefinition | null {
    try {
      // Check cache first
      if (this.cacheValid && this.behaviorCache.has(blockId)) {
        return this.behaviorCache.get(blockId);
      }

      // Get from local registry
      const behavior = this.behaviorMaps.get(blockId);
      if (behavior) {
        // Cache the result
        this.behaviorCache.set(blockId, behavior);
        return behavior;
      }

      // Try to get from global state
      if (api.state) {
        const behaviors = api.state.get("dataMapBehaviors") || {};
        const stateBehavior = behaviors[blockId];
        if (stateBehavior) {
          this.behaviorMaps.set(blockId, stateBehavior);
          this.behaviorCache.set(blockId, stateBehavior);
          return stateBehavior;
        }
      }

      return null;

    } catch (error) {
      this.logger.error(`Failed to get behavior for ${blockId}:`, error);
      return null;
    }
  }

  /**
   * Get specific behavior property
   */
  public getBehaviorProperty(blockId: string, property: keyof BehaviorDefinition): any {
    try {
      const behavior = this.getBehavior(blockId);
      return behavior ? behavior[property] : null;
    } catch (error) {
      this.logger.error(`Failed to get behavior property ${property} for ${blockId}:`, error);
      return null;
    }
  }

  /**
   * Get data map value at runtime
   */
  public getDataMapValue(blockId: string, property: string): any {
    try {
      // Use Moud's data map access
      if (api.state && api.state.getDataMap) {
        return api.state.getDataMap(`${this.dataMapNamespace}:${blockId}`, property);
      }

      // Fallback to local behavior
      const behavior = this.getBehavior(blockId);
      return behavior ? behavior[property as keyof BehaviorDefinition] : null;

    } catch (error) {
      this.logger.error(`Failed to get data map value:`, error);
      return null;
    }
  }

  /**
   * Subscribe to behavior changes
   */
  public subscribeToBehavior(blockId: string, callback: (blockId: string, behavior: BehaviorDefinition) => void): void {
    try {
      if (!this.behaviorSubscribers.has(blockId)) {
        this.behaviorSubscribers.set(blockId, new Set());
      }
      this.behaviorSubscribers.get(blockId)!.add(callback);

      this.logger.debug(`Subscribed to behavior changes for ${blockId}`);
    } catch (error) {
      this.logger.error(`Failed to subscribe to behavior for ${blockId}:`, error);
    }
  }

  /**
   * Unsubscribe from behavior changes
   */
  public unsubscribeFromBehavior(blockId: string, callback: (blockId: string, behavior: BehaviorDefinition) => void): void {
    try {
      const subscribers = this.behaviorSubscribers.get(blockId);
      if (subscribers) {
        subscribers.delete(callback);
        if (subscribers.size === 0) {
          this.behaviorSubscribers.delete(blockId);
        }
      }

      this.logger.debug(`Unsubscribed from behavior changes for ${blockId}`);
    } catch (error) {
      this.logger.error(`Failed to unsubscribe from behavior for ${blockId}:`, error);
    }
  }

  /**
   * Remove behavior for a block
   */
  public async removeBehavior(blockId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Remove from local registry
      this.behaviorMaps.delete(blockId);
      this.behaviorCache.delete(blockId);

      // Remove from registered behaviors
      const registration = this.registeredBehaviors.get(blockId);
      if (registration) {
        // Remove data map file
        try {
          if (api.internal?.fs?.deleteFile) {
            await api.internal.fs.deleteFile(registration.dataMapPath);
          }
        } catch (error) {
          this.logger.warn(`Failed to delete data map file: ${error}`);
        }

        this.registeredBehaviors.delete(blockId);
      }

      // Update global state
      if (api.state) {
        const currentBehaviors = api.state.get("dataMapBehaviors") || {};
        delete currentBehaviors[blockId];
        api.state.set("dataMapBehaviors", currentBehaviors);
      }

      // Notify subscribers
      this.notifyBehaviorSubscribers(blockId, {} as BehaviorDefinition);

      this.logger.info(`Removed behavior for ${blockId}`);
      return { success: true };

    } catch (error) {
      this.logger.error(`Failed to remove behavior for ${blockId}:`, error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Get all registered behaviors
   */
  public getRegisteredBehaviors(): Map<string, BehaviorRegistration> {
    return new Map(this.registeredBehaviors);
  }

  /**
   * Get behavior statistics
   */
  public getStatistics(): any {
    return {
      isInitialized: this.isInitialized,
      registeredBehaviorsCount: this.registeredBehaviors.size,
      behaviorMapsCount: this.behaviorMaps.size,
      subscribersCount: Array.from(this.behaviorSubscribers.values()).reduce((sum, set) => sum + set.size, 0),
      cacheSize: this.behaviorCache.size,
      cacheValid: this.cacheValid,
      dataMapNamespace: this.dataMapNamespace
    };
  }

  /**
   * Clear behavior cache
   */
  public clearCache(): void {
    this.behaviorCache.clear();
    this.cacheValid = false;
    this.logger.info('Behavior cache cleared');
  }

  /**
   * Validate all behaviors
   */
  public validateAllBehaviors(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const [blockId, behavior] of this.behaviorMaps) {
      const validation = this.validateBehaviorDefinition(behavior);
      if (!validation.valid) {
        errors.push(`${blockId}: ${validation.error}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Shutdown data map behavior system
   */
  public shutdown(): void {
    try {
      this.behaviorMaps.clear();
      this.registeredBehaviors.clear();
      this.behaviorSubscribers.clear();
      this.behaviorCache.clear();
      this.cacheValid = false;
      this.isInitialized = false;
      this.logger.info('DataMapBehaviorSystem shutdown complete');
    } catch (error) {
      this.logger.error('Error during DataMapBehaviorSystem shutdown:', error);
    }
  }
}

// Singleton instance for global access
let globalDataMapBehaviorSystem: DataMapBehaviorSystem | null = null;

/**
 * Get global data map behavior system instance
 */
export function getDataMapBehaviorSystem(): DataMapBehaviorSystem {
  if (!globalDataMapBehaviorSystem) {
    globalDataMapBehaviorSystem = new DataMapBehaviorSystem();
  }
  return globalDataMapBehaviorSystem;
}

/**
 * Convenience function to register behavior
 */
export async function registerBlockBehavior(
  blockId: string,
  behavior: BehaviorDefinition
): Promise<{ success: boolean; error?: string }> {
  const system = getDataMapBehaviorSystem();
  return await system.registerBehavior(blockId, behavior);
}

/**
 * Convenience function to get behavior property
 */
export function getBlockBehaviorProperty(blockId: string, property: keyof BehaviorDefinition): any {
  const system = getDataMapBehaviorSystem();
  return system.getBehaviorProperty(blockId, property);
}
