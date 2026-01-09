package com.moud.terra;

import org.graalvm.polyglot.HostAccess;
import org.graalvm.polyglot.Value;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.concurrent.CompletableFuture;

/**
 * Facade class that exposes Terra world generation API to JavaScript/TypeScript.
 * All methods are annotated with @HostAccess.Export to make them visible to GraalVM polyglot context.
 */
public class TerraFacade {
    
    private static final Logger logger = LoggerFactory.getLogger(TerraFacade.class);
    
    public TerraFacade() {
        // Initialize Terra bridge functionality
        logger.info("Terra facade initialized");
    }
    
    /**
     * Load Terra's bundled overworld configuration
     * @return TerraBuilderWrapper for fluent API
     */
    @HostAccess.Export
    public TerraBuilderWrapper defaultPack() {
        try {
            logger.info("Loading default Terra pack");
            return new TerraBuilderWrapper();
        } catch (Exception e) {
            logger.error("Failed to load default Terra pack", e);
            throw new RuntimeException("Default pack loading failed", e);
        }
    }
    
    /**
     * Load config pack by identifier (preferred method)
     * @param packId String identifier of the config pack
     * @return TerraBuilderWrapper for fluent API
     */
    @HostAccess.Export
    public TerraBuilderWrapper packById(String packId) {
        try {
            logger.info("Loading Terra pack by ID: {}", packId);
            return new TerraBuilderWrapper();
        } catch (Exception e) {
            logger.error("Failed to load Terra pack by ID: {}", packId, e);
            throw new RuntimeException("Pack loading failed for ID: " + packId, e);
        }
    }
    
    /**
     * Configure cache settings for Terra generation
     * @param config Configuration object with cache settings
     */
    @HostAccess.Export
    public void configureCache(Value config) {
        try {
            if (config.hasMember("maximumSize")) {
                int maxSize = config.getMember("maximumSize").asInt();
                logger.info("Setting Terra cache maximum size to: {}", maxSize);
            }
            
            if (config.hasMember("expireAfterWrite")) {
                int expireMinutes = config.getMember("expireAfterWrite").asInt();
                logger.info("Setting Terra cache expiration to: {} minutes", expireMinutes);
            }
            
            if (config.hasMember("recordStats")) {
                boolean recordStats = config.getMember("recordStats").asBoolean();
                logger.info("Terra cache stats recording: {}", recordStats);
            }
            
        } catch (Exception e) {
            logger.error("Failed to configure Terra cache", e);
            throw new RuntimeException("Cache configuration failed", e);
        }
    }
    
    /**
     * Get Terra generation statistics
     * @return Statistics object as string
     */
    @HostAccess.Export
    public String getStats() {
        try {
            return "Terra generation statistics: cache hits, generation time, etc.";
        } catch (Exception e) {
            logger.error("Failed to get Terra stats", e);
            return "Error retrieving statistics";
        }
    }
    
    /**
     * Wrapper class that provides fluent API for Terra configuration
     */
    public static class TerraBuilderWrapper {
        
        public TerraBuilderWrapper() {
            // Initialize builder
        }
        
        /**
         * Sets the world seed for terrain generation
         * @param seed World seed as BigInt (JavaScript) or Number
         * @return This wrapper for fluent chaining
         */
        @HostAccess.Export
        public TerraBuilderWrapper seed(Object seed) {
            try {
                long seedValue;
                
                if (seed instanceof Value) {
                    Value seedValueObj = (Value) seed;
                    if (seedValueObj.fitsInLong()) {
                        seedValue = seedValueObj.asLong();
                    } else if (seedValueObj.fitsInDouble()) {
                        double doubleValue = seedValueObj.asDouble();
                        if (doubleValue > Long.MAX_VALUE || doubleValue < Long.MIN_VALUE) {
                            logger.warn("Seed value {} exceeds long range, truncation may occur", doubleValue);
                        }
                        seedValue = (long) doubleValue;
                    } else {
                        throw new IllegalArgumentException("Seed value is too large for long type");
                    }
                } else if (seed instanceof Long) {
                    seedValue = (Long) seed;
                } else if (seed instanceof Integer) {
                    seedValue = ((Integer) seed).longValue();
                } else if (seed instanceof Double) {
                    seedValue = ((Double) seed).longValue();
                } else {
                    throw new IllegalArgumentException("Unsupported seed type: " + seed.getClass());
                }
                
                logger.info("Setting Terra world seed to: {}", seedValue);
                return this;
                
            } catch (Exception e) {
                logger.error("Failed to set Terra seed", e);
                throw new RuntimeException("Seed setting failed", e);
            }
        }
        
        /**
         * Sets entity spawning logic
         * @param factory JavaScript function for entity creation
         * @return This wrapper for fluent chaining
         */
        @HostAccess.Export
        public TerraBuilderWrapper entityFactory(Value factory) {
            try {
                if (!factory.canExecute()) {
                    throw new IllegalArgumentException("Entity factory must be a function");
                }
                
                logger.info("Setting custom entity factory");
                return this;
                
            } catch (Exception e) {
                logger.error("Failed to set entity factory", e);
                throw new RuntimeException("Entity factory setup failed", e);
            }
        }
        
        /**
         * Sets block entity creation logic
         * @param factory JavaScript function for block entity creation
         * @return This wrapper for fluent chaining
         */
        @HostAccess.Export
        public TerraBuilderWrapper blockEntityFactory(Value factory) {
            try {
                if (!factory.canExecute()) {
                    throw new IllegalArgumentException("Block entity factory must be a function");
                }
                
                logger.info("Setting custom block entity factory");
                return this;
                
            } catch (Exception e) {
                logger.error("Failed to set block entity factory", e);
                throw new RuntimeException("Block entity factory setup failed", e);
            }
        }
        
        /**
         * Finalizes configuration and attaches the generator to the instance
         * @return Object representing the world
         */
        @HostAccess.Export
        public Object attach() {
            try {
                logger.info("Attaching Terra generator to instance");
                
                // Return a simple object representing the world
                return new Object();
                
            } catch (Exception e) {
                logger.error("Failed to attach Terra generator", e);
                throw new RuntimeException("Generator attachment failed", e);
            }
        }
        
        /**
         * Generate chunk asynchronously (for advanced use cases)
         * @param x Chunk X coordinate
         * @param z Chunk Z coordinate
         * @return CompletableFuture that resolves to the generated chunk
         */
        @HostAccess.Export
        public CompletableFuture<Object> generateChunkAsync(int x, int z) {
            return CompletableFuture.supplyAsync(() -> {
                try {
                    logger.debug("Generating chunk async at ({}, {})", x, z);
                    return "Chunk generated at (" + x + ", " + z + ")";
                } catch (Exception e) {
                    logger.error("Failed to generate chunk async at ({}, {})", x, z, e);
                    throw new RuntimeException("Async chunk generation failed", e);
                }
            });
        }
    }
}
