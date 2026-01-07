/// <reference types="@epi-studio/moud-sdk" />
import { Logger } from '../utils/Logger';
import { DimensionConfig } from '../core/DimensionGenerator';

// Type definitions for structure generation
interface StructureConfig {
    id: string;
    name: string;
    type: string;
    biomes: string[];
    size: number;
    rarity: number;
    features: string[];
    components: StructureComponents;
}

interface StructureComponents {
    start_pool: string;
    size: number;
    max_distance_from_center: number;
    min_distance_from_center: number;
    biomes: string[];
    step: string;
    start_height: StructureHeight;
    project_start_to_heightmap: string;
    use_explosion_holes: boolean;
    adapt_surface: boolean;
    spawn_overrides: StructureSpawnOverride[];
}

interface StructureHeight {
    type: 'uniform' | 'very_biased_to_bottom' | 'biased_to_bottom' | 'biased_to_top' | 'very_biased_to_top';
    min_inclusive: number;
    max_inclusive: number;
}

interface StructureSpawnOverride {
    creature_type: string;
    min_count: number;
    max_count: number;
    weight: number;
}

interface TemplatePool {
    name: string;
    fallback: string;
    elements: TemplateElement[];
}

interface TemplateElement {
    weight: number;
    element: {
        location: string;
        processors: string;
        projection: 'rigid' | 'terrain_matching';
        element_type: 'empty_pool_element' | 'feature_pool_element' | 'list_pool_element' | 'single_pool_element';
    };
}

/**
 * Structure Generator - Procedural structure generation matching Java functionality
 * Creates random structures like pyramids, dungeons, and custom buildings
 */
export class StructureGenerator {
    private logger: Logger;
    private namespace: string;
    private structureConfigs: Map<string, StructureConfig> = new Map();
    private templatePools: Map<string, TemplatePool> = new Map();
    private dimensionStructures: Map<string, string[]> = new Map(); // dimensionId -> structureIds

    constructor(namespace: string = 'endlessdimensions') {
        this.logger = new Logger('StructureGenerator');
        this.namespace = namespace;
    }

    /**
     * Generate structures for a dimension
     */
    public generateStructures(dimensionConfig: DimensionConfig, seed: number, biomeIds: string[]): string[] {
        try {
            this.logger.info(`Generating structures for dimension: ${dimensionConfig.id}`);
            
            const structureIds: string[] = [];
            const structureCount = this.calculateStructureCount(seed, dimensionConfig);
            
            for (let i = 0; i < structureCount; i++) {
                const structureSeed = seed + i * 10000;
                const structureId = this.generateStructure(dimensionConfig, structureSeed, biomeIds);
                structureIds.push(structureId);
            }
            
            // Store structures for this dimension
            this.dimensionStructures.set(dimensionConfig.id, structureIds);
            
            this.logger.info(`Generated ${structureCount} structures for dimension ${dimensionConfig.id}`);
            return structureIds;
            
        } catch (error) {
            this.logger.error(`Failed to generate structures for dimension ${dimensionConfig.id}:`, error);
            return [];
        }
    }

    /**
     * Calculate number of structures to generate
     */
    private calculateStructureCount(seed: number, dimensionConfig: DimensionConfig): number {
        const random = this.createSeededRandom(seed);
        
        // Base count on dimension type
        let baseCount = 3;
        
        switch (dimensionConfig.generatorType) {
            case 'the_end':
                baseCount = 2; // Fewer structures in The End
                break;
            case 'nether':
                baseCount = 4; // More structures in Nether
                break;
            case 'void':
                baseCount = 1; // Minimal structures in void
                break;
            case 'floating_islands':
                baseCount = 3; // Moderate structures
                break;
            case 'flat':
                baseCount = 5; // More structures in flat worlds
                break;
            case 'noise':
            default:
                baseCount = Math.floor(random() * 4) + 2; // 2-5 structures
                break;
        }
        
        return baseCount;
    }

