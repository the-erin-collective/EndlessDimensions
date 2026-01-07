/// <reference types="@epi-studio/moud-sdk" />
import { Logger } from '../utils/Logger';
import { getCentralizedStateManager } from './CentralizedStateManager';
import { getPacketPipe } from '../hooks/usePacketPipe';

// Type definitions for inventory management
interface InventoryItem {
  id: string;
  count: number;
  slot: number;
  tag?: any;
  nbt?: any;
  displayName?: string;
  lore?: string[];
  enchantments?: Array<{
    id: string;
    lvl: number;
  }>;
}

interface PlayerInventory {
  hotbar: InventoryItem[];
  main: InventoryItem[];
  armor: InventoryItem[];
  offhand: InventoryItem[];
  selectedItem: InventoryItem | null;
  selectedSlot: number;
}

interface BookData {
  title: string;
  author: string;
  pages: string[];
  resolved: boolean;
  generation: number;
  endlessDimension?: {
    name: string;
    properties?: any;
  };
  customData?: any;
}

interface InventoryChange {
  playerId: string;
  changeType: 'add' | 'remove' | 'modify' | 'select';
  item: InventoryItem;
  slot: number;
  timestamp: number;
}

interface InventoryStatistics {
  totalPlayers: number;
  trackedInventories: number;
  bookItemsFound: number;
  dimensionBooksFound: number;
  totalChanges: number;
  lastScanTime: number;
}

/**
 * Inventory Manager - Access player inventory and book NBT data through state subscriptions
 * Provides comprehensive inventory tracking and NBT data extraction
 */
export class InventoryManager {
  private logger: Logger;
  private stateManager: any;
  private packetPipe: any;
  private playerInventories: Map<string, PlayerInventory> = new Map();
  private bookDataCache: Map<string, BookData> = new Map();
  private inventorySubscribers: Map<string, Set<Function>> = new Map();
  private isInitialized: boolean = false;
  private scanInterval: number = 200; // 200ms scan interval
  private cacheTimeout: number = 30000; // 30 second cache timeout
  private statistics: InventoryStatistics;

  constructor() {
    this.logger = new Logger('InventoryManager');
    this.stateManager = getCentralizedStateManager();
    this.packetPipe = getPacketPipe();
    this.statistics = {
      totalPlayers: 0,
      trackedInventories: 0,
      bookItemsFound: 0,
      dimensionBooksFound: 0,
      totalChanges: 0,
      lastScanTime: 0
    };
  }

  /**
   * Initialize the inventory manager
   */
  public async initialize(): Promise<void> {
    try {
      // Subscribe to state changes
      this.subscribeToStateChanges();

      // Subscribe to packet events
      this.subscribeToPacketEvents();

      // Initialize inventory tracking
      this.initializeInventoryTracking();

      // Start inventory scanning
      this.startInventoryScanning();

      this.isInitialized = true;
      this.logger.info('InventoryManager initialized successfully');

    } catch (error) {
      this.logger.error('Failed to initialize InventoryManager:', error);
      throw error;
    }
  }

  /**
   * Subscribe to state changes
   */
  private subscribeToStateChanges(): void {
    try {
      // Subscribe to player state changes
      this.stateManager.subscribe('players', (change) => {
        this.handlePlayerStateChange(change);
      }, {
        id: 'inventory_manager',
        priority: 8
      });

      this.logger.debug('Subscribed to player state changes');
    } catch (error) {
      this.logger.error('Failed to subscribe to state changes:', error);
    }
  }

  /**
   * Subscribe to packet events
   */
  private subscribeToPacketEvents(): void {
    try {
      // Subscribe to inventory-related packets
      this.packetPipe.registerHandler('ServerboundSetCreativeModeSlotPacket', (packet) => {
        this.handleCreativeSlotChange(packet);
      });

      this.packetPipe.registerHandler('ServerboundClickWindowPacket', (packet) => {
        this.handleInventoryClick(packet);
      });

      this.packetPipe.registerHandler('ServerboundUseItemPacket', (packet) => {
        this.handleItemUse(packet);
      });

      this.packetPipe.registerHandler('ClientboundContainerSetSlotPacket', (packet) => {
        this.handleSlotUpdate(packet);
      });

      this.logger.debug('Subscribed to packet events');
    } catch (error) {
      this.logger.error('Failed to subscribe to packet events:', error);
    }
  }

