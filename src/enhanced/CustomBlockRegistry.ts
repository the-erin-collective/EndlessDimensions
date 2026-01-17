import { Logger } from '../utils/Logger';
import { DimensionConfig } from '../types/DimensionConfig';

// Type definitions for custom block registry
interface CustomBlockConfig {
    id: string;
    name: string;
    namespace: string;
    material: BlockMaterial;
    properties: BlockProperties;
    drops: BlockDrop;
    sounds: BlockSounds;
    states: BlockState[];
    model: BlockModel;
    textures: BlockTextures;
}

interface BlockMaterial {
    hardness: number;
    resistance: number;
    light_level: number;
    slipperiness: number;
    jump_factor: number;
    requires_tool: boolean;
    tool_type?: 'pickaxe' | 'axe' | 'shovel' | 'hoe';
    tool_level?: 'wood' | 'stone' | 'iron' | 'gold' | 'diamond';
}

interface BlockProperties {
    transparent: boolean;
    luminous: boolean;
    gravity: boolean;
    waterlogged: boolean;
    climbable: boolean;
    solid: boolean;
    replaceable: boolean;
    can_place_on: string[];
    can_break: string[];
}

interface BlockDrop {
    type: 'self' | 'item' | 'table' | 'empty';
    item?: string;
    count?: number;
    experience?: number;
    silk_touch?: boolean;
}

interface BlockSounds {
    break: string;
    step: string;
    place: string;
    hit: string;
    fall: string;
}

interface BlockState {
    name: string;
    values: string[];
    default: string;
}

interface BlockModel {
    type: 'full' | 'cross' | 'tinted_cross' | 'crop' | 'door' | 'slab' | 'stairs' | 'fence' | 'wall' | 'pane';
    variants?: { [key: string]: any };
    multipart?: any[];
}

interface BlockTextures {
    all?: string;
    side?: string;
    top?: string;
    bottom?: string;
    front?: string;
    back?: string;
    particle?: string;
}

interface DimensionBlockProfile {
    dimensionId: string;
    customBlocks: CustomBlockConfig[];
    blockVariants: Map<string, string[]>;
    oreBlocks: CustomBlockConfig[];
    decorativeBlocks: CustomBlockConfig[];
    utilityBlocks: CustomBlockConfig[];
}

/**
 * Custom Block Registry - Dynamic block generation and registration
 * Creates dimension-specific blocks with unique properties and behaviors
 */
export class CustomBlockRegistry {
    private logger: Logger;
    private namespace: string;
    private customBlocks: Map<string, CustomBlockConfig> = new Map();
    private dimensionProfiles: Map<string, DimensionBlockProfile> = new Map();
    private blockCounter: number = 0;

    constructor(namespace: string = 'endlessdimensions') {
        this.logger = new Logger('CustomBlockRegistry');
        this.namespace = namespace;
    }

    /**
     * Generate custom blocks for a dimension
     */
    public generateDimensionBlocks(dimensionConfig: DimensionConfig, seed: number): DimensionBlockProfile {
        try {
            this.logger.info(`Generating custom blocks for dimension: ${dimensionConfig.id}`);
            
            const random = this.createSeededRandom(seed);
            
            // Generate custom blocks
            const customBlocks = this.generateCustomBlocks(dimensionConfig, random);
            
            // Generate block variants
            const blockVariants = this.generateBlockVariants(dimensionConfig, random);
            
            // Generate ore blocks
            const oreBlocks = this.generateOreBlocks(dimensionConfig, random);
            
            // Generate decorative blocks
            const decorativeBlocks = this.generateDecorativeBlocks(dimensionConfig, random);
            
            // Generate utility blocks
            const utilityBlocks = this.generateUtilityBlocks(dimensionConfig, random);
            
            const profile: DimensionBlockProfile = {
                dimensionId: dimensionConfig.id,
                customBlocks,
                blockVariants,
                oreBlocks,
                decorativeBlocks,
                utilityBlocks
            };
            
            // Store profile
            this.dimensionProfiles.set(dimensionConfig.id, profile);
            
            this.logger.info(`Generated custom blocks for dimension ${dimensionConfig.id}`);
            return profile;
            
        } catch (error) {
            this.logger.error(`Failed to generate custom blocks for dimension ${dimensionConfig.id}:`, error);
            throw error;
        }
    }

