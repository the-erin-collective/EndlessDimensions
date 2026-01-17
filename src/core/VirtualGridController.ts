/// <reference types="@epi-studio/moud-sdk" />
import { Logger } from '../utils/Logger';

export type WorldType = 'NORMAL' | 'NETHER' | 'THE_END' | 'SUPERFLAT' | 'AMPLIFIED';

export interface BiomeColumn {
    id: number;
    baseBiome: string | null;
    surfaceBlock: string | null;
    stoneBlock: string | null;
    liquidBlock: string | null;
    treeLogs: string | null;
    treeLeaves: string | null;
    ores: string | null;
    enabled: boolean;
    unlocked: boolean;
    // When true + slot is null, use random block during generation
    randomizeSurface: boolean;
    randomizeStone: boolean;
    randomizeLiquid: boolean;
    randomizeLogs: boolean;
    randomizeLeaves: boolean;
    randomizeOres: boolean;
    worldType?: string;
}

export interface SynthesizerGrid {
    worldType: WorldType | null;
    worldTypeCount: number;
    columns: BiomeColumn[];
}

export interface WorldTypeConfig {
    type: WorldType;
    requiredItem: string;
    displayName: string;
}

export class VirtualGridController {
    private static readonly MAX_BIOMES = 4;
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

        // Create 4 biome slots (unlocked by world type count)
        for (let i = 0; i < VirtualGridController.MAX_BIOMES; i++) {
            columns.push({
                id: i,
                baseBiome: null,
                surfaceBlock: null,
                stoneBlock: null,
                liquidBlock: null,
                treeLogs: null,
                treeLeaves: null,
                ores: null,
                enabled: false,
                unlocked: false,
                // Default to randomize when slot is empty
                randomizeSurface: true,
                randomizeStone: true,
                randomizeLiquid: true,
                randomizeLogs: true,
                randomizeLeaves: true,
                randomizeOres: true
            });
        }

