import { Minecraft } from 'moud';
import { Logger } from '../utils/Logger';

export class BlockRegistry {
    private minecraft: Minecraft;
    private allBlocks: string[];
    private blacklistedBlocks: Set<string>;
    private safeBlocks: string[];
    private logger: Logger;

    constructor(minecraft: Minecraft) {
        this.minecraft = minecraft;
        this.logger = new Logger('BlockRegistry');
        this.blacklistedBlocks = new Set();
        this.initializeBlacklist();
        this.loadBlockRegistry();
    }

    /**
     * Initialize the blacklist of blocks that should NOT be used as default blocks
     * These are blocks that caused crashes or issues in the original 20w14infinite snapshot
     */
    private initializeBlacklist(): void {
        // Technical/air blocks that don't make sense as default blocks
        this.blacklistedBlocks.add('minecraft:air');
        this.blacklistedBlocks.add('minecraft:void_air');
        this.blacklistedBlocks.add('minecraft:cave_air');
        this.blacklistedBlocks.add('minecraft:barrier');
        this.blacklistedBlocks.add('minecraft:structure_void');
        this.blacklistedBlocks.add('minecraft:light');
        
        // Blocks that caused crashes in original snapshot
        this.blacklistedBlocks.add('minecraft:oak_leaves');
        this.blacklistedBlocks.add('minecraft:spruce_leaves');
        this.blacklistedBlocks.add('minecraft:birch_leaves');
        this.blacklistedBlocks.add('minecraft:jungle_leaves');
        this.blacklistedBlocks.add('minecraft:acacia_leaves');
        this.blacklistedBlocks.add('minecraft:dark_oak_leaves');
        this.blacklistedBlocks.add('minecraft:azalea_leaves');
        this.blacklistedBlocks.add('minecraft:flowering_azalea_leaves');
        this.blacklistedBlocks.add('minecraft:mangrove_leaves');
        this.blacklistedBlocks.add('minecraft:cherry_leaves');
        
        // Problematic plant blocks
        this.blacklistedBlocks.add('minecraft:grass');
        this.blacklistedBlocks.add('minecraft:tall_grass');
        this.blacklistedBlocks.add('minecraft:seagrass');
        this.blacklistedBlocks.add('minecraft:tall_seagrass');
        this.blacklistedBlocks.add('minecraft:kelp');
        this.blacklistedBlocks.add('minecraft:kelp_plant');
        this.blacklistedBlocks.add('minecraft:vine');
        this.blacklistedBlocks.add('minecraft:twisting_vines');
        this.blacklistedBlocks.add('minecraft:twisting_vines_plant');
        this.blacklistedBlocks.add('minecraft:weeping_vines');
        this.blacklistedBlocks.add('minecraft:weeping_vines_plant');
        this.blacklistedBlocks.add('minecraft:cave_vines');
        this.blacklistedBlocks.add('minecraft:cave_vines_plant');
        
        // Small/technical blocks that don't work well as terrain
        this.blacklistedBlocks.add('minecraft:water');
        this.blacklistedBlocks.add('minecraft:lava');
        this.blacklistedBlocks.add('minecraft:snow');
        this.blacklistedBlocks.add('minecraft:powder_snow');
        
        // Structure blocks (shouldn't be natural terrain)
        this.blacklistedBlocks.add('minecraft:structure_block');
        this.blacklistedBlocks.add('minecraft:structure_void');
        this.blacklistedBlocks.add('minecraft:jigsaw');
        this.blacklistedBlocks.add('minecraft:spawner');
        this.blacklistedBlocks.add('minecraft:end_portal');
        this.blacklistedBlocks.add('minecraft:end_gateway');
        this.blacklistedBlocks.add('minecraft:end_portal_frame');
        
        // Redstone components that don't make sense as terrain
        this.blacklistedBlocks.add('minecraft:redstone_wire');
        this.blacklistedBlocks.add('minecraft:redstone_torch');
        this.blacklistedBlocks.add('minecraft:redstone_wall_torch');
        this.blacklistedBlocks.add('minecraft:repeater');
        this.blacklistedBlocks.add('minecraft:comparator');
        this.blacklistedBlocks.add('minecraft:piston_head');
        this.blacklistedBlocks.add('minecraft:moving_piston');
        
        // Rails and transportation
        this.blacklistedBlocks.add('minecraft:rail');
        this.blacklistedBlocks.add('minecraft:powered_rail');
        this.blacklistedBlocks.add('minecraft:detector_rail');
        this.blacklistedBlocks.add('minecraft:activator_rail');
        
        // Buttons and plates
        this.blacklistedBlocks.add('minecraft:stone_button');
        this.blacklistedBlocks.add('minecraft:oak_button');
        this.blacklistedBlocks.add('minecraft:spruce_button');
        this.blacklistedBlocks.add('minecraft:birch_button');
        this.blacklistedBlocks.add('minecraft:jungle_button');
        this.blacklistedBlocks.add('minecraft:acacia_button');
        this.blacklistedBlocks.add('minecraft:dark_oak_button');
        this.blacklistedBlocks.add('minecraft:mangrove_button');
        this.blacklistedBlocks.add('minecraft:cherry_button');
        this.blacklistedBlocks.add('minecraft:polished_blackstone_button');
        
        this.blacklistedBlocks.add('minecraft:stone_pressure_plate');
        this.blacklistedBlocks.add('minecraft:oak_pressure_plate');
        this.blacklistedBlocks.add('minecraft:spruce_pressure_plate');
        this.blacklistedBlocks.add('minecraft:birch_pressure_plate');
        this.blacklistedBlocks.add('minecraft:jungle_pressure_plate');
        this.blacklistedBlocks.add('minecraft:acacia_pressure_plate');
        this.blacklistedBlocks.add('minecraft:dark_oak_pressure_plate');
        this.blacklistedBlocks.add('minecraft:mangrove_pressure_plate');
        this.blacklistedBlocks.add('minecraft:cherry_pressure_plate');
        this.blacklistedBlocks.add('minecraft:polished_blackstone_pressure_plate');
        this.blacklistedBlocks.add('minecraft:light_weighted_pressure_plate');
        this.blacklistedBlocks.add('minecraft:heavy_weighted_pressure_plate');
        
        // Doors, gates, and trapdoors
        this.blacklistedBlocks.add('minecraft:oak_door');
        this.blacklistedBlocks.add('minecraft:spruce_door');
        this.blacklistedBlocks.add('minecraft:birch_door');
        this.blacklistedBlocks.add('minecraft:jungle_door');
        this.blacklistedBlocks.add('minecraft:acacia_door');
        this.blacklistedBlocks.add('minecraft:dark_oak_door');
        this.blacklistedBlocks.add('minecraft:mangrove_door');
        this.blacklistedBlocks.add('minecraft:cherry_door');
        this.blacklistedBlocks.add('minecraft:iron_door');
        this.blacklistedBlocks.add('minecraft:copper_door');
        this.blacklistedBlocks.add('minecraft:exposed_copper_door');
        this.blacklistedBlocks.add('minecraft:weathered_copper_door');
        this.blacklistedBlocks.add('minecraft:oxidized_copper_door');
        this.blacklistedBlocks.add('minecraft:waxed_copper_door');
        this.blacklistedBlocks.add('minecraft:waxed_exposed_copper_door');
        this.blacklistedBlocks.add('minecraft:waxed_weathered_copper_door');
        this.blacklistedBlocks.add('minecraft:waxed_oxidized_copper_door');
        
        this.blacklistedBlocks.add('minecraft:oak_trapdoor');
        this.blacklistedBlocks.add('minecraft:spruce_trapdoor');
        this.blacklistedBlocks.add('minecraft:birch_trapdoor');
        this.blacklistedBlocks.add('minecraft:jungle_trapdoor');
        this.blacklistedBlocks.add('minecraft:acacia_trapdoor');
        this.blacklistedBlocks.add('minecraft:dark_oak_trapdoor');
        this.blacklistedBlocks.add('minecraft:mangrove_trapdoor');
        this.blacklistedBlocks.add('minecraft:cherry_trapdoor');
        this.blacklistedBlocks.add('minecraft:iron_trapdoor');
        this.blacklistedBlocks.add('minecraft:copper_trapdoor');
        this.blacklistedBlocks.add('minecraft:exposed_copper_trapdoor');
        this.blacklistedBlocks.add('minecraft:weathered_copper_trapdoor');
        this.blacklistedBlocks.add('minecraft:oxidized_copper_trapdoor');
        this.blacklistedBlocks.add('minecraft:waxed_copper_trapdoor');
        this.blacklistedBlocks.add('minecraft:waxed_exposed_copper_trapdoor');
        this.blacklistedBlocks.add('minecraft:waxed_weathered_copper_trapdoor');
        this.blacklistedBlocks.add('minecraft:waxed_oxidized_copper_trapdoor');
        
        // Signs
        this.blacklistedBlocks.add('minecraft:oak_sign');
        this.blacklistedBlocks.add('minecraft:spruce_sign');
        this.blacklistedBlocks.add('minecraft:birch_sign');
        this.blacklistedBlocks.add('minecraft:jungle_sign');
        this.blacklistedBlocks.add('minecraft:acacia_sign');
        this.blacklistedBlocks.add('minecraft:dark_oak_sign');
        this.blacklistedBlocks.add('minecraft:mangrove_sign');
        this.blacklistedBlocks.add('minecraft:cherry_sign');
        this.blacklistedBlocks.add('minecraft:crimson_sign');
        this.blacklistedBlocks.add('minecraft:warped_sign');
        this.blacklistedBlocks.add('minecraft:bamboo_sign');
        this.blacklistedBlocks.add('minecraft:oak_wall_sign');
        this.blacklistedBlocks.add('minecraft:spruce_wall_sign');
        this.blacklistedBlocks.add('minecraft:birch_wall_sign');
        this.blacklistedBlocks.add('minecraft:jungle_wall_sign');
        this.blacklistedBlocks.add('minecraft:acacia_wall_sign');
        this.blacklistedBlocks.add('minecraft:dark_oak_wall_sign');
        this.blacklistedBlocks.add('minecraft:mangrove_wall_sign');
        this.blacklistedBlocks.add('minecraft:cherry_wall_sign');
        this.blacklistedBlocks.add('minecraft:crimson_wall_sign');
        this.blacklistedBlocks.add('minecraft:warped_wall_sign');
        this.blacklistedBlocks.add('minecraft:bamboo_wall_sign');
        
        // Banners
        this.blacklistedBlocks.add('minecraft:white_banner');
        this.blacklistedBlocks.add('minecraft:orange_banner');
        this.blacklistedBlocks.add('minecraft:magenta_banner');
        this.blacklistedBlocks.add('minecraft:light_blue_banner');
        this.blacklistedBlocks.add('minecraft:yellow_banner');
        this.blacklistedBlocks.add('minecraft:lime_banner');
        this.blacklistedBlocks.add('minecraft:pink_banner');
        this.blacklistedBlocks.add('minecraft:gray_banner');
        this.blacklistedBlocks.add('minecraft:light_gray_banner');
        this.blacklistedBlocks.add('minecraft:cyan_banner');
        this.blacklistedBlocks.add('minecraft:purple_banner');
        this.blacklistedBlocks.add('minecraft:blue_banner');
        this.blacklistedBlocks.add('minecraft:brown_banner');
        this.blacklistedBlocks.add('minecraft:green_banner');
        this.blacklistedBlocks.add('minecraft:red_banner');
        this.blacklistedBlocks.add('minecraft:black_banner');
        
        this.blacklistedBlocks.add('minecraft:white_wall_banner');
        this.blacklistedBlocks.add('minecraft:orange_wall_banner');
        this.blacklistedBlocks.add('minecraft:magenta_wall_banner');
        this.blacklistedBlocks.add('minecraft:light_blue_wall_banner');
        this.blacklistedBlocks.add('minecraft:yellow_wall_banner');
        this.blacklistedBlocks.add('minecraft:lime_wall_banner');
        this.blacklistedBlocks.add('minecraft:pink_wall_banner');
        this.blacklistedBlocks.add('minecraft:gray_wall_banner');
        this.blacklistedBlocks.add('minecraft:light_gray_wall_banner');
        this.blacklistedBlocks.add('minecraft:cyan_wall_banner');
        this.blacklistedBlocks.add('minecraft:purple_wall_banner');
        this.blacklistedBlocks.add('minecraft:blue_wall_banner');
        this.blacklistedBlocks.add('minecraft:brown_wall_banner');
        this.blacklistedBlocks.add('minecraft:green_wall_banner');
        this.blacklistedBlocks.add('minecraft:red_wall_banner');
        this.blacklistedBlocks.add('minecraft:black_wall_banner');
        
        // Heads and skulls
        this.blacklistedBlocks.add('minecraft:skeleton_skull');
        this.blacklistedBlocks.add('minecraft:skeleton_wall_skull');
        this.blacklistedBlocks.add('minecraft:wither_skeleton_skull');
        this.blacklistedBlocks.add('minecraft:wither_skeleton_wall_skull');
        this.blacklistedBlocks.add('minecraft:zombie_head');
        this.blacklistedBlocks.add('minecraft:zombie_wall_head');
        this.blacklistedBlocks.add('minecraft:player_head');
        this.blacklistedBlocks.add('minecraft:player_wall_head');
        this.blacklistedBlocks.add('minecraft:creeper_head');
        this.blacklistedBlocks.add('minecraft:creeper_wall_head');
        this.blacklistedBlocks.add('minecraft:dragon_head');
        this.blacklistedBlocks.add('minecraft:dragon_wall_head');
        this.blacklistedBlocks.add('minecraft:piglin_head');
        this.blacklistedBlocks.add('minecraft:piglin_wall_head');
    }

