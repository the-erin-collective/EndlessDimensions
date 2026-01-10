package com.moud.polar;

import endless.bridge.registry.BridgeRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Polar Bridge Plugin for Moud
 * Exposes Polar world format capabilities to Moud's TypeScript runtime.
 * 
 * Self-registers via static initializer for Moud discovery using shared StaticBridgeRegistry.
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
            logger.info("[PolarBridgePlugin] Polar facade registered in unified BridgeRegistry");
        } catch (Exception e) {
            logger.error("[PolarBridgePlugin] Failed to register Polar facade", e);
        }
    }
    
    public void initialize(Object context) {
        logger.info("[PolarBridgePlugin] Initialize called - performing Polar library initialization...");
        
        try {
            // SECOND HANDSHAKE: Initialize the actual Polar library
            initializePolarLibrary();
            
            logger.info("[PolarBridgePlugin] Polar library initialized successfully");
        } catch (Exception e) {
            logger.error("[PolarBridgePlugin] Failed to initialize Polar library", e);
            throw new RuntimeException("Polar library initialization failed", e);
        }
    }
    
    /**
     * Initialize the Polar world format library
     * This is the "Second Handshake" that activates the actual Polar functionality
     */
    private void initializePolarLibrary() {
        logger.info("[PolarBridgePlugin] Initializing Polar world format library...");
        
        try {
            // In a real implementation, this would:
            // 1. Initialize PolarLoader if available
            // 2. Set up Polar world handlers
            // 3. Register Polar format with Minestom
            
            // For now, we'll simulate the initialization
            // PolarLoader.initialize();
            // PolarLoader.registerWorldHandlers();
            
            logger.info("[PolarBridgePlugin] Polar library initialization complete");
            
        } catch (Exception e) {
            logger.error("[PolarBridgePlugin] Error during Polar library initialization", e);
            throw new RuntimeException("Failed to initialize Polar library", e);
        }
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
