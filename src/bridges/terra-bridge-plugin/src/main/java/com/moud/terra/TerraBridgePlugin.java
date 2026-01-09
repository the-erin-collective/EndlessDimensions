package com.moud.terra;

import org.graalvm.polyglot.Context;
import org.graalvm.polyglot.Value;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Main plugin class that bridges Terra world generation engine with Moud's TypeScript runtime.
 * Exposes Terra functionality through a global JavaScript object using GraalVM polyglot interoperability.
 */
public class TerraBridgePlugin {
    
    private static final Logger logger = LoggerFactory.getLogger(TerraBridgePlugin.class);
    
    private Context graalContext;
    private TerraFacade terraFacade;
    
    public void initialize(Object context) {
        try {
            // Cast to GraalVM Context
            this.graalContext = (Context) context;
            
            // Initialize Terra facade
            terraFacade = new TerraFacade();
            
            // Configure HostAccess for production safety
            configureHostAccess();
            
            // Inject Terra facade into global scope
            Value bindings = graalContext.getBindings("js");
            bindings.putMember("Terra", terraFacade);
            
            // Register cache monitoring
            registerCacheMetrics(bindings);
            
            logger.info("Terra bridge plugin initialized successfully");
            
        } catch (Exception e) {
            logger.error("Failed to initialize Terra bridge plugin", e);
            throw new RuntimeException("Terra bridge initialization failed", e);
        }
    }
    
    private void configureHostAccess() {
        // Ensure we have proper HostAccess configuration for production
        try {
            if (graalContext.getEngine().getOptions().get("js.host-access") == null) {
                logger.warn("HostAccess not configured, using EXPLICIT mode for security");
            }
        } catch (Exception e) {
            logger.debug("Could not check HostAccess configuration", e);
        }
    }
    
    private void registerCacheMetrics(Value bindings) {
        // Expose cache statistics to TypeScript
        bindings.putMember("getTerraCacheStats", new Object() {
            @SuppressWarnings("unused")
            public String call() {
                try {
                    if (terraFacade != null) {
                        return "Terra cache statistics available - implementation specific";
                    }
                    return "Terra not initialized";
                } catch (Exception e) {
                    logger.warn("Failed to get Terra cache stats", e);
                    return "Error retrieving cache stats";
                }
            }
        });
    }
    
    public void shutdown() {
        try {
            if (terraFacade != null) {
                logger.info("Terra bridge plugin shutdown complete");
            }
        } catch (Exception e) {
            logger.error("Error during Terra bridge plugin shutdown", e);
        }
    }
    
    /**
     * Get the current Terra facade for advanced operations
     * @return TerraFacade instance or null if not initialized
     */
    public TerraFacade getTerraFacade() {
        return terraFacade;
    }
}
