package com.moud.endlessdimensions.portal;

import com.moud.endlessdimensions.dimension.DimensionKey;
import net.minestom.server.coordinate.Point;
import net.minestom.server.instance.Instance;
import net.minestom.server.instance.block.Block;

import java.util.ArrayDeque;
import java.util.HashSet;
import java.util.Objects;
import java.util.Queue;
import java.util.Set;

public final class PortalDetector {
    private static final String NETHER_PORTAL = "minecraft:nether_portal";

    public PortalKey detectPortalKey(Instance instance, Point start, DimensionKey dimensionKey) {
        Objects.requireNonNull(instance, "instance");
        Objects.requireNonNull(start, "start");
        Objects.requireNonNull(dimensionKey, "dimensionKey");

        if (!isPortalBlock(instance, start.blockX(), start.blockY(), start.blockZ())) {
            return null;
        }

        PortalAxis axis = detectAxis(instance, start.blockX(), start.blockY(), start.blockZ());
        Vec3i min = new Vec3i(start.blockX(), start.blockY(), start.blockZ());
        Vec3i max = min;

        Queue<Vec3i> queue = new ArrayDeque<>();
        Set<Vec3i> visited = new HashSet<>();
        queue.add(min);
        visited.add(min);

        while (!queue.isEmpty()) {
            Vec3i current = queue.poll();
            min = new Vec3i(
                Math.min(min.x(), current.x()),
                Math.min(min.y(), current.y()),
                Math.min(min.z(), current.z())
            );
            max = new Vec3i(
                Math.max(max.x(), current.x()),
                Math.max(max.y(), current.y()),
                Math.max(max.z(), current.z())
            );

            for (Vec3i neighbor : neighbors(current, axis)) {
                if (visited.contains(neighbor)) {
                    continue;
                }
                if (!isPortalBlock(instance, neighbor.x(), neighbor.y(), neighbor.z())) {
                    continue;
                }
                visited.add(neighbor);
                queue.add(neighbor);
            }
        }

        return PortalKey.normalize(dimensionKey, axis, min, max);
    }

    private PortalAxis detectAxis(Instance instance, int x, int y, int z) {
        if (isPortalBlock(instance, x + 1, y, z) || isPortalBlock(instance, x - 1, y, z)) {
            return PortalAxis.Z;
        }
        if (isPortalBlock(instance, x, y, z + 1) || isPortalBlock(instance, x, y, z - 1)) {
            return PortalAxis.X;
        }
        return PortalAxis.Z;
    }

    private Iterable<Vec3i> neighbors(Vec3i current, PortalAxis axis) {
        if (axis == PortalAxis.Z) {
            return java.util.List.of(
                new Vec3i(current.x() + 1, current.y(), current.z()),
                new Vec3i(current.x() - 1, current.y(), current.z()),
                new Vec3i(current.x(), current.y() + 1, current.z()),
                new Vec3i(current.x(), current.y() - 1, current.z())
            );
        }
        return java.util.List.of(
            new Vec3i(current.x(), current.y(), current.z() + 1),
            new Vec3i(current.x(), current.y(), current.z() - 1),
            new Vec3i(current.x(), current.y() + 1, current.z()),
            new Vec3i(current.x(), current.y() - 1, current.z())
        );
    }

    private boolean isPortalBlock(Instance instance, int x, int y, int z) {
        try {
            Block block = instance.getBlock(x, y, z);
            return NETHER_PORTAL.equals(block.key().asString());
        } catch (Exception ignored) {
            return false;
        }
    }
}
