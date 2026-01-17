import { Logger } from '../utils/Logger';

// Type definitions for state synchronization
interface StateDelta {
  oldValue: any;
  newValue: any;
  changeType: 'add' | 'remove' | 'modify' | 'move';
  timestamp: number;
  source: string;
  metadata?: Record<string, any>;
}

interface StateChange {
  category: string;
  key: string;
  delta: StateDelta;
  affectedPlayers?: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
}

interface StateSubscriber {
  id: string;
  category: string;
  callback: (change: StateChange) => void;
  priority: number;
  filter?: (change: StateChange) => boolean;
  isActive: boolean;
}

interface PlayerSyncState {
  playerId: string;
  lastSyncTime: number;
  pendingChanges: StateChange[];
  isOnline: boolean;
  syncVersion: number;
}

interface SyncStatistics {
  totalChanges: number;
  successfulSyncs: number;
  failedSyncs: number;
  pendingChanges: number;
  activeSubscribers: number;
  onlinePlayers: number;
  averageSyncTime: number;
  lastSyncTime: number;
}

/**
 * Centralized State Manager - Resolves Issue #16 and prevents scattered synchronization logic
 * Provides unified state synchronization across all components
 */
export class CentralizedStateManager {
  private logger: Logger;
  private api: MoudAPI;
  private stateSubscribers: Map<string, Set<StateSubscriber>> = new Map();
  private stateCache: Map<string, any> = new Map();
  private playerSyncStates: Map<string, PlayerSyncState> = new Map();
  private changeQueue: StateChange[] = [];
  private isInitialized: boolean = false;
  private syncInProgress: boolean = false;
  private statistics: SyncStatistics;
  private syncInterval: number = 50; // 50ms sync interval
  private maxQueueSize: number = 1000;
  private syncTimeout: number = 5000; // 5 second timeout

  constructor(api: MoudAPI) {
    this.api = api;
    this.logger = new Logger('CentralizedStateManager');
    this.statistics = {
      totalChanges: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      pendingChanges: 0,
      activeSubscribers: 0,
      onlinePlayers: 0,
      averageSyncTime: 0,
      lastSyncTime: 0
    };
  }

  /**
   * Initialize the centralized state manager
   */
  public async initialize(): Promise<void> {
    this.logger.info('Initializing CentralizedStateManager...');

    // Wait for API to be fully ready
    await new Promise<void>((resolve) => {
      if ((globalThis as any).onMoudReady) {
        (globalThis as any).onMoudReady(resolve);
      } else {
        const check = () => {
          if (typeof (globalThis as any).api !== 'undefined' && (globalThis as any).api.internal) {
            resolve();
          } else {
            setTimeout(check, 100);
          }
        };
        check();
      }
    });

    try {
      // Subscribe to global state changes
      this.subscribeToGlobalState();

      // Initialize player tracking
      this.initializePlayerTracking();

      // Start sync processing
      this.startSyncProcessing();

      // Initialize state cache
      this.initializeStateCache();

      this.isInitialized = true;
      this.logger.info('CentralizedStateManager initialized successfully');

    } catch (error) {
      this.logger.error('Failed to initialize CentralizedStateManager:', error);
      throw error;
    }
  }

  /**
   * Subscribe to global state changes
   */
  private subscribeToGlobalState(): void {
    try {
      // Check if API has state management capabilities (with fallbacks for 0.7.x)
      const stateObj = (this.api as any).state || (this.api as any).internal?.state || (globalThis as any).moud?.state;

      if (stateObj) {
        // Subscribe to all state changes
        if (typeof stateObj.subscribe === 'function') {
          stateObj.subscribe("*", (newState: any) => {
            this.handleGlobalStateChange(newState);
          });
          this.logger.debug('Subscribed to global state changes');
        } else {
          this.logger.warn('State object found but subscribe() is missing');
        }
      } else {
        this.logger.debug('API state management not available - state synchronization disabled');
      }
    } catch (error) {
      this.logger.error('Failed to subscribe to global state:', error);
    }
  }

