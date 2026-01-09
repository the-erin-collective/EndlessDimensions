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
    Object worldgen
) {
    /**
     * Create a dimension config without a loot table
     */
    public DimensionConfig(NamespaceID id, Object worldgen) {
        this(id, null, worldgen);
    }

    /**
     * Check if this dimension has a loot table configured
     * @return True if loot table is not null
     */
    public boolean hasLootTable() {
        return lootTable != null;
    }
}
