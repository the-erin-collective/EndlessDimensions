import { Logger } from '../utils/Logger';

// Type definitions for packet structures
interface PacketInfo {
  type: string;
  data: any;
  timestamp: number;
  direction: 'incoming' | 'outgoing';
  playerId?: string;
}

interface EntitySpawnPacket {
  entityId: number;
  entityType: string;
  position: { x: number; y: number; z: number };
  itemStack?: {
    id: string;
    count: number;
    tag?: any;
  };
}

interface UseItemPacket {
  hand: 'main_hand' | 'off_hand';
  position: { x: number; y: number; z: number };
  itemStack?: {
    id: string;
    count: number;
    tag?: any;
  };
}

interface PlayerActionPacket {
  action: string;
  position: { x: number; y: number; z: number };
  itemStack?: {
    id: string;
    count: number;
    tag?: any;
  };
}

interface SetSlotPacket {
  windowId: number;
  slot: number;
  itemStack?: {
    id: string;
    count: number;
    tag?: any;
  };
}

/**
 * Packet Interception Hook - Provides direct access to Minecraft packet stream
 * Replaces missing event APIs with packet-level monitoring
 */
export class PacketPipe {
  private logger: Logger;
  private incomingHandlers: Map<string, Set<(packet: PacketInfo) => void>> = new Map();
  private outgoingHandlers: Map<string, Set<(packet: PacketInfo) => void>> = new Map();
  private packetHistory: PacketInfo[] = [];
  private maxHistorySize: number = 1000;
  private packetStats: Map<string, number> = new Map();
  private isInitialized: boolean = false;
  private interceptedPackets: number = 0;
  private filteredPackets: number = 0;

  constructor() {
    this.logger = new Logger('PacketPipe');
  }

  /**
   * Initialize packet interception
   */
  public initialize(): void {
    try {
      // Hook into incoming packets (server -> client)
      api.packets.onIncoming((rawPacket: any) => {
        this.handleIncomingPacket(rawPacket);
      });

      // Hook into outgoing packets (client -> server)
      api.packets.onOutgoing((rawPacket: any) => {
        this.handleOutgoingPacket(rawPacket);
      });

      this.isInitialized = true;
      this.logger.info('PacketPipe initialized - monitoring packet stream');

    } catch (error) {
      this.logger.error('Failed to initialize PacketPipe:', error);
      // Try alternative initialization methods
      this.initializeAlternative();
    }
  }

  /**
   * Alternative initialization if primary method fails
   */
  private initializeAlternative(): void {
    try {
      // Try alternative Moud packet APIs
      if (api.packets.intercept) {
        api.packets.intercept((packet: any, direction: string) => {
          if (direction === 'incoming') {
            this.handleIncomingPacket(packet);
          } else {
            this.handleOutgoingPacket(packet);
          }
        });
        this.isInitialized = true;
        this.logger.info('PacketPipe initialized with alternative method');
      } else {
        this.logger.warn('Packet interception not available - using fallback mode');
      }
    } catch (error) {
      this.logger.error('Alternative packet initialization failed:', error);
    }
  }

  /**
   * Handle incoming packets (server -> client)
   */
  private handleIncomingPacket(rawPacket: any): void {
    try {
      const packetInfo = this.processPacket(rawPacket, 'incoming');
      if (!packetInfo) return;

      this.interceptedPackets++;
      this.updatePacketStats(packetInfo.type);
      this.addToHistory(packetInfo);

      // Route to specific handlers
      this.routePacket(packetInfo);

    } catch (error) {
      this.logger.error('Error handling incoming packet:', error);
    }
  }

  /**
   * Handle outgoing packets (client -> server)
   */
  private handleOutgoingPacket(rawPacket: any): void {
    try {
      const packetInfo = this.processPacket(rawPacket, 'outgoing');
      if (!packetInfo) return;

      this.interceptedPackets++;
      this.updatePacketStats(packetInfo.type);
      this.addToHistory(packetInfo);

      // Route to specific handlers
      this.routePacket(packetInfo);

    } catch (error) {
      this.logger.error('Error handling outgoing packet:', error);
    }
  }

  /**
   * Process raw packet into standardized format
   */
  private processPacket(rawPacket: any, direction: 'incoming' | 'outgoing'): PacketInfo | null {
    try {
      // Extract packet type and data
      const packetType = this.extractPacketType(rawPacket);
      if (!packetType) {
        this.filteredPackets++;
        return null;
      }

      // Filter for relevant packets only
      if (!this.isRelevantPacket(packetType)) {
        this.filteredPackets++;
        return null;
      }

      return {
        type: packetType,
        data: this.extractPacketData(rawPacket, packetType),
        timestamp: Date.now(),
        direction,
        playerId: this.extractPlayerId(rawPacket, direction)
      };

    } catch (error) {
      this.logger.error('Error processing packet:', error);
      return null;
    }
  }

