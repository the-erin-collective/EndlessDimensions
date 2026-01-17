package com.moud.endlessdimensions.generation;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.Random;

public final class BiomeSubsetPicker {
    private static final int DEFAULT_MIN = 1;
    private static final int DEFAULT_MAX = 4;

    private BiomeSubsetPicker() {
    }

    public static List<BiomeTemplateId> pickSubset(ShellType shell, long seed) {
        return pickSubset(shell, seed, DEFAULT_MIN, DEFAULT_MAX);
    }

    public static List<BiomeTemplateId> pickSubset(ShellType shell, long seed, int minBiomes, int maxBiomes) {
        Objects.requireNonNull(shell, "shell");
        if (minBiomes <= 0) {
            throw new IllegalArgumentException("minBiomes must be >= 1");
        }
        if (maxBiomes < minBiomes) {
            throw new IllegalArgumentException("maxBiomes must be >= minBiomes");
        }

        List<BiomeTemplateId> pool = new ArrayList<>(shell.biomePool());
        if (pool.isEmpty()) {
            throw new IllegalArgumentException("Shell biome pool is empty: " + shell.id());
        }

        int cappedMax = Math.min(maxBiomes, pool.size());
        int countRange = cappedMax - minBiomes + 1;
        int count = countRange > 0
            ? minBiomes + new Random(seed).nextInt(countRange)
            : minBiomes;

        Collections.shuffle(pool, new Random(seed ^ 0x9E3779B97F4A7C15L));
        return List.copyOf(pool.subList(0, Math.min(count, pool.size())));
    }
}
