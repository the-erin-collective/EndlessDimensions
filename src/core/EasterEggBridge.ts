/// <reference types="@epi-studio/moud-sdk" />
import { Logger } from '../utils/Logger';
import { SynthesizerGrid, BiomeColumn, WorldType } from './VirtualGridController';
import { ItemBlockMapper } from './ItemBlockMapper';

export interface EasterEggBridgeData {
    seedKey: string;
    dimensionId: string;
    grid: SynthesizerGrid;
    createdAt: string;
    bookTitle: string;
}

export class EasterEggBridge {
    private api: MoudAPI;
    private logger: Logger;
    private itemBlockMapper: ItemBlockMapper;
    private bridgeData: Map<string, EasterEggBridgeData>;

    constructor(api: MoudAPI, itemBlockMapper: ItemBlockMapper) {
        this.api = api;
        this.logger = new Logger('EasterEggBridge');
        this.itemBlockMapper = itemBlockMapper;
        this.bridgeData = new Map();
    }

    public async createEasterEggBridge(grid: SynthesizerGrid, playerId: string): Promise<string | null> {
        try {
            const request = this.buildCustomDimensionRequest(grid);
            if (!request) {
                this.logger.warn('No valid biome columns found for custom dimension');
                return null;
            }

            const endless = this.resolveEndlessFacade();
            if (!endless || typeof endless.createCustomDimension !== 'function') {
                this.logger.error('Endless bridge plugin not available');
                return null;
            }

            const seedKey = endless.createCustomDimension(request.shellTypeId, request.biomes, request.palettes);
            if (!seedKey) {
                this.logger.error('Endless bridge failed to return a seed key');
                return null;
            }

            const bookTitle = this.generateBookTitle(grid);
            const bridgeData: EasterEggBridgeData = {
                seedKey,
                dimensionId: this.getDimensionIdForKey(seedKey),
                grid,
                createdAt: new Date().toISOString(),
                bookTitle
            };

            this.bridgeData.set(seedKey, bridgeData);
            await this.givePlayerBook(playerId, seedKey, bookTitle);

            this.logger.info(`Created custom dimension key: ${seedKey}`);
            return seedKey;
        } catch (error) {
            this.logger.error('Failed to create custom dimension bridge', error);
            return null;
        }
    }

    private buildCustomDimensionRequest(grid: SynthesizerGrid): {
        shellTypeId: string;
        biomes: Array<{ templateId: string; overlayId: string | null; paletteSlot: number }>;
        palettes: Record<string, { surfaceBlock: string; subsurfaceBlock: string; stoneBlock: string; liquidBlock?: string | null }>;
    } | null {
        const definedColumns = grid.columns.filter(column => column.unlocked && column.baseBiome);
        if (definedColumns.length === 0) {
            return null;
        }

        const columns = definedColumns.slice(0, 4);
        const shellTypeId = this.resolveShellTypeId(columns);
        const biomes: Array<{ templateId: string; overlayId: string | null; paletteSlot: number }> = [];
        const palettes: Record<string, { surfaceBlock: string; subsurfaceBlock: string; stoneBlock: string; liquidBlock?: string | null }> = {};
        let slot = 1;

        for (const column of columns) {
            const templateId = this.itemBlockMapper.getBiomeTemplateId(column.baseBiome || '');
            if (!templateId) {
                this.logger.warn(`No biome template mapping for ${column.baseBiome}`);
                continue;
            }

            biomes.push({
                templateId,
                overlayId: null,
                paletteSlot: slot
            });

            const surfaceFallback = this.resolveBlock(column.baseBiome, 'minecraft:grass_block');
            const surfaceBlock = this.resolveBlock(column.surfaceBlock, surfaceFallback);
            const stoneBlock = this.resolveBlock(column.stoneBlock, 'minecraft:stone');
            const liquidBlock = this.resolveOptionalBlock(column.liquidBlock);

            palettes[slot] = {
                surfaceBlock,
                subsurfaceBlock: surfaceBlock,
                stoneBlock,
                liquidBlock
            };

            slot += 1;
        }

        if (biomes.length === 0) {
            return null;
        }

        return { shellTypeId, biomes, palettes };
    }