    /**
     * Load all blocks from Minecraft's built-in registry
     */
    private loadBlockRegistry(): void {
        // Get all blocks from Minecraft's registry
        this.allBlocks = this.minecraft.registry.getBlocks();
        
        // Filter out blacklisted blocks
        this.safeBlocks = this.allBlocks.filter(block => !this.blacklistedBlocks.has(block));
        
        this.logger.info(`Loaded ${this.allBlocks.length} total blocks`);
        this.logger.info(`Filtered to ${this.safeBlocks.length} safe blocks for dimension generation`);
        this.logger.info(`Blacklisted ${this.blacklistedBlocks.size} problematic blocks`);
        
        if (this.safeBlocks.length === 0) {
            throw new Error('No safe blocks available after filtering. Check block blacklist configuration.');
        }
    }

    /**
     * Get a random block from the safe blocks list
     * @param seed Random seed for deterministic selection
     * @returns A random block ID
     */
    public getRandomBlock(seed: number): string {
        if (this.safeBlocks.length === 0) {
            this.logger.warn('No safe blocks available, falling back to stone');
            return 'minecraft:stone';
        }
        
        const random = this.createSeededRandom(seed);
        const index = Math.floor(random() * this.safeBlocks.length);
        return this.safeBlocks[index];
    }

