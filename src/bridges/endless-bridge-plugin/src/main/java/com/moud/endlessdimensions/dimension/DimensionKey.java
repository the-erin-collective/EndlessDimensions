package com.moud.endlessdimensions.dimension;

import java.util.Objects;

public record DimensionKey(String id) {
    public DimensionKey {
        if (id == null || id.isBlank()) {
            throw new IllegalArgumentException("DimensionKey id is required");
        }
    }
}
