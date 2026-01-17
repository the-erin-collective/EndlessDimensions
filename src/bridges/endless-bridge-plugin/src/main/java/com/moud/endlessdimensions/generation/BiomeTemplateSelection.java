package com.moud.endlessdimensions.generation;

import java.util.Objects;

public record BiomeTemplateSelection(BiomeTemplateId templateId,
                                     BiomeTemplateId overlayId,
                                     int paletteSlot,
                                     TreePaletteProfile treePalette) {
    public BiomeTemplateSelection {
        Objects.requireNonNull(templateId, "templateId");
        Objects.requireNonNull(treePalette, "treePalette");
        if (paletteSlot <= 0) {
            throw new IllegalArgumentException("paletteSlot must be >= 1");
        }
        if (templateId.isOverlay()) {
            throw new IllegalArgumentException("templateId must be a base biome, not an overlay: " + templateId);
        }
        if (overlayId != null && !overlayId.isOverlay()) {
            throw new IllegalArgumentException("overlayId must be an overlay biome: " + overlayId);
        }
        if (overlayId != null && overlayId == templateId) {
            throw new IllegalArgumentException("overlayId must be different from templateId");
        }
    }

    public boolean hasOverlay() {
        return overlayId != null;
    }
}