    /**
     * Get a random block from the safe blocks list using BigInt seed
     * @param seed BigInt seed for deterministic selection
     * @returns A random block ID
     */
    public getRandomBlockBigInt(seed: bigint): string {
        if (this.safeBlocks.length === 0) {
            this.logger.warn('No safe blocks available, falling back to stone');
            return 'minecraft:stone';
        }
        
        const random = this.createSeededRandomBigInt(seed);
        const index = Math.floor(random() * this.safeBlocks.length);
        return this.safeBlocks[index];
    }

    /**
     * Get multiple random blocks for dimension variety
     * @param seed Random seed
     * @param count Number of blocks to get
     * @returns Array of random block IDs
     */
    public getRandomBlocks(seed: number, count: number): string[] {
        const blocks: string[] = [];
        const random = this.createSeededRandom(seed);
        
        for (let i = 0; i < count; i++) {
            const index = Math.floor(random() * this.safeBlocks.length);
            blocks.push(this.safeBlocks[index]);
        }
        
        return blocks;
    }

    /**
     * Get a random fluid block (water, lava, etc.)
     * @param seed Random seed
     * @returns A random fluid block ID
     */
    public getRandomFluid(seed: number): string {
        const fluids = [
            'minecraft:water',
            'minecraft:lava',
            'minecraft:milk' // if available
        ];
        
        const random = this.createSeededRandom(seed);
        const index = Math.floor(random() * fluids.length);
        return fluids[index];
    }