    /**
     * Generate custom blocks
     */
    private generateCustomBlocks(dimensionConfig: DimensionConfig, random: () => number): CustomBlockConfig[] {
        const blocks: CustomBlockConfig[] = [];
        const blockCount = Math.floor(random() * 5) + 3; // 3-7 custom blocks
        
        for (let i = 0; i < blockCount; i++) {
            const blockType = this.selectBlockType(random, dimensionConfig);
            const block = this.createCustomBlock(blockType, dimensionConfig, random);
            blocks.push(block);
            this.customBlocks.set(block.id, block);
        }
        
        return blocks;
    }

    /**
     * Select block type based on dimension
     */
    private selectBlockType(random: () => number, dimensionConfig: DimensionConfig): string {
        const blockTypes = this.getBlockTypes(dimensionConfig);
        return blockTypes[Math.floor(random() * blockTypes.length)];
    }

    /**
     * Get block types based on dimension
     */
    private getBlockTypes(dimensionConfig: DimensionConfig): string[] {
        switch (dimensionConfig.generatorType) {
            case 'the_end':
                return ['end_stone', 'crystal', 'purpur', 'obsidian', 'end_wood'];
            case 'nether':
                return ['netherrack', 'soul_stone', 'basalt', 'nether_ore', 'nether_wood'];
            case 'void':
                return ['void_stone', 'shadow_block', 'empty_block', 'crystal_block'];
            case 'floating_islands':
                return ['cloud_block', 'sky_stone', 'air_crystal', 'floating_wood'];
            case 'flat':
                return ['smooth_stone', 'packed_dirt', 'flat_wood', 'simple_ore'];
            case 'noise':
            default:
                return ['mystic_stone', 'ancient_rock', 'crystal_ore', 'magic_wood'];
        }
    }

    /**
     * Create custom block
     */
    private createCustomBlock(blockType: string, dimensionConfig: DimensionConfig, random: () => number): CustomBlockConfig {
        const blockId = `${this.namespace}:${blockType}_${this.getNextBlockId()}`;
        const blockName = this.generateBlockName(blockType, dimensionConfig);
        
        return {
            id: blockId,
            name: blockName,
            namespace: this.namespace,
            material: this.generateBlockMaterial(blockType, random, dimensionConfig),
            properties: this.generateBlockProperties(blockType, random, dimensionConfig),
            drops: this.generateBlockDrops(blockType, random),
            sounds: this.generateBlockSounds(blockType, dimensionConfig),
            states: this.generateBlockStates(blockType, random),
            model: this.generateBlockModel(blockType, random),
            textures: this.generateBlockTextures(blockType, dimensionConfig, random)
        };
    }

    /**
     * Generate block name
     */
    private generateBlockName(blockType: string, dimensionConfig: DimensionConfig): string {
        const prefixes = ['Mystic', 'Ancient', 'Ethereal', 'Celestial', 'Shadow', 'Crystal', 'Void', 'Sky', 'Cloud', 'Sacred'];
        const suffixes = ['Stone', 'Rock', 'Block', 'Crystal', 'Ore', 'Wood', 'Metal', 'Gem', 'Shard', 'Fragment'];
        
        const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
        
        return `${prefix} ${suffix}`;
    }