    /**
     * Generate a single structure
     */
    private generateStructure(dimensionConfig: DimensionConfig, seed: number, biomeIds: string[]): string {
        const random = this.createSeededRandom(seed);
        
        // Generate structure ID
        const structureId = `${this.namespace}:structure_${Math.abs(seed)}`;
        
        // Select structure type
        const structureType = this.selectStructureType(random, dimensionConfig);
        
        // Select biomes for this structure
        const structureBiomes = this.selectStructureBiomes(random, biomeIds, structureType);
        
        // Generate structure properties
        const size = this.generateStructureSize(random, structureType);
        const rarity = this.generateStructureRarity(random, structureType);
        const features = this.generateStructureFeatures(random, structureType);
        const components = this.generateStructureComponents(random, structureType, structureBiomes);
        
        const structureConfig: StructureConfig = {
            id: structureId,
            name: this.generateStructureName(random, structureType),
            type: structureType,
            biomes: structureBiomes,
            size,
            rarity,
            features,
            components
        };
        
        // Store structure configuration
        this.structureConfigs.set(structureId, structureConfig);
        
        // Generate template pool for this structure
        this.generateTemplatePool(structureConfig, seed);
        
        this.logger.debug(`Generated structure: ${structureConfig.name} (${structureId})`);
        return structureId;
    }

    /**
     * Select structure type
     */
    private selectStructureType(random: () => number, dimensionConfig: DimensionConfig): string {
        const structureTypes = this.getAvailableStructureTypes(dimensionConfig);
        return structureTypes[Math.floor(random() * structureTypes.length)];
    }

    /**
     * Get available structure types based on dimension
     */
    private getAvailableStructureTypes(dimensionConfig: DimensionConfig): string[] {
        const commonTypes = [
            'dungeon', 'pyramid', 'temple', 'ruins', 'tower',
            'fortress', 'castle', 'village', 'camp', 'mine'
        ];
        
        switch (dimensionConfig.generatorType) {
            case 'the_end':
                return ['end_city', 'end_gateway', 'end_ship', 'crystal_tower'];
            case 'nether':
                return ['nether_fortress', 'bastion', 'ruined_portal', 'nether_castle'];
            case 'void':
                return ['floating_ruins', 'crystal_spire', 'void_platform'];
            case 'floating_islands':
                return ['sky_temple', 'cloud_palace', 'floating_tower', 'aerie'];
            case 'flat':
                return [...commonTypes, 'monument', 'mansion'];
            case 'noise':
            default:
                return commonTypes;
        }
    }

    /**
     * Select biomes for structure
     */
    private selectStructureBiomes(random: () => number, availableBiomes: string[], structureType: string): string[] {
        if (availableBiomes.length === 0) {
            return [];
        }
        
        // Some structures spawn in specific biomes
        const biomeCount = Math.floor(random() * Math.min(3, availableBiomes.length)) + 1; // 1-3 biomes
        const selectedBiomes: string[] = [];
        
        for (let i = 0; i < biomeCount; i++) {
            const biome = availableBiomes[Math.floor(random() * availableBiomes.length)];
            if (!selectedBiomes.includes(biome)) {
                selectedBiomes.push(biome);
            }
        }
        
        return selectedBiomes;
    }

    /**
     * Generate structure size
     */
    private generateStructureSize(random: () => number, structureType: string): number {
        // Size categories based on structure type
        const sizeRanges: { [key: string]: [number, number] } = {
            'dungeon': [5, 15],
            'pyramid': [20, 50],
            'temple': [15, 40],
            'ruins': [10, 30],
            'tower': [8, 25],
            'fortress': [30, 80],
            'castle': [40, 100],
            'village': [25, 60],
            'camp': [5, 20],
            'mine': [15, 35],
            'end_city': [50, 150],
            'end_gateway': [5, 15],
            'end_ship': [30, 80],
            'crystal_tower': [20, 60],
            'nether_fortress': [40, 100],
            'bastion': [30, 80],
            'ruined_portal': [10, 30],
            'nether_castle': [35, 90],
            'floating_ruins': [15, 40],
            'crystal_spire': [10, 30],
            'void_platform': [20, 50],
            'sky_temple': [25, 70],
            'cloud_palace': [40, 120],
            'floating_tower': [15, 45],
            'aerie': [20, 60],
            'monument': [30, 80],
            'mansion': [40, 120]
        };
        
        const range = sizeRanges[structureType] || [10, 30];
        return Math.floor(random() * (range[1] - range[0] + 1)) + range[0];
    }

