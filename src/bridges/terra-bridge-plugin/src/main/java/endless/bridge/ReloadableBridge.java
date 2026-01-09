package endless.bridge;

/**
 * For bridges that load external data (assets, JSON, binaries).
 * These bridges support hot-reloading of their external resources.
 */
public interface ReloadableBridge extends Bridge {

    /**
     * Reload external resources.
     * Must be thread-safe and atomic to prevent issues during high-frequency events.
     * Should not require instance reinjection.
     */
    void reload();
}
