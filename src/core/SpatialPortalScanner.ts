/// <reference types="@epi-studio/moud-sdk" />
import { Logger } from '../utils/Logger';
import { getTickScheduler } from '../hooks/useScheduler';
import { getCentralizedStateManager } from './CentralizedStateManager';

// Type definitions for spatial scanning
interface Vec3 {
  x: number;
  y: number;
  z: number;
}

interface EntityData {
  id: string;
  type: string;
  position: Vec3;
  velocity: Vec3;
  itemStack?: {
    id: string;
    count: number;
    tag?: any;
  };
  owner?: string;
  age: number;
  onGround: boolean;
}

interface PortalData {
  position: Vec3;
  type: 'nether' | 'end' | 'custom';
  isActive: boolean;
  axis: 'x' | 'z';
  width: number;
  height: number;
  dimension: string;
}

interface BookPortalCollision {
  entityId: string;
  bookData: any;
  portalData: PortalData;
  collisionTime: number;
  playerInvolved?: string;
}

interface SpatialRegion {
  min: Vec3;
  max: Vec3;
  dimension: string;
}

interface ScanStatistics {
  totalScans: number;
  entitiesScanned: number;
  portalsDetected: number;
  collisionsDetected: number;
  averageScanTime: number;
  lastScanTime: number;
  activePortals: number;
  trackedBooks: number;
}

/**
 * Spatial Portal Scanner - Uses tick polling to detect book-portal collisions
 * Provides comprehensive spatial scanning for portal interactions
 */
export class SpatialPortalScanner {
  private logger: Logger;
  private tickScheduler: any;
  private stateManager: any;
  private trackedEntities: Map<string, EntityData> = new Map();
  private activePortals: Map<string, PortalData> = new Map();
  private collisionHistory: Map<string, BookPortalCollision> = new Map();
  private scanRegions: Map<string, SpatialRegion> = new Map();
  private isInitialized: boolean = false;
  private scanInterval: number = 100; // 100ms scan interval
  private portalDetectionRadius: number = 32; // 32 block radius
  private bookTrackingRadius: number = 16; // 16 block tracking radius
  private collisionCooldown: number = 5000; // 5 second cooldown
  private statistics: ScanStatistics;

  constructor() {
    this.logger = new Logger('SpatialPortalScanner');
    this.tickScheduler = getTickScheduler();
    this.stateManager = getCentralizedStateManager();
    this.statistics = {
      totalScans: 0,
      entitiesScanned: 0,
      portalsDetected: 0,
      collisionsDetected: 0,
      averageScanTime: 0,
      lastScanTime: 0,
      activePortals: 0,
      trackedBooks: 0
    };
  }

  /**
   * Initialize the spatial portal scanner
   */
  public async initialize(): Promise<void> {
    try {
      // Subscribe to tick scheduler
      this.subscribeToTickScheduler();

      // Subscribe to state changes
      this.subscribeToStateChanges();

      // Initialize portal detection
      this.initializePortalDetection();

      // Initialize entity tracking
      this.initializeEntityTracking();

      this.isInitialized = true;
      this.logger.info('SpatialPortalScanner initialized successfully');

    } catch (error) {
      this.logger.error('Failed to initialize SpatialPortalScanner:', error);
      throw error;
    }
  }

  /**
   * Subscribe to tick scheduler
   */
  private subscribeToTickScheduler(): void {
    try {
      this.tickScheduler.registerSpatialChecker(
        'portal_scanner',
        this.performSpatialScan.bind(this),
        {
          interval: this.scanInterval,
          priority: 'high',
          enabled: true
        }
      );

      this.logger.debug('Subscribed to tick scheduler');
    } catch (error) {
      this.logger.error('Failed to subscribe to tick scheduler:', error);
    }
  }

  /**
   * Subscribe to state changes
   */
  private subscribeToStateChanges(): void {
    try {
      // Subscribe to entity state changes
      this.stateManager.subscribe('entities', (change) => {
        this.handleEntityStateChange(change);
      }, {
        id: 'portal_scanner_entities',
        priority: 5
      });

      // Subscribe to portal state changes
      this.stateManager.subscribe('portals', (change) => {
        this.handlePortalStateChange(change);
      }, {
        id: 'portal_scanner_portals',
        priority: 5
      });

      this.logger.debug('Subscribed to state changes');
    } catch (error) {
      this.logger.error('Failed to subscribe to state changes:', error);
    }
  }

