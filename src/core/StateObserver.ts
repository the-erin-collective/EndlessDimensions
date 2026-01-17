import { Logger } from '../utils/Logger';

// Type definitions for Moud API (these will be provided by Moud SDK)
interface Vec3 {
  x: number;
  y: number;
  z: number;
}

interface EntityState {
  type: string;
  position: Vec3;
  itemStack?: {
    id: string;
    tag?: any;
  };
  velocity?: Vec3;
  id: string;
}

interface PlayerState {
  position: Vec3;
  inventory: {
    selectedItem?: {
      id: string;
      tag?: any;
    };
  };
  dimension: string;
  id: string;
}

/**
 * Manual State Observer using low-level Moud API
 * Replaces @stateSync decorator with direct state subscription
 */
export class StateObserver {
  private logger: Logger;
  private serverState: any = {};
  private lastPlayerPositions: Map<string, Vec3> = new Map();
  private monitoredEntities: Map<string, EntityState> = new Map();
  private isInitialized: boolean = false;

  constructor() {
    this.logger = new Logger('StateObserver');
    this.initializeStateSubscription();
  }

  /**
   * Initialize the state subscription to monitor all server state changes
   */
  private initializeStateSubscription(): void {
    try {
      // Subscribe to entire server state using low-level API
      api.state.subscribe("*", (data: any) => {
        this.serverState = data;
        if (!this.isInitialized) {
          this.isInitialized = true;
          this.logger.info('StateObserver initialized and receiving server state');
        }
        this.processStateChanges();
      });

      this.logger.info('StateObserver subscribed to server state updates');

    } catch (error) {
      this.logger.error('Failed to initialize state subscription:', error);
      // Fallback: try to initialize with basic polling
      this.initializeFallbackPolling();
    }
  }

  /**
   * Fallback polling method if state subscription fails
   */
  private initializeFallbackPolling(): void {
    this.logger.warn('Using fallback polling method for state observation');
    
    // Use scheduler to poll state every 100ms
    try {
      api.scheduler.runRepeating(100, () => {
        this.pollServerState();
      });
    } catch (error) {
      this.logger.error('Failed to initialize fallback polling:', error);
    }
  }

  /**
   * Poll server state manually
   */
  private pollServerState(): void {
    try {
      // Try to get state directly
      const currentState = api.state.get("*");
      if (currentState && currentState !== this.serverState) {
        this.serverState = currentState;
        this.processStateChanges();
      }
    } catch (error) {
      // Silent polling errors
    }
  }

  /**
   * Process state changes and trigger appropriate handlers
   */
  private processStateChanges(): void {
    try {
      this.checkPlayerPositions();
      this.checkEntitySpawns();
      this.checkInventoryChanges();
      this.checkDimensionChanges();
    } catch (error) {
      this.logger.error('Error processing state changes:', error);
    }
  }

  /**
   * Check for player position changes
   */
  private checkPlayerPositions(): void {
    try {
      const players = this.serverState.players || {};
      
      for (const [playerId, player] of Object.entries(players)) {
        const playerState = player as PlayerState;
        const lastPos = this.lastPlayerPositions.get(playerId);
        const currentPos = playerState.position;
        
        // Check if position changed significantly
        if (lastPos && this.calculateDistance(lastPos, currentPos) < 0.1) {
          continue; // Skip minor movements
        }

        // Update last known position
        this.lastPlayerPositions.set(playerId, currentPos);

        // Check for portal entry
        if (this.isInsidePortalStructure(currentPos)) {
          this.handlePortalEntry(playerId, currentPos);
        }

        // Check proximity to monitored entities
        this.checkEntityProximity(playerId, currentPos);
      }

    } catch (error) {
      this.logger.error('Error checking player positions:', error);
    }
  }

  /**
   * Check for entity spawns and updates
   */
  private checkEntitySpawns(): void {
    try {
      const entities = this.serverState.entities || {};
      
      for (const [entityId, entity] of Object.entries(entities)) {
        const entityState = entity as EntityState;
        
        // Check if this is a new entity
        if (!this.monitoredEntities.has(entityId)) {
          this.handleEntitySpawn(entityId, entityState);
        } else {
          // Update existing entity
          this.monitoredEntities.set(entityId, entityState);
        }
      }

      // Clean up entities that no longer exist
      for (const [entityId] of this.monitoredEntities) {
        if (!entities[entityId]) {
          this.monitoredEntities.delete(entityId);
        }
      }

    } catch (error) {
      this.logger.error('Error checking entity spawns:', error);
    }
  }

