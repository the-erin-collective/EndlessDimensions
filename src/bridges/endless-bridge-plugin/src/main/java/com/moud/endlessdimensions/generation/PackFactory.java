package com.moud.endlessdimensions.generation;

import com.dfsek.terra.api.config.ConfigPack;
import com.dfsek.terra.config.pack.ConfigPackImpl;
import com.dfsek.terra.minestom.MinestomPlatform;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.Deque;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class PackFactory {
    private final Path templatesRoot;
    private final Path packsRoot;

    public PackFactory(Path templatesRoot, Path packsRoot) {
        this.templatesRoot = Objects.requireNonNull(templatesRoot, "templatesRoot");
        this.packsRoot = Objects.requireNonNull(packsRoot, "packsRoot");
    }

    public Path createPack(DimensionDefinition definition) throws IOException {
        Objects.requireNonNull(definition, "definition");
        String packId = packIdForDimension(definition.dimensionId());
        return createPack(packId, definition.shellType(), definition.toSelectionsWithDefaults(), definition.palettes());
    }

    public Path createPack(String packId,
                           ShellType shellType,
                           List<BiomeTemplateSelection> biomes,
                           Map<Integer, PaletteDefinition> palettes)
        throws IOException {
        Objects.requireNonNull(packId, "packId");
        Objects.requireNonNull(shellType, "shellType");
        Objects.requireNonNull(biomes, "biomes");
        Objects.requireNonNull(palettes, "palettes");

        String safePackId = sanitizePackId(packId);
        Path packDir = packsRoot.resolve(safePackId);
        if (Files.exists(packDir)) {
            return packDir;
        }

        copyTemplates(packDir);
        updatePackConfig(packDir, safePackId, shellType);
        applyShellOverrides(packDir, shellType);
        writePaletteFiles(packDir.resolve("palettes"), palettes);
        applyBiomeOverrides(packDir, biomes);
        applyFeatureParameterOverrides(packDir);
        applyTreePalettes(packDir, biomes, palettes);
        applySurfaceBlockOverrides(packDir, palettes);

        return packDir;
    }

    private void updatePackConfig(Path packDir, String packId, ShellType shellType) throws IOException {
        Path packFile = packDir.resolve("pack.yml");
        if (!Files.exists(packFile)) {
            throw new IOException("Missing pack.yml in " + packDir);
        }

        String content = Files.readString(packFile, StandardCharsets.UTF_8);
        String lineSeparator = content.contains("\r\n") ? "\r\n" : "\n";
        String[] lines = content.split("\\R", -1);
        boolean replacedId = false;
        boolean replacedBiomes = false;
        boolean replacedVanilla = false;
        boolean replacedVanillaGeneration = false;
        String biomeLine = "biomes: $" + shellType.templateRoot() + "/biomes.yml:biomes";
        String vanillaLine = "vanilla: " + shellType.vanillaDimension();
        String vanillaGenerationLine = "vanilla-generation: " + shellType.vanillaGeneration();

        for (int i = 0; i < lines.length; i++) {
            String trimmed = lines[i].trim();
            if (!replacedId && trimmed.startsWith("id:")) {
                lines[i] = "id: " + packId;
                replacedId = true;
            } else if (!replacedBiomes && trimmed.startsWith("biomes:")) {
                lines[i] = biomeLine;
                replacedBiomes = true;
            } else if (!replacedVanilla && trimmed.startsWith("vanilla:")) {
                lines[i] = vanillaLine;
                replacedVanilla = true;
            } else if (!replacedVanillaGeneration && trimmed.startsWith("vanilla-generation:")) {
                lines[i] = vanillaGenerationLine;
                replacedVanillaGeneration = true;
            }
        }

        List<String> output = new ArrayList<>(Arrays.asList(lines));
        if (!replacedVanilla) {
            output.add(vanillaLine);
        }
        if (!replacedVanillaGeneration) {
            output.add(vanillaGenerationLine);
        }
        if (!replacedBiomes) {
            output.add(biomeLine);
        }

        Files.writeString(packFile, String.join(lineSeparator, output), StandardCharsets.UTF_8);
    }

    private String sanitizePackId(String packId) {
        return packId.replace(':', '_');
    }

    private String packIdForDimension(String dimensionId) {
        return sanitizePackId(dimensionId);
    }

    public ConfigPack buildPack(DimensionDefinition definition) throws IOException {
        Path packDir = createPack(definition);
        return loadPack(packDir);
    }

    public ConfigPack loadPack(Path packDir) throws IOException {
        try {
            return new ConfigPackImpl(packDir.toFile(), MinestomPlatform.getInstance());
        } catch (Exception e) {
            throw new IOException("Failed to load ConfigPack from " + packDir, e);
        }
    }

    private void copyTemplates(Path packDir) throws IOException {
        if (!Files.exists(packDir)) {
            Files.createDirectories(packDir);
        }
        try (var walk = Files.walk(templatesRoot)) {
            walk.forEach(source -> {
                try {
                    Path relative = templatesRoot.relativize(source);
                    Path target = packDir.resolve(relative);
                    if (Files.isDirectory(source)) {
                        Files.createDirectories(target);
                    } else {
                        Files.copy(source, target, StandardCopyOption.REPLACE_EXISTING);
                    }
                } catch (IOException e) {
                    throw new RuntimeException("Failed to copy template " + source, e);
                }
            });
        }
    }

    private void applyShellOverrides(Path packDir, ShellType shellType) throws IOException {
        Path shellRoot = packDir.resolve(shellType.templateRoot());
        if (!Files.exists(shellRoot)) {
            return;
        }
        copyShellFile(shellRoot, packDir, "meta.yml");
        copyShellFile(shellRoot, packDir, "options.yml");
    }

    private void copyShellFile(Path shellRoot, Path packDir, String fileName) throws IOException {
        Path source = shellRoot.resolve(fileName);
        if (!Files.exists(source)) {
            return;
        }
        Files.copy(source, packDir.resolve(fileName), StandardCopyOption.REPLACE_EXISTING);
    }

    private void writePaletteFiles(Path palettesDir, Map<Integer, PaletteDefinition> palettes) throws IOException {
        if (!Files.exists(palettesDir)) {
            Files.createDirectories(palettesDir);
        }
        for (Map.Entry<Integer, PaletteDefinition> entry : palettes.entrySet()) {
            int slot = entry.getKey();
            PaletteDefinition palette = entry.getValue();
            writePalette(palettesDir.resolve("DIM_PAL_" + slot + ".yml"),
                "DIM_PAL_" + slot,
                palette.surfaceBlock());
            writePalette(palettesDir.resolve("DIM_PAL_" + slot + "_SUBSURFACE.yml"),
                "DIM_PAL_" + slot + "_SUBSURFACE",
                palette.subsurfaceBlock());
            writePalette(palettesDir.resolve("DIM_PAL_" + slot + "_STONE.yml"),
                "DIM_PAL_" + slot + "_STONE",
                palette.stoneBlock());
            if (palette.liquidBlock() != null && !palette.liquidBlock().isBlank()) {
                writePalette(palettesDir.resolve("DIM_OCEAN_" + slot + ".yml"),
                    "DIM_OCEAN_" + slot,
                    palette.liquidBlock());
            }
        }
    }

    private void writePalette(Path file, String id, String block) throws IOException {
        String content = String.join("\n",
            "id: " + id,
            "type: PALETTE",
            "",
            "layers:",
            "  - materials:",
            "      - " + block + ": 1",
            "    layers: 1",
            ""
        );
        Files.writeString(file, content, StandardCharsets.UTF_8);
    }

    private void applyBiomeOverrides(Path packDir, List<BiomeTemplateSelection> biomes) throws IOException {
        Path biomesDir = packDir.resolve("biomes");
        Path overlaysDir = packDir.resolve("biome_overlays");
        for (BiomeTemplateSelection selection : biomes) {
            String biomeId = BiomeTemplateRegistry.terraBiomeId(selection.templateId());
            Path biomePath = biomesDir.resolve(biomeId + ".yml");
            if (!Files.exists(biomePath)) {
                throw new IOException("Missing biome template: " + biomePath);
            }

            String template = Files.readString(biomePath, StandardCharsets.UTF_8);
            if (selection.overlayId() != null) {
                String overlayId = BiomeTemplateRegistry.terraOverlayId(selection.overlayId());
                Path overlayPath = overlaysDir.resolve(overlayId + ".yml");
                if (!Files.exists(overlayPath)) {
                    throw new IOException("Missing biome overlay: " + overlayPath);
                }
                String overlay = Files.readString(overlayPath, StandardCharsets.UTF_8);
                template = mergeBiomeFeatures(template, overlay);
            }
            template = template.replace("DIM_PAL_SLOT", "DIM_PAL_" + selection.paletteSlot());
            template = template.replace("DIM_PAL_SLOT_STONE", "DIM_PAL_" + selection.paletteSlot() + "_STONE");

            Files.writeString(biomePath, template, StandardCharsets.UTF_8);
        }
    }

    private void applyFeatureParameterOverrides(Path packDir) throws IOException {
        Map<String, String> placeholders = new LinkedHashMap<>();
        placeholders.put("DIM_BETWEEN_GRID_WIDTH", "32");
        placeholders.put("DIM_BETWEEN_GRID_PADDING", "12");
        placeholders.put("DIM_BETWEEN_AMOUNT", "1");
        placeholders.put("DIM_BETWEEN_SHIP_STRUCTURE", "end_ship");
        placeholders.put("DIM_SHAPES_GRID_WIDTH", "20");
        placeholders.put("DIM_SHAPES_GRID_PADDING", "8");
        placeholders.put("DIM_SHAPES_AMOUNT", "1");
        placeholders.put("DIM_SHAPES_WEIGHT_CUBE", "3");
        placeholders.put("DIM_SHAPES_WEIGHT_SPHERE", "2");
        placeholders.put("DIM_SHAPES_WEIGHT_DIAMOND", "2");

        applyPlaceholders(packDir.resolve("features").resolve("special").resolve("between_end_ships.yml"), placeholders);
        applyPlaceholders(packDir.resolve("features").resolve("special").resolve("shapes_scatter.yml"), placeholders);
    }

    private void applyPlaceholders(Path file, Map<String, String> placeholders) throws IOException {
        if (!Files.exists(file)) {
            return;
        }
        String content = Files.readString(file, StandardCharsets.UTF_8);
        String updated = replacePlaceholders(content, placeholders);
        if (!updated.equals(content)) {
            Files.writeString(file, updated, StandardCharsets.UTF_8);
        }
    }

    private void applySurfaceBlockOverrides(Path packDir, Map<Integer, PaletteDefinition> palettes) throws IOException {
        Set<String> surfaceBlocks = new LinkedHashSet<>();
        for (PaletteDefinition palette : palettes.values()) {
            if (palette.surfaceBlock() != null && !palette.surfaceBlock().isBlank()) {
                surfaceBlocks.add(palette.surfaceBlock());
            }
        }
        List<String> blocks = new ArrayList<>(surfaceBlocks);
        if (blocks.isEmpty()) {
            blocks = List.of("minecraft:grass_block");
        }

        try (var walk = Files.walk(packDir)) {
            for (Path file : walk.toList()) {
                if (Files.isDirectory(file)) {
                    continue;
                }
                String name = file.getFileName().toString();
                if (!name.endsWith(".yml") && !name.endsWith(".yaml") && !name.endsWith(".tesf")) {
                    continue;
                }
                String content = Files.readString(file, StandardCharsets.UTF_8);
                if (!content.contains("DIM_SURFACE_BLOCK")) {
                    continue;
                }
                content = replaceSurfaceBlocks(content, blocks);
                Files.writeString(file, content, StandardCharsets.UTF_8);
            }
        }
    }

    private void applyTreePalettes(Path packDir, List<BiomeTemplateSelection> biomes, Map<Integer, PaletteDefinition> palettes)
        throws IOException {
        Path biomesDir = packDir.resolve("biomes");
        Map<String, Path> featureIndex = indexFeatureFiles(packDir.resolve("features"));
        Map<String, Path> structureIndex = indexStructureFiles(packDir.resolve("structures"));
        Set<String> structureIds = new HashSet<>(structureIndex.keySet());
        Map<String, String> featureCopies = new HashMap<>();
        Map<String, String> structureCopies = new HashMap<>();
        Map<Integer, TreePaletteProfile> slotTreePalettes = new HashMap<>();

        for (BiomeTemplateSelection selection : biomes) {
            String biomeId = BiomeTemplateRegistry.terraBiomeId(selection.templateId());
            Path biomePath = biomesDir.resolve(biomeId + ".yml");
            if (!Files.exists(biomePath)) {
                throw new IOException("Missing biome template: " + biomePath);
            }

            String biomeTemplate = Files.readString(biomePath, StandardCharsets.UTF_8);
            if (!selection.treePalette().enabled()) {
                biomeTemplate = removeTreeFeatures(biomeTemplate);
                Files.writeString(biomePath, biomeTemplate, StandardCharsets.UTF_8);
                continue;
            }

            TreePaletteProfile paletteProfile = selection.treePalette();
            TreePaletteProfile existing = slotTreePalettes.putIfAbsent(selection.paletteSlot(), paletteProfile);
            if (existing != null && !existing.equals(paletteProfile)) {
                throw new IllegalStateException("Tree palette mismatch for palette slot " + selection.paletteSlot());
            }

            List<String> treeFeatures = extractTreeFeatures(biomeTemplate);
            if (treeFeatures.isEmpty()) {
                continue;
            }

            PaletteDefinition paletteDefinition = palettes.get(selection.paletteSlot());
            String surfaceBlock = paletteDefinition != null && paletteDefinition.surfaceBlock() != null
                && !paletteDefinition.surfaceBlock().isBlank()
                ? paletteDefinition.surfaceBlock()
                : "minecraft:grass_block";

            Set<String> referencedStructures = new LinkedHashSet<>();
            for (String featureId : treeFeatures) {
                Path featurePath = featureIndex.get(featureId);
                if (featurePath == null) {
                    throw new IOException("Missing tree feature template: " + featureId);
                }
                String featureContent = Files.readString(featurePath, StandardCharsets.UTF_8);
                referencedStructures.addAll(extractStructureIdsFromFeature(featureContent));
            }

            Map<String, String> structureDupMap = new LinkedHashMap<>();
            if (!referencedStructures.isEmpty()) {
                Deque<String> queue = new ArrayDeque<>(referencedStructures);
                Set<String> visited = new HashSet<>();
                while (!queue.isEmpty()) {
                    String structureId = queue.removeFirst();
                    if (!visited.add(structureId)) {
                        continue;
                    }
                    Path structurePath = structureIndex.get(structureId);
                    if (structurePath == null) {
                        continue;
                    }
                    String structureContent = Files.readString(structurePath, StandardCharsets.UTF_8);
                    if (containsTreePlaceholders(structureContent)) {
                        structureDupMap.put(structureId, structureId + "_slot" + selection.paletteSlot());
                    }
                    for (String nestedId : extractStructureReferences(structureContent, structureIds)) {
                        if (!visited.contains(nestedId)) {
                            queue.add(nestedId);
                        }
                    }
                }
            }

            for (Map.Entry<String, String> entry : structureDupMap.entrySet()) {
                String originalId = entry.getKey();
                String newId = entry.getValue();
                String copyKey = originalId + "|slot" + selection.paletteSlot();
                if (structureCopies.containsKey(copyKey)) {
                    continue;
                }
                Path originalPath = structureIndex.get(originalId);
                if (originalPath == null) {
                    continue;
                }
                Path newPath = originalPath.resolveSibling(newId + fileExtension(originalPath));
                if (!Files.exists(newPath)) {
                    String content = Files.readString(originalPath, StandardCharsets.UTF_8);
                    content = replaceStructureReferencesInScript(content, structureDupMap);
                    content = replacePlaceholders(content, paletteProfile.placeholderMap());
                    content = content.replace("DIM_SURFACE_BLOCK", surfaceBlock);
                    Files.writeString(newPath, content, StandardCharsets.UTF_8);
                }
                structureCopies.put(copyKey, newId);
                structureIndex.put(newId, newPath);
                structureIds.add(newId);
            }

            List<String> updatedTreeFeatures = new ArrayList<>(treeFeatures.size());
            for (String featureId : treeFeatures) {
                String copyKey = featureId + "|slot" + selection.paletteSlot();
                String newFeatureId = featureCopies.get(copyKey);
                if (newFeatureId == null) {
                    newFeatureId = featureId + "_SLOT" + selection.paletteSlot();
                    featureCopies.put(copyKey, newFeatureId);
                    Path featurePath = featureIndex.get(featureId);
                    if (featurePath == null) {
                        throw new IOException("Missing tree feature template: " + featureId);
                    }
                    Path newPath = featurePath.resolveSibling(fileNameWithSuffix(featurePath, "_slot" + selection.paletteSlot()));
                    String content = Files.readString(featurePath, StandardCharsets.UTF_8);
                    content = replaceYamlId(content, newFeatureId);
                    content = replaceStructureReferencesInFeature(content, structureDupMap);
                    content = replacePlaceholders(content, paletteProfile.placeholderMap());
                    content = content.replace("DIM_SURFACE_BLOCK", surfaceBlock);
                    Files.writeString(newPath, content, StandardCharsets.UTF_8);
                    featureIndex.put(newFeatureId, newPath);
                }
                updatedTreeFeatures.add(newFeatureId);
            }

            biomeTemplate = replaceTreeFeatures(biomeTemplate, updatedTreeFeatures);
            Files.writeString(biomePath, biomeTemplate, StandardCharsets.UTF_8);
        }
    }

    private String replaceSurfaceBlocks(String content, List<String> blocks) {
        String lineSeparator = content.contains("\r\n") ? "\r\n" : "\n";
        String[] lines = content.split("\\R", -1);
        List<String> output = new ArrayList<>(lines.length);

        for (String line : lines) {
            String trimmed = line.trim();
            if ("- DIM_SURFACE_BLOCK".equals(trimmed)) {
                String indent = line.substring(0, line.indexOf('-'));
                for (String block : blocks) {
                    output.add(indent + "- " + block);
                }
                continue;
            }
            output.add(line.replace("DIM_SURFACE_BLOCK", blocks.get(0)));
        }

        return String.join(lineSeparator, output);
    }

    private String mergeBiomeFeatures(String baseTemplate, String overlayTemplate) {
        Map<String, List<String>> overlayFeatures = extractBiomeFeatures(overlayTemplate);
        if (overlayFeatures.isEmpty()) {
            return baseTemplate;
        }
        Map<String, List<String>> baseFeatures = extractBiomeFeatures(baseTemplate);
        if (baseFeatures.isEmpty()) {
            return appendFeaturesBlock(baseTemplate, overlayFeatures);
        }
        for (Map.Entry<String, List<String>> entry : overlayFeatures.entrySet()) {
            baseFeatures.computeIfAbsent(entry.getKey(), key -> new ArrayList<>())
                .addAll(entry.getValue());
        }
        return replaceFeaturesBlock(baseTemplate, baseFeatures);
    }

    private Map<String, List<String>> extractBiomeFeatures(String template) {
        Map<String, List<String>> features = new LinkedHashMap<>();
        String[] lines = template.split("\\R", -1);
        boolean inFeatures = false;
        int featuresIndent = -1;
        String currentCategory = null;
        int categoryIndent = -1;

        for (String line : lines) {
            String trimmed = line.trim();
            int indent = leadingIndent(line);
            if (!inFeatures) {
                if (trimmed.equals("features:")) {
                    inFeatures = true;
                    featuresIndent = indent;
                }
                continue;
            }
            if (!trimmed.isEmpty() && indent <= featuresIndent) {
                break;
            }
            if (trimmed.isEmpty() || trimmed.startsWith("#")) {
                continue;
            }
            if (!trimmed.startsWith("-") && trimmed.endsWith(":") && indent > featuresIndent) {
                currentCategory = trimmed.substring(0, trimmed.length() - 1).trim();
                categoryIndent = indent;
                features.putIfAbsent(currentCategory, new ArrayList<>());
                continue;
            }
            if (currentCategory != null) {
                if (indent <= categoryIndent) {
                    currentCategory = null;
                    continue;
                }
                if (trimmed.startsWith("- ")) {
                    features.get(currentCategory).add(trimmed.substring(2).trim());
                }
            }
        }
        return features;
    }

    private String replaceFeaturesBlock(String template, Map<String, List<String>> features) {
        String lineSeparator = template.contains("\r\n") ? "\r\n" : "\n";
        String[] lines = template.split("\\R", -1);
        int featuresIndex = -1;
        for (int i = 0; i < lines.length; i++) {
            if ("features:".equals(lines[i].trim())) {
                featuresIndex = i;
                break;
            }
        }
        if (featuresIndex < 0) {
            return appendFeaturesBlock(template, features);
        }
        int featuresIndent = leadingIndent(lines[featuresIndex]);
        int endIndex = lines.length;
        for (int i = featuresIndex + 1; i < lines.length; i++) {
            String trimmed = lines[i].trim();
            if (!trimmed.isEmpty() && leadingIndent(lines[i]) <= featuresIndent) {
                endIndex = i;
                break;
            }
        }
        List<String> output = new ArrayList<>(lines.length + features.size() * 2);
        output.addAll(Arrays.asList(lines).subList(0, featuresIndex + 1));
        output.addAll(buildFeaturesBlock(features, featuresIndent));
        output.addAll(Arrays.asList(lines).subList(endIndex, lines.length));
        return String.join(lineSeparator, output);
    }

    private String appendFeaturesBlock(String template, Map<String, List<String>> features) {
        String lineSeparator = template.contains("\r\n") ? "\r\n" : "\n";
        String trimmedTemplate = template;
        if (!trimmedTemplate.endsWith(lineSeparator)) {
            trimmedTemplate = trimmedTemplate + lineSeparator;
        }
        StringBuilder builder = new StringBuilder(trimmedTemplate);
        builder.append("features:").append(lineSeparator);
        for (String line : buildFeaturesBlock(features, 0)) {
            builder.append(line).append(lineSeparator);
        }
        return builder.toString();
    }

    private List<String> buildFeaturesBlock(Map<String, List<String>> features, int featuresIndent) {
        String categoryIndent = " ".repeat(featuresIndent + 2);
        String entryIndent = " ".repeat(featuresIndent + 4);
        List<String> output = new ArrayList<>();
        for (Map.Entry<String, List<String>> entry : features.entrySet()) {
            output.add(categoryIndent + entry.getKey() + ":");
            for (String featureId : entry.getValue()) {
                output.add(entryIndent + "- " + featureId);
            }
        }
        return output;
    }

    private Map<String, Path> indexFeatureFiles(Path featuresDir) throws IOException {
        Map<String, Path> index = new HashMap<>();
        if (!Files.exists(featuresDir)) {
            return index;
        }
        try (var walk = Files.walk(featuresDir)) {
            for (Path file : walk.toList()) {
                if (Files.isDirectory(file)) {
                    continue;
                }
                String name = file.getFileName().toString();
                if (!name.endsWith(".yml") && !name.endsWith(".yaml")) {
                    continue;
                }
                String id = readYamlId(file);
                if (id != null && !id.isBlank()) {
                    index.put(id, file);
                }
            }
        }
        return index;
    }

    private Map<String, Path> indexStructureFiles(Path structuresDir) throws IOException {
        Map<String, Path> index = new HashMap<>();
        if (!Files.exists(structuresDir)) {
            return index;
        }
        try (var walk = Files.walk(structuresDir)) {
            for (Path file : walk.toList()) {
                if (Files.isDirectory(file)) {
                    continue;
                }
                String name = file.getFileName().toString();
                int dot = name.lastIndexOf('.');
                if (dot <= 0) {
                    continue;
                }
                String id = name.substring(0, dot);
                index.put(id, file);
            }
        }
        return index;
    }

    private String readYamlId(Path file) throws IOException {
        List<String> lines = Files.readAllLines(file, StandardCharsets.UTF_8);
        for (String line : lines) {
            String trimmed = line.trim();
            if (trimmed.startsWith("id:")) {
                return trimmed.substring("id:".length()).trim();
            }
        }
        return null;
    }

    private List<String> extractTreeFeatures(String template) {
        List<String> features = new ArrayList<>();
        String[] lines = template.split("\\R", -1);

        boolean inFeatures = false;
        boolean inTrees = false;
        int featuresIndent = -1;
        int treesIndent = -1;

        for (int i = 0; i < lines.length; i++) {
            String line = lines[i];
            String trimmed = line.trim();
            int indent = leadingIndent(line);

            if (!inFeatures) {
                if (trimmed.equals("features:")) {
                    inFeatures = true;
                    featuresIndent = indent;
                }
                continue;
            }

            if (inTrees) {
                if (trimmed.isEmpty() || trimmed.startsWith("#")) {
                    continue;
                }
                if (indent <= treesIndent) {
                    inTrees = false;
                    i--;
                    continue;
                }
                if (trimmed.startsWith("- ")) {
                    String featureId = trimmed.substring(2).trim();
                    if (isSimpleId(featureId)) {
                        features.add(featureId);
                    }
                }
                continue;
            }

            if (!trimmed.isEmpty() && indent <= featuresIndent) {
                inFeatures = false;
                i--;
                continue;
            }

            if (trimmed.equals("trees:") && indent > featuresIndent) {
                inTrees = true;
                treesIndent = indent;
            }
        }

        return features;
    }

    private List<String> extractStructureIdsFromFeature(String featureContent) {
        List<String> structures = new ArrayList<>();
        String[] lines = featureContent.split("\\R", -1);
        for (String line : lines) {
            String trimmed = line.trim();
            if (trimmed.startsWith("- ")) {
                String token = trimmed.substring(2).trim();
                int colon = token.indexOf(':');
                if (colon > 0) {
                    String id = token.substring(0, colon).trim();
                    if (isSimpleId(id)) {
                        structures.add(id);
                    }
                }
                continue;
            }
            if (trimmed.startsWith("structures:")) {
                String value = trimmed.substring("structures:".length()).trim();
                if (!value.isEmpty() && isSimpleId(value)) {
                    structures.add(value);
                }
            }
        }
        return structures;
    }

    private Set<String> extractStructureReferences(String script, Set<String> knownStructureIds) {
        Set<String> references = new LinkedHashSet<>();
        Matcher matcher = Pattern.compile("\"([A-Za-z0-9_]+)\"").matcher(script);
        while (matcher.find()) {
            String id = matcher.group(1);
            if (knownStructureIds.contains(id)) {
                references.add(id);
            }
        }
        return references;
    }

    private boolean containsTreePlaceholders(String content) {
        return content.contains("DIM_TREE_") || content.contains("DIM_SURFACE_BLOCK");
    }

    private String replaceStructureReferencesInScript(String content, Map<String, String> structureMap) {
        String updated = content;
        for (Map.Entry<String, String> entry : structureMap.entrySet()) {
            String oldId = entry.getKey();
            String newId = entry.getValue();
            updated = updated.replace("\"" + oldId + "\"", "\"" + newId + "\"");
            updated = updated.replace("'" + oldId + "'", "'" + newId + "'");
        }
        return updated;
    }

    private String replaceStructureReferencesInFeature(String content, Map<String, String> structureMap) {
        if (structureMap.isEmpty()) {
            return content;
        }
        String lineSeparator = content.contains("\r\n") ? "\r\n" : "\n";
        String[] lines = content.split("\\R", -1);
        List<String> output = new ArrayList<>(lines.length);

        for (String line : lines) {
            String trimmed = line.trim();
            if (trimmed.startsWith("- ")) {
                String token = trimmed.substring(2).trim();
                int colon = token.indexOf(':');
                if (colon > 0) {
                    String id = token.substring(0, colon).trim();
                    String replacement = structureMap.get(id);
                    if (replacement != null) {
                        String suffix = token.substring(colon);
                        String indent = line.substring(0, line.indexOf('-'));
                        output.add(indent + "- " + replacement + suffix);
                        continue;
                    }
                }
            } else if (trimmed.startsWith("structures:")) {
                String value = trimmed.substring("structures:".length()).trim();
                String replacement = structureMap.get(value);
                if (replacement != null) {
                    String indent = line.substring(0, line.indexOf('s'));
                    output.add(indent + "structures: " + replacement);
                    continue;
                }
            }
            output.add(line);
        }

        return String.join(lineSeparator, output);
    }

    private String replaceYamlId(String content, String newId) {
        String lineSeparator = content.contains("\r\n") ? "\r\n" : "\n";
        String[] lines = content.split("\\R", -1);
        for (int i = 0; i < lines.length; i++) {
            String trimmed = lines[i].trim();
            if (trimmed.startsWith("id:")) {
                String indent = lines[i].substring(0, leadingIndent(lines[i]));
                lines[i] = indent + "id: " + newId;
                break;
            }
        }
        return String.join(lineSeparator, lines);
    }

    private String replacePlaceholders(String content, Map<String, String> placeholders) {
        if (placeholders.isEmpty()) {
            return content;
        }
        List<String> keys = new ArrayList<>(placeholders.keySet());
        keys.sort(Comparator.comparingInt(String::length).reversed());
        String updated = content;
        for (String key : keys) {
            updated = updated.replace(key, placeholders.get(key));
        }
        return updated;
    }

    private String fileExtension(Path file) {
        String name = file.getFileName().toString();
        int dot = name.lastIndexOf('.');
        return dot >= 0 ? name.substring(dot) : "";
    }

    private String fileNameWithSuffix(Path file, String suffix) {
        String name = file.getFileName().toString();
        int dot = name.lastIndexOf('.');
        if (dot < 0) {
            return name + suffix;
        }
        return name.substring(0, dot) + suffix + name.substring(dot);
    }

    private boolean isSimpleId(String value) {
        if (value.isEmpty()) {
            return false;
        }
        for (int i = 0; i < value.length(); i++) {
            char c = value.charAt(i);
            if (!Character.isLetterOrDigit(c) && c != '_' && c != '-') {
                return false;
            }
        }
        return true;
    }

    private String replaceTreeFeatures(String template, List<String> treeFeatures) {
        if (treeFeatures.isEmpty()) {
            return template;
        }
        String lineSeparator = template.contains("\r\n") ? "\r\n" : "\n";
        String[] lines = template.split("\\R", -1);
        List<String> output = new ArrayList<>(lines.length);

        boolean inFeatures = false;
        boolean skippingTrees = false;
        int featuresIndent = -1;
        int treesIndent = -1;

        for (int i = 0; i < lines.length; i++) {
            String line = lines[i];
            String trimmed = line.trim();
            int indent = leadingIndent(line);

            if (!inFeatures) {
                output.add(line);
                if (trimmed.equals("features:")) {
                    inFeatures = true;
                    featuresIndent = indent;
                }
                continue;
            }

            if (skippingTrees) {
                if (trimmed.isEmpty() || trimmed.startsWith("#")) {
                    continue;
                }
                if (indent <= treesIndent) {
                    skippingTrees = false;
                    i--;
                }
                continue;
            }

            if (!trimmed.isEmpty() && indent <= featuresIndent) {
                inFeatures = false;
                i--;
                continue;
            }

            if (trimmed.equals("trees:") && indent > featuresIndent) {
                output.add(line);
                String indentPrefix = line.substring(0, indent);
                for (String featureId : treeFeatures) {
                    output.add(indentPrefix + "  - " + featureId);
                }
                skippingTrees = true;
                treesIndent = indent;
                continue;
            }

            output.add(line);
        }

        return String.join(lineSeparator, output);
    }

    private String removeTreeFeatures(String template) {
        String lineSeparator = template.contains("\r\n") ? "\r\n" : "\n";
        String[] lines = template.split("\\R", -1);
        List<String> output = new ArrayList<>(lines.length);

        boolean inFeatures = false;
        boolean skippingTrees = false;
        int featuresIndent = -1;
        int treesIndent = -1;

        for (int i = 0; i < lines.length; i++) {
            String line = lines[i];
            String trimmed = line.trim();
            int indent = leadingIndent(line);

            if (!inFeatures) {
                output.add(line);
                if (trimmed.equals("features:")) {
                    inFeatures = true;
                    featuresIndent = indent;
                }
                continue;
            }

            if (skippingTrees) {
                if (trimmed.isEmpty() || trimmed.startsWith("#")) {
                    continue;
                }
                if (indent <= treesIndent) {
                    skippingTrees = false;
                    i--;
                }
                continue;
            }

            if (!trimmed.isEmpty() && indent <= featuresIndent) {
                inFeatures = false;
                i--;
                continue;
            }

            if (trimmed.equals("trees:") && indent > featuresIndent) {
                skippingTrees = true;
                treesIndent = indent;
                continue;
            }

            output.add(line);
        }

        return String.join(lineSeparator, output);
    }

    private int leadingIndent(String line) {
        int count = 0;
        while (count < line.length()) {
            char c = line.charAt(count);
            if (c == ' ' || c == '\t') {
                count++;
            } else {
                break;
            }
        }
        return count;
    }
}
