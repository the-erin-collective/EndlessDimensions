package com.moud.endlessdimensions;

import com.moud.endlessdimensions.generation.DimensionFactory;
import com.moud.endlessdimensions.generation.DimensionRegistry;
import com.moud.endlessdimensions.generation.DimensionDefinitionService;
import com.moud.endlessdimensions.generation.DimensionService;
import com.moud.endlessdimensions.generation.CustomDimensionRegistry;
import com.moud.endlessdimensions.generation.DimensionKeyResolver;
import com.moud.endlessdimensions.generation.EasterEggCatalog;
import com.moud.endlessdimensions.generation.PackFactory;
import com.moud.endlessdimensions.generation.TerraIntegration;
import endless.bridge.registry.BridgeRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.nio.file.Path;
import java.nio.file.Files;

public class EndlessBridgePlugin {
    private static final Logger logger = LoggerFactory.getLogger(EndlessBridgePlugin.class);
    private static EndlessFacade facade;
    private static DimensionRegistry dimensionRegistry;
    private static CustomDimensionRegistry customRegistry;
    private static DimensionKeyResolver keyResolver;
    private static EasterEggCatalog easterEggCatalog;
    private static DimensionDefinitionService definitionService;
    private static DimensionService dimensionService;
    private static PackFactory packFactory;
    private static TerraIntegration terraIntegration;
    private static DimensionFactory dimensionFactory;
    private static boolean initialized = false;

    static {
        try {
            logger.info("[EndlessBridgePlugin] Static initialization - registering facade...");
            facade = new EndlessFacade();
            BridgeRegistry.register("Endless", facade);
            initialized = true;
            logger.info("[EndlessBridgePlugin] Facade registered in BridgeRegistry");
        } catch (Exception e) {
            logger.error("[EndlessBridgePlugin] Failed to register facade", e);
        }
    }

    public void initialize(Object context) {
        logger.info("[EndlessBridgePlugin] Initialize called");
        if (context instanceof Path dataDir) {
            Path pluginDataDir = dataDir.resolve("plugin-data");
            dimensionRegistry = new DimensionRegistry(pluginDataDir, logger);
            ensurePackDirectories(pluginDataDir);
            try {
                dimensionRegistry.loadAll();
            } catch (Exception e) {
                logger.error("[EndlessBridgePlugin] Failed to load dimension registry", e);
            }
            customRegistry = new CustomDimensionRegistry(pluginDataDir, logger);
            customRegistry.load();
            easterEggCatalog = new EasterEggCatalog();
            keyResolver = new DimensionKeyResolver(customRegistry, easterEggCatalog);
            definitionService = new DimensionDefinitionService(dimensionRegistry, customRegistry, keyResolver, logger);
            Path templatesRoot = dataDir.resolve("templates");
            if (!Files.exists(templatesRoot)) {
                logger.warn("[EndlessBridgePlugin] Missing templates directory: {}", templatesRoot);
            }
            packFactory = new PackFactory(templatesRoot, pluginDataDir.resolve("terra-packs"));
            terraIntegration = new TerraIntegration(logger);
            dimensionFactory = new DimensionFactory(packFactory, terraIntegration, logger);
            dimensionService = new DimensionService(definitionService, packFactory, dimensionFactory, logger);
        } else {
            logger.warn("[EndlessBridgePlugin] No data directory provided; skipping dimension registry load");
        }
    }

    public void shutdown() {
        try {
            logger.info("[EndlessBridgePlugin] Shutting down...");
            if (dimensionService != null) {
                dimensionService.shutdown();
            }
            BridgeRegistry.unregister("Endless");
            initialized = false;
        } catch (Exception e) {
            logger.error("[EndlessBridgePlugin] Error during shutdown", e);
        }
    }

    public static boolean isInitialized() {
        return initialized;
    }

    public static EndlessFacade getFacade() {
        return facade;
    }

    public static DimensionRegistry getDimensionRegistry() {
        return dimensionRegistry;
    }

    public static CustomDimensionRegistry getCustomRegistry() {
        return customRegistry;
    }

    public static DimensionKeyResolver getKeyResolver() {
        return keyResolver;
    }

    public static EasterEggCatalog getEasterEggCatalog() {
        return easterEggCatalog;
    }

    public static DimensionDefinitionService getDefinitionService() {
        return definitionService;
    }

    public static DimensionService getDimensionService() {
        return dimensionService;
    }

    public static PackFactory getPackFactory() {
        return packFactory;
    }

    public static TerraIntegration getTerraIntegration() {
        return terraIntegration;
    }

    public static DimensionFactory getDimensionFactory() {
        return dimensionFactory;
    }

    private void ensurePackDirectories(Path pluginDataDir) {
        try {
            java.nio.file.Files.createDirectories(pluginDataDir.resolve("dimensions"));
            java.nio.file.Files.createDirectories(pluginDataDir.resolve("terra-packs"));
        } catch (Exception e) {
            logger.warn("[EndlessBridgePlugin] Failed to ensure plugin data directories", e);
        }
    }
}