    /**
     * Generate structure rarity
     */
    private generateStructureRarity(random: () => number, structureType: string): number {
        // Rarity: 1 = very common, 10 = very rare
        const rarityRanges: { [key: string]: [number, number] } = {
            'dungeon': [1, 3],
            'pyramid': [4, 7],
            'temple': [3, 6],
            'ruins': [2, 5],
            'tower': [3, 6],
            'fortress': [5, 8],
            'castle': [6, 9],
            'village': [2, 4],
            'camp': [1, 3],
            'mine': [3, 5],
            'end_city': [7, 10],
            'end_gateway': [8, 10],
            'end_ship': [6, 9],
            'crystal_tower': [7, 10],
            'nether_fortress': [5, 8],
            'bastion': [6, 9],
            'ruined_portal': [4, 7],
            'nether_castle': [7, 10],
            'floating_ruins': [5, 8],
            'crystal_spire': [8, 10],
            'void_platform': [6, 9],
            'sky_temple': [7, 10],
            'cloud_palace': [8, 10],
            'floating_tower': [6, 9],
            'aerie': [7, 10],
            'monument': [6, 9],
            'mansion': [7, 10]
        };
        
        const range = rarityRanges[structureType] || [3, 6];
        return Math.floor(random() * (range[1] - range[0] + 1)) + range[0];
    }

    /**
     * Generate structure features
     */
    private generateStructureFeatures(random: () => number, structureType: string): string[] {
        const allFeatures = [
            'minecraft:chest',
            'minecraft:spawner',
            'minecraft:torch',
            'minecraft:lantern',
            'minecraft:campfire',
            'minecraft:brewing_stand',
            'minecraft:enchanting_table',
            'minecraft:anvil',
            'minecraft:crafting_table',
            'minecraft:furnace',
            'minecraft:bookshelf',
            'minecraft:flower_pot',
            'minecraft:painting',
            'minecraft:item_frame'
        ];
        
        // Filter features based on structure type
        let filteredFeatures = allFeatures;
        
        switch (structureType) {
            case 'dungeon':
                filteredFeatures = ['minecraft:chest', 'minecraft:spawner', 'minecraft:torch'];
                break;
            case 'pyramid':
            case 'temple':
                filteredFeatures = ['minecraft:chest', 'minecraft:torch', 'minecraft:lantern'];
                break;
            case 'village':
                filteredFeatures = ['minecraft:chest', 'minecraft:torch', 'minecraft:campfire', 'minecraft:crafting_table'];
                break;
            case 'mine':
                filteredFeatures = ['minecraft:chest', 'minecraft:torch', 'minecraft:lantern', 'minecraft:cart'];
                break;
            case 'fortress':
            case 'castle':
                filteredFeatures = ['minecraft:chest', 'minecraft:torch', 'minecraft:lantern', 'minecraft:anvil'];
                break;
        }
        
        // Select random features
        const featureCount = Math.floor(random() * 4) + 1; // 1-4 features
        const selectedFeatures: string[] = [];
        
        for (let i = 0; i < featureCount && i < filteredFeatures.length; i++) {
            const feature = filteredFeatures[Math.floor(random() * filteredFeatures.length)];
            if (!selectedFeatures.includes(feature)) {
                selectedFeatures.push(feature);
            }
        }
        
        return selectedFeatures;
    }

    /**
     * Generate structure components
     */
    private generateStructureComponents(random: () => number, structureType: string, biomes: string[]): StructureComponents {
        const startPool = `${this.namespace}:${structureType}_pool`;
        const size = this.generateStructureSize(random, structureType);
        
        return {
            start_pool: startPool,
            size: size,
            max_distance_from_center: size * 8,
            min_distance_from_center: size * 2,
            biomes: biomes,
            step: 'surface_structures',
            start_height: {
                type: 'uniform',
                min_inclusive: this.getStructureMinHeight(structureType),
                max_inclusive: this.getStructureMaxHeight(structureType)
            },
            project_start_to_heightmap: 'WORLD_SURFACE_WG',
            use_explosion_holes: structureType === 'dungeon' || structureType === 'mine',
            adapt_surface: structureType !== 'dungeon',
            spawn_overrides: this.generateSpawnOverrides(random, structureType)
        };
    }

    /**
     * Get structure minimum height
     */
    private getStructureMinHeight(structureType: string): number {
        const minHeights: { [key: string]: number } = {
            'dungeon': -50,
            'pyramid': 60,
            'temple': 60,
            'ruins': 60,
            'tower': 60,
            'fortress': 60,
            'castle': 60,
            'village': 60,
            'camp': 60,
            'mine': -20,
            'end_city': 60,
            'end_gateway': 60,
            'end_ship': 60,
            'crystal_tower': 60,
            'nether_fortress': 60,
            'bastion': 60,
            'ruined_portal': 60,
            'nether_castle': 60,
            'floating_ruins': 100,
            'crystal_spire': 100,
            'void_platform': 100,
            'sky_temple': 100,
            'cloud_palace': 120,
            'floating_tower': 100,
            'aerie': 100,
            'monument': 60,
            'mansion': 60
        };
        
        return minHeights[structureType] || 60;
    }

