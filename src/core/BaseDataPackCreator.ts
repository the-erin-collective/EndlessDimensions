/// <reference types="@epi-studio/moud-sdk" />
import { Logger } from '../utils/Logger';
import { getFileSystemManager } from '../hooks/useFileSystem';

/**
 * Base Data Pack Creator - Creates the foundational datapack structure
 * Establishes the proxy block system for ID multiplexing
 */
export class BaseDataPackCreator {
  private logger: Logger;
  private fileSystemManager: any;

  constructor() {
    this.logger = new Logger('BaseDataPackCreator');
    this.fileSystemManager = getFileSystemManager();
  }

  /**
   * Create the complete base datapack structure
   */
  public async createBaseDataPack(): Promise<{ success: boolean; error?: string }> {
    try {
      this.logger.info('Creating base datapack structure...');

      // Initialize filesystem manager (creates directories)
      await this.fileSystemManager.initialize();

      // Create pack.mcmeta
      await this.createPackMcmeta();

      // Create proxy block definition
      await this.createProxyBlock();

      // Create base item definition
      await this.createProxyItem();

      // Validate the datapack
      const validation = await this.fileSystemManager.validateDataPack();
      if (!validation.valid) {
        return {
          success: false,
          error: `Datapack validation failed: ${validation.issues.join(', ')}`
        };
      }

      this.logger.info('Base datapack created successfully');
      return { success: true };

    } catch (error) {
      this.logger.error('Failed to create base datapack:', error);
      return {
        success: false,
        error: String(error)
      };
    }
  }

  /**
   * Create pack.mcmeta file
   */
  private async createPackMcmeta(): Promise<void> {
    const packMcmeta = {
      pack: {
        pack_format: 10,
        description: "Endless Dimensions - Dynamic Dimension Generation Mod"
      }
    };

    const result = await this.fileSystemManager.writeFile(
      "world/datapacks/endless/pack.mcmeta",
      JSON.stringify(packMcmeta, null, 2)
    );

    if (!result.success) {
      throw new Error(`Failed to create pack.mcmeta: ${result.error}`);
    }

    this.logger.info('Created pack.mcmeta');
  }

  /**
   * Create proxy block definition
   */
  private async createProxyBlock(): Promise<void> {
    const proxyBlock = {
      type: "minecraft:block",
      properties: {
        "endless:type": "default"
      },
      description: "Endless Dimensions Proxy Block - Used for ID multiplexing"
    };

    const result = await this.fileSystemManager.writeFile(
      "world/datapacks/endless/data/endless/blocks/proxy_block.json",
      JSON.stringify(proxyBlock, null, 2)
    );

    if (!result.success) {
      throw new Error(`Failed to create proxy_block.json: ${result.error}`);
    }

    this.logger.info('Created proxy block definition');
  }

  /**
   * Create proxy item definition
   */
  private async createProxyItem(): Promise<void> {
    const proxyItem = {
      type: "minecraft:item",
      properties: {
        "endless:type": "default"
      },
      description: "Endless Dimensions Proxy Item - Used for ID multiplexing"
    };

    const result = await this.fileSystemManager.writeFile(
      "world/datapacks/endless/data/endless/items/proxy_item.json",
      JSON.stringify(proxyItem, null, 2)
    );

    if (!result.success) {
      throw new Error(`Failed to create proxy_item.json: ${result.error}`);
    }

    this.logger.info('Created proxy item definition');
  }

  /**
   * Create block state file for proxy block
   */
  private async createProxyBlockState(): Promise<void> {
    const blockState = {
      variants: {
        "": {
          model: "endless:block/proxy_block"
        }
      }
    };

    const result = await this.fileSystemManager.writeFile(
      "world/datapacks/endless/assets/endless/blockstates/proxy_block.json",
      JSON.stringify(blockState, null, 2)
    );

    if (!result.success) {
      throw new Error(`Failed to create proxy block state: ${result.error}`);
    }

    this.logger.info('Created proxy block state');
  }

