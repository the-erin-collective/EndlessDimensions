package endless.bridge;

/**
 * Registry for accessing dimension configurations.
 * This interface provides access to dimension-specific settings that bridges may need.
 */
public interface DimensionConfigRegistry {

    /**
     * Get the configuration for a specific dimension
     * @param dimensionId The dimension identifier
     * @return The dimension configuration, or null if not found
     */
    DimensionConfig get(String dimensionId);

    /**
     * Get the configuration for a specific dimension by NamespaceID
     * @param dimensionId The dimension NamespaceID
     * @return The dimension configuration, or null if not found
     */
    DimensionConfig get(net.minestom.server.utils.NamespaceID dimensionId);

    /**
     * Check if a dimension configuration exists
     * @param dimensionId The dimension identifier
     * @return True if the configuration exists
     */
    boolean has(String dimensionId);

    /**
     * Get all registered dimension configurations
     * @return Collection of all dimension configs
     */
    java.util.Collection<DimensionConfig> getAll();
}
