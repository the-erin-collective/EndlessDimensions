/// <reference types="@epi-studio/moud-sdk" />
import { Logger } from '../utils/Logger';
import { BlockRegistry } from './BlockRegistry';

export interface ItemBlockMapping {
    itemId: string;
    blockId: string;
    category: 'block' | 'fluid' | 'ore' | 'world_type' | 'base_biome';
    validationRules?: {
        maxStack?: number;
        requiresContainer?: boolean;
    };
    unlocksWorldType?: string;
    biomeType?: string;
}

export class ItemBlockMapper {
    private logger: Logger;
    private blockRegistry: BlockRegistry;
    private itemToBlockMap: Map<string, ItemBlockMapping>;
    private specialMappings: Map<string, ItemBlockMapping>;

    constructor(blockRegistry: BlockRegistry) {
        this.logger = new Logger('ItemBlockMapper');
        this.blockRegistry = blockRegistry;
        this.itemToBlockMap = new Map();
        this.specialMappings = new Map();
        this.initializeMappings();
    }

    /**
     * Initialize the item-to-block mappings
     */
    private initializeMappings(): void {
        this.initializeBasicMappings();
        this.initializeSpecialMappings();
        this.logger.info(`Initialized ${this.itemToBlockMap.size} item-to-block mappings`);
    }

    /**
     * Initialize basic block mappings (items that directly correspond to blocks)
     */
    private initializeBasicMappings(): void {
        // Basic blocks
        this.addMapping('minecraft:stone', 'minecraft:stone', 'block');
        this.addMapping('minecraft:dirt', 'minecraft:dirt', 'block');
        this.addMapping('minecraft:grass_block', 'minecraft:grass_block', 'block');
        this.addMapping('minecraft:sand', 'minecraft:sand', 'block');
        this.addMapping('minecraft:gravel', 'minecraft:gravel', 'block');
        this.addMapping('minecraft:mycelium', 'minecraft:mycelium', 'block');

        // Wood blocks
        this.addMapping('minecraft:oak_planks', 'minecraft:oak_planks', 'block');
        this.addMapping('minecraft:spruce_planks', 'minecraft:spruce_planks', 'block');
        this.addMapping('minecraft:birch_planks', 'minecraft:birch_planks', 'block');
        this.addMapping('minecraft:jungle_planks', 'minecraft:jungle_planks', 'block');
        this.addMapping('minecraft:acacia_planks', 'minecraft:acacia_planks', 'block');
        this.addMapping('minecraft:dark_oak_planks', 'minecraft:dark_oak_planks', 'block');

        // Stone blocks
        this.addMapping('minecraft:cobblestone', 'minecraft:cobblestone', 'block');
        this.addMapping('minecraft:stone_bricks', 'minecraft:stone_bricks', 'block');
        this.addMapping('minecraft:mossy_cobblestone', 'minecraft:mossy_cobblestone', 'block');

        // Ore blocks
        this.addMapping('minecraft:coal_ore', 'minecraft:coal_ore', 'ore');
        this.addMapping('minecraft:iron_ore', 'minecraft:iron_ore', 'ore');
        this.addMapping('minecraft:gold_ore', 'minecraft:gold_ore', 'ore');
        this.addMapping('minecraft:diamond_ore', 'minecraft:diamond_ore', 'ore');
        this.addMapping('minecraft:emerald_ore', 'minecraft:emerald_ore', 'ore');
        this.addMapping('minecraft:lapis_ore', 'minecraft:lapis_ore', 'ore');
        this.addMapping('minecraft:redstone_ore', 'minecraft:redstone_ore', 'ore');
        this.addMapping('minecraft:copper_ore', 'minecraft:copper_ore', 'ore');

        // Block items (items that are also blocks)
        this.addMapping('minecraft:diamond_block', 'minecraft:diamond_block', 'block');
        this.addMapping('minecraft:gold_block', 'minecraft:gold_block', 'block');
        this.addMapping('minecraft:iron_block', 'minecraft:iron_block', 'block');
        this.addMapping('minecraft:emerald_block', 'minecraft:emerald_block', 'block');
        this.addMapping('minecraft:coal_block', 'minecraft:coal_block', 'block');
        this.addMapping('minecraft:lapis_block', 'minecraft:lapis_block', 'block');
        this.addMapping('minecraft:redstone_block', 'minecraft:redstone_block', 'block');
        this.addMapping('minecraft:copper_block', 'minecraft:copper_block', 'block');

        // Glass and decorative blocks
        this.addMapping('minecraft:glass', 'minecraft:glass', 'block');
        this.addMapping('minecraft:tinted_glass', 'minecraft:tinted_glass', 'block');
        this.addMapping('minecraft:ice', 'minecraft:ice', 'block');
        this.addMapping('minecraft:packed_ice', 'minecraft:packed_ice', 'block');
        this.addMapping('minecraft:blue_ice', 'minecraft:blue_ice', 'block');

        // Nether blocks
        this.addMapping('minecraft:netherrack', 'minecraft:netherrack', 'block');
        this.addMapping('minecraft:soul_sand', 'minecraft:soul_sand', 'block');
        this.addMapping('minecraft:soul_soil', 'minecraft:soul_soil', 'block');
        this.addMapping('minecraft:crimson_nylium', 'minecraft:crimson_nylium', 'block');
        this.addMapping('minecraft:warped_nylium', 'minecraft:warped_nylium', 'block');

        // End blocks
        this.addMapping('minecraft:end_stone', 'minecraft:end_stone', 'block');
        this.addMapping('minecraft:obsidian', 'minecraft:obsidian', 'block');
        this.addMapping('minecraft:crying_obsidian', 'minecraft:crying_obsidian', 'block');

        // Concrete and powder
        this.addMapping('minecraft:white_concrete', 'minecraft:white_concrete', 'block');
        this.addMapping('minecraft:white_concrete_powder', 'minecraft:white_concrete_powder', 'block');
        // Add all other concrete colors...
        this.addMapping('minecraft:terracotta', 'minecraft:terracotta', 'block');
        this.addMapping('minecraft:white_terracotta', 'minecraft:white_terracotta', 'block');
        // Add all other terracotta colors...
    }

