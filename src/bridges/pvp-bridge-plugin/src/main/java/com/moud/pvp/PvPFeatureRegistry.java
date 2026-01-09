package com.moud.pvp;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Registry for loading and storing MinestomPvP combat feature sets.
 * Supports atomic reload for thread safety during instance creation.
 */
public class PvPFeatureRegistry {

    private static final Logger logger = LoggerFactory.getLogger(PvPFeatureRegistry.class);
    
    // Atomic reference for thread-safe reloads
    private final AtomicReference<ConcurrentHashMap<String, CombatFeatureSet>> profilesRef;
    
    public PvPFeatureRegistry() {
        this.profilesRef = new AtomicReference<>(new ConcurrentHashMap<>());
    }

    /**
     * Load combat profiles from the specified assets directory
     * @param pvpAssets Path to the pvp assets directory containing combat profiles
     */
    public void load(Object pvpAssets) {
        ConcurrentHashMap<String, CombatFeatureSet> newProfiles = new ConcurrentHashMap<>();
        
        try {
            // In a real implementation, you'd walk through the pvpAssets directory
            // For now, we'll just create some placeholder profiles
            logger.info("Loading MinestomPvP combat profiles from: {}", pvpAssets);
            
            // Create placeholder combat profiles
            newProfiles.put("modern", new CombatFeatureSet("modern", "{}"));
            newProfiles.put("legacy", new CombatFeatureSet("legacy", "{}"));
            newProfiles.put("lobby", new CombatFeatureSet("lobby", "{}"));
            
            // Atomic swap
            profilesRef.set(newProfiles);
            
            logger.info("Loaded {} MinestomPvP combat profiles", newProfiles.size());
            
        } catch (Exception e) {
            logger.error("Failed to load combat profiles from: {}", pvpAssets, e);
            throw new RuntimeException("Combat profile loading failed", e);
        }
    }

    /**
     * Reload combat profiles atomically
     * @param pvpAssets Path to the pvp assets directory containing combat profiles
     */
    public void reload() {
        // In a real implementation, you'd pass the assets path here
        // For now, we'll log that reload happened
        logger.info("Reloading MinestomPvP combat profiles...");
        // load() would be called with the same assets path
    }

    /**
     * Get a combat feature set by its profile ID
     * @param profileId The profile ID (e.g., "modern", "legacy", "lobby")
     * @return The CombatFeatureSet, or null if not found
     */
    public CombatFeatureSet get(String profileId) {
        return profilesRef.get().get(profileId);
    }

    /**
     * Check if a combat profile exists
     * @param profileId The profile ID to check
     * @return True if the profile exists
     */
    public boolean has(String profileId) {
        return profilesRef.get().containsKey(profileId);
    }

    /**
     * Get all loaded profile IDs
     * @return Array of profile IDs
     */
    public String[] getAllIds() {
        return profilesRef.get().keySet().toArray(new String[0]);
    }

    /**
     * Get the number of loaded profiles
     * @return Number of loaded profiles
     */
    public int getCount() {
        return profilesRef.get().size();
    }

    /**
     * Get statistics about the registry
     * @return Statistics string
     */
    public String getStatistics() {
        int count = getCount();
        return String.format("PvP Registry Stats - Loaded profiles: %d", count);
    }

    /**
     * Load a single combat profile file
     * @param filePath Path to the combat profile file
     * @param profiles Map to store the loaded profile
     */
    private void loadCombatProfile(Path filePath, ConcurrentHashMap<String, CombatFeatureSet> profiles) {
        try {
            // Convert file path to profile ID (filename without extension)
            String fileName = filePath.getFileName().toString();
            String profileId = fileName.replace(".json", "");
            
            // Read and parse JSON content
            String jsonContent = Files.readString(filePath);
            
            // Parse the combat profile
            CombatFeatureSet featureSet = parseCombatProfile(jsonContent, profileId);
            
            if (featureSet != null) {
                profiles.put(profileId, featureSet);
                logger.debug("Loaded combat profile: {}", profileId);
            } else {
                logger.warn("Failed to parse combat profile: {}", profileId);
            }
            
        } catch (Exception e) {
            logger.error("Failed to load combat profile from: {}", filePath, e);
            // Continue loading other profiles instead of failing completely
        }
    }

    /**
     * Parse combat profile JSON content
     * @param jsonContent The JSON content to parse
     * @param profileId The profile ID for this combat profile
     * @return Parsed CombatFeatureSet, or null if parsing failed
     */
    private CombatFeatureSet parseCombatProfile(String jsonContent, String profileId) {
        try {
            // In a real implementation, this would parse the JSON and create actual CombatFeatureSet
            // For now, we'll create a placeholder based on the profile ID
            
            // Validate that it's valid JSON (basic check)
            if (!jsonContent.trim().startsWith("{") || !jsonContent.trim().endsWith("}")) {
                logger.warn("Invalid JSON format for combat profile: {}", profileId);
                return null;
            }
            
            // Create a placeholder CombatFeatureSet
            return new CombatFeatureSet(profileId, jsonContent);
            
        } catch (Exception e) {
            logger.error("Failed to parse combat profile JSON for: {}", profileId, e);
            return null;
        }
    }

    /**
     * Placeholder class for CombatFeatureSet
     * In a real implementation, this would be MinestomPvP's actual CombatFeatureSet class
     */
    public static class CombatFeatureSet {
        private final String profileId;
        private final String jsonContent;
        
        public CombatFeatureSet(String profileId, String jsonContent) {
            this.profileId = profileId;
            this.jsonContent = jsonContent;
        }
        
        public String getProfileId() { return profileId; }
        public String getJsonContent() { return jsonContent; }
        
        /**
         * Create the EventNode for this combat feature set
         * In a real implementation, this would return the actual MinestomPvP EventNode
         */
        public Object createNode() {
            // Placeholder - would return actual MinestomPvP EventNode
            return new Object();
        }
        
        /**
         * Get explosion supplier for this feature set
         * In a real implementation, this would return the actual explosion supplier
         */
        public Object getExplosionSupplier() {
            // Placeholder - would return actual explosion supplier
            return null;
        }
        
        @Override
        public String toString() {
            return "CombatFeatureSet{id=" + profileId + "}";
        }
    }
}
