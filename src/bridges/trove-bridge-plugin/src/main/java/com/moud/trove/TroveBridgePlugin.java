package com.moud.trove;

import endless.bridge.registry.BridgeRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Trove Bridge Plugin for Moud
 * Exposes Trove loot table capabilities to Moud's TypeScript runtime.
 * 
 * Self-registers via static initializer for Moud discovery.
 */
public class TroveBridgePlugin {
    
    private static final Logger logger = LoggerFactory.getLogger(TroveBridgePlugin.class);
    private static TroveFacade troveFacade;
    private static boolean initialized = false;
    
    static {
        try {
            logger.info("[TroveBridgePlugin] Static initialization - registering Trove facade...");
            TroveBridge troveBridge = new TroveBridge();
            troveFacade = new TroveFacade(troveBridge);
            BridgeRegistry.register("Trove", troveFacade);
            initialized = true;
            logger.info("[TroveBridgePlugin] Trove facade registered in unified BridgeRegistry");
        } catch (Exception e) {
            logger.error("[TroveBridgePlugin] Failed to register Trove facade", e);
        }
    }
    
    public void initialize(Object context) {
        logger.info("[TroveBridgePlugin] Initialize called - facade already in unified BridgeRegistry");
    }
    
    public void shutdown() {
        try {
            logger.info("[TroveBridgePlugin] Shutting down...");
            BridgeRegistry.unregister("Trove");
            initialized = false;
        } catch (Exception e) {
            logger.error("[TroveBridgePlugin] Error during shutdown", e);
        }
    }
    
    public static boolean isInitialized() { return initialized; }
    public static TroveFacade getTroveFacade() { return troveFacade; }
}
