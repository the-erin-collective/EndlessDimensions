package com.moud.endlessdimensions.generation;

import java.util.List;
import java.util.Objects;

public record FillingSet(String id, List<String> biomeTemplateIds, DistributionType distribution) {
    public FillingSet {
        if (id == null || id.isBlank()) {
            throw new IllegalArgumentException("Filling set id is required");
        }
        Objects.requireNonNull(biomeTemplateIds, "biomeTemplateIds");
        if (biomeTemplateIds.isEmpty()) {
            throw new IllegalArgumentException("biomeTemplateIds must not be empty");
        }
        biomeTemplateIds = List.copyOf(biomeTemplateIds);
        Objects.requireNonNull(distribution, "distribution");
    }
}