    /**
     * Generate block material properties
     */
    private generateBlockMaterial(blockType: string, random: () => number, dimensionConfig: DimensionConfig): BlockMaterial {
        const baseMaterials: { [key: string]: Partial<BlockMaterial> } = {
            'end_stone': { hardness: 3.0, resistance: 15.0, requires_tool: true, tool_type: 'pickaxe', tool_level: 'wood' },
            'crystal': { hardness: 2.0, resistance: 10.0, light_level: 8, requires_tool: true, tool_type: 'pickaxe', tool_level: 'iron' },
            'purpur': { hardness: 1.5, resistance: 6.5, requires_tool: true, tool_type: 'pickaxe', tool_level: 'wood' },
            'obsidian': { hardness: 50.0, resistance: 1200.0, requires_tool: true, tool_type: 'pickaxe', tool_level: 'diamond' },
            'netherrack': { hardness: 0.4, resistance: 2.0, requires_tool: true, tool_type: 'pickaxe', tool_level: 'wood' },
            'soul_stone': { hardness: 1.0, resistance: 5.0, light_level: 4, requires_tool: true, tool_type: 'pickaxe', tool_level: 'wood' },
            'basalt': { hardness: 1.25, resistance: 4.2, requires_tool: true, tool_type: 'pickaxe', tool_level: 'wood' },
            'void_stone': { hardness: 5.0, resistance: 25.0, requires_tool: true, tool_type: 'pickaxe', tool_level: 'stone' },
            'cloud_block': { hardness: 0.1, resistance: 0.1, requires_tool: false, slipperiness: 0.98 },
            'sky_stone': { hardness: 2.5, resistance: 12.0, requires_tool: true, tool_type: 'pickaxe', tool_level: 'stone' },
            'mystic_stone': { hardness: 3.5, resistance: 18.0, light_level: 2, requires_tool: true, tool_type: 'pickaxe', tool_level: 'iron' }
        };
        
        const base = baseMaterials[blockType] || baseMaterials['mystic_stone'];
        
        return {
            hardness: base.hardness || 2.0,
            resistance: base.resistance || 10.0,
            light_level: base.light_level || 0,
            slipperiness: base.slipperiness || 0.6,
            jump_factor: base.jump_factor || 1.0,
            requires_tool: base.requires_tool || false,
            tool_type: base.tool_type,
            tool_level: base.tool_level
        };
    }

    /**
     * Generate block properties
     */
    private generateBlockProperties(blockType: string, random: () => number, dimensionConfig: DimensionConfig): BlockProperties {
        const baseProperties: { [key: string]: Partial<BlockProperties> } = {
            'crystal': { transparent: true, luminous: true, solid: false },
            'cloud_block': { transparent: true, gravity: false, solid: false, replaceable: true },
            'void_stone': { transparent: false, luminous: true, solid: true },
            'sky_stone': { transparent: false, solid: true },
            'end_wood': { transparent: false, solid: true }
        };
        
        const base = baseProperties[blockType] || {};
        
        return {
            transparent: base.transparent || false,
            luminous: base.luminous || false,
            gravity: base.gravity || false,
            waterlogged: base.waterlogged || false,
            climbable: base.climbable || false,
            solid: base.solid || true,
            replaceable: base.replaceable || false,
            can_place_on: base.can_place_on || [],
            can_break: base.can_break || []
        };
    }

    /**
     * Generate block drops
     */
    private generateBlockDrops(blockType: string, random: () => number): BlockDrop {
        const dropTypes: { [key: string]: BlockDrop } = {
            'crystal': { type: 'item', count: 1, experience: 1, silk_touch: true },
            'ore': { type: 'item', count: 1, experience: 2, silk_touch: true },
            'stone': { type: 'self', experience: 0 },
            'wood': { type: 'self', experience: 0 }
        };
        
        return dropTypes[blockType.includes('ore') ? 'ore' : blockType.includes('wood') ? 'wood' : 'stone'];
    }

    /**
     * Generate block sounds
     */
    private generateBlockSounds(blockType: string, dimensionConfig: DimensionConfig): BlockSounds {
        const soundSets: { [key: string]: BlockSounds } = {
            'end_stone': { break: 'block.stone.break', step: 'block.stone.step', place: 'block.stone.place', hit: 'block.stone.hit', fall: 'block.stone.fall' },
            'crystal': { break: 'block.glass.break', step: 'block.glass.step', place: 'block.glass.place', hit: 'block.glass.hit', fall: 'block.glass.fall' },
            'netherrack': { break: 'block.netherrack.break', step: 'block.netherrack.step', place: 'block.netherrack.place', hit: 'block.netherrack.hit', fall: 'block.netherrack.fall' },
            'void_stone': { break: 'block.deepslate.break', step: 'block.deepslate.step', place: 'block.deepslate.place', hit: 'block.deepslate.hit', fall: 'block.deepslate.fall' },
            'cloud_block': { break: 'block.wool.break', step: 'block.wool.step', place: 'block.wool.place', hit: 'block.wool.hit', fall: 'block.wool.fall' }
        };
        
        return soundSets[blockType] || soundSets['end_stone'];
    }

