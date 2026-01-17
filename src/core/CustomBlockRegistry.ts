import { Logger } from '../utils/Logger';

export class CustomBlockRegistry {
    private api: MoudAPI;
    private logger: Logger;
    private customBlocks: Map<string, CustomBlockDefinition>;

    constructor(api: MoudAPI) {
        console.log('CustomBlockRegistry constructor starting...');
        this.api = api;
        this.logger = new Logger('CustomBlockRegistry');
        this.customBlocks = new Map();
        console.log('CustomBlockRegistry constructor completed');
    }

    /**
     * Register all custom blocks with Minecraft
     */
    public registerCustomBlocks(): void {
        this.logger.info(`Registering ${this.customBlocks.size} custom blocks...`);

        for (const [blockId, blockDef] of this.customBlocks) {
            try {
                this.registerBlock(blockId, blockDef);
                this.logger.debug(`Registered custom block: ${blockId}`);
            } catch (error) {
                this.logger.error(`Failed to register custom block ${blockId}:`, error);
            }
        }

        this.logger.info(`Successfully registered custom blocks`);
    }

    /**
     * Initialize all custom block definitions
     */
    private initializeCustomBlocks(): void {
        // Ant Blocks (from the ant dimension)
        this.registerCustomBlockDefinition('endlessdimensions:ant_block', {
            name: 'Ant Block',
            material: 'STONE',
            hardness: 2.0,
            resistance: 6.0,
            lightLevel: 0,
            hasCollision: true,
            toolRequired: 'pickaxe',
            texture: 'ant_block',
            properties: {
                // Custom properties for ant behavior
                'ant_type': 'WORKER',
                'colony_id': 0
            }
        });

        this.registerCustomBlockDefinition('endlessdimensions:ant_chamber', {
            name: 'Ant Chamber',
            material: 'STONE',
            hardness: 1.5,
            resistance: 4.0,
            lightLevel: 0,
            hasCollision: true,
            toolRequired: 'pickaxe',
            texture: 'ant_chamber',
            properties: {
                'ant_type': 'QUEEN',
                'colony_id': 0
            }
        });

        // Flashing Black-Green Block (from chaos dimensions)
        this.registerCustomBlockDefinition('endlessdimensions:chaos_block', {
            name: 'Chaos Block',
            material: 'STONE',
            hardness: 3.0,
            resistance: 10.0,
            lightLevel: 8, // Emits light
            hasCollision: true,
            toolRequired: 'pickaxe',
            texture: 'chaos_block',
            properties: {
                'flash_speed': 10,
                'color_primary': 'black',
                'color_secondary': 'green'
            }
        });

        // Library Blocks (from library dimension)
        this.registerCustomBlockDefinition('endlessdimensions:library_bookshelf', {
            name: 'Library Bookshelf',
            material: 'WOOD',
            hardness: 1.5,
            resistance: 3.0,
            lightLevel: 0,
            hasCollision: true,
            toolRequired: 'axe',
            texture: 'library_bookshelf',
            properties: {
                'book_count': 1000,
                'infinite_knowledge': true
            }
        });

        // Credits Dimension Blocks
        this.registerCustomBlockDefinition('endlessdimensions:credits_block', {
            name: 'Credits Block',
            material: 'STONE',
            hardness: 50.0, // Very hard to break
            resistance: 2000.0, // Explosion resistant
            lightLevel: 15, // Bright light
            hasCollision: true,
            toolRequired: 'pickaxe',
            texture: 'credits_block',
            properties: {
                'credits_text': 'Minecraft',
                'scrolling': true
            }
        });

        // Pattern Dimension Blocks
        this.registerCustomBlockDefinition('endlessdimensions:pattern_block', {
            name: 'Pattern Block',
            material: 'STONE',
            hardness: 2.0,
            resistance: 6.0,
            lightLevel: 0,
            hasCollision: true,
            toolRequired: 'pickaxe',
            texture: 'pattern_block',
            properties: {
                'pattern_type': 'CHECKERBOARD',
                'color_scheme': 'MONOCHROME'
            }
        });

        // Lucky Dimension Blocks
        this.registerCustomBlockDefinition('endlessdimensions:lucky_block', {
            name: 'Lucky Block',
            material: 'STONE',
            hardness: 1.0,
            resistance: 2.0,
            lightLevel: 0,
            hasCollision: true,
            toolRequired: 'pickaxe',
            texture: 'lucky_block',
            properties: {
                'luck_level': 'MAXIMUM',
                'reward_tier': 'LEGENDARY'
            }
        });

        // Sky Dimension Blocks
        this.registerCustomBlockDefinition('endlessdimensions:cloud_block', {
            name: 'Cloud Block',
            material: 'WOOL',
            hardness: 0.5,
            resistance: 1.0,
            lightLevel: 0,
            hasCollision: true,
            toolRequired: 'none',
            texture: 'cloud_block',
            properties: {
                'cloud_density': 'SOLID',
                'floats': true
            }
        });

        // Water Dimension Blocks
        this.registerCustomBlockDefinition('endlessdimensions:water_essence', {
            name: 'Water Essence Block',
            material: 'ICE',
            hardness: 0.5,
            resistance: 1.0,
            lightLevel: 2,
            hasCollision: true,
            toolRequired: 'pickaxe',
            texture: 'water_essence',
            properties: {
                'water_level': 'INFINITE',
                'flowing': false
            }
        });

        // End Portal Variant Blocks
        this.registerCustomBlockDefinition('endlessdimensions:infested_end_stone', {
            name: 'Infested End Stone',
            material: 'STONE',
            hardness: 3.0,
            resistance: 9.0,
            lightLevel: 0,
            hasCollision: true,
            toolRequired: 'pickaxe',
            texture: 'infested_end_stone',
            properties: {
                'infestation_level': 'MAXIMUM',
                'endermite_spawn': true
            }
        });

        // Nether Variant Blocks
        this.registerCustomBlockDefinition('endlessdimensions:bleeding_netherrack', {
            name: 'Bleeding Netherrack',
            material: 'STONE',
            hardness: 2.0,
            resistance: 6.0,
            lightLevel: 5,
            hasCollision: true,
            toolRequired: 'pickaxe',
            texture: 'bleeding_netherrack',
            properties: {
                'bleeding': true,
                'damage_on_touch': true
            }
        });

        // Void Dimension Blocks
        this.registerCustomBlockDefinition('endlessdimensions:void_crystal', {
            name: 'Void Crystal',
            material: 'GLASS',
            hardness: 1.0,
            resistance: 3.0,
            lightLevel: 12,
            hasCollision: true,
            toolRequired: 'pickaxe',
            texture: 'void_crystal',
            properties: {
                'void_power': 'INFINITE',
                'teleports_randomly': true
            }
        });

        // Color Dimension Blocks
        this.registerCustomBlockDefinition('endlessdimensions:rainbow_block', {
            name: 'Rainbow Block',
            material: 'STONE',
            hardness: 2.0,
            resistance: 6.0,
            lightLevel: 10,
            hasCollision: true,
            toolRequired: 'pickaxe',
            texture: 'rainbow_block',
            properties: {
                'color_cycle': true,
                'cycle_speed': 5
            }
        });

        // Time Dimension Blocks
        this.registerCustomBlockDefinition('endlessdimensions:temporal_block', {
            name: 'Temporal Block',
            material: 'STONE',
            hardness: 3.0,
            resistance: 15.0,
            lightLevel: 0,
            hasCollision: true,
            toolRequired: 'pickaxe',
            texture: 'temporal_block',
            properties: {
                'time_acceleration': 10,
                'affects_nearby': true
            }
        });

        // Sound Dimension Blocks
        this.registerCustomBlockDefinition('endlessdimensions:resonant_block', {
            name: 'Resonant Block',
            material: 'STONE',
            hardness: 2.5,
            resistance: 8.0,
            lightLevel: 0,
            hasCollision: true,
            toolRequired: 'pickaxe',
            texture: 'resonant_block',
            properties: {
                'note': 'RANDOM',
                'volume': 'AMPLIFIED'
            }
        });
    }

