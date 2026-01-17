package com.moud.endlessdimensions.generation;

import net.minestom.server.registry.RegistryKey;
import net.minestom.server.world.DimensionType;

import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.Stream;

public enum ShellType {
    OVERWORLD_OPEN(
        "OVERWORLD_OPEN",
        RegistryKey.unsafeOf("minecraft:overworld"),
        "minecraft:overworld",
        "minecraft:overworld",
        "shells/overworld_open",
        List.of(
            BiomeTemplateId.OVERWORLD_PLAINS,
            BiomeTemplateId.OVERWORLD_FOREST,
            BiomeTemplateId.OVERWORLD_JUNGLE,
            BiomeTemplateId.OVERWORLD_DESERT,
            BiomeTemplateId.OVERWORLD_BADLANDS,
            BiomeTemplateId.OVERWORLD_OCEAN,
            BiomeTemplateId.OVERWORLD_ICE_SPIKES,
            BiomeTemplateId.OVERWORLD_MUSHROOM,
            BiomeTemplateId.FEATURELESS,
            BiomeTemplateId.SPECIAL_BETWEEN,
            BiomeTemplateId.SPECIAL_SHAPES
        )
    ),
    NETHER_CAVERN(
        "NETHER_CAVERN",
        RegistryKey.unsafeOf("minecraft:the_nether"),
        "minecraft:the_nether",
        "minecraft:nether",
        "shells/nether_cavern",
        List.of(
            BiomeTemplateId.NETHER_WASTES,
            BiomeTemplateId.NETHER_BASALT_DELTAS,
            BiomeTemplateId.NETHER_CRIMSON,
            BiomeTemplateId.NETHER_WARPED,
            BiomeTemplateId.FEATURELESS,
            BiomeTemplateId.SPECIAL_BETWEEN,
            BiomeTemplateId.SPECIAL_SHAPES
        )
    ),
    END_ISLANDS(
        "END_ISLANDS",
        RegistryKey.unsafeOf("minecraft:the_end"),
        "minecraft:the_end",
        "minecraft:end",
        "shells/end_islands",
        List.of(
            BiomeTemplateId.END_HIGHLANDS,
            BiomeTemplateId.END_MIDLANDS,
            BiomeTemplateId.FEATURELESS,
            BiomeTemplateId.SPECIAL_BETWEEN,
            BiomeTemplateId.SPECIAL_SHAPES
        )
    ),
    SUPERFLAT(
        "SUPERFLAT",
        RegistryKey.unsafeOf("minecraft:overworld"),
        "minecraft:overworld",
        "minecraft:overworld",
        "shells/superflat",
        List.of(
            BiomeTemplateId.OVERWORLD_PLAINS,
            BiomeTemplateId.FEATURELESS,
            BiomeTemplateId.SPECIAL_BETWEEN,
            BiomeTemplateId.SPECIAL_SHAPES
        )
    );

    private static final Map<String, ShellType> BY_ID = Stream.of(values())
        .collect(Collectors.toMap(shell -> shell.id.toLowerCase(Locale.ROOT), shell -> shell));

    private final String id;
    private final RegistryKey<DimensionType> dimensionKey;
    private final String vanillaDimension;
    private final String vanillaGeneration;
    private final String templateRoot;
    private final List<BiomeTemplateId> biomePool;

    ShellType(String id,
              RegistryKey<DimensionType> dimensionKey,
              String vanillaDimension,
              String vanillaGeneration,
              String templateRoot,
              List<BiomeTemplateId> biomePool) {
        this.id = id;
        this.dimensionKey = dimensionKey;
        this.vanillaDimension = vanillaDimension;
        this.vanillaGeneration = vanillaGeneration;
        this.templateRoot = templateRoot;
        this.biomePool = List.copyOf(biomePool);
    }

    public String id() {
        return id;
    }

    public RegistryKey<DimensionType> dimensionKey() {
        return dimensionKey;
    }

    public String vanillaDimension() {
        return vanillaDimension;
    }

    public String vanillaGeneration() {
        return vanillaGeneration;
    }

    public String templateRoot() {
        return templateRoot;
    }

    public List<BiomeTemplateId> biomePool() {
        return biomePool;
    }

    public List<BiomeTemplateId> baseBiomePool() {
        return biomePool.stream()
            .filter(id -> !id.isOverlay())
            .toList();
    }

    public List<BiomeTemplateId> overlayPool() {
        return biomePool.stream()
            .filter(BiomeTemplateId::isOverlay)
            .toList();
    }

    public static ShellType fromId(String id) {
        if (id == null) {
            throw new IllegalArgumentException("Shell id is required");
        }
        ShellType shellType = BY_ID.get(id.toLowerCase(Locale.ROOT));
        if (shellType == null) {
            throw new IllegalArgumentException("Unknown shell id: " + id);
        }
        return shellType;
    }
}
