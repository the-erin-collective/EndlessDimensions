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
        console.log('[BridgePluginManager] Starting plugin detection for minestom-ce-extensions...');

        // Check for each bridge extension - extensions are now loaded by Minestom's extension system
        const bridgeExtensions = [
            { name: 'Terra', globalName: 'Terra', extensionName: 'Terra' },
            { name: 'Polar', globalName: 'Polar', extensionName: 'Polar' },
            { name: 'Trove', globalName: 'Trove', extensionName: 'Trove' },
            { name: 'PvP', globalName: 'PvP', extensionName: 'PvP' }
        ];

        // Wait for Minestom extensions to be loaded
        await this.waitForMinestomExtensions();

        // Try to inject from Java registries into global scope
        await this.injectFromJavaRegistries(bridgeExtensions);

        // Create check functions
        const extensionsWithCheck = bridgeExtensions.map(extension => ({
            ...extension,
            check: () => typeof (globalThis as any)[extension.globalName] !== 'undefined'
        }));

        // Log what's currently available
        console.log('[BridgePluginManager] Current global scope check:');
        extensionsWithCheck.forEach(extension => {
            const available = extension.check();
            console.log(`[BridgePluginManager] ${extension.name}: ${available ? '✓ Available' : '✗ Missing'}`);
        });

        // Wait for extensions to be available
        await this.waitForExtensions(extensionsWithCheck);

        // Load available extensions
        for (const extension of extensionsWithCheck) {
            if (extension.check()) {
                console.log(`[BridgePluginManager] Loading ${extension.name} bridge extension...`);
                await this.loadExtension(extension);
                this.plugins.set(extension.name, await this.getExtensionInstance(extension));
            } else {
                console.log(`[BridgePluginManager] ${extension.name} bridge extension not available`);
            }
        }

        console.log(`[BridgePluginManager] Extension loading complete. Loaded ${this.plugins.size} extensions.`);
    }

    /**
     * Try to inject bridge facades from Java BridgeRegistry into global scope
     */
    private async injectFromJavaRegistries(extensions: Array<{ name: string, globalName: string, extensionName: string }>): Promise<void> {
        console.log('[BridgePluginManager] Attempting to inject facades from Java BridgeRegistry...');

        for (const extension of extensions) {
            try {
                // Skip if already in global scope
                if (typeof (globalThis as any)[extension.globalName] !== 'undefined') {
                    console.log(`[BridgePluginManager] ${extension.name} already in global scope`);
                    continue;
                }

                // Try to get from Java BridgeRegistry using Java.type
                if (typeof (globalThis as any).Java !== 'undefined' && (globalThis as any).Java.type) {
                    try {
                        const registryClass = (globalThis as any).Java.type('endless.bridge.registry.BridgeRegistry');
                        if (registryClass && registryClass.isRegistered(extension.name)) {
                            const facade = registryClass.get(extension.name);
                            if (facade) {
                                (globalThis as any)[extension.globalName] = facade;
                                console.log(`[BridgePluginManager] ✓ Injected ${extension.name} from unified BridgeRegistry`);
                            }
                        }
                    } catch (e: any) {
                        console.log(`[BridgePluginManager] Could not access endless.bridge.registry.BridgeRegistry: ${e.message || e}`);
                    }
                }
            } catch (e: any) {
                console.warn(`[BridgePluginManager] Error checking ${extension.name} registry: ${e.message || e}`);
            }
        }
    }


    /**
     * Wait for Minestom extensions to be loaded
     */
    private async waitForMinestomExtensions(): Promise<void> {
        console.log('[BridgePluginManager] Waiting for Minestom extensions to load...');
        
        // Wait for the extension system to be ready
        const maxWaitTime = 15000; // 15 seconds max wait for extensions
        const startTime = Date.now();
        
        while (Date.now() - startTime < maxWaitTime) {
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Check if Minestom extension manager is available
            if ((globalThis as any).Java && (globalThis as any).Java.type) {
                try {
                    const ExtensionManager = (globalThis as any).Java.type('net.minestom.server.extensions.ExtensionManager');
                    if (ExtensionManager) {
                        console.log('[BridgePluginManager] Minestom ExtensionManager is available');
                        break;
                    }
                } catch (e) {
                    // ExtensionManager not yet available
                }
            }
        }
        
        // Give extensions an additional moment to initialize
        await new Promise(resolve => setTimeout(resolve, 2000));
        console.log('[BridgePluginManager] Proceeding with extension detection...');
    }

    /**
     * Wait for extensions to become available
     */
    public async waitForExtensions(extensions: Array<{ name: string, globalName: string, check: () => boolean }>): Promise<void> {
        const maxWaitTime = 10000; // 10 seconds max wait
        const startTime = Date.now();

        console.log(`[BridgePluginManager] Waiting for extensions: ${extensions.map(e => e.name).join(', ')}`);

        while (Date.now() - startTime < maxWaitTime) {
            await new Promise(resolve => setTimeout(resolve, 200));

            // Check if all required extensions are available
            const allAvailable = extensions.every(extension => extension.check());
            if (allAvailable) {
                console.log('[BridgePluginManager] All required extensions are available');
                return;
            }

            // Log progress
            const availableExtensions = extensions.filter(extension => extension.check()).map(e => e.name);
            const missingExtensions = extensions.filter(extension => !extension.check()).map(e => e.name);
            if (availableExtensions.length > 0) {
                console.log(`[BridgePluginManager] Available: ${availableExtensions.join(', ')}, Missing: ${missingExtensions.join(', ')}`);
            }
        }

        const waitTime = Date.now() - startTime;
        if (waitTime >= maxWaitTime) {
            const missingExtensions = extensions.filter(extension => !extension.check()).map(e => e.name);
            if (missingExtensions.length > 0) {
                console.error(`[BridgePluginManager] Missing extensions after ${maxWaitTime}ms: ${missingExtensions.join(', ')}`);
                throw new Error(`Required bridge extensions not available: ${missingExtensions.join(', ')}`);
            }
        }
    }

    /**
     * Load a specific extension (placeholder - would be implemented by each bridge extension)
     */
    private async loadExtension(extension: { name: string, globalName: string, check: () => boolean }): Promise<any> {
        // Extensions are now loaded by Minestom's extension system
        // We just need to verify they're available and accessible
        console.log(`[BridgePluginManager] Loaded ${extension.name} extension (via Minestom extension system)`);
        return {
            name: extension.name,
            isLoaded: true,
            isExtension: true
        };
    }

    /**
     * Get extension instance by name
     */
    public getExtension(name: string): any {
        return this.plugins.get(name);
    }

    /**
     * Get plugin instance by name (legacy compatibility)
     */
    public getPlugin(name: string): any {
        return this.getExtension(name);
    }

    /**
     * Get extension instance (helper method)
     */
    private async getExtensionInstance(extension: { name: string, globalName: string, check: () => boolean }): Promise<any> {
        // Return the global extension instance
        return (globalThis as any)[extension.globalName];
    }

    /**
     * Get plugin instance (legacy compatibility)
     */
    private async getPluginInstance(plugin: { name: string, globalName: string, check: () => boolean }): Promise<any> {
        return this.getExtensionInstance(plugin);
    }
}
