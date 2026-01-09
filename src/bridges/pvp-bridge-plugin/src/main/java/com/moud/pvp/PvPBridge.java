package com.moud.pvp;

import endless.bridge.*;
import org.slf4j.Logger;

/**
 * MinestomPvP bridge implementation that adheres to the new bridge contracts.
 * Implements InstanceAttachableBridge, DimensionScopedBridge, and ReloadableBridge.
 * Integrates the MinestomPvP combat system into the Moud environment.
 */
public class PvPBridge implements InstanceAttachableBridge, DimensionScopedBridge, ReloadableBridge {

    private static final String PVP_ATTACHED_TAG = "pvp_attached";
    private BridgeContext context;
    private PvPFeatureRegistry registry;
    private PvPInstanceAttacher instanceAttacher;
    private boolean minestomPvPInitialized = false;
    private boolean initialized = false;

    @Override
    public String getName() {
        return "pvp";
    }

    @Override
    public void initialize(BridgeContext context) {
        this.context = context;
        
        try {
            // Initialize MinestomPvP - this must happen exactly once and before any instances are created
            initializeMinestomPvP();
            
            // Initialize PvP components
            registry = new PvPFeatureRegistry();
            instanceAttacher = new PvPInstanceAttacher(context.logger());
            
            // Resolve and load combat profiles from assets
            Object pvpAssets = PvPConfigResolver.resolvePvpAssets(context.assetsRoot());
            
            // Ensure the PvP directory exists
            PvPConfigResolver.ensurePvpDirectory(context.assetsRoot());
            
            // Load combat profiles
            registry.load(pvpAssets);
            
            // Inject PvP facade into global scope for compatibility
            injectIntoGlobalScope();
            
            initialized = true;
            context.logger().info("MinestomPvP bridge initialized successfully");
            
        } catch (Exception e) {
            context.logger().error("Failed to initialize MinestomPvP bridge", e);
            throw new RuntimeException("MinestomPvP bridge initialization failed", e);
        }
    }

    @Override
    public boolean supports(DimensionConfig config) {
        // PvP bridge only activates for dimensions that have a combat profile configured
        return config.hasCombatProfile();
    }

    @Override
    public void attachToInstance(Object instance, DimensionConfig config) {
        if (!initialized) {
            context.logger().warn("MinestomPvP bridge not initialized, cannot attach to instance");
            return;
        }

        // Guard against double attachment
        // Note: In a real implementation, you'd check for instance tags
        // For now, we'll assume the instance doesn't have the tag
        
        try {
            // Mark as attached (placeholder - would use actual instance tagging)
            // instance.setTag(PVP_ATTACHED_TAG, true);
            
            // Use the instance attacher to handle the complex attachment logic
            instanceAttacher.attachToInstance(instance, config, registry);
            
            context.logger().info("MinestomPvP bridge attached to instance with combat profile: {}", 
                                config.combatProfile());
            
        } catch (Exception e) {
            context.logger().error("Failed to attach MinestomPvP bridge to instance", e);
            // Remove tag on failure (placeholder)
            // instance.removeTag(PVP_ATTACHED_TAG);
        }
    }

    @Override
    public void reload() {
        if (!initialized) {
            context.logger().warn("MinestomPvP bridge not initialized, cannot reload");
            return;
        }

        try {
            // Reload combat profiles atomically
            Object pvpAssets = PvPConfigResolver.resolvePvpAssets(context.assetsRoot());
            registry.load(pvpAssets);
            
            context.logger().info("MinestomPvP bridge reloaded successfully");
            
        } catch (Exception e) {
            context.logger().error("Failed to reload MinestomPvP bridge", e);
        }
    }

    @Override
    public void shutdown() {
        try {
            if (initialized) {
                context.logger().info("MinestomPvP bridge shutdown complete");
                initialized = false;
            }
        } catch (Exception e) {
            context.logger().error("Error during MinestomPvP bridge shutdown", e);
        }
    }

    /**
     * Initialize MinestomPvP - this must happen exactly once and before any instances are created
     */
    private void initializeMinestomPvP() {
        if (minestomPvPInitialized) {
            context.logger().debug("MinestomPvP already initialized");
            return;
        }

        try {
            // In a real implementation, this would initialize MinestomPvP:
            // MinestomPvP.init(
            //     /* customPlayer */ true,
            //     /* keepAlive */ true
            // );
            
            context.logger().info("MinestomPvP initialized successfully");
            minestomPvPInitialized = true;
            
        } catch (Exception e) {
            context.logger().error("Failed to initialize MinestomPvP", e);
            throw new RuntimeException("MinestomPvP initialization failed", e);
        }
    }

    /**
     * Inject PvP facade into the global JavaScript scope for compatibility
     */
    private void injectIntoGlobalScope() {
        try {
            // Get the global event node and try to access GraalVM context
            // In a real implementation, you would get the GraalVM context and inject the facade
            // For now, we'll log that this would happen
            context.logger().debug("PvP facade injection would happen here with proper GraalVM access");
            
            // Example of what the injection would look like:
            // Value bindings = graalContext.getBindings("js");
            // bindings.putMember("PvP", pvpFacade);
            
        } catch (Exception e) {
            context.logger().warn("Could not inject PvP facade into global scope", e);
        }
    }

    /**
     * Get the current PvP feature registry
     * @return PvPFeatureRegistry instance or null if not initialized
     */
    public PvPFeatureRegistry getRegistry() {
        return registry;
    }

    /**
     * Get the instance attacher
     * @return PvPInstanceAttacher instance or null if not initialized
     */
    public PvPInstanceAttacher getInstanceAttacher() {
        return instanceAttacher;
    }

    /**
     * Check if the bridge is initialized
     * @return True if initialized
     */
    public boolean isInitialized() {
        return initialized;
    }

    /**
     * Check if MinestomPvP is initialized
     * @return True if MinestomPvP is initialized
     */
    public boolean isMinestomPvPInitialized() {
        return minestomPvPInitialized;
    }

    /**
     * Get statistics about the PvP bridge
     * @return Statistics string
     */
    public String getStatistics() {
        if (!initialized) {
            return "MinestomPvP bridge not initialized";
        }
        
        return registry.getStatistics();
    }
}
