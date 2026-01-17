/// <reference types="@epi-studio/moud-sdk" />
import { Logger } from '../utils/Logger';
import { VirtualGridController, SynthesizerGrid, BiomeColumn, WorldType } from '../core/VirtualGridController';
import { ItemBlockMapper } from '../core/ItemBlockMapper';
import { EasterEggBridge } from '../core/EasterEggBridge';

export interface SlotData {
    itemId: string | null;
    count: number;
    displayName: string;
    isValid: boolean;
}

export interface GUIData {
    playerId: string;
    gridController: VirtualGridController;
    slots: Map<number, SlotData>;
    isOpen: boolean;
    lastUpdate: number;
}

export class BiomeSynthesizerGUI {
    private api: MoudAPI;
    private logger: Logger;
    private activeGUIs: Map<string, GUIData>;
    private itemBlockMapper: ItemBlockMapper;
    private easterEggBridge: EasterEggBridge;

    // GUI Layout Constants
    private static readonly WORLD_TYPE_SLOTS = 5; // Slots 0-4
    private static readonly COLUMNS = 5; // 5 columns
    private static readonly SLOTS_PER_COLUMN = 7; // world_type, base_biome, surface_block, stone_block, liquid_block, tree_logs, tree_leaves, ores
    private static readonly CRAFT_BUTTON_SLOT = 45;

    // Slot mapping
    private getSlotForPosition(column: number, row: number): number {
        if (column < 0 || column >= BiomeSynthesizerGUI.COLUMNS || row < 0 || row >= BiomeSynthesizerGUI.SLOTS_PER_COLUMN) {
            return -1;
        }
        return 10 + (column * BiomeSynthesizerGUI.SLOTS_PER_COLUMN) + row;
    }

    constructor(
        api: MoudAPI,
        itemBlockMapper: ItemBlockMapper,
        easterEggBridge: EasterEggBridge
    ) {
        this.api = api;
        this.logger = new Logger('BiomeSynthesizerGUI');
        this.activeGUIs = new Map();
        this.itemBlockMapper = itemBlockMapper;
        this.easterEggBridge = easterEggBridge;

        this.initializeEventHandlers();
    }

    /**
     * Initialize event handlers for synthesizer block interactions
     */
    private initializeEventHandlers(): void {
        if (this.api.events && this.api.events.on) {
            // Listen for synthesizer block right-click events
            this.api.events.on('synthesizer_block_right_click', (event) => {
                this.handleSynthesizerBlockClick(event.playerId, event.position, event.blockState);
            });

            // Listen for synthesizer block break events
            this.api.events.on('synthesizer_block_break', (event) => {
                this.handleSynthesizerBlockBreak(event.playerId, event.position, event.blockState);
            });

            this.logger.info('Initialized Biome Synthesizer GUI event handlers');
        } else {
            this.logger.warn('Event system not available - GUI interactions disabled');
        }
    }

    /**
     * Handle right-click on synthesizer block
     */
    private handleSynthesizerBlockClick(playerId: string, position: any, blockState: any): void {
        try {
            this.logger.info(`Opening Biome Synthesizer GUI for player: ${playerId}`);

            const guiData = this.ensurePlayerGUIData(playerId);
            guiData.isOpen = true;
            guiData.lastUpdate = Date.now();

            // Send container open packet to show the GUI
            this.openSynthesizerContainer(playerId, position);

        } catch (error) {
            this.logger.error(`Error handling synthesizer block click for player ${playerId}:`, error);
        }
    }

    /**
     * Handle synthesizer block being broken
     */
    private handleSynthesizerBlockBreak(playerId: string, position: any, blockState: any): void {
        try {
            this.logger.info(`Biome Synthesizer block broken by player: ${playerId}`);

            // Close GUI if it's open for this player
            const guiData = this.activeGUIs.get(playerId);
            if (guiData && guiData.isOpen) {
                this.closeGUI(playerId);
            }

        } catch (error) {
            this.logger.error(`Error handling synthesizer block break for player ${playerId}:`, error);
        }
    }

