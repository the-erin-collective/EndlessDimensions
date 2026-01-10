package com.moud.pvp;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import net.minestom.server.extensions.Extension;

/**
 * PvP Bridge Extension for minestom-ce-extensions
 * This will be automatically discovered and loaded by minestom-ce-extensions
 */
public class PvPBridgeExtension extends Extension {
    
    private static final Logger logger = LoggerFactory.getLogger(PvPBridgeExtension.class);
    private PvPBridgePlugin bridgePlugin;
    
    @Override
    public void initialize() {
        logger.info("[PvPBridgeExtension] Initializing PvP bridge extension...");
        
        try {
            // Initialize the bridge plugin
            bridgePlugin = new PvPBridgePlugin();
            bridgePlugin.initialize(null);
            
            logger.info("[PvPBridgeExtension] PvP bridge extension initialized successfully");
        } catch (Exception e) {
            logger.error("[PvPBridgeExtension] Failed to initialize PvP bridge extension", e);
            throw new RuntimeException("Failed to initialize PvP bridge extension", e);
        }
    }
    
    @Override
    public void terminate() {
        logger.info("[PvPBridgeExtension] Terminating PvP bridge extension...");
        
        if (bridgePlugin != null) {
            try {
                bridgePlugin.shutdown();
                logger.info("[PvPBridgeExtension] PvP bridge extension terminated successfully");
            } catch (Exception e) {
                logger.error("[PvPBridgeExtension] Error during PvP bridge extension termination", e);
            }
        }
    }
}
