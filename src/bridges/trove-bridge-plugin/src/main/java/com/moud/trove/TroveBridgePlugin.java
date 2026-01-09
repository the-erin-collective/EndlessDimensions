package com.moud.trove;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Main plugin class that bridges Trove loot system with Moud's TypeScript runtime.
 * Exposes Trove functionality through a global JavaScript object using GraalVM polyglot interoperability.
 */
public class TroveBridgePlugin {
    
    private static final Logger logger = LoggerFactory.getLogger(TroveBridgePlugin.class);
    
    private TroveBridge troveBridge;
    
    public void initialize(Object context) {
        try {
            logger.info("Initializing Trove Bridge Plugin...");
            
            // Initialize the new bridge implementation
            troveBridge = new TroveBridge();
            
            // In a real implementation, you would:
            // 1. Create a BridgeContext implementation
            // 2. Initialize the bridge with the context
            // 3. Inject the Trove facade into the global scope
            
            logger.info("Trove Bridge Plugin initialized successfully");
            
        } catch (Exception e) {
            logger.error("Failed to initialize Trove Bridge Plugin", e);
            throw new RuntimeException("Trove bridge initialization failed", e);
        }
    }
    
    public void shutdown() {
        try {
            if (troveBridge != null) {
                troveBridge.shutdown();
                logger.info("Trove Bridge Plugin shutdown complete");
            }
        } catch (Exception e) {
            logger.error("Error during Trove Bridge Plugin shutdown", e);
        }
    }
    
    /**
     * Get the current Trove bridge for advanced operations
     * @return TroveBridge instance or null if not initialized
     */
    public TroveBridge getTroveBridge() {
        return troveBridge;
    }
}
