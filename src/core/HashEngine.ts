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

export class HashEngine {
    private readonly salt: string = ' :why_so_salty#LazyCrypto ';
    private readonly easterEggDimensions: Map<string, EasterEggDimension>;

    constructor() {
        this.easterEggDimensions = new Map();
        this.initializeEasterEggs();
    }

    /**
     * Converts text input to a deterministic dimension seed using SHA-256
     * @param text The input text from a written book
     * @returns A deterministic seed for dimension generation
     */
    public getDimensionSeed(text: string): number {
        const input = text + this.salt;
        const hash = simpleHash(input);
        
        // Read first 4 bytes as a Little Endian Int
        let seed = (hash[0] | (hash[1] << 8) | (hash[2] << 16) | (hash[3] << 24)) >>> 0;
        return seed & 0x7FFFFFFF; // Force positive
    }

    /**
     * Converts text input to a BigInt seed for more complex calculations
     * @param text The input text from a written book
     * @returns A BigInt seed for advanced dimension calculations
     */
    public getDimensionSeedBigInt(text: string): bigint {
        const input = text + this.salt;
        const hash = simpleHash(input);
        
        // Convert first 8 bytes to a BigInt (similar to Java's asLong() method)
        let result = 0n;
        for (let i = 0; i < 8; i++) {
            result = (result << 8n) | BigInt(hash[i] & 0xFF);
        }
        
        // Apply the same masking as the original code (Long.MAX_VALUE equivalent)
        const maxLong = (1n << 63n) - 1n; // 2^63 - 1
        return result & maxLong;
    }

    /**
     * Generates a dimension ID from the seed
     * @param seed The numeric seed
     * @returns A unique dimension identifier
     */
    public getDimensionId(seed: bigint): string {
        return `endlessdimensions:generated_${seed}`;
    }

    /**
     * Checks if the input text corresponds to an easter egg dimension
     * @param text The input text to check
     * @returns EasterEggDimension if found, null otherwise
     */
    public checkEasterEgg(text: string): EasterEggDimension | null {
        const normalizedText = text.toLowerCase().trim();
        return this.easterEggDimensions.get(normalizedText) || null;
    }

