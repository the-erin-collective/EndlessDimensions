import { Logger } from '../utils/Logger';

/**
 * File system wrapper that waits for Moud API to be available
 */
export class MoudFileSystem {
    private logger: Logger;
    private api: any = null;
    private isApiAvailable: boolean = false;
    private initPromise: Promise<void> | null = null;

    constructor() {
        this.logger = new Logger('MoudFileSystem');
        this.waitForApi();
    }

    /**
     * Wait for Moud API to become available
     */
    private async waitForApi(): Promise<void> {
        if (this.initPromise) {
            return this.initPromise;
        }

        this.initPromise = new Promise((resolve) => {
            const onReady = () => {
                this.api = (globalThis as any).api;
                this.isApiAvailable = true;
                this.logger.info('Moud API is now available for file operations');
                resolve();
            };

            if ((globalThis as any).onMoudReady) {
                (globalThis as any).onMoudReady(onReady);
            } else {
                const checkApi = () => {
                    if (typeof (globalThis as any).api !== 'undefined' && (globalThis as any).api.internal && (globalThis as any).api.internal.fs) {
                        onReady();
                    } else {
                        // Check again in 50ms
                        setTimeout(checkApi, 50);
                    }
                };
                checkApi();
            }
        });

        return this.initPromise;
    }

    /**
     * Ensure API is available before performing operations
     */
    private async ensureApi(): Promise<void> {
        if (!this.isApiAvailable) {
            await this.waitForApi();
        }
    }

    /**
     * Check if file exists
     */
    async existsSync(path: string): Promise<boolean> {
        await this.ensureApi();

        try {
            if (this.api && this.api.internal && this.api.internal.fs) {
                this.api.internal.fs.stat(path);
                return true;
            }
            return false;
        } catch (error) {
            return false;
        }
    }

    /**
     * Read file content
     */
    async readFileSync(path: string, encoding: string = 'utf8'): Promise<string> {
        await this.ensureApi();

        if (this.api && this.api.internal && this.api.internal.fs) {
            return this.api.internal.fs.readFile(path, encoding);
        }

        throw new Error('Moud API not available for file reading');
    }

    /**
     * Write file content
     */
    async writeFileSync(path: string, data: string, encoding: string = 'utf8'): Promise<void> {
        await this.ensureApi();

        if (this.api && this.api.internal && this.api.internal.fs) {
            return this.api.internal.fs.writeFile(path, data, encoding);
        }

        throw new Error('Moud API not available for file writing');
    }

    /**
     * Create directory
     */
    async mkdirSync(path: string, options?: any): Promise<void> {
        await this.ensureApi();

        if (this.api && this.api.internal && this.api.internal.fs) {
            return this.api.internal.fs.mkdir(path, options);
        }

        throw new Error('Moud API not available for directory creation');
    }

    /**
     * Read directory contents
     */
    async readdirSync(path: string): Promise<string[]> {
        await this.ensureApi();

        if (this.api && this.api.internal && this.api.internal.fs) {
            return this.api.internal.fs.readdir(path);
        }

        throw new Error('Moud API not available for directory reading');
    }

    /**
     * Get file stats
     */
    async statSync(path: string): Promise<any> {
        await this.ensureApi();

        if (this.api && this.api.internal && this.api.internal.fs) {
            return this.api.internal.fs.stat(path);
        }

        throw new Error('Moud API not available for file stats');
    }

    /**
     * Delete file
     */
    async unlinkSync(path: string): Promise<void> {
        await this.ensureApi();

        if (this.api && this.api.internal && this.api.internal.fs) {
            return this.api.internal.fs.unlink(path);
        }

        throw new Error('Moud API not available for file deletion');
    }

    /**
     * Check if API is available
     */
    isAvailable(): boolean {
        return this.isApiAvailable;
    }
}

// Singleton instance
let moudFsInstance: MoudFileSystem | null = null;

/**
 * Get Moud file system instance
 */
export function getMoudFileSystem(): MoudFileSystem {
    if (!moudFsInstance) {
        moudFsInstance = new MoudFileSystem();
    }
    return moudFsInstance;
}
