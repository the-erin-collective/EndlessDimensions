package com.moud.base;

import net.minestom.server.instance.InstanceContainer;

public final class BaseWorldRegistry {
    private static InstanceContainer overworld;
    private static InstanceContainer nether;
    private static InstanceContainer end;

    private BaseWorldRegistry() {
    }

    public static void register(InstanceContainer overworldInstance,
                                InstanceContainer netherInstance,
                                InstanceContainer endInstance) {
        overworld = overworldInstance;
        nether = netherInstance;
        end = endInstance;
    }

    public static InstanceContainer getOverworld() {
        return overworld;
    }

    public static InstanceContainer getNether() {
        return nether;
    }

    public static InstanceContainer getEnd() {
        return end;
    }
}
