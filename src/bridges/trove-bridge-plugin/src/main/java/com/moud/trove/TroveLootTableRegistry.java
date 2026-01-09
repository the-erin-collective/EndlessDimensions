package com.moud.trove;

import net.minestom.server.utils.NamespaceID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Registry for loading and storing Trove loot tables.
 * Supports atomic reload for thread safety during high-frequency events.
 */
public class TroveLootTableRegistry {

    private static final Logger logger = LoggerFactory.getLogger(TroveLootTableRegistry.class);
    
    // Atomic reference for thread-safe reloads
    private final AtomicReference<ConcurrentHashMap<NamespaceID, Object>> tablesRef;
    
    public TroveLootTableRegistry() {
        this.tablesRef = new AtomicReference<>(new ConcurrentHashMap<>());
    }

    /**
     * Load loot tables from the specified assets directory
     * @param assetsRoot Path to the assets directory containing loot tables
     */
    public void load(Path assetsRoot) {
        ConcurrentHashMap<NamespaceID, Object> newTables = new ConcurrentHashMap<>();
        
        try {
            if (!Files.exists(assetsRoot)) {
                logger.warn("Loot tables directory does not exist: {}", assetsRoot);
                // Still set empty map to prevent null pointer issues
                tablesRef.set(newTables);
                return;
            }

            logger.info("Loading Trove loot tables from: {}", assetsRoot);
            
            // Walk through all JSON files in the directory
            Files.walk(assetsRoot)
                .filter(path -> path.toString().endsWith(".json"))
                .forEach(path -> loadLootTable(path, assetsRoot, newTables));

            // Atomic swap
            tablesRef.set(newTables);
            
            logger.info("Loaded {} Trove loot tables", newTables.size());
            
        } catch (IOException e) {
            logger.error("Failed to load loot tables from: {}", assetsRoot, e);
            throw new RuntimeException("Loot table loading failed", e);
        }
    }

    /**
     * Reload loot tables atomically
     * @param assetsRoot Path to the assets directory containing loot tables
     */
    public void reload(Path assetsRoot) {
        logger.info("Reloading Trove loot tables...");
        load(assetsRoot); // load() already does atomic swap
    }

    /**
     * Get a loot table by its namespace ID
     * @param id The namespace ID of the loot table
     * @return The loot table object, or null if not found
     */
    public Object get(NamespaceID id) {
        return tablesRef.get().get(id);
    }

    /**
     * Check if a loot table exists
     * @param id The namespace ID of the loot table
     * @return True if the loot table exists
     */
    public boolean has(NamespaceID id) {
        return tablesRef.get().containsKey(id);
    }

    /**
     * Get all loaded loot table IDs
     * @return Array of namespace IDs
     */
    public NamespaceID[] getAllIds() {
        return tablesRef.get().keySet().toArray(new NamespaceID[0]);
    }

    /**
     * Get the number of loaded loot tables
     * @return Number of loaded tables
     */
    public int getCount() {
        return tablesRef.get().size();
    }

    /**
     * Get statistics about the registry
     * @return Statistics string
     */
    public String getStatistics() {
        int count = getCount();
        return String.format("Trove Registry Stats - Loaded tables: %d", count);
    }

    /**
     * Load a single loot table file
     * @param filePath Path to the loot table file
     * @param assetsRoot Root assets directory for resolving relative paths
     * @param tables Map to store the loaded table
     */
    private void loadLootTable(Path filePath, Path assetsRoot, ConcurrentHashMap<NamespaceID, Object> tables) {
        try {
            // Convert file path to namespace ID
            String relativePath = assetsRoot.relativize(filePath).toString();
            String namespaceIdStr = relativePath
                .replace("\\", "/")  // Normalize path separators
                .replace(".json", ""); // Remove extension
            
            NamespaceID namespaceId = NamespaceID.from("endless:" + namespaceIdStr);
            
            // Read and parse JSON content
            String jsonContent = Files.readString(filePath);
            
            // In a real implementation, this would use Trove's JSON codecs
            // For now, we'll create a simple placeholder object
            Object lootTable = parseLootTable(jsonContent, namespaceId);
            
            if (lootTable != null) {
                tables.put(namespaceId, lootTable);
                logger.debug("Loaded loot table: {}", namespaceId);
            } else {
                logger.warn("Failed to parse loot table: {}", namespaceId);
            }
            
        } catch (Exception e) {
            logger.error("Failed to load loot table from: {}", filePath, e);
            // Continue loading other tables instead of failing completely
        }
    }

    /**
     * Parse loot table JSON content
     * @param jsonContent The JSON content to parse
     * @param namespaceId The namespace ID for this loot table
     * @return Parsed loot table object, or null if parsing failed
     */
    private Object parseLootTable(String jsonContent, NamespaceID namespaceId) {
        try {
            // In a real implementation, this would use Trove's JSON codecs
            // For now, we'll create a simple placeholder that represents the loot table
            
            // Validate that it's valid JSON (basic check)
            if (!jsonContent.trim().startsWith("{") || !jsonContent.trim().endsWith("}")) {
                logger.warn("Invalid JSON format for loot table: {}", namespaceId);
                return null;
            }
            
            // Create a simple placeholder object
            return new LootTablePlaceholder(namespaceId.toString(), jsonContent);
            
        } catch (Exception e) {
            logger.error("Failed to parse loot table JSON for: {}", namespaceId, e);
            return null;
        }
    }

    /**
     * Simple placeholder class for loot tables
     * In a real implementation, this would be Trove's actual LootTable class
     */
    public static class LootTablePlaceholder {
        private final String id;
        private final String jsonContent;
        
        public LootTablePlaceholder(String id, String jsonContent) {
            this.id = id;
            this.jsonContent = jsonContent;
        }
        
        public String getId() { return id; }
        public String getJsonContent() { return jsonContent; }
        
        @Override
        public String toString() {
            return "LootTable{id=" + id + "}";
        }
    }
}