  /**
   * Initialize inventory tracking
   */
  private initializeInventoryTracking(): void {
    try {
      // Load existing player inventories from state
      if (api.state) {
        const players = api.state.get("players") || {};
        
        for (const [playerId, playerData] of Object.entries(players)) {
          this.updatePlayerInventory(playerId, playerData as any);
        }
      }

      this.statistics.totalPlayers = this.playerInventories.size;
      this.logger.info(`Initialized inventory tracking for ${this.playerInventories.size} players`);
    } catch (error) {
      this.logger.error('Failed to initialize inventory tracking:', error);
    }
  }

  /**
   * Start inventory scanning
   */
  private startInventoryScanning(): void {
    try {
      setInterval(() => {
        this.scanInventories();
      }, this.scanInterval);

      this.logger.debug('Started inventory scanning');
    } catch (error) {
      this.logger.error('Failed to start inventory scanning:', error);
    }
  }

  /**
   * Handle player state changes
   */
  private handlePlayerStateChange(change: any): void {
    try {
      const { key, delta } = change;

      if (delta.changeType === 'add') {
        const player = delta.newValue;
        this.updatePlayerInventory(key, player);
      } else if (delta.changeType === 'remove') {
        this.playerInventories.delete(key);
        this.bookDataCache.delete(key);
      } else if (delta.changeType === 'modify') {
        const player = delta.newValue;
        this.updatePlayerInventory(key, player);
      }
    } catch (error) {
      this.logger.error('Failed to handle player state change:', error);
    }
  }

  /**
   * Update player inventory
   */
  private updatePlayerInventory(playerId: string, playerData: any): void {
    try {
      const inventory = this.extractInventoryFromPlayerData(playerData);
      this.playerInventories.set(playerId, inventory);

      // Check for books in inventory
      this.scanInventoryForBooks(playerId, inventory);

    } catch (error) {
      this.logger.error(`Failed to update inventory for player ${playerId}:`, error);
    }
  }

  /**
   * Extract inventory from player data
   */
  private extractInventoryFromPlayerData(playerData: any): PlayerInventory {
    try {
      const inventory: PlayerInventory = {
        hotbar: [],
        main: [],
        armor: [],
        offhand: [],
        selectedItem: null,
        selectedSlot: playerData?.selectedSlot || 0
      };

      // Extract items from player inventory data
      const items = playerData?.inventory?.items || [];
      
      for (const item of items) {
        const inventoryItem = this.formatInventoryItem(item);
        
        // Categorize items by slot
        if (item.slot >= 0 && item.slot <= 8) {
          inventory.hotbar[item.slot] = inventoryItem;
        } else if (item.slot >= 9 && item.slot <= 35) {
          inventory.main[item.slot - 9] = inventoryItem;
        } else if (item.slot >= 36 && item.slot <= 39) {
          inventory.armor[item.slot - 36] = inventoryItem;
        } else if (item.slot === 45) {
          inventory.offhand[0] = inventoryItem;
        }
      }

      // Set selected item
      if (inventory.hotbar[inventory.selectedSlot]) {
        inventory.selectedItem = inventory.hotbar[inventory.selectedSlot];
      }

      return inventory;
    } catch (error) {
      this.logger.error('Failed to extract inventory:', error);
      return this.getEmptyInventory();
    }
  }

  /**
   * Format inventory item
   */
  private formatInventoryItem(item: any): InventoryItem {
    try {
      return {
        id: item.id || 'minecraft:air',
        count: item.count || 0,
        slot: item.slot || 0,
        tag: item.tag,
        nbt: item.nbt || item.tag,
        displayName: item.displayName,
        lore: item.lore || [],
        enchantments: item.enchantments || []
      };
    } catch (error) {
      this.logger.error('Failed to format inventory item:', error);
      return {
        id: 'minecraft:air',
        count: 0,
        slot: 0
      };
    }
  }

  /**
   * Get empty inventory
   */
  private getEmptyInventory(): PlayerInventory {
    return {
      hotbar: new Array(9).fill(null),
      main: new Array(27).fill(null),
      armor: new Array(4).fill(null),
      offhand: [null],
      selectedItem: null,
      selectedSlot: 0
    };
  }

