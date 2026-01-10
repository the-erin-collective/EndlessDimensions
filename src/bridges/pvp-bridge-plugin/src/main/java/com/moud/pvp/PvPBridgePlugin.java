package com.moud.pvp;

import endless.bridge.BridgeContext;
import endless.bridge.DimensionConfigRegistry;
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
        logger.info("[PvPBridgePlugin] Initialize called - performing MinestomPvP library initialization...");
        
        try {
            // SECOND HANDSHAKE: Initialize the actual MinestomPvP library
            if (pvpBridge == null) {
                pvpBridge = new PvPBridge();
            }
            
            // Create a mock BridgeContext for initialization
            BridgeContext mockContext = new BridgeContext() {
                @Override
                public Object assetsRoot() {
                    return "assets/"; // Default assets path
                }
                
                @Override
                public Object configRoot() {
                    return "config/"; // Default config path
                }
                
                @Override
                public Object globalEventNode() {
                    return null; // Not needed for basic initialization
                }
                
                @Override
                public Logger logger() {
                    return LoggerFactory.getLogger(PvPBridgePlugin.class);
                }
                
                @Override
                public DimensionConfigRegistry dimensions() {
                    return null; // Not needed for basic initialization
                }
            };
            
            // Initialize the PvP bridge which will initialize MinestomPvP
            pvpBridge.initialize(mockContext);
            
            logger.info("[PvPBridgePlugin] MinestomPvP library initialized successfully");
        } catch (Exception e) {
            logger.error("[PvPBridgePlugin] Failed to initialize MinestomPvP library", e);
            throw new RuntimeException("MinestomPvP library initialization failed", e);
        }
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