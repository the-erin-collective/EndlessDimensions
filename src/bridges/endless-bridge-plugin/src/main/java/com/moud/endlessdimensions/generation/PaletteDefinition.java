package com.moud.endlessdimensions.generation;

import java.util.Objects;

public record PaletteDefinition(String surfaceBlock,
                                String subsurfaceBlock,
                                String stoneBlock,
                                String liquidBlock) {
    public PaletteDefinition {
        Objects.requireNonNull(surfaceBlock, "surfaceBlock");
        Objects.requireNonNull(stoneBlock, "stoneBlock");
        if (subsurfaceBlock == null || subsurfaceBlock.isBlank()) {
            subsurfaceBlock = surfaceBlock;
        }
        if (liquidBlock != null && liquidBlock.isBlank()) {
            liquidBlock = null;
        }
    }
}
