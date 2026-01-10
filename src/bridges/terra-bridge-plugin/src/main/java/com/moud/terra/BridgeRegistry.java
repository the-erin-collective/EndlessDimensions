package com.moud.terra;

import java.util.concurrent.ConcurrentHashMap;

/**
 * Shared registry for bridge facades that allows Moud to discover and inject them.
 * This provides a fallback mechanism when direct GraalVM context access isn't available.
 */
public class BridgeRegistry {
    
    private static final ConcurrentHashMap<String, Object> bridges = new ConcurrentHashMap<>();
    
    /**
     * Register a bridge facade with the given name
     */
    public static void register(String name, Object facade) {
        bridges.put(name, facade);
    }
    
    /**
     * Unregister a bridge facade
     */
    public static void unregister(String name) {
        bridges.remove(name);
    }
    
    /**
     * Get a registered bridge facade by name
     */
    public static Object get(String name) {
        return bridges.get(name);
    }
    
    /**
     * Check if a bridge is registered
     */
    public static boolean isRegistered(String name) {
        return bridges.containsKey(name);
    }
    
    /**
     * Get all registered bridge names
     */
    public static java.util.Set<String> getRegisteredNames() {
        return bridges.keySet();
    }
}