  /**
   * Initialize player tracking
   */
  private initializePlayerTracking(): void {
    try {
      // Track player join/leave events
      // Check both api.events and api.on (if api itself is the dispatcher)
      const eventSource = (this.api as any).events || this.api;

      if (typeof eventSource.on === 'function') {
        eventSource.on('playerJoin', (player: any) => {
          this.handlePlayerJoin(player);
        });

        eventSource.on('playerLeave', (player: any) => {
          this.handlePlayerLeave(player);
        });

        this.logger.debug('Player event tracking initialized');
      } else {
        this.logger.warn('API events not available - player tracking disabled');
      }

      // Initialize existing players
      this.initializeExistingPlayers();

      this.logger.debug('Player tracking initialized');
    } catch (error) {
      this.logger.error('Failed to initialize player tracking:', error);
    }
  }

  /**
   * Initialize existing players
   */
  private async initializeExistingPlayers(): Promise<void> {
    try {
      if ((this.api as any).server && (this.api as any).server.getPlayers) {
        const players = (this.api as any).server.getPlayers();

        for (const player of players) {
          this.handlePlayerJoin(player);
        }

        this.logger.debug(`Initialized ${players.length} existing players`);
      } else {
        this.logger.warn('API server methods not available - existing player initialization skipped');
      }
    } catch (error) {
      this.logger.error('Failed to initialize existing players:', error);
    }
  }

  /**
   * Handle player join
   */
  private handlePlayerJoin(player: any): void {
    try {
      const playerId = player.id || player.uuid || player.name;

      const syncState: PlayerSyncState = {
        playerId,
        lastSyncTime: Date.now(),
        pendingChanges: [],
        isOnline: true,
        syncVersion: 1
      };

      this.playerSyncStates.set(playerId, syncState);
      this.statistics.onlinePlayers++;

      // Trigger full state sync for new player
      this.queueFullStateSync(playerId);

      this.logger.info(`Player joined: ${playerId}`);
    } catch (error) {
      this.logger.error('Failed to handle player join:', error);
    }
  }

  /**
   * Handle player leave
   */
  private handlePlayerLeave(player: any): void {
    try {
      const playerId = player.id || player.uuid || player.name;

      const syncState = this.playerSyncStates.get(playerId);
      if (syncState) {
        syncState.isOnline = false;
        syncState.pendingChanges = [];
      }

      this.statistics.onlinePlayers--;
      this.logger.info(`Player left: ${playerId}`);
    } catch (error) {
      this.logger.error('Failed to handle player leave:', error);
    }
  }

  /**
   * Start sync processing
   */
  private startSyncProcessing(): void {
    try {
      setInterval(() => {
        this.processSyncQueue();
      }, this.syncInterval);

      this.logger.debug('Sync processing started');
    } catch (error) {
      this.logger.error('Failed to start sync processing:', error);
    }
  }

  /**
   * Initialize state cache
   */
  private initializeStateCache(): void {
    try {
      const stateObj = (this.api as any).state || (this.api as any).internal?.state || (globalThis as any).moud?.state || (globalThis as any).moud_state;

      if (stateObj && typeof stateObj.getAll === 'function') {
        // Load current state into cache
        const currentState = stateObj.getAll();
        if (currentState) {
          Object.keys(currentState).forEach(key => {
            this.stateCache.set(key, currentState[key]);
          });
          this.logger.debug('State cache initialized');
        }
      } else {
        this.logger.warn('API state not available - state cache initialization skipped');
      }
    } catch (error) {
      this.logger.error('Failed to initialize state cache:', error);
    }
  }

  /**
   * Handle global state change
   */
  private handleGlobalStateChange(newState: any): void {
    try {
      // Calculate state delta
      const deltas = this.calculateStateDeltas(this.stateCache, newState);

      // Process each delta
      for (const [key, delta] of Object.entries(deltas)) {
        this.queueStateChange(key, delta);
      }

      // Update cache
      this.stateCache = new Map(Object.entries(newState));

    } catch (error) {
      this.logger.error('Failed to handle global state change:', error);
    }
  }

