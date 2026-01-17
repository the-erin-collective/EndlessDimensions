package com.moud.endlessdimensions.generation;

import java.util.Locale;

public final class HashEngine {
    private static final String SALT = " :why_so_salty#LazyCrypto ";

    private HashEngine() {
    }

    public static int getDimensionSeed(String text) {
        byte[] hash = simpleHash(text + SALT);
        int seed = (hash[0] & 0xFF)
            | ((hash[1] & 0xFF) << 8)
            | ((hash[2] & 0xFF) << 16)
            | ((hash[3] & 0xFF) << 24);
        long unsignedSeed = seed & 0xFFFFFFFFL;
        return (int) (unsignedSeed & 0x7FFFFFFF);
    }

    public static long getDimensionSeedLong(String text) {
        byte[] hash = simpleHash(text + SALT);
        long result = 0L;
        for (int i = 0; i < 8; i++) {
            result = (result << 8) | (hash[i] & 0xFF);
        }
        return result & Long.MAX_VALUE;
    }

    public static String getDimensionId(long seed) {
        return "endlessdimensions:generated_" + seed;
    }

    public static String normalizeEasterEggKey(String text) {
        if (text == null) {
            return "";
        }
        return text.toLowerCase(Locale.ROOT).trim();
    }

    private static byte[] simpleHash(String input) {
        int hash1 = 5381;
        int hash2 = 52711;
        for (int i = 0; i < input.length(); i++) {
            int ch = input.charAt(i);
            hash1 = ((hash1 << 5) + hash1) ^ ch;
            hash2 = ((hash2 << 5) + hash2) ^ ch;
        }

        long combined = ((hash1 & 0xFFFFFFFFL) << 12) + (hash2 & 0xFFFFFFFFL);
        int combinedInt = (int) combined;
        byte[] result = new byte[32];
        for (int i = 0; i < result.length; i++) {
            int shift = (i * 8) & 31;
            result[i] = (byte) ((combinedInt >> shift) & 0xFF);
        }
        return result;
    }
}
