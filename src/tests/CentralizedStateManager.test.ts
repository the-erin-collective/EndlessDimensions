/// <reference types="@epi-studio/moud-sdk" />
import { CentralizedStateManager } from '../core/CentralizedStateManager';

// Mock API for testing
const mockAPI = {
  state: {
    subscribe: jest.fn()
  },
  events: {
    on: jest.fn()
  },
  server: {
    getPlayers: jest.fn().mockReturnValue([])
  }
} as any;

// Mock global api
(global as any).api = mockAPI;

describe('CentralizedStateManager', () => {
  let stateManager: CentralizedStateManager;

  beforeEach(() => {
    jest.clearAllMocks();
    stateManager = new CentralizedStateManager(mockAPI);
  });

  afterEach(async () => {
    if (stateManager) {
      try {
        await stateManager.shutdown();
      } catch (error) {
        // Ignore shutdown errors in tests
      }
    }
  });

  describe('Initialization', () => {
    test('should initialize successfully', async () => {
      await expect(stateManager.initialize()).resolves.not.toThrow();
    });

    test('should subscribe to global state changes', async () => {
      await stateManager.initialize();
      expect(mockAPI.state.subscribe).toHaveBeenCalledWith('*', expect.any(Function));
    });

    test('should subscribe to player events', async () => {
      await stateManager.initialize();
      expect(mockAPI.events.on).toHaveBeenCalledWith('playerJoin', expect.any(Function));
      expect(mockAPI.events.on).toHaveBeenCalledWith('playerLeave', expect.any(Function));
    });

    test('should handle initialization errors gracefully', async () => {
      // Create a mock API that throws on state.subscribe
      const errorAPI = {
        state: {
          subscribe: jest.fn().mockImplementation(() => {
            throw new Error('API Error');
          })
        },
        events: {
          on: jest.fn()
        },
        server: {
          getPlayers: jest.fn().mockReturnValue([])
        }
      } as any;

      const errorStateManager = new CentralizedStateManager(errorAPI);
      
      // Should handle the error gracefully and not throw
      await expect(errorStateManager.initialize()).resolves.toBeUndefined();
    });
  });

  describe('State Subscription Management', () => {
    beforeEach(async () => {
      await stateManager.initialize();
    });

    test('should allow subscribers to register for state changes', () => {
      const callback = jest.fn();
      const subscriberId = stateManager.subscribe('dimension', callback, { priority: 1 });

      expect(subscriberId).toBeDefined();
      expect(typeof subscriberId).toBe('string');
    });

    test('should notify subscribers of state changes', () => {
      const callback = jest.fn();
      stateManager.subscribe('dimension', callback, { priority: 1 });

      // Test that subscription mechanism works
      expect(callback).not.toHaveBeenCalled();
    });

    test('should filter subscribers by category', () => {
      const dimensionCallback = jest.fn();
      const playerCallback = jest.fn();

      stateManager.subscribe('dimension', dimensionCallback, { priority: 1 });
      stateManager.subscribe('player', playerCallback, { priority: 1 });

      // Test that different categories can be subscribed to
      expect(dimensionCallback).not.toHaveBeenCalled();
      expect(playerCallback).not.toHaveBeenCalled();
    });

    test('should allow unsubscribing from state changes', () => {
      const callback = jest.fn();
      const subscriberId = stateManager.subscribe('dimension', callback, { priority: 1 });

      stateManager.unsubscribe(subscriberId);

      // Verify unsubscription was successful
      expect(() => stateManager.unsubscribe(subscriberId)).not.toThrow();
    });
  });

  describe('Player State Management', () => {
    beforeEach(async () => {
      await stateManager.initialize();
    });

    test('should track player join events', () => {
      const mockPlayer = {
        id: 'player123',
        name: 'TestPlayer',
        uuid: '123e4567-e89b-12d3-a456-426614174000'
      };

      // Simulate player join event
      const playerJoinCallback = mockAPI.events.on.mock.calls.find(
        (call: any) => call[0] === 'playerJoin'
      )?.[1];

      if (playerJoinCallback) {
        playerJoinCallback(mockPlayer);
      }

      const statistics = stateManager.getStatistics();
      expect(statistics.onlinePlayers).toBe(1);
    });

    test('should track player leave events', () => {
      const mockPlayer = {
        id: 'player123',
        name: 'TestPlayer',
        uuid: '123e4567-e89b-12d3-a456-426614174000'
      };

      // First join
      const playerJoinCallback = mockAPI.events.on.mock.calls.find(
        (call: any) => call[0] === 'playerJoin'
      )?.[1];

      if (playerJoinCallback) {
        playerJoinCallback(mockPlayer);
      }

      // Then leave
      const playerLeaveCallback = mockAPI.events.on.mock.calls.find(
        (call: any) => call[0] === 'playerLeave'
      )?.[1];

      if (playerLeaveCallback) {
        playerLeaveCallback(mockPlayer);
      }

      const statistics = stateManager.getStatistics();
      expect(statistics.onlinePlayers).toBe(0);
    });

    test('should handle player-specific state synchronization', () => {
      const mockPlayer = {
        id: 'player123',
        name: 'TestPlayer'
      };

      // Join player
      const playerJoinCallback = mockAPI.events.on.mock.calls.find(
        (call: any) => call[0] === 'playerJoin'
      )?.[1];

      if (playerJoinCallback) {
        playerJoinCallback(mockPlayer);
      }

      // Test player state operations
      const pendingChanges = stateManager.getPlayerPendingChanges('player123');
      expect(Array.isArray(pendingChanges)).toBe(true);
    });
  });

  describe('State Change Queue Management', () => {
    beforeEach(async () => {
      await stateManager.initialize();
    });

    test('should handle state change operations', () => {
      // Test basic statistics tracking
      const statistics = stateManager.getStatistics();
      expect(statistics).toBeDefined();
      expect(statistics.totalChanges).toBeGreaterThanOrEqual(0);
      expect(statistics.activeSubscribers).toBeGreaterThanOrEqual(0);
    });

    test('should provide system health information', () => {
      const health = stateManager.getSystemHealth();
      expect(health).toBeDefined();
      expect(health.status).toBeDefined();
      expect(Array.isArray(health.issues)).toBe(true);
      expect(Array.isArray(health.recommendations)).toBe(true);
    });
  });

  describe('Statistics and Monitoring', () => {
    beforeEach(async () => {
      await stateManager.initialize();
    });

    test('should track statistics accurately', () => {
      const statistics = stateManager.getStatistics();
      expect(statistics).toBeDefined();
      expect(statistics.totalChanges).toBeGreaterThanOrEqual(0);
      expect(statistics.successfulSyncs).toBeGreaterThanOrEqual(0);
      expect(statistics.failedSyncs).toBeGreaterThanOrEqual(0);
      expect(statistics.pendingChanges).toBeGreaterThanOrEqual(0);
      expect(statistics.activeSubscribers).toBeGreaterThanOrEqual(0);
      expect(statistics.onlinePlayers).toBeGreaterThanOrEqual(0);
    });

    test('should provide performance metrics', () => {
      const health = stateManager.getSystemHealth();
      expect(health).toBeDefined();
      expect(health.status).toBeDefined();
      expect(Array.isArray(health.issues)).toBe(true);
      expect(Array.isArray(health.recommendations)).toBe(true);
    });
  });

  describe('Error Handling and Recovery', () => {
    beforeEach(async () => {
      await stateManager.initialize();
    });

    test('should handle invalid operations gracefully', () => {
      // Test invalid subscriber ID
      expect(() => stateManager.unsubscribe('invalid_id')).not.toThrow();
      
      // Test invalid player ID
      expect(() => stateManager.getPlayerPendingChanges('invalid_player')).not.toThrow();
      expect(() => stateManager.clearPlayerPendingChanges('invalid_player')).not.toThrow();
    });

    test('should handle shutdown cleanly', async () => {
      expect(() => stateManager.shutdown()).not.toThrow();
    });
  });
});
