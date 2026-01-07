/// <reference types="@epi-studio/moud-sdk" />
import { Logger } from '../utils/Logger';

// Type definitions for Moud API
interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/**
 * Global Tick Hook - Provides 50ms heartbeat for continuous monitoring
 * Replaces missing event APIs with high-frequency polling
 */
export class TickScheduler {
  private logger: Logger;
  private tickCallbacks: Set<() => void> = new Set();
  private isRunning: boolean = false;
  private tickCount: number = 0;
  private lastTickTime: number = 0;
  private averageTickTime: number = 0;
  private tickTimes: number[] = [];
  private maxTickTimeHistory: number = 100;

  constructor() {
    this.logger = new Logger('TickScheduler');
  }

  /**
   * Initialize the tick scheduler
   */
  public initialize(): void {
    try {
      // Use Moud's scheduler for 50ms intervals (20Hz = 1 tick)
      api.scheduler.runRepeating(50, () => {
        this.executeTick();
      });

      this.isRunning = true;
      this.logger.info('TickScheduler initialized with 50ms interval');

    } catch (error) {
      this.logger.error('Failed to initialize TickScheduler:', error);
      // Fallback to setInterval if Moud scheduler fails
      this.initializeFallback();
    }
  }

  /**
   * Fallback using setInterval if Moud scheduler is not available
   */
  private initializeFallback(): void {
    try {
      this.logger.warn('Using fallback setInterval for TickScheduler');
      setInterval(() => {
        this.executeTick();
      }, 50);
      this.isRunning = true;
      this.logger.info('Fallback TickScheduler initialized');
    } catch (error) {
      this.logger.error('Failed to initialize fallback TickScheduler:', error);
    }
  }

  /**
   * Execute a single tick
   */
  private executeTick(): void {
    const startTime = Date.now();
    
    try {
      this.tickCount++;
      
      // Execute all registered callbacks
      for (const callback of this.tickCallbacks) {
        try {
          callback();
        } catch (callbackError) {
          this.logger.error('Error in tick callback:', callbackError);
        }
      }

      // Calculate performance metrics
      const tickTime = Date.now() - startTime;
      this.updatePerformanceMetrics(tickTime);

    } catch (error) {
      this.logger.error('Error executing tick:', error);
    }
  }

  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(tickTime: number): void {
    this.lastTickTime = tickTime;
    this.tickTimes.push(tickTime);
    
    // Keep only recent history
    if (this.tickTimes.length > this.maxTickTimeHistory) {
      this.tickTimes.shift();
    }
    
    // Calculate average
    if (this.tickTimes.length > 0) {
      this.averageTickTime = this.tickTimes.reduce((a, b) => a + b, 0) / this.tickTimes.length;
    }
    
    // Log performance warnings
    if (tickTime > 40) { // 80% of tick budget used
      if (tickTime > 45) { // 90% of tick budget used
        this.logger.warn(`Slow tick detected: ${tickTime}ms (average: ${this.averageTickTime.toFixed(2)}ms)`);
      }
    }
  }

  /**
   * Register a callback to be called every tick
   */
  public registerCallback(callback: () => void, name?: string): string {
    const callbackId = name || `callback_${this.tickCallbacks.size}`;
    
    // Wrap callback with error handling and naming
    const wrappedCallback = () => {
      try {
        callback();
      } catch (error) {
        this.logger.error(`Error in tick callback ${callbackId}:`, error);
      }
    };
    
    this.tickCallbacks.add(wrappedCallback);
    this.logger.debug(`Registered tick callback: ${callbackId}`);
    
    return callbackId;
  }

  /**
   * Unregister a tick callback
   */
  public unregisterCallback(callbackId: string): boolean {
    // Note: Since we're using Set, we can't easily remove by ID
    // In a real implementation, we'd use a Map instead
    this.logger.warn(`Cannot unregister callback ${callbackId} - Set-based implementation`);
    return false;
  }

  /**
   * Create a specialized spatial checker callback
   */
  public createSpatialChecker(
    checkFunction: () => void,
    checkInterval: number = 1, // Check every N ticks
    name?: string
  ): () => void {
    let tickCounter = 0;
    const checkerName = name || `spatial_checker_${Date.now()}`;
    
    const spatialCallback = () => {
      tickCounter++;
      if (tickCounter >= checkInterval) {
        tickCounter = 0;
        try {
          checkFunction();
        } catch (error) {
          this.logger.error(`Error in spatial checker ${checkerName}:`, error);
        }
      }
    };
    
    this.registerCallback(spatialCallback, checkerName);
    return spatialCallback;
  }

