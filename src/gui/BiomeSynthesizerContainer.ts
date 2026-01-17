/// <reference types="@epi-studio/moud-sdk" />
import { Logger } from '../utils/Logger';
import { VirtualGridController, SynthesizerGrid, BiomeColumn, WorldType } from '../core/VirtualGridController';
import { ItemBlockMapper } from '../core/ItemBlockMapper';
import { EasterEggBridge } from '../core/EasterEggBridge';

export interface ContainerSlot {
    id: number;
    itemId: string | null;
    count: number;
    displayName: string;
    isValid: boolean;
    isLocked: boolean;
    slotType: 'world_type' | 'base_biome' | 'surface_block' | 'stone_block' | 'liquid_block' | 'tree_logs' | 'tree_leaves' | 'ores' | 'craft';
}

export interface BiomeSynthesizerSession {
    playerId: string;
    containerId: string;
    gridController: VirtualGridController;
    slots: Map<number, ContainerSlot>;
    isOpen: boolean;
    lastUpdate: number;
}

export class BiomeSynthesizerContainer {
    private api: MoudAPI;
    private logger: Logger;
    private activeContainers: Map<string, BiomeSynthesizerSession>;

    private itemBlockMapper: ItemBlockMapper;
    private easterEggBridge: EasterEggBridge;
    private nextContainerId: number = 1;

    // Container layout constants
    private static readonly CONTAINER_SIZE = 54;
    private static readonly SLOTS = {
        WORLD_TYPE: 10,
        BIOME_BASES: [19, 28, 37, 46],
        POWER_SLOTS: [3, 4, 5, 6],
        REPLACEMENT_COLUMNS: [
            [12, 21, 30, 39, 48, 57],
            [13, 22, 31, 40, 49, 58],
            [14, 23, 32, 41, 50, 59],
            [15, 24, 33, 42, 51, 60]
        ],
        OUTPUT: 25
    };
    private static readonly REPLACEMENT_ROW_TYPES: Array<'tree_leaves' | 'tree_logs' | 'surface_block' | 'stone_block' | 'ores' | 'liquid_block'> = [
        'tree_leaves', 'tree_logs', 'surface_block', 'stone_block', 'ores', 'liquid_block'
    ];
    private static readonly CRAFT_BUTTON_SLOT = 25;
    private static readonly CONTAINER_WIDTH = 9;
    private static readonly CONTAINER_HEIGHT = 6;

    constructor(
        api: MoudAPI,
        itemBlockMapper: ItemBlockMapper,
        easterEggBridge: EasterEggBridge
    ) {
        this.api = api;
        this.logger = new Logger('BiomeSynthesizerContainer');
        this.activeContainers = new Map();
        this.itemBlockMapper = itemBlockMapper;
        this.easterEggBridge = easterEggBridge;

        this.initializeEventHandlers();
    }

    /**
     * Initialize event handlers for container interactions
     */
    private initializeEventHandlers(): void {
        // Listen for synthesizer block right-click events
        this.api.events.on('synthesizer_block_right_click', (event) => {
            this.openContainer(event.playerId, event.position);
        });

        // Listen for synthesizer block break events
        this.api.events.on('synthesizer_block_break', (event) => {
            this.closeContainer(event.playerId);
        });

        // Listen for container click events
        this.api.events.on('container_click', (event) => {
            if (this.isSynthesizerContainer(event.containerId)) {
                this.handleContainerClick(event.playerId, event.containerId, event.slotId, event.clickType, event.carriedItem);
            }
        });

        // Listen for container close events
        this.api.events.on('container_close', (event) => {
            if (this.isSynthesizerContainer(event.containerId)) {
                this.closeContainer(event.playerId);
            }
        });

        this.logger.info('Initialized Biome Synthesizer Container event handlers');
    }

    /**
     * Open a new synthesizer container for a player
     */
    public openContainer(playerId: string, position: any): void {
        try {
            this.logger.info(`Opening Biome Synthesizer container for player: ${playerId}`);

            // Check if player already has an open container
            if (this.activeContainers.has(playerId)) {
                this.closeContainer(playerId);
            }

            // Create new container
            const containerId = `synthesizer_${this.nextContainerId++}`;
            const container: BiomeSynthesizerSession = {
                playerId,
                containerId,
                gridController: new VirtualGridController(),
                slots: new Map(),
                isOpen: true,
                lastUpdate: Date.now()
            };

            // Initialize slots
            this.initializeContainerSlots(container);

            // Register container
            this.registerContainer(container);

            // Store active container
            this.activeContainers.set(playerId, container);

            // Send container open packet to client
            this.sendContainerOpenPacket(playerId, container);

            this.logger.info(`Opened container ${containerId} for player ${playerId}`);

        } catch (error) {
            this.logger.error(`Error opening container for player ${playerId}:`, error);
        }
    }

