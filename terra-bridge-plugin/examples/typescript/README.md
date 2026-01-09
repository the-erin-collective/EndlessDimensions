# Terra Bridge Plugin TypeScript Examples

This directory contains TypeScript examples demonstrating how to use the Terra Bridge Plugin with Moud.

## Files

### `basic-worldgen.ts`
Demonstrates fundamental Terra Bridge API usage:
- Basic world generation with default and custom packs
- Seed handling with BigInt
- Cache configuration
- Entity and block entity factories
- Asynchronous chunk generation
- Statistics retrieval

### `advanced-worldgen.ts`
Shows advanced features and optimizations:
- Complex configuration management
- Performance monitoring
- Biome-specific entity spawning
- Custom block entity data
- Error handling and validation
- Type safety best practices

## Running the Examples

1. Ensure you have a Moud server with the Terra Bridge Plugin installed
2. Copy the example files to your Moud server's `scripts/` directory
3. Start the server or use hot-reload if available

```bash
# Copy examples to server
cp basic-worldgen.ts /path/to/moud-server/scripts/
cp advanced-worldgen.ts /path/to/moud-server/scripts/

# Start server
cd /path/to/moud-server
./run.sh
```

## Key Concepts Demonstrated

### Type Safety
```typescript
// Always use BigInt for large seeds
const world = Terra.defaultPack()
    .seed(1234567890123456789n) // Note the 'n' suffix
    .attach();
```

### Custom Factories
```typescript
// Entity factory with TypeScript types
const entityFactory = (entityType: string, position: Position): Entity => {
    return {
        type: entityType,
        health: 20,
        position,
        customData: "example"
    };
};
```

### Async Operations
```typescript
// Asynchronous chunk generation
const chunk = await world.generateChunkAsync(0, 0);
```

### Configuration
```typescript
// Cache configuration
Terra.configureCache({
    maximumSize: 1024,
    expireAfterWrite: 10,
    recordStats: true
});
```

## Best Practices

1. **Always use BigInt** for seeds that might exceed JavaScript's safe integer range
2. **Implement error handling** for all Terra operations
3. **Use async generation** for better performance
4. **Monitor cache statistics** to optimize performance
5. **Validate inputs** before passing to Terra API

## Troubleshooting

If you encounter issues:

1. Check the server console for error messages
2. Ensure Terra config packs are properly installed
3. Verify that the plugin is loaded correctly
4. Check that your TypeScript code compiles without errors

## Additional Resources

- [Terra Bridge Plugin README](../../README.md)
- [Technical Specification](../../../docs/terra_integration_plugin.md)
- [Moud Documentation](https://moud.epistudios.fr/)
- [Terra Documentation](https://github.com/PolyhedralDev/Terra)
