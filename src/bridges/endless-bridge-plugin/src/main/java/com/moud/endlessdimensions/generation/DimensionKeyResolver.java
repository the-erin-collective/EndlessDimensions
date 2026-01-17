package com.moud.endlessdimensions.generation;

import java.util.Objects;

public class DimensionKeyResolver {
    private final CustomDimensionRegistry customRegistry;
    private final EasterEggCatalog easterEggCatalog;

    public DimensionKeyResolver(CustomDimensionRegistry customRegistry, EasterEggCatalog easterEggCatalog) {
        this.customRegistry = Objects.requireNonNull(customRegistry, "customRegistry");
        this.easterEggCatalog = Objects.requireNonNull(easterEggCatalog, "easterEggCatalog");
    }

    public ResolvedDimensionKey resolve(String bookText) {
        String normalized = HashEngine.normalizeEasterEggKey(bookText);
        String customDimensionId = customRegistry.resolve(normalized);
        if (customDimensionId != null) {
            long seed = HashEngine.getDimensionSeedLong(normalized);
            return new ResolvedDimensionKey(normalized, customDimensionId, seed, ResolvedDimensionType.CUSTOM);
        }

        if (easterEggCatalog.isEasterEgg(normalized)) {
            long seed = HashEngine.getDimensionSeedLong(normalized);
            String dimensionId = easterEggCatalog.dimensionIdFor(normalized);
            return new ResolvedDimensionKey(normalized, dimensionId, seed, ResolvedDimensionType.EASTER_EGG);
        }

        long seed = HashEngine.getDimensionSeedLong(bookText);
        String dimensionId = HashEngine.getDimensionId(seed);
        return new ResolvedDimensionKey(normalized, dimensionId, seed, ResolvedDimensionType.GENERATED);
    }
}
