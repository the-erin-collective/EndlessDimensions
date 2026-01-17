package com.moud.endlessdimensions.generation;

import com.dfsek.terra.api.config.ConfigPack;
import net.minestom.server.MinecraftServer;
import net.minestom.server.coordinate.Pos;
import net.minestom.server.entity.Player;
import net.minestom.server.instance.InstanceContainer;
import net.minestom.server.instance.block.Block;
import net.minestom.server.world.DimensionType;
import org.slf4j.Logger;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class DimensionService {
    private final DimensionDefinitionService definitionService;
    private final PackFactory packFactory;
    private final DimensionFactory dimensionFactory;
    private final Logger logger;
    private final ExecutorService packExecutor;
    private final Map<String, CompletableFuture<InstanceContainer>> inFlight = new ConcurrentHashMap<>();
    private final Map<String, InstanceContainer> instances = new ConcurrentHashMap<>();

    public DimensionService(DimensionDefinitionService definitionService,
                            PackFactory packFactory,
                            DimensionFactory dimensionFactory,
                            Logger logger) {
        this.definitionService = Objects.requireNonNull(definitionService, "definitionService");
        this.packFactory = Objects.requireNonNull(packFactory, "packFactory");
        this.dimensionFactory = Objects.requireNonNull(dimensionFactory, "dimensionFactory");
        this.logger = Objects.requireNonNull(logger, "logger");
        this.packExecutor = Executors.newSingleThreadExecutor(runnable -> {
            Thread thread = new Thread(runnable, "endless-pack-builder");
            thread.setDaemon(true);
            return thread;
        });
    }

    public CompletableFuture<InstanceContainer> createOrResolveInstance(String bookText,
                                                                        ShellType shellType,
                                                                        List<BiomeSlot> biomes,
                                                                        Map<Integer, PaletteDefinition> palettes) {
        Objects.requireNonNull(bookText, "bookText");
        Objects.requireNonNull(shellType, "shellType");
        Objects.requireNonNull(biomes, "biomes");
        Objects.requireNonNull(palettes, "palettes");

        ResolvedDimensionKey resolved = definitionService.resolveKey(bookText);
        String dimensionId = resolved.dimensionId();
        InstanceContainer existing = instances.get(dimensionId);
        if (existing != null) {
            logger.debug("[DimensionService] action=instance_cached dimensionId={}", dimensionId);
            return CompletableFuture.completedFuture(existing);
        }
        CompletableFuture<InstanceContainer> inflightExisting = inFlight.get(dimensionId);
        if (inflightExisting != null) {
            logger.debug("[DimensionService] action=instance_inflight dimensionId={}", dimensionId);
            return inflightExisting;
        }

        logger.info("[DimensionService] action=resolve_start dimensionId={} shellType={} type={}",
            dimensionId, shellType, resolved.type());
        return inFlight.computeIfAbsent(dimensionId, key -> {
            CompletableFuture<InstanceContainer> future = new CompletableFuture<>();
            future.whenComplete((instance, error) -> inFlight.remove(key, future));

            packExecutor.execute(() -> {
                DimensionDefinition definition;
                try {
                    definition = definitionService.resolveForResolvedKey(resolved, shellType, biomes, palettes);
                } catch (IOException e) {
                    future.completeExceptionally(e);
                    return;
                }

                ConfigPack pack;
                try {
                    logger.debug("[DimensionService] action=pack_build_start dimensionId={}", definition.dimensionId());
                    pack = packFactory.buildPack(definition);
                    logger.debug("[DimensionService] action=pack_build_complete dimensionId={}", definition.dimensionId());
                } catch (IOException e) {
                    logger.error("[DimensionService] Failed to build pack for {}", definition.dimensionId(), e);
                    future.completeExceptionally(e);
                    return;
                }

                // Pack build happens off-thread; instance attach happens on the main thread.
                MinecraftServer.getSchedulerManager().scheduleNextTick(() -> {
                    try {
                        InstanceContainer instance = dimensionFactory.createInstance(definition, pack);
                        instances.putIfAbsent(dimensionId, instance);
                        future.complete(instance);
                    } catch (Exception e) {
                        logger.error("[DimensionService] Failed to create instance for {}", definition.dimensionId(), e);
                        future.completeExceptionally(e);
                    }
                });
            });

            return future;
        });
    }

    public CompletableFuture<InstanceContainer> createOrResolveInstanceById(String dimensionId) {
        Objects.requireNonNull(dimensionId, "dimensionId");
        InstanceContainer existing = instances.get(dimensionId);
        if (existing != null) {
            logger.debug("[DimensionService] action=instance_cached dimensionId={}", dimensionId);
            return CompletableFuture.completedFuture(existing);
        }
        CompletableFuture<InstanceContainer> inflightExisting = inFlight.get(dimensionId);
        if (inflightExisting != null) {
            logger.debug("[DimensionService] action=instance_inflight dimensionId={}", dimensionId);
            return inflightExisting;
        }
        DimensionDefinition definition = definitionService.get(dimensionId);
        if (definition == null) {
            CompletableFuture<InstanceContainer> future = new CompletableFuture<>();
            future.completeExceptionally(new IllegalStateException("Unknown dimensionId: " + dimensionId));
            return future;
        }
        return createOrResolveInstance(definition);
    }

    public ResolvedDimensionKey resolveKey(String bookText) {
        return definitionService.resolveKey(bookText);
    }

    public CompletableFuture<InstanceContainer> createOrResolveInstanceAndTeleportById(String dimensionId,
                                                                                       Player player,
                                                                                       Pos spawnPosition) {
        Objects.requireNonNull(player, "player");
        Objects.requireNonNull(spawnPosition, "spawnPosition");
        CompletableFuture<InstanceContainer> future = createOrResolveInstanceById(dimensionId);
        future.thenAccept(instance -> scheduleTeleport(instance, player, spawnPosition));
        return future;
    }

    public CompletableFuture<InstanceContainer> createOrResolveInstanceAndTeleport(String bookText,
                                                                                   ShellType shellType,
                                                                                   List<BiomeSlot> biomes,
                                                                                   Map<Integer, PaletteDefinition> palettes,
                                                                                   Player player,
                                                                                   Pos spawnPosition) {
        Objects.requireNonNull(player, "player");
        Objects.requireNonNull(spawnPosition, "spawnPosition");

        CompletableFuture<InstanceContainer> future = createOrResolveInstance(bookText, shellType, biomes, palettes);
        future.thenAccept(instance -> scheduleTeleport(instance, player, spawnPosition));
        return future;
    }

    public void teleportToInstance(InstanceContainer instance, Player player, Pos spawnPosition) {
        Objects.requireNonNull(instance, "instance");
        Objects.requireNonNull(player, "player");
        Objects.requireNonNull(spawnPosition, "spawnPosition");
        scheduleTeleport(instance, player, spawnPosition);
    }

    public void teleportToInstanceExact(InstanceContainer instance, Player player, Pos spawnPosition) {
        Objects.requireNonNull(instance, "instance");
        Objects.requireNonNull(player, "player");
        Objects.requireNonNull(spawnPosition, "spawnPosition");
        scheduleTeleportExact(instance, player, spawnPosition);
    }

    private CompletableFuture<InstanceContainer> createOrResolveInstance(DimensionDefinition definition) {
        String dimensionId = definition.dimensionId();
        InstanceContainer existing = instances.get(dimensionId);
        if (existing != null) {
            logger.debug("[DimensionService] action=instance_cached dimensionId={}", dimensionId);
            return CompletableFuture.completedFuture(existing);
        }
        CompletableFuture<InstanceContainer> inflightExisting = inFlight.get(dimensionId);
        if (inflightExisting != null) {
            logger.debug("[DimensionService] action=instance_inflight dimensionId={}", dimensionId);
            return inflightExisting;
        }
        logger.info("[DimensionService] action=resolve_start dimensionId={} shellType={}", dimensionId,
            definition.shellType());
        return inFlight.computeIfAbsent(dimensionId, key -> {
            CompletableFuture<InstanceContainer> future = new CompletableFuture<>();
            future.whenComplete((instance, error) -> inFlight.remove(key, future));

            packExecutor.execute(() -> {
                ConfigPack pack;
                try {
                    logger.debug("[DimensionService] action=pack_build_start dimensionId={}", definition.dimensionId());
                    pack = packFactory.buildPack(definition);
                    logger.debug("[DimensionService] action=pack_build_complete dimensionId={}", definition.dimensionId());
                } catch (IOException e) {
                    logger.error("[DimensionService] Failed to build pack for {}", definition.dimensionId(), e);
                    future.completeExceptionally(e);
                    return;
                }

                MinecraftServer.getSchedulerManager().scheduleNextTick(() -> {
                    try {
                        InstanceContainer instance = dimensionFactory.createInstance(definition, pack);
                        instances.putIfAbsent(dimensionId, instance);
                        future.complete(instance);
                    } catch (Exception e) {
                        logger.error("[DimensionService] Failed to create instance for {}", definition.dimensionId(), e);
                        future.completeExceptionally(e);
                    }
                });
            });

            return future;
        });
    }

    private void scheduleTeleport(InstanceContainer instance, Player player, Pos targetPosition) {
        MinecraftServer.getSchedulerManager().scheduleNextTick(() -> {
            instance.loadChunk(targetPosition).whenComplete((chunk, error) -> {
                if (error != null) {
                    logger.warn("[DimensionService] Failed to load target chunk for {}", player.getUsername(), error);
                }
                MinecraftServer.getSchedulerManager().scheduleNextTick(() -> {
                    Pos safePosition = resolveSafeSpawn(instance, targetPosition);
                    try {
                        player.setInstance(instance, safePosition);
                    } catch (Exception e) {
                        logger.error("[DimensionService] Failed to teleport player {} to {}",
                            player.getUsername(), instance, e);
                    }
                });
            });
        });
    }

    private void scheduleTeleportExact(InstanceContainer instance, Player player, Pos targetPosition) {
        MinecraftServer.getSchedulerManager().scheduleNextTick(() -> {
            instance.loadChunk(targetPosition).whenComplete((chunk, error) -> {
                if (error != null) {
                    logger.warn("[DimensionService] Failed to load target chunk for {}", player.getUsername(), error);
                }
                MinecraftServer.getSchedulerManager().scheduleNextTick(() -> {
                    try {
                        player.setInstance(instance, targetPosition);
                    } catch (Exception e) {
                        logger.error("[DimensionService] Failed to teleport player {} to {}",
                            player.getUsername(), instance, e);
                    }
                });
            });
        });
    }

    private Pos resolveSafeSpawn(InstanceContainer instance, Pos targetPosition) {
        DimensionType dimensionType = instance.getCachedDimensionType();
        int minY = dimensionType != null ? dimensionType.minY() : DimensionType.VANILLA_MIN_Y;
        int maxY = dimensionType != null ? dimensionType.maxY() : DimensionType.VANILLA_MAX_Y;
        int blockX = targetPosition.blockX();
        int blockZ = targetPosition.blockZ();
        int startY = Math.min(maxY - 2, Math.max(minY + 1, (int) Math.round(targetPosition.y())));

        for (int y = startY; y >= minY + 1; y--) {
            Block floor = instance.getBlock(blockX, y - 1, blockZ);
            Block body = instance.getBlock(blockX, y, blockZ);
            Block head = instance.getBlock(blockX, y + 1, blockZ);
            if (floor.isSolid() && body.isAir() && head.isAir()) {
                return new Pos(targetPosition.x(), y, targetPosition.z());
            }
        }

        double fallbackY = Math.max(minY + 1, Math.min(targetPosition.y(), maxY - 2));
        return new Pos(targetPosition.x(), fallbackY, targetPosition.z());
    }

    public void shutdown() {
        packExecutor.shutdown();
        try {
            if (!packExecutor.awaitTermination(2, java.util.concurrent.TimeUnit.SECONDS)) {
                packExecutor.shutdownNow();
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            packExecutor.shutdownNow();
        }
    }
}