  /**
   * Initialize portal detection
   */
  private initializePortalDetection(): void {
    try {
      // Start with existing portals from state
      if (api.state) {
        const portals = api.state.get("portals") || {};
        for (const [portalId, portalData] of Object.entries(portals)) {
          this.activePortals.set(portalId, portalData as PortalData);
        }
      }

      this.logger.info(`Initialized with ${this.activePortals.size} portals`);
    } catch (error) {
      this.logger.error('Failed to initialize portal detection:', error);
    }
  }

  /**
   * Initialize entity tracking
   */
  private initializeEntityTracking(): void {
    try {
      // Load existing entities from state
      if (api.state) {
        const entities = api.state.get("entities") || {};
        for (const [entityId, entityData] of Object.entries(entities)) {
          this.trackedEntities.set(entityId, entityData as EntityData);
        }
      }

      this.logger.info(`Initialized with ${this.trackedEntities.size} tracked entities`);
    } catch (error) {
      this.logger.error('Failed to initialize entity tracking:', error);
    }
  }

  /**
   * Handle entity state changes
   */
  private handleEntityStateChange(change: any): void {
    try {
      const { key, delta } = change;

      if (delta.changeType === 'add') {
        const entity = delta.newValue;
        this.trackedEntities.set(key, entity);
      } else if (delta.changeType === 'remove') {
        this.trackedEntities.delete(key);
        this.collisionHistory.delete(key);
      } else if (delta.changeType === 'modify') {
        const entity = delta.newValue;
        this.trackedEntities.set(key, entity);
      }
    } catch (error) {
      this.logger.error('Failed to handle entity state change:', error);
    }
  }

  /**
   * Handle portal state changes
   */
  private handlePortalStateChange(change: any): void {
    try {
      const { key, delta } = change;

      if (delta.changeType === 'add') {
        const portal = delta.newValue;
        this.activePortals.set(key, portal);
        this.updateScanRegions();
      } else if (delta.changeType === 'remove') {
        this.activePortals.delete(key);
        this.updateScanRegions();
      } else if (delta.changeType === 'modify') {
        const portal = delta.newValue;
        this.activePortals.set(key, portal);
        this.updateScanRegions();
      }
    } catch (error) {
      this.logger.error('Failed to handle portal state change:', error);
    }
  }

  /**
   * Update scan regions based on active portals
   */
  private updateScanRegions(): void {
    try {
      this.scanRegions.clear();

      for (const [portalId, portal] of this.activePortals.entries()) {
        if (!portal.isActive) continue;

        // Create scan region around portal
        const region: SpatialRegion = {
          min: {
            x: portal.position.x - this.portalDetectionRadius,
            y: portal.position.y - this.portalDetectionRadius,
            z: portal.position.z - this.portalDetectionRadius
          },
          max: {
            x: portal.position.x + this.portalDetectionRadius,
            y: portal.position.y + this.portalDetectionRadius,
            z: portal.position.z + this.portalDetectionRadius
          },
          dimension: portal.dimension
        };

        this.scanRegions.set(portalId, region);
      }

      this.statistics.activePortals = this.activePortals.size;
    } catch (error) {
      this.logger.error('Failed to update scan regions:', error);
    }
  }

  /**
   * Perform spatial scan
   */
  private async performSpatialScan(): Promise<void> {
    if (!this.isInitialized) return;

    const startTime = Date.now();

    try {
      // Scan for book-portal collisions
      await this.scanBookPortalCollisions();

      // Update statistics
      const scanTime = Date.now() - startTime;
      this.updateStatistics(scanTime);

    } catch (error) {
      this.logger.error('Spatial scan failed:', error);
    }
  }

  /**
   * Scan for book-portal collisions
   */
  private async scanBookPortalCollisions(): Promise<void> {
    try {
      // Get all book entities
      const bookEntities = this.getBookEntities();

      for (const [entityId, entity] of bookEntities.entries()) {
        // Check if entity is near any portal
        const nearbyPortal = this.findNearbyPortal(entity.position, entity.dimension || 'overworld');
        
        if (nearbyPortal) {
          await this.handleBookPortalCollision(entityId, entity, nearbyPortal);
        }
      }

      this.statistics.trackedBooks = bookEntities.size;
    } catch (error) {
      this.logger.error('Failed to scan book-portal collisions:', error);
    }
  }

