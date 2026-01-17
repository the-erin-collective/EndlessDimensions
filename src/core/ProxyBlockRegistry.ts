import { Logger } from '../utils/Logger';
import { getFileSystemManager } from '../hooks/useFileSystem';

// Type definitions
interface Vec3 {
  x: number;
  y: number;
  z: number;
}

interface BlockTypeDefinition {
  id: string;
  name: string;
  displayName: string;
  hardness: number;
  resistance: number;
  lightLevel: number;
  hasCollision: boolean;
  requiresTool: boolean;
  tool: string;
  drops: string;
  soundType: string;
  particleType?: string;
  color?: string;
  model?: string;
  texture?: string;
}

interface ProxyBlockData {
  position: Vec3;
  trueType: string;
  placedBy: string;
  timestamp: number;
  nbt?: any;
}

/**
 * Proxy Block Registry - Manages ID multiplexing for custom blocks
 * Uses one base block with metadata to represent multiple block types
 */
export class ProxyBlockRegistry {
  private logger: Logger;
  private fileSystemManager: any;
  private baseBlockId: string = "endless:proxy_block";
  private blockTypes: Map<string, BlockTypeDefinition> = new Map();
  private placedBlocks: Map<string, ProxyBlockData> = new Map();
  private displayEntities: Map<string, string> = new Map(); // position -> entityId
  private isInitialized: boolean = false;

  constructor() {
    this.logger = new Logger('ProxyBlockRegistry');
    this.fileSystemManager = getFileSystemManager();
    this.initializeBlockTypes();
  }

  /**
   * Initialize the proxy block registry
   */
  public async initialize(): Promise<void> {
    try {
      // Ensure base datapack exists
      await this.ensureBaseDataPack();

      // Initialize global state storage
      this.initializeStateStorage();

      this.isInitialized = true;
      this.logger.info('ProxyBlockRegistry initialized successfully');

    } catch (error) {
      this.logger.error('Failed to initialize ProxyBlockRegistry:', error);
      throw error;
    }
  }

