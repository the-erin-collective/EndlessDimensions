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
            logger.info("[TerraBridgePlugin] Initializing with GraalVM context...");
            
            if (context instanceof Context) {
                Context graalContext = (Context) context;
                Value bindings = graalContext.getBindings("js");
                bindings.putMember("Terra", terraFacade);
                logger.info("[TerraBridgePlugin] Successfully injected 'Terra' into JS global scope");
            } else {
                logger.info("[TerraBridgePlugin] Initialize called - facade already in unified BridgeRegistry");
            }
            
        } catch (Exception e) {
            logger.warn("[TerraBridgePlugin] Could not inject directly, using unified BridgeRegistry: " + e.getMessage());
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