    /**
     * Initialize container slots with proper layout
     */
    private initializeContainerSlots(container: BiomeSynthesizerSession): void {
        const grid = container.gridController.getGrid();

        // Initialize world type row (slots 0-4)
        for (let i = 0; i < 5; i++) {
            const slot: ContainerSlot = {
                id: i,
                itemId: null,
                count: 0,
                displayName: this.getWorldTypeDisplayName(i),
                isValid: false,
                isLocked: false,
                slotType: 'world_type'
            };
            container.slots.set(i, slot);
        }

        // Initialize columns (slots 10-47)
        for (let col = 0; col < 5; col++) {
            const column = grid.columns[col];

            for (let row = 0; row < 7; row++) {
                const slotId = 10 + (col * 8) + row;
                const slotType = this.getSlotTypeForPosition(row);
                const isLocked = !this.isSlotUnlocked(container.gridController, col, slotType);

                const slot: ContainerSlot = {
                    id: slotId,
                    itemId: this.getSlotItemId(column, slotType),
                    count: 1,
                    displayName: this.getSlotDisplayName(slotType, column),
                    isValid: !isLocked && this.getSlotItemId(column, slotType) !== null,
                    isLocked,
                    slotType: slotType as any
                };
                container.slots.set(slotId, slot);
            }
        }

        // Initialize craft button (slot 45)
        const craftSlot: ContainerSlot = {
            id: BiomeSynthesizerContainer.CRAFT_BUTTON_SLOT,
            itemId: 'minecraft:crafting_table',
            count: 1,
            displayName: 'Craft Dimension',
            isValid: container.gridController.canCraft(),
            isLocked: false,
            slotType: 'craft'
        };
        container.slots.set(BiomeSynthesizerContainer.CRAFT_BUTTON_SLOT, craftSlot);
    }

    /**
     * Register container with the server
     */
    private registerContainer(container: BiomeSynthesizerSession): void {
        try {
            // Register container type
            this.api.containers.registerContainerType({
                id: container.containerId,
                name: 'Biome Synthesizer',
                width: BiomeSynthesizerContainer.CONTAINER_WIDTH,
                height: BiomeSynthesizerContainer.CONTAINER_HEIGHT,
                slots: this.createSlotDefinitions(container)
            });

            this.logger.info(`Registered container type: ${container.containerId}`);

        } catch (error) {
            this.logger.error(`Error registering container ${container.containerId}:`, error);
        }
    }

    /**
     * Create slot definitions for container registration
     */
    private createSlotDefinitions(container: BiomeSynthesizerSession): any[] {
        const slotDefinitions: any[] = [];

        // Add all slots to definition
        for (const [slotId, slot] of container.slots.entries()) {
            slotDefinitions.push({
                id: slotId,
                type: this.getSlotDefinitionType(slot.slotType),
                x: slotId % BiomeSynthesizerContainer.CONTAINER_WIDTH,
                y: Math.floor(slotId / BiomeSynthesizerContainer.CONTAINER_WIDTH),
                locked: slot.isLocked,
                icon: this.getSlotIcon(slot),
                tooltip: this.getSlotTooltip(slot)
            });
        }

        return slotDefinitions;
    }

    /**
     * Get slot definition type for registration
     */
    private getSlotDefinitionType(slotType: string): string {
        switch (slotType) {
            case 'world_type':
                return 'input';
            case 'base_biome':
                return 'input';
            case 'craft':
                return 'output';
            default:
                return 'input';
        }
    }

    /**
     * Get slot icon for display
     */
    private getSlotIcon(slot: ContainerSlot): string {
        if (slot.isLocked) {
            return 'minecraft:gray_stained_glass_pane';
        }
        if (slot.itemId) {
            return slot.itemId;
        }
        if (slot.slotType === 'world_type') {
            return 'minecraft:ender_chest';
        }
        if (slot.slotType === 'base_biome') {
            return 'minecraft:oak_sapling';
        }
        if (slot.slotType === 'craft') {
            return 'minecraft:crafting_table';
        }
        return 'minecraft:air';
    }

