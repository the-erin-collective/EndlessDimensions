package com.moud.endlessdimensions.generation;

import java.util.Map;
import java.util.Objects;

public record TreePaletteProfile(
    TreePaletteKind kind,
    boolean enabled,
    String log,
    String logX,
    String logY,
    String logZ,
    String wood,
    String woodX,
    String woodZ,
    String leaves
) {
    public TreePaletteProfile {
        Objects.requireNonNull(kind, "kind");
        Objects.requireNonNull(log, "log");
        Objects.requireNonNull(logX, "logX");
        Objects.requireNonNull(logY, "logY");
        Objects.requireNonNull(logZ, "logZ");
        Objects.requireNonNull(wood, "wood");
        Objects.requireNonNull(woodX, "woodX");
        Objects.requireNonNull(woodZ, "woodZ");
        Objects.requireNonNull(leaves, "leaves");
    }

    public static TreePaletteProfile none() {
        return new TreePaletteProfile(
            TreePaletteKind.NONE,
            false,
            "minecraft:air",
            "minecraft:air",
            "minecraft:air",
            "minecraft:air",
            "minecraft:air",
            "minecraft:air",
            "minecraft:air",
            "minecraft:air"
        );
    }

    public Map<String, String> placeholderMap() {
        if (!enabled) {
            return Map.of();
        }
        return Map.of(
            "DIM_TREE_LOG", log,
            "DIM_TREE_LOG_X", logX,
            "DIM_TREE_LOG_Y", logY,
            "DIM_TREE_LOG_Z", logZ,
            "DIM_TREE_WOOD", wood,
            "DIM_TREE_WOOD_X", woodX,
            "DIM_TREE_WOOD_Z", woodZ,
            "DIM_TREE_LEAVES", leaves
        );
    }
}
