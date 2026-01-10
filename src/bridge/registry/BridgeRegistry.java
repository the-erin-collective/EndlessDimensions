package endless.bridge.registry;

import endless.bridge.*;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Central system that wires bridges to instances.
 * Acts as coordinator for bridge lifecycle management.
 * 
 * Also provides static registry for bridge plugins to register with.
 */
public class BridgeRegistry {

    private final List<Bridge> bridges;
    
    // Static registry for bridge plugins
    private static final ConcurrentHashMap<String, Object> staticBridges = new ConcurrentHashMap<>();

    public BridgeRegistry(List<Bridge> bridges) {
        this.bridges = List.copyOf(bridges); // Immutable copy
    }

    /**
     * Initialize all registered bridges
     * @param context Bridge context to pass to all bridges
     */
    public void initializeAll(BridgeContext context) {
        bridges.forEach(b -> b.initialize(context));
    }

    /**
     * Attach all applicable bridges to an instance
     * @param instance The instance container to attach bridges to
     * @param config The dimension configuration for this instance
     */
    public void attachAll(
        Object instance,
        DimensionConfig config
    ) {
        for (Bridge bridge : bridges) {
            // Check if bridge supports this dimension (if it's dimension-scoped)
            if (bridge instanceof DimensionScopedBridge scoped &&
                !scoped.supports(config)) {
                continue;
            }

            // Attach to instance if it's instance-attachable
            if (bridge instanceof InstanceAttachableBridge attachable) {
                attachable.attachToInstance(instance, config);
            }
        }
    }

    /**
     * Reload all reloadable bridges
     */
    public void reloadAll() {
        bridges.stream()
            .filter(b -> b instanceof ReloadableBridge)
            .forEach(b -> ((ReloadableBridge) b).reload());
    }

    /**
     * Save all persistent bridges
     */
    public void saveAll() {
        bridges.stream()
            .filter(b -> b instanceof PersistentBridge)
            .forEach(b -> ((PersistentBridge) b).saveAll());
    }

    /**
     * Shutdown all bridges
     */
    public void shutdownAll() {
        bridges.forEach(Bridge::shutdown);
    }

    /**
     * Get all registered bridges
     * @return Immutable list of bridges
     */
    public List<Bridge> getBridges() {
        return bridges;
    }

    /**
     * Get a bridge by name
     * @param name The bridge name
     * @return The bridge if found, null otherwise
     */
    public Bridge getBridge(String name) {
        return bridges.stream()
            .filter(b -> b.getName().equals(name))
            .findFirst()
            .orElse(null);
    }

    // ========== STATIC REGISTRY METHODS ==========

    /**
     * Register a bridge facade with static registry
     * @param name The bridge name (e.g., "Terra", "Polar", "Trove", "PvP")
     * @param facade The bridge facade instance
     */
    public static void register(String name, Object facade) {
        System.out.println("[BridgeRegistry] Static registration: " + name + " -> " + facade.getClass().getName());
        staticBridges.put(name, facade);
    }

    /**
     * Unregister a bridge facade from static registry
     * @param name The bridge name to unregister
     */
    public static void unregister(String name) {
        System.out.println("[BridgeRegistry] Static unregistration: " + name);
        staticBridges.remove(name);
    }

    /**
     * Get a bridge facade from static registry
     * @param name The bridge name
     * @return The bridge facade instance, or null if not registered
     */
    public static Object get(String name) {
        return staticBridges.get(name);
    }

    /**
     * Check if a bridge is registered in static registry
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
        System.out.println("[BridgeRegistry] Clearing all static registered bridges");
        staticBridges.clear();
    }
}
