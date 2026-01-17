package endless.bridge;

/**
 * For bridges that operate per Instance (Terra, Polar, Trove).
 * These bridges can attach logic, listeners, and generators to specific instances.
 */
public interface InstanceAttachableBridge extends Bridge {

    /**
     * Called when a new InstanceContainer is created
     * Implementations must guard against double-attachment
     * @param instance The instance container to attach to
     * @param config The dimension configuration for this instance
     */
    void attachToInstance(Object instance, DimensionConfig config);
}