    /**
     * Get structure maximum height
     */
    private getStructureMaxHeight(structureType: string): number {
        const maxHeights: { [key: string]: number } = {
            'dungeon': 50,
            'pyramid': 100,
            'temple': 100,
            'ruins': 100,
            'tower': 100,
            'fortress': 100,
            'castle': 120,
            'village': 100,
            'camp': 100,
            'mine': 50,
            'end_city': 200,
            'end_gateway': 200,
            'end_ship': 200,
            'crystal_tower': 200,
            'nether_fortress': 120,
            'bastion': 120,
            'ruined_portal': 120,
            'nether_castle': 120,
            'floating_ruins': 200,
            'crystal_spire': 200,
            'void_platform': 200,
            'sky_temple': 200,
            'cloud_palace': 220,
            'floating_tower': 200,
            'aerie': 200,
            'monument': 100,
            'mansion': 120
        };
        
        return maxHeights[structureType] || 100;
    }

    /**
     * Generate spawn overrides
     */
    private generateSpawnOverrides(random: () => number, structureType: string): StructureSpawnOverride[] {
        const overrides: StructureSpawnOverride[] = [];
        
        // Some structures have special mob spawns
        switch (structureType) {
            case 'dungeon':
                overrides.push({
                    creature_type: 'minecraft:zombie',
                    min_count: 1,
                    max_count: 2,
                    weight: 200
                });
                overrides.push({
                    creature_type: 'minecraft:skeleton',
                    min_count: 1,
                    max_count: 2,
                    weight: 200
                });
                break;
            case 'nether_fortress':
                overrides.push({
                    creature_type: 'minecraft:blaze',
                    min_count: 2,
                    max_count: 4,
                    weight: 100
                });
                overrides.push({
                    creature_type: 'minecraft:wither_skeleton',
                    min_count: 1,
                    max_count: 2,
                    weight: 80
                });
                break;
            case 'bastion':
                overrides.push({
                    creature_type: 'minecraft:piglin',
                    min_count: 2,
                    max_count: 4,
                    weight: 100
                });
                break;
        }
        
        return overrides;
    }

    /**
     * Generate template pool for structure
     */
    private generateTemplatePool(structureConfig: StructureConfig, seed: number): void {
        const random = this.createSeededRandom(seed);
        const poolName = `${this.namespace}:${structureConfig.type}_pool`;
        
        // Generate template elements
        const elements: TemplateElement[] = [];
        const elementCount = Math.floor(random() * 3) + 1; // 1-3 elements
        
        for (let i = 0; i < elementCount; i++) {
            const element = this.generateTemplateElement(random, structureConfig, i);
            elements.push(element);
        }
        
        const templatePool: TemplatePool = {
            name: poolName,
            fallback: 'minecraft:empty',
            elements
        };
        
        this.templatePools.set(poolName, templatePool);
    }

    /**
     * Generate template element
     */
    private generateTemplateElement(random: () => number, structureConfig: StructureConfig, index: number): TemplateElement {
        const location = `${this.namespace}:${structureConfig.type}_part_${index}`;
        const processors = this.generateProcessors(random, structureConfig);
        const projection = random() > 0.5 ? 'rigid' : 'terrain_matching';
        
        return {
            weight: Math.floor(random() * 10) + 1,
            element: {
                location,
                processors,
                projection,
                element_type: 'single_pool_element'
            }
        };
    }

