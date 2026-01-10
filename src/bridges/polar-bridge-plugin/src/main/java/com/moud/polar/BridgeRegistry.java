package com.moud.polar;

import java.util.concurrent.ConcurrentHashMap;

/**
 * Shared registry for bridge facades that allows Moud to discover and inject them.
 */
public class BridgeRegistry {
    
    private static final ConcurrentHashMap<String, Object> bridges = new ConcurrentHashMap<>();
    
    public static void register(String name, Object facade) {
        bridges.put(name, facade);
    }
    
    public static void unregister(String name) {
        bridges.remove(name);
    }
    
    public static Object get(String name) {
        return bridges.get(name);
    }
    
    public static boolean isRegistered(String name) {
        return bridges.containsKey(name);
    }
    
    public static java.util.Set<String> getRegisteredNames() {
        return bridges.keySet();
    }
}
