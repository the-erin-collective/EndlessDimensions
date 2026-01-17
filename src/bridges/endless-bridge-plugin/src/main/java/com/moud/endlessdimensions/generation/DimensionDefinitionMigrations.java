package com.moud.endlessdimensions.generation;

import com.google.gson.JsonObject;

public final class DimensionDefinitionMigrations {
    public static final int CURRENT_VERSION = 2;

    private DimensionDefinitionMigrations() {
    }

    public static JsonObject migrate(JsonObject root) {
        int version = root.has("version") ? root.get("version").getAsInt() : CURRENT_VERSION;
        if (version > CURRENT_VERSION) {
            throw new IllegalArgumentException("Unsupported dimension definition version: " + version);
        }
        if (version == CURRENT_VERSION && root.has("version")) {
            return root;
        }
        JsonObject migrated = root.deepCopy();
        migrated.addProperty("version", CURRENT_VERSION);
        return migrated;
    }
}