  /**
   * Scan inventory for books
   */
  private scanInventoryForBooks(playerId: string, inventory: PlayerInventory): void {
    try {
      const allItems = [
        ...inventory.hotbar,
        ...inventory.main,
        ...inventory.armor,
        ...inventory.offhand
      ];

      for (const item of allItems) {
        if (item && item.id === 'minecraft:written_book') {
          this.processBookItem(playerId, item);
        }
      }
    } catch (error) {
      this.logger.error(`Failed to scan inventory for books for player ${playerId}:`, error);
    }
  }

  /**
   * Process book item
   */
  private processBookItem(playerId: string, item: InventoryItem): void {
    try {
      const bookData = this.extractBookNBT(item);
      if (bookData) {
        this.bookDataCache.set(`${playerId}_${item.slot}`, bookData);
        this.statistics.bookItemsFound++;

        // Check for dimension data
        if (this.hasDimensionData(bookData)) {
          this.statistics.dimensionBooksFound++;
          this.notifyDimensionBookFound(playerId, bookData, item);
        }
      }
    } catch (error) {
      this.logger.error('Failed to process book item:', error);
    }
  }

  /**
   * Extract book NBT data
   */
  public extractBookNBT(item: InventoryItem): BookData | null {
    try {
      if (!item.tag && !item.nbt) {
        return null;
      }

      const tag = item.nbt || item.tag;
      
      const bookData: BookData = {
        title: tag?.title || 'Untitled',
        author: tag?.author || 'Unknown',
        pages: tag?.pages || [],
        resolved: tag?.resolved || false,
        generation: tag?.generation || 0
      };

      // Check for EndlessDimension custom data
      if (tag?.EndlessDimension) {
        bookData.endlessDimension = tag.EndlessDimension;
      }

      // Store any additional custom data
      if (tag) {
        const { title, author, pages, resolved, generation, EndlessDimension, ...customData } = tag;
        bookData.customData = customData;
      }

      return bookData;
    } catch (error) {
      this.logger.error('Failed to extract book NBT:', error);
      return null;
    }
  }

  /**
   * Check if book has dimension data
   */
  private hasDimensionData(bookData: BookData): boolean {
    try {
      // Check for EndlessDimension tag
      if (bookData.endlessDimension) {
        return true;
      }

      // Check pages for dimension keywords
      if (bookData.pages && Array.isArray(bookData.pages)) {
        for (const page of bookData.pages) {
          if (typeof page === 'string') {
            const dimensionKeywords = ['dimension:', 'realm:', 'world:', 'plane:', 'create dimension'];
            if (dimensionKeywords.some(keyword => page.toLowerCase().includes(keyword))) {
              return true;
            }
          }
        }
      }

      // Check title
      if (bookData.title && typeof bookData.title === 'string') {
        const dimensionKeywords = ['dimension:', 'realm:', 'world:', 'plane:'];
        return dimensionKeywords.some(keyword => bookData.title.toLowerCase().includes(keyword));
      }

      return false;
    } catch (error) {
      this.logger.error('Failed to check dimension data:', error);
      return false;
    }
  }

  /**
   * Notify subscribers of dimension book found
   */
  private notifyDimensionBookFound(playerId: string, bookData: BookData, item: InventoryItem): void {
    try {
      const subscribers = this.inventorySubscribers.get('dimension_books');
      if (subscribers) {
        for (const callback of subscribers) {
          try {
            callback(playerId, bookData, item);
          } catch (error) {
            this.logger.error('Dimension book subscriber error:', error);
          }
        }
      }
    } catch (error) {
      this.logger.error('Failed to notify dimension book found:', error);
    }
  }

  /**
   * Handle creative slot change packet
   */
  private handleCreativeSlotChange(packet: any): void {
    try {
      const playerId = packet.playerId;
      const slot = packet.data?.slot;
      const itemStack = packet.data?.itemStack;

      if (playerId && slot !== undefined && itemStack) {
        const item = this.formatInventoryItem({
          ...itemStack,
          slot
        });

        this.handleInventoryChange(playerId, 'modify', item, slot);
      }
    } catch (error) {
      this.logger.error('Failed to handle creative slot change:', error);
    }
  }

