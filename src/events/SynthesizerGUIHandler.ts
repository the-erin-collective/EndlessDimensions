/// <reference types="@epi-studio/moud-sdk" />
import { Logger } from '../utils/Logger';
import { VirtualGridController, SynthesizerGrid, BiomeColumn } from '../core/VirtualGridController';
import { EasterEggBridge } from '../core/EasterEggBridge';
import { ItemBlockMapper } from '../core/ItemBlockMapper';
import { PacketInterceptor } from '../core/PacketInterceptor';

export interface GUIInteractionEvent {
    playerId: string;
    action: 'power_level_change' | 'column_update' | 'craft_clicked' | 'gui_opened' | 'gui_closed';
    data: any;
    timestamp: number;
}

export interface PlayerGUIData {
    playerId: string;
    gridController: VirtualGridController;
    isOpen: boolean;
    lastInteraction: number;
}

export class SynthesizerGUIHandler {
    private api: MoudAPI;
    private logger: Logger;
    private playerGUIData: Map<string, PlayerGUIData>;
    private easterEggBridge: EasterEggBridge;
    private itemBlockMapper: ItemBlockMapper;
    private packetInterceptor: PacketInterceptor;

    constructor(
        api: MoudAPI,
        easterEggBridge: EasterEggBridge,
        itemBlockMapper: ItemBlockMapper,
        packetInterceptor: PacketInterceptor
    ) {
        this.api = api;
        this.logger = new Logger('SynthesizerGUIHandler');
        this.playerGUIData = new Map();
        this.easterEggBridge = easterEggBridge;
        this.itemBlockMapper = itemBlockMapper;
        this.packetInterceptor = packetInterceptor;

        this.initializePacketHandlers();
    }

    /**
     * Initialize packet handlers for GUI interaction detection
     */
    private initializePacketHandlers(): void {
        // Handle player interactions with synthesizer blocks
        if (this.api.packets && this.api.packets.onOutgoing) {
            this.api.packets.onOutgoing((packet: any) => {
                // We need to extract playerId from packet or context if available
                // For now assuming packet has it or we can't reliably track it without context
                const playerId = packet.playerId || 'unknown';
                this.handlePlayerPacket(packet, playerId);
            });
        }

        // Handle inventory updates (for item slot changes)
        if (this.api.packets && this.api.packets.onIncoming) {
            this.api.packets.onIncoming((packet: any) => {
                const playerId = packet.playerId || 'unknown';
                this.handleServerPacket(packet, playerId);
            });
        }

        this.logger.info('Initialized packet handlers for GUI interaction detection');
    }

    /**
     * Handle outgoing packets from player (client -> server)
     */
    private handlePlayerPacket(packet: any, playerId: string): void {
        try {
            switch (packet.type) {
                case 'ServerboundUseItemPacket':
                    this.handleUseItemPacket(packet, playerId);
                    break;
                case 'ServerboundSetCarriedItemPacket':
                    this.handleSlotChangePacket(packet, playerId);
                    break;
                case 'ServerboundContainerClickPacket':
                    this.handleContainerClickPacket(packet, playerId);
                    break;
                case 'ServerboundCustomPayloadPacket':
                    this.handleCustomPayloadPacket(packet, playerId);
                    break;
            }
        } catch (error) {
            this.logger.error(`Error handling player packet for ${playerId}:`, error);
        }
    }

    /**
     * Handle incoming packets from server (server -> client)
     */
    private handleServerPacket(packet: any, playerId: string): void {
        try {
            switch (packet.type) {
                case 'ClientboundOpenScreenPacket':
                    this.handleOpenScreenPacket(packet, playerId);
                    break;
                case 'ClientboundContainerSetContentPacket':
                    this.handleContainerContentPacket(packet, playerId);
                    break;
                case 'ClientboundSetSlotPacket':
                    this.handleSetSlotPacket(packet, playerId);
                    break;
            }
        } catch (error) {
            this.logger.error(`Error handling server packet for ${playerId}:`, error);
        }
    }