    /**
     * Generate block states
     */
    private generateBlockStates(blockType: string, random: () => number): BlockState[] {
        const states: BlockState[] = [];
        
        // Add common states based on block type
        if (blockType.includes('wood') || blockType.includes('log')) {
            states.push({
                name: 'axis',
                values: ['x', 'y', 'z'],
                default: 'y'
            });
        }
        
        if (blockType.includes('slab')) {
            states.push({
                name: 'type',
                values: ['bottom', 'top', 'double'],
                default: 'bottom'
            });
        }
        
        if (blockType.includes('stairs')) {
            states.push({
                name: 'facing',
                values: ['north', 'south', 'east', 'west'],
                default: 'north'
            });
            states.push({
                name: 'half',
                values: ['bottom', 'top'],
                default: 'bottom'
            });
        }
        
        return states;
    }

    /**
     * Generate block model
     */
    private generateBlockModel(blockType: string, random: () => number): BlockModel {
        const modelTypes: { [key: string]: BlockModel['type'] } = {
            'crystal': 'cross',
            'ore': 'full',
            'stone': 'full',
            'wood': 'full',
            'slab': 'slab',
            'stairs': 'stairs',
            'fence': 'fence',
            'wall': 'wall'
        };
        
        const type = modelTypes[blockType] || 'full';
        
        return {
            type,
            variants: type === 'full' ? { '': { model: `${this.namespace}:block/${blockType}` } } : undefined,
            multipart: type !== 'full' ? undefined : undefined
        };
    }

    /**
     * Generate block textures
     */
    private generateBlockTextures(blockType: string, dimensionConfig: DimensionConfig, random: () => number): BlockTextures {
        const baseTexture = `${this.namespace}:block/${blockType}`;
        
        return {
            all: baseTexture,
            particle: baseTexture,
            ...(blockType.includes('wood') && {
                side: `${baseTexture}_side`,
                top: `${baseTexture}_top`,
                bottom: `${baseTexture}_bottom`
            }),
            ...(blockType.includes('ore') && {
                all: `${baseTexture}_stone`,
                particle: `${baseTexture}_stone`
            })
        };
    }

    /**
     * Generate block variants
     */
    private generateBlockVariants(dimensionConfig: DimensionConfig, random: () => number): Map<string, string[]> {
        const variants = new Map<string, string[]>();
        
        // Generate variants for existing blocks
        const variantTypes = ['stone', 'dirt', 'grass_block', 'sand', 'gravel'];
        
        for (const variantType of variantTypes) {
            const variantCount = Math.floor(random() * 3) + 1; // 1-3 variants
            const variantList: string[] = [];
            
            for (let i = 0; i < variantCount; i++) {
                const variantId = `${this.namespace}:${variantType}_${dimensionConfig.id}_${i}`;
                variantList.push(variantId);
                
                // Create variant block config
                const variantBlock = this.createVariantBlock(variantType, variantId, dimensionConfig, random);
                this.customBlocks.set(variantId, variantBlock);
            }
            
            variants.set(variantType, variantList);
        }
        
        return variants;
    }

    /**
     * Create variant block
     */
    private createVariantBlock(baseType: string, variantId: string, dimensionConfig: DimensionConfig, random: () => number): CustomBlockConfig {
        return {
            id: variantId,
            name: `${dimensionConfig.name} ${baseType}`,
            namespace: this.namespace,
            material: this.generateBlockMaterial(baseType, random, dimensionConfig),
            properties: this.generateBlockProperties(baseType, random, dimensionConfig),
            drops: this.generateBlockDrops(baseType, random),
            sounds: this.generateBlockSounds(baseType, dimensionConfig),
            states: this.generateBlockStates(baseType, random),
            model: this.generateBlockModel(baseType, random),
            textures: this.generateBlockTextures(baseType, dimensionConfig, random)
        };
    }

