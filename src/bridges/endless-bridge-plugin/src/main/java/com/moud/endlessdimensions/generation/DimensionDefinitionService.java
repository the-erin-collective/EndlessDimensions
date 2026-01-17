package com.moud.endlessdimensions.generation;

import org.slf4j.Logger;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.Objects;

public class DimensionDefinitionService {
    private final DimensionRegistry registry;
    private final CustomDimensionRegistry customRegistry;
    private final DimensionKeyResolver keyResolver;
    private final Logger logger;

    public DimensionDefinitionService(DimensionRegistry registry,
                                      CustomDimensionRegistry customRegistry,
                                      DimensionKeyResolver keyResolver,
                                      Logger logger) {
        this.registry = Objects.requireNonNull(registry, "registry");
        this.customRegistry = Objects.requireNonNull(customRegistry, "customRegistry");
        this.keyResolver = Objects.requireNonNull(keyResolver, "keyResolver");
        this.logger = Objects.requireNonNull(logger, "logger");
    }

    public DimensionDefinition resolveOrCreate(String bookText,
                                               ShellType shellType,
                                               List<BiomeSlot> biomes,
                                               Map<Integer, PaletteDefinition> palettes) throws IOException {
        ResolvedDimensionKey resolved = resolveKey(bookText);
        return resolveForResolvedKey(resolved, shellType, biomes, palettes);
    }

    public DimensionDefinition register(DimensionDefinition definition) throws IOException {
        Objects.requireNonNull(definition, "definition");
        registry.register(definition);
        logger.info("[DimensionDefinitionService] Registered dimension definition {}", definition.dimensionId());
        return definition;
    }

    public ResolvedDimensionKey resolveKey(String bookText) {
        Objects.requireNonNull(bookText, "bookText");
        return keyResolver.resolve(bookText);
    }

    public DimensionDefinition resolveForResolvedKey(ResolvedDimensionKey resolved,
                                                     ShellType shellType,
                                                     List<BiomeSlot> biomes,
                                                     Map<Integer, PaletteDefinition> palettes) throws IOException {
        Objects.requireNonNull(resolved, "resolved");
        Objects.requireNonNull(shellType, "shellType");
        Objects.requireNonNull(biomes, "biomes");
        Objects.requireNonNull(palettes, "palettes");

        DimensionDefinition existing = registry.get(resolved.dimensionId());
        if (existing != null) {
            return existing;
        }

        DimensionDefinition definition = new DimensionDefinition(
            resolved.dimensionId(),
            resolved.seed(),
            shellType,
            biomes,
            palettes
        );
        registry.register(definition);

        if (resolved.type() == ResolvedDimensionType.CUSTOM) {
            logger.warn("[DimensionDefinitionService] Custom key {} missing definition; rebuilt {}",
                resolved.normalizedKey(), resolved.dimensionId());
        } else {
            logger.info("[DimensionDefinitionService] Registered {} dimension definition {}",
                resolved.type(), resolved.dimensionId());
        }
        return definition;
    }

    public String registerCustomDefinition(ShellType shellType,
                                           List<BiomeSlot> biomes,
                                           Map<Integer, PaletteDefinition> palettes) throws IOException {
        Objects.requireNonNull(shellType, "shellType");
        Objects.requireNonNull(biomes, "biomes");
        Objects.requireNonNull(palettes, "palettes");

        String key = customRegistry.generateKey();
        String normalizedKey = HashEngine.normalizeEasterEggKey(key);
        String dimensionId = customRegistry.dimensionIdFor(normalizedKey);
        long seed = HashEngine.getDimensionSeedLong(normalizedKey);

        DimensionDefinition definition = new DimensionDefinition(dimensionId, seed, shellType, biomes, palettes);
        registry.register(definition);
        customRegistry.register(normalizedKey, dimensionId);

        logger.info("[DimensionDefinitionService] Registered custom dimension {} (key={})", dimensionId, key);
        return key;
    }

    public DimensionDefinition get(String dimensionId) {
        return registry.get(dimensionId);
    }
}
