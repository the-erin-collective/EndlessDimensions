package com.moud.trove;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import net.minestom.server.extensions.Extension;

/**
 * Trove Bridge Extension for minestom-ce-extensions
 * This will be automatically discovered and loaded by minestom-ce-extensions
 */
public class TroveBridgeExtension extends Extension {
    
    private static final Logger logger = LoggerFactory.getLogger(TroveBridgeExtension.class);
    private TroveBridgePlugin bridgePlugin;
    
    @Override
    public void initialize() {
        logger.info("[TroveBridgeExtension] Initializing Trove bridge extension...");
        
        try {
            // Initialize the bridge plugin
            bridgePlugin = new TroveBridgePlugin();
            bridgePlugin.initialize(null);
            
            logger.info("[TroveBridgeExtension] Trove bridge extension initialized successfully");
        } catch (Exception e) {
            logger.error("[TroveBridgeExtension] Failed to initialize Trove bridge extension", e);
            throw new RuntimeException("Failed to initialize Trove bridge extension", e);
        }
    }
    
    @Override
    public void terminate() {
        logger.info("[TroveBridgeExtension] Terminating Trove bridge extension...");
        
        if (bridgePlugin != null) {
            try {
                bridgePlugin.shutdown();
                logger.info("[TroveBridgeExtension] Trove bridge extension terminated successfully");
            } catch (Exception e) {
                logger.error("[TroveBridgeExtension] Error during Trove bridge extension termination", e);
            }
        }
    }
}
