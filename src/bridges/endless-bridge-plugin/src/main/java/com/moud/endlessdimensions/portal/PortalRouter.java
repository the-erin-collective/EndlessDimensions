package com.moud.endlessdimensions.portal;

import com.moud.endlessdimensions.base.BaseWorldRegistry;
import com.moud.endlessdimensions.dimension.DimensionKey;
import com.moud.endlessdimensions.dimension.DimensionKeys;
import com.moud.endlessdimensions.generation.BiomeSlot;
import com.moud.endlessdimensions.generation.BiomeSubsetPicker;
import com.moud.endlessdimensions.generation.BiomeTemplateId;
import com.moud.endlessdimensions.generation.BiomeTemplatePicker;
import com.moud.endlessdimensions.generation.BiomeTemplateSelection;
import com.moud.endlessdimensions.generation.DimensionService;
import com.moud.endlessdimensions.generation.PaletteDefinition;
import com.moud.endlessdimensions.generation.ResolvedDimensionKey;
import com.moud.endlessdimensions.generation.ResolvedDimensionType;
import com.moud.endlessdimensions.generation.ShellType;
import net.kyori.adventure.text.Component;
import net.kyori.adventure.text.serializer.plain.PlainTextComponentSerializer;
import net.minestom.server.MinecraftServer;
import net.minestom.server.component.DataComponents;
import net.minestom.server.coordinate.Point;
import net.minestom.server.coordinate.Pos;
import net.minestom.server.entity.Entity;
import net.minestom.server.entity.ItemEntity;
import net.minestom.server.entity.Player;
import net.minestom.server.event.Event;
import net.minestom.server.event.EventNode;
import net.minestom.server.event.entity.EntityDespawnEvent;
import net.minestom.server.event.entity.EntityTickEvent;
import net.minestom.server.event.instance.InstanceBlockUpdateEvent;
import net.minestom.server.instance.Instance;
import net.minestom.server.instance.InstanceContainer;
import net.minestom.server.instance.InstanceManager;
import net.minestom.server.instance.block.Block;
import net.minestom.server.item.ItemStack;
import net.minestom.server.item.Material;
import net.minestom.server.item.book.FilteredText;
import net.minestom.server.item.component.WritableBookContent;
import net.minestom.server.item.component.WrittenBookContent;
import net.minestom.server.world.DimensionType;
import org.slf4j.Logger;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Random;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;

public final class PortalRouter {
    private static final String NODE_NAME = "endless-portal-router";
    private static final double PLAYER_SEARCH_RADIUS = 6.0;
    private static final long TELEPORT_COOLDOWN_MS = 3000;
    private static final String NETHER_PORTAL = "minecraft:nether_portal";

    private static final List<String> OVERWORLD_SURFACE = List.of(
        "minecraft:grass_block",
        "minecraft:coarse_dirt",
        "minecraft:sand",
        "minecraft:podzol",
        "minecraft:moss_block"
    );
    private static final List<String> OVERWORLD_STONE = List.of(
        "minecraft:stone",
        "minecraft:deepslate",
        "minecraft:andesite",
        "minecraft:diorite"
    );
    private static final List<String> OVERWORLD_LIQUID = List.of(
        "minecraft:water",
        "minecraft:water",
        "minecraft:water",
        "minecraft:lava"
    );

    private static final List<String> NETHER_SURFACE = List.of(
        "minecraft:netherrack",
        "minecraft:blackstone",
        "minecraft:basalt",
        "minecraft:crimson_nylium",
        "minecraft:warped_nylium"
    );
    private static final List<String> NETHER_STONE = List.of(
        "minecraft:blackstone",
        "minecraft:basalt",
        "minecraft:netherrack"
    );
    private static final List<String> NETHER_LIQUID = List.of(
        "minecraft:lava"
    );

    private static final List<String> END_SURFACE = List.of(
        "minecraft:end_stone",
        "minecraft:purpur_block",
        "minecraft:obsidian",
        "minecraft:end_stone_bricks"
    );
    private static final List<String> END_STONE = List.of(
        "minecraft:end_stone",
        "minecraft:obsidian"
    );

    private final DimensionService dimensionService;
    private final PortalDetector portalDetector;
    private final PortalRegistry portalRegistry;
    private final PortalIndex portalIndex;
    private final Logger logger;
    private final EventNode<Event> parentNode;
    private final EventNode<Event> node;
    private final Set<UUID> processedItems = ConcurrentHashMap.newKeySet();
    private final Map<UUID, Long> playerTeleportCooldowns = new ConcurrentHashMap<>();
    private boolean registered;

