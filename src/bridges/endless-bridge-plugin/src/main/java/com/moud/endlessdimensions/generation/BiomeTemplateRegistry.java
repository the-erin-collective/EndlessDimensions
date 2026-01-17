package com.moud.endlessdimensions.generation;

import java.util.Objects;

public final class BiomeTemplateRegistry {
    private BiomeTemplateRegistry() {
    }

    public static String terraBiomeId(BiomeTemplateId id) {
        Objects.requireNonNull(id, "Biome template id is required");
        if (id.isOverlay()) {
            throw new IllegalArgumentException("Overlay template does not map to a biome id: " + id);
        }
        return switch (id) {
            case OVERWORLD_PLAINS -> "dim_template_plains";
            case OVERWORLD_FOREST -> "dim_template_forest";
            case OVERWORLD_JUNGLE -> "dim_template_jungle";
            case OVERWORLD_DESERT -> "dim_template_desert";
            case OVERWORLD_BADLANDS -> "dim_template_badlands";
            case OVERWORLD_OCEAN -> "dim_template_ocean";
            case OVERWORLD_ICE_SPIKES -> "dim_template_ice_spikes";
            case OVERWORLD_MUSHROOM -> "dim_template_mushroom_fields";
            case FEATURELESS -> "dim_template_featureless";
            case NETHER_WASTES -> "dim_template_nether_wastes";
            case NETHER_BASALT_DELTAS -> "dim_template_basalt_deltas";
            case NETHER_CRIMSON -> "dim_template_crimson_forest";
            case NETHER_WARPED -> "dim_template_warped_forest";
            case END_HIGHLANDS -> "dim_template_end_highlands";
            case END_MIDLANDS -> "dim_template_end_midlands";
            case SPECIAL_BETWEEN, SPECIAL_SHAPES -> throw new IllegalArgumentException("Overlay template does not map to a biome id: " + id);
        };
    }

    public static String terraOverlayId(BiomeTemplateId id) {
        Objects.requireNonNull(id, "Biome overlay id is required");
        if (!id.isOverlay()) {
            throw new IllegalArgumentException("Not an overlay biome id: " + id);
        }
        return switch (id) {
            case SPECIAL_BETWEEN -> "dim_overlay_between";
            case SPECIAL_SHAPES -> "dim_overlay_shapes";
            default -> throw new IllegalArgumentException("Unknown overlay id: " + id);
        };
    }
}
