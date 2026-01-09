/**
 * Advanced Terra world generation examples.
 * Demonstrates complex configurations, error handling, and performance optimization.
 */

// Type definitions for better TypeScript support
interface TerraConfig {
    cache: {
        maximumSize: number;
        expireAfterWrite: number;
        recordStats: boolean;
    };
    generation: {
        defaultSeed: bigint;
        enableAsyncGeneration: boolean;
        maxConcurrentChunks: number;
    };
}

interface Position {
    x: number;
    y: number;
    z: number;
}

interface Entity {
    type: string;
    health: number;
    position: Position;
    [key: string]: any;
}

interface BlockEntity {
    type: string;
    position: Position;
    [key: string]: any;
}

// Advanced configuration example
console.log("=== Advanced Terra Configuration ===");

const advancedConfig: TerraConfig = {
    cache: {
        maximumSize: 2048, // Larger cache for high-performance servers
        expireAfterWrite: 15, // Longer retention
        recordStats: true
    },
    generation: {
        defaultSeed: 9876543210987654321n, // Very large seed
        enableAsyncGeneration: true,
        maxConcurrentChunks: 16 // Higher concurrency
    }
};

try {
    // Apply advanced configuration
    Terra.configureCache(advancedConfig.cache);
    console.log("✅ Advanced cache configuration applied");
    
    // Create world with advanced settings
    const advancedWorld = Terra.defaultPack()
        .seed(advancedConfig.generation.defaultSeed)
        .attach();
    
    console.log("✅ Advanced world created with seed:", advancedConfig.generation.defaultSeed);
    
} catch (error) {
    console.error("❌ Advanced configuration failed:", error);
}

// Performance monitoring example
console.log("\n=== Performance Monitoring ===");

class TerraPerformanceMonitor {
    private startTime: number = 0;
    private chunkCount: number = 0;
    
    startMonitoring() {
        this.startTime = Date.now();
        this.chunkCount = 0;
        console.log("🚀 Performance monitoring started");
    }
    
    recordChunkGenerated() {
        this.chunkCount++;
    }
    
    getReport(): string {
        const elapsed = Date.now() - this.startTime;
        const chunksPerSecond = (this.chunkCount / (elapsed / 1000)).toFixed(2);
        
        return `
📊 Performance Report:
- Chunks generated: ${this.chunkCount}
- Time elapsed: ${elapsed}ms
- Chunks per second: ${chunksPerSecond}
- Average time per chunk: ${(elapsed / this.chunkCount).toFixed(2)}ms
        `.trim();
    }
}

const monitor = new TerraPerformanceMonitor();
monitor.startMonitoring();

// Advanced entity factory with biome-specific spawning
const advancedEntityFactory = (entityType: string, position: Position): Entity => {
    // Simulate biome detection (would use actual Terra API in real implementation)
    const biome = getBiomeAtPosition(position.x, position.z);
    
    const entity: Entity = {
        type: entityType,
        health: 20,
        position: { ...position }
    };
    
    // Biome-specific modifications
    switch (biome) {
        case "desert":
            entity.health = 15; // Harsh environment
            entity.temperature = "hot";
            break;
        case "snowy_tundra":
            entity.health = 25; // Tougher creatures
            entity.temperature = "cold";
            break;
        case "jungle":
            entity.health = 18;
            entity.canopyLevel = Math.floor(Math.random() * 3);
            break;
        default:
            entity.temperature = "moderate";
    }
    
    console.log(`🎮 Spawned ${entityType} in ${biome} biome:`, entity);
    monitor.recordChunkGenerated();
    
    return entity;
};

// Helper function to simulate biome detection
function getBiomeAtPosition(x: number, z: number): string {
    const biomes = ["plains", "desert", "snowy_tundra", "jungle", "ocean", "mountains"];
    const index = Math.abs((x * 31 + z * 37) % biomes.length);
    return biomes[index];
}

