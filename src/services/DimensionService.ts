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
     * Setup Terra terrain generation for the default world
     */
    private async setupDefaultTerrain(): Promise<void> {
        console.log('[DimensionService] Setting up default world terrain (Plains)...');

        // Use Java-backed Terra integration
        const java = (globalThis as any).Java;
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
        const java = (globalThis as any).Java;
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
        const java = (globalThis as any).Java;
        if (!java) return;
        try {
            const TerraMinestomWorldBuilder = java.type('com.dfsek.terra.api.minestom.TerraMinestomWorldBuilder');

            // For dynamic dimensions, we might want to use a specific pack 
            // or the default one for now.
            TerraMinestomWorldBuilder.from(instance)
                .defaultPack()
                .attach();

            console.log(`[DimensionService] Terra terrain applied to instance.`);
        } catch (e) {
            console.error('[DimensionService] Failed to apply Terra:', e);
        }
    }

    private enableLighting(instance: any): void {
        const java = (globalThis as any).Java;
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
        const java = (globalThis as any).Java;
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
