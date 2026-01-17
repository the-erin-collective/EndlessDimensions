package com.moud.endlessdimensions.generation;

import org.junit.jupiter.api.Test;

import java.net.URISyntaxException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.Objects;

import static org.junit.jupiter.api.Assertions.assertTrue;

class PackFactoryShellSanityTest {
    @Test
    void createPackAppliesShellOverrides() throws Exception {
        Path templatesRoot = resolveTemplatesRoot();
        Path packsRoot = Files.createTempDirectory("endless-pack-sanity");
        PackFactory packFactory = new PackFactory(templatesRoot, packsRoot);

        for (ShellType shellType : ShellType.values()) {
            BiomeTemplateId baseBiome = shellType.baseBiomePool().get(0);
            List<BiomeSlot> biomes = List.of(new BiomeSlot(baseBiome, null, 1));
            Map<Integer, PaletteDefinition> palettes = Map.of(
                1,
                new PaletteDefinition("minecraft:stone", null, "minecraft:stone", "minecraft:water")
            );

            DimensionDefinition definition = new DimensionDefinition(
                "endlessdimensions:test_" + shellType.id().toLowerCase(),
                1L,
                shellType,
                biomes,
                palettes
            );

            Path packDir = packFactory.createPack(definition);
            assertShellPackConfig(shellType, packDir);
        }
    }

    private Path resolveTemplatesRoot() throws URISyntaxException {
        var url = PackFactoryShellSanityTest.class.getClassLoader().getResource("templates");
        Objects.requireNonNull(url, "templates resource not found on classpath");
        return Path.of(url.toURI());
    }

    private void assertShellPackConfig(ShellType shellType, Path packDir) throws Exception {
        String meta = Files.readString(packDir.resolve("meta.yml"), StandardCharsets.UTF_8);
        String options = Files.readString(packDir.resolve("options.yml"), StandardCharsets.UTF_8);
        String pack = Files.readString(packDir.resolve("pack.yml"), StandardCharsets.UTF_8);

        assertTrue(pack.contains("biomes: $" + shellType.templateRoot() + "/biomes.yml:biomes"));
        assertTrue(pack.contains("vanilla: " + shellType.vanillaDimension()));
        assertTrue(pack.contains("vanilla-generation: " + shellType.vanillaGeneration()));

        switch (shellType) {
            case OVERWORLD_OPEN -> {
                assertTrue(meta.contains("top-y: 319"));
                assertTrue(meta.contains("ocean-level: 62"));
                assertTrue(options.contains("lava-level: 62"));
            }
            case NETHER_CAVERN -> {
                assertTrue(meta.contains("top-y: 255"));
                assertTrue(meta.contains("ocean-level: 32"));
                assertTrue(options.contains("lava-level: 32"));
            }
            case END_ISLANDS -> {
                assertTrue(meta.contains("top-y: 255"));
                assertTrue(meta.contains("ocean-level: 0"));
                assertTrue(options.contains("lava-level: 0"));
            }
            case SUPERFLAT -> {
                assertTrue(meta.contains("top-y: 128"));
                assertTrue(meta.contains("ocean-level: 62"));
                assertTrue(options.contains("lava-level: 62"));
            }
        }
    }
}
