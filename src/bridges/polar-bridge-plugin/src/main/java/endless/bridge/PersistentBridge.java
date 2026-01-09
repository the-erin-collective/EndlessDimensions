package endless.bridge;

/**
 * For bridges that manage on-disk state (Polar).
 * This keeps persistence explicit rather than implicit.
 */
public interface PersistentBridge extends Bridge {

    /**
     * Persist all managed state to disk.
     * Should be called during graceful shutdown or periodic saves.
     */
    void saveAll();
}
