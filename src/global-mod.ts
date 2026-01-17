/**
 * Global Mod Namespace - Entry point for GraalVM integration
 * This file creates the global Mod object that Java can access
 */

// Import core classes with aliases to avoid naming conflicts
import { BlockRegistry as BlockRegistryClass } from './core/BlockRegistry';
import { CentralizedStateManager as CentralizedStateManagerClass } from './core/CentralizedStateManager';
import { CustomBlockRegistry as CustomBlockRegistryClass } from './core/CustomBlockRegistry';

// Import enhanced systems for initialization
import { getCustomBlockRegistry } from './enhanced/CustomBlockRegistry';
import { getSoundSystem } from './enhanced/SoundSystem';
import { getParticleSystem } from './enhanced/ParticleSystem';

// Declare all your mod's global exports here
namespace EndlessDimensions {
    export const VERSION = "1.0.8";  // Match original version
    export const MOD_NAME = "EndlessDimensions";
    export const MOD_VERSION = VERSION; // Alias for compatibility
    
    // Core classes (exported as constructors)
    export const BlockRegistry = BlockRegistryClass;
    export const CentralizedStateManager = CentralizedStateManagerClass;
    export const CustomBlockRegistry = CustomBlockRegistryClass;
    
    // Enhanced system accessors
    export const CustomBlockRegistryEnhanced = getCustomBlockRegistry();
    export const SoundSystem = getSoundSystem();
    export const ParticleSystem = getParticleSystem();
    
    // Core mod functions
    export function onInit() {
        console.log(`[${MOD_NAME}] v${VERSION} initialized`);
        // Enhanced systems are already initialized when created
        console.log(`[${MOD_NAME}] Enhanced systems ready`);
    }
    
    export function onShutdown() {
        console.log(`[${MOD_NAME}] shutting down`);
        CustomBlockRegistryEnhanced.clearCustomBlocks();
        SoundSystem.clearSounds();
        ParticleSystem.clearParticles();
    }
}

// Make the namespace globally available to GraalVM
// @ts-ignore
globalThis.EndlessDimensions = EndlessDimensions;
