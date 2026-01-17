// Re-export all types for easier importing
export { DimensionConfig } from './DimensionConfig';

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

// Global type augmentation for MoudAPI runtime properties
declare global {
  interface MoudAPI {
    state: {
      get(key: string): any;
      set(key: string, value: any): void;
      subscribe?(key: string, callback: (value: any) => void): void;
      getDataMap?(key: string, property: string): any;
    };
    scheduler: {
      runRepeating(ticks: number, task: () => void): void;
    };
    world: {
      getBlock(x: number, y: number, z: number): any;
      setBlock?(x: number, y: number, z: number, blockId: string): Promise<void>;
    };
    // Optional capabilities - always check existence before use
    internal?: {
      fs?: {
        readFile(path: string, encoding?: string): Promise<string>;
        writeFile(path: string, data: string, encoding?: string): Promise<void>;
        mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
        unlink(path: string): Promise<void>;
        readdir(path: string): Promise<string[]>;
        stat(path: string): Promise<{ isDirectory: boolean; size: number }>;
        listFiles?(path: string): Promise<string[]>;
        deleteFile?(path: string): Promise<void>;
      };
    };
    server?: {
      executeCommand?(command: string): Promise<any>;
      getVersion?(): any;
    };
    events?: {
      on(event: string, callback: (data: any) => void): void;
      emit?(event: string, data: any): void;
    };
    packets?: {
      onIncoming?(callback: (packet: any) => void): void;
      onOutgoing?(callback: (packet: any) => void): void;
      intercept?(callback: (packet: any, direction: string) => void): void;
    };
    network?: {
      sendPacket?(playerId: string, packet: any): Promise<void>;
    };
    containers?: {
      registerContainerType?(config: any): Promise<void>;
    };
    items?: {
      registerItem?(config: any): Promise<void>;
    };
    crafting?: {
      registerShapedRecipe?(config: any): Promise<void>;
    };
    registry?: {
      getBlocks?(): any[];
    };
  }

  // Add missing dimension property to EntityData
  interface EntityData {
    dimension?: string;
  }
}
