package com.moud.endlessdimensions.generation;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

public final class DimensionDefinitionCodec {
    private static final Gson GSON = new GsonBuilder().setPrettyPrinting().create();

    private DimensionDefinitionCodec() {
    }

    public static String toJson(DimensionDefinition definition) {
        Objects.requireNonNull(definition, "definition");
        JsonObject root = new JsonObject();
        root.addProperty("version", DimensionDefinitionMigrations.CURRENT_VERSION);
        root.addProperty("dimensionId", definition.dimensionId());
        root.addProperty("seed", definition.seed());
        root.addProperty("shellType", definition.shellType().id());

        JsonArray biomes = new JsonArray();
        for (BiomeSlot slot : definition.biomes()) {
            JsonObject slotJson = new JsonObject();
            slotJson.addProperty("templateId", slot.templateId().name());
            if (slot.overlayId() != null) {
                slotJson.addProperty("overlayId", slot.overlayId().name());
            }
            slotJson.addProperty("paletteSlot", slot.paletteSlot());
            biomes.add(slotJson);
        }
        root.add("biomes", biomes);

        JsonObject palettes = new JsonObject();
        for (Map.Entry<Integer, PaletteDefinition> entry : definition.palettes().entrySet()) {
            PaletteDefinition palette = entry.getValue();
            JsonObject paletteJson = new JsonObject();
            paletteJson.addProperty("surfaceBlock", palette.surfaceBlock());
            paletteJson.addProperty("stoneBlock", palette.stoneBlock());
            if (palette.subsurfaceBlock() != null) {
                paletteJson.addProperty("subsurfaceBlock", palette.subsurfaceBlock());
            }
            if (palette.liquidBlock() != null) {
                paletteJson.addProperty("liquidBlock", palette.liquidBlock());
            }
            palettes.add(String.valueOf(entry.getKey()), paletteJson);
        }
        root.add("palettes", palettes);

        return GSON.toJson(root);
    }

    public static DimensionDefinition fromJson(String json) {
        Objects.requireNonNull(json, "json");
        JsonElement element = JsonParser.parseString(json);
        if (!element.isJsonObject()) {
            throw new IllegalArgumentException("Dimension definition JSON must be an object");
        }
        JsonObject root = DimensionDefinitionMigrations.migrate(element.getAsJsonObject());

        String dimensionId = requireString(root, "dimensionId");
        long seed = requireLong(root, "seed");
        ShellType shellType = ShellType.fromId(requireString(root, "shellType"));

        JsonArray biomeArray = requireArray(root, "biomes");
        List<BiomeSlot> biomes = new ArrayList<>();
        for (JsonElement biomeElement : biomeArray) {
            if (!biomeElement.isJsonObject()) {
                throw new IllegalArgumentException("Biome entry must be an object");
            }
            JsonObject biomeJson = biomeElement.getAsJsonObject();
            String templateId = requireString(biomeJson, "templateId");
            BiomeTemplateId template = BiomeTemplateId.valueOf(templateId);
            BiomeTemplateId overlay = null;
            if (biomeJson.has("overlayId") && !biomeJson.get("overlayId").isJsonNull()) {
                overlay = BiomeTemplateId.valueOf(biomeJson.get("overlayId").getAsString());
            }
            int paletteSlot = requireInt(biomeJson, "paletteSlot");
            biomes.add(new BiomeSlot(template, overlay, paletteSlot));
        }

        JsonObject paletteJson = requireObject(root, "palettes");
        Map<Integer, PaletteDefinition> palettes = new LinkedHashMap<>();
        for (Map.Entry<String, JsonElement> entry : paletteJson.entrySet()) {
            int slot;
            try {
                slot = Integer.parseInt(entry.getKey());
            } catch (NumberFormatException e) {
                throw new IllegalArgumentException("Palette key must be an integer: " + entry.getKey(), e);
            }
            JsonObject paletteObj = entry.getValue().getAsJsonObject();
            String surface = requireString(paletteObj, "surfaceBlock");
            String stone = requireString(paletteObj, "stoneBlock");
            String subsurface = paletteObj.has("subsurfaceBlock") && !paletteObj.get("subsurfaceBlock").isJsonNull()
                ? paletteObj.get("subsurfaceBlock").getAsString()
                : surface;
            String liquid = null;
            if (paletteObj.has("liquidBlock") && !paletteObj.get("liquidBlock").isJsonNull()) {
                liquid = paletteObj.get("liquidBlock").getAsString();
            } else if (paletteObj.has("oceanBlock") && !paletteObj.get("oceanBlock").isJsonNull()) {
                liquid = paletteObj.get("oceanBlock").getAsString();
            }
            palettes.put(slot, new PaletteDefinition(surface, subsurface, stone, liquid));
        }

        return new DimensionDefinition(dimensionId, seed, shellType, biomes, palettes);
    }

    private static String requireString(JsonObject obj, String key) {
        JsonElement element = obj.get(key);
        if (element == null || element.isJsonNull()) {
            throw new IllegalArgumentException("Missing required field: " + key);
        }
        return element.getAsString();
    }

    private static int requireInt(JsonObject obj, String key) {
        JsonElement element = obj.get(key);
        if (element == null || element.isJsonNull()) {
            throw new IllegalArgumentException("Missing required field: " + key);
        }
        return element.getAsInt();
    }

    private static long requireLong(JsonObject obj, String key) {
        JsonElement element = obj.get(key);
        if (element == null || element.isJsonNull()) {
            throw new IllegalArgumentException("Missing required field: " + key);
        }
        return element.getAsLong();
    }

    private static JsonArray requireArray(JsonObject obj, String key) {
        JsonElement element = obj.get(key);
        if (element == null || !element.isJsonArray()) {
            throw new IllegalArgumentException("Missing required array: " + key);
        }
        return element.getAsJsonArray();
    }

    private static JsonObject requireObject(JsonObject obj, String key) {
        JsonElement element = obj.get(key);
        if (element == null || !element.isJsonObject()) {
            throw new IllegalArgumentException("Missing required object: " + key);
        }
        return element.getAsJsonObject();
    }
}
