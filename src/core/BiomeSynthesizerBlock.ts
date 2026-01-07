/// <reference types="@epi-studio/moud-sdk" />
import { Logger } from '../utils/Logger';
import { CustomBlockRegistry } from './CustomBlockRegistry';

export interface BiomeSynthesizerBlockConfig {
    blockId: string;
    itemId: string;
    displayName: string;
    hardness: number;
    resistance: number;
    lightLevel: number;
    hasCollision: boolean;
    particleEffect: string;
    soundGroup: string;
}

export class BiomeSynthesizerBlock {
    private logger: Logger;
    private api: MoudAPI;
    private customBlockRegistry: CustomBlockRegistry;
    private blockConfig: BiomeSynthesizerBlockConfig;

    constructor(api: MoudAPI, customBlockRegistry: CustomBlockRegistry) {
        this.api = api;
        this.logger = new Logger('BiomeSynthesizerBlock');
        this.customBlockRegistry = customBlockRegistry;
        this.blockConfig = this.initializeBlockConfig();
    }

    /**
     * Initialize block configuration
     */
    private initializeBlockConfig(): BiomeSynthesizerBlockConfig {
        return {
            blockId: 'endlessdimensions:biome_synthesizer',
            itemId: 'endlessdimensions:biome_synthesizer',
            displayName: 'Biome Synthesizer',
            hardness: 2.0,
            resistance: 6.0,
            lightLevel: 8,
            hasCollision: true,
            particleEffect: 'minecraft:enchant',
            soundGroup: 'stone'
        };
    }

    /**
     * Register the Biome Synthesizer block
     */
    public async registerBlock(): Promise<boolean> {
        try {
            this.logger.info('Registering Biome Synthesizer block...');

            // Register the custom block using the existing CustomBlockRegistry
            const success = await this.customBlockRegistry.registerBlock(
                this.blockConfig.blockId,
                {
                    name: this.blockConfig.displayName,
                    material: 'minecraft:iron',
                    hardness: this.blockConfig.hardness,
                    resistance: this.blockConfig.resistance,
                    lightLevel: this.blockConfig.lightLevel,
                    hasCollision: this.blockConfig.hasCollision,
                    requiresCorrectToolForDrops: false,
                    stackSize: 64,
                    itemModel: this.blockConfig.itemId
                },
                {
                    // Block properties for custom behavior
                    onRightClick: (player, position, blockState) => {
                        this.handleBlockRightClick(player, position, blockState);
                        return true;
                    },
                    onBreak: (player, position, blockState) => {
                        this.handleBlockBreak(player, position, blockState);
                        return true;
                    },
                    onPlace: (player, position, blockState) => {
                        this.handleBlockPlace(player, position, blockState);
                        return true;
                    }
                }
            );

            if (success) {
                this.logger.info(`Successfully registered Biome Synthesizer block: ${this.blockConfig.blockId}`);
                
                // Register the item for the block
                await this.registerBlockItem();
                
                // Register the crafting recipe
                await this.registerCraftingRecipe();
                
                return true;
            } else {
                this.logger.error(`Failed to register Biome Synthesizer block: ${this.blockConfig.blockId}`);
                return false;
            }

        } catch (error) {
            this.logger.error('Error registering Biome Synthesizer block:', error);
            return false;
        }
    }

    /**
     * Register the block item
     */
    private async registerBlockItem(): Promise<void> {
        try {
            // Register the item that places the block
            await this.api.items.registerItem({
                id: this.blockConfig.itemId,
                name: this.blockConfig.displayName,
                maxStackSize: 64,
                maxDamage: 0,
                hasGlint: false,
                blockItem: {
                    blockId: this.blockConfig.blockId,
                    properties: {}
                },
                customModel: {
                    parent: 'minecraft:item/generated',
                    textures: {
                        layer0: this.blockConfig.itemId
                    }
                }
            });

            this.logger.info(`Registered Biome Synthesizer item: ${this.blockConfig.itemId}`);

        } catch (error) {
            this.logger.error('Error registering Biome Synthesizer item:', error);
        }
    }

    /**
     * Register the crafting recipe
     */
    private async registerCraftingRecipe(): Promise<void> {
        try {
            // Create the crafting recipe using world type unlocker items
            await this.api.crafting.registerShapedRecipe({
                result: {
                    id: this.blockConfig.itemId,
                    count: 1
                },
                pattern: [
                    ['E', 'A', 'E'], // Emerald Block
                    ['A', 'D', 'A'], // Ancient Debris  
                    ['E', 'E', 'E'], // Eye of Ender
                    ['D', 'B', 'D'], // Diamond Block
                    ['N', 'B', 'N']  // Netherite Block
                ],
                key: {
                    E: 'minecraft:emerald_block',
                    A: 'minecraft:ancient_debris',
                    D: 'minecraft:diamond_block',
                    B: 'minecraft:netherite_block',
                    N: 'minecraft:netherite_block'
                }
            });

            this.logger.info('Registered Biome Synthesizer crafting recipe');

        } catch (error) {
            this.logger.error('Error registering Biome Synthesizer crafting recipe:', error);
        }
    }

    /**
     * Handle right-click on the synthesizer block
     */
    private handleBlockRightClick(player: string, position: any, blockState: any): void {
        try {
            this.logger.info(`Player ${player} right-clicked Biome Synthesizer at position ${JSON.stringify(position)}`);
            
            // Send custom event to open the GUI
            this.api.events.emit('synthesizer_block_right_click', {
                playerId: player,
                position: position,
                blockState: blockState
            });

        } catch (error) {
            this.logger.error('Error handling synthesizer block right-click:', error);
        }
    }

    /**
     * Handle block being broken
     */
    private handleBlockBreak(player: string, position: any, blockState: any): void {
        try {
            this.logger.info(`Player ${player} broke Biome Synthesizer at position ${JSON.stringify(position)}`);
            
            // Send event for block break
            this.api.events.emit('synthesizer_block_break', {
                playerId: player,
                position: position,
                blockState: blockState
            });

        } catch (error) {
            this.logger.error('Error handling synthesizer block break:', error);
        }
    }

    /**
     * Handle block being placed
     */
    private handleBlockPlace(player: string, position: any, blockState: any): void {
        try {
            this.logger.info(`Player ${player} placed Biome Synthesizer at position ${JSON.stringify(position)}`);
            
            // Send event for block place
            this.api.events.emit('synthesizer_block_place', {
                playerId: player,
                position: position,
                blockState: blockState
            });

        } catch (error) {
            this.logger.error('Error handling synthesizer block place:', error);
        }
    }

    /**
     * Get block configuration
     */
    public getBlockConfig(): BiomeSynthesizerBlockConfig {
        return this.blockConfig;
    }

    /**
     * Get block ID
     */
    public getBlockId(): string {
        return this.blockConfig.blockId;
    }

    /**
     * Get item ID
     */
    public getItemId(): string {
        return this.blockConfig.itemId;
    }

    /**
     * Check if a block ID is the synthesizer block
     */
    public isSynthesizerBlock(blockId: string): boolean {
        return blockId === this.blockConfig.blockId;
    }

    /**
     * Get statistics about the synthesizer block
     */
    public getStatistics(): {
        blockId: string;
        itemId: string;
        displayName: string;
        registeredAt: string;
    } {
        return {
            blockId: this.blockConfig.blockId,
            itemId: this.blockConfig.itemId,
            displayName: this.blockConfig.displayName,
            registeredAt: new Date().toISOString()
        };
    }
}
