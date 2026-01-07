/// <reference types="@epi-studio/moud-sdk" />
import { BlockRegistry } from '../core/BlockRegistry';

// Mock API for testing
const mockAPI = {
  // Add minimal API mocking as needed
} as MoudAPI;

// Mock https module to prevent actual HTTP requests
jest.mock('https', () => ({
  get: jest.fn((url, callback) => {
    // Mock successful response with test data
    const mockResponse = {
      on: jest.fn((event, handler) => {
        if (event === 'data') {
          handler(JSON.stringify([
            { id: 1, text_type: 'stone', type: 1 },
            { id: 2, text_type: 'dirt', type: 1 },
            { id: 3, text_type: 'grass_block', type: 1 },
            { id: 4, text_type: 'oak_planks', type: 1 },
            { id: 5, text_type: 'cobblestone', type: 1 },
            { id: 8, text_type: 'water', type: 8 },
            { id: 10, text_type: 'lava', type: 8 },
            { id: 0, text_type: 'air', type: 0 },
            { id: 166, text_type: 'barrier', type: 1 }
          ]));
        } else if (event === 'end') {
          handler();
        }
      })
    };
    
    // Simulate async callback
    setTimeout(() => callback(mockResponse), 0);
    
    return {
      on: jest.fn()
    };
  })
}));

describe('BlockRegistry', () => {
  let blockRegistry: BlockRegistry;

  beforeEach(async () => {
    blockRegistry = new BlockRegistry(mockAPI);
    await blockRegistry.initialize();
  });

  describe('Block Selection', () => {
    test('should return a valid block for random selection', () => {
      const block = blockRegistry.getRandomBlock(12345);
      expect(block).toMatch(/^minecraft:/);
      expect(blockRegistry.isBlockSafe(block)).toBe(true);
        });

        test('should return different blocks for different seeds', () => {
            const block1 = blockRegistry.getRandomBlock(12345);
            const block2 = blockRegistry.getRandomBlock(67890);
            expect(block1).not.toBe(block2);
        });

        test('should return consistent blocks for same seed', () => {
            const block1 = blockRegistry.getRandomBlock(12345);
            const block2 = blockRegistry.getRandomBlock(12345);
            expect(block1).toBe(block2);
        });

        test('should handle BigInt seeds correctly', () => {
            const block1 = blockRegistry.getRandomBlockBigInt(12345n);
            const block2 = blockRegistry.getRandomBlockBigInt(12345n);
            expect(block1).toBe(block2);
        });
    });

    describe('Block Safety', () => {
        test('should identify blacklisted blocks as unsafe', () => {
            expect(blockRegistry.isBlockSafe('minecraft:air')).toBe(false);
            expect(blockRegistry.isBlockSafe('minecraft:barrier')).toBe(false);
        });

        test('should identify safe blocks correctly', () => {
            const safeBlock = blockRegistry.getRandomBlock(12345);
            expect(blockRegistry.isBlockSafe(safeBlock)).toBe(true);
        });
    });

    describe('Fluid Selection', () => {
        test('should return valid fluid blocks', () => {
            const fluid = blockRegistry.getRandomFluid(12345);
            expect(['minecraft:water', 'minecraft:lava']).toContain(fluid);
        });
    });

    describe('Block Management', () => {
        test('should add blocks to blacklist', () => {
            const testBlock = 'minecraft:stone';
            const initialCount = blockRegistry.getSafeBlockCount();
            
            blockRegistry.blacklistBlock(testBlock);
            
            expect(blockRegistry.isBlockSafe(testBlock)).toBe(false);
            expect(blockRegistry.getSafeBlockCount()).toBeLessThan(initialCount);
        });

        test('should remove blocks from blacklist', () => {
            const testBlock = 'minecraft:stone';
            blockRegistry.blacklistBlock(testBlock);
            blockRegistry.unblacklistBlock(testBlock);
            
            expect(blockRegistry.isBlockSafe(testBlock)).toBe(true);
        });
    });

    describe('Edge Cases', () => {
        test('should fallback to stone when no safe blocks available', () => {
            // Mock scenario with no safe blocks
            const emptyRegistry = new BlockRegistry(mockAPI);
            const block = emptyRegistry.getRandomBlock(12345);
            expect(block).toBe('minecraft:stone');
        });

        test('should return multiple unique blocks', () => {
            const blocks = blockRegistry.getRandomBlocks(12345, 10);
            expect(blocks).toHaveLength(10);
            const uniqueBlocks = new Set(blocks);
            expect(uniqueBlocks.size).toBeGreaterThan(1);
        });
    });
});