    /**
     * Handle use item packet (right-click on synthesizer block)
     */
    private handleUseItemPacket(packet: any, playerId: string): void {
        // Check if player is interacting with a synthesizer block
        const position = packet.position;
        if (this.isSynthesizerBlock(position)) {
            this.openSynthesizerGUI(playerId, position);
        }
    }

    /**
     * Handle slot change packet (player switching hotbar slot)
     */
    private handleSlotChangePacket(packet: any, playerId: string): void {
        // Placeholder for hotbar slot change logic
        // We might track this to know what item the player is holding
    }

    /**
     * Handle container click packet (GUI interactions)
     */
    private handleContainerClickPacket(packet: any, playerId: string): void {
        const playerData = this.playerGUIData.get(playerId);
        if (!playerData || !playerData.isOpen) return;

        const clickData = packet.clickData;
        const slotId = clickData.slotId;
        const button = clickData.button;

        // Parse GUI interaction based on slot ID
        this.parseGUIInteraction(playerId, slotId, button, clickData);
    }

    /**
     * Handle custom payload packet (for custom GUI messages)
     */
    private handleCustomPayloadPacket(packet: any, playerId: string): void {
        if (packet.channel === 'endless:synthesizer_gui') {
            const guiData = JSON.parse(packet.data);
            this.handleCustomGUIEvent(playerId, guiData);
        }
    }

    /**
     * Handle screen open packet
     */
    private handleOpenScreenPacket(packet: any, playerId: string): void {
        if (packet.title?.includes('Biome Synthesizer')) {
            const playerData = this.ensurePlayerGUIData(playerId);
            playerData.isOpen = true;
            playerData.lastInteraction = Date.now();
            this.logger.debug(`Opened synthesizer GUI for player: ${playerId}`);
        }
    }

    /**
     * Handle container content packet
     */
    private handleContainerContentPacket(packet: any, playerId: string): void {
        const playerData = this.playerGUIData.get(playerId);
        if (!playerData || !playerData.isOpen) return;

        // Update GUI state based on container contents
        this.updateGUIFromContainer(playerId, packet.items);
    }

    /**
     * Update GUI state from container items
     */
    private updateGUIFromContainer(playerId: string, items: any[]): void {
        // Placeholder for syncing grid controller with container items
        // In a full implementation, we would map slot items back to grid state
    }

    /**
     * Handle set slot packet
     */
    private handleSetSlotPacket(packet: any, playerId: string): void {
        const playerData = this.playerGUIData.get(playerId);
        if (!playerData || !playerData.isOpen) return;

        // Update specific slot in GUI
        this.updateGUISlot(playerId, packet.slot, packet.itemStack);
    }

    /**
     * Update a specific GUI slot
     */
    private updateGUISlot(playerId: string, slotId: number, itemStack: any): void {
        // Placeholder for updating single slot
    }

    /**
     * Open the synthesizer GUI for a player
     */
    private openSynthesizerGUI(playerId: string, position: any): void {
        try {
            const playerData = this.ensurePlayerGUIData(playerId);

            // Check power level of the synthesizer block
            const powerLevel = this.getBlockPowerLevel(position);
            playerData.gridController.updatePowerLevel(powerLevel);

            // Open custom GUI (this would need to be implemented with your GUI system)
            this.sendGUIMessage(playerId, {
                type: 'open_gui',
                grid: playerData.gridController.getGrid(),
                powerLevel: powerLevel
            });

            this.logger.info(`Opened synthesizer GUI for player ${playerId} at power level ${powerLevel}`);

        } catch (error) {
            this.logger.error(`Failed to open GUI for player ${playerId}:`, error);
        }
    }

    /**
     * Parse GUI interaction and update grid state
     */
    private parseGUIInteraction(playerId: string, slotId: number, button: number, clickData: any): void {
        const playerData = this.playerGUIData.get(playerId);
        if (!playerData) return;

        // Map slot IDs to GUI elements
        if (slotId >= 10 && slotId <= 18) {
            // Column slots (10-18 for 9 columns)
            const columnIndex = slotId - 10;
            this.handleColumnSlotClick(playerId, columnIndex, button, clickData);
        } else if (slotId === 45) {
            // Craft button (bottom middle slot)
            this.handleCraftButtonClick(playerId);
        } else if (slotId >= 19 && slotId <= 27) {
            // World type toggles (19-27)
            const columnIndex = slotId - 19;
            this.handleWorldTypeToggle(playerId, columnIndex);
        }

        playerData.lastInteraction = Date.now();
    }