    /**
     * Generate ore blocks
     */
    private generateOreBlocks(dimensionConfig: DimensionConfig, random: () => number): CustomBlockConfig[] {
        const ores: CustomBlockConfig[] = [];
        const oreCount = Math.floor(random() * 3) + 2; // 2-4 ore blocks
        
        const oreTypes = this.getOreTypes(dimensionConfig);
        
        for (let i = 0; i < oreCount; i++) {
            const oreType = oreTypes[Math.floor(random() * oreTypes.length)];
            const oreId = `${this.namespace}:ore_${oreType}_${this.getNextBlockId()}`;
            
            const ore = this.createOreBlock(oreType, oreId, dimensionConfig, random);
            ores.push(ore);
            this.customBlocks.set(oreId, ore);
        }
        
        return ores;
    }

    /**
     * Get ore types based on dimension
     */
    private getOreTypes(dimensionConfig: DimensionConfig): string[] {
        switch (dimensionConfig.generatorType) {
            case 'the_end':
                return ['end_crystal', 'ender_gem', 'void_quartz'];
            case 'nether':
                return ['nether_crystal', 'soul_gem', 'inferno_quartz'];
            case 'void':
                return ['shadow_crystal', 'void_gem', 'empty_quartz'];
            case 'floating_islands':
                return ['sky_crystal', 'cloud_gem', 'air_quartz'];
            case 'flat':
                return ['simple_crystal', 'basic_gem', 'plain_quartz'];
            case 'noise':
            default:
                return ['mystic_crystal', 'ancient_gem', 'magic_quartz'];
        }
    }

    /**
     * Create ore block
     */
    private createOreBlock(oreType: string, oreId: string, dimensionConfig: DimensionConfig, random: () => number): CustomBlockConfig {
        return {
            id: oreId,
            name: `${oreType} Ore`,
            namespace: this.namespace,
            material: this.generateBlockMaterial('ore', random, dimensionConfig),
            properties: this.generateBlockProperties('ore', random, dimensionConfig),
            drops: { type: 'item', item: `${this.namespace}:${oreType}`, count: 1, experience: 2, silk_touch: true },
            sounds: this.generateBlockSounds('ore', dimensionConfig),
            states: [],
            model: this.generateBlockModel('ore', random),
            textures: {
                all: `${this.namespace}:block/stone`,
                particle: `${this.namespace}:block/stone`
            }
        };
    }

    /**
     * Generate decorative blocks
     */
    private generateDecorativeBlocks(dimensionConfig: DimensionConfig, random: () => number): CustomBlockConfig[] {
        const decorative: CustomBlockConfig[] = [];
        const decorativeCount = Math.floor(random() * 4) + 2; // 2-5 decorative blocks
        
        const decorativeTypes = ['pillar', 'carved', 'polished', 'chiseled', 'tiles'];
        
        for (let i = 0; i < decorativeCount; i++) {
            const decorativeType = decorativeTypes[Math.floor(random() * decorativeTypes.length)];
            const decorativeId = `${this.namespace}:decorative_${decorativeType}_${this.getNextBlockId()}`;
            
            const block = this.createDecorativeBlock(decorativeType, decorativeId, dimensionConfig, random);
            decorative.push(block);
            this.customBlocks.set(decorativeId, block);
        }
        
        return decorative;
    }

