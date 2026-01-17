package com.moud.endlessdimensions;

import com.moud.endlessdimensions.portal.PortalRouter;
import net.minestom.server.extensions.Extension;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.io.InputStream;
import java.net.URISyntaxException;
import java.net.URL;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Enumeration;
import java.util.jar.JarEntry;
import java.util.jar.JarFile;
import java.util.stream.Stream;

public class EndlessBridgeExtension extends Extension {
    private static final Logger logger = LoggerFactory.getLogger(EndlessBridgeExtension.class);
    private EndlessBridgePlugin bridgePlugin;
    private PortalRouter portalRouter;

    @Override
    public void initialize() {
        logger.info("[EndlessBridgeExtension] Initializing...");
        try {
            syncPackagedResources();
            bridgePlugin = new EndlessBridgePlugin();
            bridgePlugin.initialize(getDataDirectory());
            if (EndlessBridgePlugin.getDimensionService() != null) {
                portalRouter = new PortalRouter(getEventNode(), EndlessBridgePlugin.getDimensionService(), getDataDirectory(), logger);
                portalRouter.register();
            } else {
                logger.warn("[EndlessBridgeExtension] DimensionService unavailable; portal router not started");
            }
            logger.info("[EndlessBridgeExtension] Initialized");
        } catch (Exception e) {
            logger.error("[EndlessBridgeExtension] Failed to initialize", e);
            throw new RuntimeException("Failed to initialize EndlessBridgeExtension", e);
        }
    }

    @Override
    public void terminate() {
        logger.info("[EndlessBridgeExtension] Terminating...");
        if (bridgePlugin != null) {
            try {
                if (portalRouter != null) {
                    portalRouter.shutdown();
                    portalRouter = null;
                }
                bridgePlugin.shutdown();
                logger.info("[EndlessBridgeExtension] Terminated");
            } catch (Exception e) {
                logger.error("[EndlessBridgeExtension] Error during termination", e);
            }
        }
    }

    private void syncPackagedResources() {
        Path dataDir = getDataDirectory();
        String[] roots = { "templates", "base-packs" };

        for (String root : roots) {
            Path targetRoot = dataDir.resolve(root);
            try {
                Files.createDirectories(targetRoot);
            } catch (IOException e) {
                logger.error("[EndlessBridgeExtension] Failed to create data dir {}", targetRoot, e);
                continue;
            }

            copyPackagedDirectory(root, targetRoot);
        }
    }

    private void copyPackagedDirectory(String resourceRoot, Path targetRoot) {
        URL location = getClass().getProtectionDomain().getCodeSource().getLocation();
        if (location == null) {
            logger.warn("[EndlessBridgeExtension] No code source for packaged resources");
            return;
        }

        Path sourcePath;
        try {
            sourcePath = Paths.get(location.toURI());
        } catch (URISyntaxException e) {
            logger.warn("[EndlessBridgeExtension] Invalid code source URI", e);
            return;
        }

        if (Files.isDirectory(sourcePath)) {
            Path resourcePath = sourcePath.resolve(resourceRoot);
            if (!Files.exists(resourcePath)) {
                return;
            }
            try (Stream<Path> paths = Files.walk(resourcePath)) {
                paths.filter(Files::isRegularFile).forEach(path -> {
                    Path relative = resourcePath.relativize(path);
                    Path destination = targetRoot.resolve(relative);
                    if (Files.exists(destination)) {
                        return;
                    }
                    try {
                        Files.createDirectories(destination.getParent());
                        Files.copy(path, destination);
                    } catch (IOException e) {
                        logger.error("[EndlessBridgeExtension] Failed to copy resource {}", destination, e);
                    }
                });
            } catch (IOException e) {
                logger.error("[EndlessBridgeExtension] Failed to walk resource directory {}", resourcePath, e);
            }
            return;
        }

        try (JarFile jarFile = new JarFile(sourcePath.toFile())) {
            Enumeration<JarEntry> entries = jarFile.entries();
            String prefix = resourceRoot + "/";
            while (entries.hasMoreElements()) {
                JarEntry entry = entries.nextElement();
                String name = entry.getName();
                if (entry.isDirectory() || !name.startsWith(prefix)) {
                    continue;
                }
                String relative = name.substring(prefix.length());
                Path destination = targetRoot.resolve(relative);
                if (Files.exists(destination)) {
                    continue;
                }
                Files.createDirectories(destination.getParent());
                try (InputStream input = jarFile.getInputStream(entry)) {
                    Files.copy(input, destination);
                }
            }
        } catch (IOException e) {
            logger.error("[EndlessBridgeExtension] Failed to copy packaged resources for {}", resourceRoot, e);
        }
    }
}