  /**
   * Check for inventory changes
   */
  private checkInventoryChanges(): void {
    try {
      const players = this.serverState.players || {};
      
      for (const [playerId, player] of Object.entries(players)) {
        const playerState = player as PlayerState;
        const selectedItem = playerState.inventory?.selectedItem;
        
        if (selectedItem && selectedItem.id === "minecraft:written_book") {
          this.handleBookSelection(playerId, selectedItem);
        }
      }

    } catch (error) {
      this.logger.error('Error checking inventory changes:', error);
    }
  }

  /**
   * Check for dimension changes
   */
  private checkDimensionChanges(): void {
    try {
      const players = this.serverState.players || {};
      
      for (const [playerId, player] of Object.entries(players)) {
        const playerState = player as PlayerState;
        // Dimension change handling would go here
        // For now, we just track dimension changes
      }

    } catch (error) {
      this.logger.error('Error checking dimension changes:', error);
    }
  }

  /**
   * Handle player entering a portal
   */
  private handlePortalEntry(playerId: string, pos: Vec3): void {
    try {
      this.logger.info(`Player ${playerId} entered portal at position ${JSON.stringify(pos)}`);
      
      // Check if player is holding a written book
      const playerState = this.serverState.players[playerId] as PlayerState;
      const selectedItem = playerState.inventory?.selectedItem;
      
      if (selectedItem && selectedItem.id === "minecraft:written_book") {
        this.logger.info(`Player ${playerId} holding written book in portal`);
        this.triggerDimensionShift(playerId, selectedItem, pos);
      }

    } catch (error) {
      this.logger.error(`Error handling portal entry for player ${playerId}:`, error);
    }
  }

  /**
   * Handle entity spawn
   */
  private handleEntitySpawn(entityId: string, entity: EntityState): void {
    try {
      // Monitor written book entities
      if (entity.type === "minecraft:item" && 
          entity.itemStack && 
          entity.itemStack.id === "minecraft:written_book") {
        
        this.logger.info(`Written book entity spawned: ${entityId}`);
        this.monitoredEntities.set(entityId, entity);
        
        // Check if book is near a portal
        if (this.isNearPortal(entity.position)) {
          this.handleBookPortalCollision(entityId, entity);
        }
      }

    } catch (error) {
      this.logger.error(`Error handling entity spawn for ${entityId}:`, error);
    }
  }

  /**
   * Handle book selection
   */
  private handleBookSelection(playerId: string, selectedItem: any): void {
    try {
      this.logger.info(`Player ${playerId} selected written book`);
      
      if (selectedItem.tag) {
        const bookData = this.extractBookData(selectedItem.tag);
        this.logger.info(`Book data: ${JSON.stringify(bookData)}`);
        
        // Check if book has dimension data
        if (bookData.title || (bookData.pages && bookData.pages.length > 0)) {
          this.logger.info(`Book contains dimension-eligible content`);
        }
      }

    } catch (error) {
      this.logger.error(`Error handling book selection for player ${playerId}:`, error);
    }
  }

  /**
   * Check entity proximity to player
   */
  private checkEntityProximity(playerId: string, playerPos: Vec3): void {
    try {
      for (const [entityId, entity] of this.monitoredEntities) {
        const distance = this.calculateDistance(playerPos, entity.position);
        
        // If player is close to book entity
        if (distance < 3.0 && this.isNearPortal(entity.position)) {
          this.logger.info(`Player ${playerId} near book ${entityId} near portal`);
          this.handleBookPortalCollision(entityId, entity);
        }
      }

    } catch (error) {
      this.logger.error(`Error checking entity proximity for player ${playerId}:`, error);
    }
  }

  /**
   * Handle book portal collision
   */
  private handleBookPortalCollision(entityId: string, entity: EntityState): void {
    try {
      this.logger.info(`Book portal collision detected: entity=${entityId}`);
      
      if (entity.itemStack && entity.itemStack.tag) {
        const bookData = this.extractBookData(entity.itemStack.tag);
        this.logger.info(`Book collision data: ${JSON.stringify(bookData)}`);
        
        // Trigger dimension generation
        this.triggerDimensionGeneration(bookData, entity.position);
      }

    } catch (error) {
      this.logger.error(`Error handling book portal collision:`, error);
    }
  }

