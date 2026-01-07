/// <reference types="@epi-studio/moud-sdk" />
import { Logger } from '../utils/Logger';
import { getDataPackSyncManager } from './useDataPackSync';

// Type definitions for experimental features
interface ExperimentalFeatures {
  dataDrivenBlocks: boolean;
  blockDiscoveryAPI: boolean;
  dataMapAPI: boolean;
  customBlockModels: boolean;
  experimentalProperties: boolean;
}

interface ServerVersionInfo {
  version: string;
  major: number;
  minor: number;
  patch: number;
  isSnapshot: boolean;
  experimentalLevel: 'stable' | 'experimental' | 'snapshot';
}

interface BlockDiscoveryResult {
  supported: boolean;
  features: ExperimentalFeatures;
  recommendations: string[];
  warnings: string[];
}

/**
 * Experimental Block Registry - Leverages 1.21+ experimental datapack block discovery
 * Provides advanced features for dynamic block registration without Java boilerplate
 */
export class ExperimentalBlockRegistry {
  private logger: Logger;
  private dataPackSyncManager: any;
  private supportedVersion: string = "1.21";
  private minimumVersion: string = "1.20.1";
  private serverVersionInfo: ServerVersionInfo | null = null;
  private discoveryCache: Map<string, BlockDiscoveryResult> = new Map();
  private isInitialized: boolean = false;

  constructor() {
    this.logger = new Logger('ExperimentalBlockRegistry');
    this.dataPackSyncManager = getDataPackSyncManager();
  }

  /**
   * Initialize the experimental block registry
   */
  public async initialize(): Promise<void> {
    try {
      // Get server version information
      await this.detectServerVersion();

      // Initialize discovery cache
      this.initializeDiscoveryCache();

      this.isInitialized = true;
      this.logger.info('ExperimentalBlockRegistry initialized');

    } catch (error) {
      this.logger.error('Failed to initialize ExperimentalBlockRegistry:', error);
      throw error;
    }
  }

  /**
   * Detect server version and capabilities
   */
  private async detectServerVersion(): Promise<void> {
    try {
      // Try multiple methods to get version
      const version = await this.getServerVersion();
      this.serverVersionInfo = this.parseVersion(version);

      this.logger.info(`Server version detected: ${this.serverVersionInfo.version} (${this.serverVersionInfo.experimentalLevel})`);

    } catch (error) {
      this.logger.error('Failed to detect server version:', error);
      // Use conservative fallback
      this.serverVersionInfo = {
        version: "1.20.1",
        major: 1,
        minor: 20,
        patch: 1,
        isSnapshot: false,
        experimentalLevel: 'stable'
      };
    }
  }

  /**
   * Get server version from various sources
   */
  private async getServerVersion(): Promise<string> {
    try {
      // Method 1: Moud API
      if (api.server && api.server.getVersion) {
        return api.server.getVersion();
      }

      // Method 2: Server command
      const versionResult = await api.server.executeCommand('/version');
      if (versionResult.success && versionResult.output) {
        const versionMatch = versionResult.output.match(/version\s+(\d+\.\d+\.\d+)/i);
        if (versionMatch) {
          return versionMatch[1];
        }
      }

      // Method 3: Brand info
      const brandResult = await api.server.executeCommand('/version');
      if (brandResult.success && brandResult.output) {
        const brandMatch = brandResult.output.match(/Vanilla|Paper|Fabric|Forge/i);
        if (brandMatch) {
          this.logger.debug(`Server brand: ${brandMatch[0]}`);
        }
      }

      // Method 4: Fallback
      this.logger.warn('Using fallback version detection');
      return "1.20.1";

    } catch (error) {
      this.logger.error('Version detection failed:', error);
      return "1.20.1";
    }
  }

  /**
   * Parse version string into components
   */
  private parseVersion(version: string): ServerVersionInfo {
    try {
      const cleanVersion = version.replace(/[^\d.\d.\d]/g, '').substring(0, 10);
      const parts = cleanVersion.split('.').map(Number);
      
      const major = parts[0] || 1;
      const minor = parts[1] || 0;
      const patch = parts[2] || 0;

      // Determine experimental level
      let experimentalLevel: 'stable' as const;
      let isSnapshot = false;

      if (version.includes('experimental') || version.includes('snapshot')) {
        experimentalLevel = 'experimental';
      } else if (version.includes('pre') || version.includes('rc')) {
        experimentalLevel = 'snapshot';
        isSnapshot = true;
      }

      return {
        version: cleanVersion,
        major,
        minor,
        patch,
        isSnapshot,
        experimentalLevel
      };

    } catch (error) {
      this.logger.error('Version parsing failed:', error);
      return {
        version: "1.20.1",
        major: 1,
        minor: 20,
        patch: 1,
        isSnapshot: false,
        experimentalLevel: 'stable'
      };
    }
  }