    public PortalRouter(EventNode<Event> parentNode,
                        DimensionService dimensionService,
                        Path dataDir,
                        Logger logger) {
        this.parentNode = Objects.requireNonNull(parentNode, "parentNode");
        this.dimensionService = Objects.requireNonNull(dimensionService, "dimensionService");
        this.logger = Objects.requireNonNull(logger, "logger");
        Objects.requireNonNull(dataDir, "dataDir");
        this.node = EventNode.all(NODE_NAME);
        this.portalDetector = new PortalDetector();
        PortalRegistryStore store = new PortalRegistryStore(dataDir.resolve("portal-bindings.json"), logger);
        this.portalRegistry = new PortalRegistry(store);
        this.portalIndex = new PortalIndex();
    }

    public void register() {
        if (registered) {
            return;
        }
        parentNode.addChild(node);
        node.addListener(EntityTickEvent.class, this::onEntityTick);
        node.addListener(EntityDespawnEvent.class, this::onEntityDespawn);
        node.addListener(InstanceBlockUpdateEvent.class, this::onBlockUpdate);
        portalRegistry.load();
        portalIndex.indexAll(portalRegistry.links().keySet());
        registered = true;
        logger.info("[PortalRouter] Registered portal listeners");
    }

    public void shutdown() {
        if (!registered) {
            return;
        }
        portalRegistry.save();
        parentNode.removeChild(node);
        processedItems.clear();
        playerTeleportCooldowns.clear();
        registered = false;
        logger.info("[PortalRouter] Unregistered portal listeners");
    }

    private void onEntityDespawn(EntityDespawnEvent event) {
        UUID uuid = event.getEntity().getUuid();
        processedItems.remove(uuid);
        playerTeleportCooldowns.remove(uuid);
    }

    private void onEntityTick(EntityTickEvent event) {
        Entity entity = event.getEntity();
        if (entity instanceof Player player) {
            handlePlayerPortal(player);
            return;
        }
        if (entity instanceof ItemEntity itemEntity) {
            handleBookPortal(itemEntity);
        }
    }

    private void handlePlayerPortal(Player player) {
        Instance instance = player.getInstance();
        if (instance == null) {
            return;
        }
        if (isOnCooldown(player)) {
            return;
        }
        DimensionKey dimensionKey = DimensionKeys.fromInstance(instance);
        PortalKey portalKey = portalDetector.detectPortalKey(instance, player.getPosition(), dimensionKey);
        if (portalKey == null) {
            return;
        }
        portalIndex.index(portalKey);

        PortalLink link = portalRegistry.getLink(portalKey);
        if (link == null) {
            link = migrateLegacyBinding(portalKey);
        }

        playerTeleportCooldowns.put(player.getUuid(), System.currentTimeMillis());
        if (link != null) {
            routeLinked(player, portalKey, link);
            return;
        }

        routeDefault(player, portalKey);
    }

