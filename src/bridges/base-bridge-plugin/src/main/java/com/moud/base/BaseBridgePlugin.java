package com.moud.base;

import com.dfsek.terra.minestom.world.TerraMinestomWorldBuilder;
import net.hollowcube.polar.PolarLoader;
import net.minestom.server.MinecraftServer;
import net.minestom.server.instance.InstanceContainer;
import net.minestom.server.instance.InstanceManager;
import net.minestom.server.registry.RegistryKey;
import net.minestom.server.tag.Tag;
import net.minestom.server.world.DimensionType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.nio.file.Path;

public class BaseBridgePlugin {
    private static final Logger logger = LoggerFactory.getLogger(BaseBridgePlugin.class);

    private static final long DEFAULT_SEED = 0L;
    private static final String PACK_OVERWORLD = "OVERWORLD";
    private static final String PACK_NETHER = "TARTARUS";
    private static final String PACK_END = "REIMAGEND";
    private static final String KEY_OVERWORLD = "minecraft:overworld";
    private static final String KEY_NETHER = "minecraft:the_nether";
    private static final String KEY_END = "minecraft:the_end";
    private static final Tag<String> BASE_WORLD_TAG = Tag.String("endless:base_world");
    private static final RegistryKey<DimensionType> DIM_OVERWORLD = RegistryKey.unsafeOf("minecraft:overworld");
    private static final RegistryKey<DimensionType> DIM_NETHER = RegistryKey.unsafeOf("minecraft:the_nether");
    private static final RegistryKey<DimensionType> DIM_END = RegistryKey.unsafeOf("minecraft:the_end");

    public void initialize() {
        logger.info("[BaseBridgePlugin] Scheduling base world creation...");
        MinecraftServer.getSchedulerManager().scheduleNextTick(this::createBaseWorlds);
    }

    public void shutdown() {
        logger.info("[BaseBridgePlugin] Shutdown requested");
    }

    private void createBaseWorlds() {
        try {
            InstanceManager instanceManager = MinecraftServer.getInstanceManager();

            InstanceContainer overworld = instanceManager.createInstanceContainer(DIM_OVERWORLD);
            InstanceContainer nether = instanceManager.createInstanceContainer(DIM_NETHER);
            InstanceContainer end = instanceManager.createInstanceContainer(DIM_END);

            TerraMinestomWorldBuilder.from(overworld)
                .packById(PACK_OVERWORLD)
                .seed(DEFAULT_SEED)
                .attach();

            TerraMinestomWorldBuilder.from(nether)
                .packById(PACK_NETHER)
                .seed(DEFAULT_SEED)
                .attach();

            TerraMinestomWorldBuilder.from(end)
                .packById(PACK_END)
                .seed(DEFAULT_SEED)
                .attach();

            overworld.setChunkLoader(new PolarLoader(Path.of("worlds/overworld.polar")));
            nether.setChunkLoader(new PolarLoader(Path.of("worlds/nether.polar")));
            end.setChunkLoader(new PolarLoader(Path.of("worlds/end.polar")));

            overworld.setTag(BASE_WORLD_TAG, KEY_OVERWORLD);
            nether.setTag(BASE_WORLD_TAG, KEY_NETHER);
            end.setTag(BASE_WORLD_TAG, KEY_END);
            BaseWorldRegistry.register(overworld, nether, end);
            logger.info("[BaseBridgePlugin] Base worlds created and registered");
        } catch (Exception e) {
            logger.error("[BaseBridgePlugin] Failed to create base worlds", e);
            throw new IllegalStateException("Failed to create base worlds", e);
        }
    }
}