  /**
   * Initialize all custom block type definitions
   */
  private initializeBlockTypes(): void {
    const blockTypes: BlockTypeDefinition[] = [
      {
        id: "ant_block",
        name: "Ant Block",
        displayName: "Ant Infested Block",
        hardness: 2.0,
        resistance: 6.0,
        lightLevel: 0,
        hasCollision: true,
        requiresTool: true,
        tool: "pickaxe",
        drops: "minecraft:dirt",
        soundType: "stone",
        particleType: "minecraft:angry_villager",
        color: "#8B4513"
      },
      {
        id: "chaos_block",
        name: "Chaos Block",
        displayName: "Block of Chaos",
        hardness: 50.0,
        resistance: 2000.0,
        lightLevel: 15,
        hasCollision: true,
        requiresTool: true,
        tool: "pickaxe",
        drops: "minecraft:air",
        soundType: "metal",
        particleType: "minecraft:dragon_breath",
        color: "#FF00FF"
      },
      {
        id: "library_bookshelf",
        name: "Library Bookshelf",
        displayName: "Eternal Library Bookshelf",
        hardness: 1.5,
        resistance: 3.0,
        lightLevel: 0,
        hasCollision: true,
        requiresTool: false,
        tool: "axe",
        drops: "minecraft:book",
        soundType: "wood",
        color: "#8B4513"
      },
      {
        id: "credits_block",
        name: "Credits Block",
        displayName: "Credits Display Block",
        hardness: 0.5,
        resistance: 1.0,
        lightLevel: 8,
        hasCollision: false,
        requiresTool: false,
        tool: "hand",
        drops: "minecraft:paper",
        soundType: "stone",
        particleType: "minecraft:enchant",
        color: "#FFD700"
      },
      {
        id: "pattern_block",
        name: "Pattern Block",
        displayName: "Geometric Pattern Block",
        hardness: 3.0,
        resistance: 8.0,
        lightLevel: 0,
        hasCollision: true,
        requiresTool: true,
        tool: "pickaxe",
        drops: "minecraft:stone",
        soundType: "stone",
        color: "#4169E1"
      },
      {
        id: "lucky_block",
        name: "Lucky Block",
        displayName: "Lucky Block",
        hardness: 1.0,
        resistance: 2.0,
        lightLevel: 0,
        hasCollision: true,
        requiresTool: false,
        tool: "hand",
        drops: "minecraft:diamond",
        soundType: "metal",
        particleType: "minecraft:happy_villager",
        color: "#FFD700"
      },
      {
        id: "cloud_block",
        name: "Cloud Block",
        displayName: "Solidified Cloud Block",
        hardness: 0.3,
        resistance: 0.5,
        lightLevel: 12,
        hasCollision: false,
        requiresTool: false,
        tool: "hand",
        drops: "minecraft:white_wool",
        soundType: "wool",
        color: "#FFFFFF"
      },
      {
        id: "water_essence",
        name: "Water Essence",
        displayName: "Water Essence Block",
        hardness: 0.8,
        resistance: 1.5,
        lightLevel: 4,
        hasCollision: false,
        requiresTool: false,
        tool: "hand",
        drops: "minecraft:water_bucket",
        soundType: "water",
        particleType: "minecraft:splash",
        color: "#00CED1"
      },
      {
        id: "infested_end_stone",
        name: "Infested End Stone",
        displayName: "Infested End Stone",
        hardness: 3.0,
        resistance: 9.0,
        lightLevel: 0,
        hasCollision: true,
        requiresTool: true,
        tool: "pickaxe",
        drops: "minecraft:end_stone",
        soundType: "stone",
        particleType: "minecraft:end_rod",
        color: "#8B7355"
      },
      {
        id: "bleeding_netherrack",
        name: "Bleeding Netherrack",
        displayName: "Bleeding Netherrack",
        hardness: 0.4,
        resistance: 2.0,
        lightLevel: 3,
        hasCollision: true,
        requiresTool: false,
        tool: "hand",
        drops: "minecraft:netherrack",
        soundType: "stone",
        particleType: "minecraft:flame",
        color: "#8B0000"
      },
      {
        id: "void_crystal",
        name: "Void Crystal",
        displayName: "Void Crystal Block",
        hardness: 25.0,
        resistance: 1000.0,
        lightLevel: 10,
        hasCollision: true,
        requiresTool: true,
        tool: "pickaxe",
        drops: "minecraft:amethyst_shard",
        soundType: "amethyst_cluster",
        particleType: "minecraft:witch",
        color: "#4B0082"
      },
      {
        id: "rainbow_block",
        name: "Rainbow Block",
        displayName: "Rainbow Block",
        hardness: 2.0,
        resistance: 5.0,
        lightLevel: 15,
        hasCollision: true,
        requiresTool: true,
        tool: "pickaxe",
        drops: "minecraft:glowstone_dust",
        soundType: "glass",
        particleType: "minecraft:note",
        color: "#FF69B4"
      },
      {
        id: "temporal_block",
        name: "Temporal Block",
        displayName: "Temporal Disruption Block",
        hardness: 5.0,
        resistance: 15.0,
        lightLevel: 6,
        hasCollision: true,
        requiresTool: true,
        tool: "pickaxe",
        drops: "minecraft:clock",
        soundType: "metal",
        particleType: "minecraft:portal",
        color: "#00FFFF"
      },
      {
        id: "resonant_block",
        name: "Resonant Block",
        displayName: "Resonant Frequency Block",
        hardness: 4.0,
        resistance: 12.0,
        lightLevel: 8,
        hasCollision: true,
        requiresTool: true,
        tool: "pickaxe",
        drops: "minecraft:note_block",
        soundType: "note_block",
        particleType: "minecraft:note",
        color: "#9370DB"
      },
      {
        id: "cosmic_altar",
        name: "Cosmic Altar",
        displayName: "Cosmic Altar Block",
        hardness: 8.0,
        resistance: 25.0,
        lightLevel: 14,
        hasCollision: true,
        requiresTool: true,
        tool: "pickaxe",
        drops: "minecraft:obsidian",
        soundType: "stone",
        particleType: "minecraft:enchant",
        color: "#191970"
      }
    ];

    for (const blockType of blockTypes) {
      this.blockTypes.set(blockType.id, blockType);
    }

    this.logger.info(`Initialized ${blockTypes.length} custom block types`);
  }

  /**
   * Ensure base datapack exists
   */
  private async ensureBaseDataPack(): Promise<void> {
    try {
      const validation = await this.fileSystemManager.validateDataPack();
      if (!validation.valid) {
        this.logger.warn('Base datapack validation failed, attempting to create...');
        // Would call BaseDataPackCreator here
      }
    } catch (error) {
      this.logger.error('Failed to validate base datapack:', error);
    }
  }

  /**
   * Initialize state storage for block metadata
   */
  private initializeStateStorage(): void {
    try {
      // Initialize global state for block metadata
      if (api.state) {
        api.state.set("proxyBlocks", {});
        this.logger.info('Initialized global state storage for proxy blocks');
      }
    } catch (error) {
      this.logger.error('Failed to initialize state storage:', error);
    }
  }

