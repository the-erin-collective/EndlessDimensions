/// <reference types="@epi-studio/moud-sdk" />

export class DimensionService {
    private api: MoudAPI;
    private isInitialized: boolean = false;

    constructor(api: MoudAPI) {
        this.api = api;
    }

    /**
     * Initialize the dimension service
     */
    public async initialize(): Promise<void> {
        if (this.isInitialized) return;

        console.log('[DimensionService] Initializing...');

        try {
            // Setup Terra for the default world
            await this.setupDefaultTerrain();

            // Register for dynamic dimension creation events
            this.registerEvents();

            this.isInitialized = true;
            console.log('[DimensionService] Integration complete.');
        } catch (error) {
            console.error('[DimensionService] Failed to initialize:', error);
        }
    }

    /**
     * Setup Terra terrain generation for default world using Terra bridge plugin
     */
    private async setupDefaultTerrain(): Promise<void> {
        console.log('[DimensionService] Setting up default world terrain using Terra bridge plugin...');

        try {
            // Check if Terra bridge plugin is available
            if (typeof (globalThis as any).Terra !== 'undefined') {
                console.log('[DimensionService] Terra bridge plugin detected! Using Terra API...');

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
            } else {
                console.warn('[DimensionService] Terra bridge plugin not available. Falling back to manual Java interop...');

                // Fallback to original Java interop method
                await this.setupDefaultTerrainLegacy();
            }
        } catch (error) {
            console.error('[DimensionService] Failed to setup terrain:', error);
        }
    }

    /**
     * Fallback method for legacy Terra setup using direct Java interop
     */
    private async setupDefaultTerrainLegacy(): Promise<void> {
        console.log('[DimensionService] Using legacy Java interop for Terra setup...');

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
                if (!c) continue;
                // Check for capability
                const hasType = typeof c.type === 'function';
                const hasGetClass = typeof c.getClass === 'function';
                const hasGetNative = typeof c.getNativeClass === 'function';

                if (hasType || hasGetClass || hasGetNative) {
                    // Create a wrapper to ensure .type() exists
                    return {
                        ...c, // Try to spread properties (might not work for HostObjects, but safe for JS objects)
                        type: (name: string) => {
                            if (hasType) return c.type(name);
                            if (hasGetClass) return c.getClass(name);
                            if (hasGetNative) return c.getNativeClass(name);
                            throw new Error('Java bridge capability lost');
                        },
                        // Preserve original reference just in case
                        _raw: c
                    };
                }
            }
            return undefined;
        };
        const java = getJava();

        if (typeof java !== 'undefined') {
            try {
                // Determine Terra and Polar Java classes
                const TerraMinestomWorldBuilder = java.type('com.dfsek.terra.api.minestom.TerraMinestomWorldBuilder');
                const PolarLoader = java.type('com.hollowcube.polar.PolarLoader');
                const Paths = java.type('java.nio.file.Paths');

                console.log('[DimensionService] Java environment detected. Ready for library hooks.');

                // Assign generator to default world
                const defaultInstance = (this.api as any).world.getDefaultInstance();
                if (defaultInstance) {
                    console.log('[DimensionService] Found default instance, applying hooks...');

                    // Create Polar Loader for persistence first
                    const polarPath = Paths.get("worlds/overworld.polar");
                    const polarLoader = new PolarLoader(polarPath);
                    defaultInstance.setChunkLoader(polarLoader);
                    console.log('[DimensionService] Polar chunk loader applied.');

                    // Create Terra Generator with default pack
                    TerraMinestomWorldBuilder.from(defaultInstance)
                        .defaultPack()
                        .attach();

                    console.log('[DimensionService] Terra terrain generator applied.');

                    // Enable Lighting
                    this.enableLighting(defaultInstance);

                    // Enable Fluids
                    this.enableFluids(defaultInstance);
                } else {
                    console.warn('[DimensionService] Default instance not found.');
                }
            } catch (e) {
                console.error('[DimensionService] Java library integration failed:', e);
                console.error(e.stack);
            }
        } else {
            console.warn('[DimensionService] Java not found, skipping terrain hooks.');
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

        console.log(`[DimensionService] New instance detected, applying vanilla hooks...`);

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

    private applyPersistence(instance: any): void {
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
            const PolarLoader = java.type('com.hollowcube.polar.PolarLoader');
            const Paths = java.type('java.nio.file.Paths');

            // Generate a path based on instance ID or unique identifier
            // For now, using a simple naming convention
            const id = instance.getUniqueId ? instance.getUniqueId() : Date.now().toString();
            const polarPath = Paths.get(`worlds/${id}.polar`);

            const polarLoader = new PolarLoader(polarPath);
            instance.setChunkLoader(polarLoader);
            console.log(`[DimensionService] Polar persistence applied to instance.`);
        } catch (e) {
            console.error('[DimensionService] Failed to apply Polar:', e);
        }
    }

    private applyTerrain(instance: any): void {
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
            // Check if Terra bridge plugin is available first
            if (typeof (globalThis as any).Terra !== 'undefined') {
                console.log('[DimensionService] Using Terra bridge plugin for terrain generation...');
                
                // Use Terra bridge plugin for terrain generation
                (globalThis as any).Terra.defaultPack()
                    .seed(1234567890123456789n) // Use BigInt for large seeds
                    .attach();
                
                console.log('[DimensionService] Terra terrain applied to instance via bridge plugin.');
            } else {
                console.log('[DimensionService] Terra bridge plugin not available, falling back to direct Java interop...');
                
                // Fallback to direct Java interop method
                const TerraMinestomWorldBuilder = java.type('com.dfsek.terra.api.minestom.TerraMinestomWorldBuilder');

                // For dynamic dimensions, we might want to use a specific pack 
                // or to default one for now.
                TerraMinestomWorldBuilder.from(instance)
                    .defaultPack()
                    .attach();

                console.log('[DimensionService] Terra terrain applied to instance via direct Java interop.');
            }
        } catch (e) {
            console.error('[DimensionService] Failed to apply Terra:', e);
        }
    }

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
