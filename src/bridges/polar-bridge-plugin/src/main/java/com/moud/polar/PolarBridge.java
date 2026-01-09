package com.moud.polar;

import endless.bridge.*;
import net.minestom.server.instance.InstanceContainer;
import org.graalvm.polyglot.Context;
import org.graalvm.polyglot.Value;
import org.slf4j.Logger;

/**
 * Polar bridge implementation that adheres to the new bridge contracts.
 * Implements InstanceAttachableBridge, DimensionScopedBridge, and PersistentBridge.
 */
public class PolarBridge implements InstanceAttachableBridge, DimensionScopedBridge, PersistentBridge {

    private static final String POLAR_ATTACHED_TAG = "polar_attached";
    private BridgeContext context;
    private PolarFacade polarFacade;
    private boolean initialized = false;

    @Override
    public String getName() {
        return "polar";
    }

    @Override
    public void initialize(BridgeContext context) {
        this.context = context;
        
        try {
            // Initialize Polar facade
            polarFacade = new PolarFacade();
            
            // Inject Polar facade into global scope for compatibility
            injectIntoGlobalScope();
            
            initialized = true;
            context.logger().info("Polar bridge initialized successfully");
            
        } catch (Exception e) {
            context.logger().error("Failed to initialize Polar bridge", e);
            throw new RuntimeException("Polar bridge initialization failed", e);
        }
    }

    @Override
    public boolean supports(DimensionConfig config) {
        // Polar supports all dimensions for persistence
        // It can work with any dimension type, providing world saving/loading
        return true;
    }

    @Override
    public void attachToInstance(InstanceContainer instance, DimensionConfig config) {
        if (!initialized) {
            context.logger().warn("Polar bridge not initialized, cannot attach to instance");
            return;
        }

        // Guard against double attachment
        if (instance.hasTag(POLAR_ATTACHED_TAG)) {
            context.logger().debug("Polar already attached to instance {}", instance.getUniqueId());
            return;
        }

        try {
            // Mark as attached
            instance.setTag(POLAR_ATTACHED_TAG, true);
            
            // Configure and attach Polar chunk loader based on dimension config
            attachPolarLoader(instance, config);
            
            context.logger().info("Polar bridge attached to instance {}", instance.getUniqueId());
            
        } catch (Exception e) {
            context.logger().error("Failed to attach Polar bridge to instance {}", instance.getUniqueId(), e);
            // Remove tag on failure
            instance.removeTag(POLAR_ATTACHED_TAG);
        }
    }

    @Override
    public void saveAll() {
        if (!initialized) {
            context.logger().warn("Polar bridge not initialized, cannot save");
            return;
        }

        try {
            // Save all loaded worlds using Polar facade
            PolarFacade.saveAll().get(); // Wait for completion
            context.logger().info("Polar bridge saved all worlds successfully");
            
        } catch (Exception e) {
            context.logger().error("Failed to save Polar worlds", e);
        }
    }

    @Override
    public void shutdown() {
        try {
            if (initialized) {
                // Save all worlds before shutdown
                saveAll();
                
                // Shutdown Polar facade
                PolarFacade.shutdown();
                
                context.logger().info("Polar bridge shutdown complete");
                initialized = false;
            }
        } catch (Exception e) {
            context.logger().error("Error during Polar bridge shutdown", e);
        }
    }

    /**
     * Inject Polar facade into the global JavaScript scope for compatibility
     */
    private void injectIntoGlobalScope() {
        try {
            // Get the current GraalVM context
            Context graalContext = Context.getCurrent();
            
            // Get the JS bindings
            Value bindings = graalContext.getBindings("js");
            
            // Inject the facade
            bindings.putMember("Polar", polarFacade);
            
            context.logger().info("Polar facade injected into global scope");
            
        } catch (Exception e) {
            context.logger().warn("Could not inject Polar facade into global scope", e);
        }
    }

    /**
     * Attach Polar loader to the instance based on dimension configuration
     */
    private void attachPolarLoader(InstanceContainer instance, DimensionConfig config) {
        try {
            // Load or create Polar world for this dimension
            String dimensionId = config.id().toString();
            String worldFileName = dimensionId.replace(":", "_") + ".polar";
            
            // Load the world asynchronously
            PolarFacade.load(dimensionId, worldFileName)
                .thenAccept(result -> {
                    if (result instanceof PolarFacade.PolarResult polarResult) {
                        if (polarResult.isSuccess()) {
                            context.logger().debug("Polar world loaded for dimension: {}", config.id());
                        } else {
                            context.logger().warn("Failed to load Polar world for dimension {}: {}", 
                                               config.id(), polarResult.getMessage());
                        }
                    }
                })
                .exceptionally(throwable -> {
                    context.logger().error("Exception loading Polar world for dimension: {}", config.id(), throwable);
                    return null;
                });
            
            context.logger().debug("Polar loader attached for dimension: {}", config.id());
            
        } catch (Exception e) {
            context.logger().error("Failed to attach Polar loader for dimension: {}", config.id(), e);
            throw e;
        }
    }

    /**
     * Get the current Polar facade for advanced operations
     * @return PolarFacade instance or null if not initialized
     */
    public PolarFacade getPolarFacade() {
        return polarFacade;
    }

    /**
     * Check if the bridge is initialized
     * @return True if initialized
     */
    public boolean isInitialized() {
        return initialized;
    }

    /**
     * Save a specific dimension's world
     * @param dimensionId The dimension ID to save
     */
    public void saveDimension(String dimensionId) {
        if (!initialized) {
            context.logger().warn("Polar bridge not initialized, cannot save dimension");
            return;
        }

        try {
            PolarFacade.save(dimensionId).get(); // Wait for completion
            context.logger().info("Polar world saved for dimension: {}", dimensionId);
            
        } catch (Exception e) {
            context.logger().error("Failed to save Polar world for dimension: {}", dimensionId, e);
        }
    }

    /**
     * Check if a dimension's world is loaded
     * @param dimensionId The dimension ID to check
     * @return True if loaded
     */
    public boolean isDimensionLoaded(String dimensionId) {
        if (!initialized) {
            return false;
        }
        
        return PolarFacade.isLoaded(dimensionId);
    }
}
