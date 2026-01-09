/// <reference types="@epi-studio/moud-sdk" />

import { BridgePluginManager } from './BridgePluginManager';

/**
 * Loot Service - handles loot generation using Trove bridge plugin
 * Uses the BridgePluginManager for proper plugin loading and coordination
 */
export class LootService {
    private bridgeManager: BridgePluginManager;
    
    constructor() {
        this.bridgeManager = new BridgePluginManager();
    }
    
    /**
     * Initialize the loot service
     */
    public async initialize(): Promise<void> {
        console.log('[LootService] Initializing with BridgePluginManager...');
        
        // Wait for Trove plugin to be available
        await this.bridgeManager.waitForPlugins([
            { name: 'Trove', globalName: 'Trove', check: () => typeof (globalThis as any).Trove !== 'undefined' }
        ]);
        
        const trovePlugin = this.bridgeManager.getPlugin('Trove');
        if (!trovePlugin) {
            console.error('[LootService] Trove bridge plugin not available - this is a fatal error!');
            throw new Error('Trove bridge plugin is required for loot generation but was not found. Please ensure that Trove bridge plugin is properly loaded.');
        }
        
        console.log('[LootService] Trove bridge plugin detected! Using Trove API...');
        console.log('[LootService] Integrated with Trove bridge system.');
    }
    
    /**
     * Handle block break events
     */
    public handleBlockBreak(event: any): void {
        const trovePlugin = this.bridgeManager.getPlugin('Trove');
        if (!trovePlugin) {
            console.error('[LootService] Trove bridge plugin not available - this is a fatal error!');
            throw new Error('Trove bridge plugin is required for loot generation but was not found. Please ensure that Trove bridge plugin is properly loaded.');
        }
        
        try {
            // Use Trove bridge for loot generation
            const position = event.position;
            const player = event.player;
            const block = event.block;
            
            console.log(`[LootService] Block broken: ${block} at ${position.x}, ${position.y}, ${position.z}`);
            
            // Generate loot using Trove bridge
            const lootResult = (globalThis as any).Trove.generateLoot({
                type: 'block_break',
                block: block,
                position: position,
                player: player
            });
            
            if (lootResult && lootResult.success) {
                console.log(`[LootService] Generated ${lootResult.items?.length || 0} items via Trove bridge`);
            } else {
                console.warn('[LootService] Trove bridge failed to generate loot');
            }
        } catch (e) {
            console.error('[LootService] Failed to process loot via bridge:', e);
        }
    }
}
