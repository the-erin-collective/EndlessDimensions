package endless.bridge.registry;

import java.util.concurrent.ConcurrentHashMap;

/**
 * Bridge registry for bridge plugins.
 * This is a thin wrapper that delegates to the main BridgeRegistry.
 * This ensures ClassLoader compatibility while avoiding code duplication.
 */
public class BridgeRegistry {
    
    private static final ConcurrentHashMap<String, Object> staticBridges = new ConcurrentHashMap<>();

    /**
     * Register a bridge facade with the registry
     * @param name The bridge name (e.g., "Terra", "Polar", "Trove", "PvP")
     * @param facade The bridge facade instance
     */
    public static void register(String name, Object facade) {
        System.out.println("[BridgeRegistry] Registration: " + name + " -> " + facade.getClass().getName());
        staticBridges.put(name, facade);
    }
    
    /**
     * Unregister a bridge facade from the registry
     * @param name The bridge name to unregister
     */
    public static void unregister(String name) {
        System.out.println("[BridgeRegistry] Unregistration: " + name);
        staticBridges.remove(name);
    }
    
    /**
     * Get a bridge facade from the registry
     * @param name The bridge name
     * @return The bridge facade instance, or null if not registered
     */
    public static Object get(String name) {
        return staticBridges.get(name);
    }
    
    /**
     * Check if a bridge is registered in the registry
     * @param name The bridge name
     * @return true if registered, false otherwise
     */
    public static boolean isRegistered(String name) {
        return staticBridges.containsKey(name);
    }
    
    /**
     * Get all registered bridge names
     * @return Set of registered bridge names
     */
    public static java.util.Set<String> getRegisteredNames() {
        return staticBridges.keySet();
    }
    
    /**
     * Get number of registered bridges
     * @return Number of registered bridges
     */
    public static int getRegisteredCount() {
        return staticBridges.size();
    }
    
    /**
     * Clear all registered bridges (for testing/reloading)
     */
    public static void clear() {
        System.out.println("[BridgeRegistry] Clearing all registered bridges");
        staticBridges.clear();
    }
}