    /**
     * Get slot tooltip
     */
    private getSlotTooltip(slot: ContainerSlot): string[] {
        const tooltips: string[] = [];

        if (slot.isLocked) {
            tooltips.push('┬º8Locked');
            tooltips.push('┬º7Place items in previous slots to unlock');
            return tooltips;
        }

        switch (slot.slotType) {
            case 'world_type':
                tooltips.push('┬ºeWorld Type Slot');
                tooltips.push('┬º7Place world type unlocker item:');
                tooltips.push('┬º7ΓÇó Emerald Block ΓåÆ Normal');
                tooltips.push('┬º7ΓÇó Ancient Debris ΓåÆ Nether');
                tooltips.push('┬º7ΓÇó Eye of Ender ΓåÆ The End');
                tooltips.push('┬º7ΓÇó Diamond Block ΓåÆ Superflat');
                tooltips.push('┬º7ΓÇó Netherite Block ΓåÆ Amplified');
                break;
            case 'base_biome':
                tooltips.push('┬ºeBase Biome Slot');
                tooltips.push('┬º7Place biome item (sapling/fungus)');
                tooltips.push('┬º7Unlocks other slots in this column');
                break;
            case 'surface_block':
                tooltips.push('┬ºeSurface Block Slot');
                tooltips.push('┬º7Replace surface blocks in biome');
                break;
            case 'stone_block':
                tooltips.push('┬ºeStone Block Slot');
                tooltips.push('┬º7Replace stone layers in biome');
                break;
            case 'liquid_block':
                tooltips.push('┬ºeLiquid Block Slot');
                tooltips.push('┬º7Replace liquids in biome');
                break;
            case 'tree_logs':
                tooltips.push('┬ºeTree Logs Slot');
                tooltips.push('┬º7Replace tree logs in biome');
                break;
            case 'tree_leaves':
                tooltips.push('┬ºeTree Leaves Slot');
                tooltips.push('┬º7Replace tree leaves in biome');
                break;
            case 'ores':
                tooltips.push('┬ºeOres Slot');
                tooltips.push('┬º7Replace ores in biome');
                break;
            case 'craft':
                tooltips.push('┬ºeCraft Dimension');
                tooltips.push('┬º7Click to create dimension');
                tooltips.push('┬º7from your configuration');
                break;
        }

        if (slot.itemId && !slot.isLocked) {
            tooltips.push(`┬º7Current: ${slot.displayName}`);
        }

        return tooltips;
    }

    /**
     * Send container open packet to client
     */
    private sendContainerOpenPacket(playerId: string, container: BiomeSynthesizerSession): void {
        try {
            // Send container open packet
            this.api.network.sendPacket(playerId, {
                type: 'ClientboundOpenScreenPacket',
                containerId: container.containerId,
                title: 'Biome Synthesizer',
                windowType: 9, // Generic 9x6 container
                slots: Array.from(container.slots.values())
            });

            // Send initial slot contents
            for (const [slotId, slot] of container.slots.entries()) {
                this.sendSlotUpdatePacket(playerId, container.containerId, slotId, slot);
            }

        } catch (error) {
            this.logger.error(`Error sending container open packet for player ${playerId}:`, error);
        }
    }

    /**
     * Send slot update packet
     */
    private sendSlotUpdatePacket(playerId: string, containerId: string, slotId: number, slot: ContainerSlot): void {
        try {
            this.api.network.sendPacket(playerId, {
                type: 'ClientboundSetSlotPacket',
                containerId: containerId,
                slot: slotId,
                itemStack: {
                    id: slot.itemId || 'minecraft:air',
                    count: slot.count,
                    displayName: slot.displayName,
                    lore: this.getSlotTooltip(slot)
                }
            });
        } catch (error) {
            this.logger.error(`Error sending slot update for slot ${slotId}:`, error);
        }
    }

    /**
     * Handle container click event
     */
    private handleContainerClick(playerId: string, containerId: string, slotId: number, clickType: string, carriedItem: any): void {
        try {
            const container = this.activeContainers.get(playerId);
            if (!container || container.containerId !== containerId) {
                return;
            }

            const slot = container.slots.get(slotId);
            if (!slot) {
                return;
            }

            // Handle different click types
            switch (clickType) {
                case 'PICKUP':
                    this.handlePickupClick(container, slot, carriedItem);
                    break;
                case 'QUICK_MOVE':
                    this.handleQuickMoveClick(container, slot, carriedItem);
                    break;
                case 'SWAP':
                    this.handleSwapClick(container, slot, carriedItem);
                    break;
                default:
                    this.handleDefaultClick(container, slot, carriedItem);
                    break;
            }

            // Update craft button state
            this.updateCraftButton(container);

            // Send slot update to client
            this.sendSlotUpdatePacket(playerId, containerId, slotId, slot);

            container.lastUpdate = Date.now();

        } catch (error) {
            this.logger.error(`Error handling container click for player ${playerId}:`, error);
        }
    }

