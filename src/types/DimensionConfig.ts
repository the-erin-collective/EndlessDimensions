export interface DimensionConfig {
    id: string;
    name: string;
    generatorType: 'noise' | 'flat' | 'void' | 'floating_islands' | 'the_end' | 'custom' | 'nether';
    defaultBlock: string;
    defaultFluid: string;
    seaLevel: number;
    minY: number;
    height: number;
    additionalBlocks: string[];
    specialFeatures: string[];
}