    /**
     * Handle column slot click (item placement)
     */
    private handleColumnSlotClick(playerId: string, columnIndex: number, button: number, clickData: any): void {
        const playerData = this.playerGUIData.get(playerId);
        if (!playerData) return;

        const grid = playerData.gridController;
        if (!grid.isColumnUnlocked(columnIndex)) {
            this.sendErrorMessage(playerId, `Column ${columnIndex + 1} is not unlocked!`);
            return;
        }

        const cursorItem = clickData.carriedItem;
        if (!cursorItem) {
            // Empty click - clear the slot
            // Fix: property is surfaceBlock not groundBlock
            this.updateGridColumn(playerId, columnIndex, { surfaceBlock: 'minecraft:stone' });
            return;
        }

        // Map item to block
        const blockId = this.itemBlockMapper.mapItemToBlock(cursorItem.id);
        if (!blockId) {
            this.sendErrorMessage(playerId, `Cannot use ${cursorItem.id} in synthesizer!`);
            return;
        }

        // Determine which property to update based on click context
        const updateData: Partial<BiomeColumn> = {};

        if (this.itemBlockMapper.isFluidItem(cursorItem.id)) {
            updateData.liquidBlock = blockId;
        } else if (this.itemBlockMapper.isOreItem(cursorItem.id)) {
            updateData.ores = blockId;
        } else {
            updateData.surfaceBlock = blockId;
        }

        this.updateGridColumn(playerId, columnIndex, updateData);
    }

    /**
     * Handle world type toggle
     */
    private handleWorldTypeToggle(playerId: string, columnIndex: number): void {
        const playerData = this.playerGUIData.get(playerId);
        if (!playerData) return;

        const grid = playerData.gridController;
        if (!grid.isColumnUnlocked(columnIndex)) return;

        const currentColumn = grid.getGrid().columns[columnIndex];
        // Ensure worldType is available (we enable this via our type update)
        const newWorldType = currentColumn.worldType === 'flat' ? 'noise' : 'flat';

        this.updateGridColumn(playerId, columnIndex, { worldType: newWorldType });
    }

    /**
     * Handle craft button click
     */
    private async handleCraftButtonClick(playerId: string): Promise<void> {
        try {
            const playerData = this.playerGUIData.get(playerId);
            if (!playerData) return;

            const grid = playerData.gridController.getGrid();
            this.logger.info(`Player ${playerId} clicked craft button`);

            // Create Easter Egg bridge
            const seedKey = await this.easterEggBridge.createEasterEggBridge(grid, playerId);

            if (seedKey) {
                this.sendSuccessMessage(playerId, `Dimension created! Use the book "${seedKey}" to travel there.`);
                this.closeGUI(playerId);
            } else {
                this.sendErrorMessage(playerId, 'Failed to create dimension. Please try again.');
            }

        } catch (error) {
            this.logger.error(`Craft button failed for player ${playerId}:`, error);
            this.sendErrorMessage(playerId, 'An error occurred while creating the dimension.');
        }
    }

    /**
     * Update a column in the grid
     */
    private updateGridColumn(playerId: string, columnIndex: number, updates: Partial<BiomeColumn>): void {
        const playerData = this.playerGUIData.get(playerId);
        if (!playerData) return;

        const success = playerData.gridController.updateColumn(columnIndex, updates);
        if (success) {
            this.sendGUIMessage(playerId, {
                type: 'column_updated',
                columnIndex,
                updates
            });
        }
    }

    /**
     * Ensure player GUI data exists
     */
    private ensurePlayerGUIData(playerId: string): PlayerGUIData {
        let playerData = this.playerGUIData.get(playerId);
        if (!playerData) {
            playerData = {
                playerId,
                gridController: new VirtualGridController(),
                isOpen: false,
                lastInteraction: Date.now()
            };
            this.playerGUIData.set(playerId, playerData);
        }
        return playerData;
    }

