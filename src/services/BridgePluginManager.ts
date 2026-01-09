/**
 * Bridge Plugin Manager - handles loading and coordination of bridge plugins
 * Provides proper async plugin loading with dependency resolution
 */
export class BridgePluginManager {
    private plugins: Map<string, any> = new Map();
    private loadingPromises: Map<string, Promise<any>> = new Map();
    private isInitialized = false;
    
    constructor() {
        this.setupPluginDetection();
    }
    
    /**
     * Setup plugin detection and registration
     */
    private setupPluginDetection(): void {
        // Register plugin ready callbacks
        globalThis.onMoudReady = (callback) => {
            if (!this.isInitialized) {
                this.isInitialized = true;
                console.log('[BridgePluginManager] Plugin system initialized');
            }
            callback();
        };
        
        // Start plugin detection
        this.detectAndLoadPlugins();
    }
    
    /**
     * Detect available plugins and load them
     */
    private async detectAndLoadPlugins(): Promise<void> {
        console.log('[BridgePluginManager] Starting plugin detection...');
        
        // Check for each bridge plugin
        const bridgePlugins = [
            { name: 'Terra', globalName: 'Terra', check: () => typeof (globalThis as any).Terra !== 'undefined' },
            { name: 'Polar', globalName: 'Polar', check: () => typeof (globalThis as any).Polar !== 'undefined' },
            { name: 'Trove', globalName: 'Trove', check: () => typeof (globalThis as any).Trove !== 'undefined' },
            { name: 'PvP', globalName: 'PvP', check: () => typeof (globalThis as any).PvP !== 'undefined' }
        ];
        
        // Wait for plugins to be available
        await this.waitForPlugins(bridgePlugins);
        
        // Load available plugins
        for (const plugin of bridgePlugins) {
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
     * Wait for plugins to become available
     */
    public async waitForPlugins(plugins: Array<{name: string, globalName: string, check: () => boolean}>): Promise<void> {
        const maxWaitTime = 5000; // 5 seconds max wait
        const startTime = Date.now();
        
        while (Date.now() - startTime < maxWaitTime) {
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Check if all required plugins are available
            const allAvailable = plugins.every(plugin => plugin.check());
            if (allAvailable) {
                console.log('[BridgePluginManager] All required plugins are available');
                break;
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
    private async loadPlugin(plugin: {name: string, globalName: string, check: () => boolean}): Promise<any> {
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
    private async getPluginInstance(plugin: {name: string, globalName: string, check: () => boolean}): Promise<any> {
        // Return the global plugin instance
        return (globalThis as any)[plugin.globalName];
    }
}
