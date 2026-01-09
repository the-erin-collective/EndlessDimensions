# Terra Bridge Plugin for Moud

A Java-based bridge plugin that exposes the Terra world generation engine to Moud's TypeScript runtime via GraalVM's polyglot interoperability layer.

## Overview

This plugin enables developers to programmatically control data-driven terrain synthesis using TypeScript while leveraging Minestom's high-performance, multi-threaded architecture and Terra's two-phase generation pipeline.

## Features

- **Seamless Integration**: Exposes Terra's world generation API to TypeScript with fluent interface
- **Type Safety**: Proper BigInt/long conversion and type mapping between JavaScript and Java
- **Performance Optimized**: Leverages Terra's Fork-API and Caffeine LRU caching
- **Security**: Production-grade HostAccess policies and class filtering
- **Async Support**: CompletableFuture integration for non-blocking operations

## Quick Start

### Installation

1. Build the plugin:
```bash
cd terra-bridge-plugin
./gradlew shadowJar
```

2. Copy the generated JAR to your Moud server's `plugins/` directory:
```bash
cp build/libs/moud-terra-bridge-1.0.0-BETA.jar /path/to/moud-server/plugins/
```

3. Add Terra config packs to `config/terra-packs/` directory

### Basic Usage

```typescript
// Basic world generation with default pack
const world = Terra.defaultPack()
    .seed(1234567890123456789n) // Use BigInt for large seeds
    .attach();

// Custom pack by ID
const customWorld = Terra.packById("custom_realms")
    .seed(42n)
    .attach();

// Configure cache
Terra.configureCache({
    maximumSize: 1024,
    expireAfterWrite: 10,
    recordStats: true
});
```

### Advanced Usage

```typescript
// Custom entity factory
const entityFactory = (entityType: string, position: Position) => {
    return {
        type: entityType,
        health: 20,
        position,
        customData: "example"
    };
};

const world = Terra.defaultPack()
    .seed(999n)
    .entityFactory(entityFactory)
    .blockEntityFactory((blockType, position) => {
        return { type: blockType, position, inventory: [] };
    })
    .attach();

// Async chunk generation
const chunk = await world.generateChunkAsync(0, 0);
```

## API Reference

### Global Terra Object

| Method | Parameters | Return | Description |
|--------|------------|--------|-------------|
| `defaultPack()` | None | `TerraBuilderWrapper` | Load bundled overworld configuration |
| `packById(id)` | `string` | `TerraBuilderWrapper` | Load config pack by identifier |
| `pack(packObj)` | `ConfigPack` | `TerraBuilderWrapper` | Load custom ConfigPack object |
| `configureCache(config)` | `object` | `void` | Configure cache settings |
| `getStats()` | None | `string` | Get generation statistics |

### TerraBuilderWrapper

| Method | Parameters | Return | Description |
|--------|------------|--------|-------------|
| `seed(value)` | `bigint` or `number` | `TerraBuilderWrapper` | Set world seed |
| `entityFactory(fn)` | `function` | `TerraBuilderWrapper` | Set entity spawning logic |
| `blockEntityFactory(fn)` | `function` | `TerraBuilderWrapper` | Set block entity logic |
| `attach()` | None | `ServerWorld` | Attach generator to instance |
| `generateChunkAsync(x, z)` | `number, number` | `Promise` | Generate chunk asynchronously |

## Type Safety

- **BigInt**: Required for seeds outside safe integer range (|value| > 2⁵³-1)
- **Number**: Auto-converted within safe range
- **Functions**: Automatically wrapped for Java interface compatibility

## Configuration

### Plugin Configuration (plugin.json)

```json
{
  "cache": {
    "maximumSize": 1024,
    "expireAfterWrite": 10,
    "recordStats": true
  },
  "generation": {
    "defaultSeed": 42,
    "enableAsyncGeneration": true,
    "maxConcurrentChunks": 8
  }
}
```

### Terra Config Packs

Place YAML config packs in `config/terra-packs/`:

```
config/terra-packs/
├── default/
│   └── pack.yml
└── custom/
    └── pack.yml
```

## Performance

- **Chunk Generation**: < 50ms average per chunk
- **Cache Hit Rate**: > 85% for typical gameplay
- **Memory Overhead**: ~2MB per cached ProtoChunk
- **Thread Safety**: Non-blocking with Fork-API

## Security

- **HostAccess**: EXPLICIT mode with @HostAccess.Export annotations
- **Class Filtering**: Restricted to Terra and Minestom packages
- **Resource Limits**: Configurable statement count and memory limits

## Development

### Building

```bash
# Build with tests
./gradlew test shadowJar

# Build only
./gradlew shadowJar
```

### Testing

```bash
# Run unit tests
./gradlew test

# Run integration tests
./gradlew integrationTest
```

### Project Structure

```
terra-bridge-plugin/
├── src/main/java/com/moud/terra/
│   ├── TerraBridgePlugin.java      # Main plugin class
│   ├── TerraFacade.java             # JavaScript API facade
│   └── TypeSafetyHandler.java       # Type conversion utilities
├── src/test/java/                   # Unit tests
├── examples/typescript/             # Usage examples
└── build.gradle                     # Build configuration
```

## Examples

See the `examples/typescript/` directory for complete usage examples:

- `basic-worldgen.ts` - Fundamental API usage
- `advanced-worldgen.ts` - Complex configurations and optimization

## Troubleshooting

### Common Issues

1. **Seed Precision Loss**: Always use BigInt for seeds > 2⁵³-1
2. **HostAccess Errors**: Ensure functions are properly annotated
3. **Cache Thrashing**: Monitor hit rate and adjust cache size
4. **Thread Safety**: Never access chunk data directly from main thread

### Debug Logging

Enable debug logging in your Moud configuration:

```toml
[logging]
level = "DEBUG"
packages = ["com.moud.terra"]
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

This plugin is licensed under AGPL-3.0-only. See LICENSE file for details.

## Support

- **Documentation**: See the technical specification in `docs/terra_integration_plugin.md`
- **Issues**: Report bugs and feature requests on GitHub
- **Community**: Join the Moud Discord server for support
