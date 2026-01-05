// Re-export all types for easier importing
export { DimensionConfig } from '../core/DimensionGenerator';
export { EasterEggDimension } from '../core/HashEngine';

// Additional type definitions
export interface BookData {
    text: string;
    author: string;
    title: string;
    timestamp: number;
}

export interface PortalEffects {
    particleType: string;
    soundType: string;
    color: string;
}

export interface DimensionFeatures {
    oreVeins: boolean;
    caves: boolean;
    structures: boolean;
    lakes: boolean;
    dungeons: boolean;
}

export interface GeneratorSettings {
    seed: number;
    seaLevel: number;
    minY: number;
    height: number;
    biomeSource: string;
    noiseSettings: string;
}

export enum GeneratorType {
    NOISE = 'noise',
    FLAT = 'flat',
    VOID = 'void',
    FLOATING_ISLANDS = 'floating_islands',
    THE_END = 'the_end',
    CUSTOM = 'custom'
}

export enum SpecialFeature {
    ORE_VEINS = 'ore_veins',
    CAVES = 'caves',
    RAVINES = 'ravines',
    LAKES = 'lakes',
    DUNGEONS = 'dungeons',
    STRONGHOLDS = 'strongholds',
    VILLAGES = 'villages',
    TEMPLES = 'temples',
    MINESHAFTS = 'mineshafts',
    MONUMENTS = 'monuments',
    MANSIONS = 'mansions',
    OCEAN_RUINS = 'ocean_ruins',
    SHIPWRECKS = 'shipwrecks',
    PILLAGER_OUTPOSTS = 'pillager_outposts',
    BASTIONS = 'bastions',
    FORTRESSES = 'fortresses',
    END_CITIES = 'end_cities',
    FOSSILS = 'fossils',
    GEODES = 'geodes',
    NETHER_FOSSILS = 'nether_fossils'
}
