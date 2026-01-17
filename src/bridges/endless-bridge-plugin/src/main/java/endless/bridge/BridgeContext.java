package endless.bridge;

import org.slf4j.Logger;

/**
 * Provides bridges with access to Moud and Endless infrastructure without tight coupling.
 * This avoids bridges needing to know how Moud resolves assets.
 */
public interface BridgeContext {

    /**
     * Root of resolved Moud assets (read-only)
     * @return Path to the assets directory
     */
    Object assetsRoot();

    /**
     * Root of writable config directory
     * @return Path to the config directory
     */
    Object configRoot();

    /**
     * Global event node (if needed)
     * @return The global event node
     */
    Object globalEventNode();

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
