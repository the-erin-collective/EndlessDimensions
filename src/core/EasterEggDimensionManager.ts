/// <reference types="@epi-studio/moud-sdk" />
import { Logger } from '../utils/Logger';
import { EasterEggDimension } from './HashEngine';
import { getMoudFileSystem } from '../utils/MoudFileSystem';
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
        this.initializeEasterEggFolder().then(() => {
            this.loadSavedDimensions();
        });
    }

    /**
     * Ensure easter egg dimensions folder exists
     */
    private async initializeEasterEggFolder(): Promise<void> {
        try {
            const moudFs = getMoudFileSystem();
            
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
                    if (!(await moudFs.existsSync(possiblePath))) {
                        await moudFs.mkdirSync(possiblePath, { recursive: true });
                        this.logger.info(`Created easter egg dimensions folder: ${possiblePath}`);
                    }
                    this.easterEggFolderPath = possiblePath;
                    folderCreated = true;
                    break;
                } catch (pathError) {
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
     * Save easter egg dimension data to JSON file
     * @param easterEggString The easter egg string (filename)
     * @param dimension The easter egg dimension configuration
     * @param dimensionId The generated dimension ID
     */
    public async saveEasterEggDimension(easterEggString: string, dimension: EasterEggDimension, dimensionId: string): Promise<void> {
        try {
            const savedDimension: SavedEasterEggDimension = {
                ...dimension,
                createdAt: new Date().toISOString(),
                dimensionId
            };

            const moudFs = getMoudFileSystem();
            const filePath = path.join(this.easterEggFolderPath, `${easterEggString}.json`);
            await moudFs.writeFileSync(filePath, JSON.stringify(savedDimension, null, 2));

            this.savedDimensions.set(easterEggString, savedDimension);
            this.logger.info(`Saved easter egg dimension: ${easterEggString} -> ${dimensionId}`);
        } catch (error) {
            this.logger.error(`Failed to save easter egg dimension: ${easterEggString}`, error);
        }
    }

    /**
     * Load all saved easter egg dimensions from folder
     */
    private async loadSavedDimensions(): Promise<void> {
        try {
            const moudFs = getMoudFileSystem();
            
            if (!(await moudFs.existsSync(this.easterEggFolderPath))) {
                return;
            }

            const files = await moudFs.readdirSync(this.easterEggFolderPath);
            for (const file of files) {
                if (file.endsWith('.json')) {
                    try {
                        const filePath = path.join(this.easterEggFolderPath, file);
                        const content = await moudFs.readFileSync(filePath, 'utf8');
                        const dimension: SavedEasterEggDimension = JSON.parse(content);
                        const easterEggString = path.basename(file, '.json');
                        
                        this.savedDimensions.set(easterEggString, dimension);
                        this.logger.debug(`Loaded saved easter egg dimension: ${easterEggString}`);
                    } catch (error) {
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
    public async deleteSavedDimension(easterEggString: string): Promise<boolean> {
        try {
            const moudFs = getMoudFileSystem();
            const filePath = path.join(this.easterEggFolderPath, `${easterEggString}.json`);
            
            if (await moudFs.existsSync(filePath)) {
                await moudFs.unlinkSync(filePath);
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
    public async reloadFromDisk(): Promise<void> {
        this.savedDimensions.clear();
        await this.loadSavedDimensions();
        this.logger.info('Reloaded easter egg dimensions from disk');
    }
}
