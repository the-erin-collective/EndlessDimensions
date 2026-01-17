package com.moud.endlessdimensions.portal;

import java.util.Objects;

public record LegacyLink(String toDimension) {
    public LegacyLink {
        Objects.requireNonNull(toDimension, "toDimension");
    }
}
