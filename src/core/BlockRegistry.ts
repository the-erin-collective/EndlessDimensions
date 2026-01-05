/// <reference types="@epi-studio/moud-sdk" />
import { Logger } from '../utils/Logger';
import * as fs from 'fs';
import * as path from 'path';

export class BlockRegistry {
    private minecraft: Minecraft;
    private allBlocks: string[];
    private blacklistedBlocks: Set<string>;
    private safeBlocks: string[];
    private logger: Logger;

    constructor(api: any) {
        this.minecraft = api;
        this.logger = { info: console.log, error: console.error, warn: console.warn };
        this.allBlocks = [];
        this.blacklistedBlocks = new Set();
        this.safeBlocks = [];
        this.initializeBlacklist();
        this.loadBlockRegistry();
    }

    /**
     * Initialize the blacklist of blocks that should NOT be used as default blocks
     * Loads from external JSON file for better organization
     */
    private initializeBlacklist(): void {
        try {
            const blacklistPath = path.join(__dirname, '..', 'data', 'blockBlacklist.json');
            const blacklistData = JSON.parse(fs.readFileSync(blacklistPath, 'utf8'));
            
            this.blacklistedBlocks = new Set();
            
            // Load all blocks from all categories
            for (const category of Object.values(blacklistData.categories)) {
                for (const block of category.blocks) {
                    this.blacklistedBlocks.add(block);
                }
            }
            
            this.logger.info(`Loaded blacklist with ${this.blacklistedBlocks.size} blocks from ${Object.keys(blacklistData.categories).length} categories`);
            
        } catch (error) {
            this.logger.error('Failed to load block blacklist from file, using fallback minimal blacklist', error);
            
            // Fallback to essential blacklisted blocks if file loading fails
            this.blacklistedBlocks = new Set([
                'minecraft:air',
                'minecraft:void_air',
                'minecraft:cave_air',
                'minecraft:barrier',
                'minecraft:structure_void',
                'minecraft:light',
                'minecraft:oak_leaves',
                'minecraft:spruce_leaves',
                'minecraft:birch_leaves',
                'minecraft:jungle_leaves',
                'minecraft:acacia_leaves',
                'minecraft:dark_oak_leaves',
                'minecraft:azalea_leaves',
                'minecraft:flowering_azalea_leaves',
                'minecraft:mangrove_leaves',
                'minecraft:cherry_leaves'
            ]);
        }
    }

    /**
     * Load all blocks from Minecraft's built-in registry
     */
    private loadBlockRegistry(): void {
        // Get all blocks from Minecraft's registry
        this.allBlocks = this.minecraft.registry.getBlocks();
        
        // Filter out blacklisted blocks and technical blocks
        this.safeBlocks = this.allBlocks.filter(block => {
            // Skip blacklisted blocks
            if (this.blacklistedBlocks.has(block)) {
                return false;
            }
            
            // Skip technical blocks that don't have corresponding items
            try {
                const block = this.minecraft.registry.getBlock(block);
                if (!block || !block.asItem || block.asItem().toString() === 'minecraft:air') {
                    return false;
                }
            } catch (error) {
                // If we can't get the block or its item, skip it
                return false;
            }
            
            return true;
        });
        
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
