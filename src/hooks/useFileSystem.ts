import { Logger } from '../utils/Logger';

// Type definitions for filesystem operations
interface FileWriteResult {
  success: boolean;
  path: string;
  error?: string;
  size?: number;
}

interface DirectoryResult {
  success: boolean;
  path: string;
  exists: boolean;
  created?: boolean;
  error?: string;
}

interface DimensionFileData {
  id: string;
  type: string;
  generator: any;
  content: string;
  timestamp: number;
}

/**
 * Filesystem Hook - Provides low-level filesystem access for datapack management
 * Enables dynamic dimension registration through JSON injection
 */
export class FileSystemManager {
  private logger: Logger;
  private isInitialized: boolean = false;
  private baseDataPackPath: string = "world/datapacks/endless";
  private dimensionPath: string = "world/datapacks/endless/data/endless/dimension";
  private biomePath: string = "world/datapacks/endless/data/endless/worldgen/biome";
  private blockPath: string = "world/datapacks/endless/data/endless/blocks";
  private dimensionData: Map<string, DimensionFileData> = new Map();
  private writeQueue: Array<() => Promise<FileWriteResult>> = [];
  private isProcessingQueue: boolean = false;
  private totalWrites: number = 0;
  private failedWrites: number = 0;

  constructor() {
    this.logger = new Logger('FileSystemManager');
  }

  /**
   * Initialize filesystem manager
   */
  public async initialize(): Promise<void> {
    try {
      // Ensure base directories exist
      await this.ensureDirectoryExists(this.baseDataPackPath);
      await this.ensureDirectoryExists(this.dimensionPath);
      await this.ensureDirectoryExists(this.biomePath);
      await this.ensureDirectoryExists(this.blockPath);

      // Create base datapack files
      await this.createBaseDataPackFiles();

      this.isInitialized = true;
      this.logger.info('FileSystemManager initialized successfully');

    } catch (error) {
      this.logger.error('Failed to initialize FileSystemManager:', error);
      throw error;
    }
  }

  /**
   * Ensure directory exists, create if necessary
   */
  private async ensureDirectoryExists(dirPath: string): Promise<DirectoryResult> {
    try {
      // Check if directory exists
      const exists = await this.directoryExists(dirPath);
      
      if (!exists) {
        // Create directory
        await this.createDirectory(dirPath);
        this.logger.debug(`Created directory: ${dirPath}`);
        return { success: true, path: dirPath, exists: false, created: true };
      }
      
      return { success: true, path: dirPath, exists: true, created: false };

    } catch (error) {
      this.logger.error(`Failed to ensure directory exists: ${dirPath}`, error);
      return { success: false, path: dirPath, exists: false, error: String(error) };
    }
  }

