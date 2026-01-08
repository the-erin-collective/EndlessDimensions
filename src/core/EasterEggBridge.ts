/// <reference types="@epi-studio/moud-sdk" />
import { Logger } from '../utils/Logger';
import { SynthesizerGrid, BiomeColumn } from './VirtualGridController';
import { DynamicRegistryInjector } from './DynamicRegistryInjector';
import { BiomeJsonCompiler } from './BiomeJsonCompiler';
import { EasterEggDimensionManager } from './EasterEggDimensionManager';
// Simple hash function for browser compatibility
function simpleHash(str: string): number[] {
    let hash1 = 5381;
    let hash2 = 52711;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash1 = ((hash1 << 5) + hash1) ^ char;
        hash2 = ((hash2 << 5) + hash2) ^ char;
    }
    
    // Convert to 32-byte array (256 bits)
    const result = new Array(32);
    const combined = (hash1 >>> 0) * 4096 + (hash2 >>> 0);
    for (let i = 0; i < 32; i++) {
        result[i] = (combined >> (i * 8)) & 0xFF;
    }
    return result;
}

export interface EasterEggBridgeData {
    seedKey: string;
    dimensionId: string;
    grid: SynthesizerGrid;
    createdAt: string;
    bookTitle: string;
}

export class EasterEggBridge {
    private api: MoudAPI;
    private logger: Logger;
    private registryInjector: DynamicRegistryInjector;
    private biomeCompiler: BiomeJsonCompiler;
    private easterEggManager: EasterEggDimensionManager;
    private bridgeData: Map<string, EasterEggBridgeData>;

    constructor(
        api: MoudAPI,
        registryInjector: DynamicRegistryInjector,
        biomeCompiler: BiomeJsonCompiler,
        easterEggManager: EasterEggDimensionManager
    ) {
        this.api = api;
        this.logger = new Logger('EasterEggBridge');
        this.registryInjector = registryInjector;
        this.biomeCompiler = biomeCompiler;
        this.easterEggManager = easterEggManager;
        this.bridgeData = new Map();
    }

    /**
     * Create an Easter Egg bridge from a synthesizer grid
     * @param grid The synthesizer grid to create a bridge for
     * @param playerId The player to give the book to
     * @returns The seed key for the bridge
     */
    public async createEasterEggBridge(grid: SynthesizerGrid, playerId: string): Promise<string | null> {
        try {
            this.logger.info(`Creating Easter Egg bridge for player ${playerId}`);

            // Generate unique seed key
            const seedKey = this.generateSeedKey(grid);
            const dimensionId = this.generateDimensionId(seedKey);

            // Check if bridge already exists
            if (this.bridgeData.has(seedKey)) {
                this.logger.warn(`Easter Egg bridge already exists for seed key: ${seedKey}`);
                return seedKey;
            }

            // Compile dimension JSON
            const dimensionJson = this.biomeCompiler.compileGridToDimensionJson(grid);

            // Inject dimension
            const success = await this.registryInjector.injectDimension(dimensionId, dimensionJson, grid);
            if (!success) {
                this.logger.error(`Failed to inject dimension for seed key: ${seedKey}`);
                return null;
            }

            // Create bridge data
            const bridgeData: EasterEggBridgeData = {
                seedKey,
                dimensionId,
                grid,
                createdAt: new Date().toISOString(),
                bookTitle: this.generateBookTitle(grid)
            };

            this.bridgeData.set(seedKey, bridgeData);

            // Give player Book and Quill with seed key
            await this.givePlayerBook(playerId, seedKey, bridgeData.bookTitle);

            // Save to Easter Egg manager for persistence
            await this.saveToEasterEggManager(seedKey, bridgeData);

            this.logger.info(`Successfully created Easter Egg bridge: ${seedKey} -> ${dimensionId}`);
            return seedKey;

        } catch (error) {
            this.logger.error('Failed to create Easter Egg bridge', error);
            return null;
        }
    }

