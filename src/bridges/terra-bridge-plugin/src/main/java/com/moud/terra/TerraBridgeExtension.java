package com.moud.terra;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Simple Terra Bridge Extension that doesn't depend on minestom-ce-extensions API
 * This will be loaded by custom extension system
 */
public class TerraBridgeExtension {
    
    private static final Logger logger = LoggerFactory.getLogger(TerraBridgeExtension.class);
    private TerraBridgePlugin bridgePlugin;
    
    /**
     * Initialize the extension
     */
    public void initialize() {
        logger.info("[TerraBridgeExtension] Initializing Terra bridge extension...");
        
        try {
            // Initialize the bridge plugin
            bridgePlugin = new TerraBridgePlugin();
            bridgePlugin.initialize(null);
            
            logger.info("[TerraBridgeExtension] Terra bridge extension initialized successfully");
        } catch (Exception e) {
            logger.error("[TerraBridgeExtension] Failed to initialize Terra bridge extension", e);
            throw new RuntimeException("Failed to initialize Terra bridge extension", e);
        }
    }
    
    /**
     * Terminate the extension
     */
    public void terminate() {
        logger.info("[TerraBridgeExtension] Terminating Terra bridge extension...");
        
        if (bridgePlugin != null) {
            try {
                bridgePlugin.shutdown();
                logger.info("[TerraBridgeExtension] Terra bridge extension terminated successfully");
            } catch (Exception e) {
                logger.error("[TerraBridgeExtension] Error during Terra bridge extension termination", e);
            }
        }
    }
}