  /**
   * Check if directory exists
   */
  private async directoryExists(dirPath: string): Promise<boolean> {
    try {
      // Try to read directory stats
      const stats = await this.getStats(dirPath);
      return stats.isDirectory;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get file/directory stats
   */
  private async getStats(path: string): Promise<any> {
    try {
      return await api.internal.fs.stat(path);
    } catch (error) {
      throw new Error(`Cannot stat ${path}: ${error}`);
    }
  }

  /**
   * Create directory
   */
  private async createDirectory(dirPath: string): Promise<void> {
    try {
      await api.internal.fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      throw new Error(`Cannot create directory ${dirPath}: ${error}`);
    }
  }

  /**
   * Create base datapack files
   */
  private async createBaseDataPackFiles(): Promise<void> {
    try {
      // Create pack.mcmeta
      const packMcmeta = {
        pack: {
          pack_format: 10,
          description: "Endless Dimensions - Dynamic Dimension Generation"
        }
      };
      await this.writeFile(`${this.baseDataPackPath}/pack.mcmeta`, JSON.stringify(packMcmeta, null, 2));

      // Create base block definition
      const proxyBlock = {
        type: "minecraft:block",
        properties: {
          "endless:type": "default"
        }
      };
      await this.writeFile(`${this.blockPath}/proxy_block.json`, JSON.stringify(proxyBlock, null, 2));

      this.logger.info('Base datapack files created');

    } catch (error) {
      this.logger.error('Failed to create base datapack files:', error);
      throw error;
    }
  }

  /**
   * Write dimension JSON file
   */
  public async writeDimensionJson(
    dimensionId: string, 
    dimensionConfig: any
  ): Promise<FileWriteResult> {
    try {
      const filePath = `${this.dimensionPath}/${dimensionId}.json`;
      const content = JSON.stringify(dimensionConfig, null, 2);
      
      const result = await this.writeFile(filePath, content);
      
      if (result.success) {
        // Store dimension data
        this.dimensionData.set(dimensionId, {
          id: dimensionId,
          type: 'dimension',
          generator: dimensionConfig.generator?.type || 'unknown',
          content,
          timestamp: Date.now()
        });
        
        this.logger.info(`Dimension JSON written: ${dimensionId}`);
      }
      
      return result;

    } catch (error) {
      this.logger.error(`Failed to write dimension JSON: ${dimensionId}`, error);
      return {
        success: false,
        path: `${this.dimensionPath}/${dimensionId}.json`,
        error: String(error)
      };
    }
  }

  /**
   * Write biome JSON file
   */
  public async writeBiomeJson(
    biomeId: string, 
    biomeConfig: any
  ): Promise<FileWriteResult> {
    try {
      const filePath = `${this.biomePath}/${biomeId}.json`;
      const content = JSON.stringify(biomeConfig, null, 2);
      
      const result = await this.writeFile(filePath, content);
      
      if (result.success) {
        this.logger.info(`Biome JSON written: ${biomeId}`);
      }
      
      return result;

    } catch (error) {
      this.logger.error(`Failed to write biome JSON: ${biomeId}`, error);
      return {
        success: false,
        path: `${this.biomePath}/${biomeId}.json`,
        error: String(error)
      };
    }
  }

  /**
   * Write file with error handling
   */
  public async writeFile(filePath: string, content: string): Promise<FileWriteResult> {
    try {
      if (!this.isInitialized) {
        throw new Error('FileSystemManager not initialized');
      }

      // Write file using Moud's filesystem API
      await api.internal.fs.writeFile(filePath, content, 'utf8');
      
      const stats = await this.getStats(filePath);
      this.totalWrites++;
      
      this.logger.debug(`File written successfully: ${filePath} (${stats.size} bytes)`);
      
      return {
        success: true,
        path: filePath,
        size: stats.size
      };

    } catch (error) {
      this.failedWrites++;
      this.logger.error(`Failed to write file: ${filePath}`, error);
      return {
        success: false,
        path: filePath,
        error: String(error)
      };
    }
  }

  /**
   * Read file with error handling
   */
  public async readFile(filePath: string): Promise<{ success: boolean; content?: string; error?: string }> {
    try {
      if (!this.isInitialized) {
        throw new Error('FileSystemManager not initialized');
      }

      const content = await api.internal.fs.readFile(filePath, 'utf8');
      
      this.logger.debug(`File read successfully: ${filePath}`);
      
      return {
        success: true,
        content
      };

    } catch (error) {
      this.logger.error(`Failed to read file: ${filePath}`, error);
      return {
        success: false,
        error: String(error)
      };
    }
  }

  /**
   * Delete file
   */
  public async deleteFile(filePath: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.isInitialized) {
        throw new Error('FileSystemManager not initialized');
      }

      await api.internal.fs.unlink(filePath);
      
      this.logger.debug(`File deleted: ${filePath}`);
      
      return { success: true };

    } catch (error) {
      this.logger.error(`Failed to delete file: ${filePath}`, error);
      return {
        success: false,
        error: String(error)
      };
    }
  }

  /**
   * List files in directory
   */
  public async listFiles(dirPath: string): Promise<{ success: boolean; files?: string[]; error?: string }> {
    try {
      if (!this.isInitialized) {
        throw new Error('FileSystemManager not initialized');
      }

      const files = await api.internal.fs.readdir(dirPath);
      
      this.logger.debug(`Listed ${files.length} files in: ${dirPath}`);
      
      return {
        success: true,
        files
      };

    } catch (error) {
      this.logger.error(`Failed to list files in: ${dirPath}`, error);
      return {
        success: false,
        error: String(error)
      };
    }
  }

  /**
   * Trigger server reload to register new dimensions
   */
  public async triggerServerReload(): Promise<{ success: boolean; error?: string }> {
    try {
      this.logger.info('Triggering server reload...');
      
      // Execute reload command
      await api.server.executeCommand("/reload");
      
      // Wait a moment for reload to complete
      await this.sleep(1000);
      
      this.logger.info('Server reload completed');
      return { success: true };

    } catch (error) {
      this.logger.error('Failed to trigger server reload:', error);
      return {
        success: false,
        error: String(error)
      };
    }
  }