    /**
     * Generate processors for template element
     */
    private generateProcessors(random: () => number, structureConfig: StructureConfig): string {
        const allProcessors = [
            'minecraft:rule_block',
            'minecraft:gravity',
            'minecraft:clamp',
            'minecraft:protect_blocks',
            'minecraft:airhole',
            'minecraft:age',
            'minecraft:random_selector',
            'minecraft:rule_swap',
            'minecraft:append',
            'minecraft:prepend',
            'minecraft:rotate',
            'minecraft:mirror'
        ];
        
        // Select processors based on structure type
        let selectedProcessors = allProcessors;
        
        switch (structureConfig.type) {
            case 'ruins':
                selectedProcessors = ['minecraft:gravity', 'minecraft:age', 'minecraft:airhole'];
                break;
            case 'dungeon':
                selectedProcessors = ['minecraft:protect_blocks', 'minecraft:airhole'];
                break;
            case 'village':
                selectedProcessors = ['minecraft:gravity', 'minecraft:clamp'];
                break;
        }
        
        // Select random processors
        const processorCount = Math.floor(random() * 3) + 1; // 1-3 processors
        const processors: string[] = [];
        
        for (let i = 0; i < processorCount && i < selectedProcessors.length; i++) {
            const processor = selectedProcessors[Math.floor(random() * selectedProcessors.length)];
            if (!processors.includes(processor)) {
                processors.push(processor);
            }
        }
        
        return processors.join(',');
    }

    /**
     * Generate structure name
     */
    private generateStructureName(random: () => number, structureType: string): string {
        const adjectives = [
            'Ancient', 'Forgotten', 'Mystic', 'Sacred', 'Abandoned',
            'Haunted', 'Cursed', 'Blessed', 'Divine', 'Corrupted',
            'Crystal', 'Shadow', 'Golden', 'Silver', 'Bronze'
        ];
        
        const adjective = adjectives[Math.floor(random() * adjectives.length)];
        
        // Format structure type to be more readable
        const formattedType = structureType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        
        return `${adjective} ${formattedType}`;
    }

    /**
     * Get structure configuration
     */
    public getStructureConfig(structureId: string): StructureConfig | null {
        return this.structureConfigs.get(structureId) || null;
    }

    /**
     * Get all structures for a dimension
     */
    public getDimensionStructures(dimensionId: string): string[] {
        return this.dimensionStructures.get(dimensionId) || [];
    }

    /**
     * Get all structure configurations
     */
    public getAllStructureConfigs(): Map<string, StructureConfig> {
        return new Map(this.structureConfigs);
    }

    /**
     * Get template pool
     */
    public getTemplatePool(poolName: string): TemplatePool | null {
        return this.templatePools.get(poolName) || null;
    }

    /**
     * Generate structure JSON for datapack
     */
    public generateStructureJson(structureConfig: StructureConfig): any {
        return {
            type: structureConfig.type,
            biomes: structureConfig.components.biomes,
            spawn_overrides: structureConfig.components.spawn_overrides,
            config: {
                start_pool: structureConfig.components.start_pool,
                size: structureConfig.components.size,
                max_distance_from_center: structureConfig.components.max_distance_from_center,
                min_distance_from_center: structureConfig.components.min_distance_from_center,
                step: structureConfig.components.step,
                start_height: structureConfig.components.start_height,
                project_start_to_heightmap: structureConfig.components.project_start_to_heightmap,
                use_explosion_holes: structureConfig.components.use_explosion_holes,
                adapt_surface: structureConfig.components.adapt_surface
            }
        };
    }

    /**
     * Generate template pool JSON for datapack
     */
    public generateTemplatePoolJson(templatePool: TemplatePool): any {
        return {
            name: templatePool.name,
            fallback: templatePool.fallback,
            elements: templatePool.elements
        };
    }

    /**
     * Create seeded random number generator
     */
    private createSeededRandom(seed: number): () => number {
        let s = seed;
        return () => {
            s = (s * 9301 + 49297) % 233280;
            return s / 233280;
        };
    }

    /**
     * Get structure statistics
     */
    public getStatistics(): any {
        return {
            totalStructures: this.structureConfigs.size,
            totalTemplatePools: this.templatePools.size,
            dimensionCount: this.dimensionStructures.size,
            averageStructuresPerDimension: this.dimensionStructures.size > 0 ? 
                Array.from(this.dimensionStructures.values()).reduce((sum, structures) => sum + structures.length, 0) / this.dimensionStructures.size : 0
        };
    }

    /**
     * Clear all structure data
     */
    public clearStructures(): void {
        this.structureConfigs.clear();
        this.templatePools.clear();
        this.dimensionStructures.clear();
        this.logger.info('All structure data cleared');
    }
}

// Singleton instance for global access
let globalStructureGenerator: StructureGenerator | null = null;

/**
 * Get global structure generator instance
 */
export function getStructureGenerator(): StructureGenerator {
    if (!globalStructureGenerator) {
        globalStructureGenerator = new StructureGenerator();
    }
    return globalStructureGenerator;
}