    private void handleBookPortal(ItemEntity itemEntity) {
        if (processedItems.contains(itemEntity.getUuid())) {
            return;
        }
        ItemStack stack = itemEntity.getItemStack();
        if (!isBook(stack)) {
            return;
        }

        Instance instance = itemEntity.getInstance();
        if (instance == null) {
            return;
        }
        DimensionKey dimensionKey = DimensionKeys.fromInstance(instance);
        PortalKey portalKey = portalDetector.detectPortalKey(instance, itemEntity.getPosition(), dimensionKey);
        if (portalKey == null) {
            return;
        }
        portalIndex.index(portalKey);

        Player player = findNearestPlayer(instance, itemEntity.getPosition());
        if (player == null) {
            return;
        }

        String bookText = buildBookText(stack);
        if (bookText.isBlank()) {
            return;
        }

        processedItems.add(itemEntity.getUuid());
        itemEntity.remove();

        List<BiomeSlot> biomes = new ArrayList<>();
        Map<Integer, PaletteDefinition> palettes = new LinkedHashMap<>();
        ShellType shellType = resolveShellType(dimensionKey);
        ResolvedDimensionKey resolved = dimensionService.resolveKey(bookText);
        long seed = resolved.seed();
        String dimensionId = resolved.dimensionId();
        DimensionKey destinationKey = new DimensionKey(dimensionId);

        if (resolved.type() != ResolvedDimensionType.CUSTOM) {
            List<BiomeTemplateId> chosen = BiomeSubsetPicker.pickSubset(shellType, seed);
            Random random = new Random(seed ^ 0x9E3779B97F4A7C15L);
            int slot = 1;
            for (BiomeTemplateId template : chosen) {
                BiomeTemplateSelection selection = BiomeTemplatePicker.resolveSelection(shellType, template, random, slot);
                biomes.add(new BiomeSlot(selection.templateId(), selection.overlayId(), slot));
                palettes.put(slot, buildPaletteForSlot(shellType, seed, slot));
                slot++;
            }
        }

        UUID linkId = UUID.randomUUID();
        Pos sourceCenter = portalCenter(portalKey);
        CompletableFuture<InstanceContainer> instanceFuture = resolved.type() == ResolvedDimensionType.CUSTOM
            ? dimensionService.createOrResolveInstanceById(dimensionId)
            : dimensionService.createOrResolveInstance(bookText, shellType, biomes, palettes);

        instanceFuture
            .thenCompose(destInstance -> ensureDestinationPortal(destInstance, destinationKey, sourceCenter,
                portalKey.axis(), null, true))
            .thenAccept(destinationPortal -> {
                Pos destinationCenter = portalCenter(destinationPortal);
                DestinationRef forwardDestination = new DestinationRef(destinationKey,
                    destinationCenter.x(),
                    destinationCenter.y(),
                    destinationCenter.z(),
                    0f,
                    0f,
                    destinationPortal);
                PortalLink forwardLink = new PortalLink(LinkType.BOOK_LINKED, linkId, forwardDestination);
                portalRegistry.putLink(portalKey, forwardLink);

                DestinationRef reverseDestination = new DestinationRef(portalKey.dimension(),
                    sourceCenter.x(),
                    sourceCenter.y(),
                    sourceCenter.z(),
                    0f,
                    0f,
                    portalKey);
                PortalLink reverseLink = new PortalLink(LinkType.BOOK_LINKED, linkId, reverseDestination);
                portalRegistry.putLink(destinationPortal, reverseLink);
                portalRegistry.save();
            })
            .exceptionally(error -> {
                logger.error("[PortalRouter] Failed to prepare destination instance for book link", error);
                return null;
            });
    }

    private PortalLink migrateLegacyBinding(PortalKey portalKey) {
        LegacyKey legacyKey = new LegacyKey(portalKey.dimension().id(), portalKey.legacyX(), portalKey.legacyZ());
        LegacyLink legacy = portalRegistry.getLegacy(legacyKey);
        if (legacy == null) {
            return null;
        }

        DimensionKey destination = new DimensionKey(legacy.toDimension());
        Pos center = portalCenter(portalKey);
        DestinationRef dest = new DestinationRef(destination, center.x(), center.y(), center.z(), 0f, 0f);
        PortalLink migrated = new PortalLink(LinkType.BOOK_LINKED, UUID.randomUUID(), dest);
        portalRegistry.putLink(portalKey, migrated);
        portalRegistry.removeLegacy(legacyKey);
        portalRegistry.save();
        logger.info("[PortalRouter] Migrated legacy binding for {}", portalKey.dimension().id());
        return migrated;
    }

    private void routeLinked(Player player, PortalKey sourcePortal, PortalLink link) {
        DestinationRef destination = link.destination();
        DimensionKey destinationKey = destination.dimension();
        PortalAxis axis = sourcePortal.axis();
        Pos preferredPos = new Pos(destination.x(), destination.y(), destination.z(), destination.yaw(), destination.pitch());

        CompletableFuture<InstanceContainer> instanceFuture;
        if (DimensionKeys.isCustom(destinationKey)) {
            instanceFuture = dimensionService.createOrResolveInstanceById(destinationKey.id());
        } else {
            InstanceContainer baseInstance = resolveBaseInstance(destinationKey.id());
            if (baseInstance == null) {
                logger.warn("[PortalRouter] Base instance not found for {}", destinationKey.id());
                return;
            }
            instanceFuture = CompletableFuture.completedFuture(baseInstance);
        }

        instanceFuture
            .thenCompose(instance -> ensureDestinationPortal(instance, destinationKey, preferredPos, axis,
                destination.portalKey(), true)
                .thenApply(portalKey -> new PortalTravel(instance, portalKey)))
            .thenAccept(travel -> {
                if (destination.portalKey() == null && travel.portalKey() != null) {
                    DestinationRef updatedDestination = new DestinationRef(destinationKey,
                        destination.x(),
                        destination.y(),
                        destination.z(),
                        destination.yaw(),
                        destination.pitch(),
                        travel.portalKey());
                    portalRegistry.putLink(sourcePortal, new PortalLink(link.type(), link.linkId(), updatedDestination));
                    portalRegistry.save();
                }
                teleportToPortal(player, travel.instance(), travel.portalKey(), destination);
            })
            .exceptionally(error -> {
                logger.error("[PortalRouter] Failed to resolve portal travel to {}",
                    destinationKey.id(), error);
                return null;
            });
    }

