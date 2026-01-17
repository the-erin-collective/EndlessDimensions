package com.moud.endlessdimensions.generation;

import com.dfsek.terra.api.config.ConfigPack;
import com.dfsek.terra.minestom.world.TerraMinestomWorldBuilder;
import net.minestom.server.instance.InstanceContainer;
import org.slf4j.Logger;

import java.util.Objects;

public class TerraIntegration {
    private final Logger logger;

    public TerraIntegration(Logger logger) {
        this.logger = Objects.requireNonNull(logger, "logger");
    }

    public void attachToInstance(InstanceContainer instance, ConfigPack pack, long seed) {
        Objects.requireNonNull(instance, "instance");
        Objects.requireNonNull(pack, "pack");

        try {
            TerraMinestomWorldBuilder.from(instance)
                .pack(pack)
                .seed(seed)
                .attach();
        } catch (Exception e) {
            logger.error("[TerraIntegration] Failed to attach Terra pack to instance", e);
            throw e;
        }
    }
}
