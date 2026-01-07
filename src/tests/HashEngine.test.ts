import { HashEngine } from '../core/HashEngine';

describe('HashEngine', () => {
  let hashEngine: HashEngine;

  beforeEach(() => {
    hashEngine = new HashEngine();
  });

  describe('Seed Generation', () => {
    test('should generate consistent seeds for same input', () => {
      const input = 'test dimension';
      const seed1 = hashEngine.getDimensionSeed(input);
      const seed2 = hashEngine.getDimensionSeed(input);

      expect(seed1).toBe(seed2);
    });

    test('should generate different seeds for different inputs', () => {
      const seed1 = hashEngine.getDimensionSeed('dimension one');
      const seed2 = hashEngine.getDimensionSeed('dimension two');

      expect(seed1).not.toBe(seed2);
    });

    test('should generate positive seeds only', () => {
      const testInputs = [
        'test',
        'negative test',
        'special chars !@#$%',
        'unicode test 🌟',
        'very long input string that might cause issues'
      ];

      testInputs.forEach(input => {
        const seed = hashEngine.getDimensionSeed(input);
        expect(seed).toBeGreaterThanOrEqual(0);
        expect(seed).toBeLessThan(Math.pow(2, 31)); // 32-bit signed int max
      });
    });

    test('should handle empty and edge case inputs', () => {
      expect(() => hashEngine.getDimensionSeed('')).not.toThrow();
      expect(() => hashEngine.getDimensionSeed(' ')).not.toThrow();
      expect(() => hashEngine.getDimensionSeed('\n\t')).not.toThrow();
    });
  });

  describe('BigInt Seed Generation', () => {
    test('should generate consistent BigInt seeds for same input', () => {
      const input = 'test dimension';
      const seed1 = hashEngine.getDimensionSeedBigInt(input);
      const seed2 = hashEngine.getDimensionSeedBigInt(input);

      expect(seed1).toBe(seed2);
    });

    test('should generate different BigInt seeds for different inputs', () => {
      const seed1 = hashEngine.getDimensionSeedBigInt('dimension one');
      const seed2 = hashEngine.getDimensionSeedBigInt('dimension two');

      expect(seed1).not.toBe(seed2);
    });

    test('should generate positive BigInt seeds only', () => {
      const testInputs = [
        'test',
        'negative test',
        'special chars !@#$%',
        'unicode test 🌟'
      ];

      testInputs.forEach(input => {
        const seed = hashEngine.getDimensionSeedBigInt(input);
        expect(seed).toBeGreaterThanOrEqual(0n);
        expect(seed).toBeLessThan(2n ** 63n); // Long.MAX_VALUE
      });
    });

    test('should generate different seed types for same input', () => {
      const input = 'test dimension';
      const intSeed = hashEngine.getDimensionSeed(input);
      const bigIntSeed = hashEngine.getDimensionSeedBigInt(input);

      // They should be different due to different byte ranges
      expect(intSeed).not.toBe(Number(bigIntSeed));
    });
  });

  describe('Dimension ID Generation', () => {
    test('should generate valid dimension IDs', () => {
      const seed = 12345n;
      const dimensionId = hashEngine.getDimensionId(seed);

      expect(dimensionId).toMatch(/^endlessdimensions:generated_\d+$/);
    });

    test('should generate unique dimension IDs for different seeds', () => {
      const id1 = hashEngine.getDimensionId(12345n);
      const id2 = hashEngine.getDimensionId(67890n);

      expect(id1).not.toBe(id2);
    });

    test('should generate consistent dimension IDs for same seed', () => {
      const seed = 12345n;
      const id1 = hashEngine.getDimensionId(seed);
      const id2 = hashEngine.getDimensionId(seed);

      expect(id1).toBe(id2);
    });

    test('should handle zero and edge case seeds', () => {
      expect(() => hashEngine.getDimensionId(0n)).not.toThrow();
      expect(() => hashEngine.getDimensionId(1n)).not.toThrow();
      expect(() => hashEngine.getDimensionId(BigInt(Number.MAX_SAFE_INTEGER))).not.toThrow();
    });
  });

  describe('Easter Egg Detection', () => {
    test('should detect known easter egg dimensions', () => {
      const knownEasterEggs = ['ant', 'library', 'credits', 'cherry', 'bones'];
      
      knownEasterEggs.forEach(egg => {
        const result = hashEngine.checkEasterEgg(egg);
        expect(result).not.toBeNull();
        expect(result?.name).toBe(egg);
      });
    });

    test('should return null for unknown dimensions', () => {
      const result = hashEngine.checkEasterEgg('unknown_dimension');
      expect(result).toBeNull();
    });

    test('should handle case insensitive easter egg detection', () => {
      const result1 = hashEngine.checkEasterEgg('LIBRARY');
      const result2 = hashEngine.checkEasterEgg('library');
      
      expect(result1).not.toBeNull();
      expect(result2).not.toBeNull();
      expect(result1?.name).toBe(result2?.name);
    });

    test('should handle whitespace trimming in easter egg detection', () => {
      const testCases = [
        '  library  ',
        '  credits ',
        '\ncherry\t'
      ];

      testCases.forEach(input => {
        const result = hashEngine.checkEasterEgg(input.trim());
        expect(result).not.toBeNull();
      });
    });

    test('should return proper easter egg dimension properties', () => {
      const antDimension = hashEngine.checkEasterEgg('ant');
      
      expect(antDimension).toHaveProperty('name', 'ant');
      expect(antDimension).toHaveProperty('displayName', 'Ant Dimension');
      expect(antDimension).toHaveProperty('generatorType', 'flat');
      expect(antDimension).toHaveProperty('defaultBlock', 'minecraft:grass_block');
      expect(antDimension).toHaveProperty('specialFeatures');
      expect(Array.isArray(antDimension?.specialFeatures)).toBe(true);
    });
  });

  describe('Hash Consistency', () => {
    test('should maintain hash consistency across multiple instances', () => {
      const input = 'consistency test';
      const engine1 = new HashEngine();
      const engine2 = new HashEngine();

      const seed1a = engine1.getDimensionSeed(input);
      const seed1b = engine2.getDimensionSeed(input);
      const seed2a = engine1.getDimensionSeedBigInt(input);
      const seed2b = engine2.getDimensionSeedBigInt(input);

      expect(seed1a).toBe(seed1b);
      expect(seed2a).toBe(seed2b);
    });

    test('should produce different results for similar inputs', () => {
      const similarInputs = [
        'test',
        'test ',
        ' test',
        'test\n',
        'Test',
        't e s t'
      ];

      const seeds = similarInputs.map(input => hashEngine.getDimensionSeed(input));
      const uniqueSeeds = new Set(seeds);

      expect(uniqueSeeds.size).toBe(similarInputs.length);
    });
  });

  describe('Performance and Edge Cases', () => {
    test('should handle very long inputs efficiently', () => {
      const longInput = 'a'.repeat(10000);
      
      const startTime = performance.now();
      const seed = hashEngine.getDimensionSeed(longInput);
      const endTime = performance.now();

      expect(seed).toBeDefined();
      expect(endTime - startTime).toBeLessThan(100); // Should complete in < 100ms
    });

    test('should handle unicode and special characters', () => {
      const unicodeInputs = [
        '测试维度', // Chinese
        'тестовое измерение', // Russian
        'テスト次元', // Japanese
        '🌟✨🎮', // Emojis
        'café résumé naïve', // Accented characters
        '🏰⚔️🐉' // More emojis
      ];

      unicodeInputs.forEach(input => {
        expect(() => hashEngine.getDimensionSeed(input)).not.toThrow();
        expect(() => hashEngine.getDimensionSeedBigInt(input)).not.toThrow();
      });
    });

    test('should handle null and undefined inputs gracefully', () => {
      // These should not crash but may produce unexpected results
      expect(() => hashEngine.getDimensionSeed(null as any)).not.toThrow();
      expect(() => hashEngine.getDimensionSeed(undefined as any)).not.toThrow();
      expect(() => hashEngine.getDimensionSeedBigInt(null as any)).not.toThrow();
      expect(() => hashEngine.getDimensionSeedBigInt(undefined as any)).not.toThrow();
    });
  });

  describe('Integration with Dimension Generation', () => {
    test('should provide complete workflow from text to dimension ID', () => {
      const input = 'my special dimension';
      
      const seed = hashEngine.getDimensionSeed(input);
      const bigIntSeed = hashEngine.getDimensionSeedBigInt(input);
      const dimensionId = hashEngine.getDimensionId(bigIntSeed);
      
      expect(seed).toBeGreaterThanOrEqual(0);
      expect(bigIntSeed).toBeGreaterThanOrEqual(0n);
      expect(dimensionId).toMatch(/^endlessdimensions:generated_\d+$/);
    });

    test('should handle easter egg workflow correctly', () => {
      const easterEggInput = 'library';
      
      const easterEgg = hashEngine.checkEasterEgg(easterEggInput);
      const seed = hashEngine.getDimensionSeed(easterEggInput);
      const bigIntSeed = hashEngine.getDimensionSeedBigInt(easterEggInput);
      const dimensionId = hashEngine.getDimensionId(bigIntSeed);
      
      expect(easterEgg).not.toBeNull();
      expect(easterEgg?.name).toBe('library');
      expect(seed).toBeGreaterThanOrEqual(0);
      expect(dimensionId).toMatch(/^endlessdimensions:generated_\d+$/);
    });
  });
});