    /**
     * Handle pickup click (left-click)
     */
    private handlePickupClick(container: BiomeSynthesizerSession, slot: ContainerSlot, carriedItem: any): void {
        if (slot.isLocked) {
            return;
        }

        if (slot.slotType === 'craft') {
            // Handle craft button click
            this.handleCraftClick(container);
            return;
        }

        // Handle item placement/removal
        if (carriedItem && carriedItem.id) {
            // Place item
            if (this.canPlaceItemInSlot(slot, carriedItem.id)) {
                this.placeItemInSlot(container, slot, carriedItem.id);
            }
        } else if (slot.itemId) {
            // Remove item
            this.removeItemFromSlot(container, slot);
        }
    }

    /**
     * Handle quick move click (shift-click)
     */
    private handleQuickMoveClick(container: BiomeSynthesizerSession, slot: ContainerSlot, carriedItem: any): void {
        if (slot.isLocked) {
            return;
        }

        // Clear slot on shift-click
        if (slot.itemId) {
            this.removeItemFromSlot(container, slot);
        }
    }

    /**
     * Handle swap click (right-click)
     */
    private handleSwapClick(container: BiomeSynthesizerSession, slot: ContainerSlot, carriedItem: any): void {
        if (slot.isLocked) {
            return;
        }

        if (carriedItem && carriedItem.id && this.canPlaceItemInSlot(slot, carriedItem.id)) {
            // Swap or place single item
            if (slot.itemId === carriedItem.id) {
                this.removeItemFromSlot(container, slot);
            } else {
                this.placeItemInSlot(container, slot, carriedItem.id);
            }
        }
    }

    /**
     * Handle default click
     */
    private handleDefaultClick(container: BiomeSynthesizerSession, slot: ContainerSlot, carriedItem: any): void {
        if (slot.isLocked) {
            return;
        }

        if (carriedItem && carriedItem.id && this.canPlaceItemInSlot(slot, carriedItem.id)) {
            this.placeItemInSlot(container, slot, carriedItem.id);
        }
    }

    /**
     * Check if item can be placed in slot
     */
    private canPlaceItemInSlot(slot: ContainerSlot, itemId: string): boolean {
        if (slot.isLocked) {
            return false;
        }

        switch (slot.slotType) {
            case 'world_type':
                return this.itemBlockMapper.isWorldTypeItem(itemId);
            case 'base_biome':
                return this.itemBlockMapper.isBaseBiomeItem(itemId);
            case 'craft':
                return false; // Craft button doesn't accept items
            default:
                // Block slots accept any valid block
                return this.itemBlockMapper.mapItemToBlock(itemId) !== null;
        }
    }

    /**
     * Place item in slot
     */
    private placeItemInSlot(container: BiomeSynthesizerSession, slot: ContainerSlot, itemId: string): void {
        const column = Math.floor((slot.id - 10) / 8);
        const row = (slot.id - 10) % 8;

        // Update grid controller
        const success = container.gridController.placeItem(column, slot.slotType, itemId);

        if (success) {
            // Update slot
            slot.itemId = itemId;
            slot.count = 1;
            slot.displayName = this.getSlotDisplayName(slot.slotType, container.gridController.getGrid().columns[column]);
            slot.isValid = true;

            // Unlock dependent slots if this was a base biome placement
            if (slot.slotType === 'base_biome') {
                this.unlockColumnSlots(container, column);
            }

            this.logger.info(`Placed ${itemId} in slot ${slot.id} for player ${container.playerId}`);
        }
    }

