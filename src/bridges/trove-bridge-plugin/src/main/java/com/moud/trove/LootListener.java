package com.moud.trove;

import endless.bridge.DimensionConfig;
import net.minestom.server.entity.Entity;
import net.minestom.server.entity.Player;
import net.minestom.server.event.Event;
import net.minestom.server.event.EventNode;
import net.minestom.server.event.entity.EntityDeathEvent;
import net.minestom.server.event.player.PlayerBlockBreakEvent;
import net.minestom.server.event.player.PlayerOpenInventoryEvent;
import net.minestom.server.event.trait.EntityEvent;
import net.minestom.server.event.trait.InstanceEvent;
import net.minestom.server.event.trait.PlayerEvent;
import net.minestom.server.instance.InstanceContainer;
import net.minestom.server.instance.block.Block;
import net.minestom.server.inventory.Inventory;
import net.minestom.server.inventory.InventoryType;
import net.minestom.server.item.ItemStack;
import net.minestom.server.tag.Tag;
import net.minestom.server.utils.NamespaceID;
import org.slf4j.Logger;

import java.util.List;
import java.util.concurrent.ThreadLocalRandom;

/**
 * Event listener that handles Minestom events and triggers Trove loot generation.
 * Stateless and registry-driven to support hot-reloads.
 */
public class LootListener {

    private static final Tag<Boolean> CHEST_POPULATED_TAG = Tag.Boolean("chest_populated").defaultValue(false);
    
    private final TroveLootTableRegistry registry;
    private final Logger logger;

    public LootListener(TroveLootTableRegistry registry, Logger logger) {
        this.registry = registry;
        this.logger = logger;
    }

    /**
     * Attach this listener to an instance's event node
     * @param instance The instance to attach to
     * @param config The dimension configuration
     */
    public void attachToInstance(InstanceContainer instance, DimensionConfig config) {
        EventNode<Event> eventNode = instance.eventNode();
        
        // Register event listeners
        eventNode.addListener(PlayerBlockBreakEvent.class, this::onBlockBreak);
        eventNode.addListener(EntityDeathEvent.class, this::onEntityDeath);
        eventNode.addListener(PlayerOpenInventoryEvent.class, this::onInventoryOpen);
        
        logger.debug("Attached loot listeners to instance: {}", instance.getUniqueId());
    }

    /**
     * Handle block break events - replaces vanilla drops with Trove-generated loot
     */
    private void onBlockBreak(PlayerBlockBreakEvent event) {
        try {
            Player player = event.getPlayer();
            Block block = event.getBlock();
            var position = event.getBlockPosition();
            var instance = player.getInstance();
            
            if (instance == null) {
                return;
            }

            // Check if this dimension has a loot table configured
            // In a real implementation, you'd get the dimension config from a registry
            String lootTableId = getLootTableForDimension(instance);
            if (lootTableId == null) {
                return; // No loot table configured, use vanilla behavior
            }

            // Build loot context
            var context = LootContextBuilder.forBlockBreak(player, block, position, instance)
                .lootTable(lootTableId)
                .build();

            // Generate loot using Trove
            List<ItemStack> loot = generateLoot(context);
            
            if (!loot.isEmpty()) {
                // Cancel vanilla drops
                event.setDropItems(false);
                
                // Spawn Trove-generated items
                for (ItemStack item : loot) {
                    instance.dropItem(position.add(0.5, 0.5, 0.5), item);
                }
                
                logger.debug("Generated {} items for block break at {}", loot.size(), position);
            }

        } catch (Exception e) {
            logger.error("Error handling block break event", e);
        }
    }

    /**
     * Handle entity death events - generates dimension-specific mob drops
     */
    private void onEntityDeath(EntityDeathEvent event) {
        try {
            Entity entity = event.getEntity();
            var position = entity.getPosition();
            var instance = entity.getInstance();
            
            if (instance == null) {
                return;
            }

            // Check if this dimension has a loot table configured
            String lootTableId = getLootTableForDimension(instance);
            if (lootTableId == null) {
                return; // No loot table configured
            }

            // Find the killer (player)
            Player killer = entity.getKiller();
            
            // Build loot context
            var context = LootContextBuilder.forEntityDeath(entity, killer, position, instance)
                .lootTable(lootTableId)
                .build();

            // Generate loot using Trove
            List<ItemStack> loot = generateLoot(context);
            
            if (!loot.isEmpty()) {
                // Clear vanilla drops and add Trove-generated items
                event.getEntity().setDrops(loot);
                
                logger.debug("Generated {} items for entity death: {}", loot.size(), entity.getEntityType().name());
            }

        } catch (Exception e) {
            logger.error("Error handling entity death event", e);
        }
    }

