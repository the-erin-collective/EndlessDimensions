/// <reference types="@epi-studio/moud-sdk" />

import { BridgePluginManager } from './BridgePluginManager';

/**
 * Dimension Service - handles dimension creation and terrain generation
 * Uses the BridgePluginManager for proper plugin loading and coordination
 */
export class DimensionService {
    private api: MoudAPI;
    private bridgeManager: BridgePluginManager;
    private isInitialized: boolean = false;

    constructor(api: MoudAPI) {
        this.api = api;
        this.bridgeManager = new BridgePluginManager();
    }

    /**
     * Initialize the dimension service
     */
    public async initialize(): Promise<void> {
        if (this.isInitialized) return;

        console.log('[DimensionService] Initializing with BridgePluginManager...');

        // Initialize bridge plugin manager
        await this.bridgeManager.waitForPlugins([
            { name: 'Terra', globalName: 'Terra', check: () => typeof (globalThis as any).Terra !== 'undefined' },
            { name: 'Polar', globalName: 'Polar', check: () => typeof (globalThis as any).Polar !== 'undefined' },
            { name: 'Trove', globalName: 'Trove', check: () => typeof (globalThis as any).Trove !== 'undefined' },
            { name: 'PvP', globalName: 'PvP', check: () => typeof (globalThis as any).PvP !== 'undefined' }
        ]);

        console.log('[DimensionService] BridgePluginManager initialized successfully');

        // Setup Terra for the default world
        await this.setupDefaultTerrain();

        // Register for dynamic dimension creation events
        this.registerEvents();

        this.isInitialized = true;
        console.log('[DimensionService] Integration complete.');
    }

    /**
     * Setup Terra terrain generation for default world using Terra bridge plugin
     */
    private async setupDefaultTerrain(): Promise<void> {
        const terraPlugin = this.bridgeManager.getPlugin('Terra');
        if (!terraPlugin) {
            console.error('[DimensionService] Terra bridge plugin not available - this is a fatal error!');
            throw new Error('Terra bridge plugin is required for terrain generation but was not found. Please ensure that Terra bridge plugin is properly loaded.');
        }

        console.log('[DimensionService] Using Terra bridge plugin for terrain generation...');

        try {
            // Use Terra bridge plugin for world generation
            const defaultInstance = (this.api as any).world.getDefaultInstance();
            if (defaultInstance) {
                console.log('[DimensionService] Found default instance, applying Terra generator...');

                // Create world using Terra bridge plugin
                const world = (globalThis as any).Terra.defaultPack()
                    .seed(1234567890123456789n) // Use BigInt for large seeds
                    .attach();

                console.log('[DimensionService] Terra world generated successfully:', world);

                // Enable Lighting
                this.enableLighting(defaultInstance);

                // Enable Fluids
                this.enableFluids(defaultInstance);
            } else {
                console.warn('[DimensionService] Default instance not found.');
            }
        } catch (error) {
            console.error('[DimensionService] Failed to setup terrain:', error);
        }
    }

    /**
     * Fallback method for legacy Terra setup using direct Java interop
     */
    private async setupDefaultTerrainLegacy(): Promise<void> {
        const polarPlugin = this.bridgeManager.getPlugin('Polar');
        if (!polarPlugin) {
            console.error('[DimensionService] Polar bridge plugin not available - this is a fatal error!');
            throw new Error('Polar bridge plugin is required for world persistence but was not found. Please ensure that Polar bridge plugin is properly loaded.');
        }

        console.log('[DimensionService] Using Polar bridge plugin for persistence...');

        // Create default instance for persistence
        const defaultInstance = (this.api as any).world.getDefaultInstance();
        if (defaultInstance) {
            console.log('[DimensionService] Found default instance, applying hooks...');

            // Create Polar Loader for persistence first
            const polarPath = "worlds/overworld.polar";
            const polarPlugin = (globalThis as any).Polar.load(polarPath);
            defaultInstance.setChunkLoader(polarPlugin);
            console.log('[DimensionService] Polar chunk loader applied.');
        } else {
            console.warn('[DimensionService] Default instance not found.');
        }
    }

    /**
     * Register events for dimension lifecycle
     */
    private registerEvents(): void {
        console.log('[DimensionService] Registering instance lifecycle events...');

        // Listen for instance creation to apply hooks to dynamic dimensions
        this.api.on('instance.load', (event) => this.handleInstanceLoad(event));

        // Optional: handle unloads if specific cleanup is needed
        // this.api.on('instance.unload', (event) => this.handleInstanceUnload(event));
    }