  /**
   * Calculate state deltas
   */
  private calculateStateDeltas(oldState: Map<string, any>, newState: any): Record<string, StateDelta> {
    const deltas: Record<string, StateDelta> = {};

    try {
      // Check for changes and additions
      for (const [key, newValue] of Object.entries(newState)) {
        const oldValue = oldState.get(key);

        if (oldValue === undefined) {
          // Added
          deltas[key] = {
            oldValue: null,
            newValue,
            changeType: 'add',
            timestamp: Date.now(),
            source: 'global_state'
          };
        } else if (oldValue !== newValue) {
          // Modified
          deltas[key] = {
            oldValue,
            newValue,
            changeType: 'modify',
            timestamp: Date.now(),
            source: 'global_state'
          };
        }
      }

      // Check for removals
      for (const [key, oldValue] of oldState.entries()) {
        if (!(key in newState)) {
          deltas[key] = {
            oldValue,
            newValue: null,
            changeType: 'remove',
            timestamp: Date.now(),
            source: 'global_state'
          };
        }
      }

    } catch (error) {
      this.logger.error('Failed to calculate state deltas:', error);
    }

    return deltas;
  }

  /**
   * Queue state change
   */
  private queueStateChange(key: string, delta: StateDelta): void {
    try {
      // Determine category from key
      const category = this.getCategoryFromKey(key);

      const change: StateChange = {
        category,
        key,
        delta,
        priority: this.getChangePriority(category, delta),
        affectedPlayers: this.getAffectedPlayers(key, delta)
      };

      // Add to queue
      this.changeQueue.push(change);
      this.statistics.totalChanges++;
      this.statistics.pendingChanges++;

      // Trim queue if too large
      if (this.changeQueue.length > this.maxQueueSize) {
        this.changeQueue.shift();
        this.statistics.pendingChanges--;
      }

    } catch (error) {
      this.logger.error('Failed to queue state change:', error);
    }
  }

  /**
   * Get category from key
   */
  private getCategoryFromKey(key: string): string {
    try {
      if (key.startsWith('blocks.')) return 'blocks';
      if (key.startsWith('players.')) return 'players';
      if (key.startsWith('experimentalBlocks')) return 'experimental_blocks';
      if (key.startsWith('dataMapBehaviors')) return 'data_map_behaviors';
      if (key.startsWith('proxyBlocks')) return 'proxy_blocks';
      if (key.startsWith('dimensions')) return 'dimensions';
      if (key.startsWith('portals')) return 'portals';

      return 'general';
    } catch (error) {
      this.logger.error('Failed to get category from key:', error);
      return 'general';
    }
  }

  /**
   * Get change priority
   */
  private getChangePriority(category: string, delta: StateDelta): 'low' | 'medium' | 'high' | 'critical' {
    try {
      // Critical changes
      if (category === 'dimensions' || category === 'portals') {
        return 'critical';
      }

      // High priority changes
      if (category === 'experimental_blocks' || category === 'data_map_behaviors') {
        return 'high';
      }

      // Medium priority changes
      if (category === 'blocks' || category === 'players') {
        return 'medium';
      }

      return 'low';
    } catch (error) {
      this.logger.error('Failed to get change priority:', error);
      return 'medium';
    }
  }

  /**
   * Get affected players
   */
  private getAffectedPlayers(key: string, delta: StateDelta): string[] {
    try {
      const affectedPlayers: string[] = [];

      // Player-specific changes
      if (key.startsWith('players.')) {
        const playerId = key.split('.')[1];
        if (playerId) {
          affectedPlayers.push(playerId);
        }
      }

      // Block changes affect nearby players
      if (key.startsWith('blocks.') || key.startsWith('proxyBlocks.')) {
        for (const [playerId, syncState] of this.playerSyncStates.entries()) {
          if (syncState.isOnline) {
            affectedPlayers.push(playerId);
          }
        }
      }

      // Global changes affect all players
      if (delta.changeType === 'add' || delta.changeType === 'remove') {
        for (const [playerId, syncState] of this.playerSyncStates.entries()) {
          if (syncState.isOnline) {
            affectedPlayers.push(playerId);
          }
        }
      }

      return affectedPlayers;
    } catch (error) {
      this.logger.error('Failed to get affected players:', error);
      return [];
    }
  }