    /**
     * Check if a position is a synthesizer block
     */
    private isSynthesizerBlock(position: any): boolean {
        // This would check if the block at the position is a synthesizer block
        // Implementation depends on how you identify synthesizer blocks
        if (this.api.world?.getBlock) {
            const blockId = this.api.world.getBlock(position.x, position.y, position.z);
            return blockId === 'endlessdimensions:biome_synthesizer';
        }
        return false;
    }

    /**
     * Get power level of a synthesizer block
     */
    private getBlockPowerLevel(position: any): number {
        // This would calculate the redstone power level of the synthesizer block
        // Implementation depends on your block detection system
        return 1; // Placeholder
    }

    /**
     * Send GUI message to player
     */
    private sendGUIMessage(playerId: string, message: any): void {
        // This would send a custom GUI message to the player
        // Implementation depends on your GUI communication system
        this.logger.debug(`GUI message to ${playerId}:`, message);
    }

    /**
     * Send error message to player
     */
    private sendErrorMessage(playerId: string, message: string): void {
        if (this.api.server?.executeCommand) {
            this.api.server.executeCommand(`/tellraw ${playerId} {"text":"${message}","color":"red"}`);
        }
    }

    /**
     * Send success message to player
     */
    private sendSuccessMessage(playerId: string, message: string): void {
        if (this.api.server?.executeCommand) {
            this.api.server.executeCommand(`/tellraw ${playerId} {"text":"${message}","color":"green"}`);
        }
    }

    /**
     * Close GUI for player
     */
    private closeGUI(playerId: string): void {
        const playerData = this.playerGUIData.get(playerId);
        if (playerData) {
            playerData.isOpen = false;
        }
        if (this.api.server?.executeCommand) {
            this.api.server.executeCommand(`/tellraw ${playerId} {"text":"Closing Biome Synthesizer GUI...","color":"gray"}`);
        }
    }

    /**
     * Handle custom GUI events
     */
    private handleCustomGUIEvent(playerId: string, guiData: any): void {
        switch (guiData.type) {
            case 'power_level_change':
                this.handlePowerLevelChange(playerId, guiData.powerLevel);
                break;
            case 'column_update':
                this.handleColumnUpdate(playerId, guiData.columnIndex, guiData.updates);
                break;
            case 'craft_clicked':
                this.handleCraftButtonClick(playerId);
                break;
        }
    }

    /**
     * Handle power level change event
     */
    private handlePowerLevelChange(playerId: string, powerLevel: number): void {
        const playerData = this.playerGUIData.get(playerId);
        if (playerData) {
            playerData.gridController.updatePowerLevel(powerLevel);
            this.sendGUIMessage(playerId, {
                type: 'power_level_updated',
                powerLevel,
                grid: playerData.gridController.getGrid()
            });
        }
    }

    /**
     * Handle column update event
     */
    private handleColumnUpdate(playerId: string, columnIndex: number, updates: Partial<BiomeColumn>): void {
        this.updateGridColumn(playerId, columnIndex, updates);
    }

    /**
     * Clean up inactive GUI sessions
     */
    public cleanupInactiveSessions(maxAgeMinutes: number = 10): number {
        const now = Date.now();
        let cleanedCount = 0;

        for (const [playerId, playerData] of this.playerGUIData.entries()) {
            const ageMinutes = (now - playerData.lastInteraction) / (1000 * 60);

            if (ageMinutes > maxAgeMinutes) {
                this.playerGUIData.delete(playerId);
                cleanedCount++;
                this.logger.debug(`Cleaned up inactive GUI session for player: ${playerId}`);
            }
        }

        return cleanedCount;
    }

    /**
     * Get statistics about GUI handler
     */
    public getStatistics(): {
        activeSessions: number;
        totalSessions: number;
        players: string[];
    } {
        return {
            activeSessions: this.playerGUIData.size,
            totalSessions: this.playerGUIData.size,
            players: Array.from(this.playerGUIData.keys())
        };
    }
}