  /**
   * Get book entities
   */
  private getBookEntities(): Map<string, EntityData> {
    const bookEntities = new Map<string, EntityData>();

    try {
      for (const [entityId, entity] of this.trackedEntities.entries()) {
        // Check if entity is a book item
        if (entity.type === "minecraft:item" && 
            entity.itemStack?.id === "minecraft:written_book") {
          bookEntities.set(entityId, entity);
        }
      }
    } catch (error) {
      this.logger.error('Failed to get book entities:', error);
    }

    return bookEntities;
  }

  /**
   * Find nearby portal
   */
  private findNearbyPortal(position: Vec3, dimension: string): PortalData | null {
    try {
      for (const [portalId, portal] of this.activePortals.entries()) {
        if (!portal.isActive) continue;
        if (portal.dimension !== dimension) continue;

        // Check distance to portal
        const distance = this.calculateDistance(position, portal.position);
        
        if (distance <= this.portalDetectionRadius) {
          // Check if entity is actually within portal bounds
          if (this.isWithinPortalBounds(position, portal)) {
            return portal;
          }
        }
      }

      return null;
    } catch (error) {
      this.logger.error('Failed to find nearby portal:', error);
      return null;
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
   * Check if position is within portal bounds
   */
  private isWithinPortalBounds(position: Vec3, portal: PortalData): boolean {
    try {
      const portalPos = portal.position;
      
      // Check if position is within portal's bounding box
      const halfWidth = portal.width / 2;
      const halfHeight = portal.height / 2;

      if (portal.axis === 'x') {
        // X-axis portal (vertical on XZ plane)
        return (
          Math.abs(position.x - portalPos.x) <= 1.0 && // Portal thickness
          Math.abs(position.y - portalPos.y) <= halfHeight &&
          Math.abs(position.z - portalPos.z) <= halfWidth
        );
      } else {
        // Z-axis portal (vertical on XZ plane)
        return (
          Math.abs(position.x - portalPos.x) <= halfWidth &&
          Math.abs(position.y - portalPos.y) <= halfHeight &&
          Math.abs(position.z - portalPos.z) <= 1.0 // Portal thickness
        );
      }
    } catch (error) {
      this.logger.error('Failed to check portal bounds:', error);
      return false;
    }
  }

  /**
   * Handle book-portal collision
   */
  private async handleBookPortalCollision(
    entityId: string, 
    entity: EntityData, 
    portal: PortalData
  ): Promise<void> {
    try {
      // Check cooldown
      const lastCollision = this.collisionHistory.get(entityId);
      if (lastCollision && (Date.now() - lastCollision.collisionTime) < this.collisionCooldown) {
        return;
      }

      // Extract book data
      const bookData = this.extractBookData(entity.itemStack);
      if (!bookData) {
        this.logger.warn(`No valid book data for entity ${entityId}`);
        return;
      }

      // Check if book has dimension data
      if (!this.hasDimensionData(bookData)) {
        this.logger.debug(`Book entity ${entityId} has no dimension data`);
        return;
      }

      // Create collision record
      const collision: BookPortalCollision = {
        entityId,
        bookData,
        portalData: portal,
        collisionTime: Date.now(),
        playerInvolved: this.findNearbyPlayer(entity.position)
      };

      // Store collision
      this.collisionHistory.set(entityId, collision);

      // Trigger dimension creation
      await this.triggerDimensionCreation(bookData, portal, entity);

      // Update statistics
      this.statistics.collisionsDetected++;

      this.logger.info(`Book-portal collision detected: entity ${entityId} -> portal at ${JSON.stringify(portal.position)}`);

    } catch (error) {
      this.logger.error('Failed to handle book-portal collision:', error);
    }
  }

  /**
   * Extract book data from item stack
   */
  private extractBookData(itemStack: any): any {
    try {
      if (!itemStack || !itemStack.tag) {
        return null;
      }

      const tag = itemStack.tag;
      
      return {
        title: tag.title || '',
        author: tag.author || '',
        pages: tag.pages || [],
        resolved: tag.resolved || false,
        generation: tag.generation || 0,
        // Check for EndlessDimension custom data
        endlessDimension: tag.EndlessDimension || null,
        customData: tag
      };
    } catch (error) {
      this.logger.error('Failed to extract book data:', error);
      return null;
    }
  }

  /**
   * Check if book has dimension data
   */
  private hasDimensionData(bookData: any): boolean {
    try {
      // Check for EndlessDimension tag
      if (bookData.endlessDimension) {
        return true;
      }

      // Check for dimension data in pages
      if (bookData.pages && Array.isArray(bookData.pages)) {
        for (const page of bookData.pages) {
          if (typeof page === 'string' && page.includes('dimension:')) {
            return true;
          }
        }
      }

      // Check title for dimension keywords
      if (bookData.title && typeof bookData.title === 'string') {
        const dimensionKeywords = ['dimension:', 'realm:', 'world:', 'plane:'];
        return dimensionKeywords.some(keyword => bookData.title.includes(keyword));
      }

      return false;
    } catch (error) {
      this.logger.error('Failed to check dimension data:', error);
      return false;
    }
  }

  /**
   * Find nearby player
   */
  private findNearbyPlayer(position: Vec3): string | undefined {
    try {
      if (!api.state) return undefined;

      const players = api.state.get("players") || {};
      
      for (const [playerId, playerData] of Object.entries(players)) {
        const player = playerData as any;
        if (player.position) {
          const distance = this.calculateDistance(position, player.position);
          if (distance <= this.bookTrackingRadius) {
            return playerId;
          }
        }
      }

      return undefined;
    } catch (error) {
      this.logger.error('Failed to find nearby player:', error);
      return undefined;
    }
  }

  /**
   * Trigger dimension creation
   */
  private async triggerDimensionCreation(bookData: any, portal: PortalData, entity: EntityData): Promise<void> {
    try {
      // Extract dimension name from book
      const dimensionName = this.extractDimensionName(bookData);
      if (!dimensionName) {
        this.logger.warn('Could not extract dimension name from book');
        return;
      }

      // Create dimension configuration
      const dimensionConfig = this.createDimensionConfig(dimensionName, bookData);

      // Update state to trigger dimension creation
      if (api.state) {
        const dimensions = api.state.get("dimensions") || {};
        dimensions[dimensionName] = dimensionConfig;
        api.state.set("dimensions", dimensions);
      }

      // Notify state manager of portal usage
      this.stateManager.notifySubscribers({
        category: 'portals',
        key: portal.position.toString(),
        delta: {
          oldValue: null,
          newValue: {
            portal,
            bookData,
            entity,
            dimensionName,
            timestamp: Date.now()
          },
          changeType: 'modify',
          timestamp: Date.now(),
          source: 'portal_scanner'
        },
        priority: 'critical'
      });

      this.logger.info(`Triggered dimension creation: ${dimensionName}`);

    } catch (error) {
      this.logger.error('Failed to trigger dimension creation:', error);
    }
  }

  /**
   * Extract dimension name from book data
   */
  private extractDimensionName(bookData: any): string | null {
    try {
      // Check EndlessDimension tag first
      if (bookData.endlessDimension && bookData.endlessDimension.name) {
        return bookData.endlessDimension.name;
      }

      // Check pages for dimension data
      if (bookData.pages && Array.isArray(bookData.pages)) {
        for (const page of bookData.pages) {
          if (typeof page === 'string') {
            const match = page.match(/dimension:\s*([a-zA-Z0-9_]+)/);
            if (match) {
              return match[1];
            }
          }
        }
      }

      // Check title
      if (bookData.title && typeof bookData.title === 'string') {
        const match = bookData.title.match(/(?:dimension|realm|world|plane):\s*([a-zA-Z0-9_]+)/);
        if (match) {
          return match[1];
        }
      }

      return null;
    } catch (error) {
      this.logger.error('Failed to extract dimension name:', error);
      return null;
    }
  }

  /**
   * Create dimension configuration
   */
  private createDimensionConfig(dimensionName: string, bookData: any): any {
    try {
      // Generate seed from book data
      const seed = this.generateSeedFromBook(bookData);

      // Determine generator type based on book content
      const generatorType = this.determineGeneratorType(bookData);

      // Create basic configuration
      const config = {
        id: dimensionName.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
        name: dimensionName,
        generator: {
          type: generatorType,
          seed
        },
        biome: {
          id: `${dimensionName.toLowerCase().replace(/[^a-z0-9_]/g, '_')}_biome`,
          name: `${dimensionName} Biome`,
          temperature: 0.5,
          downfall: 0.5,
          precipitation: 'rain'
        },
        properties: {
          min_y: -64,
          height: 384,
          sea_level: 63,
          natural: true,
          has_skylight: true,
          has_ceiling: false,
          ultrawarm: false
        },
        bookData: {
          title: bookData.title,
          author: bookData.author,
          pages: bookData.pages
        }
      };

      return config;
    } catch (error) {
      this.logger.error('Failed to create dimension config:', error);
      return null;
    }
  }

  /**
   * Generate seed from book data
   */
  private generateSeedFromBook(bookData: any): number {
    try {
      // Create hash from book content
      const content = `${bookData.title || ''}${bookData.author || ''}${(bookData.pages || []).join('')}`;
      let hash = 0;
      
      for (let i = 0; i < content.length; i++) {
        const char = content.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
      }
      
      return Math.abs(hash);
    } catch (error) {
      this.logger.error('Failed to generate seed:', error);
      return Date.now();
    }
  }

  /**
   * Determine generator type from book content
   */
  private determineGeneratorType(bookData: any): string {
    try {
      const content = `${bookData.title || ''} ${(bookData.pages || []).join('')}`.toLowerCase();

      // Analyze content for generator type hints
      if (content.includes('void') || content.includes('empty') || content.includes('nothing')) {
        return 'void';
      } else if (content.includes('flat') || content.includes('plain') || content.includes('superflat')) {
        return 'flat';
      } else if (content.includes('island') || content.includes('sky') || content.includes('floating')) {
        return 'floating_islands';
      } else if (content.includes('end') || content.includes('void') || content.includes('ender')) {
        return 'the_end';
      } else {
        return 'noise'; // Default to noise
      }
    } catch (error) {
      this.logger.error('Failed to determine generator type:', error);
      return 'noise';
    }
  }

  /**
   * Update statistics
   */
  private updateStatistics(scanTime: number): void {
    try {
      this.statistics.totalScans++;
      this.statistics.lastScanTime = Date.now();
      
      // Update average scan time
      this.statistics.averageScanTime = 
        (this.statistics.averageScanTime * (this.statistics.totalScans - 1) + scanTime) / this.statistics.totalScans;
      
      this.statistics.entitiesScanned = this.trackedEntities.size;
      this.statistics.portalsDetected = this.activePortals.size;
    } catch (error) {
      this.logger.error('Failed to update statistics:', error);
    }
  }

  /**
   * Get statistics
   */
  public getStatistics(): ScanStatistics {
    return { ...this.statistics };
  }

  /**
   * Get collision history
   */
  public getCollisionHistory(): Map<string, BookPortalCollision> {
    return new Map(this.collisionHistory);
  }

  /**
   * Clear collision history
   */
  public clearCollisionHistory(): void {
    this.collisionHistory.clear();
    this.logger.info('Collision history cleared');
  }

  /**
   * Add portal manually
   */
  public addPortal(portalId: string, portalData: PortalData): void {
    this.activePortals.set(portalId, portalData);
    this.updateScanRegions();
    
    // Update state
    if (api.state) {
      const portals = api.state.get("portals") || {};
      portals[portalId] = portalData;
      api.state.set("portals", portals);
    }
  }

  /**
   * Remove portal
   */
  public removePortal(portalId: string): void {
    this.activePortals.delete(portalId);
    this.updateScanRegions();
    
    // Update state
    if (api.state) {
      const portals = api.state.get("portals") || {};
      delete portals[portalId];
      api.state.set("portals", portals);
    }
  }

  /**
   * Shutdown spatial portal scanner
   */
  public shutdown(): void {
    try {
      this.trackedEntities.clear();
      this.activePortals.clear();
      this.collisionHistory.clear();
      this.scanRegions.clear();
      this.isInitialized = false;
      this.logger.info('SpatialPortalScanner shutdown complete');
    } catch (error) {
      this.logger.error('Error during SpatialPortalScanner shutdown:', error);
    }
  }
}

// Singleton instance for global access
let globalSpatialPortalScanner: SpatialPortalScanner | null = null;

/**
 * Get global spatial portal scanner instance
 */
export function getSpatialPortalScanner(): SpatialPortalScanner {
  if (!globalSpatialPortalScanner) {
    globalSpatialPortalScanner = new SpatialPortalScanner();
  }
  return globalSpatialPortalScanner;
}

/**
 * Convenience function to add portal
 */
export function addPortal(portalId: string, portalData: PortalData): void {
  const scanner = getSpatialPortalScanner();
  scanner.addPortal(portalId, portalData);
}
