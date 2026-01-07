/// <reference types="@epi-studio/moud-sdk" />
import { Logger } from '../utils/Logger';
import { getFileSystemManager } from '../hooks/useFileSystem';
import { getCentralizedStateManager } from './CentralizedStateManager';

// Type definitions for dimension data management
interface DimensionData {
  id: string;
  name: string;
  config: any;
  createdAt: number;
  lastAccessed: number;
  createdBy: string;
  bookData?: {
    title: string;
    author: string;
    pages: string[];
  };
  statistics: {
    totalVisits: number;
    uniqueVisitors: Set<string>;
    totalPlaytime: number;
    lastVisitTime: number;
  };
  properties: {
    isPublic: boolean;
    isTemporary: boolean;
    expiresAt?: number;
    maxPlayers?: number;
    allowedPlayers?: Set<string>;
    bannedPlayers?: Set<string>;
  };
  worldData: {
    seed: number;
    generatorType: string;
    biomeId: string;
    dimensionTypeId: string;
    datapackPath: string;
  };
  metadata: {
    tags: string[];
    description?: string;
    difficulty?: 'peaceful' | 'easy' | 'normal' | 'hard';
    gameMode?: 'survival' | 'creative' | 'adventure' | 'spectator';
    customRules?: Record<string, any>;
  };
}

interface DimensionVisit {
  dimensionId: string;
  playerId: string;
  joinTime: number;
  leaveTime?: number;
  duration?: number;
  reason?: string;
}

interface DimensionStorage {
  dimensions: Map<string, DimensionData>;
  visits: Map<string, DimensionVisit[]>;
  activePlayers: Map<string, Set<string>>; // dimensionId -> Set<playerId>
  cleanupSchedule: Map<string, number>; // dimensionId -> cleanup timestamp
}

interface CleanupTask {
  dimensionId: string;
  reason: 'expired' | 'inactive' | 'empty' | 'manual';
  scheduledTime: number;
  notifyOwner: boolean;
}

interface StorageStatistics {
  totalDimensions: number;
  activeDimensions: number;
  temporaryDimensions: number;
  expiredDimensions: number;
  totalVisits: number;
  uniqueVisitors: number;
  storageSize: number;
  lastCleanupTime: number;
}

/**
 * Dimension Data Manager - Handle cleanup, storage, and retrieval of dimension-specific data
 * Provides comprehensive dimension lifecycle management and data persistence
 */
export class DimensionDataManager {
  private logger: Logger;
  private fileSystemManager: any;
  private stateManager: any;
  private storage: DimensionStorage;
  private isInitialized: boolean = false;
  private cleanupInterval: number = 60000; // 1 minute cleanup interval
  private maxInactiveDays: number = 30; // 30 days before cleanup
  private maxTemporaryHours: number = 24; // 24 hours for temporary dimensions
  private storagePath: string = "world/endless/dimensions";
  private visitsPath: string = "world/endless/visits";
  private backupPath: string = "world/endless/backups";
  private statistics: StorageStatistics;

  constructor() {
    this.logger = new Logger('DimensionDataManager');
    this.fileSystemManager = getFileSystemManager();
    this.stateManager = getCentralizedStateManager();
    this.storage = {
      dimensions: new Map(),
      visits: new Map(),
      activePlayers: new Map(),
      cleanupSchedule: new Map()
    };
    this.statistics = {
      totalDimensions: 0,
      activeDimensions: 0,
      temporaryDimensions: 0,
      expiredDimensions: 0,
      totalVisits: 0,
      uniqueVisitors: 0,
      storageSize: 0,
      lastCleanupTime: 0
    };
  }

  /**
   * Initialize dimension data manager
   */
  public async initialize(): Promise<void> {
    try {
      // Ensure directories exist
      await this.ensureDirectoryStructure();

      // Load existing dimension data
      await this.loadDimensionData();

      // Load visit history
      await this.loadVisitHistory();

      // Subscribe to state changes
      this.subscribeToStateChanges();

      // Start cleanup scheduler
      this.startCleanupScheduler();

      // Initialize active player tracking
      this.initializeActivePlayerTracking();

      this.isInitialized = true;
      this.logger.info('DimensionDataManager initialized successfully');

    } catch (error) {
      this.logger.error('Failed to initialize DimensionDataManager:', error);
      throw error;
    }
  }