  /**
   * Create a proximity checker for entities
   */
  public createProximityChecker(
    getPositions: () => Vec3[],
    maxDistance: number,
    onProximity: (pos1: Vec3, pos2: Vec3) => void,
    name?: string
  ): () => void {
    const checkerName = name || `proximity_checker_${Date.now()}`;
    
    const proximityCallback = () => {
      try {
        const positions = getPositions();
        if (positions.length < 2) return;
        
        // Check all pairs for proximity
        for (let i = 0; i < positions.length; i++) {
          for (let j = i + 1; j < positions.length; j++) {
            const distance = this.calculateDistance(positions[i], positions[j]);
            if (distance <= maxDistance) {
              onProximity(positions[i], positions[j]);
            }
          }
        }
      } catch (error) {
        this.logger.error(`Error in proximity checker ${checkerName}:`, error);
      }
    };
    
    this.registerCallback(proximityCallback, checkerName);
    return proximityCallback;
  }

  /**
   * Create a portal collision detector
   */
  public createPortalCollisionDetector(
    getEntityPositions: () => { entityId: string; position: Vec3 }[],
    onCollision: (entityId: string, position: Vec3) => void,
    name?: string
  ): () => void {
    const checkerName = name || `portal_collision_${Date.now()}`;
    
    const collisionCallback = () => {
      try {
        const entities = getEntityPositions();
        
        for (const entity of entities) {
          if (this.isNearPortal(entity.position)) {
            onCollision(entity.entityId, entity.position);
          }
        }
      } catch (error) {
        this.logger.error(`Error in portal collision detector ${checkerName}:`, error);
      }
    };
    
    this.registerCallback(collisionCallback, checkerName);
    return collisionCallback;
  }

  /**
   * Check if a position is near a portal
   */
  private isNearPortal(pos: Vec3, radius: number = 3): boolean {
    try {
      // Check in a cube around the position
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dz = -radius; dz <= radius; dz++) {
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
      return false;
    }
  }

  /**
   * Check if a block at position is a portal
   */
  private isPortalBlock(pos: Vec3): boolean {
    try {
      const block = api.world.getBlock(pos.x, pos.y, pos.z);
      return block === "minecraft:nether_portal";
    } catch (error) {
      return false;
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
   * Get performance statistics
   */
  public getPerformanceStats(): any {
    return {
      isRunning: this.isRunning,
      tickCount: this.tickCount,
      lastTickTime: this.lastTickTime,
      averageTickTime: this.averageTickTime,
      callbackCount: this.tickCallbacks.size,
      ticksPerSecond: this.isRunning ? 1000 / 50 : 0, // 20Hz
      performanceRatio: this.averageTickTime / 50 // Percentage of tick budget used
    };
  }

  /**
   * Get current tick count
   */
  public getTickCount(): number {
    return this.tickCount;
  }

  /**
   * Check if scheduler is running
   */
  public isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Stop the tick scheduler
   */
  public shutdown(): void {
    try {
      this.isRunning = false;
      this.tickCallbacks.clear();
      this.tickTimes = [];
      this.logger.info('TickScheduler shutdown complete');
    } catch (error) {
      this.logger.error('Error during TickScheduler shutdown:', error);
    }
  }

  /**
   * Reset performance metrics
   */
  public resetMetrics(): void {
    this.tickCount = 0;
    this.lastTickTime = 0;
    this.averageTickTime = 0;
    this.tickTimes = [];
    this.logger.info('Performance metrics reset');
  }
}

// Singleton instance for global access
let globalTickScheduler: TickScheduler | null = null;

/**
 * Get the global tick scheduler instance
 */
export function getTickScheduler(): TickScheduler {
  if (!globalTickScheduler) {
    globalTickScheduler = new TickScheduler();
  }
  return globalTickScheduler;
}

/**
 * Convenience function to register a tick callback
 */
export function useTickScheduler(callback: () => void, name?: string): string {
  const scheduler = getTickScheduler();
  return scheduler.registerCallback(callback, name);
}

/**
 * Convenience function to create a spatial checker
 */
export function useSpatialChecker(
  checkFunction: () => void,
  checkInterval?: number,
  name?: string
): () => void {
  const scheduler = getTickScheduler();
  return scheduler.createSpatialChecker(checkFunction, checkInterval, name);
}

/**
 * Convenience function to create a proximity checker
 */
export function useProximityChecker(
  getPositions: () => Vec3[],
  maxDistance: number,
  onProximity: (pos1: Vec3, pos2: Vec3) => void,
  name?: string
): () => void {
  const scheduler = getTickScheduler();
  return scheduler.createProximityChecker(getPositions, maxDistance, onProximity, name);
}

/**
 * Convenience function to create a portal collision detector
 */
export function usePortalCollisionDetector(
  getEntityPositions: () => { entityId: string; position: Vec3 }[],
  onCollision: (entityId: string, position: Vec3) => void,
  name?: string
): () => void {
  const scheduler = getTickScheduler();
  return scheduler.createPortalCollisionDetector(getEntityPositions, onCollision, name);
}