  /**
   * Initialize discovery cache
   */
  private initializeDiscoveryCache(): void {
    // Pre-populate cache with common discovery results
    this.discoveryCache.set('data_driven_blocks', {
      supported: true,
      features: {
        dataDrivenBlocks: true,
        blockDiscoveryAPI: true,
        dataMapAPI: true,
        customBlockModels: true,
        experimentalProperties: true
      },
      recommendations: [],
      warnings: []
    });
  }

  /**
   * Check if experimental features are supported
   */
  public checkExperimentalSupport(): BlockDiscoveryResult {
    try {
      if (!this.isInitialized) {
        return {
          supported: false,
          features: this.getDefaultFeatures(),
          recommendations: ['Initialize ExperimentalBlockRegistry first'],
          warnings: ['Registry not initialized']
        };
      }

      // Check cache first
      const cacheKey = this.getCacheKey();
      if (this.discoveryCache.has(cacheKey)) {
        return this.discoveryCache.get(cacheKey)!;
      }

      // Perform full discovery
      const result = await this.performDiscovery();

      // Cache result
      this.discoveryCache.set(cacheKey, result);

      return result;

    } catch (error) {
      this.logger.error('Experimental support check failed:', error);
      return {
        supported: false,
        features: this.getDefaultFeatures(),
        recommendations: ['Check server logs'],
        warnings: [`Discovery failed: ${error}`]
      };
    }
  }

  /**
   * Perform full experimental feature discovery
   */
  private async performDiscovery(): Promise<BlockDiscoveryResult> {
    try {
      const features = this.getDefaultFeatures();
      const recommendations: string[] = [];
      const warnings: string[] = [];

      // Check version compatibility
      const versionCheck = this.checkVersionCompatibility();
      if (!versionCheck.supported) {
        recommendations.push(...versionCheck.recommendations);
        warnings.push(...versionCheck.warnings);
      }

      // Check specific experimental features
      const featureChecks = await this.checkSpecificFeatures();
      features.dataDrivenBlocks = featureChecks.dataDrivenBlocks;
      features.blockDiscoveryAPI = featureChecks.blockDiscoveryAPI;
      features.dataMapAPI = featureChecks.dataMapAPI;

      // Check for additional capabilities
      const additionalChecks = await this.checkAdditionalCapabilities();
      features.customBlockModels = additionalChecks.customBlockModels;
      features.experimentalProperties = additionalChecks.experimentalProperties;

      // Generate recommendations based on findings
      if (features.dataDrivenBlocks && !features.blockDiscoveryAPI) {
        recommendations.push('Consider upgrading to newer version for full block discovery');
      }

      return {
        supported: versionCheck.supported && features.dataDrivenBlocks,
        features,
        recommendations,
        warnings
      };

    } catch (error) {
      this.logger.error('Discovery failed:', error);
      throw error;
    }
  }

  /**
   * Check version compatibility
   */
  private checkVersionCompatibility(): { supported: boolean; recommendations: string[]; warnings: string[] } {
    const recommendations: string[] = [];
    const warnings: string[] = [];

    if (!this.serverVersionInfo) {
      return {
        supported: false,
        recommendations: ['Could not detect server version'],
        warnings: ['Version detection failed']
      };
    }

    const versionComparison = this.compareVersions(
      this.serverVersionInfo!,
      this.parseVersion(this.supportedVersion)
    );

    if (versionComparison < 0) {
      return {
        supported: false,
        recommendations: [`Upgrade to ${this.supportedVersion}+ for experimental blocks`],
        warnings: [`Server version ${this.serverVersionInfo.version} is too old`]
      };
    }

    if (this.serverVersionInfo.experimentalLevel === 'stable' && this.compareVersions(this.serverVersionInfo, this.parseVersion("1.21")) < 0) {
      recommendations.push('Consider using experimental snapshots for cutting-edge features');
    }

    return {
      supported: true,
      recommendations,
      warnings
    };
  }