// Advanced block entity factory with custom data
const advancedBlockEntityFactory = (blockType: string, position: Position): BlockEntity => {
    const blockEntity: BlockEntity = {
        type: blockType,
        position: { ...position }
    };
    
    // Add custom data based on block type
    switch (blockType) {
        case "chest":
            blockEntity.inventory = generateRandomLoot(position);
            blockEntity.locked = Math.random() > 0.8;
            break;
        case "furnace":
            blockEntity.fuel = Math.floor(Math.random() * 8);
            blockEntity.progress = Math.random();
            blockEntity.smelting = Math.random() > 0.5 ? "iron_ore" : null;
            break;
        case "hopper":
            blockEntity.transferRate = Math.random() > 0.5 ? "fast" : "slow";
            blockEntity.filter = generateItemFilter();
            break;
        case "spawner":
            blockEntity.spawnType = getRandomMobType();
            blockEntity.spawnDelay = Math.floor(Math.random() * 200) + 100;
            blockEntity.spawnCount = Math.floor(Math.random() * 4) + 1;
            break;
    }
    
    console.log(`🧱 Created ${blockType} with custom data:`, blockEntity);
    return blockEntity;
};

// Helper functions for generating random data
function generateRandomLoot(position: Position): string[] {
    const items = ["diamond", "gold_ingot", "iron_ingot", "bread", "torch", "arrow"];
    const count = Math.floor(Math.random() * 5) + 1;
    const loot: string[] = [];
    
    for (let i = 0; i < count; i++) {
        loot.push(items[Math.floor(Math.random() * items.length)]);
    }
    
    return loot;
}

function generateItemFilter(): string[] {
    const items = ["diamond", "gold_ingot", "iron_ingot", "coal", "redstone"];
    const count = Math.floor(Math.random() * 3) + 1;
    const filter: string[] = [];
    
    for (let i = 0; i < count; i++) {
        filter.push(items[Math.floor(Math.random() * items.length)]);
    }
    
    return filter;
}

function getRandomMobType(): string {
    const mobs = ["zombie", "skeleton", "spider", "creeper", "enderman"];
    return mobs[Math.floor(Math.random() * mobs.length)];
}

// Create world with advanced factories
try {
    console.log("\n=== Creating World with Advanced Factories ===");
    
    const advancedWorld = Terra.defaultPack()
        .seed(1234567890123456789n)
        .entityFactory(advancedEntityFactory)
        .blockEntityFactory(advancedBlockEntityFactory)
        .attach();
    
    console.log("✅ Advanced world created successfully");
    
    // Generate some chunks to test the factories
    const testPositions = [
        { x: 0, z: 0 },
        { x: 16, z: 16 },
        { x: -16, z: 16 },
        { x: 16, z: -16 },
        { x: -16, z: -16 }
    ];
    
    console.log("\n=== Testing Advanced Factories ===");
    
    testPositions.forEach(pos => {
        // Simulate entity spawning
        const entity = advancedEntityFactory("zombie", { x: pos.x, y: 64, z: pos.z });
        
        // Simulate block entity creation
        const blockEntity = advancedBlockEntityFactory("chest", { x: pos.x, y: 63, z: pos.z });
    });
    
    // Show performance report
    setTimeout(() => {
        console.log(monitor.getReport());
    }, 1000);
    
} catch (error) {
    console.error("❌ Advanced world creation failed:", error);
}

// Error handling and validation example
console.log("\n=== Error Handling and Validation ===");

function validateSeed(seed: bigint | number): boolean {
    try {
        // Convert to string to handle both BigInt and Number
        const seedStr = seed.toString();
        
        // Check if seed is within reasonable bounds
        const seedNum = BigInt(seedStr);
        const maxSeed = 18446744073709551615n; // 2^64 - 1
        
        if (seedNum < 0n || seedNum > maxSeed) {
            console.error("❌ Seed out of valid range:", seed);
            return false;
        }
        
        console.log("✅ Seed validation passed:", seed);
        return true;
        
    } catch (error) {
        console.error("❌ Seed validation failed:", error);
        return false;
    }
}

// Test seed validation
const testSeeds = [
    123n,
    1234567890123456789n,
    18446744073709551615n, // Max valid seed
    -1n, // Invalid negative seed
    18446744073709551616n // Invalid overflow seed
];

testSeeds.forEach(seed => {
    validateSeed(seed);
});

console.log("\n=== Advanced Terra Integration Test Complete ===");