    /**
     * Register a custom block definition
     */
    private registerCustomBlockDefinition(blockId: string, definition: CustomBlockDefinition): void {
        this.customBlocks.set(blockId, definition);
    }

    /**
     * Register a single block with Minecraft
     */
    public registerBlock(blockId: string, definition: CustomBlockDefinition, callbacks?: any): boolean {
        // Note: Custom block registration is not available in Moud SDK
        // This is a placeholder for future implementation
        this.logger.info(`Custom block registration not yet supported: ${blockId}`);
        return true;
    }

    /**
     * Get all custom block IDs
     */
    public getCustomBlockIds(): string[] {
        return Array.from(this.customBlocks.keys());
    }

    /**
     * Check if a block is a custom block
     */
    public isCustomBlock(blockId: string): boolean {
        return this.customBlocks.has(blockId);
    }

    /**
     * Get custom block definition
     */
    public getCustomBlockDefinition(blockId: string): CustomBlockDefinition | undefined {
        return this.customBlocks.get(blockId);
    }
}

export interface CustomBlockDefinition {
    name: string;
    material: string;
    hardness: number;
    resistance: number;
    lightLevel: number;
    hasCollision: boolean;
    toolRequired: string;
    texture: string;
    properties: Record<string, any>;
    [key: string]: any;
}
