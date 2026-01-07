/// <reference types="@epi-studio/moud-sdk" />
import { Logger } from '../utils/Logger';

export type WorldType = 'NORMAL' | 'NETHER' | 'THE_END' | 'SUPERFLAT' | 'AMPLIFIED';

export interface BiomeColumn {
    id: number;
    worldType: WorldType | null;
    baseBiome: string | null;
    surfaceBlock: string | null;
    stoneBlock: string | null;
    liquidBlock: string | null;
    treeLogs: string | null;
    treeLeaves: string | null;
    ores: string | null;
    unlocked: boolean;
}

export interface SynthesizerGrid {
    columns: BiomeColumn[];
    unlockedWorldTypes: Set<WorldType>;
}

export interface WorldTypeConfig {
    type: WorldType;
    requiredItem: string;
    maxBiomes: number;
    displayName: string;
}

export class VirtualGridController {
    private logger: Logger;
    private grid: SynthesizerGrid;
    private worldTypeConfigs: Map<WorldType, WorldTypeConfig>;

    constructor() {
        this.logger = new Logger('VirtualGridController');
        this.grid = this.initializeGrid();
        this.worldTypeConfigs = this.initializeWorldTypeConfigs();
    }

    /**
     * Initialize synthesizer grid with 5 columns
     */
    private initializeGrid(): SynthesizerGrid {
        const columns: BiomeColumn[] = [];
        
        // Create 5 columns (one for each world type)
        for (let i = 0; i < 5; i++) {
            columns.push({
                id: i,
                worldType: null,
                baseBiome: null,
                surfaceBlock: null,
                stoneBlock: null,
                liquidBlock: null,
                treeLogs: null,
                treeLeaves: null,
                ores: null,
                unlocked: false
            });
        }

        return {
            columns,
            unlockedWorldTypes: new Set()
        };
    }

    /**
     * Initialize world type configurations
     */
    private initializeWorldTypeConfigs(): Map<WorldType, WorldTypeConfig> {
        const configs = new Map<WorldType, WorldTypeConfig>();
        
        configs.set('NORMAL', {
            type: 'NORMAL',
            requiredItem: 'minecraft:emerald_block',
            maxBiomes: 4,
            displayName: 'Normal'
        });
        
        configs.set('NETHER', {
            type: 'NETHER',
            requiredItem: 'minecraft:ancient_debris',
            maxBiomes: 3,
            displayName: 'Nether'
        });
        
        configs.set('THE_END', {
            type: 'THE_END',
            requiredItem: 'minecraft:ender_eye',
            maxBiomes: 2,
            displayName: 'The End'
        });
        
        configs.set('SUPERFLAT', {
            type: 'SUPERFLAT',
            requiredItem: 'minecraft:diamond_block',
            maxBiomes: 1,
            displayName: 'Superflat'
        });
        
        configs.set('AMPLIFIED', {
            type: 'AMPLIFIED',
            requiredItem: 'minecraft:netherite_block',
            maxBiomes: 5,
            displayName: 'Amplified'
        });

        return configs;
    }

    /**
     * Try to place an item in a specific slot
     * @param columnId Column ID (0-4)
     * @param slotType Type of slot ('world_type', 'base_biome', 'surface_block', etc.)
     * @param itemId The item ID being placed
     * @returns True if placement was successful
     */
    public placeItem(columnId: number, slotType: string, itemId: string): boolean {
        if (columnId < 0 || columnId >= this.grid.columns.length) {
            this.logger.warn(`Invalid column ID: ${columnId}`);
            return false;
        }

        const column = this.grid.columns[columnId];

        switch (slotType) {
            case 'world_type':
                return this.placeWorldTypeItem(columnId, itemId);
            case 'base_biome':
                return this.placeBaseBiomeItem(columnId, itemId);
            case 'surface_block':
                return this.placeBlockItem(columnId, 'surfaceBlock', itemId);
            case 'stone_block':
                return this.placeBlockItem(columnId, 'stoneBlock', itemId);
            case 'liquid_block':
                return this.placeBlockItem(columnId, 'liquidBlock', itemId);
            case 'tree_logs':
                return this.placeBlockItem(columnId, 'treeLogs', itemId);
            case 'tree_leaves':
                return this.placeBlockItem(columnId, 'treeLeaves', itemId);
            case 'ores':
                return this.placeBlockItem(columnId, 'ores', itemId);
            default:
                this.logger.warn(`Unknown slot type: ${slotType}`);
                return false;
        }
    }

    /**
     * Place a world type item to unlock a column
     */
    private placeWorldTypeItem(columnId: number, itemId: string): boolean {
        // Find which world type this item unlocks
        let worldType: WorldType | null = null;
        
        for (const [type, config] of this.worldTypeConfigs.entries()) {
            if (config.requiredItem === itemId) {
                worldType = type;
                break;
            }
        }

        if (!worldType) {
            this.logger.warn(`Item ${itemId} does not unlock any world type`);
            return false;
        }

        // Check if this world type is already unlocked
        if (this.grid.unlockedWorldTypes.has(worldType)) {
            this.logger.warn(`World type ${worldType} is already unlocked`);
            return false;
        }

        // Check if we've exceeded max biomes for this world type
        const currentBiomes = this.grid.columns.filter(col => col.worldType === worldType && col.baseBiome !== null).length;
        const config = this.worldTypeConfigs.get(worldType)!;
        
        if (currentBiomes >= config.maxBiomes) {
            this.logger.warn(`World type ${worldType} already has maximum ${config.maxBiomes} biomes`);
            return false;
        }

        // Unlock the world type and column
        this.grid.columns[columnId].worldType = worldType;
        this.grid.columns[columnId].unlocked = true;
        this.grid.unlockedWorldTypes.add(worldType);

        this.logger.info(`Unlocked world type ${worldType} in column ${columnId}`);
        return true;
    }

