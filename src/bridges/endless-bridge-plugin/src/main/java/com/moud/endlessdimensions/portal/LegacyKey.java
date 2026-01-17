package com.moud.endlessdimensions.portal;

import java.util.Objects;

public record LegacyKey(String dimension, int x, int z) {
    public LegacyKey {
        Objects.requireNonNull(dimension, "dimension");
    }
}
