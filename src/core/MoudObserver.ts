/// <reference types="@epi-studio/moud-sdk" />
import { Logger } from '../utils/Logger';

// Type definitions for Moud state system (these will be provided by Moud SDK)
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
}

// Decorators for Moud state system (these will be provided by Moud SDK)
function stateSync(target: any) {
  // Placeholder for Moud's @stateSync decorator
  // This marks a class for state synchronization
}

function watch(path: string) {
  // Placeholder for Moud's @watch decorator
  // This watches specific state paths for changes
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    // Implementation will be provided by Moud SDK
  };
}

/**
 * Core state watcher that monitors player positions and entity states
 * Replaces missing event APIs with reactive state management
 */
@stateSync
export class MoudObserver {
  private logger: Logger;
  private portalPositions: Map<string, Vec3[]> = new Map();
  private monitoredBooks: Map<string, EntityState> = new Map();
  private lastPlayerPositions: Map<string, Vec3> = new Map();

  constructor() {
    this.logger = new Logger('MoudObserver');
    this.logger.info('MoudObserver initialized - starting state monitoring');
  }

  /**
   * Watch player position changes for portal detection
   */
  @watch("players.*.position")
  onPlayerMove(playerId: string, pos: Vec3): void {
    try {
      const lastPos = this.lastPlayerPositions.get(playerId);
      
      // Check if player moved significantly (to avoid spam)
      if (lastPos && this.calculateDistance(lastPos, pos) < 0.1) {
        return;
      }

      // Update last known position
      this.lastPlayerPositions.set(playerId, pos);

      // Check if player is inside any portal structure
      if (this.isInsidePortalStructure(pos)) {
        this.logger.info(`Player ${playerId} entered portal at position ${JSON.stringify(pos)}`);
        this.handlePortalEntry(playerId, pos);
      }

      // Check if player is near a monitored book entity
      this.checkBookProximity(playerId, pos);

    } catch (error) {
      this.logger.error(`Error in onPlayerMove for player ${playerId}:`, error);
    }
  }

  /**
   * Watch entity spawns for book detection
   */
  @watch("entities.*")
  onEntitySpawn(entityId: string, entity: EntityState): void {
    try {
      // Check if this is a written book item entity
      if (entity.type === "minecraft:item" && 
          entity.itemStack && 
          entity.itemStack.id === "minecraft:written_book") {
        
        this.logger.info(`Written book entity spawned: ${entityId}`);
        this.monitoredBooks.set(entityId, entity);
        
        // Start monitoring this book for portal collision
        this.monitorBookForPortal(entityId, entity);
      }

      // Monitor other relevant entities if needed
      this.monitorOtherEntities(entityId, entity);

    } catch (error) {
      this.logger.error(`Error in onEntitySpawn for entity ${entityId}:`, error);
    }
  }

  /**
   * Watch player inventory changes for book selection
   */
  @watch("players.*.inventory.selectedItem")
  onInventoryChange(playerId: string, selectedItem: any): void {
    try {
      if (selectedItem && selectedItem.id === "minecraft:written_book") {
        this.logger.info(`Player ${playerId} selected written book`);
        this.handleBookSelection(playerId, selectedItem);
      }
    } catch (error) {
      this.logger.error(`Error in onInventoryChange for player ${playerId}:`, error);
    }
  }

  /**
   * Watch player dimension changes
   */
  @watch("players.*.dimension")
  onDimensionChange(playerId: string, dimension: string): void {
    try {
      this.logger.info(`Player ${playerId} changed dimension to: ${dimension}`);
      this.handleDimensionChange(playerId, dimension);
    } catch (error) {
      this.logger.error(`Error in onDimensionChange for player ${playerId}:`, error);
    }
  }

  /**
   * Check if a position is inside a portal structure
   */
  private isInsidePortalStructure(pos: Vec3): boolean {
    try {
      // Check if position is within any known portal
      for (const [portalId, portalBlocks] of this.portalPositions) {
        for (const portalBlock of portalBlocks) {
          if (this.calculateDistance(pos, portalBlock) < 2.0) {
            return true;
          }
        }
      }
      
      // Also check for portal blocks directly (if we have access to block data)
      return this.checkForPortalBlock(pos);
      
    } catch (error) {
      this.logger.error('Error checking portal structure:', error);
      return false;
    }
  }

  /**
   * Check for portal blocks at a position
   */
  private checkForPortalBlock(pos: Vec3): boolean {
    // This would require access to world block data
    // For now, we'll use a simplified check based on Y level and known portal locations
    // TODO: Implement actual block checking when Moud provides world data access
    
    // Simplified check: assume portals are commonly found at Y levels 0-128
    if (pos.y < 0 || pos.y > 128) {
      return false;
    }
    
    // TODO: Replace with actual block data checking
    // api.world.getBlockAt(pos.x, pos.y, pos.z) === 'minecraft:nether_portal'
    return false;
  }