  /**
   * Place a proxy block with custom type
   */
  public async placeBlock(
    position: Vec3,
    blockTypeId: string,
    placedBy: string = "unknown"
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.isInitialized) {
        return { success: false, error: "ProxyBlockRegistry not initialized" };
      }

      const blockType = this.blockTypes.get(blockTypeId);
      if (!blockType) {
        return { success: false, error: `Unknown block type: ${blockTypeId}` };
      }

      const positionKey = this.getPositionKey(position);

      // Place the base proxy block in the world
      await this.placeBaseBlock(position);

      // Store block metadata in global state
      await this.storeBlockMetadata(position, blockTypeId, placedBy);

      // Create display entity for visual representation
      await this.createDisplayEntity(position, blockType);

      // Track placed block
      this.placedBlocks.set(positionKey, {
        position,
        trueType: blockTypeId,
        placedBy,
        timestamp: Date.now()
      });

      this.logger.info(`Placed ${blockType.displayName} at ${JSON.stringify(position)}`);
      return { success: true };

    } catch (error) {
      this.logger.error(`Failed to place block ${blockTypeId}:`, error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Place the base proxy block in the world
   */
  private async placeBaseBlock(position: Vec3): Promise<void> {
    try {
      // Use Moud's world API to place the block
      if (api.world && api.world.setBlock) {
        await api.world.setBlock(position.x, position.y, position.z, this.baseBlockId);
      } else {
        // Fallback: use command
        const command = `/setblock ${position.x} ${position.y} ${position.z} ${this.baseBlockId}`;
        await api.server.executeCommand(command);
      }
    } catch (error) {
      this.logger.error('Failed to place base block:', error);
      throw error;
    }
  }

  /**
   * Store block metadata in global state
   */
  private async storeBlockMetadata(position: Vec3, blockTypeId: string, placedBy: string): Promise<void> {
    try {
      const positionKey = this.getPositionKey(position);
      const metadata = {
        trueType: blockTypeId,
        placedBy,
        timestamp: Date.now()
      };

      // Store in global state
      if (api.state) {
        const currentBlocks = api.state.get("proxyBlocks") || {};
        currentBlocks[positionKey] = metadata;
        api.state.set("proxyBlocks", currentBlocks);
      }

    } catch (error) {
      this.logger.error('Failed to store block metadata:', error);
      throw error;
    }
  }

  /**
   * Create display entity for visual representation
   */
  private async createDisplayEntity(position: Vec3, blockType: BlockTypeDefinition): Promise<void> {
    try {
      const entityId = `proxy_block_${Date.now()}_${Math.random()}`;

      // Create display entity NBT
      const displayNBT = {
        id: "minecraft:display",
        Pos: [position.x, position.y, position.z],
        transformation: {
          translation: [0, 0, 0],
          left_rotation: [0, 0, 0, 1],
          right_rotation: [0, 0, 0, 1],
          scale: [1, 1, 1]
        },
        Tags: ["endless_proxy", `type:${blockType.id}`],
        CustomName: `{"text":"${blockType.displayName}","color":"white"}`,
        CustomNameVisible: true,
        InterpolationDuration: 0,
        TeleportDuration: 0,
        Billboard: "center",
        Brightness: {
          sky: 15,
          block: blockType.lightLevel
        },
        ViewRange: 32,
        ShadowRadius: 0.5,
        ShadowStrength: 1.0,
        Width: 1.0,
        Height: 1.0
      };

      // Apply color if specified
      if (blockType.color) {
        (displayNBT as any).color = blockType.color;
      }

      // Summon display entity
      const command = `/summon minecraft:display ${position.x} ${position.y} ${position.z} ${JSON.stringify(displayNBT).replace(/"/g, '\\"')}`;
      await api.server.executeCommand(command);

      // Track display entity
      this.displayEntities.set(this.getPositionKey(position), entityId);

      this.logger.debug(`Created display entity for ${blockType.id}`);

    } catch (error) {
      this.logger.error('Failed to create display entity:', error);
      // Don't throw - display entity is optional
    }
  }

  /**
   * Get block type at position
   */
  public getBlockType(position: Vec3): BlockTypeDefinition | null {
    try {
      const positionKey = this.getPositionKey(position);

      // Check global state first
      if (api.state) {
        const blocks = api.state.get("proxyBlocks") || {};
        const metadata = blocks[positionKey];
        if (metadata) {
          return this.blockTypes.get(metadata.trueType) || null;
        }
      }

      // Fallback to local tracking
      const placedBlock = this.placedBlocks.get(positionKey);
      if (placedBlock) {
        return this.blockTypes.get(placedBlock.trueType) || null;
      }

      return null;

    } catch (error) {
      this.logger.error('Failed to get block type:', error);
      return null;
    }
  }

  /**
   * Remove proxy block
   */
  public async removeBlock(position: Vec3): Promise<{ success: boolean; error?: string }> {
    try {
      const positionKey = this.getPositionKey(position);
      const blockType = this.getBlockType(position);

      if (!blockType) {
        return { success: false, error: "No proxy block found at position" };
      }

      // Remove block from world
      await this.removeBaseBlock(position);

      // Remove display entity
      await this.removeDisplayEntity(position);

      // Remove from global state
      await this.removeBlockMetadata(position);

      // Remove from local tracking
      this.placedBlocks.delete(positionKey);

      this.logger.info(`Removed ${blockType.displayName} from ${JSON.stringify(position)}`);
      return { success: true };

    } catch (error) {
      this.logger.error('Failed to remove block:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Remove base block from world
   */
  private async removeBaseBlock(position: Vec3): Promise<void> {
    try {
      if (api.world && api.world.setBlock) {
        await api.world.setBlock(position.x, position.y, position.z, "minecraft:air");
      } else {
        const command = `/setblock ${position.x} ${position.y} ${position.z} minecraft:air`;
        await api.server.executeCommand(command);
      }
    } catch (error) {
      this.logger.error('Failed to remove base block:', error);
      throw error;
    }
  }

  /**
   * Remove display entity
   */
  private async removeDisplayEntity(position: Vec3): Promise<void> {
    try {
      const positionKey = this.getPositionKey(position);
      const entityId = this.displayEntities.get(positionKey);

      if (entityId) {
        const command = `/kill @e[type=minecraft:display,tag=endless_proxy]`;
        await api.server.executeCommand(command);
        this.displayEntities.delete(positionKey);
      }
    } catch (error) {
      this.logger.error('Failed to remove display entity:', error);
      // Don't throw - display entity removal is optional
    }
  }

  /**
   * Remove block metadata from global state
   */
  private async removeBlockMetadata(position: Vec3): Promise<void> {
    try {
      const positionKey = this.getPositionKey(position);

      if (api.state) {
        const currentBlocks = api.state.get("proxyBlocks") || {};
        delete currentBlocks[positionKey];
        api.state.set("proxyBlocks", currentBlocks);
      }
    } catch (error) {
      this.logger.error('Failed to remove block metadata:', error);
      throw error;
    }
  }

  /**
   * Get all available block types
   */
  public getAvailableBlockTypes(): BlockTypeDefinition[] {
    return Array.from(this.blockTypes.values());
  }

  /**
   * Get block type definition by ID
   */
  public getBlockTypeDefinition(blockTypeId: string): BlockTypeDefinition | null {
    return this.blockTypes.get(blockTypeId) || null;
  }

  /**
   * Get all placed blocks
   */
  public getPlacedBlocks(): ProxyBlockData[] {
    return Array.from(this.placedBlocks.values());
  }

  /**
   * Get statistics
   */
  public getStatistics(): any {
    return {
      isInitialized: this.isInitialized,
      totalBlockTypes: this.blockTypes.size,
      placedBlocksCount: this.placedBlocks.size,
      displayEntitiesCount: this.displayEntities.size,
      baseBlockId: this.baseBlockId
    };
  }

  /**
   * Convert position to string key
   */
  private getPositionKey(position: Vec3): string {
    return `${position.x}_${position.y}_${position.z}`;
  }

  /**
   * Shutdown proxy block registry
   */
  public shutdown(): void {
    try {
      this.blockTypes.clear();
      this.placedBlocks.clear();
      this.displayEntities.clear();
      this.isInitialized = false;
      this.logger.info('ProxyBlockRegistry shutdown complete');
    } catch (error) {
      this.logger.error('Error during ProxyBlockRegistry shutdown:', error);
    }
  }
}

// Singleton instance
let globalProxyBlockRegistry: ProxyBlockRegistry | null = null;

/**
 * Get the global proxy block registry instance
 */
export function getProxyBlockRegistry(): ProxyBlockRegistry {
  if (!globalProxyBlockRegistry) {
    globalProxyBlockRegistry = new ProxyBlockRegistry();
  }
  return globalProxyBlockRegistry;
}

/**
 * Convenience function to place a custom block
 */
export async function placeCustomBlock(
  position: Vec3,
  blockTypeId: string,
  placedBy?: string
): Promise<{ success: boolean; error?: string }> {
  const registry = getProxyBlockRegistry();
  return await registry.placeBlock(position, blockTypeId, placedBy);
}

/**
 * Convenience function to remove a custom block
 */
export async function removeCustomBlock(position: Vec3): Promise<{ success: boolean; error?: string }> {
  const registry = getProxyBlockRegistry();
  return await registry.removeBlock(position);
}
