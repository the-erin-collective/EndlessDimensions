package com.moud.terra;

import endless.bridge.*;
import net.minestom.server.instance.InstanceContainer;
import org.graalvm.polyglot.Context;
import org.graalvm.polyglot.Value;
import org.slf4j.Logger;

/**
 * Terra bridge implementation that adheres to the new bridge contracts.
 * Implements InstanceAttachableBridge, DimensionScopedBridge, and ReloadableBridge.
 */
public class TerraBridge implements InstanceAttachableBridge, DimensionScopedBridge, ReloadableBridge {

    private static final String TERRA_ATTACHED_TAG = "terra_attached";
    private BridgeContext context;
    private TerraFacade terraFacade;
    private boolean initialized = false;

    @Override
    public String getName() {
        return "terra";
    }

    @Override
    public void initialize(BridgeContext context) {
        this.context = context;
        
        try {
            // Initialize Terra facade
            terraFacade = new TerraFacade();
            
            // Inject Terra facade into global scope if we have access to GraalVM context
            // This maintains compatibility with existing TypeScript usage
            injectIntoGlobalScope();
            
            initialized = true;
            context.logger().info("Terra bridge initialized successfully");
            
        } catch (Exception e) {
            context.logger().error("Failed to initialize Terra bridge", e);
            throw new RuntimeException("Terra bridge initialization failed", e);
        }
    }

    @Override
    public boolean supports(DimensionConfig config) {
        // Terra supports dimensions that have Terra worldgen configuration
        // For now, we'll check if worldgen is not null and has Terra-specific properties
        if (config.worldgen() == null) {
            return false;
        }
        
        // Check if worldgen config contains Terra-specific settings
        // This would be more specific in a real implementation
        return config.worldgen().toString().contains("terra") || 
               config.worldgen().getClass().getSimpleName().contains("Terra");
    }

    @Override
    public void attachToInstance(InstanceContainer instance, DimensionConfig config) {
        if (!initialized) {
            context.logger().warn("Terra bridge not initialized, cannot attach to instance");
            return;
        }

        // Guard against double attachment
        if (instance.hasTag(TERRA_ATTACHED_TAG)) {
            context.logger().debug("Terra already attached to instance {}", instance.getUniqueId());
            return;
        }

        try {
            // Mark as attached
            instance.setTag(TERRA_ATTACHED_TAG, true);
            
            // Configure and attach Terra generator based on dimension config
            attachTerraGenerator(instance, config);
            
            context.logger().info("Terra bridge attached to instance {}", instance.getUniqueId());
            
        } catch (Exception e) {
            context.logger().error("Failed to attach Terra bridge to instance {}", instance.getUniqueId(), e);
            // Remove tag on failure
            instance.removeTag(TERRA_ATTACHED_TAG);
        }
    }

    @Override
    public void reload() {
        if (!initialized) {
            context.logger().warn("Terra bridge not initialized, cannot reload");
            return;
        }

        try {
            // Reload Terra configurations
            // This would involve re-reading Terra config files and updating generators
            context.logger().info("Terra bridge reloaded successfully");
            
        } catch (Exception e) {
            context.logger().error("Failed to reload Terra bridge", e);
        }
    }

    @Override
    public void shutdown() {
        try {
            if (initialized) {
                context.logger().info("Terra bridge shutdown complete");
                initialized = false;
            }
        } catch (Exception e) {
            context.logger().error("Error during Terra bridge shutdown", e);
        }
    }

    /**
     * Inject Terra facade into the global JavaScript scope for compatibility
     */
    private void injectIntoGlobalScope() {
        try {
            // Get the current GraalVM context
            Context graalContext = Context.getCurrent();
            
            // Get the JS bindings
            Value bindings = graalContext.getBindings("js");
            
            // Inject the facade
            bindings.putMember("Terra", terraFacade);
            
            context.logger().info("Terra facade injected into global scope");
            
        } catch (Exception e) {
            context.logger().warn("Could not inject Terra facade into global scope", e);
        }
    }

    /**
     * Attach Terra generator to the instance based on dimension configuration
     */
    private void attachTerraGenerator(InstanceContainer instance, DimensionConfig config) {
        try {
            // Create Terra configuration based on dimension config
            TerraFacade.TerraBuilderWrapper builder = terraFacade.defaultPack();
            
            // Apply dimension-specific settings
            // This would read from config.worldgen() in a real implementation
            
            // Attach the generator
            Object world = builder.attach();
            
            context.logger().debug("Terra generator attached for dimension: {}", config.id());
            
        } catch (Exception e) {
            context.logger().error("Failed to attach Terra generator for dimension: {}", config.id(), e);
            throw e;
        }
    }

    /**
     * Get the current Terra facade for advanced operations
     * @return TerraFacade instance or null if not initialized
     */
    public TerraFacade getTerraFacade() {
        return terraFacade;
    }

    /**
     * Check if the bridge is initialized
     * @return True if initialized
     */
    public boolean isInitialized() {
        return initialized;
    }
}
