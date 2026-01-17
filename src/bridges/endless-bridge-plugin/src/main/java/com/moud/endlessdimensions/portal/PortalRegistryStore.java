package com.moud.endlessdimensions.portal;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.moud.endlessdimensions.dimension.DimensionKey;
import org.slf4j.Logger;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

public final class PortalRegistryStore {
    private static final int CURRENT_VERSION = 2;

    private final Path file;
    private final Logger logger;
    private final Gson gson = new GsonBuilder().setPrettyPrinting().create();

    public PortalRegistryStore(Path file, Logger logger) {
        this.file = Objects.requireNonNull(file, "file");
        this.logger = Objects.requireNonNull(logger, "logger");
    }

    public PortalRegistrySnapshot load() {
        Map<PortalKey, PortalLink> links = new LinkedHashMap<>();
        Map<LegacyKey, LegacyLink> legacyLinks = new LinkedHashMap<>();

        Path source = file;
        if (!Files.exists(source)) {
            Path legacyPath = file.getParent().resolve("plugin-data").resolve(file.getFileName());
            if (Files.exists(legacyPath)) {
                source = legacyPath;
                logger.info("[PortalRegistryStore] Loading legacy bindings from {}", legacyPath);
            } else {
                return new PortalRegistrySnapshot(links, legacyLinks);
            }
        }

        try {
            String json = Files.readString(source, StandardCharsets.UTF_8);
            JsonObject root = gson.fromJson(json, JsonObject.class);
            if (root == null) {
                return new PortalRegistrySnapshot(links, legacyLinks);
            }

            int version = root.has("version") ? root.get("version").getAsInt() : 1;
            JsonArray bindings = root.getAsJsonArray("bindings");
            if (bindings != null) {
                for (JsonElement element : bindings) {
                    if (!element.isJsonObject()) {
                        continue;
                    }
                    JsonObject binding = element.getAsJsonObject();
                    if (version >= 2 && binding.has("from") && binding.getAsJsonObject("from").has("axis")) {
                        PortalKey key = parsePortalKey(binding.getAsJsonObject("from"));
                        PortalLink link = parsePortalLink(binding);
                        if (key != null && link != null) {
                            links.put(key, link);
                        }
                    } else {
                        parseLegacyBinding(binding, legacyLinks);
                    }
                }
            }

            JsonArray legacy = root.getAsJsonArray("legacy");
            if (legacy != null) {
                for (JsonElement element : legacy) {
                    if (!element.isJsonObject()) {
                        continue;
                    }
                    parseLegacyBinding(element.getAsJsonObject(), legacyLinks);
                }
            }
        } catch (Exception e) {
            logger.warn("[PortalRegistryStore] Failed to load {}", file, e);
        }

        return new PortalRegistrySnapshot(links, legacyLinks);
    }

