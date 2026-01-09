package com.moud.trove;

import org.graalvm.polyglot.Context;
import org.graalvm.polyglot.Value;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Main plugin class that bridges Trove loot system with Moud's TypeScript runtime.
 * Exposes Trove functionality through a global JavaScript object using GraalVM polyglot interoperability.
 */
public class TroveBridgePlugin {
    
    private static final Logger logger = LoggerFactory.getLogger(TroveBridgePlugin.class);
    
    private Context graalContext;
    private TroveBridge troveBridge;
    private TroveFacade troveFacade;
    
    public void initialize(Object context) {
        try {
            logger.info("Initializing Trove Bridge Plugin...");
            
            // Cast to GraalVM Context
            this.graalContext = (Context) context;
            
            // Initialize the new bridge implementation
            troveBridge = new TroveBridge();
            
            // Create a simple bridge context for the bridge
            BridgeContext bridgeContext = createSimpleBridgeContext();
            
            // Initialize the bridge
            troveBridge.initialize(bridgeContext);
            
            // Create and inject the Trove facade into the global scope
            troveFacade = new TroveFacade(troveBridge);
            injectTroveFacade();
            
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
    
    /**
     * Inject the Trove facade into the global JavaScript scope
     */
    private void injectTroveFacade() {
        try {
            if (graalContext != null && troveFacade != null) {
                Value bindings = graalContext.getBindings("js");
                bindings.putMember("Trove", troveFacade);
                logger.info("Trove facade injected into global scope");
            }
        } catch (Exception e) {
            logger.error("Failed to inject Trove facade into global scope", e);
        }
    }
    
    /**
     * Create a simple bridge context for the Trove bridge
     * In a real implementation, this would be provided by the Moud system
     */
    private BridgeContext createSimpleBridgeContext() {
        return new BridgeContext() {
            @Override
            public java.nio.file.Path assetsRoot() {
                // In a real implementation, this would return the actual assets root
                return java.nio.file.Path.of("assets");
            }
            
            @Override
            public java.nio.file.Path configRoot() {
                // In a real implementation, this would return the actual config root
                return java.nio.file.Path.of("config");
            }
            
            @Override
            public net.minestom.server.event.EventNode<net.minestom.server.event.Event> globalEventNode() {
                // In a real implementation, this would return the actual global event node
                return null;
            }
            
            @Override
            public org.slf4j.Logger logger() {
                return LoggerFactory.getLogger(TroveBridgePlugin.class);
            }
            
            @Override
            public endless.bridge.DimensionConfigRegistry dimensions() {
                // In a real implementation, this would return the actual dimension registry
                return new endless.bridge.DimensionConfigRegistry() {
                    @Override
                    public endless.bridge.DimensionConfig get(String dimensionId) {
                        return null;
                    }
                    
                    @Override
                    public endless.bridge.DimensionConfig get(net.minestom.server.utils.NamespaceID dimensionId) {
                        return null;
                    }
                    
                    @Override
                    public boolean has(String dimensionId) {
                        return false;
                    }
                    
                    @Override
                    public java.util.Collection<endless.bridge.DimensionConfig> getAll() {
                        return java.util.List.of();
                    }
                };
            }
        };
    }
}