  /**
   * Create block model file
   */
  private async createProxyBlockModel(): Promise<void> {
    const blockModel = {
      parent: "minecraft:block/cube_all",
      textures: {
        all: "endless:block/proxy_block"
      }
    };

    const result = await this.fileSystemManager.writeFile(
      "world/datapacks/endless/assets/endless/models/block/proxy_block.json",
      JSON.stringify(blockModel, null, 2)
    );

    if (!result.success) {
      throw new Error(`Failed to create proxy block model: ${result.error}`);
    }

    this.logger.info('Created proxy block model');
  }

  /**
   * Create item model file
   */
  private async createProxyItemModel(): Promise<void> {
    const itemModel = {
      parent: "minecraft:item/generated",
      textures: {
        layer0: "endless:item/proxy_item"
      }
    };

    const result = await this.fileSystemManager.writeFile(
      "world/datapacks/endless/assets/endless/models/item/proxy_item.json",
      JSON.stringify(itemModel, null, 2)
    );

    if (!result.success) {
      throw new Error(`Failed to create proxy item model: ${result.error}`);
    }

    this.logger.info('Created proxy item model');
  }

  /**
   * Create complete asset structure (optional - for visual representation)
   */
  public async createCompleteAssets(): Promise<{ success: boolean; error?: string }> {
    try {
      this.logger.info('Creating complete asset structure...');

      // Create block state
      await this.createProxyBlockState();

      // Create block model
      await this.createProxyBlockModel();

      // Create item model
      await this.createProxyItemModel();

      // Create texture placeholder (would need actual texture files)
      await this.createTexturePlaceholders();

      this.logger.info('Complete asset structure created');
      return { success: true };

    } catch (error) {
      this.logger.error('Failed to create complete assets:', error);
      return {
        success: false,
        error: String(error)
      };
    }
  }

  /**
   * Create texture placeholders
   */
  private async createTexturePlaceholders(): Promise<void> {
    // Create texture directories
    const textureDirs = [
      "world/datapacks/endless/assets/endless/textures/block",
      "world/datapacks/endless/assets/endless/textures/item"
    ];

    for (const dir of textureDirs) {
      try {
        await this.fileSystemManager.ensureDirectoryExists(dir);
      } catch (error) {
        this.logger.warn(`Failed to create texture directory: ${dir}`, error);
      }
    }

    // Note: Actual texture files would need to be created separately
    this.logger.info('Created texture directories');
  }

  /**
   * Get datapack status
   */
  public async getDatapackStatus(): Promise<any> {
    try {
      const validation = await this.fileSystemManager.validateDataPack();
      const stats = this.fileSystemManager.getFileSystemStats();

      return {
        isValid: validation.valid,
        issues: validation.issues,
        stats,
        isInitialized: stats.isInitialized
      };

    } catch (error) {
      this.logger.error('Failed to get datapack status:', error);
      return {
        isValid: false,
        issues: [`Status check failed: ${error}`],
        isInitialized: false
      };
    }
  }
}

// Singleton instance
let baseDataPackCreator: BaseDataPackCreator | null = null;

/**
 * Get the base data pack creator instance
 */
export function getBaseDataPackCreator(): BaseDataPackCreator {
  if (!baseDataPackCreator) {
    baseDataPackCreator = new BaseDataPackCreator();
  }
  return baseDataPackCreator;
}

/**
 * Convenience function to create base datapack
 */
export async function createBaseDataPack(): Promise<{ success: boolean; error?: string }> {
  const creator = getBaseDataPackCreator();
  return await creator.createBaseDataPack();
}

/**
 * Convenience function to create complete assets
 */
export async function createCompleteAssets(): Promise<{ success: boolean; error?: string }> {
  const creator = getBaseDataPackCreator();
  return await creator.createCompleteAssets();
}