  /**
   * Trigger dimension shift for player
   */
  private triggerDimensionShift(playerId: string, selectedItem: any, pos: Vec3): void {
    try {
      this.logger.info(`Triggering dimension shift for player ${playerId}`);
      
      if (selectedItem.tag) {
        const bookData = this.extractBookData(selectedItem.tag);
        this.triggerDimensionGeneration(bookData, pos);
      }

    } catch (error) {
      this.logger.error(`Error triggering dimension shift for player ${playerId}:`, error);
    }
  }

  /**
   * Trigger dimension generation
   */
  private triggerDimensionGeneration(bookData: any, position: Vec3): void {
    try {
      this.logger.info(`Triggering dimension generation from book data`);
      
      // This will be implemented when we connect to DimensionGenerator
      // For now, just log the data
      this.logger.info(`Book title: ${bookData.title}`);
      this.logger.info(`Book pages: ${bookData.pages.length}`);
      this.logger.info(`Position: ${JSON.stringify(position)}`);

    } catch (error) {
      this.logger.error(`Error triggering dimension generation:`, error);
    }
  }

  /**
   * Check if position is inside portal structure
   */
  private isInsidePortalStructure(pos: Vec3): boolean {
    try {
      // Check for portal blocks in a 3x3x3 area around position
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dz = -1; dz <= 1; dz++) {
            const checkPos = {
              x: pos.x + dx,
              y: pos.y + dy,
              z: pos.z + dz
            };
            
            if (this.isPortalBlock(checkPos)) {
              return true;
            }
          }
        }
      }
      return false;

    } catch (error) {
      this.logger.error('Error checking portal structure:', error);
      return false;
    }
  }

  /**
   * Check if position is near any portal
   */
  private isNearPortal(pos: Vec3): boolean {
    try {
      // Check in a 5x5x5 area for portal blocks
      for (let dx = -2; dx <= 2; dx++) {
        for (let dy = -2; dy <= 2; dy++) {
          for (let dz = -2; dz <= 2; dz++) {
            const checkPos = {
              x: pos.x + dx,
              y: pos.y + dy,
              z: pos.z + dz
            };
            
            if (this.isPortalBlock(checkPos)) {
              return true;
            }
          }
        }
      }
      return false;

    } catch (error) {
      this.logger.error('Error checking near portal:', error);
      return false;
    }
  }

  /**
   * Check if a specific position has a portal block
   */
  private isPortalBlock(pos: Vec3): boolean {
    try {
      // Use Moud's world API to get block at position
      const block = api.world.getBlock(pos.x, pos.y, pos.z);
      return block === "minecraft:nether_portal";
    } catch (error) {
      // If API not available, return false
      return false;
    }
  }

  /**
   * Extract book data from NBT tag
   */
  private extractBookData(tag: any): any {
    try {
      return {
        title: tag.title || 'Untitled',
        author: tag.author || 'Unknown',
        pages: tag.pages || [],
        resolved: tag.resolved || false
      };
    } catch (error) {
      this.logger.error('Error extracting book data:', error);
      return {
        title: 'Untitled',
        author: 'Unknown',
        pages: [],
        resolved: false
      };
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
   * Get current server state
   */
  public getServerState(): any {
    return this.serverState;
  }

  /**
   * Get monitored entities
   */
  public getMonitoredEntities(): Map<string, EntityState> {
    return new Map(this.monitoredEntities);
  }

  /**
   * Get monitoring statistics
   */
  public getMonitoringStats(): any {
    return {
      initialized: this.isInitialized,
      trackedPlayersCount: this.lastPlayerPositions.size,
      monitoredEntitiesCount: this.monitoredEntities.size,
      hasServerState: Object.keys(this.serverState).length > 0
    };
  }

  /**
   * Stop monitoring
   */
  public shutdown(): void {
    try {
      this.monitoredEntities.clear();
      this.lastPlayerPositions.clear();
      this.isInitialized = false;
      this.logger.info('StateObserver shutdown complete');
    } catch (error) {
      this.logger.error('Error during StateObserver shutdown:', error);
    }
  }
}
