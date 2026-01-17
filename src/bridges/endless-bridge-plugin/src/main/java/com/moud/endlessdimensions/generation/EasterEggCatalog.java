package com.moud.endlessdimensions.generation;

import java.util.Locale;
import java.util.Set;

public final class EasterEggCatalog {
    private static final String DIMENSION_PREFIX = "endlessdimensions:easter_";
    private static final Set<String> KEYS = Set.of(
        "ant",
        "library",
        "credits",
        "cherry",
        "bones",
        "busy",
        "colors",
        "custom",
        "darkness",
        "decay",
        "desert",
        "end",
        "fleet",
        "garden",
        "hole",
        "island",
        "liquids",
        "lucky",
        "map",
        "message",
        "missing",
        "mushroom",
        "ocean",
        "origin",
        "pattern",
        "perfect",
        "pillar",
        "pizza",
        "prison",
        "quarry",
        "red",
        "rooms",
        "shapes",
        "sky",
        "slime",
        "snow",
        "source",
        "spiral",
        "sports",
        "stone",
        "suite",
        "temples",
        "tunnels",
        "wall",
        "water",
        "wind",
        "zoo"
    );

    public boolean isEasterEgg(String normalizedKey) {
        return KEYS.contains(normalizeKey(normalizedKey));
    }

    public String dimensionIdFor(String normalizedKey) {
        return DIMENSION_PREFIX + sanitizeKey(normalizedKey);
    }

    private String sanitizeKey(String key) {
        String normalized = normalizeKey(key);
        StringBuilder sanitized = new StringBuilder();
        for (int i = 0; i < normalized.length(); i++) {
            char c = normalized.charAt(i);
            if ((c >= 'a' && c <= 'z') || (c >= '0' && c <= '9') || c == '_') {
                sanitized.append(c);
            } else {
                sanitized.append('_');
            }
        }
        if (sanitized.length() == 0) {
            return "unknown";
        }
        return sanitized.toString();
    }

    private String normalizeKey(String key) {
        if (key == null) {
            return "";
        }
        return key.toLowerCase(Locale.ROOT).trim();
    }
}
