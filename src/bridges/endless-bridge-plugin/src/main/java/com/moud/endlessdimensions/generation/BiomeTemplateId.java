package com.moud.endlessdimensions.generation;

public enum BiomeTemplateId {
    OVERWORLD_PLAINS,
    OVERWORLD_FOREST,
    OVERWORLD_JUNGLE,
    OVERWORLD_DESERT,
    OVERWORLD_BADLANDS,
    OVERWORLD_OCEAN,
    OVERWORLD_ICE_SPIKES,
    OVERWORLD_MUSHROOM,
    FEATURELESS,

    NETHER_WASTES,
    NETHER_BASALT_DELTAS,
    NETHER_CRIMSON,
    NETHER_WARPED,

    END_HIGHLANDS,
    END_MIDLANDS,

    SPECIAL_BETWEEN,
    SPECIAL_SHAPES;

    public boolean isOverlay() {
        return this == SPECIAL_BETWEEN || this == SPECIAL_SHAPES;
    }
}