    /**
     * Place a base biome item
     */
    private placeBaseBiomeItem(columnId: number, itemId: string): boolean {
        const column = this.grid.columns[columnId];
        
        if (!column.unlocked || !column.worldType) {
            this.logger.warn(`Column ${columnId} is not unlocked for base biome placement`);
            return false;
        }

        // Validate that this item corresponds to a valid biome for this world type
        if (!this.isValidBiomeForWorldType(itemId, column.worldType)) {
            this.logger.warn(`Item ${itemId} is not a valid biome for world type ${column.worldType}`);
            return false;
        }

        column.baseBiome = itemId;
        this.logger.info(`Set base biome ${itemId} for column ${columnId}`);
        return true;
    }

    /**
     * Place a block item in various slots
     */
    private placeBlockItem(columnId: number, property: keyof BiomeColumn, itemId: string): boolean {
        const column = this.grid.columns[columnId];
        
        if (!column.unlocked || !column.baseBiome) {
            this.logger.warn(`Column ${columnId} is not unlocked for block placement`);
            return false;
        }

        (column as any)[property] = itemId;
        this.logger.info(`Set ${property} to ${itemId} for column ${columnId}`);
        return true;
    }

    /**
     * Check if a biome item is valid for a world type
     */
    private isValidBiomeForWorldType(biomeItem: string, worldType: WorldType): boolean {
        // This would contain mappings of valid biomes for each world type
        // For now, accept all biome items
        return biomeItem.startsWith('minecraft:'); // Placeholder validation
    }

    /**
     * Get the current grid state
     */
    public getGrid(): SynthesizerGrid {
        return { ...this.grid };
    }

    /**
     * Get unlocked columns that have base biomes defined
     */
    public getDefinedBiomes(): BiomeColumn[] {
        return this.grid.columns.filter(col => col.unlocked && col.baseBiome !== null);
    }

    /**
     * Check if a specific slot is unlocked
     */
    public isSlotUnlocked(columnId: number, slotType: string): boolean {
        if (columnId < 0 || columnId >= this.grid.columns.length) {
            return false;
        }

        const column = this.grid.columns[columnId];
        
        switch (slotType) {
            case 'world_type':
                // World type slots are always unlocked, but only certain items work
                return true;
            case 'base_biome':
                // Base biome slot is unlocked if world type is set
                return column.unlocked && column.worldType !== null;
            default:
                // All other slots are unlocked if base biome is set
                return column.unlocked && column.baseBiome !== null;
        }
    }

    /**
     * Get world type configuration
     */
    public getWorldTypeConfig(worldType: WorldType): WorldTypeConfig | null {
        return this.worldTypeConfigs.get(worldType) || null;
    }

    /**
     * Get all world type configurations
     */
    public getAllWorldTypeConfigs(): Map<WorldType, WorldTypeConfig> {
        return new Map(this.worldTypeConfigs);
    }

    /**
     * Check if world type is unlocked
     */
    public isWorldTypeUnlocked(worldType: WorldType): boolean {
        return this.grid.unlockedWorldTypes.has(worldType);
    }

    /**
     * Get count of biomes for each world type
     */
    public getBiomeCounts(): Map<WorldType, number> {
        const counts = new Map<WorldType, number>();
        
        for (const worldType of this.worldTypeConfigs.keys()) {
            counts.set(worldType, 0);
        }
        
        for (const column of this.grid.columns) {
            if (column.baseBiome !== null && column.worldType) {
                const current = counts.get(column.worldType) || 0;
                counts.set(column.worldType, current + 1);
            }
        }
        
        return counts;
    }

    /**
     * Check if crafting is possible
     */
    public canCraft(): boolean {
        const definedBiomes = this.getDefinedBiomes();
        
        // At least one biome must be defined, or it's an empty world
        return definedBiomes.length > 0;
    }

    /**
     * Check if this will create an empty world
     */
    public willCreateEmptyWorld(): boolean {
        return this.getDefinedBiomes().length === 0;
    }

    /**
     * Reset the grid to initial state
     */
    public resetGrid(): void {
        this.grid = this.initializeGrid();
        this.logger.info('Grid reset to initial state');
    }

    /**
     * Get grid statistics
     */
    public getStatistics(): {
        totalColumns: number;
        unlockedColumns: number;
        definedBiomes: number;
        unlockedWorldTypes: WorldType[];
        biomeCounts: Map<WorldType, number>;
    } {
        const biomeCounts = this.getBiomeCounts();
        
        return {
            totalColumns: this.grid.columns.length,
            unlockedColumns: this.grid.columns.filter(col => col.unlocked).length,
            definedBiomes: this.getDefinedBiomes().length,
            unlockedWorldTypes: Array.from(this.grid.unlockedWorldTypes),
            biomeCounts
        };
    }
}
