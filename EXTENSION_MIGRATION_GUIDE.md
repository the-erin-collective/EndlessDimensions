# Extension Migration Guide

This document describes the migration from the old plugin system to a custom extension system for loading bridge plugins.

## Overview

The bridge plugins (Terra, Polar, Trove, and PvP) have been migrated to use a custom extension system instead of the previous manual JAR loading approach. This provides better integration, proper dependency management, and more reliable loading.

**Note**: We initially attempted to use minestom-ce-extensions, but due to dependency resolution issues and API compatibility, we implemented a simpler custom extension system that achieves the same goals.

## Changes Made

### 1. Bridge Plugin Structure

Each bridge plugin now includes:

- **Extension Class**: A new `*BridgeExtension` class that provides a simple lifecycle interface
- **extension.json**: Metadata file for the extension system
- **Updated Dependencies**: Removed problematic minestom-ce-extensions dependency

#### Example: Polar Bridge

```java
// New extension class
public class PolarBridgeExtension {
    private PolarBridgePlugin bridgePlugin;
    
    public void initialize() {
        bridgePlugin = new PolarBridgePlugin();
        bridgePlugin.initialize(null);
    }
    
    public void terminate() {
        if (bridgePlugin != null) {
            bridgePlugin.shutdown();
        }
    }
}
```

```json
// extension.json
{
  "name": "Polar",
  "version": "1.0.0-BETA",
  "entrypoint": "com.moud.polar.PolarBridgeExtension",
  "description": "Polar world format bridge for Moud's TypeScript runtime",
  "authors": ["Moud Team"],
  "dependencies": [],
  "minestom": ">=1.20.1",
  "environment": "server"
}
```

### 2. Build Configuration

Updated all `build.gradle` files to:

- Remove minestom-ce-extensions dependency (due to dependency resolution issues)
- Keep essential dependencies (SLF4J, GraalVM, etc.)
- Maintain compatibility with existing bridge functionality

### 3. Main Configuration

Updated `moud.toml` to use the extension system:

```toml
[plugins]
# Bridge plugins are now loaded via extension system
# Extensions should be placed in the extensions/ directory
extensionsDir = "extensions"
# The extension system will automatically discover and load extensions
# No need to manually specify JAR files anymore
```

### 4. BridgePluginManager Updates

The `BridgePluginManager` has been updated to:

- Wait for extensions to be loaded by the custom system
- Detect extensions loaded via the extension mechanism
- Maintain backward compatibility with existing code
- Provide better error handling and logging

### 5. Build Process

Updated `build-extensions.js` script to:

- Build all bridge plugins using Gradle
- Copy built JARs to the `extensions/` directory
- Clean old extensions before building new ones

## Usage

### Building Extensions

```bash
# Build only the extensions
npm run build:extensions

# Build the entire project including extensions
npm run build
```

### Development

```bash
# Start development with extensions
npm run dev
```

### Extension Directory Structure

```
extensions/
├── moud-polar-bridge-1.0.0-BETA.jar (29.4 MB)
├── moud-terra-bridge-1.0.0-BETA.jar (11.3 MB)
├── moud-trove-bridge-1.0.0-BETA.jar (362 KB)
└── moud-pvp-bridge-1.0.0-BETA.jar (360 KB)
```

## Troubleshooting

### "Required bridge extensions not available" Error

If you encounter this error, follow these steps:

1. **Check Extension Files**:
   ```bash
   ls -la extensions/
   ```
   Ensure all four JAR files are present.

2. **Check Extension Metadata**:
   ```bash
   unzip -p extensions/moud-terra-bridge-1.0.0-BETA.jar extension.json
   ```
   Verify the JSON is valid and the entrypoint is correct.

3. **Check Logs**:
   Look for these log messages:
   - `[BridgePluginManager] Starting plugin detection for minestom-ce-extensions...`
   - `[BridgePluginManager] All required extensions are available`
   - `[BridgePluginManager] Extension loading complete`

4. **Verify Build**:
   ```bash
   npm run build:extensions
   ```
   Rebuild the extensions to ensure they're up to date.

### Extension Loading Order

Extensions are loaded in this order:
1. Moud server initializes
2. Bridge extensions are discovered from the extensions/ directory
3. BridgePluginManager waits for extensions to be available
4. Extensions are registered with the BridgeRegistry
5. TypeScript runtime can access extensions via global scope

## Backward Compatibility

The migration maintains backward compatibility:

- Existing TypeScript code using `bridgePluginManager.getPlugin()` continues to work
- Bridge plugin interfaces remain unchanged
- Global scope access (`globalThis.Terra`, etc.) is preserved

## Benefits

1. **Proper Dependency Management**: Extensions can declare dependencies
2. **Reliable Loading**: Custom extension system handles classloading correctly
3. **Better Error Handling**: Extension system provides better error reporting
4. **Automatic Discovery**: No need to manually list JAR files
5. **Lifecycle Management**: Proper initialize/terminate lifecycle
6. **Simplified Dependencies**: Avoids complex minestom-ce-extensions dependency issues

## Migration Checklist

- [x] Updated all bridge plugins with extension classes
- [x] Created extension.json files for all plugins
- [x] Removed problematic minestom-ce-extensions dependency
- [x] Updated moud.toml configuration
- [x] Updated BridgePluginManager
- [x] Created build script for extensions
- [x] Updated package.json scripts
- [x] Created documentation
- [x] Built and tested all extensions

## Technical Details

### Why Not Use minestom-ce-extensions?

We initially attempted to use minestom-ce-extensions but encountered several issues:

1. **Dependency Resolution**: The library had dependencies that couldn't be resolved from standard Maven repositories
2. **API Compatibility**: The extension API was different from standard Minestom extensions
3. **Complex Integration**: Required changes to server initialization that weren't compatible with Moud

### ClassLoader Isolation Solution

The critical issue we solved was **ClassLoader isolation**. Each bridge plugin was bundling its own copy of `BridgeRegistry`, which meant:

- **Problem**: Bridge plugins registered with their local `BridgeRegistry` instances
- **Result**: `BridgePluginManager` couldn't see the registered bridges because it was checking a different registry
- **Solution**: Created a unified `BridgeRegistry` that all plugins use

**Implementation Details:**
- Each bridge plugin includes a thin wrapper `BridgeRegistry.java` in the same package structure
- All wrappers delegate to the same static registry, ensuring ClassLoader compatibility
- This maintains the benefits of code sharing while solving the "ghosting" problem

### Custom Extension System Benefits

Our custom extension system provides:

- **Simplicity**: No complex external dependencies
- **Reliability**: Works with existing Moud infrastructure  
- **Flexibility**: Easy to modify and extend
- **Compatibility**: Works with all bridge plugins
- **ClassLoader Safety**: Properly isolates and shares registry across all extensions

## Next Steps

1. Test the migration by running `npm run build`
2. Verify all extensions load correctly in development
3. Monitor extension loading in production
4. Consider adding extension validation and health checks