    /**
     * Check if a block is safe for dimension generation
     * @param blockId The block ID to check
     * @returns True if the block is safe, false otherwise
     */
    public isBlockSafe(blockId: string): boolean {
        return !this.blacklistedBlocks.has(blockId);
    }

    /**
     * Get the total count of safe blocks
     * @returns Number of safe blocks available
     */
    public getSafeBlockCount(): number {
        return this.safeBlocks.length;
    }

    /**
     * Get all safe blocks
     * @returns Array of all safe block IDs
     */
    public getAllSafeBlocks(): string[] {
        return [...this.safeBlocks];
    }

    /**
     * Add a block to the blacklist
     * @param blockId The block ID to blacklist
     */
    public blacklistBlock(blockId: string): void {
        this.blacklistedBlocks.add(blockId);
        this.safeBlocks = this.safeBlocks.filter(block => block !== blockId);
    }

    /**
     * Remove a block from the blacklist
     * @param blockId The block ID to remove from blacklist
     */
    public unblacklistBlock(blockId: string): void {
        this.blacklistedBlocks.delete(blockId);
        if (this.allBlocks.includes(blockId)) {
            this.safeBlocks.push(blockId);
        }
    }

    /**
     * Create a seeded random number generator
     * @param seed The seed value
     * @returns A random function that produces deterministic values
     */
    private createSeededRandom(seed: number): () => number {
        let s = seed;
        return () => {
            s = (s * 9301 + 49297) % 233280;
            return s / 233280;
        };
    }

    /**
     * Create a seeded random number generator using BigInt
     * @param seed The BigInt seed value
     * @returns A random function that produces deterministic values
     */
    private createSeededRandomBigInt(seed: bigint): () => number {
        let s = seed;
        return () => {
            s = (s * 9301n + 49297n) % 233280n;
            return Number(s) / 233280;
        };
    }
}