    /**
     * Remove item from slot
     */
    private removeItemFromSlot(container: BiomeSynthesizerSession, slot: ContainerSlot): void {
        const column = Math.floor((slot.id - 10) / 8);
        const row = (slot.id - 10) % 8;

        // Update grid controller
        container.gridController.placeItem(column, slot.slotType, '');

        // Update slot
        slot.itemId = null;
        slot.count = 0;
        slot.displayName = this.getSlotDisplayName(slot.slotType, container.gridController.getGrid().columns[column]);
        slot.isValid = false;

        // Lock dependent slots if this was a base biome removal
        if (slot.slotType === 'base_biome') {
            this.lockColumnSlots(container, column);
        }

        this.logger.info(`Removed item from slot ${slot.id} for player ${container.playerId}`);
    }

    /**
     * Handle craft button click
     */
    private async handleCraftClick(container: BiomeSynthesizerSession): Promise<void> {
        try {
            const grid = container.gridController.getGrid();

            if (!container.gridController.canCraft()) {
                this.sendErrorMessage(container.playerId, 'You need at least one biome defined to craft a dimension!');
                return;
            }

            this.logger.info(`Player ${container.playerId} clicked craft button`);

            // Create Easter Egg bridge
            const seedKey = await this.easterEggBridge.createEasterEggBridge(grid, container.playerId);

            if (seedKey) {
                // Give player the physical Dimension Blueprint book
                this.givePlayerDimensionBook(container.playerId, grid, seedKey);
                this.sendSuccessMessage(container.playerId, `Dimension created! Check your inventory for the Dimension Blueprint.`);
                this.closeContainer(container.playerId);
            } else {
                this.sendErrorMessage(container.playerId, 'Failed to create dimension. Please try again.');
            }

        } catch (error) {
            this.logger.error(`Craft button failed for player ${container.playerId}:`, error);
            this.sendErrorMessage(container.playerId, 'An error occurred while creating dimension.');
        }
    }