        return {
            worldType: null,
            worldTypeCount: 0,
            columns
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
            displayName: 'Normal'
        });

        configs.set('NETHER', {
            type: 'NETHER',
            requiredItem: 'minecraft:ancient_debris',
            displayName: 'Nether'
        });

        configs.set('THE_END', {
            type: 'THE_END',
            requiredItem: 'minecraft:ender_eye',
            displayName: 'The End'
        });

        configs.set('SUPERFLAT', {
            type: 'SUPERFLAT',
            requiredItem: 'minecraft:diamond_block',
            displayName: 'Superflat'
        });

        configs.set('AMPLIFIED', {
            type: 'AMPLIFIED',
            requiredItem: 'minecraft:netherite_block',
            displayName: 'Amplified'
        });

        return configs;
    }

    /**
     * Try to place an item in a specific slot
     * @param columnId Column ID (0-4)
     * @param slotType Type of slot ('world_type', 'base_biome', 'surface_block', etc.)
     * @param itemId The item ID being placed
     * @param count Stack size for world type items
     * @returns True if placement was successful
     */
    public placeItem(columnId: number, slotType: string, itemId: string, count: number = 1): boolean {
        if (slotType !== 'world_type' && (columnId < 0 || columnId >= this.grid.columns.length)) {
            this.logger.warn(`Invalid column ID: ${columnId}`);
            return false;
        }

        switch (slotType) {
            case 'world_type':
                return this.placeWorldTypeItem(itemId, count);
            case 'biome_power':
                return this.placeBiomePowerItem(columnId, itemId);
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
     * Place a world type item to unlock biome slots
     */
    private placeWorldTypeItem(itemId: string, count: number): boolean {
        if (!itemId) {
            this.grid.worldType = null;
            this.grid.worldTypeCount = 0;
            this.lockAllColumns();
            this.logger.info('Cleared world type selection');
            return true;
        }

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

        const previousWorldType = this.grid.worldType;
        const requestedCount = Math.max(1, Math.min(count, VirtualGridController.MAX_BIOMES));
        this.grid.worldType = worldType;
        this.grid.worldTypeCount = requestedCount;

        this.applyWorldTypeUnlocks();
        this.logger.info(`Set world type ${worldType} with ${requestedCount} biome slot(s)`);

        if (previousWorldType && previousWorldType !== worldType) {
            this.logger.info(`World type changed from ${previousWorldType} to ${worldType}`);
        }
        return true;
    }

    /**
     * Place a base biome item
     */
    private placeBaseBiomeItem(columnId: number, itemId: string): boolean {
        const column = this.grid.columns[columnId];

        if (!column.unlocked || !this.grid.worldType) {
            this.logger.warn(`Column ${columnId} is not unlocked for base biome placement`);
            return false;
        }

        // Validate that this item corresponds to a valid biome for this world type
        if (!this.isValidBiomeForWorldType(itemId, this.grid.worldType)) {
            this.logger.warn(`Item ${itemId} is not a valid biome for world type ${this.grid.worldType}`);
            return false;
        }

        if (!itemId) {
            column.baseBiome = null;
            column.enabled = false;
            this.clearPaletteOverrides(column);
            return true;
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

        if (!column.unlocked || !column.baseBiome || !column.enabled) {
            this.logger.warn(`Column ${columnId} is not unlocked for block placement`);
            return false;
        }

        (column as any)[property] = itemId;

        // When a block is explicitly placed, disable randomization for that slot
        if (itemId) {
            switch (property) {
                case 'surfaceBlock': column.randomizeSurface = false; break;
                case 'stoneBlock': column.randomizeStone = false; break;
                case 'liquidBlock': column.randomizeLiquid = false; break;
                case 'treeLogs': column.randomizeLogs = false; break;
                case 'treeLeaves': column.randomizeLeaves = false; break;
                case 'ores': column.randomizeOres = false; break;
            }
        } else {
            // When slot is cleared, re-enable randomization
            switch (property) {
                case 'surfaceBlock': column.randomizeSurface = true; break;
                case 'stoneBlock': column.randomizeStone = true; break;
                case 'liquidBlock': column.randomizeLiquid = true; break;
                case 'treeLogs': column.randomizeLogs = true; break;
                case 'treeLeaves': column.randomizeLeaves = true; break;
                case 'ores': column.randomizeOres = true; break;
            }
        }

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
     * Place or clear a biome power item (redstone block)
     */
    private placeBiomePowerItem(columnId: number, itemId: string): boolean {
        const column = this.grid.columns[columnId];
        if (!column.unlocked || !column.baseBiome) {
            this.logger.warn(`Column ${columnId} is not unlocked for biome power placement`);
            return false;
        }

        if (!itemId) {
            column.enabled = false;
            return true;
        }

        if (itemId !== 'minecraft:redstone_block') {
            this.logger.warn(`Item ${itemId} does not power biome slots`);
            return false;
        }

        column.enabled = true;
        return true;
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
        return this.grid.columns.filter(col => col.unlocked && col.enabled && col.baseBiome !== null);
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
            case 'biome_power':
                return column.unlocked && this.grid.worldType !== null && column.baseBiome !== null;
            case 'base_biome':
                // Base biome slot is unlocked if world type is set
                return column.unlocked && this.grid.worldType !== null;
            default:
                // All other slots are unlocked if biome is powered
                return column.unlocked && column.enabled && column.baseBiome !== null;
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
        return this.grid.worldType === worldType;
    }

    /**
     * Get count of biomes for each world type
     */
    public getBiomeCounts(): Map<WorldType, number> {
        const counts = new Map<WorldType, number>();

        for (const worldType of this.worldTypeConfigs.keys()) {
            counts.set(worldType, 0);
        }

        if (this.grid.worldType) {
            const current = counts.get(this.grid.worldType) || 0;
            counts.set(this.grid.worldType, current + this.getDefinedBiomes().length);
        }

        return counts;
    }

    /**
     * Check if crafting is possible
     */
    public canCraft(): boolean {
        const definedBiomes = this.getDefinedBiomes();
        return this.grid.worldType !== null && definedBiomes.length > 0;
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
            unlockedWorldTypes: this.grid.worldType ? [this.grid.worldType] : [],
            biomeCounts
        };
    }

    public isColumnUnlocked(columnId: number): boolean {
        const column = this.grid.columns[columnId];
        return !!column && column.unlocked;
    }

    public updateColumn(columnId: number, updates: Partial<BiomeColumn>): boolean {
        const column = this.grid.columns[columnId];
        if (!column) {
            return false;
        }
        Object.assign(column, updates);
        return true;
    }

    public updatePowerLevel(powerLevel: number): void {
        const count = Math.max(0, Math.min(Math.floor(powerLevel), VirtualGridController.MAX_BIOMES));
        this.grid.worldTypeCount = count;
        this.applyWorldTypeUnlocks();
    }

    private applyWorldTypeUnlocks(): void {
        const unlockedCount = this.grid.worldType ? this.grid.worldTypeCount : 0;
        for (let i = 0; i < this.grid.columns.length; i++) {
            const column = this.grid.columns[i];
            if (i < unlockedCount) {
                column.unlocked = true;
            } else {
                column.unlocked = false;
                column.enabled = false;
                column.baseBiome = null;
                this.clearPaletteOverrides(column);
            }
        }
    }

    private lockAllColumns(): void {
        for (const column of this.grid.columns) {
            column.unlocked = false;
            column.enabled = false;
            column.baseBiome = null;
            this.clearPaletteOverrides(column);
        }
    }

    private clearPaletteOverrides(column: BiomeColumn): void {
        column.surfaceBlock = null;
        column.stoneBlock = null;
        column.liquidBlock = null;
        column.treeLogs = null;
        column.treeLeaves = null;
        column.ores = null;
        // Reset randomization flags to true when clearing
        column.randomizeSurface = true;
        column.randomizeStone = true;
        column.randomizeLiquid = true;
        column.randomizeLogs = true;
        column.randomizeLeaves = true;
        column.randomizeOres = true;
    }
}
