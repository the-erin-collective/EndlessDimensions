package com.moud.endlessdimensions.generation;

import java.util.Objects;

public record ResolvedDimensionKey(String normalizedKey,
                                   String dimensionId,
                                   long seed,
                                   ResolvedDimensionType type) {
    public ResolvedDimensionKey {
        if (dimensionId == null || dimensionId.isBlank()) {
            throw new IllegalArgumentException("dimensionId is required");
        }
        Objects.requireNonNull(type, "type");
        normalizedKey = normalizedKey == null ? "" : normalizedKey;
    }
}