    /**
     * Generate a unique seed key from the grid configuration
     */
    private generateSeedKey(grid: SynthesizerGrid): string {
        const unlockedColumns = grid.columns.filter(col => col.unlocked);
        
        // Create a hash from the grid configuration
        const gridData = {
            tier: grid.tier,
            columns: unlockedColumns.map(col => ({
                worldType: col.worldType,
                groundBlock: col.groundBlock,
                fluidBlock: col.fluidBlock,
                oreLayout: col.oreLayout
            }))
        };

        const hashBytes = simpleHash(JSON.stringify(gridData));
        const hash = hashBytes.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 8);
        
        // Create human-readable seed key
        const groundBlockName = this.extractBlockName(unlockedColumns[0]?.groundBlock || 'stone');
        const fluidBlockName = this.extractBlockName(unlockedColumns[0]?.fluidBlock || 'water');
        const randomSuffix = hash.substring(0, 2).toUpperCase();
        
        return `${groundBlockName}-${fluidBlockName}-${randomSuffix}`.toUpperCase();
    }

    /**
     * Generate dimension ID from seed key
     */
    private generateDimensionId(seedKey: string): string {
        return `synthesizer_${seedKey.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
    }

    /**
     * Generate a book title based on the grid configuration
     */
    private generateBookTitle(grid: SynthesizerGrid): string {
        const unlockedColumns = grid.columns.filter(col => col.unlocked);
        
        if (unlockedColumns.length === 0) {
            return 'Empty Dimension';
        }

        const firstColumn = unlockedColumns[0];
        const groundBlockName = this.extractBlockName(firstColumn.groundBlock);
        const fluidBlockName = this.extractBlockName(firstColumn.fluidBlock);
        
        return `Dimension: ${groundBlockName} & ${fluidBlockName}`;
    }

    /**
     * Extract clean block name from block ID
     */
    private extractBlockName(blockId: string): string {
        return blockId
            .replace('minecraft:', '')
            .replace(/_/g, ' ')
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    /**
     * Give a player a Book and Quill with the seed key
     */
    private async givePlayerBook(playerId: string, seedKey: string, bookTitle: string): Promise<void> {
        try {
            // Create written book NBT data
            const bookNBT = {
                title: bookTitle,
                author: 'Biome Synthesizer',
                pages: [
                    `{"text":"${seedKey}","color":"dark_aqua","bold":true}`,
                    `{"text":"\\n\\nThis book contains the key to a custom dimension created with the Biome Synthesizer.\\n\\nDrop this book in a nether portal to travel there!","color":"gray"}`
                ],
                resolved: 1
            };

            // Give the book to the player
            const giveCommand = `/give ${playerId} minecraft:written_book{${this.nbtToString(bookNBT)}}`;
            await this.api.server.executeCommand(giveCommand);

            // Notify the player
            const message = `§6Biome Synthesizer: §eCreated dimension key "${seedKey}"§6!§r\n§7Drop the book in a nether portal to travel there.`;
            await this.api.server.executeCommand(`/tellraw ${playerId} {"text":"${message}","color":"gold"}`);

            this.logger.info(`Gave Book and Quill to player ${playerId} with seed key: ${seedKey}`);

        } catch (error) {
            this.logger.error(`Failed to give book to player ${playerId}`, error);
            throw error;
        }
    }

    /**
     * Convert NBT object to string format for Minecraft commands
     */
    private nbtToString(nbt: any): string {
        return JSON.stringify(nbt)
            .replace(/"/g, '')
            .replace(/:/g, ':')
            .replace(/,/g, ',')
            .replace(/{/g, '{')
            .replace(/}/g, '}')
            .replace(/\[/g, '[')
            .replace(/\]/g, ']');
    }

    /**
     * Save bridge data to Easter Egg manager for persistence
     */
    private async saveToEasterEggManager(seedKey: string, bridgeData: EasterEggBridgeData): Promise<void> {
        try {
            // Create a synthetic easter egg dimension for storage
            const syntheticEasterEgg = {
                name: bridgeData.seedKey,
                displayName: bridgeData.bookTitle,
                generatorType: 'noise' as const,
                defaultBlock: bridgeData.grid.columns[0]?.groundBlock || 'minecraft:stone',
                specialFeatures: ['synthesizer_created'],
                dimensionId: bridgeData.dimensionId
            };

            this.easterEggManager.saveEasterEggDimension(seedKey, syntheticEasterEgg, bridgeData.dimensionId);
            this.logger.debug(`Saved bridge data to Easter Egg manager: ${seedKey}`);

        } catch (error) {
            this.logger.error(`Failed to save bridge data to Easter Egg manager: ${seedKey}`, error);
        }
    }

    /**
     * Check if a seed key exists
     */
    public hasSeedKey(seedKey: string): boolean {
        return this.bridgeData.has(seedKey) || 
               this.easterEggManager.checkEasterEggDimension(seedKey) !== null;
    }

    /**
     * Get dimension ID for a seed key
     */
    public getDimensionId(seedKey: string): string | null {
        // Check bridge data first
        const bridgeData = this.bridgeData.get(seedKey);
        if (bridgeData) {
            return bridgeData.dimensionId;
        }

        // Check Easter Egg manager
        const easterEggData = this.easterEggManager.checkEasterEggDimension(seedKey);
        if (easterEggData) {
            return easterEggData.dimensionId;
        }

        return null;
    }

    /**
     * Get bridge data for a seed key
     */
    public getBridgeData(seedKey: string): EasterEggBridgeData | null {
        return this.bridgeData.get(seedKey) || null;
    }

    /**
     * Get all bridge data
     */
    public getAllBridgeData(): Map<string, EasterEggBridgeData> {
        return new Map(this.bridgeData);
    }

    /**
     * Remove a bridge
     */
    public async removeBridge(seedKey: string): Promise<boolean> {
        try {
            const bridgeData = this.bridgeData.get(seedKey);
            if (!bridgeData) {
                this.logger.warn(`Bridge not found for removal: ${seedKey}`);
                return false;
            }

            // Remove dimension
            await this.registryInjector.removeDimension(bridgeData.dimensionId);

            // Remove from Easter Egg manager
            this.easterEggManager.deleteSavedDimension(seedKey);

            // Remove from bridge data
            this.bridgeData.delete(seedKey);

            this.logger.info(`Successfully removed bridge: ${seedKey}`);
            return true;

        } catch (error) {
            this.logger.error(`Failed to remove bridge: ${seedKey}`, error);
            return false;
        }
    }

    /**
     * Load bridge data from Easter Egg manager on startup
     */
    public loadFromEasterEggManager(): void {
        try {
            const savedDimensions = this.easterEggManager.getAllSavedDimensions();
            
            for (const [seedKey, dimensionData] of savedDimensions.entries()) {
                if (dimensionData.specialFeatures.includes('synthesizer_created')) {
                    // Recreate bridge data from saved dimension
                    const bridgeData: EasterEggBridgeData = {
                        seedKey,
                        dimensionId: dimensionData.dimensionId,
                        grid: {
                            columns: [], // Grid data not persisted, would need separate storage
                            tier: 1,
                            maxColumns: 1
                        },
                        createdAt: dimensionData.createdAt,
                        bookTitle: dimensionData.displayName
                    };

                    this.bridgeData.set(seedKey, bridgeData);
                }
            }

            this.logger.info(`Loaded ${this.bridgeData.size} bridges from Easter Egg manager`);

        } catch (error) {
            this.logger.error('Failed to load bridge data from Easter Egg manager', error);
        }
    }

    /**
     * Get statistics about the bridge system
     */
    public getStatistics(): {
        totalBridges: number;
        activeBridges: number;
        seedKeys: string[];
        oldestBridge: string | null;
        newestBridge: string | null;
    } {
        const seedKeys = Array.from(this.bridgeData.keys());
        let oldestBridge: string | null = null;
        let newestBridge: string | null = null;

        if (seedKeys.length > 0) {
            const sortedBridges = seedKeys
                .map(key => ({ 
                    key, 
                    createdAt: this.bridgeData.get(key)!.createdAt 
                }))
                .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

            oldestBridge = sortedBridges[0].key;
            newestBridge = sortedBridges[sortedBridges.length - 1].key;
        }

        return {
            totalBridges: this.bridgeData.size,
            activeBridges: this.bridgeData.size, // All bridges are considered active
            seedKeys,
            oldestBridge,
            newestBridge
        };
    }
}