    /**
     * Initialize special mappings for items that don't directly correspond to blocks
     */
    private initializeSpecialMappings(): void {
        // Fluid containers
        this.addSpecialMapping('minecraft:water_bucket', 'minecraft:water', 'fluid', {
            requiresContainer: true
        });
        this.addSpecialMapping('minecraft:lava_bucket', 'minecraft:lava', 'fluid', {
            requiresContainer: true
        });
        this.addSpecialMapping('minecraft:milk_bucket', 'minecraft:milk', 'fluid', {
            requiresContainer: true
        });

        // Special fluid sources
        this.addSpecialMapping('minecraft:powder_snow_bucket', 'minecraft:powder_snow', 'fluid', {
            requiresContainer: true
        });

        // Honey
        this.addSpecialMapping('minecraft:honey_bottle', 'minecraft:honey_block', 'fluid', {
            maxStack: 16
        });

        // Dragon's breath (special fluid)
        this.addSpecialMapping('minecraft:dragon_breath', 'minecraft:dragon_breath', 'fluid', {
            maxStack: 1
        });

        // World type unlocking items
        this.addSpecialMapping('minecraft:emerald_block', 'minecraft:emerald_block', 'world_type', {
            unlocksWorldType: 'NORMAL'
        });
        this.addSpecialMapping('minecraft:ancient_debris', 'minecraft:ancient_debris', 'world_type', {
            unlocksWorldType: 'NETHER'
        });
        this.addSpecialMapping('minecraft:ender_eye', 'minecraft:ender_eye', 'world_type', {
            unlocksWorldType: 'THE_END'
        });
        this.addSpecialMapping('minecraft:diamond_block', 'minecraft:diamond_block', 'world_type', {
            unlocksWorldType: 'SUPERFLAT'
        });
        this.addSpecialMapping('minecraft:netherite_block', 'minecraft:netherite_block', 'world_type', {
            unlocksWorldType: 'AMPLIFIED'
        });

        // Biome items (saplings, fungus, etc.)
        this.addSpecialMapping('minecraft:oak_sapling', 'minecraft:oak_sapling', 'base_biome', {
            biomeType: 'plains'
        });
        this.addSpecialMapping('minecraft:spruce_sapling', 'minecraft:spruce_sapling', 'base_biome', {
            biomeType: 'snowy_plains'
        });
        this.addSpecialMapping('minecraft:birch_sapling', 'minecraft:birch_sapling', 'base_biome', {
            biomeType: 'birch_forest'
        });
        this.addSpecialMapping('minecraft:jungle_sapling', 'minecraft:jungle_sapling', 'base_biome', {
            biomeType: 'jungle'
        });
        this.addSpecialMapping('minecraft:acacia_sapling', 'minecraft:acacia_sapling', 'base_biome', {
            biomeType: 'savanna'
        });
        this.addSpecialMapping('minecraft:dark_oak_sapling', 'minecraft:dark_oak_sapling', 'base_biome', {
            biomeType: 'dark_forest'
        });
        this.addSpecialMapping('minecraft:mangrove_propagule', 'minecraft:mangrove_propagule', 'base_biome', {
            biomeType: 'mangrove_swamp'
        });
        this.addSpecialMapping('minecraft:cherry_sapling', 'minecraft:cherry_sapling', 'base_biome', {
            biomeType: 'cherry_grove'
        });
        this.addSpecialMapping('minecraft:warped_fungus', 'minecraft:warped_fungus', 'base_biome', {
            biomeType: 'warped_forest'
        });
        this.addSpecialMapping('minecraft:crimson_fungus', 'minecraft:crimson_fungus', 'base_biome', {
            biomeType: 'crimson_forest'
        });
    }

