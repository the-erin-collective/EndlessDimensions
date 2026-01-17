import { WorldType } from './VirtualGridController';

export class ItemBlockMapper {
    private readonly worldTypeItems: Map<string, WorldType>;
    private readonly biomeItems: Map<string, { templateId: string; displayName: string }>;
    private readonly fluidItems: Set<string>;
    private readonly oreItems: Set<string>;
    private readonly itemToBlockOverrides: Map<string, string>;

    constructor() {
        this.worldTypeItems = new Map([
            ['minecraft:emerald_block', 'NORMAL'],
            ['minecraft:ancient_debris', 'NETHER'],
            ['minecraft:ender_eye', 'THE_END'],
            ['minecraft:diamond_block', 'SUPERFLAT'],
            ['minecraft:netherite_block', 'AMPLIFIED']
        ]);

        this.biomeItems = new Map([
            ['minecraft:grass_block', { templateId: 'OVERWORLD_PLAINS', displayName: 'Plains' }],
            ['minecraft:oak_sapling', { templateId: 'OVERWORLD_FOREST', displayName: 'Forest' }],
            ['minecraft:jungle_sapling', { templateId: 'OVERWORLD_JUNGLE', displayName: 'Jungle' }],
            ['minecraft:sand', { templateId: 'OVERWORLD_DESERT', displayName: 'Desert' }],
            ['minecraft:red_sand', { templateId: 'OVERWORLD_BADLANDS', displayName: 'Badlands' }],
            ['minecraft:water_bucket', { templateId: 'OVERWORLD_OCEAN', displayName: 'Ocean' }],
            ['minecraft:packed_ice', { templateId: 'OVERWORLD_ICE_SPIKES', displayName: 'Ice Spikes' }],
            ['minecraft:red_mushroom', { templateId: 'OVERWORLD_MUSHROOM', displayName: 'Mushroom Fields' }],
            ['minecraft:iron_block', { templateId: 'FEATURELESS', displayName: 'Featureless' }],
            ['minecraft:netherrack', { templateId: 'NETHER_WASTES', displayName: 'Nether Wastes' }],
            ['minecraft:basalt', { templateId: 'NETHER_BASALT_DELTAS', displayName: 'Basalt Deltas' }],
            ['minecraft:crimson_fungus', { templateId: 'NETHER_CRIMSON', displayName: 'Crimson Forest' }],
            ['minecraft:warped_fungus', { templateId: 'NETHER_WARPED', displayName: 'Warped Forest' }],
            ['minecraft:end_stone', { templateId: 'END_HIGHLANDS', displayName: 'End Highlands' }],
            ['minecraft:chorus_flower', { templateId: 'END_MIDLANDS', displayName: 'End Midlands' }]
        ]);

        this.fluidItems = new Set([
            'minecraft:water_bucket',
            'minecraft:lava_bucket',
            'minecraft:water',
            'minecraft:lava'
        ]);

        this.oreItems = new Set([
            'minecraft:coal_ore',
            'minecraft:iron_ore',
            'minecraft:copper_ore',
            'minecraft:gold_ore',
            'minecraft:redstone_ore',
            'minecraft:lapis_ore',
            'minecraft:diamond_ore',
            'minecraft:emerald_ore',
            'minecraft:deepslate_coal_ore',
            'minecraft:deepslate_iron_ore',
            'minecraft:deepslate_copper_ore',
            'minecraft:deepslate_gold_ore',
            'minecraft:deepslate_redstone_ore',
            'minecraft:deepslate_lapis_ore',
            'minecraft:deepslate_diamond_ore',
            'minecraft:deepslate_emerald_ore'
        ]);

        this.itemToBlockOverrides = new Map([
            ['minecraft:water_bucket', 'minecraft:water'],
            ['minecraft:lava_bucket', 'minecraft:lava']
        ]);
    }

    public mapItemToBlock(itemId: string): string | null {
        if (!itemId) {
            return null;
        }
        const override = this.itemToBlockOverrides.get(itemId);
        if (override) {
            return override;
        }
        if (itemId.startsWith('minecraft:')) {
            return itemId;
        }
        return null;
    }

    public isWorldTypeItem(itemId: string): boolean {
        return this.worldTypeItems.has(itemId);
    }

    public getUnlockedWorldType(itemId: string): WorldType | null {
        return this.worldTypeItems.get(itemId) || null;
    }

    public isBaseBiomeItem(itemId: string): boolean {
        return this.biomeItems.has(itemId);
    }

    public getBiomeType(itemId: string): string | null {
        return this.biomeItems.get(itemId)?.displayName || null;
    }

    public getBiomeTemplateId(itemId: string): string | null {
        return this.biomeItems.get(itemId)?.templateId || null;
    }

    public isFluidItem(itemId: string): boolean {
        return this.fluidItems.has(itemId);
    }

    public isOreItem(itemId: string): boolean {
        return this.oreItems.has(itemId);
    }
}