  /**
   * Write dimension and trigger reload in one operation
   */
  public async writeDimensionAndReload(
    dimensionId: string, 
    dimensionConfig: any
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Write dimension JSON
      const writeResult = await this.writeDimensionJson(dimensionId, dimensionConfig);
      
      if (!writeResult.success) {
        return {
          success: false,
          error: `Failed to write dimension: ${writeResult.error}`
        };
      }

      // Trigger server reload
      const reloadResult = await this.triggerServerReload();
      
      if (!reloadResult.success) {
        return {
          success: false,
          error: `Failed to reload server: ${reloadResult.error}`
        };
      }

      this.logger.info(`Dimension ${dimensionId} written and server reloaded successfully`);
      return { success: true };

    } catch (error) {
      this.logger.error(`Failed to write dimension and reload: ${dimensionId}`, error);
      return {
        success: false,
        error: String(error)
      };
    }
  }

  /**
   * Cleanup unused dimension files
   */
  public async cleanupUnusedDimensions(activeDimensions: Set<string>): Promise<void> {
    try {
      const dimensionFiles = await this.listFiles(this.dimensionPath);
      
      if (!dimensionFiles.success || !dimensionFiles.files) {
        return;
      }

      for (const file of dimensionFiles.files) {
        if (file.endsWith('.json')) {
          const dimensionId = file.replace('.json', '');
          
          if (!activeDimensions.has(dimensionId)) {
            const filePath = `${this.dimensionPath}/${file}`;
            await this.deleteFile(filePath);
            this.dimensionData.delete(dimensionId);
            this.logger.info(`Cleaned up unused dimension: ${dimensionId}`);
          }
        }
      }

    } catch (error) {
      this.logger.error('Failed to cleanup unused dimensions:', error);
    }
  }

  /**
   * Get dimension data
   */
  public getDimensionData(dimensionId: string): DimensionFileData | undefined {
    return this.dimensionData.get(dimensionId);
  }

  /**
   * Get all dimension data
   */
  public getAllDimensionData(): Map<string, DimensionFileData> {
    return new Map(this.dimensionData);
  }

  /**
   * Get filesystem statistics
   */
  public getFileSystemStats(): any {
    return {
      isInitialized: this.isInitialized,
      totalWrites: this.totalWrites,
      failedWrites: this.failedWrites,
      successRate: this.totalWrites > 0 ? ((this.totalWrites - this.failedWrites) / this.totalWrites * 100).toFixed(2) + '%' : 'N/A',
      dimensionCount: this.dimensionData.size,
      baseDataPackPath: this.baseDataPackPath,
      dimensionPath: this.dimensionPath,
      biomePath: this.biomePath,
      blockPath: this.blockPath
    };
  }

  /**
   * Validate datapack structure
   */
  public async validateDataPack(): Promise<{ valid: boolean; issues: string[] }> {
    const issues: string[] = [];

    try {
      // Check pack.mcmeta exists
      const packMcmetaResult = await this.readFile(`${this.baseDataPackPath}/pack.mcmeta`);
      if (!packMcmetaResult.success) {
        issues.push('Missing pack.mcmeta file');
      }

      // Check directories exist
      const dimensionDirExists = await this.directoryExists(this.dimensionPath);
      if (!dimensionDirExists) {
        issues.push('Dimension directory does not exist');
      }

      const biomeDirExists = await this.directoryExists(this.biomePath);
      if (!biomeDirExists) {
        issues.push('Biome directory does not exist');
      }

      const blockDirExists = await this.directoryExists(this.blockPath);
      if (!blockDirExists) {
        issues.push('Block directory does not exist');
      }

      return {
        valid: issues.length === 0,
        issues
      };

    } catch (error) {
      issues.push(`Validation error: ${error}`);
      return {
        valid: false,
        issues
      };
    }
  }

  /**
   * Sleep utility function
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Shutdown filesystem manager
   */
  public shutdown(): void {
    try {
      this.dimensionData.clear();
      this.writeQueue = [];
      this.isInitialized = false;
      this.logger.info('FileSystemManager shutdown complete');
    } catch (error) {
      this.logger.error('Error during FileSystemManager shutdown:', error);
    }
  }
}

// Singleton instance for global access
let globalFileSystemManager: FileSystemManager | null = null;

/**
 * Get the global filesystem manager instance
 */
export function getFileSystemManager(): FileSystemManager {
  if (!globalFileSystemManager) {
    globalFileSystemManager = new FileSystemManager();
  }
  return globalFileSystemManager;
}

/**
 * Convenience function to write dimension JSON
 */
export async function writeDimensionJson(
  dimensionId: string, 
  dimensionConfig: any
): Promise<FileWriteResult> {
  const fsm = getFileSystemManager();
  return await fsm.writeDimensionJson(dimensionId, dimensionConfig);
}

/**
 * Convenience function to write biome JSON
 */
export async function writeBiomeJson(
  biomeId: string, 
  biomeConfig: any
): Promise<FileWriteResult> {
  const fsm = getFileSystemManager();
  return await fsm.writeBiomeJson(biomeId, biomeConfig);
}

/**
 * Convenience function to write dimension and reload
 */
export async function writeDimensionAndReload(
  dimensionId: string, 
  dimensionConfig: any
): Promise<{ success: boolean; error?: string }> {
  const fsm = getFileSystemManager();
  return await fsm.writeDimensionAndReload(dimensionId, dimensionConfig);
}

/**
 * Convenience function to trigger server reload
 */
export async function triggerServerReload(): Promise<{ success: boolean; error?: string }> {
  const fsm = getFileSystemManager();
  return await fsm.triggerServerReload();
}
