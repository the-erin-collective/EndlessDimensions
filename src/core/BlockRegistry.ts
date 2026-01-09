/// <reference types="@epi-studio/moud-sdk" />
import { Logger } from '../utils/Logger';
import * as path from 'path';
import * as https from 'https';

export class BlockRegistry {
    private api: MoudAPI;
    private allBlocks: string[];
    private blacklistedBlocks: Set<string>;
    private safeBlocks: string[];
    private logger: Logger;

    constructor(api: MoudAPI) {
        this.api = api;
        this.logger = new Logger('BlockRegistry');
        this.allBlocks = [];
        this.blacklistedBlocks = new Set();
        this.safeBlocks = [];
        // IMPORTANT: Do NOT initialize here - wait for initialize() to be called
        this.logger.info('BlockRegistry constructor completed - waiting for initialize() to be called');
    }

    /**
     * Initialize block registry (must be called after construction)
     */
    public async initialize(): Promise<void> {
        this.logger.info('Initializing BlockRegistry...');

        return new Promise<void>((resolve, reject) => {
            const onReady = () => {
                try {
                    console.log('[BlockRegistry] Moud API is ready! Initializing block data...');
                    this.initializeBlacklist();
                    this.loadBlockRegistry().then(() => resolve()).catch(reject);
                } catch (error) {
                    this.logger.error('Error during BlockRegistry initialization sequence:', error);
                    reject(error);
                }
            };

            if ((globalThis as any).onMoudReady) {
                (globalThis as any).onMoudReady(onReady);
            } else {
                // Fallback polling if polyfill not present
                const checkApi = () => {
                    if (typeof (globalThis as any).api !== 'undefined' && typeof (globalThis as any).fs !== 'undefined') {
                        onReady();
                    } else {
                        setTimeout(checkApi, 100);
                    }
                };
                checkApi();
            }
        });
    }

    /**
     * Initialize the blacklist of blocks that should NOT be used as default blocks
     * Loads from external JSON file for better organization
     */
    private initializeBlacklist(): void {
        try {
            let blacklistData = null;
            let usedPath = null;

            // Try Engine Assets system
            if ((this.api as any).assets && (this.api as any).assets.loadText) {
                try {
                    const assetPath = 'endlessdimensions:blockBlacklist.json';
                    this.logger.debug(`Loading blacklist from Assets: ${assetPath}`);
                    const content = (this.api as any).assets.loadText(assetPath);
                    if (content) {
                        blacklistData = JSON.parse(content);
                        usedPath = `Asset:${assetPath}`;
                    }
                } catch (e) {
                    this.logger.debug(`Failed to load blacklist asset: ${e}`);
                }
            }

            // Fallback: Minimal hardcoded list if asset not found
            if (!blacklistData) {
                this.logger.warn('No blacklist asset found, using fallback minimal blacklist');
                this.blacklistedBlocks = new Set([
                    'air', 'cave_air', 'void_air', 'water', 'lava', 'bedrock',
                    'barrier', 'light', 'structure_void', 'moving_piston',
                    'sticky_piston', 'piston_head', 'fire', 'soul_fire'
                ]);
                this.safeBlocks = ['stone', 'dirt', 'grass_block', 'oak_log', 'oak_planks'];
            } else {
                this.blacklistedBlocks = new Set(blacklistData.blacklistedBlocks || []);
                this.safeBlocks = blacklistData.safeBlocks || [];
                this.logger.info(`Loaded block blacklist from ${usedPath}`);
                this.logger.info(`Blacklisted blocks: ${this.blacklistedBlocks.size}, Safe blocks: ${this.safeBlocks.length}`);
            }
        } catch (error) {
            this.logger.error('Failed to initialize block blacklist', error);
            // Use minimal fallback
            this.blacklistedBlocks = new Set([
                'air', 'cave_air', 'void_air', 'water', 'lava', 'bedrock',
                'barrier', 'light', 'structure_void', 'moving_piston',
                'sticky_piston', 'piston_head', 'fire', 'soul_fire',
                'minecraft:jungle_leaves',
                'minecraft:acacia_leaves',
                'minecraft:dark_oak_leaves',
                'minecraft:azalea_leaves',
                'minecraft:flowering_azalea_leaves',
                'minecraft:mangrove_leaves',
                'minecraft:cherry_leaves'
            ]);
            this.safeBlocks = ['stone', 'dirt', 'grass_block', 'oak_log', 'oak_planks'];
        }
    }