    /**
     * Give player a physical Dimension Blueprint book with dimension configuration
     */
    private givePlayerDimensionBook(playerId: string, grid: SynthesizerGrid, seedKey: string): void {
        try {
            const definedBiomes = grid.columns.filter(col => col.unlocked && col.enabled && col.baseBiome !== null);
            const biomeCount = definedBiomes.length;
            const worldTypeName = grid.worldType || 'Unknown';
            const escapedSeedKey = seedKey.replace(/"/g, '\\"');

            // Build lore for the book item
            const loreLines = [
                `§7World Type: §e${worldTypeName}`,
                `§7Biomes: §a${biomeCount}`,
                `§7Seed: §b${escapedSeedKey}`,
                `§dRight-click to travel!`
            ];
            const loreNbt = loreLines.map(line => `'{"text":"${line}","italic":false}'`).join(',');

            // Build /give command for written book with custom NBT
            const giveCommand = `/give ${playerId} minecraft:written_book{` +
                `title:"Dimension Blueprint",` +
                `author:"Dimension Crafter",` +
                `pages:['{"text":"Dimension Blueprint\\n\\nWorld: ${worldTypeName}\\nBiomes: ${biomeCount}\\nSeed: ${escapedSeedKey}\\n\\n§dRight-click to travel!"}'],` +
                `display:{Name:'{"text":"§bDimension Blueprint","italic":false}',Lore:[${loreNbt}]},` +
                `dimension_seed:"${escapedSeedKey}"} 1`;

            (this.api as any).server.executeCommand(giveCommand);
            this.logger.info(`Gave Dimension Blueprint book to player ${playerId} with seed ${seedKey}`);
        } catch (error) {
            this.logger.error(`Error giving dimension book to player ${playerId}:`, error);
            this.sendSuccessMessage(playerId, `Dimension created with seed: ${seedKey}`);
        }
    }

    /**
     * Update craft button state
     */
    private updateCraftButton(container: BiomeSynthesizerSession): void {
        const craftSlot = container.slots.get(BiomeSynthesizerContainer.CRAFT_BUTTON_SLOT);
        if (craftSlot) {
            craftSlot.isValid = container.gridController.canCraft();
        }
    }

    /**
     * Unlock all slots in a column
     */
    private unlockColumnSlots(container: BiomeSynthesizerSession, column: number): void {
        for (let row = 1; row < 7; row++) {
            const slotId = 10 + (column * 8) + row;
            const slot = container.slots.get(slotId);
            if (slot) {
                slot.isLocked = false;
            }
        }
    }

    /**
     * Lock all slots in a column (except base biome)
     */
    private lockColumnSlots(container: BiomeSynthesizerSession, column: number): void {
        for (let row = 1; row < 7; row++) {
            const slotId = 10 + (column * 8) + row;
            const slot = container.slots.get(slotId);
            if (slot && slot.slotType !== 'base_biome') {
                slot.isLocked = true;
                slot.itemId = null;
                slot.count = 0;
                slot.isValid = false;
            }
        }
    }

    /**
     * Close container for player
     */
    public closeContainer(playerId: string): void {
        try {
            const container = this.activeContainers.get(playerId);
            if (!container) {
                return;
            }

            // Send container close packet
            this.api.network.sendPacket(playerId, {
                type: 'ClientboundCloseScreenPacket',
                containerId: container.containerId
            });

            // Remove active container
            this.activeContainers.delete(playerId);

            this.logger.info(`Closed container ${container.containerId} for player ${playerId}`);

        } catch (error) {
            this.logger.error(`Error closing container for player ${playerId}:`, error);
        }
    }

    /**
     * Check if container is a synthesizer container
     */
    private isSynthesizerContainer(containerId: string): boolean {
        return containerId.startsWith('synthesizer_');
    }

    /**
     * Get slot type for position
     */
    private getSlotTypeForPosition(row: number): string {
        const slotTypes = ['base_biome', 'surface_block', 'stone_block', 'liquid_block', 'tree_logs', 'tree_leaves', 'ores'];
        return slotTypes[row] || 'base_biome';
    }

    /**
     * Get slot item ID from column
     */
    private getSlotItemId(column: BiomeColumn, slotType: string): string | null {
        switch (slotType) {
            case 'base_biome':
                return column.baseBiome;
            case 'surface_block':
                return column.surfaceBlock;
            case 'stone_block':
                return column.stoneBlock;
            case 'liquid_block':
                return column.liquidBlock;
            case 'tree_logs':
                return column.treeLogs;
            case 'tree_leaves':
                return column.treeLeaves;
            case 'ores':
                return column.ores;
            default:
                return null;
        }
    }

    /**
     * Get slot display name
     */
    private getSlotDisplayName(slotType: string, column: BiomeColumn): string {
        const itemId = this.getSlotItemId(column, slotType);
        if (itemId) {
            return itemId.replace('minecraft:', '').replace(/_/g, ' ').split(' ').map(word =>
                word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ');
        }

        const names: { [key: string]: string } = {
            'world_type': 'World Type',
            'base_biome': 'Base Biome',
            'surface_block': 'Surface Block',
            'stone_block': 'Stone Block',
            'liquid_block': 'Liquid Block',
            'tree_logs': 'Tree Logs',
            'tree_leaves': 'Tree Leaves',
            'ores': 'Ores',
            'craft': 'Craft Dimension'
        };
        return names[slotType] || 'Unknown';
    }

    /**
     * Get world type display name
     */
    private getWorldTypeDisplayName(worldTypeIndex: number): string {
        const worldTypes = ['Normal', 'Nether', 'The End', 'Superflat', 'Amplified'];
        return worldTypes[worldTypeIndex] || 'Unknown';
    }

    /**
     * Check if slot is unlocked
     */
    private isSlotUnlocked(gridController: VirtualGridController, column: number, slotType: string): boolean {
        return gridController.isSlotUnlocked(column, slotType);
    }

    /**
     * Send error message to player
     */
    private sendErrorMessage(playerId: string, message: string): void {
        this.api.server.executeCommand(`/tellraw ${playerId} {"text":"${message}","color":"red"}`);
    }

    /**
     * Send success message to player
     */
    private sendSuccessMessage(playerId: string, message: string): void {
        this.api.server.executeCommand(`/tellraw ${playerId} {"text":"${message}","color":"green"}`);
    }

    /**
     * Clean up inactive containers
     */
    public cleanupInactiveContainers(maxAgeMinutes: number = 10): number {
        const now = Date.now();
        let cleanedCount = 0;

        for (const [playerId, container] of this.activeContainers.entries()) {
            const ageMinutes = (now - container.lastUpdate) / (1000 * 60);

            if (ageMinutes > maxAgeMinutes) {
                this.closeContainer(playerId);
                cleanedCount++;
                this.logger.debug(`Cleaned up inactive container for player: ${playerId}`);
            }
        }

        return cleanedCount;
    }

    /**
     * Get statistics about container system
     */
    public getStatistics(): {
        activeContainers: number;
        totalContainers: number;
        players: string[];
    } {
        return {
            activeContainers: this.activeContainers.size,
            totalContainers: this.activeContainers.size,
            players: Array.from(this.activeContainers.keys())
        };
    }
}
