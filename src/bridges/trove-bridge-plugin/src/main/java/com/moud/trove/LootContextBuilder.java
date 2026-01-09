package com.moud.trove;

import net.minestom.server.coordinate.Point;
import net.minestom.server.entity.Entity;
import net.minestom.server.entity.Player;
import net.minestom.server.instance.Instance;
import net.minestom.server.instance.block.Block;
import org.jetbrains.annotations.Nullable;

/**
 * Builder for creating Trove LootContext objects from Minestom runtime state.
 * Minimizes allocations for high-frequency events like block breaking.
 */
public class LootContextBuilder {

    private String lootTableId;
    private Player player;
    private Point position;
    private Instance instance;
    private Entity entity;
    private Block block;
    private String entityType;
    private float luck = 1.0f;
    private long seed;

    private LootContextBuilder() {
        // Private constructor for factory methods
    }

    /**
     * Create a loot context for block break events
     * @param player The player who broke the block
     * @param block The block that was broken
     * @param position The position where the block was broken
     * @param instance The instance where the event occurred
     * @return LootContextBuilder instance
     */
    public static LootContextBuilder forBlockBreak(Player player, Block block, Point position, Instance instance) {
        LootContextBuilder builder = new LootContextBuilder();
        builder.player = player;
        builder.block = block;
        builder.position = position;
        builder.instance = instance;
        builder.seed = calculateSeed(position, instance);
        return builder;
    }

    /**
     * Create a loot context for entity death events
     * @param entity The entity that died
     * @param killer The player who killed the entity (can be null)
     * @param position The position where the entity died
     * @param instance The instance where the event occurred
     * @return LootContextBuilder instance
     */
    public static LootContextBuilder forEntityDeath(Entity entity, @Nullable Player killer, Point position, Instance instance) {
        LootContextBuilder builder = new LootContextBuilder();
        builder.entity = entity;
        builder.player = killer;
        builder.entityType = entity.getEntityType().name().toLowerCase();
        builder.position = position;
        builder.instance = instance;
        builder.seed = calculateSeed(position, instance);
        return builder;
    }

    /**
     * Create a loot context for chest population
     * @param player The player who opened the chest
     * @param position The position of the chest
     * @param instance The instance where the chest is located
     * @return LootContextBuilder instance
     */
    public static LootContextBuilder forCestPopulation(Player player, Point position, Instance instance) {
        LootContextBuilder builder = new LootContextBuilder();
        builder.player = player;
        builder.position = position;
        builder.instance = instance;
        builder.seed = calculateSeed(position, instance);
        return builder;
    }

    /**
     * Set the loot table ID to use
     * @param lootTableId The loot table ID
     * @return This builder for chaining
     */
    public LootContextBuilder lootTable(String lootTableId) {
        this.lootTableId = lootTableId;
        return this;
    }

    /**
     * Set the luck factor for loot generation
     * @param luck The luck multiplier (default: 1.0)
     * @return This builder for chaining
     */
    public LootContextBuilder luck(float luck) {
        this.luck = luck;
        return this;
    }

    /**
     * Set a custom seed for deterministic loot generation
     * @param seed The seed to use
     * @return This builder for chaining
     */
    public LootContextBuilder seed(long seed) {
        this.seed = seed;
        return this;
    }

    /**
     * Build the final LootContext object
     * @return Trove LootContext object (placeholder for now)
     */
    public LootContext build() {
        if (instance == null || position == null) {
            throw new IllegalStateException("Instance and position are required");
        }

        // In a real implementation, this would create Trove's actual LootContext
        return new LootContext(
            lootTableId,
            player,
            position,
            instance,
            entity,
            block,
            entityType,
            luck,
            seed
        );
    }

    /**
     * Calculate a deterministic seed based on position and instance
     * @param position The position
     * @param instance The instance
     * @return A deterministic seed
     */
    private static long calculateSeed(Point position, Instance instance) {
        // Combine instance UUID hash with position coordinates for a stable seed
        long instanceHash = instance.getUniqueId().getMostSignificantBits() ^ instance.getUniqueId().getLeastSignificantBits();
        long posHash = ((long) position.blockX() << 32) ^ ((long) position.blockZ() & 0xFFFFFFFFL);
        return instanceHash ^ posHash;
    }

    /**
     * Placeholder class for Trove's LootContext
     * In a real implementation, this would be Trove's actual LootContext class
     */
    public static class LootContext {
        private final String lootTableId;
        private final Player player;
        private final Point position;
        private final Instance instance;
        private final Entity entity;
        private final Block block;
        private final String entityType;
        private final float luck;
        private final long seed;

        public LootContext(String lootTableId, Player player, Point position, Instance instance,
                          Entity entity, Block block, String entityType, float luck, long seed) {
            this.lootTableId = lootTableId;
            this.player = player;
            this.position = position;
            this.instance = instance;
            this.entity = entity;
            this.block = block;
            this.entityType = entityType;
            this.luck = luck;
            this.seed = seed;
        }

        // Getters
        public String getLootTableId() { return lootTableId; }
        public Player getPlayer() { return player; }
        public Point getPosition() { return position; }
        public Instance getInstance() { return instance; }
        public Entity getEntity() { return entity; }
        public Block getBlock() { return block; }
        public String getEntityType() { return entityType; }
        public float getLuck() { return luck; }
        public long getSeed() { return seed; }

        @Override
        public String toString() {
            return String.format("LootContext{table=%s, player=%s, pos=%s, instance=%s, luck=%.2f, seed=%d}",
                               lootTableId, player != null ? player.getUsername() : "null",
                               position, instance.getUniqueId(), luck, seed);
        }
    }
}
