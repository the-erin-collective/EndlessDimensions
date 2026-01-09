/// <reference types="@epi-studio/moud-sdk" />
import { Logger } from '../utils/Logger';
import { EasterEggDimension } from './HashEngine';
import * as path from 'path';

export interface SavedEasterEggDimension {
    name: string;
    displayName: string;
    generatorType: string;
    defaultBlock: string;
    specialFeatures: string[];
    createdAt: string;
    dimensionId: string;
}

export class EasterEggDimensionManager {
    private api: MoudAPI;
    private logger: Logger;
    private easterEggFolderPath: string;
    private savedDimensions: Map<string, SavedEasterEggDimension>;

    constructor(api: MoudAPI) {
        this.api = api;
        this.logger = new Logger('EasterEggDimensionManager');
        this.easterEggFolderPath = 'data/easter_egg_dimensions';
        this.savedDimensions = new Map();
        // Don't initialize here - wait for initialize() to be called
    }

    /**
     * Initialize the EasterEggDimensionManager (must be called after construction)
     */
    public async initialize(): Promise<void> {
        this.logger.info('Initializing EasterEggDimensionManager...');

        return new Promise<void>((resolve, reject) => {
            const onReady = () => {
                try {
                    console.log('[EasterEggDimensionManager] Moud API is ready! Loading dimensions...');
                    this.createEasterEggFolder();
                    this.doLoadSavedDimensions();
                    resolve();
                } catch (error) {
                    this.logger.error('Error during EasterEggDimensionManager initialization:', error);
                    reject(error);
                }
            };

            if ((globalThis as any).onMoudReady) {
                (globalThis as any).onMoudReady(onReady);
            } else {
                // Fallback polling if polyfill not present
                const checkApi = () => {
                    if (typeof (globalThis as any).api !== 'undefined' && typeof (globalThis as any).fs !== 'undefined') {
                        onReady();
                    } else {
                        setTimeout(checkApi, 100);
                    }
                };
                checkApi();
            }
        });
    }

    /**
     * Actually create the folder (called when API is ready)
     */
    private createEasterEggFolder(): void {
        try {
            const folderPath = 'data/easter_egg_dimensions';
            try {
                if (!((globalThis as any).fs.existsSync(folderPath))) {
                    (globalThis as any).fs.mkdirSync(folderPath, { recursive: true });
                    this.logger.info(`Created easter egg dimensions folder: ${folderPath}`);
                }
                this.easterEggFolderPath = folderPath;
            } catch (pathError) {
                this.logger.debug(`Failed to create folder at ${folderPath}: ${pathError}`);
            }
        } catch (error) {
            this.logger.error('Failed to create easter egg dimensions folder', error);
        }
    }

    /**
     * Actually load dimensions (called when API is ready)
     */
    private doLoadSavedDimensions(): void {
        try {
            // First: Loaded defaults from Assets system
            const defaults = ['ant', 'cherry', 'library'];
            if ((this.api as any).assets && (this.api as any).assets.loadText) {
                for (const name of defaults) {
                    try {
                        const assetPath = `endlessdimensions:easter_egg_dimensions/${name}.json`;
                        const content = (this.api as any).assets.loadText(assetPath);
                        if (content) {
                            const dimension: SavedEasterEggDimension = JSON.parse(content);
                            this.savedDimensions.set(name, dimension);
                            this.logger.debug(`Loaded default easter egg dimension from Assets: ${name}`);
                        }
                    } catch (e) { }
                }
            }

            // Second: Load persisted dimensions from the data folder
            if (((globalThis as any).fs.existsSync(this.easterEggFolderPath))) {
                const files = (globalThis as any).fs.readdirSync(this.easterEggFolderPath);
                for (const file of files) {
                    if (file.endsWith('.json')) {
                        try {
                            const filePath = path.join(this.easterEggFolderPath, file);
                            const content = (globalThis as any).fs.readFileSync(filePath, 'utf8');
                            const dimension: SavedEasterEggDimension = JSON.parse(content);
                            const easterEggString = path.basename(file, '.json');

                            // Don't overwrite assets-based defaults with disk versions unless they are actually different (or user customized)
                            if (!this.savedDimensions.has(easterEggString)) {
                                this.savedDimensions.set(easterEggString, dimension);
                                this.logger.debug(`Loaded saved easter egg dimension from File: ${easterEggString}`);
                            }
                        } catch (error) {
                            this.logger.error(`Failed to load easter egg dimension file: ${file}`, error);
                        }
                    }
                }
            }

            this.logger.info(`Loaded ${this.savedDimensions.size} total easter egg dimensions`);
        } catch (error) {
            this.logger.error('Failed to load saved easter egg dimensions', error);
        }
    }

    public checkEasterEggDimension(easterEggString: string): SavedEasterEggDimension | null {
        return this.savedDimensions.get(easterEggString.toLowerCase()) || null;
    }

    public getAllSavedDimensions(): Map<string, SavedEasterEggDimension> {
        return new Map(this.savedDimensions);
    }

    public deleteSavedDimension(easterEggString: string): void {
        this.doDeleteSavedDimension(easterEggString);
    }

    private doDeleteSavedDimension(easterEggString: string): boolean {
        try {
            // Can't delete asset-based dimensions
            const defaults = ['ant', 'cherry', 'library'];
            if (defaults.includes(easterEggString.toLowerCase())) {
                return false;
            }

            const filePath = path.join(this.easterEggFolderPath, `${easterEggString}.json`);

            if ((globalThis as any).fs.existsSync(filePath)) {
                (globalThis as any).fs.unlinkSync(filePath);
                this.savedDimensions.delete(easterEggString);
                this.logger.info(`Deleted saved easter egg dimension: ${easterEggString}`);
                return true;
            }

            return false;
        } catch (error) {
            this.logger.error(`Failed to delete saved easter egg dimension: ${easterEggString}`, error);
            return false;
        }
    }

    public getStatistics(): { totalDimensions: number; folderPath: string; dimensions: string[] } {
        return {
            totalDimensions: this.savedDimensions.size,
            folderPath: this.easterEggFolderPath,
            dimensions: Array.from(this.savedDimensions.keys())
        };
    }

    public reloadFromDisk(): void {
        this.doReloadFromDisk();
    }

    private doReloadFromDisk(): void {
        this.savedDimensions.clear();
        this.doLoadSavedDimensions();
        this.logger.info('Reloaded easter egg dimensions from disk');
    }
}