    public void save(Map<PortalKey, PortalLink> links, Map<LegacyKey, LegacyLink> legacyLinks) {
        try {
            Files.createDirectories(file.getParent());

            JsonObject root = new JsonObject();
            root.addProperty("version", CURRENT_VERSION);
            JsonArray bindings = new JsonArray();
            for (Map.Entry<PortalKey, PortalLink> entry : links.entrySet()) {
                bindings.add(serializeBinding(entry.getKey(), entry.getValue()));
            }
            root.add("bindings", bindings);

            if (!legacyLinks.isEmpty()) {
                JsonArray legacy = new JsonArray();
                for (Map.Entry<LegacyKey, LegacyLink> entry : legacyLinks.entrySet()) {
                    legacy.add(serializeLegacyBinding(entry.getKey(), entry.getValue()));
                }
                root.add("legacy", legacy);
            }

            Path temp = file.resolveSibling(file.getFileName() + ".tmp");
            Files.writeString(temp, gson.toJson(root), StandardCharsets.UTF_8);
            try {
                Files.move(temp, file, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
            } catch (Exception e) {
                Files.move(temp, file, StandardCopyOption.REPLACE_EXISTING);
            }
        } catch (Exception e) {
            logger.warn("[PortalRegistryStore] Failed to save {}", file, e);
        }
    }

    private PortalKey parsePortalKey(JsonObject from) {
        return parsePortalKey(from, null);
    }

    private PortalKey parsePortalKey(JsonObject from, DimensionKey fallbackDimension) {
        String dimension = getString(from, "dimension");
        DimensionKey dimensionKey = dimension != null ? new DimensionKey(dimension) : fallbackDimension;
        String axis = getString(from, "axis");
        JsonObject min = from.getAsJsonObject("min");
        JsonObject max = from.getAsJsonObject("max");
        if (dimensionKey == null || axis == null || min == null || max == null) {
            return null;
        }
        PortalAxis portalAxis;
        try {
            portalAxis = PortalAxis.valueOf(axis);
        } catch (IllegalArgumentException e) {
            return null;
        }
        Vec3i minVec = new Vec3i(getInt(min, "x"), getInt(min, "y"), getInt(min, "z"));
        Vec3i maxVec = new Vec3i(getInt(max, "x"), getInt(max, "y"), getInt(max, "z"));
        return PortalKey.normalize(dimensionKey, portalAxis, minVec, maxVec);
    }

    private PortalLink parsePortalLink(JsonObject binding) {
        String type = getString(binding, "type");
        String linkId = getString(binding, "linkId");
        JsonObject to = binding.getAsJsonObject("to");
        if (type == null || linkId == null || to == null) {
            return null;
        }
        LinkType linkType;
        try {
            linkType = LinkType.valueOf(type);
        } catch (IllegalArgumentException e) {
            return null;
        }
        String destDimension = getString(to, "dimension");
        if (destDimension == null) {
            return null;
        }
        double x = getDouble(to, "x");
        double y = getDouble(to, "y");
        double z = getDouble(to, "z");
        float yaw = (float) getDouble(to, "yaw");
        float pitch = (float) getDouble(to, "pitch");
        DimensionKey dimensionKey = new DimensionKey(destDimension);
        PortalKey portalKey = null;
        JsonObject portal = to.getAsJsonObject("portal");
        if (portal != null) {
            portalKey = parsePortalKey(portal, dimensionKey);
        }
        DestinationRef destination = new DestinationRef(dimensionKey, x, y, z, yaw, pitch, portalKey);
        return new PortalLink(linkType, UUID.fromString(linkId), destination);
    }

    private void parseLegacyBinding(JsonObject binding, Map<LegacyKey, LegacyLink> legacyLinks) {
        if (binding.has("from")) {
            JsonObject from = binding.getAsJsonObject("from");
            String dimension = getString(from, "dimension");
            Integer x = getIntObj(from, "x");
            Integer z = getIntObj(from, "z");
            String toDimension = getString(binding, "toDimension");
            if (dimension != null && x != null && z != null && toDimension != null) {
                legacyLinks.put(new LegacyKey(dimension, x, z), new LegacyLink(toDimension));
            }
            return;
        }

        String dimensionKey = getString(binding, "dimensionKey");
        Integer x = getIntObj(binding, "blockX");
        Integer z = getIntObj(binding, "blockZ");
        String dimensionId = getString(binding, "dimensionId");
        if (dimensionKey != null && x != null && z != null && dimensionId != null) {
            legacyLinks.put(new LegacyKey(dimensionKey, x, z), new LegacyLink(dimensionId));
        }
    }

    private JsonObject serializeBinding(PortalKey key, PortalLink link) {
        JsonObject binding = new JsonObject();
        binding.add("from", serializePortalKey(key));
        binding.addProperty("type", link.type().name());
        binding.addProperty("linkId", link.linkId().toString());

        DestinationRef destination = link.destination();
        JsonObject to = new JsonObject();
        to.addProperty("dimension", destination.dimension().id());
        to.addProperty("x", destination.x());
        to.addProperty("y", destination.y());
        to.addProperty("z", destination.z());
        to.addProperty("yaw", destination.yaw());
        to.addProperty("pitch", destination.pitch());
        PortalKey destinationPortal = destination.portalKey();
        if (destinationPortal != null) {
            to.add("portal", serializePortalKey(destinationPortal));
        }
        binding.add("to", to);
        return binding;
    }

    private JsonObject serializePortalKey(PortalKey key) {
        JsonObject from = new JsonObject();
        from.addProperty("dimension", key.dimension().id());
        from.addProperty("axis", key.axis().name());
        from.add("min", serializeVec(key.min()));
        from.add("max", serializeVec(key.max()));
        return from;
    }

    private JsonObject serializeLegacyBinding(LegacyKey key, LegacyLink link) {
        JsonObject binding = new JsonObject();
        JsonObject from = new JsonObject();
        from.addProperty("dimension", key.dimension());
        from.addProperty("x", key.x());
        from.addProperty("z", key.z());
        binding.add("from", from);
        binding.addProperty("toDimension", link.toDimension());
        return binding;
    }

    private JsonObject serializeVec(Vec3i vec) {
        JsonObject obj = new JsonObject();
        obj.addProperty("x", vec.x());
        obj.addProperty("y", vec.y());
        obj.addProperty("z", vec.z());
        return obj;
    }

    private String getString(JsonObject obj, String key) {
        JsonElement element = obj.get(key);
        if (element == null || element.isJsonNull()) {
            return null;
        }
        return element.getAsString();
    }

    private int getInt(JsonObject obj, String key) {
        JsonElement element = obj.get(key);
        if (element == null || element.isJsonNull()) {
            return 0;
        }
        return element.getAsInt();
    }

    private Integer getIntObj(JsonObject obj, String key) {
        JsonElement element = obj.get(key);
        if (element == null || element.isJsonNull()) {
            return null;
        }
        return element.getAsInt();
    }

    private double getDouble(JsonObject obj, String key) {
        JsonElement element = obj.get(key);
        if (element == null || element.isJsonNull()) {
            return 0;
        }
        return element.getAsDouble();
    }
}
