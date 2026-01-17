package com.moud.endlessdimensions;

import com.moud.endlessdimensions.generation.BiomeSlot;
import com.moud.endlessdimensions.generation.BiomeTemplateId;
import com.moud.endlessdimensions.generation.DimensionService;
import com.moud.endlessdimensions.generation.DimensionDefinitionService;
import com.moud.endlessdimensions.generation.PaletteDefinition;
import com.moud.endlessdimensions.generation.ShellType;
import net.minestom.server.instance.InstanceContainer;
import org.graalvm.polyglot.Value;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

public class EndlessFacade {
    public String createCustomDimension(String shellTypeId, Value biomes, Value palettes) {
        DimensionDefinitionService service = EndlessBridgePlugin.getDefinitionService();
        if (service == null) {
            throw new IllegalStateException("DimensionDefinitionService not initialized");
        }

        ShellType shellType = ShellType.fromId(shellTypeId);
        List<BiomeSlot> slots = parseBiomeSlots(biomes);
        Map<Integer, PaletteDefinition> paletteMap = parsePalettes(palettes);

        try {
            return service.registerCustomDefinition(shellType, slots, paletteMap);
        } catch (IOException e) {
            throw new IllegalStateException("Failed to register custom dimension", e);
        }
    }

    public CompletableFuture<InstanceContainer> createOrResolveInstance(String bookText,
                                                                        String shellTypeId,
                                                                        List<BiomeSlot> biomes,
                                                                        Map<Integer, PaletteDefinition> palettes) {
        DimensionService service = EndlessBridgePlugin.getDimensionService();
        if (service == null) {
            CompletableFuture<InstanceContainer> future = new CompletableFuture<>();
            future.completeExceptionally(new IllegalStateException("DimensionService not initialized"));
            return future;
        }

        ShellType shellType = ShellType.fromId(shellTypeId);
        return service.createOrResolveInstance(bookText, shellType, biomes, palettes);
    }

    public CompletableFuture<InstanceContainer> createOrResolveInstance(String bookText,
                                                                        ShellType shellType,
                                                                        List<BiomeSlot> biomes,
                                                                        Map<Integer, PaletteDefinition> palettes) {
        DimensionService service = EndlessBridgePlugin.getDimensionService();
        if (service == null) {
            CompletableFuture<InstanceContainer> future = new CompletableFuture<>();
            future.completeExceptionally(new IllegalStateException("DimensionService not initialized"));
            return future;
        }

        return service.createOrResolveInstance(bookText, shellType, biomes, palettes);
    }

    private List<BiomeSlot> parseBiomeSlots(Value value) {
        if (value == null || value.isNull()) {
            return List.of();
        }
        if (!value.hasArrayElements()) {
            throw new IllegalArgumentException("biomes must be an array");
        }
        List<BiomeSlot> slots = new ArrayList<>();
        long size = value.getArraySize();
        for (long i = 0; i < size; i++) {
            Value entry = value.getArrayElement(i);
            if (entry == null || entry.isNull()) {
                continue;
            }
            String templateId = requireString(entry, "templateId");
            String overlayId = optionalString(entry, "overlayId");
            int paletteSlot = requireInt(entry, "paletteSlot");

            BiomeTemplateId template = BiomeTemplateId.valueOf(templateId);
            BiomeTemplateId overlay = overlayId != null && !overlayId.isBlank()
                ? BiomeTemplateId.valueOf(overlayId)
                : null;
            slots.add(new BiomeSlot(template, overlay, paletteSlot));
        }
        return slots;
    }

    private Map<Integer, PaletteDefinition> parsePalettes(Value value) {
        if (value == null || value.isNull()) {
            return Map.of();
        }
        if (!value.hasMembers()) {
            throw new IllegalArgumentException("palettes must be an object");
        }
        Map<Integer, PaletteDefinition> palettes = new LinkedHashMap<>();
        for (String key : value.getMemberKeys()) {
            int slot;
            try {
                slot = Integer.parseInt(key);
            } catch (NumberFormatException e) {
                throw new IllegalArgumentException("Palette key must be an integer: " + key, e);
            }
            Value paletteValue = value.getMember(key);
            String surface = requireString(paletteValue, "surfaceBlock");
            String stone = requireString(paletteValue, "stoneBlock");
            String subsurface = optionalString(paletteValue, "subsurfaceBlock");
            String liquid = optionalString(paletteValue, "liquidBlock");
            if (subsurface == null || subsurface.isBlank()) {
                subsurface = surface;
            }
            palettes.put(slot, new PaletteDefinition(surface, subsurface, stone, liquid));
        }
        return palettes;
    }

    private String requireString(Value value, String member) {
        if (value == null || value.isNull() || !value.hasMember(member)) {
            throw new IllegalArgumentException("Missing required field: " + member);
        }
        Value field = value.getMember(member);
        if (field == null || field.isNull()) {
            throw new IllegalArgumentException("Missing required field: " + member);
        }
        return field.asString();
    }

    private String optionalString(Value value, String member) {
        if (value == null || value.isNull() || !value.hasMember(member)) {
            return null;
        }
        Value field = value.getMember(member);
        if (field == null || field.isNull()) {
            return null;
        }
        return field.asString();
    }

    private int requireInt(Value value, String member) {
        if (value == null || value.isNull() || !value.hasMember(member)) {
            throw new IllegalArgumentException("Missing required field: " + member);
        }
        Value field = value.getMember(member);
        if (field == null || field.isNull()) {
            throw new IllegalArgumentException("Missing required field: " + member);
        }
        return field.asInt();
    }
}