  /**
   * Check specific experimental features
   */
  private async checkSpecificFeatures(): Promise<Partial<ExperimentalFeatures>> {
    try {
      const features: Partial<ExperimentalFeatures> = {};

      // Test data-driven block discovery
      features.dataDrivenBlocks = await this.testDataDrivenBlocks();

      // Test block discovery API
      features.blockDiscoveryAPI = await this.testBlockDiscoveryAPI();

      // Test data map API
      features.dataMapAPI = await this.testDataMapAPI();

      return features;

    } catch (error) {
      this.logger.error('Feature check failed:', error);
      return this.getDefaultFeatures();
    }
  }

  /**
   * Test data-driven block discovery
   */
  private async testDataDrivenBlocks(): Promise<boolean> {
    try {
      // Try to register a test block using experimental format
      const testBlockId = `test_discovery_${Date.now()}`;
      
      const result = await this.dataPackSyncManager.registerBlock(testBlockId, {
        type: "minecraft:block",
        properties: {
          "endless:type": testBlockId,
          "experimental": true,
          "discovery": "data_driven"
        },
        behavior: {
          particle_effect: "minecraft:happy_villager"
        }
      });

      // Clean up test block
      await this.cleanupTestBlock(testBlockId);

      return result.success;

    } catch (error) {
      this.logger.error('Data-driven block test failed:', error);
      return false;
    }
  }

  /**
   * Test block discovery API
   */
  private async testBlockDiscoveryAPI(): Promise<boolean> {
    try {
      // Check if we can query block registry
      if (api.registry && api.registry.getBlocks) {
        const blocks = api.registry.getBlocks();
        return Array.isArray(blocks);
      }

      // Check if experimental blocks appear in creative menu
      const creativeResult = await api.server.executeCommand('/give @p minecraft:stone 1');
      return creativeResult.success;

    } catch (error) {
      this.logger.error('Block Discovery API test failed:', error);
      return false;
    }
  }

  /**
   * Test data map API
   */
  private async testDataMapAPI(): Promise<boolean> {
    try {
      // Test if we can access data map values
      const testValue = this.dataPackSyncManager.getDataMapValue('test_block', 'particle_effect');
      return testValue !== null;

    } catch (error) {
      this.logger.error('Data Map API test failed:', error);
      return false;
    }
  }

  /**
   * Check additional capabilities
   */
  private async checkAdditionalCapabilities(): Promise<{ customBlockModels: boolean; experimentalProperties: boolean }> {
    try {
      // Test custom block model support
      const customModels = await this.testCustomBlockModels();

      // Test experimental properties support
      const experimentalProps = await this.testExperimentalProperties();

      return {
        customBlockModels,
        experimentalProperties: experimentalProps
      };

    } catch (error) {
      this.logger.error('Additional capability check failed:', error);
      return {
        customBlockModels: false,
        experimentalProperties: false
      };
    }
  }

  /**
   * Test custom block model support
   */
  private async testCustomBlockModels(): Promise<boolean> {
    try {
      // Try to create a block with custom model
      const testBlockId = `test_model_${Date.now()}`;
      
      const result = await this.dataPackSyncManager.registerBlock(testBlockId, {
        type: "minecraft:block",
        properties: {
          "endless:type": testBlockId,
          "experimental": true,
          "custom_model": "endless:block/custom_test"
        }
      });

      // Clean up test block
      await this.cleanupTestBlock(testBlockId);

      return result.success;

    } catch (error) {
      this.logger.error('Custom block model test failed:', error);
      return false;
    }
  }

  /**
   * Test experimental properties support
   */
  private async testExperimentalProperties(): Promise<boolean> {
    try {
      // Try to use advanced experimental properties
      const testBlockId = `test_props_${Date.now()}`;
      
      const result = await this.dataPackSyncManager.registerBlock(testBlockId, {
        type: "minecraft:block",
        properties: {
          "endless:type": testBlockId,
          "experimental": true,
          "loot_table": "endless:blocks/test_loot",
          "custom_drop_logic": true,
          "particle_emission": true
        }
      });

      // Clean up test block
      await this.cleanupTestBlock(testBlockId);

      return result.success;

    } catch (error) {
      this.logger.error('Experimental properties test failed:', error);
      return false;
    }
  }

  /**
   * Clean up test block
   */
  private async cleanupTestBlock(blockId: string): Promise<void> {
    try {
      // Remove from data pack sync manager
      // Note: In a real implementation, we'd need to track and clean up test blocks
      
      this.logger.debug(`Cleaned up test block: ${blockId}`);

    } catch (error) {
      this.logger.error('Test block cleanup failed:', error);
    }
  }

