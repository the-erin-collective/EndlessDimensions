package com.moud.endlessdimensions.generation;

import java.util.List;
import java.util.Objects;
import java.util.Random;

public final class BiomeTemplatePicker {
    private BiomeTemplatePicker() {
    }

    public static BiomeTemplateSelection resolveSelection(ShellType shell,
                                                          BiomeTemplateId chosen,
                                                          Random random,
                                                          int paletteSlot) {
        Objects.requireNonNull(shell, "shell");
        Objects.requireNonNull(chosen, "chosen");
        Objects.requireNonNull(random, "random");

        BiomeTemplateId base = chosen;
        BiomeTemplateId overlay = null;
        if (chosen.isOverlay()) {
            List<BiomeTemplateId> basePool = shell.baseBiomePool();
            if (basePool.isEmpty()) {
                throw new IllegalStateException("Shell has no base biomes: " + shell.id());
            }
            base = basePool.get(random.nextInt(basePool.size()));
            overlay = chosen;
        }

        TreePaletteProfile treePalette = TreePaletteDefaults.forBiome(base);
        return new BiomeTemplateSelection(base, overlay, paletteSlot, treePalette);
    }
}