    /**
     * Open the synthesizer container GUI
     */
    private openSynthesizerContainer(playerId: string, position: any): void {
        try {
            const guiData = this.ensurePlayerGUIData(playerId);
            const grid = guiData.gridController.getGrid();
            const worldTypeConfigs = guiData.gridController.getAllWorldTypeConfigs();

            // Create container title
            const title = 'Biome Synthesizer';

            // Initialize slots with current grid state
            this.initializeSlots(guiData, grid);

            // Send container open packet
            if (this.api.server?.executeCommand) {
                this.api.server.executeCommand(`/tellraw ${playerId} {"text":"Opening Biome Synthesizer...","color":"aqua"}`);
            }

            // Note: In a real implementation, this would use the container system
            // For now, we'll simulate the GUI with chat messages
            this.simulateGUIOpen(playerId, grid, worldTypeConfigs);

        } catch (error) {
            this.logger.error(`Error opening synthesizer GUI for player ${playerId}:`, error);
        }
    }

    /**
     * Initialize slots with current grid state
     */
    private initializeSlots(guiData: GUIData, grid: SynthesizerGrid): void {
        // Clear existing slots
        guiData.slots.clear();

        // Initialize world type row (slots 0-4)
        for (let i = 0; i < BiomeSynthesizerGUI.WORLD_TYPE_SLOTS; i++) {
            const slot = this.getSlotForPosition(i, 0);
            const slotData: SlotData = {
                itemId: null,
                count: 0,
                displayName: this.getWorldTypeDisplayName(i),
                isValid: false
            };
            guiData.slots.set(slot, slotData);
        }

        // Initialize column slots
        for (let col = 0; col < BiomeSynthesizerGUI.COLUMNS; col++) {
            const column = grid.columns[col];

            for (let row = 1; row < BiomeSynthesizerGUI.SLOTS_PER_COLUMN; row++) {
                const slot = this.getSlotForPosition(col, row);
                // Fix: pass the correct columnData (BiomeColumn)
                const slotData = this.createSlotData(col, row, grid.columns[col]);
                guiData.slots.set(slot, slotData);
            }
        }
    }

    /**
     * Create slot data based on column and row
     */
    private createSlotData(column: number, row: number, columnData: BiomeColumn): SlotData {
        let itemId: string | null = null;
        let displayName = '';
        let isValid = false;

        switch (row) {
            case 0: // base_biome
                itemId = columnData.baseBiome;
                displayName = itemId ? this.itemBlockMapper.getBiomeType(itemId) || 'Unknown Biome' : 'Base Biome';
                isValid = columnData.unlocked && columnData.baseBiome !== null;
                break;
            case 1: // surface_block
                itemId = columnData.surfaceBlock;
                displayName = itemId ? `Surface: ${this.getBlockDisplayName(itemId)}` : 'Surface Block';
                isValid = columnData.unlocked && columnData.baseBiome !== null && columnData.surfaceBlock !== null;
                break;
            case 2: // stone_block
                itemId = columnData.stoneBlock;
                displayName = itemId ? `Stone: ${this.getBlockDisplayName(itemId)}` : 'Stone Block';
                isValid = columnData.unlocked && columnData.baseBiome !== null && columnData.stoneBlock !== null;
                break;
            case 3: // liquid_block
                itemId = columnData.liquidBlock;
                displayName = itemId ? `Liquid: ${this.getBlockDisplayName(itemId)}` : 'Liquid Block';
                isValid = columnData.unlocked && columnData.baseBiome !== null && columnData.liquidBlock !== null;
                break;
            case 4: // tree_logs
                itemId = columnData.treeLogs;
                displayName = itemId ? `Logs: ${this.getBlockDisplayName(itemId)}` : 'Tree Logs';
                isValid = columnData.unlocked && columnData.baseBiome !== null && columnData.treeLogs !== null;
                break;
            case 5: // tree_leaves
                itemId = columnData.treeLeaves;
                displayName = itemId ? `Leaves: ${this.getBlockDisplayName(itemId)}` : 'Tree Leaves';
                isValid = columnData.unlocked && columnData.baseBiome !== null && columnData.treeLeaves !== null;
                break;
            case 6: // ores
                itemId = columnData.ores;
                displayName = itemId ? `Ores: ${this.getBlockDisplayName(itemId)}` : 'Ores';
                isValid = columnData.unlocked && columnData.baseBiome !== null && columnData.ores !== null;
                break;
        }

        return {
            itemId,
            count: 1,
            displayName,
            isValid
        };
    }