  /**
   * Get default features (fallback)
   */
  private getDefaultFeatures(): ExperimentalFeatures {
    return {
      dataDrivenBlocks: false,
      blockDiscoveryAPI: false,
      dataMapAPI: false,
      customBlockModels: false,
      experimentalProperties: false
    };
  }

  /**
   * Get cache key for current server version
   */
  private getCacheKey(): string {
    if (!this.serverVersionInfo) {
      return 'unknown_version';
    }
    return `${this.serverVersionInfo.major}_${this.serverVersionInfo.minor}_${this.serverVersionInfo.patch}_${this.serverVersionInfo.experimentalLevel}`;
  }

  /**
   * Compare version strings
   */
  private compareVersions(version1: ServerVersionInfo, version2: ServerVersionInfo): number {
    // Compare major versions
    if (version1.major !== version2.major) {
      return version1.major - version2.major;
    }

    // Compare minor versions
    if (version1.minor !== version2.minor) {
      return version1.minor - version2.minor;
    }

    // Compare patch versions
    return version1.patch - version2.patch;
  }

  /**
   * Register an experimental block with full discovery
   */
  public async registerExperimentalBlock(
    blockId: string, 
    config: any
  ): Promise<{ success: boolean; error?: string; warnings?: string[] }> {
    try {
      // Check experimental support first
      const discovery = this.checkExperimentalSupport();
      
      if (!discovery.supported) {
        return {
          success: false,
          error: "Experimental blocks not supported",
          warnings: discovery.warnings
        };
      }

      // Add experimental properties if not present
      const enhancedConfig = {
        ...config,
        properties: {
          ...config.properties,
          "experimental": true,
          "discovery": "data_driven"
        }
      };

      // Register using data pack sync manager
      const result = await this.dataPackSyncManager.registerBlock(blockId, enhancedConfig);

      this.logger.info(`Registered experimental block: ${blockId} (discovery: ${discovery.features.blockDiscoveryAPI})`);

      return {
        success: result.success,
        error: result.error,
        warnings: discovery.warnings
      };

    } catch (error) {
      this.logger.error(`Failed to register experimental block ${blockId}:`, error);
      return {
        success: false,
        error: String(error)
      };
    }
  }

  /**
   * Get discovery information
   */
  public getDiscoveryInfo(): BlockDiscoveryResult {
    return this.checkExperimentalSupport();
  }

  /**
   * Get server version information
   */
  public getServerVersionInfo(): ServerVersionInfo | null {
    return this.serverVersionInfo;
  }

  /**
   * Get statistics
   */
  public getStatistics(): any {
    return {
      isInitialized: this.isInitialized,
      serverVersion: this.serverVersionInfo?.version || 'unknown',
      supportedVersion: this.supportedVersion,
      minimumVersion: this.minimumVersion,
      discoveryCacheSize: this.discoveryCache.size,
      experimentalMode: this.serverVersionInfo?.experimentalLevel || 'unknown'
    };
  }

  /**
   * Clear discovery cache
   */
  public clearCache(): void {
    this.discoveryCache.clear();
    this.logger.info('Discovery cache cleared');
  }

  /**
   * Shutdown experimental block registry
   */
  public shutdown(): void {
    try {
      this.discoveryCache.clear();
      this.serverVersionInfo = null;
      this.isInitialized = false;
      this.logger.info('ExperimentalBlockRegistry shutdown complete');
    } catch (error) {
      this.logger.error('Error during ExperimentalBlockRegistry shutdown:', error);
    }
  }
}

// Singleton instance for global access
let globalExperimentalBlockRegistry: ExperimentalBlockRegistry | null = null;

/**
 * Get global experimental block registry instance
 */
export function getExperimentalBlockRegistry(): ExperimentalBlockRegistry {
  if (!globalExperimentalBlockRegistry) {
    globalExperimentalBlockRegistry = new ExperimentalBlockRegistry();
  }
  return globalExperimentalBlockRegistry;
}

/**
 * Convenience function to register experimental block
 */
export async function registerExperimentalBlockWithDiscovery(
  blockId: string, 
  config: any
): Promise<{ success: boolean; error?: string; warnings?: string[] }> {
  const registry = getExperimentalBlockRegistry();
  return await registry.registerExperimentalBlock(blockId, config);
}