  /**
   * Handle inventory click packet
   */
  private handleInventoryClick(packet: any): void {
    try {
      const playerId = packet.playerId;
      const slot = packet.data?.slotNum;
      const itemStack = packet.data?.carriedItem;

      if (playerId && slot !== undefined) {
        const item = itemStack ? this.formatInventoryItem({
          ...itemStack,
          slot
        }) : null;

        this.handleInventoryChange(playerId, 'modify', item, slot);
      }
    } catch (error) {
      this.logger.error('Failed to handle inventory click:', error);
    }
  }

  /**
   * Handle item use packet
   */
  private handleItemUse(packet: any): void {
    try {
      const playerId = packet.playerId;
      const hand = packet.data?.hand; // 0 = main hand, 1 = off hand

      if (playerId) {
        const inventory = this.playerInventories.get(playerId);
        if (inventory) {
          const item = hand === 0 ? inventory.selectedItem : inventory.offhand[0];
          if (item) {
            this.handleInventoryChange(playerId, 'select', item, item.slot);
          }
        }
      }
    } catch (error) {
      this.logger.error('Failed to handle item use:', error);
    }
  }

  /**
   * Handle slot update packet
   */
  private handleSlotUpdate(packet: any): void {
    try {
      const playerId = packet.playerId;
      const windowId = packet.data?.windowId;
      const slot = packet.data?.slot;
      const itemStack = packet.data?.itemStack;

      // Only handle player inventory (windowId 0)
      if (playerId && windowId === 0 && slot !== undefined) {
        const item = itemStack ? this.formatInventoryItem({
          ...itemStack,
          slot
        }) : null;

        this.handleInventoryChange(playerId, 'modify', item, slot);
      }
    } catch (error) {
      this.logger.error('Failed to handle slot update:', error);
    }
  }

  /**
   * Handle inventory change
   */
  private handleInventoryChange(playerId: string, changeType: 'add' | 'remove' | 'modify' | 'select', item: InventoryItem | null, slot: number): void {
    try {
      const change: InventoryChange = {
        playerId,
        changeType,
        item: item || this.getEmptyItem(slot),
        slot,
        timestamp: Date.now()
      };

      // Update player inventory
      this.updateInventorySlot(playerId, slot, item);

      // Notify subscribers
      this.notifyInventoryChange(change);

      // Update statistics
      this.statistics.totalChanges++;

      // Check for books
      if (item && item.id === 'minecraft:written_book') {
        this.processBookItem(playerId, item);
      }

    } catch (error) {
      this.logger.error('Failed to handle inventory change:', error);
    }
  }

  /**
   * Update inventory slot
   */
  private updateInventorySlot(playerId: string, slot: number, item: InventoryItem | null): void {
    try {
      const inventory = this.playerInventories.get(playerId);
      if (!inventory) return;

      // Update appropriate slot array
      if (slot >= 0 && slot <= 8) {
        inventory.hotbar[slot] = item;
        if (slot === inventory.selectedSlot) {
          inventory.selectedItem = item;
        }
      } else if (slot >= 9 && slot <= 35) {
        inventory.main[slot - 9] = item;
      } else if (slot >= 36 && slot <= 39) {
        inventory.armor[slot - 36] = item;
      } else if (slot === 45) {
        inventory.offhand[0] = item;
      }
    } catch (error) {
      this.logger.error('Failed to update inventory slot:', error);
    }
  }

  /**
   * Get empty item
   */
  private getEmptyItem(slot: number): InventoryItem {
    return {
      id: 'minecraft:air',
      count: 0,
      slot
    };
  }

  /**
   * Notify inventory change subscribers
   */
  private notifyInventoryChange(change: InventoryChange): void {
    try {
      const subscribers = this.inventorySubscribers.get('inventory_changes');
      if (subscribers) {
        for (const callback of subscribers) {
          try {
            callback(change);
          } catch (error) {
            this.logger.error('Inventory change subscriber error:', error);
          }
        }
      }
    } catch (error) {
      this.logger.error('Failed to notify inventory change:', error);
    }
  }

  /**
   * Scan all inventories
   */
  private scanInventories(): void {
    try {
      if (!api.state) return;

      const players = api.state.get("players") || {};
      
      for (const [playerId, playerData] of Object.entries(players)) {
        this.updatePlayerInventory(playerId, playerData);
      }

      this.statistics.lastScanTime = Date.now();
      this.statistics.trackedInventories = this.playerInventories.size;

    } catch (error) {
      this.logger.error('Failed to scan inventories:', error);
    }
  }

