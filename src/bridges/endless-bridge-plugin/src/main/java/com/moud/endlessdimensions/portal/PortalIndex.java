package com.moud.endlessdimensions.portal;

import com.moud.endlessdimensions.dimension.DimensionKey;

import java.util.Collection;
import java.util.Collections;
import java.util.HashSet;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

public final class PortalIndex {
    private final Map<DimensionKey, Map<Long, Set<PortalKey>>> portalsByChunk = new ConcurrentHashMap<>();

    public void index(PortalKey portalKey) {
        Objects.requireNonNull(portalKey, "portalKey");
        Map<Long, Set<PortalKey>> byChunk = portalsByChunk.computeIfAbsent(portalKey.dimension(),
            ignored -> new ConcurrentHashMap<>());
        for (long chunkKey : portalChunkKeys(portalKey)) {
            byChunk.computeIfAbsent(chunkKey, ignored -> ConcurrentHashMap.newKeySet()).add(portalKey);
        }
    }

    public void indexAll(Collection<PortalKey> portalKeys) {
        Objects.requireNonNull(portalKeys, "portalKeys");
        for (PortalKey portalKey : portalKeys) {
            index(portalKey);
        }
    }

    public void remove(PortalKey portalKey) {
        Objects.requireNonNull(portalKey, "portalKey");
        Map<Long, Set<PortalKey>> byChunk = portalsByChunk.get(portalKey.dimension());
        if (byChunk == null) {
            return;
        }
        for (long chunkKey : portalChunkKeys(portalKey)) {
            Set<PortalKey> portals = byChunk.get(chunkKey);
            if (portals == null) {
                continue;
            }
            portals.remove(portalKey);
            if (portals.isEmpty()) {
                byChunk.remove(chunkKey);
            }
        }
        if (byChunk.isEmpty()) {
            portalsByChunk.remove(portalKey.dimension());
        }
    }

    public Set<PortalKey> get(DimensionKey dimensionKey, long chunkKey) {
        Objects.requireNonNull(dimensionKey, "dimensionKey");
        Map<Long, Set<PortalKey>> byChunk = portalsByChunk.get(dimensionKey);
        if (byChunk == null) {
            return Collections.emptySet();
        }
        Set<PortalKey> portals = byChunk.get(chunkKey);
        if (portals == null || portals.isEmpty()) {
            return Collections.emptySet();
        }
        return new HashSet<>(portals);
    }

    private Iterable<Long> portalChunkKeys(PortalKey portalKey) {
        int minChunkX = chunkCoord(portalKey.min().x());
        int maxChunkX = chunkCoord(portalKey.max().x());
        int minChunkZ = chunkCoord(portalKey.min().z());
        int maxChunkZ = chunkCoord(portalKey.max().z());
        Set<Long> keys = new HashSet<>();
        for (int chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
            for (int chunkZ = minChunkZ; chunkZ <= maxChunkZ; chunkZ++) {
                keys.add(chunkKey(chunkX, chunkZ));
            }
        }
        return keys;
    }

    public static int chunkCoord(int blockCoord) {
        return Math.floorDiv(blockCoord, 16);
    }

    public static long chunkKey(int chunkX, int chunkZ) {
        return ((long) chunkX << 32) | (chunkZ & 0xffffffffL);
    }
}