    private void routeDefault(Player player, PortalKey portalKey) {
        DimensionKey from = portalKey.dimension();
        DimensionKey destination;
        if (DimensionKeys.OVERWORLD.equals(from.id())) {
            destination = new DimensionKey(DimensionKeys.NETHER);
        } else {
            destination = new DimensionKey(DimensionKeys.OVERWORLD);
        }
        InstanceContainer baseInstance = resolveBaseInstance(destination.id());
        if (baseInstance == null) {
            logger.warn("[PortalRouter] Base instance not found for {}", destination.id());
            return;
        }
        Pos preferred = portalCenter(portalKey);
        ensureDestinationPortal(baseInstance, destination, preferred, portalKey.axis(), null, true)
            .thenAccept(destinationPortal -> teleportToPortal(player, baseInstance, destinationPortal, null))
            .exceptionally(error -> {
                logger.error("[PortalRouter] Failed to resolve default portal travel to {}", destination.id(), error);
                return null;
            });
    }

    private void teleportToPortal(Player player, InstanceContainer instance, PortalKey portalKey, DestinationRef destination) {
        Pos center = portalCenter(portalKey);
        float yaw = destination != null ? destination.yaw() : 0f;
        float pitch = destination != null ? destination.pitch() : 0f;
        Pos target = new Pos(center.x(), center.y(), center.z(), yaw, pitch);
        dimensionService.teleportToInstanceExact(instance, player, target);
    }

    private void onBlockUpdate(InstanceBlockUpdateEvent event) {
        Instance instance = event.getInstance();
        DimensionKey dimensionKey = DimensionKeys.fromInstance(instance);
        int x = event.getBlockPosition().blockX();
        int y = event.getBlockPosition().blockY();
        int z = event.getBlockPosition().blockZ();

        Block updatedBlock = event.getBlock();
        if (isPortalBlock(updatedBlock)) {
            PortalKey portalKey = portalDetector.detectPortalKey(instance, event.getBlockPosition(), dimensionKey);
            if (portalKey != null) {
                portalIndex.index(portalKey);
            }
            return;
        }

        PortalKey candidate = findPortalKeyContainingBlock(dimensionKey, x, y, z);
        if (candidate == null) {
            return;
        }
        if (portalExists(instance, candidate)) {
            portalIndex.index(candidate);
            return;
        }
        portalRegistry.removeLink(candidate);
        portalIndex.remove(candidate);
        portalRegistry.save();
        logger.info("[PortalRouter] Removed portal binding for {} at {} {} {}",
            candidate.dimension().id(), candidate.min().x(), candidate.min().y(), candidate.min().z());
    }

    private CompletableFuture<PortalKey> ensureDestinationPortal(InstanceContainer instance,
                                                                 DimensionKey dimensionKey,
                                                                 Pos preferredPos,
                                                                 PortalAxis axis,
                                                                 PortalKey preferredPortal,
                                                                 boolean allowReuse) {
        if (preferredPortal != null) {
            return ensureSpecificPortal(instance, preferredPortal);
        }
        List<ChunkCoord> chunks = gatherNeighborChunks(preferredPos);
        CompletableFuture<Void> loaded = loadChunks(instance, chunks, preferredPos);
        CompletableFuture<PortalKey> result = new CompletableFuture<>();
        loaded.whenComplete((unused, error) -> {
            if (error != null) {
                result.completeExceptionally(error);
                return;
            }
            MinecraftServer.getSchedulerManager().scheduleNextTick(() -> {
                PortalKey reusable = allowReuse ? findReusablePortal(instance, dimensionKey, chunks) : null;
                if (reusable != null) {
                    logger.debug("[PortalRouter] Reusing destination portal {} in {}", reusable.axis(), dimensionKey.id());
                    result.complete(reusable);
                    return;
                }
                PortalKey created = createPortalAt(instance, dimensionKey, preferredPos, axis);
                logger.info("[PortalRouter] Created destination portal {} in {}", created.axis(), dimensionKey.id());
                result.complete(created);
            });
        });
        return result;
    }