  /**
   * Get player inventory
   */
  public getPlayerInventory(playerId: string): PlayerInventory | null {
    return this.playerInventories.get(playerId) || null;
  }

  /**
   * Get book NBT for player
   */
  public getBookNBT(playerId: string, slot?: number): BookData | null {
    try {
      const inventory = this.playerInventories.get(playerId);
      if (!inventory) return null;

      let item: InventoryItem | null = null;

      if (slot !== undefined) {
        // Get specific slot
        if (slot >= 0 && slot <= 8) {
          item = inventory.hotbar[slot];
        } else if (slot >= 9 && slot <= 35) {
          item = inventory.main[slot - 9];
        } else if (slot >= 36 && slot <= 39) {
          item = inventory.armor[slot - 36];
        } else if (slot === 45) {
          item = inventory.offhand[0];
        }
      } else {
        // Get selected item
        item = inventory.selectedItem;
      }

      return item && item.id === 'minecraft:written_book' ? this.extractBookNBT(item) : null;
    } catch (error) {
      this.logger.error(`Failed to get book NBT for player ${playerId}:`, error);
      return null;
    }
  }

  /**
   * Extract dimension data from book NBT
   */
  public extractDimensionData(bookNBT: BookData): any {
    try {
      return {
        title: bookNBT.title,
        author: bookNBT.author,
        pages: bookNBT.pages,
        endlessDimension: bookNBT.endlessDimension,
        customData: bookNBT.customData,
        hasDimensionData: this.hasDimensionData(bookNBT)
      };
    } catch (error) {
      this.logger.error('Failed to extract dimension data:', error);
      return null;
    }
  }

  /**
   * Subscribe to inventory events
   */
  public subscribe(eventType: 'inventory_changes' | 'dimension_books', callback: Function): void {
    try {
      if (!this.inventorySubscribers.has(eventType)) {
        this.inventorySubscribers.set(eventType, new Set());
      }
      this.inventorySubscribers.get(eventType)!.add(callback);
      
      this.logger.debug(`Subscribed to ${eventType} events`);
    } catch (error) {
      this.logger.error(`Failed to subscribe to ${eventType}:`, error);
    }
  }

  /**
   * Unsubscribe from inventory events
   */
  public unsubscribe(eventType: 'inventory_changes' | 'dimension_books', callback: Function): void {
    try {
      const subscribers = this.inventorySubscribers.get(eventType);
      if (subscribers) {
        subscribers.delete(callback);
        if (subscribers.size === 0) {
          this.inventorySubscribers.delete(eventType);
        }
      }
    } catch (error) {
      this.logger.error(`Failed to unsubscribe from ${eventType}:`, error);
    }
  }

  /**
   * Get statistics
   */
  public getStatistics(): InventoryStatistics {
    return { ...this.statistics };
  }

  /**
   * Clear book data cache
   */
  public clearBookDataCache(): void {
    this.bookDataCache.clear();
    this.logger.info('Book data cache cleared');
  }

  /**
   * Shutdown inventory manager
   */
  public shutdown(): void {
    try {
      this.playerInventories.clear();
      this.bookDataCache.clear();
      this.inventorySubscribers.clear();
      this.isInitialized = false;
      this.logger.info('InventoryManager shutdown complete');
    } catch (error) {
      this.logger.error('Error during InventoryManager shutdown:', error);
    }
  }
}

// Singleton instance for global access
let globalInventoryManager: InventoryManager | null = null;

/**
 * Get global inventory manager instance
 */
export function getInventoryManager(): InventoryManager {
  if (!globalInventoryManager) {
    globalInventoryManager = new InventoryManager();
  }
  return globalInventoryManager;
}

/**
 * Convenience function to get book NBT
 */
export function getBookNBT(playerId: string, slot?: number): BookData | null {
  const manager = getInventoryManager();
  return manager.getBookNBT(playerId, slot);
}

/**
 * Convenience function to extract dimension data
 */
export function extractDimensionData(bookNBT: BookData): any {
  const manager = getInventoryManager();
  return manager.extractDimensionData(bookNBT);
}
