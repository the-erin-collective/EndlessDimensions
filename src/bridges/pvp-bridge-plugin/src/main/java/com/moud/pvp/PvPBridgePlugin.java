package com.moud.pvp;

import endless.bridge.registry.BridgeRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * PvP Bridge Plugin for Moud
 * Exposes PvP combat mechanics to Moud's TypeScript runtime.
 * 
 * Self-registers via static initializer for Moud discovery.
 */
public class PvPBridgePlugin {
    
    private static final Logger logger = LoggerFactory.getLogger(PvPBridgePlugin.class);
    private static PvPFacade pvpFacade;
    private static PvPBridge pvpBridge;
    private static boolean initialized = false;
    
    static {
        try {
            logger.info("[PvPBridgePlugin] Static initialization - registering PvP facade...");
            pvpBridge = new PvPBridge();
            pvpFacade = new PvPFacade(pvpBridge);
            BridgeRegistry.register("PvP", pvpFacade);
            initialized = true;
            logger.info("[PvPBridgePlugin] PvP facade registered in unified BridgeRegistry");
        } catch (Exception e) {
            logger.error("[PvPBridgePlugin] Failed to register PvP facade", e);
        }
    }
    
    public void initialize(Object context) {
        logger.info("[PvPBridgePlugin] Initialize called - facade already in unified BridgeRegistry");
    }
    
    public void shutdown() {
        try {
            logger.info("[PvPBridgePlugin] Shutting down...");
            BridgeRegistry.unregister("PvP");
            initialized = false;
        } catch (Exception e) {
            logger.error("[PvPBridgePlugin] Error during shutdown", e);
        }
    }
    
    public static boolean isInitialized() { return initialized; }
    public static PvPFacade getPvPFacade() { return pvpFacade; }
}