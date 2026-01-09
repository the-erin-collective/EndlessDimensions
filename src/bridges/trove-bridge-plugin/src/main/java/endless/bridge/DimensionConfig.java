package endless.bridge;

/**
 * Configuration data for a dimension.
 * This record represents the runtime model for dimension configuration.
 */
public record DimensionConfig(
    Object id,
    Object lootTable,
    Object worldgen,
    String combatProfile
) {
    /**
     * Create a dimension config without a loot table
     */
    public DimensionConfig(Object id, Object worldgen) {
        this(id, null, worldgen, null);
    }

    /**
     * Create a dimension config with loot table but no combat profile
     */
    public DimensionConfig(Object id, Object lootTable, Object worldgen) {
        this(id, lootTable, worldgen, null);
    }

    /**
     * Check if this dimension has a loot table configured
     * @return True if loot table is not null
     */
    public boolean hasLootTable() {
        return lootTable != null;
    }

    /**
     * Check if this dimension has a combat profile configured
     * @return True if combat profile is not null
     */
    public boolean hasCombatProfile() {
        return combatProfile != null;
    }
}
