package com.moud.polar;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import net.minestom.server.extensions.Extension;

/**
 * Polar Bridge Extension for minestom-ce-extensions
 * This will be automatically discovered and loaded by minestom-ce-extensions
 */
public class PolarBridgeExtension extends Extension {
    
    private static final Logger logger = LoggerFactory.getLogger(PolarBridgeExtension.class);
    private PolarBridgePlugin bridgePlugin;
    
    @Override
    public void initialize() {
        logger.info("[PolarBridgeExtension] Initializing Polar bridge extension...");
        
        try {
            // Initialize the bridge plugin
            bridgePlugin = new PolarBridgePlugin();
            bridgePlugin.initialize(null);
            
            logger.info("[PolarBridgeExtension] Polar bridge extension initialized successfully");
        } catch (Exception e) {
            logger.error("[PolarBridgeExtension] Failed to initialize Polar bridge extension", e);
            throw new RuntimeException("Failed to initialize Polar bridge extension", e);
        }
    }
    
    @Override
    public void terminate() {
        logger.info("[PolarBridgeExtension] Terminating Polar bridge extension...");
        
        if (bridgePlugin != null) {
            try {
                bridgePlugin.shutdown();
                logger.info("[PolarBridgeExtension] Polar bridge extension terminated successfully");
            } catch (Exception e) {
                logger.error("[PolarBridgeExtension] Error during Polar bridge extension termination", e);
            }
        }
    }
}
