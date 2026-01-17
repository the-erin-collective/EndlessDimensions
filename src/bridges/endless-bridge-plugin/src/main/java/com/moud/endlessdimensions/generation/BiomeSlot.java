package com.moud.endlessdimensions.generation;

import java.util.Objects;

public record BiomeSlot(BiomeTemplateId templateId, BiomeTemplateId overlayId, int paletteSlot) {
    public BiomeSlot {
        Objects.requireNonNull(templateId, "templateId");
        if (templateId.isOverlay()) {
            throw new IllegalArgumentException("templateId must be a base biome, not an overlay: " + templateId);
        }
        if (overlayId != null && !overlayId.isOverlay()) {
            throw new IllegalArgumentException("overlayId must be an overlay biome: " + overlayId);
        }
        if (paletteSlot <= 0) {
            throw new IllegalArgumentException("paletteSlot must be >= 1");
        }
    }

    public BiomeTemplateSelection toSelection(TreePaletteProfile treePalette) {
        Objects.requireNonNull(treePalette, "treePalette");
        return new BiomeTemplateSelection(templateId, overlayId, paletteSlot, treePalette);
    }

    public BiomeTemplateSelection toSelectionWithDefaults() {
        return toSelection(TreePaletteDefaults.forBiome(templateId));
    }
}
