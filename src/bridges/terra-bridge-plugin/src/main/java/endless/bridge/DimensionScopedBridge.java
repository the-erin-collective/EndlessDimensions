package endless.bridge;

/**
 * For bridges that depend on dimension configuration.
 * These bridges can choose whether to activate based on dimension settings.
 */
public interface DimensionScopedBridge extends Bridge {

    /**
     * Whether this bridge should activate for the given dimension configuration.
     * 
     * Examples:
     * - Terra: config.worldgen() instanceof TerraConfig
     * - Trove: config.lootTable() != null
     * - Polar: always true for persistence
     * 
     * @param config The dimension configuration to check
     * @return True if this bridge supports/should activate for this dimension
     */
    boolean supports(DimensionConfig config);
}
