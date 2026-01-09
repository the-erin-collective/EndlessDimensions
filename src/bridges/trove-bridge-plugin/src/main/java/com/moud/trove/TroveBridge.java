package com.moud.trove;

import endless.bridge.*;
import org.graalvm.polyglot.Context;
import org.graalvm.polyglot.Value;
import org.slf4j.Logger;

/**
 * Trove bridge implementation that adheres to the new bridge contracts.
 * Implements InstanceAttachableBridge, DimensionScopedBridge, and ReloadableBridge.
 * Integrates the GoldenStack Trove loot system into the Moud environment.
 */
public class TroveBridge implements InstanceAttachableBridge, DimensionScopedBridge, ReloadableBridge {

    private static final String TROVE_ATTACHED_TAG = "trove_attached";
    private BridgeContext context;
    private TroveLootTableRegistry registry;
    private LootListener lootListener;
    private TroveFacade troveFacade;
    private boolean initialized = false;

    @Override
    public String getName() {
        return "trove";
    }

    @Override
    public void initialize(BridgeContext context) {
        this.context = context;
        
        try {
            // Initialize Trove components
            registry = new TroveLootTableRegistry();
            lootListener = new LootListener();
            troveFacade = new TroveFacade(this);
            
            // Load loot tables from assets
            registry.load(context.assetsRoot());
            
            // Inject Trove facade into global scope for compatibility
            injectIntoGlobalScope();
            
            initialized = true;
            context.logger().info("Trove bridge initialized successfully");
            
        } catch (Exception e) {
            context.logger().error("Failed to initialize Trove bridge", e);
            throw new RuntimeException("Trove bridge initialization failed", e);
        }
    }

    @Override
    public boolean supports(DimensionConfig config) {
        // Trove only activates for dimensions that have a loot table configured
        return config.hasLootTable();
    }

    @Override
    public void attachToInstance(Object instance, DimensionConfig config) {
        if (!initialized) {
            context.logger().warn("Trove bridge not initialized, cannot attach to instance");
            return;
        }

        // In a real implementation, you'd check for double attachment
        // Guard against double attachment
        // if (instance.hasTag(TROVE_ATTACHED_TAG)) {
        //     context.logger().debug("Trove already attached to instance {}", instance.getUniqueId());
        //     return;
        // }

        try {
            // In a real implementation, you'd mark as attached
            // Mark as attached
            // instance.setTag(TROVE_ATTACHED_TAG, true);
            
            // Attach loot listener to the instance's event node
            lootListener.attachToInstance(instance, config);
            
            context.logger().info("Trove bridge attached to instance {} with loot table: {}", 
                                instance, config.lootTable());
            
        } catch (Exception e) {
            context.logger().error("Failed to attach Trove bridge to instance {}", instance, e);
            // In a real implementation, you'd remove tag on failure
            // Remove tag on failure
            // instance.removeTag(TROVE_ATTACHED_TAG);
        }
    }

    @Override
    public void reload() {
        if (!initialized) {
            context.logger().warn("Trove bridge not initialized, cannot reload");
            return;
        }

        try {
            // Reload loot tables atomically
            registry.reload(context.assetsRoot());
            context.logger().info("Trove bridge reloaded successfully");
            
        } catch (Exception e) {
            context.logger().error("Failed to reload Trove bridge", e);
        }
    }

    @Override
    public void shutdown() {
        try {
            if (initialized) {
                context.logger().info("Trove bridge shutdown complete");
                initialized = false;
            }
        } catch (Exception e) {
            context.logger().error("Error during Trove bridge shutdown", e);
        }
    }

    /**
     * Inject Trove facade into the global JavaScript scope for compatibility
     */
    private void injectIntoGlobalScope() {
        try {
            // Get the current GraalVM context
            Context graalContext = Context.getCurrent();
            
            // Get the JS bindings
            Value bindings = graalContext.getBindings("js");
            
            // Inject the facade
            bindings.putMember("Trove", troveFacade);
            
            context.logger().info("Trove facade injected into global scope");
            
        } catch (Exception e) {
            context.logger().warn("Could not inject Trove facade into global scope", e);
        }
    }

    /**
     * Get the current Trove loot table registry
     * @return TroveLootTableRegistry instance or null if not initialized
     */
    public TroveLootTableRegistry getRegistry() {
        return registry;
    }

    /**
     * Check if the bridge is initialized
     * @return True if initialized
     */
    public boolean isInitialized() {
        return initialized;
    }

    /**
     * Get statistics about loaded loot tables
     * @return Statistics string
     */
    public String getStatistics() {
        if (!initialized) {
            return "Trove bridge not initialized";
        }
        
        return registry.getStatistics();
    }
}