    private CompletableFuture<PortalKey> ensureSpecificPortal(InstanceContainer instance, PortalKey portalKey) {
        List<ChunkCoord> chunks = gatherPortalChunks(portalKey);
        Pos anchor = new Pos(portalKey.min().x(), portalKey.min().y(), portalKey.min().z());
        CompletableFuture<Void> loaded = loadChunks(instance, chunks, anchor);
        CompletableFuture<PortalKey> result = new CompletableFuture<>();
        loaded.whenComplete((unused, error) -> {
            if (error != null) {
                result.completeExceptionally(error);
                return;
            }
            MinecraftServer.getSchedulerManager().scheduleNextTick(() -> {
                if (!portalExists(instance, portalKey)) {
                    logger.info("[PortalRouter] Rebuilding missing portal in {}", portalKey.dimension().id());
                    buildPortalFromKey(instance, portalKey);
                }
                portalIndex.index(portalKey);
                result.complete(portalKey);
            });
        });
        return result;
    }

    private CompletableFuture<Void> loadChunks(InstanceContainer instance, List<ChunkCoord> chunks, Pos anchor) {
        List<CompletableFuture<?>> futures = new ArrayList<>();
        for (ChunkCoord chunk : chunks) {
            int blockX = chunk.x() << 4;
            int blockZ = chunk.z() << 4;
            futures.add(instance.loadChunk(new Pos(blockX + 8, anchor.y(), blockZ + 8)));
        }
        return CompletableFuture.allOf(futures.toArray(new CompletableFuture[0]));
    }

    private List<ChunkCoord> gatherNeighborChunks(Pos preferredPos) {
        int chunkX = Math.floorDiv(preferredPos.blockX(), 16);
        int chunkZ = Math.floorDiv(preferredPos.blockZ(), 16);
        List<ChunkCoord> coords = new ArrayList<>();
        for (int dx = -1; dx <= 1; dx++) {
            for (int dz = -1; dz <= 1; dz++) {
                coords.add(new ChunkCoord(chunkX + dx, chunkZ + dz));
            }
        }
        return coords;
    }

    private List<ChunkCoord> gatherPortalChunks(PortalKey portalKey) {
        int minChunkX = Math.floorDiv(portalKey.min().x(), 16);
        int maxChunkX = Math.floorDiv(portalKey.max().x(), 16);
        int minChunkZ = Math.floorDiv(portalKey.min().z(), 16);
        int maxChunkZ = Math.floorDiv(portalKey.max().z(), 16);
        List<ChunkCoord> coords = new ArrayList<>();
        for (int chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
            for (int chunkZ = minChunkZ; chunkZ <= maxChunkZ; chunkZ++) {
                coords.add(new ChunkCoord(chunkX, chunkZ));
            }
        }
        return coords;
    }

    private PortalKey findReusablePortal(Instance instance, DimensionKey dimensionKey, List<ChunkCoord> chunks) {
        PortalKey indexed = findReusableIndexedPortal(instance, dimensionKey, chunks);
        if (indexed != null) {
            logger.debug("[PortalRouter] Reuse candidate found via index in {}", dimensionKey.id());
            return indexed;
        }

        DimensionType dimensionType = instance.getCachedDimensionType();
        int minY = dimensionType != null ? dimensionType.minY() : DimensionType.VANILLA_MIN_Y;
        int maxY = dimensionType != null ? dimensionType.maxY() : DimensionType.VANILLA_MAX_Y;
        Set<Vec3i> visited = new HashSet<>();

        for (ChunkCoord chunk : chunks) {
            int startX = chunk.x() << 4;
            int startZ = chunk.z() << 4;
            for (int x = startX; x < startX + 16; x++) {
                for (int z = startZ; z < startZ + 16; z++) {
                    for (int y = minY; y <= maxY; y++) {
                        Vec3i pos = new Vec3i(x, y, z);
                        if (visited.contains(pos)) {
                            continue;
                        }
                        if (!isPortalBlock(instance, x, y, z)) {
                            continue;
                        }
                        PortalKey key = portalDetector.detectPortalKey(instance, new Pos(x, y, z), dimensionKey);
                        if (key == null) {
                            visited.add(pos);
                            continue;
                        }
                        markPortalVisited(visited, key);
                        portalIndex.index(key);
                        PortalLink link = portalRegistry.getLink(key);
                        if (link == null || link.type() == LinkType.DEFAULT) {
                            logger.debug("[PortalRouter] Reuse candidate found via scan in {}", dimensionKey.id());
                            return key;
                        }
                    }
                }
            }
        }
        return null;
    }