    /**
     * Add a basic item-to-block mapping
     */
    private addMapping(itemId: string, blockId: string, category: 'block' | 'fluid' | 'ore'): void {
        this.itemToBlockMap.set(itemId, {
            itemId,
            blockId,
            category
        });
    }

    /**
     * Add a special mapping with validation rules
     */
    private addSpecialMapping(
        itemId: string, 
        blockId: string, 
        category: 'block' | 'fluid' | 'ore',
        validationRules?: ItemBlockMapping['validationRules']
    ): void {
        this.specialMappings.set(itemId, {
            itemId,
            blockId,
            category,
            validationRules
        });
    }

    /**
     * Map an item ID to its corresponding block ID
     * @param itemId The item ID to map
     * @returns The corresponding block ID, or null if not found
     */
    public mapItemToBlock(itemId: string): string | null {
        // Check basic mappings first
        const basicMapping = this.itemToBlockMap.get(itemId);
        if (basicMapping) {
            return basicMapping.blockId;
        }

        // Check special mappings
        const specialMapping = this.specialMappings.get(itemId);
        if (specialMapping) {
            return specialMapping.blockId;
        }

        // Try to infer mapping for unknown items
        const inferredBlock = this.inferBlockMapping(itemId);
        if (inferredBlock) {
            return inferredBlock;
        }

        this.logger.warn(`No block mapping found for item: ${itemId}`);
        return null;
    }

    /**
     * Try to infer block mapping for unknown items
     */
    private inferBlockMapping(itemId: string): string | null {
        // If the item ID is already a block ID, return it
        if (this.blockRegistry.isBlockSafe(itemId)) {
            this.logger.debug(`Inferred block mapping for ${itemId}: ${itemId}`);
            return itemId;
        }

        // Try removing item suffixes
        const blockInferred = itemId.replace(/_item$/, '').replace(/_ingot$/, '').replace(/_nugget$/, '');
        if (this.blockRegistry.isBlockSafe(blockInferred)) {
            this.logger.debug(`Inferred block mapping for ${itemId}: ${blockInferred}`);
            return blockInferred;
        }

        return null;
    }

    /**
     * Get the category of an item (block, fluid, or ore)
     */
    public getItemCategory(itemId: string): 'block' | 'fluid' | 'ore' | null {
        const basicMapping = this.itemToBlockMap.get(itemId);
        if (basicMapping) {
            return basicMapping.category;
        }

        const specialMapping = this.specialMappings.get(itemId);
        if (specialMapping) {
            return specialMapping.category;
        }

        return null;
    }