  /**
   * Ensure directory structure exists
   */
  private async ensureDirectoryStructure(): Promise<void> {
    try {
      const directories = [
        this.storagePath,
        this.visitsPath,
        this.backupPath,
        `${this.storagePath}/configs`,
        `${this.storagePath}/metadata`,
        `${this.storagePath}/statistics`
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
   * Load existing dimension data
   */
  private async loadDimensionData(): Promise<void> {
    try {
      const files = await this.fileSystemManager.listFiles(this.storagePath);
      
      for (const fileName of files) {
        if (fileName.endsWith('.json')) {
          try {
            const filePath = `${this.storagePath}/${fileName}`;
            const content = await api.internal.fs.readFile(filePath);
            const dimensionData = JSON.parse(content);

            // Convert Sets back from arrays
            if (dimensionData.statistics?.uniqueVisitors) {
              dimensionData.statistics.uniqueVisitors = new Set(dimensionData.statistics.uniqueVisitors);
            }
            if (dimensionData.properties?.allowedPlayers) {
              dimensionData.properties.allowedPlayers = new Set(dimensionData.properties.allowedPlayers);
            }
            if (dimensionData.properties?.bannedPlayers) {
              dimensionData.properties.bannedPlayers = new Set(dimensionData.properties.bannedPlayers);
            }

            this.storage.dimensions.set(dimensionData.id, dimensionData);
          } catch (error) {
            this.logger.error(`Failed to load dimension from ${fileName}:`, error);
          }
        }
      }

      this.statistics.totalDimensions = this.storage.dimensions.size;
      this.logger.info(`Loaded ${this.storage.dimensions.size} dimensions from storage`);
    } catch (error) {
      this.logger.error('Failed to load dimension data:', error);
    }
  }

  /**
   * Load visit history
   */
  private async loadVisitHistory(): Promise<void> {
    try {
      const files = await this.fileSystemManager.listFiles(this.visitsPath);
      
      for (const fileName of files) {
        if (fileName.endsWith('.json')) {
          try {
            const filePath = `${this.visitsPath}/${fileName}`;
            const content = await api.internal.fs.readFile(filePath);
            const visits = JSON.parse(content);

            const dimensionId = fileName.replace('.json', '');
            this.storage.visits.set(dimensionId, visits);
            this.statistics.totalVisits += visits.length;
          } catch (error) {
            this.logger.error(`Failed to load visits from ${fileName}:`, error);
          }
        }
      }

      this.logger.info(`Loaded visit history for ${this.storage.visits.size} dimensions`);
    } catch (error) {
      this.logger.error('Failed to load visit history:', error);
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
        id: 'dimension_data_manager',
        priority: 6
      });

      // Subscribe to dimension creation
      this.stateManager.subscribe('dimensions', (change) => {
        this.handleDimensionCreation(change);
      }, {
        id: 'dimension_data_manager',
        priority: 6
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
      // Update active players
      const activePlayers = this.storage.activePlayers.get(dimensionId);
      if (activePlayers) {
        activePlayers.delete(playerId);
        if (activePlayers.size === 0) {
          this.storage.activePlayers.delete(dimensionId);
        }
      }

      // Update visit record
      this.updateVisitRecord(playerId, dimensionId, true);

      // Update dimension statistics
      this.updateDimensionStatistics(dimensionId, playerId, false);

    } catch (error) {
      this.logger.error('Failed to handle player leave dimension:', error);
    }
  }

  /**
   * Handle player joining dimension
   */
  private handlePlayerJoinDimension(playerId: string, dimensionId: string): void {
    try {
      // Update active players
      if (!this.storage.activePlayers.has(dimensionId)) {
        this.storage.activePlayers.set(dimensionId, new Set());
      }
      this.storage.activePlayers.get(dimensionId)!.add(playerId);

      // Update visit record
      this.updateVisitRecord(playerId, dimensionId, false);

      // Update dimension statistics
      this.updateDimensionStatistics(dimensionId, playerId, true);

    } catch (error) {
      this.logger.error('Failed to handle player join dimension:', error);
    }
  }

  /**
   * Update visit record
   */
  private updateVisitRecord(playerId: string, dimensionId: string, isLeaving: boolean): void {
    try {
      if (!this.storage.visits.has(dimensionId)) {
        this.storage.visits.set(dimensionId, []);
      }

      const visits = this.storage.visits.get(dimensionId)!;

      if (isLeaving) {
        // Find current visit and update leave time
        const currentVisit = visits.find(v => v.playerId === playerId && !v.leaveTime);
        if (currentVisit) {
          currentVisit.leaveTime = Date.now();
          currentVisit.duration = currentVisit.leaveTime - currentVisit.joinTime;
        }
      } else {
        // Create new visit record
        const visit: DimensionVisit = {
          dimensionId,
          playerId,
          joinTime: Date.now()
        };
        visits.push(visit);
      }

    } catch (error) {
      this.logger.error('Failed to update visit record:', error);
    }
  }

  /**
   * Update dimension statistics
   */
  private updateDimensionStatistics(dimensionId: string, playerId: string, isJoining: boolean): void {
    try {
      const dimension = this.storage.dimensions.get(dimensionId);
      if (!dimension) return;

      if (isJoining) {
        dimension.statistics.totalVisits++;
        dimension.statistics.uniqueVisitors.add(playerId);
        dimension.statistics.lastVisitTime = Date.now();
      } else {
        // Update playtime when leaving
        const currentVisit = this.storage.visits.get(dimensionId)?.find(v => v.playerId === playerId && v.duration);
        if (currentVisit) {
          dimension.statistics.totalPlaytime += currentVisit.duration;
        }
      }

      // Update last accessed time
      dimension.lastAccessed = Date.now();

    } catch (error) {
      this.logger.error('Failed to update dimension statistics:', error);
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
          this.createDimensionData(config);
        }
      } else if (delta.changeType === 'remove') {
        const config = delta.oldValue;
        if (config && config.id) {
          this.removeDimensionData(config.id);
        }
      }
    } catch (error) {
      this.logger.error('Failed to handle dimension creation:', error);
    }
  }

  /**
   * Create dimension data
   */
  private createDimensionData(config: any): void {
    try {
      const dimensionData: DimensionData = {
        id: config.id,
        name: config.name,
        config,
        createdAt: Date.now(),
        lastAccessed: Date.now(),
        createdBy: config.bookData?.author || 'unknown',
        bookData: config.bookData,
        statistics: {
          totalVisits: 0,
          uniqueVisitors: new Set(),
          totalPlaytime: 0,
          lastVisitTime: 0
        },
        properties: {
          isPublic: true,
          isTemporary: false,
          maxPlayers: -1,
          allowedPlayers: new Set(),
          bannedPlayers: new Set()
        },
        worldData: {
          seed: config.generator?.seed || 0,
          generatorType: config.generator?.type || 'noise',
          biomeId: config.biome?.id || `${config.id}_biome`,
          dimensionTypeId: config.id,
          datapackPath: `world/datapacks/endless/data/endless/dimension/${config.id}.json`
        },
        metadata: {
          tags: [],
          description: `Dimension created from book: ${config.bookData?.title || 'Unknown'}`,
          difficulty: 'normal',
          gameMode: 'survival'
        }
      };

      this.storage.dimensions.set(config.id, dimensionData);
      this.saveDimensionData(config.id);

      this.logger.info(`Created dimension data: ${config.id}`);
    } catch (error) {
      this.logger.error('Failed to create dimension data:', error);
    }
  }

  /**
   * Remove dimension data
   */
  private removeDimensionData(dimensionId: string): void {
    try {
      this.storage.dimensions.delete(dimensionId);
      this.storage.visits.delete(dimensionId);
      this.storage.activePlayers.delete(dimensionId);
      this.storage.cleanupSchedule.delete(dimensionId);

      // Remove files
      this.deleteDimensionFiles(dimensionId);

      this.logger.info(`Removed dimension data: ${dimensionId}`);
    } catch (error) {
      this.logger.error('Failed to remove dimension data:', error);
    }
  }

  /**
   * Delete dimension files
   */
  private async deleteDimensionFiles(dimensionId: string): Promise<void> {
    try {
      const files = [
        `${this.storagePath}/${dimensionId}.json`,
        `${this.visitsPath}/${dimensionId}.json`,
        `${this.storagePath}/configs/${dimensionId}.json`,
        `${this.storagePath}/metadata/${dimensionId}.json`
      ];

      for (const file of files) {
        try {
          await api.internal.fs.deleteFile(file);
        } catch (error) {
          this.logger.warn(`Failed to delete file ${file}: ${error}`);
        }
      }
    } catch (error) {
      this.logger.error('Failed to delete dimension files:', error);
    }
  }

  /**
   * Start cleanup scheduler
   */
  private startCleanupScheduler(): void {
    try {
      setInterval(() => {
        this.performCleanup();
      }, this.cleanupInterval);

      this.logger.debug('Started cleanup scheduler');
    } catch (error) {
      this.logger.error('Failed to start cleanup scheduler:', error);
    }
  }

  /**
   * Initialize active player tracking
   */
  private initializeActivePlayerTracking(): void {
    try {
      if (api.state) {
        const players = api.state.get("players") || {};
        
        for (const [playerId, playerData] of Object.entries(players)) {
          const dimension = (playerData as any).dimension;
          if (dimension) {
            if (!this.storage.activePlayers.has(dimension)) {
              this.storage.activePlayers.set(dimension, new Set());
            }
            this.storage.activePlayers.get(dimension)!.add(playerId);
          }
        }
      }

      this.statistics.activeDimensions = this.storage.activePlayers.size;
      this.logger.info(`Initialized active player tracking for ${this.statistics.activeDimensions} dimensions`);
    } catch (error) {
      this.logger.error('Failed to initialize active player tracking:', error);
    }
  }

  /**
   * Perform cleanup
   */
  private async performCleanup(): Promise<void> {
    try {
      const cleanupTasks: CleanupTask[] = [];
      const now = Date.now();

      // Check for expired temporary dimensions
      for (const [dimensionId, dimension] of this.storage.dimensions.entries()) {
        if (dimension.properties.isTemporary && dimension.properties.expiresAt) {
          if (now > dimension.properties.expiresAt) {
            cleanupTasks.push({
              dimensionId,
              reason: 'expired',
              scheduledTime: now,
              notifyOwner: true
            });
          }
        }

        // Check for inactive dimensions
        const inactiveTime = now - dimension.lastAccessed;
        const maxInactiveTime = this.maxInactiveDays * 24 * 60 * 60 * 1000;
        
        if (inactiveTime > maxInactiveTime && !dimension.properties.isPublic) {
          cleanupTasks.push({
            dimensionId,
            reason: 'inactive',
            scheduledTime: now,
            notifyOwner: true
          });
        }

        // Check for empty dimensions
        const activePlayers = this.storage.activePlayers.get(dimensionId);
        if (!activePlayers || activePlayers.size === 0) {
          const emptyTime = now - dimension.statistics.lastVisitTime;
          const maxEmptyTime = 7 * 24 * 60 * 60 * 1000; // 7 days
          
          if (emptyTime > maxEmptyTime && dimension.properties.isTemporary) {
            cleanupTasks.push({
              dimensionId,
              reason: 'empty',
              scheduledTime: now,
              notifyOwner: false
            });
          }
        }
      }

      // Execute cleanup tasks
      for (const task of cleanupTasks) {
        await this.executeCleanupTask(task);
      }

      this.statistics.lastCleanupTime = now;
      this.statistics.expiredDimensions = cleanupTasks.length;

      if (cleanupTasks.length > 0) {
        this.logger.info(`Completed cleanup: ${cleanupTasks.length} dimensions processed`);
      }

    } catch (error) {
      this.logger.error('Failed to perform cleanup:', error);
    }
  }

  /**
   * Execute cleanup task
   */
  private async executeCleanupTask(task: CleanupTask): Promise<void> {
    try {
      const dimension = this.storage.dimensions.get(task.dimensionId);
      if (!dimension) return;

      // Create backup before deletion
      if (task.notifyOwner) {
        await this.createDimensionBackup(task.dimensionId);
      }

      // Notify owner if needed
      if (task.notifyOwner && dimension.createdBy) {
        await this.notifyDimensionCleanup(dimension, task.reason);
      }

      // Remove dimension data
      this.removeDimensionData(task.dimensionId);

      this.logger.info(`Executed cleanup task: ${task.dimensionId} (${task.reason})`);

    } catch (error) {
      this.logger.error('Failed to execute cleanup task:', error);
    }
  }

  /**
   * Create dimension backup
   */
  private async createDimensionBackup(dimensionId: string): Promise<void> {
    try {
      const dimension = this.storage.dimensions.get(dimensionId);
      if (!dimension) return;

      const backupData = {
        dimension,
        visits: this.storage.visits.get(dimensionId) || [],
        backupTime: Date.now(),
        version: '1.0'
      };

      const backupFileName = `${dimensionId}_${Date.now()}.json`;
      const backupPath = `${this.backupPath}/${backupFileName}`;

      const result = await this.fileSystemManager.writeFile(backupPath, JSON.stringify(backupData, null, 2));
      
      if (result.success) {
        this.logger.info(`Created backup for dimension: ${dimensionId}`);
      } else {
        this.logger.error(`Failed to create backup for ${dimensionId}: ${result.error}`);
      }

    } catch (error) {
      this.logger.error('Failed to create dimension backup:', error);
    }
  }

  /**
   * Notify dimension cleanup
   */
  private async notifyDimensionCleanup(dimension: DimensionData, reason: string): Promise<void> {
    try {
      let message = `§cYour dimension "${dimension.name}" has been cleaned up.\n`;
      message += `§7Reason: ${reason}\n`;
      
      if (reason === 'expired') {
        message += `§7Temporary dimensions expire after ${this.maxTemporaryHours} hours.\n`;
      } else if (reason === 'inactive') {
        message += `§7Private dimensions are cleaned up after ${this.maxInactiveDays} days of inactivity.\n`;
      }

      message += `§7A backup has been created and can be restored by an administrator.`;

      // Try to notify player if online
      if (api.server && api.server.executeCommand) {
        await api.server.executeCommand(`/tell ${dimension.createdBy} "${message}"`);
      }

    } catch (error) {
      this.logger.error('Failed to notify dimension cleanup:', error);
    }
  }

  /**
   * Save dimension data
   */
  private async saveDimensionData(dimensionId: string): Promise<void> {
    try {
      const dimension = this.storage.dimensions.get(dimensionId);
      if (!dimension) return;

      // Convert Sets to arrays for JSON serialization
      const serializableData = {
        ...dimension,
        statistics: {
          ...dimension.statistics,
          uniqueVisitors: Array.from(dimension.statistics.uniqueVisitors)
        },
        properties: {
          ...dimension.properties,
          allowedPlayers: Array.from(dimension.properties.allowedPlayers || []),
          bannedPlayers: Array.from(dimension.properties.bannedPlayers || [])
        }
      };

      const filePath = `${this.storagePath}/${dimensionId}.json`;
      const result = await this.fileSystemManager.writeFile(filePath, JSON.stringify(serializableData, null, 2));

      if (!result.success) {
        throw new Error(`Failed to write dimension data: ${result.error}`);
      }

    } catch (error) {
      this.logger.error(`Failed to save dimension data for ${dimensionId}:`, error);
    }
  }

  /**
   * Save visit history
   */
  private async saveVisitHistory(dimensionId: string): Promise<void> {
    try {
      const visits = this.storage.visits.get(dimensionId);
      if (!visits) return;

      const filePath = `${this.visitsPath}/${dimensionId}.json`;
      const result = await this.fileSystemManager.writeFile(filePath, JSON.stringify(visits, null, 2));

      if (!result.success) {
        throw new Error(`Failed to write visit history: ${result.error}`);
      }

    } catch (error) {
      this.logger.error(`Failed to save visit history for ${dimensionId}:`, error);
    }
  }

  /**
   * Get dimension data
   */
  public getDimensionData(dimensionId: string): DimensionData | null {
    return this.storage.dimensions.get(dimensionId) || null;
  }

  /**
   * Save dimension data
   */
  public async saveDimension(dimensionId: string): Promise<{ success: boolean; error?: string }> {
    try {
      await this.saveDimensionData(dimensionId);
      await this.saveVisitHistory(dimensionId);
      
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to save dimension ${dimensionId}:`, error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Get all dimensions
   */
  public getAllDimensions(): Map<string, DimensionData> {
    return new Map(this.storage.dimensions);
  }

  /**
   * Get active dimensions
   */
  public getActiveDimensions(): Map<string, Set<string>> {
    return new Map(this.storage.activePlayers);
  }

  /**
   * Get visit history
   */
  public getVisitHistory(dimensionId: string): DimensionVisit[] {
    return this.storage.visits.get(dimensionId) || [];
  }

  /**
   * Get player visits
   */
  public getPlayerVisits(playerId: string): DimensionVisit[] {
    const playerVisits: DimensionVisit[] = [];
    
    for (const visits of this.storage.visits.values()) {
      playerVisits.push(...visits.filter(v => v.playerId === playerId));
    }
    
    return playerVisits.sort((a, b) => b.joinTime - a.joinTime);
  }

  /**
   * Update dimension properties
   */
  public async updateDimensionProperties(
    dimensionId: string, 
    properties: Partial<DimensionData['properties']>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const dimension = this.storage.dimensions.get(dimensionId);
      if (!dimension) {
        return { success: false, error: 'Dimension not found' };
      }

      // Update properties
      Object.assign(dimension.properties, properties);
      dimension.lastAccessed = Date.now();

      // Save changes
      await this.saveDimensionData(dimensionId);

      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to update dimension properties for ${dimensionId}:`, error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Cleanup unused dimensions
   */
  public async cleanupUnusedDimensions(): Promise<{ cleaned: number; errors: string[] }> {
    try {
      await this.performCleanup();
      
      return {
        cleaned: this.statistics.expiredDimensions,
        errors: []
      };
    } catch (error) {
      this.logger.error('Failed to cleanup unused dimensions:', error);
      return {
        cleaned: 0,
        errors: [String(error)]
      };
    }
  }

  /**
   * Get statistics
   */
  public getStatistics(): StorageStatistics {
    // Update current statistics
    this.statistics.totalDimensions = this.storage.dimensions.size;
    this.statistics.activeDimensions = this.storage.activePlayers.size;
    this.statistics.temporaryDimensions = Array.from(this.storage.dimensions.values())
      .filter(d => d.properties.isTemporary).length;
    
    // Calculate unique visitors
    const allVisitors = new Set<string>();
    for (const visits of this.storage.visits.values()) {
      for (const visit of visits) {
        allVisitors.add(visit.playerId);
      }
    }
    this.statistics.uniqueVisitors = allVisitors.size;

    return { ...this.statistics };
  }

  /**
   * Shutdown dimension data manager
   */
  public async shutdown(): Promise<void> {
    try {
      // Save all dimension data
      for (const dimensionId of this.storage.dimensions.keys()) {
        await this.saveDimensionData(dimensionId);
        await this.saveVisitHistory(dimensionId);
      }

      // Clear storage
      this.storage.dimensions.clear();
      this.storage.visits.clear();
      this.storage.activePlayers.clear();
      this.storage.cleanupSchedule.clear();

      this.isInitialized = false;
      this.logger.info('DimensionDataManager shutdown complete');
    } catch (error) {
      this.logger.error('Error during DimensionDataManager shutdown:', error);
    }
  }
}

// Singleton instance for global access
let globalDimensionDataManager: DimensionDataManager | null = null;

/**
 * Get global dimension data manager instance
 */
export function getDimensionDataManager(): DimensionDataManager {
  if (!globalDimensionDataManager) {
    globalDimensionDataManager = new DimensionDataManager();
  }
  return globalDimensionDataManager;
}

/**
 * Convenience function to save dimension data
 */
export async function saveDimensionData(dimensionId: string): Promise<{ success: boolean; error?: string }> {
  const manager = getDimensionDataManager();
  return await manager.saveDimension(dimensionId);
}