  /**
   * Extract packet type from raw packet
   */
  private extractPacketType(rawPacket: any): string | null {
    try {
      // Try different possible packet type fields
      return rawPacket.type || 
             rawPacket.packetType || 
             rawPacket.constructor?.name ||
             rawPacket.name ||
             null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Extract packet data based on type
   */
  private extractPacketData(rawPacket: any, packetType: string): any {
    try {
      // Extract relevant data based on packet type
      switch (packetType) {
        case 'ClientboundAddEntityPacket':
        case 'spawn_entity':
          return this.extractEntitySpawnData(rawPacket);
        
        case 'ServerboundUseItemPacket':
        case 'use_item':
          return this.extractUseItemData(rawPacket);
        
        case 'ServerboundPlayerActionPacket':
        case 'player_action':
          return this.extractPlayerActionData(rawPacket);
        
        case 'ServerboundSetCreativeModeSlotPacket':
        case 'set_creative_slot':
          return this.extractSetSlotData(rawPacket);
        
        default:
          return rawPacket;
      }
    } catch (error) {
      return rawPacket;
    }
  }

  /**
   * Extract entity spawn data
   */
  private extractEntitySpawnData(rawPacket: any): EntitySpawnPacket {
    return {
      entityId: rawPacket.entityId || rawPacket.id || 0,
      entityType: rawPacket.entityType || rawPacket.type || 'unknown',
      position: {
        x: rawPacket.x || rawPacket.pos?.x || 0,
        y: rawPacket.y || rawPacket.pos?.y || 0,
        z: rawPacket.z || rawPacket.pos?.z || 0
      },
      itemStack: rawPacket.itemStack || rawPacket.data?.itemStack
    };
  }

  /**
   * Extract use item data
   */
  private extractUseItemData(rawPacket: any): UseItemPacket {
    return {
      hand: rawPacket.hand || 'main_hand',
      position: {
        x: rawPacket.x || rawPacket.pos?.x || 0,
        y: rawPacket.y || rawPacket.pos?.y || 0,
        z: rawPacket.z || rawPacket.pos?.z || 0
      },
      itemStack: rawPacket.itemStack || rawPacket.heldItem
    };
  }

  /**
   * Extract player action data
   */
  private extractPlayerActionData(rawPacket: any): PlayerActionPacket {
    return {
      action: rawPacket.action || rawPacket.status || 'unknown',
      position: {
        x: rawPacket.x || rawPacket.location?.x || 0,
        y: rawPacket.y || rawPacket.location?.y || 0,
        z: rawPacket.z || rawPacket.location?.z || 0
      },
      itemStack: rawPacket.itemStack
    };
  }

  /**
   * Extract set slot data
   */
  private extractSetSlotData(rawPacket: any): SetSlotPacket {
    return {
      windowId: rawPacket.windowId || rawPacket.containerId || 0,
      slot: rawPacket.slot || rawPacket.slotId || 0,
      itemStack: rawPacket.itemStack || rawPacket.stack
    };
  }

  /**
   * Extract player ID from packet
   */
  private extractPlayerId(rawPacket: any, direction: 'incoming' | 'outgoing'): string | undefined {
    try {
      // Try different possible player ID fields
      return rawPacket.playerId || 
             rawPacket.entityId ||
             rawPacket.uuid ||
             undefined;
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Check if packet is relevant to our mod
   */
  private isRelevantPacket(packetType: string): boolean {
    const relevantPackets = [
      // Entity-related packets
      'ClientboundAddEntityPacket',
      'spawn_entity',
      'ClientboundRemoveEntitiesPacket',
      'remove_entities',
      
      // Item interaction packets
      'ServerboundUseItemPacket',
      'use_item',
      'ServerboundPlayerActionPacket',
      'player_action',
      'ServerboundSetCreativeModeSlotPacket',
      'set_creative_slot',
      
      // Inventory packets
      'ClientboundContainerSetSlotPacket',
      'container_set_slot',
      'ServerboundContainerClickPacket',
      'container_click',
      
      // Movement packets
      'ServerboundMovePlayerPacket',
      'move_player',
      'ClientboundPlayerPositionPacket',
      'player_position'
    ];

    return relevantPackets.some(type => 
      packetType.toLowerCase().includes(type.toLowerCase()) ||
      type.toLowerCase().includes(packetType.toLowerCase())
    );
  }

  /**
   * Route packet to appropriate handlers
   */
  private routePacket(packetInfo: PacketInfo): void {
    try {
      const handlers = packetInfo.direction === 'incoming' 
        ? this.incomingHandlers 
        : this.outgoingHandlers;

      // Route to specific packet type handlers
      const typeHandlers = handlers.get(packetInfo.type);
      if (typeHandlers) {
        for (const handler of typeHandlers) {
          try {
            handler(packetInfo);
          } catch (error) {
            this.logger.error(`Error in packet handler for ${packetInfo.type}:`, error);
          }
        }
      }

      // Route to wildcard handlers
      const wildcardHandlers = handlers.get('*');
      if (wildcardHandlers) {
        for (const handler of wildcardHandlers) {
          try {
            handler(packetInfo);
          } catch (error) {
            this.logger.error('Error in wildcard packet handler:', error);
          }
        }
      }

    } catch (error) {
      this.logger.error('Error routing packet:', error);
    }
  }

  /**
   * Register handler for specific packet type
   */
  public registerIncomingHandler(packetType: string, handler: (packet: PacketInfo) => void): void {
    if (!this.incomingHandlers.has(packetType)) {
      this.incomingHandlers.set(packetType, new Set());
    }
    this.incomingHandlers.get(packetType)!.add(handler);
    this.logger.debug(`Registered incoming handler for: ${packetType}`);
  }

  /**
   * Register handler for specific packet type
   */
  public registerOutgoingHandler(packetType: string, handler: (packet: PacketInfo) => void): void {
    if (!this.outgoingHandlers.has(packetType)) {
      this.outgoingHandlers.set(packetType, new Set());
    }
    this.outgoingHandlers.get(packetType)!.add(handler);
    this.logger.debug(`Registered outgoing handler for: ${packetType}`);
  }

  /**
   * Register handler for all packets
   */
  public registerWildcardIncomingHandler(handler: (packet: PacketInfo) => void): void {
    this.registerIncomingHandler('*', handler);
  }

  /**
   * Register handler for all packets
   */
  public registerWildcardOutgoingHandler(handler: (packet: PacketInfo) => void): void {
    this.registerOutgoingHandler('*', handler);
  }

  /**
   * Get recent packets by type
   */
  public getRecentPackets(packetType?: string, maxCount: number = 100): PacketInfo[] {
    let packets = this.packetHistory;
    
    if (packetType) {
      packets = packets.filter(p => p.type === packetType);
    }
    
    return packets.slice(-maxCount);
  }

  /**
   * Get packet statistics
   */
  public getPacketStats(): any {
    return {
      isInitialized: this.isInitialized,
      interceptedPackets: this.interceptedPackets,
      filteredPackets: this.filteredPackets,
      packetTypeCounts: Object.fromEntries(this.packetStats),
      historySize: this.packetHistory.length,
      incomingHandlers: this.incomingHandlers.size,
      outgoingHandlers: this.outgoingHandlers.size
    };
  }

  /**
   * Update packet statistics
   */
  private updatePacketStats(packetType: string): void {
    const count = this.packetStats.get(packetType) || 0;
    this.packetStats.set(packetType, count + 1);
  }

  /**
   * Add packet to history
   */
  private addToHistory(packetInfo: PacketInfo): void {
    this.packetHistory.push(packetInfo);
    
    // Trim history if too large
    if (this.packetHistory.length > this.maxHistorySize) {
      this.packetHistory.shift();
    }
  }

  /**
   * Clear packet history and stats
   */
  public clearHistory(): void {
    this.packetHistory = [];
    this.packetStats.clear();
    this.interceptedPackets = 0;
    this.filteredPackets = 0;
    this.logger.info('Packet history cleared');
  }

  /**
   * Shutdown packet interception
   */
  public shutdown(): void {
    try {
      this.incomingHandlers.clear();
      this.outgoingHandlers.clear();
      this.packetHistory = [];
      this.packetStats.clear();
      this.isInitialized = false;
      this.logger.info('PacketPipe shutdown complete');
    } catch (error) {
      this.logger.error('Error during PacketPipe shutdown:', error);
    }
  }
}

// Singleton instance for global access
let globalPacketPipe: PacketPipe | null = null;

/**
 * Get the global packet pipe instance
 */
export function getPacketPipe(): PacketPipe {
  if (!globalPacketPipe) {
    globalPacketPipe = new PacketPipe();
    globalPacketPipe.initialize();
  }
  return globalPacketPipe;
}

/**
 * Convenience function to register incoming packet handler
 */
export function useIncomingPacketHandler(packetType: string, handler: (packet: PacketInfo) => void): void {
  const pipe = getPacketPipe();
  pipe.registerIncomingHandler(packetType, handler);
}

/**
 * Convenience function to register outgoing packet handler
 */
export function useOutgoingPacketHandler(packetType: string, handler: (packet: PacketInfo) => void): void {
  const pipe = getPacketPipe();
  pipe.registerOutgoingHandler(packetType, handler);
}

/**
 * Convenience function to register wildcard packet handlers
 */
export function useWildcardPacketHandlers(
  incomingHandler?: (packet: PacketInfo) => void,
  outgoingHandler?: (packet: PacketInfo) => void
): void {
  const pipe = getPacketPipe();
  if (incomingHandler) {
    pipe.registerWildcardIncomingHandler(incomingHandler);
  }
  if (outgoingHandler) {
    pipe.registerWildcardOutgoingHandler(outgoingHandler);
  }
}
