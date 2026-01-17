package com.moud.endlessdimensions.generation;

import com.dfsek.terra.api.config.ConfigPack;
import com.moud.endlessdimensions.dimension.DimensionKeys;
import net.minestom.server.MinecraftServer;
import net.minestom.server.instance.InstanceContainer;
import net.minestom.server.instance.InstanceManager;
import org.slf4j.Logger;

import java.io.IOException;
import java.util.Objects;

public class DimensionFactory {
    private final PackFactory packFactory;
    private final TerraIntegration terraIntegration;
    private final Logger logger;

    public DimensionFactory(PackFactory packFactory, TerraIntegration terraIntegration, Logger logger) {
        this.packFactory = Objects.requireNonNull(packFactory, "packFactory");
        this.terraIntegration = Objects.requireNonNull(terraIntegration, "terraIntegration");
        this.logger = Objects.requireNonNull(logger, "logger");
    }

    public InstanceContainer createInstance(DimensionDefinition definition) throws IOException {
        Objects.requireNonNull(definition, "definition");

        ConfigPack pack = packFactory.buildPack(definition);
        return createInstance(definition, pack);
    }

    public InstanceContainer createInstance(DimensionDefinition definition, ConfigPack pack) {
        Objects.requireNonNull(definition, "definition");
        Objects.requireNonNull(pack, "pack");

        InstanceManager instanceManager = MinecraftServer.getInstanceManager();
        InstanceContainer instance = instanceManager.createInstanceContainer(definition.shellType().dimensionKey());
        instance.setTag(DimensionKeys.DIMENSION_ID_TAG, definition.dimensionId());
        terraIntegration.attachToInstance(instance, pack, definition.seed());

        logger.info("[DimensionFactory] Created instance for {}", definition.dimensionId());
        return instance;
    }
}