  /**
   * Process sync queue
   */
  private async processSyncQueue(): Promise<void> {
    if (this.syncInProgress || this.changeQueue.length === 0) {
      return;
    }

    this.syncInProgress = true;
    const startTime = Date.now();

    try {
      // Sort by priority
      this.changeQueue.sort((a, b) => {
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });

      // Process changes
      const changesToProcess = this.changeQueue.splice(0, 10); // Process 10 at a time

      for (const change of changesToProcess) {
        await this.processStateChange(change);
        this.statistics.pendingChanges--;
      }

      // Update statistics
      const syncTime = Date.now() - startTime;
      this.updateStatistics(syncTime, changesToProcess.length);

    } catch (error) {
      this.logger.error('Failed to process sync queue:', error);
      this.statistics.failedSyncs++;
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Process individual state change
   */
  private async processStateChange(change: StateChange): Promise<void> {
    try {
      // Notify subscribers
      this.notifySubscribers(change);

      // Sync to affected players
      if (change.affectedPlayers && change.affectedPlayers.length > 0) {
        await this.syncToPlayers(change);
      }

      this.statistics.successfulSyncs++;

    } catch (error) {
      this.logger.error(`Failed to process state change for ${change.key}:`, error);
      this.statistics.failedSyncs++;
    }
  }

  /**
   * Notify subscribers
   */
  private notifySubscribers(change: StateChange): void {
    try {
      const subscribers = this.stateSubscribers.get(change.category);
      if (!subscribers) return;

      for (const subscriber of subscribers) {
        if (!subscriber.isActive) continue;

        // Apply filter if present
        if (subscriber.filter && !subscriber.filter(change)) {
          continue;
        }

        try {
          subscriber.callback(change);
        } catch (error) {
          this.logger.error(`Subscriber ${subscriber.id} error:`, error);
        }
      }
    } catch (error) {
      this.logger.error('Failed to notify subscribers:', error);
    }
  }

  /**
   * Sync to players
   */
  private async syncToPlayers(change: StateChange): Promise<void> {
    try {
      if (!change.affectedPlayers) return;

      for (const playerId of change.affectedPlayers) {
        const syncState = this.playerSyncStates.get(playerId);
        if (!syncState || !syncState.isOnline) continue;

        // Add to player's pending changes
        syncState.pendingChanges.push(change);

        // Limit pending changes per player
        if (syncState.pendingChanges.length > 50) {
          syncState.pendingChanges.shift();
        }
      }
    } catch (error) {
      this.logger.error('Failed to sync to players:', error);
    }
  }

  /**
   * Queue full state sync for player
   */
  private queueFullStateSync(playerId: string): void {
    try {
      const syncState = this.playerSyncStates.get(playerId);
      if (!syncState) return;

      // Create full sync change
      const fullSyncChange: StateChange = {
        category: 'system',
        key: 'full_sync',
        delta: {
          oldValue: null,
          newValue: Object.fromEntries(this.stateCache),
          changeType: 'add',
          timestamp: Date.now(),
          source: 'system'
        },
        affectedPlayers: [playerId],
        priority: 'critical'
      };

      syncState.pendingChanges.unshift(fullSyncChange);
    } catch (error) {
      this.logger.error('Failed to queue full state sync:', error);
    }
  }

  /**
   * Subscribe to state changes
   */
  public subscribe(
    category: string,
    callback: (change: StateChange) => void,
    options: {
      id?: string;
      priority?: number;
      filter?: (change: StateChange) => boolean;
    } = {}
  ): string {
    try {
      const subscriberId = options.id || `sub_${Date.now()}_${Math.random()}`;

      const subscriber: StateSubscriber = {
        id: subscriberId,
        category,
        callback,
        priority: options.priority || 0,
        filter: options.filter,
        isActive: true
      };

      if (!this.stateSubscribers.has(category)) {
        this.stateSubscribers.set(category, new Set());
      }

      this.stateSubscribers.get(category)!.add(subscriber);
      this.statistics.activeSubscribers++;

      this.logger.debug(`Subscribed to ${category} with ID: ${subscriberId}`);
      return subscriberId;

    } catch (error) {
      this.logger.error('Failed to subscribe:', error);
      throw error;
    }
  }

  /**
   * Unsubscribe from state changes
   */
  public unsubscribe(subscriberId: string): void {
    try {
      for (const [category, subscribers] of this.stateSubscribers.entries()) {
        for (const subscriber of subscribers) {
          if (subscriber.id === subscriberId) {
            subscribers.delete(subscriber);
            this.statistics.activeSubscribers--;

            if (subscribers.size === 0) {
              this.stateSubscribers.delete(category);
            }

            this.logger.debug(`Unsubscribed ${subscriberId} from ${category}`);
            return;
          }
        }
      }
    } catch (error) {
      this.logger.error('Failed to unsubscribe:', error);
    }
  }

  /**
   * Get player pending changes
   */
  public getPlayerPendingChanges(playerId: string): StateChange[] {
    try {
      const syncState = this.playerSyncStates.get(playerId);
      return syncState ? [...syncState.pendingChanges] : [];
    } catch (error) {
      this.logger.error('Failed to get player pending changes:', error);
      return [];
    }
  }

  /**
   * Clear player pending changes
   */
  public clearPlayerPendingChanges(playerId: string): void {
    try {
      const syncState = this.playerSyncStates.get(playerId);
      if (syncState) {
        syncState.pendingChanges = [];
        syncState.lastSyncTime = Date.now();
        syncState.syncVersion++;
      }
    } catch (error) {
      this.logger.error('Failed to clear player pending changes:', error);
    }
  }

  /**
   * Get statistics
   */
  public getStatistics(): SyncStatistics {
    return { ...this.statistics };
  }

  /**
   * Update statistics
   */
  private updateStatistics(syncTime: number, changesProcessed: number): void {
    try {
      this.statistics.lastSyncTime = Date.now();

      // Update average sync time
      const totalSyncs = this.statistics.successfulSyncs + this.statistics.failedSyncs;
      if (totalSyncs > 0) {
        this.statistics.averageSyncTime =
          (this.statistics.averageSyncTime * (totalSyncs - 1) + syncTime) / totalSyncs;
      }
    } catch (error) {
      this.logger.error('Failed to update statistics:', error);
    }
  }

  /**
   * Get system health
   */
  public getSystemHealth(): {
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    try {
      // Check queue size
      if (this.changeQueue.length > this.maxQueueSize * 0.8) {
        issues.push('Sync queue is near capacity');
        recommendations.push('Consider increasing sync frequency or reducing change volume');
      }

      // Check failed syncs
      const failureRate = this.statistics.failedSyncs / Math.max(1, this.statistics.totalChanges);
      if (failureRate > 0.1) {
        issues.push('High sync failure rate');
        recommendations.push('Check network connectivity and error logs');
      }

      // Check average sync time
      if (this.statistics.averageSyncTime > 1000) {
        issues.push('Slow sync performance');
        recommendations.push('Optimize subscriber callbacks and reduce change complexity');
      }

      // Determine status
      let status: 'healthy' | 'warning' | 'critical' = 'healthy';
      if (issues.length >= 3) {
        status = 'critical';
      } else if (issues.length > 0) {
        status = 'warning';
      }

      return { status, issues, recommendations };

    } catch (error) {
      this.logger.error('Failed to get system health:', error);
      return {
        status: 'critical',
        issues: ['Failed to assess system health'],
        recommendations: ['Restart the state manager']
      };
    }
  }

  /**
   * Shutdown centralized state manager
   */
  public shutdown(): void {
    try {
      this.stateSubscribers.clear();
      this.stateCache.clear();
      this.playerSyncStates.clear();
      this.changeQueue = [];
      this.syncInProgress = false;
      this.isInitialized = false;

      this.logger.info('CentralizedStateManager shutdown complete');
    } catch (error) {
      this.logger.error('Error during CentralizedStateManager shutdown:', error);
    }
  }
}

// Singleton instance for global access
let globalCentralizedStateManager: CentralizedStateManager | null = null;
let globalAPI: MoudAPI | null = null;

/**
 * Get global centralized state manager instance
 */
export function getCentralizedStateManager(api?: MoudAPI): CentralizedStateManager {
  if (!globalCentralizedStateManager) {
    if (!api) {
      throw new Error('API required for first initialization of CentralizedStateManager');
    }
    globalAPI = api;
    globalCentralizedStateManager = new CentralizedStateManager(api);
  }
  return globalCentralizedStateManager;
}

/**
 * Convenience function to subscribe to state changes
 */
export function subscribeToState(
  category: string,
  callback: (change: StateChange) => void,
  options?: {
    id?: string;
    priority?: number;
    filter?: (change: StateChange) => boolean;
  }
): string {
  const manager = getCentralizedStateManager();
  return manager.subscribe(category, callback, options);
}
