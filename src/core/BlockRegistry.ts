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
            // Try multiple possible paths for blacklist file
            const possiblePaths = [
                path.join(process.cwd(), 'src', 'data', 'blockBlacklist.json'),
                path.join(__dirname, '..', 'data', 'blockBlacklist.json'),
                path.join('.', 'src', 'data', 'blockBlacklist.json'),
                './src/data/blockBlacklist.json'
            ];

            let blacklistData = null;
            let usedPath = null;

            for (const possiblePath of possiblePaths) {
                try {
                    this.logger.debug(`Trying to load blacklist from: ${possiblePath}`);
                    if ((globalThis as any).fs.existsSync(possiblePath)) {
                        const content = (globalThis as any).fs.readFileSync(possiblePath, 'utf8');

                        // Check if we got valid content (not empty fallback)
                        if (content && content.trim() !== '') {
                            blacklistData = JSON.parse(content);
                            usedPath = possiblePath;
                            break;
                        } else {
                            this.logger.warn(`Got empty content from ${possiblePath}, trying next path...`);
                        }
                    }
                } catch (pathError) {
                    // Don't catch "Moud API not ready" errors - let them propagate
                    if (pathError.message && pathError.message.includes('Moud API not ready')) {
                        throw pathError;
                    }
                    this.logger.debug(`Failed to load from ${possiblePath}: ${pathError}`);
                }
            }

            if (blacklistData) {
                this.blacklistedBlocks = new Set(blacklistData.blacklistedBlocks || []);
                this.safeBlocks = blacklistData.safeBlocks || [];
                this.logger.info(`Loaded block blacklist from ${usedPath}`);
                this.logger.info(`Blacklisted blocks: ${this.blacklistedBlocks.size}, Safe blocks: ${this.safeBlocks.length}`);
            } else {
                this.logger.warn('No blacklist file found, using fallback minimal blacklist');
                // Use a minimal safe blacklist as fallback
                this.blacklistedBlocks = new Set([
                    'air', 'cave_air', 'void_air', 'water', 'lava', 'bedrock',
                    'barrier', 'light', 'structure_void', 'moving_piston',
                    'sticky_piston', 'piston_head', 'fire', 'soul_fire'
                ]);
                this.safeBlocks = ['stone', 'dirt', 'grass_block', 'oak_log', 'oak_planks'];
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
        return new Promise((resolve, reject) => {
            const url = 'http://minecraft-ids.grahamedgecombe.com/items.json';

            https.get(url, (response) => {
                let data = '';

                response.on('data', (chunk) => {
                    data += chunk;
                });

                response.on('end', () => {
                    try {
                        const items = JSON.parse(data);
                        // Filter only blocks (type < 256 typically indicates blocks)
                        const blocks = items
                            .filter((item: any) => item.type < 256)
                            .map((item: any) => `minecraft:${item.text_type}`)
                            .filter((block: string, index: number, self: string[]) => self.indexOf(block) === index); // Remove duplicates

                        resolve(blocks);
                    } catch (error) {
                        reject(new Error(`Failed to parse API response: ${error}`));
                    }
                });
            }).on('error', (error) => {
                reject(new Error(`Failed to fetch from API: ${error}`));
            });
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
