package com.moud.pvp;

import org.graalvm.polyglot.HostAccess;
import org.graalvm.polyglot.Value;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

/**
 * Facade class that exposes MinestomPvP combat system API to JavaScript/TypeScript.
 * All methods are annotated with @HostAccess.Export to make them visible to GraalVM polyglot context.
 */
public class PvPFacade {
    
    private static final Logger logger = LoggerFactory.getLogger(PvPFacade.class);
    private PvPBridge pvpBridge;
    
    public PvPFacade(PvPBridge pvpBridge) {
        this.pvpBridge = pvpBridge;
        logger.info("PvP facade initialized");
    }
    
    /**
     * Get statistics about the PvP system
     * @return Statistics object
     */
    @HostAccess.Export
    public String getStatistics() {
        try {
            if (pvpBridge == null) {
                return "PvP bridge not available";
            }
            return pvpBridge.getStatistics();
        } catch (Exception e) {
            logger.error("Failed to get PvP statistics", e);
            return "Error retrieving statistics";
        }
    }
    
    /**
     * Check if a specific combat profile exists
     * @param profileId The combat profile ID to check
     * @return True if the profile exists
     */
    @HostAccess.Export
    public boolean hasCombatProfile(String profileId) {
        try {
            if (pvpBridge == null || !pvpBridge.isInitialized()) {
                return false;
            }
            
            return pvpBridge.getRegistry().has(profileId);
            
        } catch (Exception e) {
            logger.error("Failed to check combat profile existence: {}", profileId, e);
            return false;
        }
    }
    
    /**
     * Get all available combat profile IDs
     * @return Array of combat profile IDs
     */
    @HostAccess.Export
    public String[] getCombatProfileIds() {
        try {
            if (pvpBridge == null || !pvpBridge.isInitialized()) {
                return new String[0];
            }
            
            return pvpBridge.getRegistry().getAllIds();
            
        } catch (Exception e) {
            logger.error("Failed to get combat profile IDs", e);
            return new String[0];
        }
    }
    
    /**
     * Reload all combat profiles
     * @return CompletableFuture that completes when reload is done
     */
    @HostAccess.Export
    public CompletableFuture<Object> reloadCombatProfiles() {
        return CompletableFuture.supplyAsync(() -> {
            try {
                if (pvpBridge == null) {
                    return createErrorResult("PvP bridge not available");
                }
                
                pvpBridge.reload();
                
                Map<String, Object> result = new HashMap<>();
                result.put("success", true);
                result.put("message", "Combat profiles reloaded successfully");
                return result;
                
            } catch (Exception e) {
                logger.error("Failed to reload combat profiles", e);
                return createErrorResult(e.getMessage());
            }
        });
    }
    
    /**
     * Check if MinestomPvP is initialized
     * @return True if MinestomPvP is initialized
     */
    @HostAccess.Export
    public boolean isMinestomPvPInitialized() {
        try {
            if (pvpBridge == null) {
                return false;
            }
            return pvpBridge.isMinestomPvPInitialized();
        } catch (Exception e) {
            logger.error("Failed to check MinestomPvP initialization status", e);
            return false;
        }
    }
    
    /**
     * Create an error result object
     * @param message Error message
     * @return Error result object
     */
    private Map<String, Object> createErrorResult(String message) {
        Map<String, Object> result = new HashMap<>();
        result.put("success", false);
        result.put("error", message);
        return result;
    }
}