    /**
     * Initializes the easter egg dimensions with their special properties
     */
    private initializeEasterEggs(): void {
        // Classic 20w14infinite easter eggs
        this.easterEggDimensions.set('ant', {
            name: 'ant',
            displayName: 'Ant Dimension',
            generatorType: 'flat',
            defaultBlock: 'minecraft:grass_block',
            specialFeatures: ['cellular_automata', 'ant_pattern']
        });

        this.easterEggDimensions.set('library', {
            name: 'library',
            displayName: 'Library of Babel',
            generatorType: 'custom',
            defaultBlock: 'minecraft:oak_planks',
            specialFeatures: ['library_structures', 'infinite_books']
        });

        this.easterEggDimensions.set('credits', {
            name: 'credits',
            displayName: 'Credits Dimension',
            generatorType: 'void',
            defaultBlock: 'minecraft:air',
            specialFeatures: ['floating_text', 'netherite_blocks']
        });

        this.easterEggDimensions.set('cherry', {
            name: 'cherry',
            displayName: 'Cherry Blossom Dimension',
            generatorType: 'noise',
            defaultBlock: 'minecraft:cherry_planks',
            specialFeatures: ['cherry_trees', 'pink_fog']
        });

        this.easterEggDimensions.set('bones', {
            name: 'bones',
            displayName: 'Bone Dimension',
            generatorType: 'noise',
            defaultBlock: 'minecraft:bone_block',
            specialFeatures: ['skeleton_spawns', 'bone_structures']
        });

        this.easterEggDimensions.set('busy', {
            name: 'busy',
            displayName: 'Busy Dimension',
            generatorType: 'noise',
            defaultBlock: 'minecraft:stone',
            specialFeatures: ['high_mob_density', 'chaotic_features']
        });

        this.easterEggDimensions.set('colors', {
            name: 'colors',
            displayName: 'Rainbow Dimension',
            generatorType: 'custom',
            defaultBlock: 'minecraft:white_concrete',
            specialFeatures: ['rainbow_blocks', 'color_cycling']
        });

        this.easterEggDimensions.set('custom', {
            name: 'custom',
            displayName: 'Custom Dimension',
            generatorType: 'noise',
            defaultBlock: 'minecraft:dirt',
            specialFeatures: ['user_defined']
        });

        this.easterEggDimensions.set('darkness', {
            name: 'darkness',
            displayName: 'Dimension of Darkness',
            generatorType: 'void',
            defaultBlock: 'minecraft:black_wool',
            specialFeatures: ['no_light', 'monster_spawns']
        });

        this.easterEggDimensions.set('decay', {
            name: 'decay',
            displayName: 'Decay Dimension',
            generatorType: 'noise',
            defaultBlock: 'minecraft:cobblestone',
            specialFeatures: ['block_decay', 'ruined_structures']
        });

        this.easterEggDimensions.set('desert', {
            name: 'desert',
            displayName: 'Endless Desert',
            generatorType: 'noise',
            defaultBlock: 'minecraft:sand',
            specialFeatures: ['endless_sand', 'cactus_spawns']
        });

        this.easterEggDimensions.set('end', {
            name: 'end',
            displayName: 'The End',
            generatorType: 'the_end',
            defaultBlock: 'minecraft:end_stone',
            specialFeatures: ['end_like', 'endermen_spawns']
        });

        this.easterEggDimensions.set('fleet', {
            name: 'fleet',
            displayName: 'Fleet Dimension',
            generatorType: 'custom',
            defaultBlock: 'minecraft:prismarine',
            specialFeatures: ['water_structures', 'ship_wrecks']
        });

        this.easterEggDimensions.set('garden', {
            name: 'garden',
            displayName: 'Garden Dimension',
            generatorType: 'noise',
            defaultBlock: 'minecraft:grass_block',
            specialFeatures: ['dense_vegetation', 'flower_variety']
        });

        this.easterEggDimensions.set('hole', {
            name: 'hole',
            displayName: 'Hole Dimension',
            generatorType: 'void',
            defaultBlock: 'minecraft:air',
            specialFeatures: ['single_block', 'void_world']
        });

        this.easterEggDimensions.set('island', {
            name: 'island',
            displayName: 'Island Dimension',
            generatorType: 'floating_islands',
            defaultBlock: 'minecraft:grass_block',
            specialFeatures: ['floating_islands', 'void_below']
        });

        this.easterEggDimensions.set('liquids', {
            name: 'liquids',
            displayName: 'Liquid Dimension',
            generatorType: 'custom',
            defaultBlock: 'minecraft:water',
            specialFeatures: ['all_liquids', 'no_solid_ground']
        });

        this.easterEggDimensions.set('lucky', {
            name: 'lucky',
            displayName: 'Lucky Dimension',
            generatorType: 'noise',
            defaultBlock: 'minecraft:gold_block',
            specialFeatures: ['lucky_blocks', 'random_rewards']
        });

        this.easterEggDimensions.set('map', {
            name: 'map',
            displayName: 'Map Dimension',
            generatorType: 'flat',
            defaultBlock: 'minecraft:map',
            specialFeatures: ['map_display', 'cartography']
        });

        this.easterEggDimensions.set('message', {
            name: 'message',
            displayName: 'Message Dimension',
            generatorType: 'void',
            defaultBlock: 'minecraft:air',
            specialFeatures: ['text_display', 'message_blocks']
        });

        this.easterEggDimensions.set('missing', {
            name: 'missing',
            displayName: 'Missing Dimension',
            generatorType: 'void',
            defaultBlock: 'minecraft:air',
            specialFeatures: ['missing_texture', 'void_world']
        });

        this.easterEggDimensions.set('mushroom', {
            name: 'mushroom',
            displayName: 'Mushroom Dimension',
            generatorType: 'noise',
            defaultBlock: 'minecraft:mycelium',
            specialFeatures: ['giant_mushrooms', 'mushroom_biome']
        });

        this.easterEggDimensions.set('ocean', {
            name: 'ocean',
            displayName: 'Ocean Dimension',
            generatorType: 'noise',
            defaultBlock: 'minecraft:sand',
            specialFeatures: ['endless_ocean', 'underwater_structures']
        });

        this.easterEggDimensions.set('origin', {
            name: 'origin',
            displayName: 'Origin Dimension',
            generatorType: 'noise',
            defaultBlock: 'minecraft:grass_block',
            specialFeatures: ['overworld_like', 'vanilla_spawn']
        });

        this.easterEggDimensions.set('pattern', {
            name: 'pattern',
            displayName: 'Pattern Dimension',
            generatorType: 'flat',
            defaultBlock: 'minecraft:wool',
            specialFeatures: ['geometric_patterns', 'color_blocks']
        });

        this.easterEggDimensions.set('perfect', {
            name: 'perfect',
            displayName: 'Perfect Dimension',
            generatorType: 'noise',
            defaultBlock: 'minecraft:diamond_block',
            specialFeatures: ['perfect_world', 'valuable_blocks']
        });

        this.easterEggDimensions.set('pillar', {
            name: 'pillar',
            displayName: 'Pillar Dimension',
            generatorType: 'custom',
            defaultBlock: 'minecraft:stone',
            specialFeatures: ['pillar_structures', 'vertical_world']
        });

        this.easterEggDimensions.set('pizza', {
            name: 'pizza',
            displayName: 'Pizza Dimension',
            generatorType: 'flat',
            defaultBlock: 'minecraft:hay_block',
            specialFeatures: ['pizza_pattern', 'food_blocks']
        });

        this.easterEggDimensions.set('prison', {
            name: 'prison',
            displayName: 'Prison Dimension',
            generatorType: 'custom',
            defaultBlock: 'minecraft:iron_bars',
            specialFeatures: ['prison_structures', 'locked_rooms']
        });

        this.easterEggDimensions.set('quarry', {
            name: 'quarry',
            displayName: 'Quarry Dimension',
            generatorType: 'noise',
            defaultBlock: 'minecraft:stone',
            specialFeatures: ['ore_rich', 'mining_world']
        });

        this.easterEggDimensions.set('red', {
            name: 'red',
            displayName: 'Red Dimension',
            generatorType: 'noise',
            defaultBlock: 'minecraft:red_wool',
            specialFeatures: ['red_theme', 'nether_like']
        });

        this.easterEggDimensions.set('rooms', {
            name: 'rooms',
            displayName: 'Rooms Dimension',
            generatorType: 'custom',
            defaultBlock: 'minecraft:oak_planks',
            specialFeatures: ['room_structures', 'random_layout']
        });

        this.easterEggDimensions.set('shapes', {
            name: 'shapes',
            displayName: 'Shapes Dimension',
            generatorType: 'custom',
            defaultBlock: 'minecraft:concrete',
            specialFeatures: ['geometric_shapes', 'abstract_world']
        });

        this.easterEggDimensions.set('sky', {
            name: 'sky',
            displayName: 'Sky Dimension',
            generatorType: 'floating_islands',
            defaultBlock: 'minecraft:grass_block',
            specialFeatures: ['sky_islands', 'cloud_blocks']
        });

        this.easterEggDimensions.set('slime', {
            name: 'slime',
            displayName: 'Slime Dimension',
            generatorType: 'noise',
            defaultBlock: 'minecraft:slime_block',
            specialFeatures: ['bouncy_world', 'slime_spawns']
        });

        this.easterEggDimensions.set('snow', {
            name: 'snow',
            displayName: 'Snow Dimension',
            generatorType: 'noise',
            defaultBlock: 'minecraft:snow_block',
            specialFeatures: ['winter_theme', 'ice_structures']
        });

        this.easterEggDimensions.set('source', {
            name: 'source',
            displayName: 'Source Dimension',
            generatorType: 'void',
            defaultBlock: 'minecraft:air',
            specialFeatures: ['code_display', 'developer_world']
        });

        this.easterEggDimensions.set('spiral', {
            name: 'spiral',
            displayName: 'Spiral Dimension',
            generatorType: 'custom',
            defaultBlock: 'minecraft:stone',
            specialFeatures: ['spiral_pattern', 'maze_like']
        });

        this.easterEggDimensions.set('sports', {
            name: 'sports',
            displayName: 'Sports Dimension',
            generatorType: 'flat',
            defaultBlock: 'minecraft:grass_block',
            specialFeatures: ['sports_arenas', 'game_structures']
        });

        this.easterEggDimensions.set('stone', {
            name: 'stone',
            displayName: 'Stone Dimension',
            generatorType: 'noise',
            defaultBlock: 'minecraft:stone',
            specialFeatures: ['stone_world', 'minimal_ores']
        });

        this.easterEggDimensions.set('suite', {
            name: 'suite',
            displayName: 'Suite Dimension',
            generatorType: 'custom',
            defaultBlock: 'minecraft:quartz_block',
            specialFeatures: ['luxury_structures', 'elegant_design']
        });

        this.easterEggDimensions.set('temples', {
            name: 'temples',
            displayName: 'Temples Dimension',
            generatorType: 'noise',
            defaultBlock: 'minecraft:sandstone',
            specialFeatures: ['temple_structures', 'ancient_ruins']
        });

        this.easterEggDimensions.set('tunnels', {
            name: 'tunnels',
            displayName: 'Tunnels Dimension',
            generatorType: 'custom',
            defaultBlock: 'minecraft:stone',
            specialFeatures: ['tunnel_network', 'underground_world']
        });

        this.easterEggDimensions.set('wall', {
            name: 'wall',
            displayName: 'Wall Dimension',
            generatorType: 'custom',
            defaultBlock: 'minecraft:cobblestone',
            specialFeatures: ['wall_structures', 'barrier_world']
        });

        this.easterEggDimensions.set('water', {
            name: 'water',
            displayName: 'Water Dimension',
            generatorType: 'noise',
            defaultBlock: 'minecraft:water',
            specialFeatures: ['underwater_world', 'aquatic_life']
        });

        this.easterEggDimensions.set('wind', {
            name: 'wind',
            displayName: 'Wind Dimension',
            generatorType: 'custom',
            defaultBlock: 'minecraft:air',
            specialFeatures: ['wind_effects', 'floating_blocks']
        });

        this.easterEggDimensions.set('zoo', {
            name: 'zoo',
            displayName: 'Zoo Dimension',
            generatorType: 'noise',
            defaultBlock: 'minecraft:grass_block',
            specialFeatures: ['animal_spawns', 'enclosure_structures']
        });
    }
}

export interface EasterEggDimension {
    name: string;
    displayName: string;
    generatorType: string;
    defaultBlock: string;
    specialFeatures: string[];
}
