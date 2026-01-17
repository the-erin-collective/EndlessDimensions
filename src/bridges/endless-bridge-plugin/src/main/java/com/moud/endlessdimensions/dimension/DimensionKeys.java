package com.moud.endlessdimensions.dimension;

import net.minestom.server.instance.Instance;
import net.minestom.server.tag.Tag;

import java.util.Objects;

public final class DimensionKeys {
    public static final String OVERWORLD = "minecraft:overworld";
    public static final String NETHER = "minecraft:the_nether";
    public static final String END = "minecraft:the_end";
    public static final String CUSTOM_PREFIX = "endlessdimensions:";
    public static final Tag<String> DIMENSION_ID_TAG = Tag.String("endless:dimension_id");

    private DimensionKeys() {
    }

    public static DimensionKey fromInstance(Instance instance) {
        Objects.requireNonNull(instance, "instance");
        String customId = instance.getTag(DIMENSION_ID_TAG);
        if (customId != null && !customId.isBlank()) {
            return new DimensionKey(customId);
        }
        return new DimensionKey(instance.getDimensionType().name());
    }

    public static boolean isCustom(DimensionKey key) {
        Objects.requireNonNull(key, "key");
        return key.id().startsWith(CUSTOM_PREFIX);
    }
}
