/// <reference types="@epi-studio/moud-sdk" />

export class LootService {
    private api: MoudAPI;
    private isInitialized: boolean = false;

    constructor(api: MoudAPI) {
        this.api = api;
    }

    public initialize(): void {
        if (this.isInitialized) return;

        console.log('[LootService] Initializing...');

        // Check if Trove bridge is available
        if (typeof (globalThis as any).Trove === 'undefined') {
            console.warn('[LootService] Trove bridge not available - loot generation disabled');
            this.isInitialized = true;
            return;
        }

        // Register for block break events
        this.api.on('player.blockBreak', (event) => this.handleBlockBreak(event));

        this.isInitialized = true;
        console.log('[LootService] Integrated with Trove bridge system.');
    }

    private handleBlockBreak(event: any): void {
        // Check if Trove bridge is available
        if (typeof (globalThis as any).Trove === 'undefined') {
            console.warn('[LootService] Trove bridge not available - using vanilla drops');
            return;
        }

        try {
            // Use the Trove bridge for loot generation
            const position = event.position;
            const player = event.player;
            const block = event.block;

            console.log(`[LootService] Block broken: ${block} at ${position.x}, ${position.y}, ${position.z}`);

            // Generate loot using Trove bridge
            // The bridge will handle the actual loot generation internally
            // This is a simplified interface - the bridge handles the complex logic
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
