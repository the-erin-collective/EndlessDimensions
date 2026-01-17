/**
 * Bridge Global Type Declarations
 * 
 * This file declares ambient global variables that are injected
 * by Java bridge extensions during server startup.
 * 
 * These globals are available throughout the application lifecycle.
 */

declare global {
    /**
     * Terra world generation bridge
     * Provides access to Terra world generation functionality
     * This will be injected by TerraBridgeExtension at server startup
     */
    const Terra: any;

    /**
     * Polar world generation bridge  
     * Provides access to Polar world generation functionality
     * This will be injected by PolarBridgeExtension at server startup
     */
    const Polar: any;

    /**
     * Trove bridge
     * Provides access to Trove functionality
     * This will be injected by TroveBridgeExtension at server startup
     */
    const Trove: any;

    /**
     * PvP combat bridge
     * Provides access to PvP combat functionality
     * This will be injected by PvPBridgeExtension at server startup
     */
    const PvP: any;

    /**
     * Endless dimensions bridge
     * Provides access to custom dimension generation/persistence
     * This will be injected by EndlessBridgeExtension at server startup
     */
    const Endless: any;
}

export {};
