package com.moud.base;

import net.minestom.server.extensions.Extension;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class BaseBridgeExtension extends Extension {
    private static final Logger logger = LoggerFactory.getLogger(BaseBridgeExtension.class);
    private BaseBridgePlugin bridgePlugin;

    @Override
    public void initialize() {
        logger.info("[BaseBridgeExtension] Initializing...");
        try {
            bridgePlugin = new BaseBridgePlugin();
            bridgePlugin.initialize();
            logger.info("[BaseBridgeExtension] Initialized");
        } catch (Exception e) {
            logger.error("[BaseBridgeExtension] Failed to initialize", e);
            throw new RuntimeException("Failed to initialize BaseBridgeExtension", e);
        }
    }

    @Override
    public void terminate() {
        logger.info("[BaseBridgeExtension] Terminating...");
        if (bridgePlugin != null) {
            try {
                bridgePlugin.shutdown();
                logger.info("[BaseBridgeExtension] Terminated");
            } catch (Exception e) {
                logger.error("[BaseBridgeExtension] Error during termination", e);
            }
        }
    }
}