    /**
     * Handle newly loaded instances (including dynamic dimensions)
     */
    private handleInstanceLoad(event: any): void {
        const instance = event.instance;
        if (!instance) return;

        // Skip the default world if it's already handled (or re-apply safely)
        const defaultInstance = (this.api as any).world.getDefaultInstance();
        if (instance === defaultInstance) return;

        console.log(`[DimensionService] New instance detected, applying hooks...`);

        try {
            // Apply persistence
            this.applyPersistence(instance);

            // Apply terrain generation
            this.applyTerrain(instance);

            // Apply environment features
            this.enableLighting(instance);
            this.enableFluids(instance);

        } catch (error) {
            console.error('[DimensionService] Failed to apply hooks to instance:', error);
        }
    }

    /**
     * Apply persistence to an instance
     */
    private applyPersistence(instance: any): void {
        const polarPlugin = this.bridgeManager.getPlugin('Polar');
        if (polarPlugin) {
            console.log('[DimensionService] Using Polar bridge plugin for persistence...');

            // Generate a path based on instance ID or unique identifier
            const id = instance.getUniqueId ? instance.getUniqueId() : Date.now().toString();
            const dimensionId = `dimension_${id}`;
            const polarFile = `${id}.polar`;

            // Load Polar world using bridge plugin
            (globalThis as any).Polar.load(dimensionId, polarFile)
                .then(result => {
                    if (result.isSuccess()) {
                        console.log(`[DimensionService] Polar world loaded: ${dimensionId}`);
                    } else {
                        console.warn(`[DimensionService] Failed to load Polar world: ${result.getMessage()}`);
                    }
                })
                .catch(error => {
                    console.error('[DimensionService] Error loading Polar world:', error);
                });

            console.log(`[DimensionService] Polar persistence applied to instance: ${dimensionId}`);
        } else {
            console.warn('[DimensionService] Polar bridge plugin not available, skipping persistence.');
        }
    }

    /**
     * Apply terrain generation to an instance
     */
    private applyTerrain(instance: any): void {
        const terraPlugin = this.bridgeManager.getPlugin('Terra');
        if (terraPlugin) {
            console.log('[DimensionService] Using Terra bridge plugin for terrain generation...');

            try {
                // Use Terra bridge plugin for world generation
                const world = (globalThis as any).Terra.defaultPack()
                    .seed(1234567890123456789n) // Use BigInt for large seeds
                    .attach();

                console.log('[DimensionService] Terra world generated successfully:', world);

                // Enable Lighting
                this.enableLighting(instance);

                // Enable Fluids
                this.enableFluids(instance);
            } catch (error) {
                console.error('[DimensionService] Failed to apply terrain:', error);
            }
        } else {
            console.error('[DimensionService] Terra bridge plugin not available - this is a fatal error!');
            throw new Error('Terra bridge plugin is required for terrain generation but was not found. Please ensure that Terra bridge plugin is properly loaded.');
        }
    }

    /**
     * Apply environment features to an instance
     */
    private enableLighting(instance: any): void {
        const getJava = () => {
            const candidates = [
                (globalThis as any).Java,
                (globalThis as any).moud?.java,
                (globalThis as any).moud?.native,
                (this.api as any).internal?.java,
                (globalThis as any).require ? (globalThis as any).require('native') : null,
                (globalThis as any).require ? (globalThis as any).require('moud') : null
            ];

            for (const c of candidates) {
                if (c && (typeof c.type === 'function' || typeof c.getClass === 'function' || typeof c.getNativeClass === 'function')) return c;
            }
            return undefined;
        };
        const java = getJava();
        if (!java) return;

        try {
            const LightEngine = java.type('dev.aprilthepink.light.LightEngine');
            LightEngine.enableBlockLight(instance);
            LightEngine.enableSkyLight(instance);
            console.log('[DimensionService] Lighting enabled for instance.');
        } catch (e) {
            console.warn('[DimensionService] MinestomBasicLight not found or failed:', e);
        }
    }

    /**
     * Apply fluid physics to an instance
     */
    private enableFluids(instance: any): void {
        const getJava = () => {
            const candidates = [
                (globalThis as any).Java,
                (globalThis as any).moud?.java,
                (globalThis as any).moud?.native,
                (this.api as any).internal?.java,
                (globalThis as any).require ? (globalThis as any).require('native') : null,
                (globalThis as any).require ? (globalThis as any).require('moud') : null
            ];
            for (const c of candidates) {
                if (c && (typeof c.type === 'function' || typeof c.getClass === 'function' || typeof c.getNativeClass === 'function')) return c;
            }
            return undefined;
        };
        const java = getJava();

        if (!java) return;
        try {
            const MinestomFluids = java.type('io.github.togar2.fluids.MinestomFluids');
            MinestomFluids.setPlacementRule(instance);
            console.log('[DimensionService] Fluid physics enabled for instance.');
        } catch (e) {
            console.warn('[DimensionService] MinestomFluids not found or failed:', e);
        }
    }
}