    /**
     * Handle inventory open events - populates chests on first interaction
     */
    private void onInventoryOpen(PlayerOpenInventoryEvent event) {
        try {
            Player player = event.getPlayer();
            Inventory inventory = event.getInventory();
            var position = player.getPosition();
            var instance = player.getInstance();
            
            if (instance == null || inventory == null) {
                return;
            }

            // Only handle chest inventories
            if (!isChestInventory(inventory)) {
                return;
            }

            // Check if chest has already been populated
            if (inventory.hasTag(CHEST_POPULATED_TAG)) {
                return; // Already populated
            }

            // Check if this dimension has a loot table configured
            String lootTableId = getLootTableForDimension(instance);
            if (lootTableId == null) {
                return; // No loot table configured
            }

            // Build loot context for chest population
            var context = LootContextBuilder.forCestPopulation(player, position, instance)
                .lootTable(lootTableId)
                .build();

            // Generate loot using Trove
            List<ItemStack> loot = generateLoot(context);
            
            if (!loot.isEmpty()) {
                // Fill chest with generated items
                fillChest(inventory, loot);
                
                // Mark chest as populated
                inventory.setTag(CHEST_POPULATED_TAG, true);
                
                logger.debug("Populated chest with {} items at {}", loot.size(), position);
            }

        } catch (Exception e) {
            logger.error("Error handling inventory open event", e);
        }
    }

    /**
     * Generate loot items using the Trove registry
     * @param context The loot context
     * @return List of generated items
     */
    private List<ItemStack> generateLoot(LootContextBuilder.LootContext context) {
        try {
            NamespaceID tableId = NamespaceID.from(context.getLootTableId());
            Object lootTable = registry.get(tableId);
            
            if (lootTable == null) {
                logger.warn("Loot table not found: {}", tableId);
                return List.of();
            }

            // In a real implementation, this would use Trove's actual loot generation
            // For now, we'll generate some placeholder items
            return generatePlaceholderLoot(context);
            
        } catch (Exception e) {
            logger.error("Failed to generate loot for table: {}", context.getLootTableId(), e);
            return List.of();
        }
    }

    /**
     * Generate placeholder loot items (for demonstration)
     * In a real implementation, this would use Trove's actual loot generation
     */
    private List<ItemStack> generatePlaceholderLoot(LootContextBuilder.LootContext context) {
        // Generate 1-3 random items as placeholder
        int itemCount = ThreadLocalRandom.current().nextInt(1, 4);
        
        return List.of(
            ItemStack.of(net.minestom.server.item.Material.DIAMOND, itemCount),
            ItemStack.of(net.minestom.server.item.Material.GOLD_INGOT, itemCount * 2)
        );
    }

    /**
     * Fill a chest inventory with generated items
     */
    private void fillChest(Inventory inventory, List<ItemStack> items) {
        for (int i = 0; i < Math.min(items.size(), inventory.getSize()); i++) {
            if (inventory.getItemStack(i).isAir()) {
                inventory.setItemStack(i, items.get(i));
            }
        }
    }

    /**
     * Check if an inventory is a chest
     */
    private boolean isChestInventory(Inventory inventory) {
        return inventory.getInventoryType() == InventoryType.CHEST_1_ROW ||
               inventory.getInventoryType() == InventoryType.CHEST_2_ROW ||
               inventory.getInventoryType() == InventoryType.CHEST_3_ROW ||
               inventory.getInventoryType() == InventoryType.CHEST_4_ROW ||
               inventory.getInventoryType() == InventoryType.CHEST_5_ROW ||
               inventory.getInventoryType() == InventoryType.CHEST_6_ROW;
    }

    /**
     * Get the loot table ID for a dimension
     * In a real implementation, this would look up the dimension config
     */
    private String getLootTableForDimension(net.minestom.server.instance.Instance instance) {
        // Placeholder implementation - in reality, you'd get this from the dimension config registry
        // For now, return a default loot table ID
        return "endless:overworld/basic";
    }
}
