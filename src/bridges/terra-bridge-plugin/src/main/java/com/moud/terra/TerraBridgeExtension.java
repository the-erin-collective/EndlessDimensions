package com.moud.terra;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import net.minestom.server.extensions.Extension;

/**
 * Terra Bridge Extension for minestom-ce-extensions
 * This will be automatically discovered and loaded by minestom-ce-extensions
 */
public class TerraBridgeExtension extends Extension {
    
    private static final Logger logger = LoggerFactory.getLogger(TerraBridgeExtension.class);
    private TerraBridgePlugin bridgePlugin;
    
    @Override
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
    
    @Override
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
