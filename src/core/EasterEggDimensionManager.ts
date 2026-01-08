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
        this.easterEggFolderPath = path.join(process.cwd(), 'src', 'data', 'easter_egg_dimensions');
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
            // Try multiple possible paths for easter egg folder
            const possiblePaths = [
                path.join(process.cwd(), 'src', 'data', 'easter_egg_dimensions'),
                path.join(__dirname, '..', 'data', 'easter_egg_dimensions'),
                path.join('.', 'src', 'data', 'easter_egg_dimensions'),
                './src/data/easter_egg_dimensions'
            ];

            let folderCreated = false;

            for (const possiblePath of possiblePaths) {
                try {
                    if (!((globalThis as any).fs.existsSync(possiblePath))) {
                        (globalThis as any).fs.mkdirSync(possiblePath, { recursive: true });
                        this.logger.info(`Created easter egg dimensions folder: ${possiblePath}`);
                    }
                    this.easterEggFolderPath = possiblePath;
                    folderCreated = true;
                    break;
                } catch (pathError) {
                    // Don't catch "Moud API not ready" errors - let them propagate
                    if (pathError.message && pathError.message.includes('Moud API not ready')) {
                        throw pathError;
                    }
                    this.logger.debug(`Failed to create folder at ${possiblePath}: ${pathError}`);
                }
            }

            if (!folderCreated) {
                throw new Error('Could not create easter egg dimensions folder at any location');
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
            if (!((globalThis as any).fs.existsSync(this.easterEggFolderPath))) {
                return;
            }

            const files = (globalThis as any).fs.readdirSync(this.easterEggFolderPath);
            for (const file of files) {
                if (file.endsWith('.json')) {
                    try {
                        const filePath = path.join(this.easterEggFolderPath, file);
                        const content = (globalThis as any).fs.readFileSync(filePath, 'utf8');
                        const dimension: SavedEasterEggDimension = JSON.parse(content);
                        const easterEggString = path.basename(file, '.json');

                        this.savedDimensions.set(easterEggString, dimension);
                        this.logger.debug(`Loaded saved easter egg dimension: ${easterEggString}`);
                    } catch (error) {
                        // Don't catch "Moud API not ready" errors - let them propagate
                        if (error.message && error.message.includes('Moud API not ready')) {
                            throw error;
                        }
                        this.logger.error(`Failed to load easter egg dimension file: ${file}`, error);
                    }
                }
            }

            this.logger.info(`Loaded ${this.savedDimensions.size} saved easter egg dimensions`);
        } catch (error) {
            this.logger.error('Failed to load saved easter egg dimensions', error);
        }
    }

    /**
     * Check if an easter egg dimension exists for the given string
     * @param easterEggString The easter egg string to check
     * @returns SavedEasterEggDimension if found, null otherwise
     */
    public checkEasterEggDimension(easterEggString: string): SavedEasterEggDimension | null {
        return this.savedDimensions.get(easterEggString.toLowerCase()) || null;
    }

    /**
     * Get all saved easter egg dimensions
     * @returns Map of all saved easter egg dimensions
     */
    public getAllSavedDimensions(): Map<string, SavedEasterEggDimension> {
        return new Map(this.savedDimensions);
    }

    /**
     * Delete a saved easter egg dimension
     * @param easterEggString The easter egg string to delete
     * @returns True if deleted, false if not found
     */
    public deleteSavedDimension(easterEggString: string): void {
        // Execute immediately since initialize() already ensured API is ready
        this.doDeleteSavedDimension(easterEggString);
    }

    /**
     * Actually delete dimension (called when API is ready)
     */
    private doDeleteSavedDimension(easterEggString: string): boolean {
        try {
            const filePath = path.join(this.easterEggFolderPath, `${easterEggString}.json`);

            if ((globalThis as any).fs.existsSync(filePath)) {
                (globalThis as any).fs.unlinkSync(filePath);
                this.savedDimensions.delete(easterEggString);
                this.logger.info(`Deleted saved easter egg dimension: ${easterEggString}`);
                return true;
            }

            return false;
        } catch (error) {
            // Don't catch "Moud API not ready" errors - let them propagate
            if (error.message && error.message.includes('Moud API not ready')) {
                throw error;
            }
            this.logger.error(`Failed to delete saved easter egg dimension: ${easterEggString}`, error);
            return false;
        }
    }

    /**
     * Get statistics about saved easter egg dimensions
     * @returns Statistics object
     */
    public getStatistics(): { totalDimensions: number; folderPath: string; dimensions: string[] } {
        return {
            totalDimensions: this.savedDimensions.size,
            folderPath: this.easterEggFolderPath,
            dimensions: Array.from(this.savedDimensions.keys())
        };
    }

    /**
     * Reload saved dimensions from disk
     */
    public reloadFromDisk(): void {
        // Execute immediately since initialize() already ensured API is ready
        this.doReloadFromDisk();
    }

    /**
     * Actually reload from disk (called when API is ready)
     */
    private doReloadFromDisk(): void {
        this.savedDimensions.clear();
        this.doLoadSavedDimensions();
        this.logger.info('Reloaded easter egg dimensions from disk');
    }
}
