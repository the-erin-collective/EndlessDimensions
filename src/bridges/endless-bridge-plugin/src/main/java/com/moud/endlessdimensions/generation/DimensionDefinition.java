package com.moud.endlessdimensions.generation;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

public record DimensionDefinition(String dimensionId,
                                  long seed,
                                  ShellType shellType,
                                  List<BiomeSlot> biomes,
                                  Map<Integer, PaletteDefinition> palettes) {
    public DimensionDefinition {
        if (dimensionId == null || dimensionId.isBlank()) {
            throw new IllegalArgumentException("dimensionId is required");
        }
        Objects.requireNonNull(shellType, "shellType");
        Objects.requireNonNull(biomes, "biomes");
        Objects.requireNonNull(palettes, "palettes");

        biomes = List.copyOf(biomes);
        palettes = Map.copyOf(palettes);

        if (biomes.isEmpty()) {
            throw new IllegalArgumentException("biomes must not be empty");
        }
        Set<Integer> slots = new HashSet<>();
        for (BiomeSlot slot : biomes) {
            Objects.requireNonNull(slot, "biome slot");
            if (!slots.add(slot.paletteSlot())) {
                throw new IllegalArgumentException("Duplicate palette slot " + slot.paletteSlot());
            }
            if (!palettes.containsKey(slot.paletteSlot())) {
                throw new IllegalArgumentException("Missing palette definition for slot " + slot.paletteSlot());
            }
        }
    }

    public List<BiomeTemplateSelection> toSelectionsWithDefaults() {
        List<BiomeTemplateSelection> selections = new ArrayList<>(biomes.size());
        for (BiomeSlot slot : biomes) {
            selections.add(slot.toSelectionWithDefaults());
        }
        return selections;
    }
}
