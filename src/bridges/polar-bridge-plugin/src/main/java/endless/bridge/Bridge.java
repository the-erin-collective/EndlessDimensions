package endless.bridge;

/**
 * Root interface that every bridge must implement.
 * Provides the basic contract for bridge identification and lifecycle management.
 */
public interface Bridge {

    /**
     * Unique identifier for this bridge (e.g. "terra", "polar", "trove")
     * @return The bridge name
     */
    String getName();

    /**
     * Called once during mod startup to initialize the bridge
     * @param context Bridge context providing access to Moud and Endless infrastructure
     */
    void initialize(BridgeContext context);

    /**
     * Called during shutdown for optional cleanup
     * Default implementation is empty
     */
    default void shutdown() {}
}
