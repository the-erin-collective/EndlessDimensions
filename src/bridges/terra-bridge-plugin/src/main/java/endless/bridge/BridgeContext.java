package endless.bridge;

import net.minestom.server.event.Event;
import net.minestom.server.event.EventNode;
import org.slf4j.Logger;

import java.nio.file.Path;

/**
 * Provides bridges with access to Moud and Endless infrastructure without tight coupling.
 * This avoids bridges needing to know how Moud resolves assets or manages configurations.
 */
public interface BridgeContext {

    /**
     * Root of resolved Moud assets (read-only)
     * @return Path to the assets directory
     */
    Path assetsRoot();

    /**
     * Root of writable config directory
     * @return Path to the config directory
     */
    Path configRoot();

    /**
     * Global Minestom event node (if needed)
     * @return The global event node
     */
    EventNode<Event> globalEventNode();

    /**
     * Logger scoped to the bridge
     * @return A logger instance for the bridge
     */
    Logger logger();

    /**
     * Access to dimension configurations
     * @return The dimension config registry
     */
    DimensionConfigRegistry dimensions();
}
