package com.moud.terra;

import org.graalvm.polyglot.Context;
import org.graalvm.polyglot.Value;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Terra bridge implementation for Moud.
 * Provides world generation functionality via Terra library.
 */
public class TerraBridge {

    private static final Logger logger = LoggerFactory.getLogger(TerraBridge.class);
    private TerraFacade terraFacade;
    private boolean initialized = false;

    public String getName() {
        return "terra";
    }

    public void initialize() {
        try {
            // Initialize Terra facade
            terraFacade = new TerraFacade();
            
            // Inject Terra facade into global scope if we have access to GraalVM context
            injectIntoGlobalScope();
            
            initialized = true;
            logger.info("Terra bridge initialized successfully");
            
        } catch (Exception e) {
            logger.error("Failed to initialize Terra bridge", e);
            throw new RuntimeException("Terra bridge initialization failed", e);
        }
    }

    /**
     * Inject Terra facade into the global JavaScript scope
     */
    private void injectIntoGlobalScope() {
        try {
            // Get the current GraalVM context
            Context graalContext = Context.getCurrent();
            
            if (graalContext != null) {
                // Get the JS bindings
                Value bindings = graalContext.getBindings("js");
                
                // Inject the facade
                bindings.putMember("Terra", terraFacade);
                
                logger.info("Terra facade injected into global scope");
            }
            
        } catch (Exception e) {
            logger.warn("Could not inject Terra facade into global scope: {}", e.getMessage());
        }
    }

    public void reload() {
        if (!initialized) {
            logger.warn("Terra bridge not initialized, cannot reload");
            return;
        }

        try {
            logger.info("Terra bridge reloaded successfully");
        } catch (Exception e) {
            logger.error("Failed to reload Terra bridge", e);
        }
    }

    public void shutdown() {
        try {
            if (initialized) {
                logger.info("Terra bridge shutdown complete");
                initialized = false;
            }
        } catch (Exception e) {
            logger.error("Error during Terra bridge shutdown", e);
        }
    }

    /**
     * Get the current Terra facade for advanced operations
     */
    public TerraFacade getTerraFacade() {
        return terraFacade;
    }

    /**
     * Check if the bridge is initialized
     */
    public boolean isInitialized() {
        return initialized;
    }
}
