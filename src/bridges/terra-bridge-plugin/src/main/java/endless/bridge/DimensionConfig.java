package endless.bridge;

import net.minestom.server.utils.NamespaceID;
import org.jetbrains.annotations.Nullable;

/**
 * Configuration data for a dimension.
 * This record represents the runtime model for dimension configuration.
 */
public record DimensionConfig(
    NamespaceID id,
    @Nullable NamespaceID lootTable,
    Object worldgen,
    @Nullable String combatProfile
) {
    /**
     * Create a dimension config without a loot table
     */
    public DimensionConfig(NamespaceID id, Object worldgen) {
        this(id, null, worldgen, null);
    }

    /**
     * Create a dimension config with loot table but no combat profile
     */
    public DimensionConfig(NamespaceID id, @Nullable NamespaceID lootTable, Object worldgen) {
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