    private resolveShellTypeId(columns: BiomeColumn[]): string {
        const worldTypes = new Set<WorldType>();
        for (const column of columns) {
            if (column.worldType) {
                worldTypes.add(column.worldType as WorldType);
            }
        }
        const worldType = worldTypes.values().next().value || 'NORMAL';
        if (worldTypes.size > 1) {
            this.logger.warn(`Multiple world types selected; using ${worldType}`);
        }

        switch (worldType) {
            case 'NETHER':
                return 'nether_cavern';
            case 'THE_END':
                return 'end_islands';
            case 'SUPERFLAT':
                return 'superflat';
            case 'AMPLIFIED':
                return 'overworld_open';
            case 'NORMAL':
            default:
                return 'overworld_open';
        }
    }

    private resolveBlock(itemId: string | null, fallback: string | null): string {
        const mapped = itemId ? this.itemBlockMapper.mapItemToBlock(itemId) : null;
        if (mapped) {
            return mapped;
        }
        return fallback || 'minecraft:stone';
    }

    private resolveOptionalBlock(itemId: string | null): string | null {
        const mapped = itemId ? this.itemBlockMapper.mapItemToBlock(itemId) : null;
        return mapped || null;
    }

    private getDimensionIdForKey(seedKey: string): string {
        const normalized = seedKey.toLowerCase().trim().replace(/[^a-z0-9_]/g, '_');
        const safeKey = normalized.length === 0 ? 'custom' : normalized;
        return `endlessdimensions:custom_${safeKey}`;
    }

    private resolveEndlessFacade(): any {
        const globalEndless = (globalThis as any).Endless;
        if (globalEndless) {
            return globalEndless;
        }

        const java = (globalThis as any).Java;
        if (java && typeof java.type === 'function') {
            try {
                const registry = java.type('endless.bridge.registry.BridgeRegistry');
                if (registry && registry.isRegistered('Endless')) {
                    const facade = registry.get('Endless');
                    if (facade) {
                        (globalThis as any).Endless = facade;
                        return facade;
                    }
                }
            } catch (error) {
                this.logger.warn('Failed to resolve Endless facade from BridgeRegistry', error);
            }
        }

        return null;
    }

    private generateBookTitle(grid: SynthesizerGrid): string {
        const column = grid.columns.find(col => col.unlocked && col.baseBiome);
        if (!column) {
            return 'Custom Dimension';
        }

        const surfaceName = this.extractBlockName(column.surfaceBlock || column.baseBiome || 'minecraft:stone');
        const liquidName = this.extractBlockName(column.liquidBlock || 'minecraft:water');
        return `Dimension: ${surfaceName} & ${liquidName}`;
    }

    private extractBlockName(blockId: string): string {
        return blockId
            .replace('minecraft:', '')
            .replace(/_/g, ' ')
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    private async givePlayerBook(playerId: string, seedKey: string, bookTitle: string): Promise<void> {
        const bookNBT = {
            title: bookTitle,
            author: 'Biome Synthesizer',
            pages: [
                `{"text":"${seedKey}","color":"dark_aqua","bold":true}`,
                '{"text":"\\n\\nThis book contains the key to a custom dimension created with the Biome Synthesizer.\\n\\nDrop this book in a nether portal to travel there!","color":"gray"}'
            ],
            resolved: 1
        };

        const giveCommand = `/give ${playerId} minecraft:written_book{${this.nbtToString(bookNBT)}}`;
        await this.api.server.executeCommand(giveCommand);
        await this.api.server.executeCommand(`/tellraw ${playerId} {"text":"?6Biome Synthesizer: ?eCreated dimension key \"${seedKey}\"?6!?r","color":"gold"}`);
    }

    private nbtToString(nbt: any): string {
        return JSON.stringify(nbt)
            .replace(/"/g, '')
            .replace(/:/g, ':')
            .replace(/,/g, ',')
            .replace(/{/g, '{')
            .replace(/}/g, '}')
            .replace(/\[/g, '[')
            .replace(/\]/g, ']');
    }

    public hasSeedKey(seedKey: string): boolean {
        return this.bridgeData.has(seedKey);
    }

    public getDimensionId(seedKey: string): string | null {
        return this.bridgeData.get(seedKey)?.dimensionId || null;
    }

    public getBridgeData(seedKey: string): EasterEggBridgeData | null {
        return this.bridgeData.get(seedKey) || null;
    }

    public getAllBridgeData(): Map<string, EasterEggBridgeData> {
        return new Map(this.bridgeData);
    }
}