    /**
     * Get display name for world type
     */
    private getWorldTypeDisplayName(worldTypeIndex: number): string {
        const worldTypes = ['Normal', 'Nether', 'The End', 'Superflat', 'Amplified'];
        return worldTypes[worldTypeIndex] || 'Unknown';
    }

    /**
     * Get display name for block
     */
    private getBlockDisplayName(itemId: string): string {
        if (!itemId) return 'Empty';
        return itemId.replace('minecraft:', '').replace(/_/g, ' ').split(' ').map(word =>
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }

    /**
     * Simulate GUI opening with chat messages (placeholder implementation)
     */
    private simulateGUIOpen(playerId: string, grid: SynthesizerGrid, worldTypeConfigs: any): void {
        try {
            if (!this.api.server?.executeCommand) return;

            // Send GUI layout information
            this.api.server.executeCommand(`/tellraw ${playerId} {"text":"=== BIOME SYNTHESIZER ===","color":"gold","bold":true}`);

            // Show world type row
            let worldTypeRow = '┬ºeWorld Types:┬ºr ';
            for (let i = 0; i < BiomeSynthesizerGUI.WORLD_TYPE_SLOTS; i++) {
                const slot = this.getSlotForPosition(i, 0);
                const slotData = this.getSlotDataForPlayer(playerId, slot);
                const status = slotData.isValid ? '┬ºa' : '┬º8';
                const item = slotData.itemId ? `┬ºf${slotData.displayName}┬ºr` : '┬º7Empty┬ºr';
                worldTypeRow += `${status}[${i}] ${item}  `;
            }
            this.api.server.executeCommand(`/tellraw ${playerId} {"text":"${worldTypeRow}","color":"white"}`);

            // Show columns
            for (let col = 0; col < BiomeSynthesizerGUI.COLUMNS; col++) {
                const column = grid.columns[col];
                const isUnlocked = column.unlocked;
                const columnColor = isUnlocked ? '┬ºa' : '┬º8';
                const columnTitle = `┬ºeColumn ${col + 1} (${this.getWorldTypeDisplayName(col)}):┬ºr `;

                this.api.server.executeCommand(`/tellraw ${playerId} {"text":"${columnTitle}","color":"white"}`);

                for (let row = 1; row < BiomeSynthesizerGUI.SLOTS_PER_COLUMN; row++) {
                    const slot = this.getSlotForPosition(col, row);
                    const slotData = this.getSlotDataForPlayer(playerId, slot);
                    const rowNames = ['Base Biome', 'Surface', 'Stone', 'Liquid', 'Logs', 'Leaves', 'Ores'];
                    const rowName = rowNames[row - 1];
                    const status = slotData.isValid ? '┬ºa' : '┬º8';
                    const item = slotData.itemId ? `┬ºf${slotData.displayName}┬ºr` : '┬º7Empty┬ºr';

                    this.api.server.executeCommand(`/tellraw ${playerId} {"text":"  ${columnColor}${status}[${row}] ┬ºb${rowName}:┬ºr ${item}","color":"white"}`);
                }
            }

            // Show controls
            this.api.server.executeCommand(`/tellraw ${playerId} {"text":"\\n┬ºeControls:┬ºr ┬º7Right-click slots to place items | ┬ºaShift+Right-click to clear slots┬ºr","color":"gray"}`);
            this.api.server.executeCommand(`/tellraw ${playerId} {"text":"┬º7[Craft]┬ºr button when ready - creates dimension from your configuration!","color":"yellow"}`);

        } catch (error) {
            this.logger.error(`Error simulating GUI for player ${playerId}:`, error);
        }
    }

    /**
     * Get slot data for a player
     */
    private getSlotDataForPlayer(playerId: string, slotId: number): SlotData {
        const guiData = this.activeGUIs.get(playerId);
        if (!guiData) {
            return {
                itemId: null,
                count: 0,
                displayName: 'Empty',
                isValid: false
            };
        }
        return guiData.slots.get(slotId) || {
            itemId: null,
            count: 0,
            displayName: 'Empty',
            isValid: false
        };
    }

    /**
     * Ensure player GUI data exists
     */
    private ensurePlayerGUIData(playerId: string): GUIData {
        let guiData = this.activeGUIs.get(playerId);
        if (!guiData) {
            guiData = {
                playerId,
                gridController: new VirtualGridController(),
                slots: new Map(),
                isOpen: false,
                lastUpdate: Date.now()
            };
            this.activeGUIs.set(playerId, guiData);
        }
        return guiData;
    }

    /**
     * Handle slot click (from chat commands or container interactions)
     */
    public handleSlotClick(playerId: string, slotId: number, itemId: string): boolean {
        try {
            const guiData = this.ensurePlayerGUIData(playerId);
            const slot = this.getSlotDataForPlayer(playerId, slotId);

            if (!slot.isValid) {
                if (this.api.server?.executeCommand) {
                    this.api.server.executeCommand(`/tellraw ${playerId} {"text":"This slot is locked!","color":"red"}`);
                }
                return false;
            }

            // Determine which column and row this slot belongs to
            const column = Math.floor((slotId - 10) / BiomeSynthesizerGUI.SLOTS_PER_COLUMN);
            const row = (slotId - 10) % BiomeSynthesizerGUI.SLOTS_PER_COLUMN;

            // Handle different slot types
            let success = false;
            if (row === 0) { // World type row
                success = this.handleWorldTypeSlotClick(guiData, column, itemId);
            } else if (row === 1) { // Base biome row
                success = this.handleBaseBiomeSlotClick(guiData, column, itemId);
            } else { // Block rows (surface, stone, liquid, logs, leaves, ores)
                success = this.handleBlockSlotClick(guiData, column, row, itemId);
            }

            if (success) {
                guiData.lastUpdate = Date.now();
                this.updateSlotDisplay(playerId, slotId);
            }

            return success;

        } catch (error) {
            this.logger.error(`Error handling slot click for player ${playerId}:`, error);
            return false;
        }
    }

    /**
     * Handle world type slot click
     */
    private handleWorldTypeSlotClick(guiData: GUIData, column: number, itemId: string): boolean {
        // Check if this is a world type unlocker item
        if (!this.itemBlockMapper.isWorldTypeItem(itemId)) {
            if (this.api.server?.executeCommand) {
                this.api.server.executeCommand(`/tellraw ${guiData.playerId} {"text":"${itemId} cannot unlock world types!","color":"red"}`);
            }
            return false;
        }

        // Try to place the world type item
        const success = guiData.gridController.placeItem(column, 'world_type', itemId);
        if (success) {
            const worldType = this.itemBlockMapper.getUnlockedWorldType(itemId);
            if (this.api.server?.executeCommand) {
                this.api.server.executeCommand(`/tellraw ${guiData.playerId} {"text":"Unlocked ┬ºe${worldType}┬ºr world type!","color":"green"}`);
            }

            // Update slot display
            const slot = this.getSlotForPosition(column, 0);
            const updatedSlot: SlotData = {
                itemId,
                count: 1,
                displayName: worldType || 'Unknown',
                isValid: true
            };
            guiData.slots.set(slot, updatedSlot);
        } else {
            if (this.api.server?.executeCommand) {
                this.api.server.executeCommand(`/tellraw ${guiData.playerId} {"text":"Failed to unlock world type with ${itemId}","color":"red"}`);
            }
        }

        return success;
    }

    /**
     * Handle base biome slot click
     */
    private handleBaseBiomeSlotClick(guiData: GUIData, column: number, itemId: string): boolean {
        // Check if this column is unlocked for base biome placement
        if (!guiData.gridController.isSlotUnlocked(column, 'base_biome')) {
            if (this.api.server?.executeCommand) {
                this.api.server.executeCommand(`/tellraw ${guiData.playerId} {"text":"Column ${column + 1} is not unlocked for base biome placement!","color":"red"}`);
            }
            return false;
        }

        // Check if this is a base biome item
        if (!this.itemBlockMapper.isBaseBiomeItem(itemId)) {
            if (this.api.server?.executeCommand) {
                this.api.server.executeCommand(`/tellraw ${guiData.playerId} {"text":"${itemId} is not a valid base biome item!","color":"red"}`);
            }
            return false;
        }

        // Try to place the base biome item
        const success = guiData.gridController.placeItem(column, 'base_biome', itemId);
        if (success) {
            const biomeType = this.itemBlockMapper.getBiomeType(itemId);
            if (this.api.server?.executeCommand) {
                this.api.server.executeCommand(`/tellraw ${guiData.playerId} {"text":"Set base biome to ┬ºe${biomeType}┬ºr!","color":"green"}`);
            }

            // Update slot display and unlock other slots in this column
            this.updateSlotDisplay(guiData.playerId, this.getSlotForPosition(column, 1));
            this.unlockColumnSlots(guiData, column);
        } else {
            if (this.api.server?.executeCommand) {
                this.api.server.executeCommand(`/tellraw ${guiData.playerId} {"text":"Failed to set base biome with ${itemId}","color":"red"}`);
            }
        }

        return success;
    }

    /**
     * Handle block slot click
     */
    private handleBlockSlotClick(guiData: GUIData, column: number, row: number, itemId: string): boolean {
        // Check if this column is unlocked for block placement
        if (!guiData.gridController.isSlotUnlocked(column, 'surface_block')) {
            if (this.api.server?.executeCommand) {
                this.api.server.executeCommand(`/tellraw ${guiData.playerId} {"text":"Column ${column + 1} is not unlocked for block placement!","color":"red"}`);
            }
            return false;
        }

        // Map item to block
        const blockId = this.itemBlockMapper.mapItemToBlock(itemId);
        if (!blockId) {
            if (this.api.server?.executeCommand) {
                this.api.server.executeCommand(`/tellraw ${guiData.playerId} {"text":"${itemId} cannot be used in synthesizer!","color":"red"}`);
            }
            return false;
        }

        // Try to place the block item
        const slotType = this.getRowSlotType(row);
        const success = guiData.gridController.placeItem(column, slotType, itemId);
        if (success) {
            if (this.api.server?.executeCommand) {
                this.api.server.executeCommand(`/tellraw ${guiData.playerId} {"text":"Set ${slotType} to ┬ºe${this.getBlockDisplayName(itemId)}┬ºr!","color":"green"}`);
            }
            this.updateSlotDisplay(guiData.playerId, this.getSlotForPosition(column, row));
        } else {
            if (this.api.server?.executeCommand) {
                this.api.server.executeCommand(`/tellraw ${guiData.playerId} {"text":"Failed to set ${slotType} with ${itemId}","color":"red"}`);
            }
        }

        return success;
    }

    /**
     * Get slot type name
     */
    private getRowSlotType(row: number): string {
        const slotTypes = ['base_biome', 'surface_block', 'stone_block', 'liquid_block', 'tree_logs', 'tree_leaves', 'ores'];
        return slotTypes[row - 1] || 'unknown';
    }

    /**
     * Unlock all slots in a column after base biome is set
     */
    private unlockColumnSlots(guiData: GUIData, column: number): void {
        for (let row = 1; row < BiomeSynthesizerGUI.SLOTS_PER_COLUMN; row++) {
            const slot = this.getSlotForPosition(column, row);
            const slotData = guiData.slots.get(slot);
            if (slotData) {
                slotData.isValid = true;
                guiData.slots.set(slot, slotData);
            }
        }
    }

    /**
     * Update slot display for player
     */
    private updateSlotDisplay(playerId: string, slotId: number): void {
        const guiData = this.activeGUIs.get(playerId);
        if (!guiData) return;

        const slot = guiData.slots.get(slotId);
        if (slot) {
            if (this.api.server?.executeCommand) {
                this.api.server.executeCommand(`/tellraw ${playerId} {"text":"Updated slot ${slotId}: ${slot.displayName}","color":"gray"}`);
            }
        }
    }

    /**
     * Handle craft button click
     */
    public async handleCraftButtonClick(playerId: string): Promise<boolean> {
        try {
            const guiData = this.ensurePlayerGUIData(playerId);
            const grid = guiData.gridController.getGrid();

            // Check if crafting is possible
            if (!guiData.gridController.canCraft()) {
                if (this.api.server?.executeCommand) {
                    this.api.server.executeCommand(`/tellraw ${playerId} {"text":"You need at least one biome defined to craft a dimension!","color":"red"}`);
                }
                return false;
            }

            this.logger.info(`Player ${playerId} clicked craft button`);

            // Create Easter Egg bridge
            const seedKey = await this.easterEggBridge.createEasterEggBridge(grid, playerId);

            if (seedKey) {
                if (this.api.server?.executeCommand) {
                    this.api.server.executeCommand(`/tellraw ${playerId} {"text":"┬ºaDimension created! Use book \"${seedKey}\" to travel there.┬ºr","color":"green"}`);
                }
                this.closeGUI(playerId);
                return true;
            } else {
                if (this.api.server?.executeCommand) {
                    this.api.server.executeCommand(`/tellraw ${playerId} {"text":"Failed to create dimension. Please try again.","color":"red"}`);
                }
                return false;
            }

        } catch (error) {
            this.logger.error(`Craft button failed for player ${playerId}:`, error);
            if (this.api.server?.executeCommand) {
                this.api.server.executeCommand(`/tellraw ${playerId} {"text":"An error occurred while creating dimension.","color":"red"}`);
            }
            return false;
        }
    }

    /**
     * Close GUI for player
     */
    public closeGUI(playerId: string): void {
        const guiData = this.activeGUIs.get(playerId);
        if (guiData) {
            guiData.isOpen = false;
            if (this.api.server?.executeCommand) {
                this.api.server.executeCommand(`/tellraw ${playerId} {"text":"Closing Biome Synthesizer GUI...","color":"gray"}`);
            }
        }
    }

    /**
     * Clean up inactive GUI sessions
     */
    public cleanupInactiveSessions(maxAgeMinutes: number = 10): number {
        const now = Date.now();
        let cleanedCount = 0;

        for (const [playerId, guiData] of this.activeGUIs.entries()) {
            const ageMinutes = (now - guiData.lastUpdate) / (1000 * 60);

            if (ageMinutes > maxAgeMinutes) {
                this.activeGUIs.delete(playerId);
                cleanedCount++;
                this.logger.debug(`Cleaned up inactive GUI session for player: ${playerId}`);
            }
        }

        return cleanedCount;
    }

    /**
     * Get statistics about GUI system
     */
    public getStatistics(): {
        activeSessions: number;
        totalSessions: number;
        players: string[];
    } {
        return {
            activeSessions: this.activeGUIs.size,
            totalSessions: this.activeGUIs.size,
            players: Array.from(this.activeGUIs.keys())
        };
    }
}
