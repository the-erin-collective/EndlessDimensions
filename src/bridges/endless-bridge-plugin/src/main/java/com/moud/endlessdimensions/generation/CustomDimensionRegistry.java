package com.moud.endlessdimensions.generation;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import org.slf4j.Logger;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.security.SecureRandom;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;

public class CustomDimensionRegistry {
    private static final int CURRENT_VERSION = 1;
    private static final Gson GSON = new GsonBuilder().setPrettyPrinting().create();
    private static final String KEY_PREFIX = "ED-";
    private static final char[] KEY_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".toCharArray();

    private final Path file;
    private final Logger logger;
    private final SecureRandom random = new SecureRandom();
    private final Map<String, String> entries = new LinkedHashMap<>();

    public CustomDimensionRegistry(Path dataDir, Logger logger) {
        Objects.requireNonNull(dataDir, "dataDir");
        this.logger = Objects.requireNonNull(logger, "logger");
        this.file = dataDir.resolve("custom-dimensions.json");
    }

    public void load() {
        entries.clear();
        if (!Files.exists(file)) {
            return;
        }
        try {
            String json = Files.readString(file, StandardCharsets.UTF_8);
            JsonElement element = JsonParser.parseString(json);
            if (!element.isJsonObject()) {
                logger.warn("[CustomDimensionRegistry] Invalid JSON structure in {}", file);
                return;
            }
            JsonObject root = element.getAsJsonObject();
            JsonObject stored = root.has("entries") && root.get("entries").isJsonObject()
                ? root.getAsJsonObject("entries")
                : new JsonObject();
            for (Map.Entry<String, JsonElement> entry : stored.entrySet()) {
                if (!entry.getValue().isJsonPrimitive()) {
                    continue;
                }
                entries.put(entry.getKey(), entry.getValue().getAsString());
            }
            logger.info("[CustomDimensionRegistry] Loaded {} custom keys", entries.size());
        } catch (Exception e) {
            logger.warn("[CustomDimensionRegistry] Failed to load custom dimensions", e);
        }
    }

    public void save() throws IOException {
        ensureDirectory();
        JsonObject root = new JsonObject();
        root.addProperty("version", CURRENT_VERSION);
        JsonObject stored = new JsonObject();
        for (Map.Entry<String, String> entry : entries.entrySet()) {
            stored.addProperty(entry.getKey(), entry.getValue());
        }
        root.add("entries", stored);

        Path temp = file.resolveSibling(file.getFileName() + ".tmp");
        Files.writeString(temp, GSON.toJson(root), StandardCharsets.UTF_8);
        try {
            Files.move(temp, file, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
        } catch (IOException e) {
            Files.move(temp, file, StandardCopyOption.REPLACE_EXISTING);
        }
    }

    public String resolve(String key) {
        return entries.get(normalizeKey(key));
    }

    public boolean contains(String key) {
        return entries.containsKey(normalizeKey(key));
    }

    public Map<String, String> snapshot() {
        return Collections.unmodifiableMap(entries);
    }

    public void register(String key, String dimensionId) throws IOException {
        Objects.requireNonNull(dimensionId, "dimensionId");
        entries.put(normalizeKey(key), dimensionId);
        save();
    }

    public String generateKey() {
        String key;
        do {
            key = KEY_PREFIX + randomKey(6);
        } while (entries.containsKey(normalizeKey(key)));
        return key;
    }

    public String dimensionIdFor(String key) {
        return "endlessdimensions:custom_" + sanitizeKey(key);
    }

    private String randomKey(int length) {
        StringBuilder builder = new StringBuilder(length);
        for (int i = 0; i < length; i++) {
            builder.append(KEY_CHARS[random.nextInt(KEY_CHARS.length)]);
        }
        return builder.toString();
    }

    private String normalizeKey(String key) {
        return HashEngine.normalizeEasterEggKey(key);
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
            return "custom";
        }
        return sanitized.toString();
    }

    private void ensureDirectory() throws IOException {
        Path dir = file.getParent();
        if (dir != null && !Files.exists(dir)) {
            Files.createDirectories(dir);
        }
    }
}
