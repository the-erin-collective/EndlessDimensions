package com.moud.endlessdimensions.portal;

import com.moud.endlessdimensions.dimension.DimensionKey;

import java.util.Objects;

public record DestinationRef(DimensionKey dimension,
                             double x,
                             double y,
                             double z,
                             float yaw,
                             float pitch,
                             PortalKey portalKey) {
    public DestinationRef {
        Objects.requireNonNull(dimension, "dimension");
        if (portalKey != null && !portalKey.dimension().equals(dimension)) {
            throw new IllegalArgumentException("portalKey dimension does not match destination dimension");
        }
    }

    public DestinationRef(DimensionKey dimension,
                          double x,
                          double y,
                          double z,
                          float yaw,
                          float pitch) {
        this(dimension, x, y, z, yaw, pitch, null);
    }
}
