package com.moud.endlessdimensions.portal;

import com.moud.endlessdimensions.dimension.DimensionKey;

import java.util.Objects;

public record PortalKey(DimensionKey dimension, PortalAxis axis, Vec3i min, Vec3i max) {
    public PortalKey {
        Objects.requireNonNull(dimension, "dimension");
        Objects.requireNonNull(axis, "axis");
        Objects.requireNonNull(min, "min");
        Objects.requireNonNull(max, "max");
    }

    public static PortalKey normalize(DimensionKey dimension, PortalAxis axis, Vec3i a, Vec3i b) {
        int minX = Math.min(a.x(), b.x());
        int minY = Math.min(a.y(), b.y());
        int minZ = Math.min(a.z(), b.z());
        int maxX = Math.max(a.x(), b.x());
        int maxY = Math.max(a.y(), b.y());
        int maxZ = Math.max(a.z(), b.z());
        return new PortalKey(dimension, axis, new Vec3i(minX, minY, minZ), new Vec3i(maxX, maxY, maxZ));
    }

    public int legacyX() {
        return min.x();
    }

    public int legacyZ() {
        return min.z();
    }
}
