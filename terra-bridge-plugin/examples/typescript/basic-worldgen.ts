/**
 * Basic Terra world generation example using the Terra bridge plugin.
 * This demonstrates the fundamental API usage for creating worlds with Terra.
 */

// Example 1: Basic world generation with default pack
console.log("=== Basic Terra World Generation ===");

try {
    // Safe seed handling with BigInt for large seeds
    const world = Terra.defaultPack()
        .seed(1234567890123456789n) // Note the 'n' suffix for BigInt
        .attach();
    
    console.log("✅ Default Terra world generated successfully");
    console.log("World instance:", world);
    
} catch (error) {
    console.error("❌ Failed to generate default world:", error);
}

// Example 2: World generation with custom pack by ID
console.log("\n=== Custom Pack World Generation ===");

try {
    const customWorld = Terra.packById("custom_realms")
        .seed(42n)
        .attach();
    
    console.log("✅ Custom Terra world generated successfully");
    console.log("Custom world instance:", customWorld);
    
} catch (error) {
    console.error("❌ Failed to generate custom world:", error);
    console.log("💡 Make sure the 'custom_realms' pack exists in config/terra-packs/");
}

// Example 3: Cache configuration
console.log("\n=== Cache Configuration ===");

try {
    Terra.configureCache({
        maximumSize: 1024, // ProtoChunks
        expireAfterWrite: 10, // minutes
        recordStats: true
    });
    
    console.log("✅ Terra cache configured successfully");
    
} catch (error) {
    console.error("❌ Failed to configure cache:", error);
}

// Example 4: Entity factory with TypeScript function
console.log("\n=== Custom Entity Factory ===");

try {
    const entityFactory = (entityType: string, position: any) => {
        console.log(`🎮 Spawning entity: ${entityType} at position:`, position);
        
        // Custom spawning logic
        switch (entityType) {
            case "zombie":
                return { type: "zombie", health: 20, position };
            case "skeleton":
                return { type: "skeleton", health: 15, position };
            default:
                return { type: entityType, health: 10, position };
        }
    };
    
    const worldWithCustomEntities = Terra.defaultPack()
        .seed(999n)
        .entityFactory(entityFactory)
        .attach();
    
    console.log("✅ World with custom entity factory generated successfully");
    
} catch (error) {
    console.error("❌ Failed to create world with custom entities:", error);
}

// Example 5: Block entity factory
console.log("\n=== Custom Block Entity Factory ===");

try {
    const blockEntityFactory = (blockType: string, position: any) => {
        console.log(`🧱 Creating block entity: ${blockType} at position:`, position);
        
        // Custom block entity logic
        switch (blockType) {
            case "chest":
                return { type: "chest", inventory: [], position };
            case "furnace":
                return { type: "furnace", fuel: 0, progress: 0, position };
            default:
                return { type: blockType, position };
        }
    };
    
    const worldWithCustomBlockEntities = Terra.defaultPack()
        .seed(777n)
        .blockEntityFactory(blockEntityFactory)
        .attach();
    
    console.log("✅ World with custom block entity factory generated successfully");
    
} catch (error) {
    console.error("❌ Failed to create world with custom block entities:", error);
}

// Example 6: Asynchronous chunk generation
console.log("\n=== Asynchronous Chunk Generation ===");

try {
    const asyncWorld = Terra.defaultPack()
        .seed(555n)
        .attach();
    
    // Generate chunks asynchronously
    const chunkPromises = [];
    for (let x = 0; x < 3; x++) {
        for (let z = 0; z < 3; z++) {
            chunkPromises.push(
                asyncWorld.generateChunkAsync(x, z).then(chunk => {
                    console.log(`🌍 Generated chunk at (${x}, ${z}):`, chunk);
                    return chunk;
                })
            );
        }
    }
    
    Promise.all(chunkPromises)
        .then(chunks => {
            console.log(`✅ Successfully generated ${chunks.length} chunks asynchronously`);
        })
        .catch(error => {
            console.error("❌ Async chunk generation failed:", error);
        });
    
} catch (error) {
    console.error("❌ Failed to setup async world generation:", error);
}

// Example 7: Get Terra statistics
console.log("\n=== Terra Statistics ===");

try {
    const stats = Terra.getStats();
    console.log("📊 Terra Statistics:", stats);
    
    const cacheStats = getTerraCacheStats();
    console.log("🗄️ Cache Statistics:", cacheStats);
    
} catch (error) {
    console.error("❌ Failed to get Terra statistics:", error);
}

console.log("\n=== Terra Integration Test Complete ===");