    private PortalKey findReusableIndexedPortal(Instance instance, DimensionKey dimensionKey, List<ChunkCoord> chunks) {
        for (ChunkCoord chunk : chunks) {
            long chunkKey = PortalIndex.chunkKey(chunk.x(), chunk.z());
            for (PortalKey key : portalIndex.get(dimensionKey, chunkKey)) {
                if (!portalExists(instance, key)) {
                    portalIndex.remove(key);
                    portalRegistry.removeLink(key);
                    portalRegistry.save();
                    logger.info("[PortalRouter] Dropped stale portal binding for {} at {} {} {}",
                        key.dimension().id(), key.min().x(), key.min().y(), key.min().z());
                    continue;
                }
                PortalLink link = portalRegistry.getLink(key);
                if (link == null || link.type() == LinkType.DEFAULT) {
                    return key;
                }
            }
        }
        return null;
    }

    private boolean portalExists(Instance instance, PortalKey portalKey) {
        Vec3i min = portalKey.min();
        if (!isPortalBlock(instance, min.x(), min.y(), min.z())) {
            return false;
        }
        PortalKey detected = portalDetector.detectPortalKey(instance, new Pos(min.x(), min.y(), min.z()),
            portalKey.dimension());
        return portalKey.equals(detected);
    }

    private boolean isPortalBlock(Instance instance, int x, int y, int z) {
        try {
            return NETHER_PORTAL.equals(instance.getBlock(x, y, z).key().asString());
        } catch (Exception ignored) {
            return false;
        }
    }

    private boolean isPortalBlock(Block block) {
        if (block == null) {
            return false;
        }
        return NETHER_PORTAL.equals(block.key().asString());
    }

    private PortalKey findPortalKeyContainingBlock(DimensionKey dimensionKey, int x, int y, int z) {
        long chunkKey = PortalIndex.chunkKey(PortalIndex.chunkCoord(x), PortalIndex.chunkCoord(z));
        for (PortalKey key : portalIndex.get(dimensionKey, chunkKey)) {
            if (containsPortalBlock(key, x, y, z)) {
                return key;
            }
        }
        for (PortalKey key : portalRegistry.links().keySet()) {
            if (!key.dimension().equals(dimensionKey)) {
                continue;
            }
            if (containsPortalBlock(key, x, y, z)) {
                return key;
            }
        }
        return null;
    }

    private boolean containsPortalBlock(PortalKey key, int x, int y, int z) {
        Vec3i min = key.min();
        Vec3i max = key.max();
        if (key.axis() == PortalAxis.Z) {
            return z == min.z()
                && x >= min.x() && x <= max.x()
                && y >= min.y() && y <= max.y();
        }
        return x == min.x()
            && z >= min.z() && z <= max.z()
            && y >= min.y() && y <= max.y();
    }

    private void markPortalVisited(Set<Vec3i> visited, PortalKey portalKey) {
        Vec3i min = portalKey.min();
        Vec3i max = portalKey.max();
        if (portalKey.axis() == PortalAxis.Z) {
            for (int x = min.x(); x <= max.x(); x++) {
                for (int y = min.y(); y <= max.y(); y++) {
                    visited.add(new Vec3i(x, y, min.z()));
                }
            }
            return;
        }
        for (int z = min.z(); z <= max.z(); z++) {
            for (int y = min.y(); y <= max.y(); y++) {
                visited.add(new Vec3i(min.x(), y, z));
            }
        }
    }

    private PortalKey createPortalAt(InstanceContainer instance, DimensionKey dimensionKey, Pos preferredPos, PortalAxis axis) {
        DimensionType dimensionType = instance.getCachedDimensionType();
        int minY = dimensionType != null ? dimensionType.minY() : DimensionType.VANILLA_MIN_Y;
        int maxY = dimensionType != null ? dimensionType.maxY() : DimensionType.VANILLA_MAX_Y;

        int centerX = (int) Math.round(preferredPos.x());
        int centerZ = (int) Math.round(preferredPos.z());
        int baseY = preferredPos.blockY();
        baseY = Math.max(minY + 1, Math.min(baseY, maxY - 4));

        int baseX = axis == PortalAxis.Z ? centerX - 1 : centerX;
        int baseZ = axis == PortalAxis.X ? centerZ - 1 : centerZ;

        PortalKey portalKey = buildPortal(instance, dimensionKey, axis, baseX, baseY, baseZ, 2, 3);
        portalIndex.index(portalKey);
        return portalKey;
    }