    /**
     * Check if an item is a fluid
     */
    public isFluidItem(itemId: string): boolean {
        return this.getItemCategory(itemId) === 'fluid';
    }

    /**
     * Check if an item is an ore
     */
    public isOreItem(itemId: string): boolean {
        return this.getItemCategory(itemId) === 'ore';
    }

    /**
     * Check if an item is a regular block
     */
    public isBlockItem(itemId: string): boolean {
        return this.getItemCategory(itemId) === 'block';
    }

    /**
     * Get validation rules for an item
     */
    public getValidationRules(itemId: string): ItemBlockMapping['validationRules'] | null {
        const specialMapping = this.specialMappings.get(itemId);
        return specialMapping?.validationRules || null;
    }

    /**
     * Get all mappings for debugging
     */
    public getAllMappings(): { basic: Map<string, ItemBlockMapping>, special: Map<string, ItemBlockMapping> } {
        return {
            basic: new Map(this.itemToBlockMap),
            special: new Map(this.specialMappings)
        };
    }

    /**
     * Add a custom mapping at runtime
     */
    public addCustomMapping(
        itemId: string, 
        blockId: string, 
        category: 'block' | 'fluid' | 'ore',
        validationRules?: ItemBlockMapping['validationRules']
    ): void {
        if (validationRules) {
            this.addSpecialMapping(itemId, blockId, category, validationRules);
        } else {
            this.addMapping(itemId, blockId, category);
}

/**
 * Add a basic item-to-block mapping
 */
private addMapping(itemId: string, blockId: string, category: 'block' | 'fluid' | 'ore'): void {
    this.itemToBlockMap.set(itemId, {
        itemId,
        blockId,
        category
    });
}

/**
 * Add a special mapping with validation rules
 */
private addSpecialMapping(
    itemId: string, 
    blockId: string, 
    category: 'block' | 'fluid' | 'ore' | 'world_type' | 'base_biome',
    validationRules?: ItemBlockMapping['validationRules']
): void {
    this.specialMappings.set(itemId, {
        itemId,
        blockId,
        category,
        validationRules
    });
}

/**
 * Map an item ID to its corresponding block ID
 * @param itemId The item ID to map
 * @returns The corresponding block ID, or null if not found
 */
public mapItemToBlock(itemId: string): string | null {
    // Check basic mappings first
    const basicMapping = this.itemToBlockMap.get(itemId);
    if (basicMapping) {
        return basicMapping.blockId;
    }

    // Check special mappings
    const specialMapping = this.specialMappings.get(itemId);
    if (specialMapping) {
        return specialMapping.blockId;
    }

    // Try to infer mapping for unknown items
    const inferredBlock = this.inferBlockMapping(itemId);
    if (inferredBlock) {
        return inferredBlock;
    }

    this.logger.warn(`No block mapping found for item: ${itemId}`);
    return null;
}

/**
 * Try to infer block mapping for unknown items
 */
private inferBlockMapping(itemId: string): string | null {
    // If the item ID is already a block ID, return it
    if (this.blockRegistry.isBlockSafe(itemId)) {
        this.logger.debug(`Inferred block mapping for ${itemId}: ${itemId}`);
        return itemId;
    }

    // Try removing item suffixes
    const blockInferred = itemId.replace(/_item$/, '').replace(/_ingot$/, '').replace(/_nugget$/, '');
    if (this.blockRegistry.isBlockSafe(blockInferred)) {
        this.logger.debug(`Inferred block mapping for ${itemId}: ${blockInferred}`);
        return blockInferred;
    }

    return null;
}

/**
 * Get the category of an item (block, fluid, or ore)
 */
public getItemCategory(itemId: string): 'block' | 'fluid' | 'ore' | 'world_type' | 'base_biome' | null {
    const basicMapping = this.itemToBlockMap.get(itemId);
    if (basicMapping) {
        return basicMapping.category;
    }

    const specialMapping = this.specialMappings.get(itemId);
    if (specialMapping) {
        return specialMapping.category;
    }

    return null;
}

/**
 * Check if an item is a fluid
 */
public isFluidItem(itemId: string): boolean {
    return this.getItemCategory(itemId) === 'fluid';
}

/**
 * Check if an item is an ore
 */
public isOreItem(itemId: string): boolean {
    return this.getItemCategory(itemId) === 'ore';
}

/**
 * Check if an item is a regular block
 */
public isBlockItem(itemId: string): boolean {
    return this.getItemCategory(itemId) === 'block';
}

/**
 * Check if an item is a world type unlocker
 */
public isWorldTypeItem(itemId: string): boolean {
    return this.getItemCategory(itemId) === 'world_type';
}

/**
 * Check if an item is a base biome item
 */
public isBaseBiomeItem(itemId: string): boolean {
    return this.getItemCategory(itemId) === 'base_biome';
}

/**
 * Get validation rules for an item
 */
public getValidationRules(itemId: string): ItemBlockMapping['validationRules'] | null {
    const specialMapping = this.specialMappings.get(itemId);
    return specialMapping?.validationRules || null;
}

/**
 * Get the world type that an item unlocks
 */
public getUnlockedWorldType(itemId: string): string | null {
    const mapping = this.specialMappings.get(itemId);
    return mapping?.unlocksWorldType || null;
}

/**
 * Get the biome type for a base biome item
 */
public getBiomeType(itemId: string): string | null {
    const mapping = this.specialMappings.get(itemId);
    return mapping?.biomeType || null;
}

/**
 * Get all mappings for debugging
 */
public getAllMappings(): { basic: Map<string, ItemBlockMapping>, special: Map<string, ItemBlockMapping> } {
    return {
        basic: new Map(this.itemToBlockMap),
        special: new Map(this.specialMappings)
    };
}

/**
 * Add a custom mapping at runtime
 */
public addCustomMapping(
    itemId: string, 
    blockId: string, 
    category: 'block' | 'fluid' | 'ore' | 'world_type' | 'base_biome',
    validationRules?: ItemBlockMapping['validationRules']
): void {
    if (validationRules) {
        this.addSpecialMapping(itemId, blockId, category, validationRules);
    } else {
        this.addMapping(itemId, blockId, category);
    }
    this.logger.info(`Added custom mapping: ${itemId} -> ${blockId} (${category})`);
}

/**
 * Get statistics about the mapper
 */
public getStatistics(): {
    totalMappings: number;
    basicMappings: number;
    specialMappings: number;
    categories: { block: number; fluid: number; ore: number; world_type: number; base_biome: number };
} {
    const categories = { block: 0, fluid: 0, ore: 0, world_type: 0, base_biome: 0 };
    
    // Count basic mappings by category
    for (const mapping of this.itemToBlockMap.values()) {
        categories[mapping.category]++;
    }
    
    // Count special mappings by category
    for (const mapping of this.specialMappings.values()) {
        categories[mapping.category]++;
    }

    return {
        totalMappings: this.itemToBlockMap.size + this.specialMappings.size,
        basicMappings: this.itemToBlockMap.size,
        specialMappings: this.specialMappings.size,
        categories
    };
}

/**
 * Get all world type unlocker items
 */
public getWorldTypeItems(): Map<string, string> {
    const worldTypeItems = new Map<string, string>();
    
    for (const [itemId, mapping] of this.specialMappings.entries()) {
        if (mapping.category === 'world_type' && mapping.unlocksWorldType) {
            worldTypeItems.set(itemId, mapping.unlocksWorldType);
        }
    }
    
    return worldTypeItems;
}

/**
 * Get all base biome items
 */
public getBaseBiomeItems(): Map<string, string> {
    const baseBiomeItems = new Map<string, string>();
    
    for (const [itemId, mapping] of this.specialMappings.entries()) {
        if (mapping.category === 'base_biome' && mapping.biomeType) {
            baseBiomeItems.set(itemId, mapping.biomeType);
        }
    }
    
    return baseBiomeItems;
}
}
