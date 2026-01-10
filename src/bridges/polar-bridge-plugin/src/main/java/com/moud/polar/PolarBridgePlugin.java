package com.moud.polar;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Polar Bridge Plugin for Moud
 * Exposes Polar world format capabilities to Moud's TypeScript runtime.
 * 
 * Self-registers via static initializer for Moud discovery.
 */
public class PolarBridgePlugin {
    
    private static final Logger logger = LoggerFactory.getLogger(PolarBridgePlugin.class);
    private static PolarFacade polarFacade;
    private static boolean initialized = false;
    
    static {
        try {
            logger.info("[PolarBridgePlugin] Static initialization - registering Polar facade...");
            polarFacade = new PolarFacade();
            BridgeRegistry.register("Polar", polarFacade);
            initialized = true;
            logger.info("[PolarBridgePlugin] Polar facade registered in BridgeRegistry");
        } catch (Exception e) {
            logger.error("[PolarBridgePlugin] Failed to register Polar facade", e);
        }
    }
    
    public void initialize(Object context) {
        logger.info("[PolarBridgePlugin] Initialize called - facade already in BridgeRegistry");
    }
    
    public void shutdown() {
        try {
            logger.info("[PolarBridgePlugin] Shutting down...");
            BridgeRegistry.unregister("Polar");
            initialized = false;
        } catch (Exception e) {
            logger.error("[PolarBridgePlugin] Error during shutdown", e);
        }
    }
    
    public static boolean isInitialized() { return initialized; }
    public static PolarFacade getPolarFacade() { return polarFacade; }
}
