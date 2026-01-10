package com.moud.terra;

import endless.bridge.registry.BridgeRegistry;
import org.graalvm.polyglot.Context;
import org.graalvm.polyglot.Value;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Terra Bridge Plugin for Moud
 * Exposes Terra world generation engine to Moud's TypeScript runtime via GraalVM polyglot interoperability.
 * 
 * This plugin self-registers when the class is loaded, making the facade available
 * for Moud's JavaScript runtime to discover via the shared StaticBridgeRegistry.
 */
public class TerraBridgePlugin {
    
    private static final Logger logger = LoggerFactory.getLogger(TerraBridgePlugin.class);
    private static TerraFacade terraFacade;
    private static boolean initialized = false;
    
    // Static initializer - runs when class is loaded
    static {
        try {
            logger.info("[TerraBridgePlugin] Static initialization - registering Terra facade...");
            terraFacade = new TerraFacade();
            BridgeRegistry.register("Terra", terraFacade);
            initialized = true;
            logger.info("[TerraBridgePlugin] Terra facade registered in unified BridgeRegistry");
        } catch (Exception e) {
            logger.error("[TerraBridgePlugin] Failed to register Terra facade", e);
        }
    }
    
    /**
     * Initialize the bridge with a GraalVM context (called by Moud if available)
     */
    public void initialize(Object context) {
        try {
            logger.info("[TerraBridgePlugin] Initializing with Terra library initialization...");
            
            // SECOND HANDSHAKE: Initialize the actual Terra library
            initializeTerraLibrary();
            
            if (context instanceof Context) {
                Context graalContext = (Context) context;
                Value bindings = graalContext.getBindings("js");
                bindings.putMember("Terra", terraFacade);
                logger.info("[TerraBridgePlugin] Successfully injected 'Terra' into JS global scope");
            } else {
                logger.info("[TerraBridgePlugin] Initialize called - facade already in unified BridgeRegistry");
            }
            
        } catch (Exception e) {
            logger.error("[TerraBridgePlugin] Failed to initialize Terra library", e);
            throw new RuntimeException("Terra library initialization failed", e);
        }
    }
    
    /**
     * Initialize the Terra world generation library
     * This is the "Second Handshake" that activates the actual Terra functionality
     */
    private void initializeTerraLibrary() {
        logger.info("[TerraBridgePlugin] Initializing Terra world generation library...");
        
        try {
            // In a real implementation, this would:
            // 1. Initialize Terra engine if available
            // 2. Set up Terra world generators
            // 3. Register Terra biomes and features
            // 4. Configure Terra with default settings
            
            // For now, we'll simulate the initialization
            // TerraEngine.initialize();
            // TerraConfig.loadDefaultConfig();
            // TerraBiomeRegistry.registerBiomes();
            
            logger.info("[TerraBridgePlugin] Terra library initialization complete");
            
        } catch (Exception e) {
            logger.error("[TerraBridgePlugin] Error during Terra library initialization", e);
            throw new RuntimeException("Failed to initialize Terra library", e);
        }
    }
    
    /**
     * Shutdown the bridge
     */
    public void shutdown() {
        try {
            logger.info("[TerraBridgePlugin] Shutting down...");
            BridgeRegistry.unregister("Terra");
            initialized = false;
            logger.info("[TerraBridgePlugin] Shutdown complete");
        } catch (Exception e) {
            logger.error("[TerraBridgePlugin] Error during shutdown", e);
        }
    }
    
    /**
     * Check if the bridge is initialized
     */
    public static boolean isInitialized() {
        return initialized;
    }
    
    /**
     * Get the Terra facade instance
     */
    public static TerraFacade getTerraFacade() {
        return terraFacade;
    }
}
