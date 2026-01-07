/// <reference types="@epi-studio/moud-sdk" />
import { DimensionGenerator } from '../core/DimensionGenerator';
import { HashEngine } from '../core/HashEngine';
import { BlockRegistry } from '../core/BlockRegistry';

// Mock dependencies
const mockAPI = {} as MoudAPI;
const mockHashEngine = {
    checkEasterEgg: jest.fn().mockReturnValue(null),
    getDimensionSeed: jest.fn()
        .mockImplementation((text: string) => {
            // Generate different seeds for different inputs
            return text.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        }),
    getDimensionSeedBigInt: jest.fn()
        .mockImplementation((text: string) => {
            // Generate different BigInt seeds for different inputs
            return BigInt(text.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0));
        }),
    getDimensionId: jest.fn()
        .mockImplementation((seed: bigint) => `test_dimension_${seed}`)
} as any;

const mockBlockRegistry = {
    getRandomBlock: jest.fn().mockReturnValue('minecraft:stone'),
    getRandomBlockBigInt: jest.fn().mockReturnValue('minecraft:dirt'),
    getRandomFluid: jest.fn().mockReturnValue('minecraft:water')
} as any;

describe('DimensionGenerator', () => {
    let dimensionGenerator: DimensionGenerator;

    beforeEach(() => {
        dimensionGenerator = new DimensionGenerator(mockAPI, mockHashEngine, mockBlockRegistry);
    });

    describe('Dimension Generation', () => {
        test('should generate a valid dimension configuration', () => {
            const config = dimensionGenerator.generateDimension('test dimension');
            
            expect(config).toHaveProperty('id');
            expect(config).toHaveProperty('name');
            expect(config).toHaveProperty('generatorType');
            expect(config).toHaveProperty('defaultBlock');
            expect(config).toHaveProperty('defaultFluid');
            expect(config).toHaveProperty('seaLevel');
            expect(config).toHaveProperty('minY');
            expect(config).toHaveProperty('height');
            expect(config).toHaveProperty('additionalBlocks');
            expect(config).toHaveProperty('specialFeatures');
        });

        test('should generate consistent dimensions for same input', () => {
            const config1 = dimensionGenerator.generateDimension('test dimension');
            const config2 = dimensionGenerator.generateDimension('test dimension');
            
            expect(config1.id).toBe(config2.id);
            expect(config1.name).toBe(config2.name);
        });

        test('should generate different dimensions for different inputs', () => {
            const config1 = dimensionGenerator.generateDimension('dimension one');
            const config2 = dimensionGenerator.generateDimension('dimension two');
            
            expect(config1).toBeDefined();
            expect(config2).toBeDefined();
            // Different inputs should generate different dimension IDs
            expect(config1.id).not.toBe(config2.id);
            expect(config1.name).not.toBe(config2.name);
        });
    });

    describe('Generator Types', () => {
        test('should select valid generator types', () => {
            const config = dimensionGenerator.generateDimension('test');
            expect(['noise', 'flat', 'void', 'floating_islands', 'the_end']).toContain(config.generatorType);
        });
    });

    describe('Dimension Properties', () => {
        test('should calculate valid sea levels', () => {
            const config = dimensionGenerator.generateDimension('test');
            expect(config.seaLevel).toBeGreaterThanOrEqual(-64);
            expect(config.seaLevel).toBeLessThanOrEqual(95);
        });

        test('should calculate valid height values', () => {
            const config = dimensionGenerator.generateDimension('test');
            expect(config.height).toBeGreaterThan(0);
            expect(config.height).toBeLessThanOrEqual(384);
        });

        test('should include additional blocks', () => {
            const config = dimensionGenerator.generateDimension('test');
            expect(config.additionalBlocks).toBeDefined();
            expect(config.additionalBlocks.length).toBeGreaterThan(0);
            expect(config.additionalBlocks[0]).toMatch(/^minecraft:/);
        });

        test('should include special features', () => {
            const config = dimensionGenerator.generateDimension('test');
            expect(config.specialFeatures).toBeDefined();
            expect(Array.isArray(config.specialFeatures)).toBe(true);
            expect(config.specialFeatures.length).toBeGreaterThan(0);
        });
    });

    describe('Easter Egg Dimensions', () => {
        test('should handle easter egg dimensions', () => {
            const mockEasterEgg = {
                displayName: 'Test Easter Egg',
                generatorType: 'void',
                defaultBlock: 'minecraft:bedrock',
                specialFeatures: ['test_feature']
            };
            
            mockHashEngine.checkEasterEgg.mockReturnValue(mockEasterEgg);
            
            const config = dimensionGenerator.generateDimension('antimatter');
            
            expect(config.name).toBe('Test Easter Egg');
            expect(config.generatorType).toBe('void');
            expect(config.defaultBlock).toBe('minecraft:bedrock');
            expect(config.specialFeatures).toContain('test_feature');
        });
    });

    describe('Dimension Management', () => {
        test('should store generated dimensions', () => {
            const config = dimensionGenerator.generateDimension('test dimension');
            const retrieved = dimensionGenerator.getDimension(config.id);
            
            expect(retrieved).toEqual(config);
        });

        test('should return null for non-existent dimensions', () => {
            const retrieved = dimensionGenerator.getDimension('non_existent');
            expect(retrieved).toBeNull();
        });

        test('should return all generated dimensions', () => {
            const config1 = dimensionGenerator.generateDimension('test dimension one');
            const config2 = dimensionGenerator.generateDimension('test dimension two');
            
            const allDimensions = dimensionGenerator.getAllDimensions();
            expect(allDimensions.size).toBeGreaterThanOrEqual(2);
            expect(allDimensions.has(config1.id)).toBe(true);
            expect(allDimensions.has(config2.id)).toBe(true);
        });
    });
});
