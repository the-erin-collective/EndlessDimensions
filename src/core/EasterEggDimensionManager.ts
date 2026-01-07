/// <reference types="@epi-studio/moud-sdk" />
import { Logger } from '../utils/Logger';
import { EasterEggDimension } from './HashEngine';
import * as fs from 'fs';
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
        this.ensureEasterEggFolder();
        this.loadSavedDimensions();
    }

    /**
     * Ensure the easter egg dimensions folder exists
     */
    private ensureEasterEggFolder(): void {
        try {
            if (!fs.existsSync(this.easterEggFolderPath)) {
                fs.mkdirSync(this.easterEggFolderPath, { recursive: true });
                this.logger.info(`Created easter egg dimensions folder: ${this.easterEggFolderPath}`);
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
    public saveEasterEggDimension(easterEggString: string, dimension: EasterEggDimension, dimensionId: string): void {
        try {
            const savedDimension: SavedEasterEggDimension = {
                ...dimension,
                createdAt: new Date().toISOString(),
                dimensionId
            };

            const filePath = path.join(this.easterEggFolderPath, `${easterEggString}.json`);
            fs.writeFileSync(filePath, JSON.stringify(savedDimension, null, 2));

            this.savedDimensions.set(easterEggString, savedDimension);
            this.logger.info(`Saved easter egg dimension: ${easterEggString} -> ${dimensionId}`);
        } catch (error) {
            this.logger.error(`Failed to save easter egg dimension: ${easterEggString}`, error);
        }
    }

    /**
     * Load all saved easter egg dimensions from folder
     */
    private loadSavedDimensions(): void {
        try {
            if (!fs.existsSync(this.easterEggFolderPath)) {
                return;
            }

            const files = fs.readdirSync(this.easterEggFolderPath);
            for (const file of files) {
                if (file.endsWith('.json')) {
                    try {
                        const filePath = path.join(this.easterEggFolderPath, file);
                        const content = fs.readFileSync(filePath, 'utf8');
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
    public deleteSavedDimension(easterEggString: string): boolean {
        try {
            const filePath = path.join(this.easterEggFolderPath, `${easterEggString}.json`);
            
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
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
    public reloadFromDisk(): void {
        this.savedDimensions.clear();
        this.loadSavedDimensions();
        this.logger.info('Reloaded easter egg dimensions from disk');
    }
}