  /**
   * Handle player entering a portal
   */
  private handlePortalEntry(playerId: string, pos: Vec3): void {
    try {
      // Check if player is holding a written book
      // This would be handled by the inventory watcher, but we can also check directly
      
      // Trigger dimension shift logic
      // This will be implemented in PortalHandler
      this.logger.info(`Triggering dimension shift for player ${playerId}`);
      
      // TODO: Call PortalHandler.triggerDimensionShift(playerId, pos);
      
    } catch (error) {
      this.logger.error(`Error handling portal entry for player ${playerId}:`, error);
    }
  }

  /**
   * Monitor a book entity for portal collision
   */
  private monitorBookForPortal(entityId: string, entity: EntityState): void {
    try {
      // Set up continuous monitoring for this book
      // This will be handled by the global tick hook
      
      this.logger.info(`Starting portal monitoring for book entity ${entityId}`);
      
    } catch (error) {
      this.logger.error(`Error monitoring book ${entityId}:`, error);
    }
  }

  /**
   * Check if a player is near a monitored book
   */
  private checkBookProximity(playerId: string, playerPos: Vec3): void {
    try {
      for (const [bookId, bookEntity] of this.monitoredBooks) {
        const distance = this.calculateDistance(playerPos, bookEntity.position);
        
        // If player is close to book and book is near portal, trigger dimension
        if (distance < 3.0 && this.isInsidePortalStructure(bookEntity.position)) {
          this.logger.info(`Player ${playerId} near book ${bookId} near portal`);
          this.handleBookPortalCollision(playerId, bookEntity);
        }
      }
    } catch (error) {
      this.logger.error(`Error checking book proximity for player ${playerId}:`, error);
    }
  }

  /**
   * Handle book collision with portal
   */
  private handleBookPortalCollision(playerId: string, bookEntity: EntityState): void {
    try {
      this.logger.info(`Book portal collision detected: player=${playerId}, book=${bookEntity}`);
      
      // Extract book data and trigger dimension generation
      if (bookEntity.itemStack && bookEntity.itemStack.tag) {
        const bookData = this.extractBookData(bookEntity.itemStack.tag);
        // TODO: Pass bookData to DimensionGenerator
        this.logger.info(`Book data extracted: ${JSON.stringify(bookData)}`);
      }
      
    } catch (error) {
      this.logger.error(`Error handling book portal collision:`, error);
    }
  }

  /**
   * Handle player selecting a book
   */
  private handleBookSelection(playerId: string, selectedItem: any): void {
    try {
      this.logger.info(`Player ${playerId} selected book with data:`, selectedItem.tag);
      
      // Extract book data for potential dimension generation
      if (selectedItem.tag) {
        const bookData = this.extractBookData(selectedItem.tag);
        this.logger.info(`Selected book data: ${JSON.stringify(bookData)}`);
      }
      
    } catch (error) {
      this.logger.error(`Error handling book selection for player ${playerId}:`, error);
    }
  }

  /**
   * Handle player dimension change
   */
  private handleDimensionChange(playerId: string, dimension: string): void {
    try {
      this.logger.info(`Player ${playerId} is now in dimension: ${dimension}`);
      
      // Could trigger dimension-specific effects or logic here
      // TODO: Implement dimension-specific behaviors
      
    } catch (error) {
      this.logger.error(`Error handling dimension change for player ${playerId}:`, error);
    }
  }

  /**
   * Monitor other relevant entities
   */
  private monitorOtherEntities(entityId: string, entity: EntityState): void {
    try {
      // Monitor other entities that might be relevant
      // For example: projectiles, mobs, etc.
      
      if (entity.type.startsWith("minecraft:")) {
        // Could add specific monitoring for certain entity types
      }
      
    } catch (error) {
      this.logger.error(`Error monitoring entity ${entityId}:`, error);
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
   * Register a portal position for monitoring
   */
  public registerPortal(portalId: string, positions: Vec3[]): void {
    this.portalPositions.set(portalId, positions);
    this.logger.info(`Registered portal ${portalId} with ${positions.length} blocks`);
  }

  /**
   * Unregister a portal position
   */
  public unregisterPortal(portalId: string): void {
    this.portalPositions.delete(portalId);
    this.logger.info(`Unregistered portal ${portalId}`);
  }

  /**
   * Get all currently monitored books
   */
  public getMonitoredBooks(): Map<string, EntityState> {
    return new Map(this.monitoredBooks);
  }

  /**
   * Stop monitoring a specific book
   */
  public stopMonitoringBook(entityId: string): void {
    this.monitoredBooks.delete(entityId);
    this.logger.info(`Stopped monitoring book entity ${entityId}`);
  }

  /**
   * Get current monitoring statistics
   */
  public getMonitoringStats(): any {
    return {
      portalCount: this.portalPositions.size,
      monitoredBooksCount: this.monitoredBooks.size,
      trackedPlayersCount: this.lastPlayerPositions.size
    };
  }
}