    /**
     * Create decorative block
     */
    private createDecorativeBlock(decorativeType: string, decorativeId: string, dimensionConfig: DimensionConfig, random: () => number): CustomBlockConfig {
        return {
            id: decorativeId,
            name: `${decorativeType} ${dimensionConfig.name}`,
            namespace: this.namespace,
            material: this.generateBlockMaterial('stone', random, dimensionConfig),
            properties: this.generateBlockProperties('stone', random, dimensionConfig),
            drops: this.generateBlockDrops('stone', random),
            sounds: this.generateBlockSounds('stone', dimensionConfig),
            states: this.generateBlockStates(decorativeType, random),
            model: this.generateBlockModel(decorativeType, random),
            textures: this.generateBlockTextures(decorativeType, dimensionConfig, random)
        };
    }

    /**
     * Generate utility blocks
     */
    private generateUtilityBlocks(dimensionConfig: DimensionConfig, random: () => number): CustomBlockConfig[] {
        const utility: CustomBlockConfig[] = [];
        const utilityCount = Math.floor(random() * 2) + 1; // 1-2 utility blocks
        
        const utilityTypes = ['furnace', 'crafting_table', 'chest', 'spawner'];
        
        for (let i = 0; i < utilityCount; i++) {
            const utilityType = utilityTypes[Math.floor(random() * utilityTypes.length)];
            const utilityId = `${this.namespace}:utility_${utilityType}_${this.getNextBlockId()}`;
            
            const block = this.createUtilityBlock(utilityType, utilityId, dimensionConfig, random);
            utility.push(block);
            this.customBlocks.set(utilityId, block);
        }
        
        return utility;
    }

    /**
     * Create utility block
     */
    private createUtilityBlock(utilityType: string, utilityId: string, dimensionConfig: DimensionConfig, random: () => number): CustomBlockConfig {
        return {
            id: utilityId,
            name: `${dimensionConfig.name} ${utilityType}`,
            namespace: this.namespace,
            material: this.generateBlockMaterial('stone', random, dimensionConfig),
            properties: { ...this.generateBlockProperties('stone', random, dimensionConfig), solid: true },
            drops: this.generateBlockDrops('stone', random),
            sounds: this.generateBlockSounds('stone', dimensionConfig),
            states: this.generateBlockStates(utilityType, random),
            model: this.generateBlockModel(utilityType, random),
            textures: this.generateBlockTextures(utilityType, dimensionConfig, random)
        };
    }

    /**
     * Get next block ID
     */
    private getNextBlockId(): number {
        return ++this.blockCounter;
    }

    /**
     * Get dimension block profile
     */
    public getDimensionProfile(dimensionId: string): DimensionBlockProfile | null {
        return this.dimensionProfiles.get(dimensionId) || null;
    }

    /**
     * Get custom block configuration
     */
    public getCustomBlock(blockId: string): CustomBlockConfig | null {
        return this.customBlocks.get(blockId) || null;
    }

    /**
     * Generate JSON files for datapack
     */
    public async generateDatapackFiles(profile: DimensionBlockProfile): Promise<{ [key: string]: any }> {
        const files: { [key: string]: any } = {};
        
        // Generate block state files
        for (const block of profile.customBlocks) {
            const stateJson = this.generateBlockStateJson(block);
            files[`assets/${this.namespace}/blockstates/${block.id.replace(`${this.namespace}:`, '')}.json`] = stateJson;
        }
        
        // Generate block model files
        for (const block of profile.customBlocks) {
            const modelJson = this.generateBlockModelJson(block);
            files[`assets/${this.namespace}/models/block/${block.id.replace(`${this.namespace}:`, '')}.json`] = modelJson;
        }
        
        // Generate item model files
        for (const block of profile.customBlocks) {
            const itemModelJson = this.generateItemModelJson(block);
            files[`assets/${this.namespace}/models/item/${block.id.replace(`${this.namespace}:`, '')}.json`] = itemModelJson;
        }
        
        // Generate loot table files
        for (const block of profile.customBlocks) {
            const lootTableJson = this.generateLootTableJson(block);
            files[`data/${this.namespace}/loot_tables/blocks/${block.id.replace(`${this.namespace}:`, '')}.json`] = lootTableJson;
        }
        
        return files;
    }

