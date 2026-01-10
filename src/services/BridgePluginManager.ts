/**
 * Bridge Plugin Manager - handles loading and coordination of bridge plugins
 * Provides proper async plugin loading with dependency resolution
 */
export class BridgePluginManager {
    private plugins: Map<string, any> = new Map();
    private loadingPromises: Map<string, Promise<any>> = new Map();
    private isInitialized = false;
    private initializationPromise: Promise<void> | null = null;

    constructor() {
        // Don't initialize immediately - wait for explicit call
    }

    /**
     * Setup plugin detection and registration (called when Moud is ready)
     */
    public async initialize(): Promise<void> {
        if (this.initializationPromise) {
            return this.initializationPromise;
        }

        this.initializationPromise = this.doInitialize();
        return this.initializationPromise;
    }

    private async doInitialize(): Promise<void> {
        console.log('[BridgePluginManager] Starting plugin initialization...');

        // Wait for Moud to be ready and plugins to be loaded
        await this.waitForMoudReady();

        // Give plugins a moment to be injected after Moud is ready
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Detect and load plugins
        await this.detectAndLoadPlugins();

        this.isInitialized = true;
        console.log('[BridgePluginManager] Plugin initialization complete.');
    }

    /**
     * Wait for Moud to be ready
     */
    private waitForMoudReady(): Promise<void> {
        return new Promise<void>((resolve) => {
            if ((globalThis as any).api && ((globalThis as any).api.server || (globalThis as any).api.on)) {
                console.log('[BridgePluginManager] Moud API is already available');
                resolve();
                return;
            }

            console.log('[BridgePluginManager] Waiting for Moud API...');
            const checkInterval = setInterval(() => {
                if ((globalThis as any).api && ((globalThis as any).api.server || (globalThis as any).api.on)) {
                    console.log('[BridgePluginManager] Moud API is now available');
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 100);

            // Timeout after 10 seconds
            setTimeout(() => {
                clearInterval(checkInterval);
                console.warn('[BridgePluginManager] Moud API check timed out, proceeding anyway');
                resolve();
            }, 10000);
        });
    }

    /**
     * Detect available plugins and load them
     */
    private async detectAndLoadPlugins(): Promise<void> {
        console.log('[BridgePluginManager] Starting plugin detection...');

        // Check for each bridge plugin - first in global scope, then in Java BridgeRegistry
        const bridgePlugins = [
            { name: 'Terra', globalName: 'Terra', registryClass: 'com.moud.terra.BridgeRegistry' },
            { name: 'Polar', globalName: 'Polar', registryClass: 'com.moud.polar.BridgeRegistry' },
            { name: 'Trove', globalName: 'Trove', registryClass: 'com.moud.trove.BridgeRegistry' },
            { name: 'PvP', globalName: 'PvP', registryClass: 'com.moud.pvp.BridgeRegistry' }
        ];

        // Try to inject from Java registries into global scope
        await this.injectFromJavaRegistries(bridgePlugins);

        // Create check functions
        const pluginsWithCheck = bridgePlugins.map(plugin => ({
            ...plugin,
            check: () => typeof (globalThis as any)[plugin.globalName] !== 'undefined'
        }));

        // Log what's currently available
        console.log('[BridgePluginManager] Current global scope check:');
        pluginsWithCheck.forEach(plugin => {
            const available = plugin.check();
            console.log(`[BridgePluginManager] ${plugin.name}: ${available ? '✓ Available' : '✗ Missing'}`);
        });

        // Wait for plugins to be available
        await this.waitForPlugins(pluginsWithCheck);

        // Load available plugins
        for (const plugin of pluginsWithCheck) {
            if (plugin.check()) {
                console.log(`[BridgePluginManager] Loading ${plugin.name} bridge plugin...`);
                await this.loadPlugin(plugin);
                this.plugins.set(plugin.name, await this.getPluginInstance(plugin));
            } else {
                console.log(`[BridgePluginManager] ${plugin.name} bridge plugin not available`);
            }
        }

        console.log(`[BridgePluginManager] Plugin loading complete. Loaded ${this.plugins.size} plugins.`);
    }

    /**
     * Try to inject bridge facades from Java BridgeRegistry into global scope
     */
    private async injectFromJavaRegistries(plugins: Array<{ name: string, globalName: string, registryClass: string }>): Promise<void> {
        console.log('[BridgePluginManager] Attempting to inject facades from Java BridgeRegistry...');

        for (const plugin of plugins) {
            try {
                // Skip if already in global scope
                if (typeof (globalThis as any)[plugin.globalName] !== 'undefined') {
                    console.log(`[BridgePluginManager] ${plugin.name} already in global scope`);
                    continue;
                }

                // Try to get from Java BridgeRegistry using Java.type
                if (typeof (globalThis as any).Java !== 'undefined' && (globalThis as any).Java.type) {
                    try {
                        const RegistryClass = (globalThis as any).Java.type(plugin.registryClass);
                        if (RegistryClass && RegistryClass.isRegistered(plugin.name)) {
                            const facade = RegistryClass.get(plugin.name);
                            if (facade) {
                                (globalThis as any)[plugin.globalName] = facade;
                                console.log(`[BridgePluginManager] ✓ Injected ${plugin.name} from Java BridgeRegistry`);
                            }
                        }
                    } catch (e: any) {
                        console.log(`[BridgePluginManager] Could not access ${plugin.registryClass}: ${e.message || e}`);
                    }
                }
            } catch (e: any) {
                console.warn(`[BridgePluginManager] Error checking ${plugin.name} registry: ${e.message || e}`);
            }
        }
    }


    /**
     * Wait for plugins to become available
     */
    public async waitForPlugins(plugins: Array<{ name: string, globalName: string, check: () => boolean }>): Promise<void> {
        const maxWaitTime = 10000; // 10 seconds max wait
        const startTime = Date.now();

        console.log(`[BridgePluginManager] Waiting for plugins: ${plugins.map(p => p.name).join(', ')}`);

        while (Date.now() - startTime < maxWaitTime) {
            await new Promise(resolve => setTimeout(resolve, 200));

            // Check if all required plugins are available
            const allAvailable = plugins.every(plugin => plugin.check());
            if (allAvailable) {
                console.log('[BridgePluginManager] All required plugins are available');
                return;
            }

            // Log progress
            const availablePlugins = plugins.filter(plugin => plugin.check()).map(p => p.name);
            const missingPlugins = plugins.filter(plugin => !plugin.check()).map(p => p.name);
            if (availablePlugins.length > 0) {
                console.log(`[BridgePluginManager] Available: ${availablePlugins.join(', ')}, Missing: ${missingPlugins.join(', ')}`);
            }
        }

        const waitTime = Date.now() - startTime;
        if (waitTime >= maxWaitTime) {
            const missingPlugins = plugins.filter(plugin => !plugin.check()).map(p => p.name);
            if (missingPlugins.length > 0) {
                console.error(`[BridgePluginManager] Missing plugins after ${maxWaitTime}ms: ${missingPlugins.join(', ')}`);
                throw new Error(`Required bridge plugins not available: ${missingPlugins.join(', ')}`);
            }
        }
    }

    /**
     * Load a specific plugin (placeholder - would be implemented by each bridge plugin)
     */
    private async loadPlugin(plugin: { name: string, globalName: string, check: () => boolean }): Promise<any> {
        // In a real implementation, this would load the actual plugin JAR
        // For now, return a mock plugin instance
        console.log(`[BridgePluginManager] Loaded ${plugin.name} plugin (mock implementation)`);
        return {
            name: plugin.name,
            isLoaded: true
        };
    }

    /**
     * Get plugin instance by name
     */
    public getPlugin(name: string): any {
        return this.plugins.get(name);
    }

    /**
     * Get plugin instance (helper method)
     */
    private async getPluginInstance(plugin: { name: string, globalName: string, check: () => boolean }): Promise<any> {
        // Return the global plugin instance
        return (globalThis as any)[plugin.globalName];
    }
}
