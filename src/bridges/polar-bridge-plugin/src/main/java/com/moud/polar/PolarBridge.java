package com.moud.polar;

import org.graalvm.polyglot.Context;
import org.graalvm.polyglot.Value;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Polar bridge implementation for Moud.
 * Provides world persistence functionality via Polar library.
 */
public class PolarBridge {

    private static final Logger logger = LoggerFactory.getLogger(PolarBridge.class);
    private PolarFacade polarFacade;
    private boolean initialized = false;

    public String getName() {
        return "polar";
    }

    public void initialize() {
        try {
            // Initialize Polar facade
            polarFacade = new PolarFacade();
            
            // Inject Polar facade into global scope for compatibility
            injectIntoGlobalScope();
            
            initialized = true;
            logger.info("Polar bridge initialized successfully");
            
        } catch (Exception e) {
            logger.error("Failed to initialize Polar bridge", e);
            throw new RuntimeException("Polar bridge initialization failed", e);
        }
    }

    /**
     * Inject Polar facade into the global JavaScript scope
     */
    private void injectIntoGlobalScope() {
        try {
            // Get the current GraalVM context
            Context graalContext = Context.getCurrent();
            
            if (graalContext != null) {
                // Get the JS bindings
                Value bindings = graalContext.getBindings("js");
                
                // Inject the facade
                bindings.putMember("Polar", polarFacade);
                
                logger.info("Polar facade injected into global scope");
            }
            
        } catch (Exception e) {
            logger.warn("Could not inject Polar facade into global scope: {}", e.getMessage());
        }
    }

    public void saveAll() {
        if (!initialized) {
            logger.warn("Polar bridge not initialized, cannot save");
            return;
        }

        try {
            // Save all loaded worlds using Polar facade
            PolarFacade.saveAll().get(); // Wait for completion
            logger.info("Polar bridge saved all worlds successfully");
            
        } catch (Exception e) {
            logger.error("Failed to save Polar worlds", e);
        }
    }

    public void shutdown() {
        try {
            if (initialized) {
                // Save all worlds before shutdown
                saveAll();
                
                // Shutdown Polar facade
                PolarFacade.shutdown();
                
                logger.info("Polar bridge shutdown complete");
                initialized = false;
            }
        } catch (Exception e) {
            logger.error("Error during Polar bridge shutdown", e);
        }
    }

    public PolarFacade getPolarFacade() {
        return polarFacade;
    }

    public boolean isInitialized() {
        return initialized;
    }
}