    /**
     * Generate block state JSON
     */
    private generateBlockStateJson(block: CustomBlockConfig): any {
        if (block.model.variants) {
            return {
                variants: block.model.variants
            };
        } else if (block.model.multipart) {
            return {
                multipart: block.model.multipart
            };
        } else {
            return {
                variants: {
                    '': { model: `${block.namespace}:block/${block.id.replace(`${block.namespace}:`, '')}` }
                }
            };
        }
    }

    /**
     * Generate block model JSON
     */
    private generateBlockModelJson(block: CustomBlockConfig): any {
        const modelName = block.id.replace(`${block.namespace}:`, '');
        
        return {
            parent: this.getModelParent(block.model.type),
            textures: block.textures
        };
    }

    /**
     * Get model parent based on type
     */
    private getModelParent(type: string): string {
        const parents: { [key: string]: string } = {
            'full': 'minecraft:block/cube_all',
            'cross': 'minecraft:block/cross',
            'tinted_cross': 'minecraft:block/tinted_cross',
            'crop': 'minecraft:block/crop',
            'door': 'minecraft:block/door_bottom',
            'slab': 'minecraft:block/slab',
            'stairs': 'minecraft:block/stairs',
            'fence': 'minecraft:block/fence_post',
            'wall': 'minecraft:block/wall_post',
            'pane': 'minecraft:block/pane'
        };
        
        return parents[type] || 'minecraft:block/cube_all';
    }

    /**
     * Generate item model JSON
     */
    private generateItemModelJson(block: CustomBlockConfig): any {
        const modelName = block.id.replace(`${block.namespace}:`, '');
        
        return {
            parent: `${block.namespace}:block/${modelName}`
        };
    }

    /**
     * Generate loot table JSON
     */
    private generateLootTableJson(block: CustomBlockConfig): any {
        const pools: any[] = [];
        
        if (block.drops.type === 'self') {
            pools.push({
                rolls: 1,
                entries: [
                    {
                        type: 'minecraft:item',
                        name: block.id
                    }
                ]
            });
        } else if (block.drops.type === 'item' && block.drops.item) {
            pools.push({
                rolls: 1,
                entries: [
                    {
                        type: 'minecraft:item',
                        name: block.drops.item,
                        functions: block.drops.count ? [
                            {
                                function: 'minecraft:set_count',
                                count: block.drops.count
                            }
                        ] : []
                    }
                ],
                functions: block.drops.experience ? [
                    {
                        function: 'minecraft:explosion_decay'
                    },
                    {
                        function: 'minecraft:apply_bonus',
                        enchantment: 'minecraft:fortune',
                        formula: 'minecraft:ore_drops'
                    }
                ] : []
            });
        }
        
        return {
            type: 'minecraft:block',
            pools
        };
    }

    /**
     * Create seeded random number generator
     */
    private createSeededRandom(seed: number): () => number {
        let s = seed;
        return () => {
            s = (s * 9301 + 49297) % 233280;
            return s / 233280;
        };
    }

    /**
     * Get custom block registry statistics
     */
    public getStatistics(): any {
        return {
            totalCustomBlocks: this.customBlocks.size,
            dimensionProfiles: this.dimensionProfiles.size,
            averageBlocksPerDimension: this.dimensionProfiles.size > 0 ? 
                Array.from(this.dimensionProfiles.values()).reduce((sum, profile) => 
                    sum + profile.customBlocks.length + profile.oreBlocks.length + 
                    profile.decorativeBlocks.length + profile.utilityBlocks.length, 0) / this.dimensionProfiles.size : 0
        };
    }

    /**
     * Clear all custom block data
     */
    public clearCustomBlocks(): void {
        this.customBlocks.clear();
        this.dimensionProfiles.clear();
        this.blockCounter = 0;
        this.logger.info('All custom block data cleared');
    }
}

// Singleton instance for global access
let globalCustomBlockRegistry: CustomBlockRegistry | null = null;

/**
 * Get global custom block registry instance
 */
export function getCustomBlockRegistry(): CustomBlockRegistry {
    if (!globalCustomBlockRegistry) {
        globalCustomBlockRegistry = new CustomBlockRegistry();
    }
    return globalCustomBlockRegistry;
}
