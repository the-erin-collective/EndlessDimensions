package com.moud.endlessdimensions.generation;

import java.util.EnumMap;
import java.util.Map;
import java.util.Objects;

public final class TreePaletteDefaults {
    private static final TreePaletteProfile NONE = TreePaletteProfile.none();
    private static final Map<BiomeTemplateId, TreePaletteProfile> DEFAULTS = new EnumMap<>(BiomeTemplateId.class);

    static {
        DEFAULTS.put(BiomeTemplateId.OVERWORLD_PLAINS, overworldTree(TreePaletteKind.OAK));
        DEFAULTS.put(BiomeTemplateId.OVERWORLD_FOREST, overworldTree(TreePaletteKind.SPRUCE));
        DEFAULTS.put(BiomeTemplateId.OVERWORLD_JUNGLE, overworldTree(TreePaletteKind.MEGA_JUNGLE));
        DEFAULTS.put(BiomeTemplateId.OVERWORLD_DESERT, cactus());
        DEFAULTS.put(BiomeTemplateId.OVERWORLD_BADLANDS, NONE);
        DEFAULTS.put(BiomeTemplateId.OVERWORLD_OCEAN, NONE);
        DEFAULTS.put(BiomeTemplateId.OVERWORLD_ICE_SPIKES, NONE);
        DEFAULTS.put(BiomeTemplateId.OVERWORLD_MUSHROOM, mushroom());
        DEFAULTS.put(BiomeTemplateId.FEATURELESS, NONE);

        DEFAULTS.put(BiomeTemplateId.NETHER_WASTES, NONE);
        DEFAULTS.put(BiomeTemplateId.NETHER_BASALT_DELTAS, NONE);
        DEFAULTS.put(BiomeTemplateId.NETHER_CRIMSON, netherFungus("crimson"));
        DEFAULTS.put(BiomeTemplateId.NETHER_WARPED, netherFungus("warped"));

        DEFAULTS.put(BiomeTemplateId.END_HIGHLANDS, chorus());
        DEFAULTS.put(BiomeTemplateId.END_MIDLANDS, chorus());
    }

    private TreePaletteDefaults() {
    }

    public static TreePaletteProfile forBiome(BiomeTemplateId id) {
        Objects.requireNonNull(id, "biome template id");
        return DEFAULTS.getOrDefault(id, NONE);
    }

    private static TreePaletteProfile overworldTree(TreePaletteKind kind) {
        return switch (kind) {
            case OAK -> new TreePaletteProfile(
                kind,
                true,
                "minecraft:oak_log",
                "minecraft:oak_log[axis=x]",
                "minecraft:oak_log[axis=y]",
                "minecraft:oak_log[axis=z]",
                "minecraft:oak_wood",
                "minecraft:oak_wood[axis=x]",
                "minecraft:oak_wood[axis=z]",
                "minecraft:oak_leaves[distance=1,persistent=false]"
            );
            case SPRUCE -> new TreePaletteProfile(
                kind,
                true,
                "minecraft:spruce_log",
                "minecraft:spruce_log[axis=x]",
                "minecraft:spruce_log[axis=y]",
                "minecraft:spruce_log[axis=z]",
                "minecraft:spruce_wood",
                "minecraft:spruce_wood[axis=x]",
                "minecraft:spruce_wood[axis=z]",
                "minecraft:spruce_leaves[distance=1,persistent=false]"
            );
            case MEGA_JUNGLE -> new TreePaletteProfile(
                kind,
                true,
                "minecraft:jungle_log",
                "minecraft:jungle_log[axis=x]",
                "minecraft:jungle_log[axis=y]",
                "minecraft:jungle_log[axis=z]",
                "minecraft:jungle_wood",
                "minecraft:jungle_wood[axis=x]",
                "minecraft:jungle_wood[axis=z]",
                "minecraft:jungle_leaves[distance=1,persistent=false]"
            );
            default -> NONE;
        };
    }

    private static TreePaletteProfile cactus() {
        return new TreePaletteProfile(
            TreePaletteKind.CACTUS,
            true,
            "minecraft:cactus",
            "minecraft:cactus",
            "minecraft:cactus",
            "minecraft:cactus",
            "minecraft:cactus",
            "minecraft:cactus",
            "minecraft:cactus",
            "minecraft:cactus"
        );
    }

    private static TreePaletteProfile mushroom() {
        return new TreePaletteProfile(
            TreePaletteKind.HUGE_MUSHROOM,
            true,
            "minecraft:mushroom_stem",
            "minecraft:mushroom_stem",
            "minecraft:mushroom_stem",
            "minecraft:mushroom_stem",
            "minecraft:mushroom_stem",
            "minecraft:mushroom_stem",
            "minecraft:mushroom_stem",
            "minecraft:red_mushroom_block"
        );
    }

    private static TreePaletteProfile chorus() {
        return new TreePaletteProfile(
            TreePaletteKind.CHORUS,
            true,
            "minecraft:chorus_plant",
            "minecraft:chorus_plant",
            "minecraft:chorus_plant",
            "minecraft:chorus_plant",
            "minecraft:chorus_plant",
            "minecraft:chorus_plant",
            "minecraft:chorus_plant",
            "minecraft:chorus_flower"
        );
    }

    private static TreePaletteProfile netherFungus(String type) {
        TreePaletteKind kind = "warped".equalsIgnoreCase(type)
            ? TreePaletteKind.WARPED_FUNGUS
            : TreePaletteKind.CRIMSON_FUNGUS;
        String stem = "minecraft:" + type + "_stem";
        String wart = "minecraft:" + type + "_wart_block";
        return new TreePaletteProfile(
            kind,
            true,
            stem,
            stem + "[axis=x]",
            stem + "[axis=y]",
            stem + "[axis=z]",
            stem,
            stem + "[axis=x]",
            stem + "[axis=z]",
            wart
        );
    }
}