    private PortalKey buildPortal(InstanceContainer instance,
                                  DimensionKey dimensionKey,
                                  PortalAxis axis,
                                  int baseX,
                                  int baseY,
                                  int baseZ,
                                  int width,
                                  int height) {
        Block portalBlock = portalBlock(axis);
        if (axis == PortalAxis.Z) {
            int minX = baseX;
            int maxX = baseX + width - 1;
            int minY = baseY;
            int maxY = baseY + height - 1;
            int z = baseZ;
            for (int x = minX - 1; x <= maxX + 1; x++) {
                for (int y = minY - 1; y <= maxY + 1; y++) {
                    boolean frame = x == minX - 1 || x == maxX + 1 || y == minY - 1 || y == maxY + 1;
                    instance.setBlock(x, y, z, frame ? Block.OBSIDIAN : portalBlock);
                }
            }
            return PortalKey.normalize(dimensionKey, axis,
                new Vec3i(minX, minY, z),
                new Vec3i(maxX, maxY, z));
        }

        int minZ = baseZ;
        int maxZ = baseZ + width - 1;
        int minY = baseY;
        int maxY = baseY + height - 1;
        int x = baseX;
        for (int z = minZ - 1; z <= maxZ + 1; z++) {
            for (int y = minY - 1; y <= maxY + 1; y++) {
                boolean frame = z == minZ - 1 || z == maxZ + 1 || y == minY - 1 || y == maxY + 1;
                instance.setBlock(x, y, z, frame ? Block.OBSIDIAN : portalBlock);
            }
        }
        return PortalKey.normalize(dimensionKey, axis,
            new Vec3i(x, minY, minZ),
            new Vec3i(x, maxY, maxZ));
    }

    private void buildPortalFromKey(InstanceContainer instance, PortalKey portalKey) {
        Vec3i min = portalKey.min();
        Vec3i max = portalKey.max();
        Block portalBlock = portalBlock(portalKey.axis());
        if (portalKey.axis() == PortalAxis.Z) {
            for (int x = min.x() - 1; x <= max.x() + 1; x++) {
                for (int y = min.y() - 1; y <= max.y() + 1; y++) {
                    boolean frame = x == min.x() - 1 || x == max.x() + 1 || y == min.y() - 1 || y == max.y() + 1;
                    instance.setBlock(x, y, min.z(), frame ? Block.OBSIDIAN : portalBlock);
                }
            }
            return;
        }
        for (int z = min.z() - 1; z <= max.z() + 1; z++) {
            for (int y = min.y() - 1; y <= max.y() + 1; y++) {
                boolean frame = z == min.z() - 1 || z == max.z() + 1 || y == min.y() - 1 || y == max.y() + 1;
                instance.setBlock(min.x(), y, z, frame ? Block.OBSIDIAN : portalBlock);
            }
        }
        portalIndex.index(portalKey);
    }

    private Block portalBlock(PortalAxis axis) {
        String portalAxis = axis == PortalAxis.Z ? "x" : "z";
        return Block.NETHER_PORTAL.withProperty("axis", portalAxis);
    }

    private InstanceContainer resolveBaseInstance(String dimensionKey) {
        InstanceManager manager = MinecraftServer.getInstanceManager();
        return BaseWorldRegistry.resolve(manager, dimensionKey);
    }

    private boolean isOnCooldown(Player player) {
        Long last = playerTeleportCooldowns.get(player.getUuid());
        if (last == null) {
            return false;
        }
        return System.currentTimeMillis() - last < TELEPORT_COOLDOWN_MS;
    }

    private Player findNearestPlayer(Instance instance, Point position) {
        Player best = null;
        double bestDistance = Double.MAX_VALUE;
        for (Entity entity : instance.getNearbyEntities(position, PLAYER_SEARCH_RADIUS)) {
            if (entity instanceof Player player) {
                double distance = player.getPosition().distanceSquared(position);
                if (distance < bestDistance) {
                    bestDistance = distance;
                    best = player;
                }
            }
        }
        return best;
    }

