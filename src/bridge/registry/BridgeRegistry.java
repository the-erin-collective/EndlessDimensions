package endless.bridge.registry;

import endless.bridge.*;

import java.util.List;

/**
 * Central system that wires bridges to instances.
 * Acts as the coordinator for bridge lifecycle management.
 */
public class BridgeRegistry {

    private final List<Bridge> bridges;

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
        InstanceContainer instance,
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
}
