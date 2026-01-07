/// <reference types="@epi-studio/moud-sdk" />
import { Logger } from '../utils/Logger';
import { DimensionGenerator, DimensionConfig } from './DimensionGenerator';
import { getDimensionJsonInjector } from './DimensionJsonInjector';
import { getDatapackStructureGenerator } from './DatapackStructureGenerator';

/**
 * Dimension Registry Bridge - Connects existing DimensionGenerator to JSON injection system
 * Provides seamless integration between dimension generation and dynamic registration
 */
export class DimensionRegistryBridge {
    private logger: Logger;
    private dimensionGenerator: DimensionGenerator;
    private jsonInjector: any;
    private structureGenerator: any;
    private isInitialized: boolean = false;
    private registrationQueue: Map<string, DimensionConfig> = new Map();
    private isProcessingQueue: boolean = false;

    constructor(dimensionGenerator: DimensionGenerator) {
        this.logger = new Logger('DimensionRegistryBridge');
        this.dimensionGenerator = dimensionGenerator;
        this.jsonInjector = getDimensionJsonInjector();
        this.structureGenerator = getDatapackStructureGenerator();
    }

    /**
     * Initialize the bridge
     */
    public async initialize(): Promise<void> {
        try {
            // Initialize JSON injector
            await this.jsonInjector.initialize();
            
            // Generate datapack structure
            await this.structureGenerator.generateStructure();
            
            // Validate structure
            const isValid = await this.structureGenerator.validateStructure();
            if (!isValid) {
                throw new Error('Datapack structure validation failed');
            }
            
            this.isInitialized = true;
            this.logger.info('DimensionRegistryBridge initialized successfully');
            
        } catch (error) {
            this.logger.error('Failed to initialize DimensionRegistryBridge:', error);
            throw error;
        }
    }

    /**
     * Register dimension with validation and tracking
     */
    public async registerDimension(config: DimensionConfig): Promise<boolean> {
        try {
            if (!this.isInitialized) {
                throw new Error('DimensionRegistryBridge not initialized');
            }

            // Validate dimension configuration
            const validation = this.validateDimensionConfig(config);
            if (!validation.isValid) {
                this.logger.error(`Dimension validation failed: ${validation.errors.join(', ')}`);
                return false;
            }

            // Check for existing dimension
            if (this.jsonInjector.isDimensionRegistered(config.id)) {
                this.logger.warn(`Dimension already registered: ${config.id}`);
                return false;
            }

            // Add to registration queue
            this.registrationQueue.set(config.id, config);
            
            // Process queue
            await this.processRegistrationQueue();
            
            return true;
            
        } catch (error) {
            this.logger.error(`Failed to register dimension ${config.id}:`, error);
            return false;
        }
    }

    /**
     * Process dimension registration queue
     */
    private async processRegistrationQueue(): Promise<void> {
        if (this.isProcessingQueue) {
            return;
        }

        this.isProcessingQueue = true;

        try {
            for (const [dimensionId, config] of this.registrationQueue) {
                this.logger.info(`Processing dimension registration: ${dimensionId}`);
                
                // Register with JSON injector
                const success = await this.jsonInjector.registerDimension(config);
                
                if (success) {
                    this.logger.info(`Dimension successfully registered: ${dimensionId}`);
                    this.registrationQueue.delete(dimensionId);
                    
                    // Notify success
                    await this.notifyDimensionRegistered(config);
                } else {
                    this.logger.error(`Failed to register dimension: ${dimensionId}`);
                }
                
                // Small delay between registrations
                await this.sleep(500);
            }
            
        } catch (error) {
            this.logger.error('Error processing registration queue:', error);
        } finally {
            this.isProcessingQueue = false;
        }
    }