    private Pos portalCenter(PortalKey portalKey) {
        double centerX = (portalKey.min().x() + portalKey.max().x()) / 2.0 + 0.5;
        double centerZ = (portalKey.min().z() + portalKey.max().z()) / 2.0 + 0.5;
        double centerY = portalKey.min().y() + 1.0;
        return new Pos(centerX, centerY, centerZ);
    }

    private ShellType resolveShellType(DimensionKey fromDimension) {
        if (DimensionKeys.NETHER.equals(fromDimension.id())) {
            return ShellType.NETHER_CAVERN;
        }
        if (DimensionKeys.END.equals(fromDimension.id())) {
            return ShellType.END_ISLANDS;
        }
        return ShellType.OVERWORLD_OPEN;
    }

    private boolean isBook(ItemStack stack) {
        if (stack == null || stack.isAir()) {
            return false;
        }
        Material material = stack.material();
        if (material == Material.WRITTEN_BOOK || material == Material.WRITABLE_BOOK) {
            return true;
        }
        return stack.get(DataComponents.WRITTEN_BOOK_CONTENT) != null
            || stack.get(DataComponents.WRITABLE_BOOK_CONTENT) != null;
    }

    private String buildBookText(ItemStack stack) {
        WrittenBookContent written = stack.get(DataComponents.WRITTEN_BOOK_CONTENT);
        if (written != null) {
            String pages = joinWrittenPages(written.pages());
            if (!pages.isBlank()) {
                return pages;
            }
            String title = written.title().text();
            return title == null ? "" : title;
        }

        WritableBookContent writable = stack.get(DataComponents.WRITABLE_BOOK_CONTENT);
        if (writable != null) {
            return joinWritablePages(writable.pages());
        }

        return "";
    }

    private String joinWrittenPages(List<FilteredText<Component>> pages) {
        if (pages == null || pages.isEmpty()) {
            return "";
        }
        PlainTextComponentSerializer serializer = PlainTextComponentSerializer.plainText();
        StringBuilder builder = new StringBuilder();
        for (FilteredText<Component> page : pages) {
            if (page == null || page.text() == null) {
                continue;
            }
            builder.append(serializer.serialize(page.text()));
        }
        return builder.toString();
    }

    private String joinWritablePages(List<FilteredText<String>> pages) {
        if (pages == null || pages.isEmpty()) {
            return "";
        }
        StringBuilder builder = new StringBuilder();
        for (FilteredText<String> page : pages) {
            if (page == null || page.text() == null) {
                continue;
            }
            builder.append(page.text());
        }
        return builder.toString();
    }

    private PaletteDefinition buildPaletteForSlot(ShellType shellType, long seed, int slot) {
        List<String> surface;
        List<String> stone;
        List<String> liquid;

        switch (shellType) {
            case NETHER_CAVERN -> {
                surface = NETHER_SURFACE;
                stone = NETHER_STONE;
                liquid = NETHER_LIQUID;
            }
            case END_ISLANDS -> {
                surface = END_SURFACE;
                stone = END_STONE;
                liquid = List.of();
            }
            case SUPERFLAT, OVERWORLD_OPEN -> {
                surface = OVERWORLD_SURFACE;
                stone = OVERWORLD_STONE;
                liquid = OVERWORLD_LIQUID;
            }
            default -> {
                surface = OVERWORLD_SURFACE;
                stone = OVERWORLD_STONE;
                liquid = OVERWORLD_LIQUID;
            }
        }

        String surfaceBlock = pickFromSeed(seed, slot, 11, surface);
        String stoneBlock = pickFromSeed(seed, slot, 23, stone);
        String liquidBlock = liquid.isEmpty() ? null : pickFromSeed(seed, slot, 37, liquid);
        return new PaletteDefinition(surfaceBlock, null, stoneBlock, liquidBlock);
    }

    private String pickFromSeed(long seed, int slot, int salt, List<String> options) {
        if (options.isEmpty()) {
            return "minecraft:stone";
        }
        int value = (int) seed;
        value ^= slot * 0x9E3779B9;
        value ^= salt * 0x85EBCA6B;
        value = value * 1664525 + 1013904223;
        int index = Math.floorMod(value, options.size());
        return options.get(index);
    }

    private record PortalTravel(InstanceContainer instance, PortalKey portalKey) {
    }

    private record ChunkCoord(int x, int z) {
    }
}
