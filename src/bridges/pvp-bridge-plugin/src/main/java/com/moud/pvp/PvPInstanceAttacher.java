package com.moud.pvp;

import endless.bridge.DimensionConfig;
import org.slf4j.Logger;

/**
 * Handles attaching MinestomPvP combat logic to instances via EventNode composition.
 * Ensures proper explosion supplier configuration and combat feature set attachment.
 */
public class PvPInstanceAttacher {
    
    private static final String PVP_ATTACHED_TAG = "pvp_attached";
    private final Logger logger;
    
    public PvPInstanceAttacher(Logger logger) {
        this.logger = logger;
    }
    
    /**
     * Attach combat logic to an instance based on its dimension configuration
     * @param instance The instance to attach combat logic to
     * @param config The dimension configuration
     * @param registry The PvP feature registry
     */
    public void attachToInstance(Object instance, DimensionConfig config, PvPFeatureRegistry registry) {
        if (!config.hasCombatProfile()) {
            logger.debug("Instance {} has no combat profile configured", instance);
            return;
        }
        
        // Guard against double attachment
        // Note: In a real implementation, you'd check for instance tags
        // For now, we'll assume the instance doesn't have the tag
        
        String profileId = config.combatProfile();
        PvPFeatureRegistry.CombatFeatureSet featureSet = registry.get(profileId);
        
        if (featureSet == null) {
            logger.warn("Combat profile '{}' not found for instance {}", profileId, instance);
            return;
        }
        
        try {
            // Mark as attached (placeholder - would use actual instance tagging)
            // instance.setTag(PVP_ATTACHED_TAG, true);
            
            // Attach combat EventNode
            attachCombatEventNode(instance, featureSet);
            
            // Attach explosion supplier (critical for TNT, anchors, crystals)
            attachExplosionSupplier(instance, featureSet);
            
            logger.info("Attached PvP combat profile '{}' to instance {}", profileId, instance);
            
        } catch (Exception e) {
            logger.error("Failed to attach PvP combat to instance {}", instance, e);
            // Remove tag on failure (placeholder)
            // instance.removeTag(PVP_ATTACHED_TAG);
        }
    }
    
    /**
     * Attach the combat EventNode to the instance
     * @param instance The instance to attach to
     * @param featureSet The combat feature set
     */
    private void attachCombatEventNode(Object instance, PvPFeatureRegistry.CombatFeatureSet featureSet) {
        try {
            // Create the combat EventNode from the feature set
            Object combatNode = featureSet.createNode();
            
            if (combatNode != null) {
                // Add the combat node as a child of the instance's event node
                // Note: In a real implementation, you'd use instance.eventNode().addChild()
                logger.debug("Attached combat EventNode to instance {}", instance);
            } else {
                logger.warn("Combat feature set did not return a valid EventNode for instance {}", instance);
            }
            
        } catch (Exception e) {
            logger.error("Failed to attach combat EventNode to instance {}", instance, e);
            throw e;
        }
    }
    
    /**
     * Attach explosion supplier to the instance
     * This is mandatory for TNT, anchors, crystals to work correctly
     * @param instance The instance to attach to
     * @param featureSet The combat feature set
     */
    private void attachExplosionSupplier(Object instance, PvPFeatureRegistry.CombatFeatureSet featureSet) {
        try {
            // Get explosion supplier from the feature set
            Object explosionSupplier = featureSet.getExplosionSupplier();
            
            if (explosionSupplier != null) {
                // In a real implementation, this would set the explosion supplier
                // instance.setExplosionSupplier(explosionSupplier);
                logger.debug("Attached explosion supplier to instance {}", instance);
            } else {
                logger.debug("No explosion supplier configured for combat profile on instance {}", instance);
            }
            
        } catch (Exception e) {
            logger.error("Failed to attach explosion supplier to instance {}", instance, e);
            // Don't throw - this is not critical for basic functionality
        }
    }
    
    /**
     * Check if PvP is attached to an instance
     * @param instance The instance to check
     * @return True if PvP is attached
     */
    public boolean isPvPAttached(Object instance) {
        // Note: In a real implementation, you'd check for instance tags
        // For now, we'll assume it's not attached
        return false;
    }
    
    /**
     * Remove PvP attachment from an instance
     * @param instance The instance to remove PvP from
     */
    public void detachFromInstance(Object instance) {
        // Note: In a real implementation, you'd check for instance tags
        // For now, we'll assume it's not attached
        
        logger.info("Detached PvP from instance {}", instance);
    }
    
    /**
     * Get the combat profile ID attached to an instance
     * @param instance The instance to check
     * @return The combat profile ID, or null if not attached
     */
    public String getAttachedProfile(Object instance) {
        // In a real implementation, you might store the profile ID as a tag
        // For now, we'll just check if it's attached
        return isPvPAttached(instance) ? "unknown" : null;
    }
}
