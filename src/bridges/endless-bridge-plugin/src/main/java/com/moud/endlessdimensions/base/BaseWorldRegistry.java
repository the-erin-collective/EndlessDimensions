package com.moud.endlessdimensions.base;

import net.minestom.server.instance.Instance;
import net.minestom.server.instance.InstanceContainer;
import net.minestom.server.instance.InstanceManager;
import net.minestom.server.tag.Tag;

import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;

public final class BaseWorldRegistry {
    private static final Tag<String> BASE_WORLD_TAG = Tag.String("endless:base_world");
    private static final Map<String, InstanceContainer> BASE_WORLDS = new ConcurrentHashMap<>();

    private BaseWorldRegistry() {
    }

    public static void register(String dimensionKey, InstanceContainer instance) {
        Objects.requireNonNull(dimensionKey, "dimensionKey");
        Objects.requireNonNull(instance, "instance");
        BASE_WORLDS.put(dimensionKey, instance);
    }

    public static InstanceContainer resolve(InstanceManager manager, String dimensionKey) {
        Objects.requireNonNull(manager, "manager");
        Objects.requireNonNull(dimensionKey, "dimensionKey");
        InstanceContainer instance = BASE_WORLDS.get(dimensionKey);
        if (instance != null) {
            return instance;
        }
        refresh(manager);
        return BASE_WORLDS.get(dimensionKey);
    }

    public static void refresh(InstanceManager manager) {
        Objects.requireNonNull(manager, "manager");
        BASE_WORLDS.clear();
        for (Instance instance : manager.getInstances()) {
            if (!(instance instanceof InstanceContainer container)) {
                continue;
            }
            String baseKey = container.getTag(BASE_WORLD_TAG);
            if (baseKey == null || baseKey.isBlank()) {
                continue;
            }
            BASE_WORLDS.put(baseKey, container);
        }
    }
}
