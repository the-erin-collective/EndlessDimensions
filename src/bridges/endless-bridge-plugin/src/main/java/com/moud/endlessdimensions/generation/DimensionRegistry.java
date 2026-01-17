package com.moud.endlessdimensions.generation;

import org.slf4j.Logger;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.DirectoryStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Collection;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;

public class DimensionRegistry {
    private final Path dimensionsDir;
    private final Logger logger;
    private final Map<String, DimensionDefinition> definitions = new LinkedHashMap<>();

    public DimensionRegistry(Path dataDir, Logger logger) {
        Objects.requireNonNull(dataDir, "dataDir");
        this.logger = Objects.requireNonNull(logger, "logger");
        this.dimensionsDir = dataDir.resolve("dimensions");
    }

    public void loadAll() throws IOException {
        ensureDirectory();
        definitions.clear();
        try (DirectoryStream<Path> stream = Files.newDirectoryStream(dimensionsDir, "*.json")) {
            for (Path file : stream) {
                try {
                    String json = Files.readString(file, StandardCharsets.UTF_8);
                    DimensionDefinition definition = DimensionDefinitionCodec.fromJson(json);
                    definitions.put(definition.dimensionId(), definition);
                } catch (Exception e) {
                    logger.warn("[DimensionRegistry] Failed to load {}", file, e);
                }
            }
        }
        logger.info("[DimensionRegistry] Loaded {} dimension definitions", definitions.size());
    }

    public void save(DimensionDefinition definition) throws IOException {
        Objects.requireNonNull(definition, "definition");
        ensureDirectory();
        Path target = dimensionsDir.resolve(fileNameFor(definition.dimensionId()));
        Path temp = dimensionsDir.resolve(target.getFileName() + ".tmp");
        String json = DimensionDefinitionCodec.toJson(definition);
        Files.writeString(temp, json, StandardCharsets.UTF_8);
        try {
            Files.move(temp, target, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
        } catch (IOException e) {
            Files.move(temp, target, StandardCopyOption.REPLACE_EXISTING);
        }
    }

    public void register(DimensionDefinition definition) throws IOException {
        Objects.requireNonNull(definition, "definition");
        definitions.put(definition.dimensionId(), definition);
        save(definition);
    }

    public DimensionDefinition get(String dimensionId) {
        return definitions.get(dimensionId);
    }

    public boolean has(String dimensionId) {
        return definitions.containsKey(dimensionId);
    }

    public Collection<DimensionDefinition> getAll() {
        return Collections.unmodifiableCollection(definitions.values());
    }

    public void remove(String dimensionId) throws IOException {
        definitions.remove(dimensionId);
        Path target = dimensionsDir.resolve(fileNameFor(dimensionId));
        Files.deleteIfExists(target);
    }

    private void ensureDirectory() throws IOException {
        if (!Files.exists(dimensionsDir)) {
            Files.createDirectories(dimensionsDir);
        }
    }

    private String fileNameFor(String dimensionId) {
        return dimensionId.replace(":", "_") + ".json";
    }
}