    /**
     * Validate dimension configuration
     */
    private validateDimensionConfig(config: DimensionConfig): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];

        // Check required fields
        if (!config.id || typeof config.id !== 'string') {
            errors.push('Missing or invalid dimension ID');
        }

        if (!config.name || typeof config.name !== 'string') {
            errors.push('Missing or invalid dimension name');
        }

        if (!config.generatorType || typeof config.generatorType !== 'string') {
            errors.push('Missing or invalid generator type');
        }

        // Validate ID format
        if (config.id && !/^[a-z0-9_]+$/.test(config.id)) {
            errors.push('Dimension ID must contain only lowercase letters, numbers, and underscores');
        }

        // Validate ID length
        if (config.id && (config.id.length < 1 || config.id.length > 64)) {
            errors.push('Dimension ID must be between 1 and 64 characters');
        }

        // Validate name length
        if (config.name && (config.name.length < 1 || config.name.length > 128)) {
            errors.push('Dimension name must be between 1 and 128 characters');
        }

        // Validate generator type
        const validGenerators = ['noise', 'flat', 'void', 'floating_islands', 'the_end', 'custom'];
        if (config.generatorType && !validGenerators.includes(config.generatorType)) {
            errors.push(`Invalid generator type: ${config.generatorType}. Valid types: ${validGenerators.join(', ')}`);
        }

        // Validate numeric values
        if (config.seaLevel !== undefined && (typeof config.seaLevel !== 'number' || config.seaLevel < -64 || config.seaLevel > 320)) {
            errors.push('Sea level must be a number between -64 and 320');
        }

        if (config.minY !== undefined && (typeof config.minY !== 'number' || config.minY < -64 || config.minY > 256)) {
            errors.push('Min Y must be a number between -64 and 256');
        }

        if (config.height !== undefined && (typeof config.height !== 'number' || config.height < 1 || config.height > 2048)) {
            errors.push('Height must be a number between 1 and 2048');
        }

        // Validate height and minY combination
        if (config.minY !== undefined && config.height !== undefined) {
            const maxY = config.minY + config.height;
            if (maxY > 2048) {
                errors.push('Min Y + Height must not exceed 2048');
            }
        }

        // Validate additional blocks
        if (config.additionalBlocks && !Array.isArray(config.additionalBlocks)) {
            errors.push('Additional blocks must be an array');
        }

        // Validate special features
        if (config.specialFeatures && !Array.isArray(config.specialFeatures)) {
            errors.push('Special features must be an array');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Notify when dimension is registered
     */
    private async notifyDimensionRegistered(config: DimensionConfig): Promise<void> {
        try {
            // Log registration
            this.logger.info(`✅ Dimension Registered: ${config.name} (${config.id})`);
            this.logger.info(`   Generator: ${config.generatorType}`);
            this.logger.info(`   Default Block: ${config.defaultBlock}`);
            this.logger.info(`   Sea Level: ${config.seaLevel}`);
            this.logger.info(`   Height: ${config.height}`);
            this.logger.info(`   Additional Blocks: ${config.additionalBlocks.length}`);

            // Send notification to players (if server API available)
            if (api.server && api.server.executeCommand) {
                const message = `§6✅ New dimension created: §e${config.name}§6!§r\n§7Use §f/execute in ${config.id} run tp @s ~ ~ ~§7 to visit`;
                api.server.executeCommand(`/tellraw @a {"text":"${message}","color":"green"}`);
            }

            // Trigger dimension-specific events
            this.onDimensionRegistered(config);
            
        } catch (error) {
            this.logger.error('Error notifying dimension registration:', error);
        }
    }

    /**
     * Handle dimension registration events
     */
    private onDimensionRegistered(config: DimensionConfig): void {
        try {
            // This could be extended to trigger specific events
            // For now, just log the event
            this.logger.debug(`Dimension registration event triggered for: ${config.id}`);
            
        } catch (error) {
            this.logger.error('Error handling dimension registration event:', error);
        }
    }

    /**
     * Unregister dimension
     */
    public async unregisterDimension(dimensionId: string): Promise<boolean> {
        try {
            if (!this.isInitialized) {
                throw new Error('DimensionRegistryBridge not initialized');
            }

            // Check if dimension exists
            if (!this.jsonInjector.isDimensionRegistered(dimensionId)) {
                this.logger.warn(`Dimension not registered: ${dimensionId}`);
                return false;
            }

            // Get dimension config before removal
            const config = this.jsonInjector.getDimension(dimensionId);
            
            // Unregister from JSON injector
            const success = await this.jsonInjector.unregisterDimension(dimensionId);
            
            if (success) {
                this.logger.info(`Dimension unregistered: ${dimensionId}`);
                
                // Notify removal
                await this.notifyDimensionUnregistered(dimensionId, config);
            }
            
            return success;
            
        } catch (error) {
            this.logger.error(`Failed to unregister dimension ${dimensionId}:`, error);
            return false;
        }
    }

    /**
     * Notify when dimension is unregistered
     */
    private async notifyDimensionUnregistered(dimensionId: string, config: DimensionConfig | null): Promise<void> {
        try {
            const dimensionName = config?.name || dimensionId;
            
            this.logger.info(`❌ Dimension Unregistered: ${dimensionName} (${dimensionId})`);

            // Send notification to players
            if (api.server && api.server.executeCommand) {
                const message = `§c❌ Dimension removed: §e${dimensionName}§c!`;
                api.server.executeCommand(`/tellraw @a {"text":"${message}","color":"red"}`);
            }
            
        } catch (error) {
            this.logger.error('Error notifying dimension unregistration:', error);
        }
    }

    /**
     * Get registered dimension
     */
    public getDimension(dimensionId: string): DimensionConfig | null {
        try {
            if (!this.isInitialized) {
                return null;
            }

            return this.jsonInjector.getDimension(dimensionId);
            
        } catch (error) {
            this.logger.error(`Failed to get dimension ${dimensionId}:`, error);
            return null;
        }
    }

    /**
     * Get all registered dimensions
     */
    public getAllDimensions(): Map<string, DimensionConfig> {
        try {
            if (!this.isInitialized) {
                return new Map();
            }

            return this.jsonInjector.getAllDimensions();
            
        } catch (error) {
            this.logger.error('Failed to get all dimensions:', error);
            return new Map();
        }
    }

    /**
     * Check if dimension is registered
     */
    public isDimensionRegistered(dimensionId: string): boolean {
        try {
            if (!this.isInitialized) {
                return false;
            }

            return this.jsonInjector.isDimensionRegistered(dimensionId);
            
        } catch (error) {
            this.logger.error(`Failed to check if dimension is registered ${dimensionId}:`, error);
            return false;
        }
    }

    /**
     * Get bridge statistics
     */
    public getStatistics(): any {
        try {
            const injectorStats = this.jsonInjector.getStatistics();
            const structureStats = this.structureGenerator.getStatistics();

            return {
                isInitialized: this.isInitialized,
                queueSize: this.registrationQueue.size,
                isProcessingQueue: this.isProcessingQueue,
                jsonInjector: injectorStats,
                structureGenerator: structureStats
            };
            
        } catch (error) {
            this.logger.error('Failed to get statistics:', error);
            return null;
        }
    }

    /**
     * Cleanup old dimensions
     */
    public async cleanupOldDimensions(): Promise<void> {
        try {
            if (!this.isInitialized) {
                return;
            }

            const activeDimensions = new Set(this.getAllDimensions().keys());
            await this.structureGenerator.cleanupOldDimensions(activeDimensions);
            
            this.logger.info('Old dimension cleanup completed');
            
        } catch (error) {
            this.logger.error('Failed to cleanup old dimensions:', error);
        }
    }

    /**
     * Sleep utility for async operations
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Shutdown the bridge
     */
    public shutdown(): void {
        try {
            this.registrationQueue.clear();
            this.jsonInjector.shutdown();
            this.isInitialized = false;
            this.logger.info('DimensionRegistryBridge shutdown complete');
            
        } catch (error) {
            this.logger.error('Error during shutdown:', error);
        }
    }
}

/**
 * Create dimension registry bridge
 */
export function createDimensionRegistryBridge(dimensionGenerator: DimensionGenerator): DimensionRegistryBridge {
    return new DimensionRegistryBridge(dimensionGenerator);
}