    /**
     * Load all blocks dynamically from external API
     */
    private async loadBlockRegistry(): Promise<void> {
        try {
            // Fetch blocks dynamically from official Minecraft API
            this.allBlocks = await this.fetchBlocksFromAPI();
            this.logger.info(`Successfully fetched ${this.allBlocks.length} blocks from external API`);
        } catch (error) {
            this.logger.error('Failed to fetch blocks from API', error);
            throw new Error(`Unable to load block registry: ${error}. The server requires internet access to fetch the latest Minecraft blocks.`);
        }

        // Filter out blacklisted blocks - this is the original approach you preferred
        this.safeBlocks = this.allBlocks.filter(block => {
            return !this.blacklistedBlocks.has(block);
        });

        this.logger.info(`Loaded ${this.allBlocks.length} total blocks`);
        this.logger.info(`Filtered to ${this.safeBlocks.length} safe blocks for dimension generation`);
        this.logger.info(`Blacklisted ${this.blacklistedBlocks.size} problematic blocks`);

        if (this.safeBlocks.length === 0) {
            throw new Error('No safe blocks available after filtering. Check block blacklist configuration.');
        }
    }

    /**
     * Fetch block list from external Minecraft API
     */
    private async fetchBlocksFromAPI(): Promise<string[]> {
        const fallbacks = [
            'minecraft:stone', 'minecraft:granite', 'minecraft:polished_granite', 'minecraft:diorite',
            'minecraft:polished_diorite', 'minecraft:andesite', 'minecraft:polished_andesite', 'minecraft:grass_block',
            'minecraft:dirt', 'minecraft:coarse_dirt', 'minecraft:podzol', 'minecraft:cobblestone', 'minecraft:oak_planks',
            'minecraft:spruce_planks', 'minecraft:birch_planks', 'minecraft:jungle_planks', 'minecraft:acacia_planks',
            'minecraft:dark_oak_planks', 'minecraft:mangrove_planks', 'minecraft:cherry_planks', 'minecraft:bamboo_planks',
            'minecraft:bedrock', 'minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel', 'minecraft:gold_ore',
            'minecraft:iron_ore', 'minecraft:coal_ore', 'minecraft:nether_gold_ore', 'minecraft:oak_log',
            'minecraft:spruce_log', 'minecraft:birch_log', 'minecraft:jungle_log', 'minecraft:acacia_log',
            'minecraft:dark_oak_log', 'minecraft:mangrove_log', 'minecraft:cherry_log', 'minecraft:glass',
            'minecraft:lapis_ore', 'minecraft:lapis_block', 'minecraft:sandstone', 'minecraft:chiseled_sandstone',
            'minecraft:cut_sandstone', 'minecraft:white_wool', 'minecraft:orange_wool', 'minecraft:magenta_wool',
            'minecraft:light_blue_wool', 'minecraft:yellow_wool', 'minecraft:lime_wool', 'minecraft:pink_wool',
            'minecraft:gray_wool', 'minecraft:light_gray_wool', 'minecraft:cyan_wool', 'minecraft:purple_wool',
            'minecraft:blue_wool', 'minecraft:brown_wool', 'minecraft:green_wool', 'minecraft:red_wool',
            'minecraft:black_wool', 'minecraft:oak_leaves', 'minecraft:spruce_leaves', 'minecraft:birch_leaves',
            'minecraft:jungle_leaves', 'minecraft:acacia_leaves', 'minecraft:dark_oak_leaves', 'minecraft:mangrove_leaves',
            'minecraft:cherry_leaves', 'minecraft:azalea_leaves', 'minecraft:flowering_azalea_leaves',
            'minecraft:gold_block', 'minecraft:iron_block', 'minecraft:bricks', 'minecraft:mossy_cobblestone',
            'minecraft:obsidian', 'minecraft:diamond_ore', 'minecraft:diamond_block', 'minecraft:netherrack',
            'minecraft:soul_sand', 'minecraft:soul_soil', 'minecraft:basalt', 'minecraft:polished_basalt',
            'minecraft:end_stone', 'minecraft:emerald_ore', 'minecraft:emerald_block', 'minecraft:quartz_block',
            'minecraft:white_terracotta', 'minecraft:orange_terracotta', 'minecraft:magenta_terracotta',
            'minecraft:light_blue_terracotta', 'minecraft:yellow_terracotta', 'minecraft:lime_terracotta',
            'minecraft:pink_terracotta', 'minecraft:gray_terracotta', 'minecraft:light_gray_terracotta',
            'minecraft:cyan_terracotta', 'minecraft:purple_terracotta', 'minecraft:blue_terracotta',
            'minecraft:brown_terracotta', 'minecraft:green_terracotta', 'minecraft:red_terracotta',
            'minecraft:black_terracotta', 'minecraft:prismarine', 'minecraft:prismarine_bricks',
            'minecraft:dark_prismarine', 'minecraft:sea_lantern', 'minecraft:terracotta', 'minecraft:coal_block',
            'minecraft:packed_ice', 'minecraft:red_sandstone', 'minecraft:purpur_block', 'minecraft:purpur_pillar',
            'minecraft:magma_block', 'minecraft:nether_wart_block', 'minecraft:red_nether_bricks',
            'minecraft:bone_block', 'minecraft:blue_ice', 'minecraft:netherite_block', 'minecraft:ancient_debris',
            'minecraft:crying_obsidian', 'minecraft:blackstone', 'minecraft:gilded_blackstone',
            'minecraft:polished_blackstone', 'minecraft:chiseled_polished_blackstone', 'minecraft:polished_blackstone_bricks',
            'minecraft:cracked_polished_blackstone_bricks', 'minecraft:tuff', 'minecraft:calcite', 'minecraft:dripstone_block',
            'minecraft:deepslate', 'minecraft:cobbled_deepslate', 'minecraft:polished_deepslate',
            'minecraft:deepslate_bricks', 'minecraft:deepslate_tiles', 'minecraft:chiseled_deepslate',
            'minecraft:cracked_deepslate_bricks', 'minecraft:cracked_deepslate_tiles', 'minecraft:sculk',
            'minecraft:mud', 'minecraft:mud_bricks', 'minecraft:packed_mud'
        ];

        return new Promise((resolve) => {
            const url = 'http://minecraft-ids.grahamedgecombe.com/items.json';

            // Safety timeout for API fetch
            const timeout = setTimeout(() => {
                this.logger.warn('Block list API request timed out, using fallback list.');
                resolve(fallbacks);
            }, 3000);

            try {
                https.get(url, (response) => {
                    let data = '';
                    response.on('data', (chunk) => { data += chunk; });
                    response.on('end', () => {
                        clearTimeout(timeout);
                        try {
                            const items = JSON.parse(data);
                            const blocks = items
                                .filter((item: any) => item.type < 256)
                                .map((item: any) => `minecraft:${item.text_type}`)
                                .filter((block: string, index: number, self: string[]) => self.indexOf(block) === index);
                            resolve(blocks.length > 0 ? blocks : fallbacks);
                        } catch (error) {
                            this.logger.error('Failed to parse API response, using fallbacks.', error);
                            resolve(fallbacks);
                        }
                    });
                }).on('error', (error) => {
                    clearTimeout(timeout);
                    this.logger.warn(`API fetch failed: ${error.message}. Using fallback block list.`);
                    resolve(fallbacks);
                });
            } catch (err) {
                clearTimeout(timeout);
                this.logger.warn('Environment does not support external HTTP requests. Using fallbacks.');
                resolve(fallbacks);
            }
        });
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
