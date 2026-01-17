import { Logger } from '../utils/Logger';
import { getComponentExtractor } from '../utils/ComponentExtractor';

// Legacy BookData interface (what existing code expects)
export interface LegacyBookData {
    title: string;
    author: string;
    pages: string[];
    resolved: boolean;
    generation: number;
    endlessDimension?: {
        name: string;
        properties?: any;
    };
    customData?: any;
}

// Modern component-based book data
interface ModernBookData {
    title?: string;
    author?: string;
    pages: (string | any)[];
    resolved?: boolean;
    generation?: number;
    customData?: any;
}

// Legacy NBT-based book data
interface LegacyNBTData {
    title?: string;
    author?: string;
    pages?: string[];
    resolved?: boolean;
    generation?: number;
    [key: string]: any;
}

/**
 * Unified Item Adapter mapping 1.21+ Components to LegacyBookData interface
 * Ensures backward compatibility while supporting modern Minecraft data structures
 */
export class UnifiedItemAdapter {
    private logger: Logger;
    private componentExtractor: any;

    constructor() {
        this.logger = new Logger('UnifiedItemAdapter');
        this.componentExtractor = getComponentExtractor();
    }

    /**
     * Adapt any book data format to LegacyBookData interface
     */
    public adaptToLegacy(bookData: any, source: 'components' | 'nbt' | 'unknown' = 'unknown'): LegacyBookData {
        try {
            if (!bookData) {
                return this.createEmptyLegacyBook();
            }

            switch (source) {
                case 'components':
                    return this.adaptFromComponents(bookData);
                case 'nbt':
                    return this.adaptFromNBT(bookData);
                default:
                    return this.adaptFromUnknown(bookData);
            }

        } catch (error) {
            this.logger.error('Error adapting book data to legacy format:', error);
            return this.createEmptyLegacyBook();
        }
    }

    /**
     * Adapt from 1.21+ Data Components
     */
    private adaptFromComponents(componentData: ModernBookData): LegacyBookData {
        try {
            const legacy: LegacyBookData = {
                title: componentData.title || 'Untitled',
                author: componentData.author || 'Unknown',
                pages: this.normalizePages(componentData.pages),
                resolved: componentData.resolved !== false,
                generation: componentData.generation || 0
            };

            // Handle custom data
            if (componentData.customData) {
                legacy.customData = componentData.customData;
                
                // Check for EndlessDimension custom data
                if (componentData.customData.EndlessDimension) {
                    legacy.endlessDimension = componentData.customData.EndlessDimension;
                }
            }

            this.logger.debug(`Adapted component data: "${legacy.title}" by ${legacy.author}`);
            return legacy;

        } catch (error) {
            this.logger.error('Error adapting from components:', error);
            return this.createEmptyLegacyBook();
        }
    }

    /**
     * Adapt from legacy NBT data
     */
    private adaptFromNBT(nbtData: LegacyNBTData): LegacyBookData {
        try {
            const legacy: LegacyBookData = {
                title: nbtData.title || 'Untitled',
                author: nbtData.author || 'Unknown',
                pages: this.normalizePages(nbtData.pages || []),
                resolved: nbtData.resolved !== false,
                generation: nbtData.generation || 0
            };

            // Handle custom NBT data
            const { title, author, pages, resolved, generation, ...customData } = nbtData;
            if (Object.keys(customData).length > 0) {
                legacy.customData = customData;
                
                // Check for EndlessDimension custom data
                if (customData.EndlessDimension) {
                    legacy.endlessDimension = customData.EndlessDimension;
                }
            }

            this.logger.debug(`Adapted NBT data: "${legacy.title}" by ${legacy.author}`);
            return legacy;

        } catch (error) {
            this.logger.error('Error adapting from NBT:', error);
            return this.createEmptyLegacyBook();
        }
    }

    /**
     * Adapt from unknown data format
     */
    private adaptFromUnknown(unknownData: any): LegacyBookData {
        try {
            this.logger.debug('Attempting to adapt from unknown data format');

            // Try to detect format and adapt accordingly
            if (unknownData.components) {
                // This looks like item data with components
                const componentData = this.componentExtractor.extractAllBookData(unknownData.components);
                return componentData ? this.adaptFromComponents(componentData) : this.createEmptyLegacyBook();
            }

            if (unknownData.tag || unknownData.nbt) {
                // This looks like item data with NBT
                const nbtData = unknownData.tag || unknownData.nbt;
                return this.adaptFromNBT(nbtData);
            }

            // Try direct adaptation (might already be in legacy format)
            if (unknownData.title || unknownData.author || unknownData.pages) {
                return this.adaptFromNBT(unknownData);
            }

            this.logger.warn('Could not determine data format, creating empty book');
            return this.createEmptyLegacyBook();

        } catch (error) {
            this.logger.error('Error adapting from unknown format:', error);
            return this.createEmptyLegacyBook();
        }
    }

    /**
     * Normalize pages to string array format
     */
    private normalizePages(pages: any): string[] {
        try {
            if (!pages) {
                return [];
            }

            if (Array.isArray(pages)) {
                return pages.map(page => {
                    if (typeof page === 'string') {
                        return page;
                    }
                    
                    if (typeof page === 'object') {
                        // Use component extractor to parse chat components
                        return this.componentExtractor.parsePage(page);
                    }

                    return String(page);
                });
            }

            if (typeof pages === 'string') {
                return [pages];
            }

            return [String(pages)];

        } catch (error) {
            this.logger.error('Error normalizing pages:', error);
            return [];
        }
    }

    /**
     * Create empty legacy book data
     */
    private createEmptyLegacyBook(): LegacyBookData {
        return {
            title: 'Untitled',
            author: 'Unknown',
            pages: [],
            resolved: false,
            generation: 0
        };
    }

    /**
     * Adapt item stack data to legacy book data
     */
    public adaptItemStack(itemStack: any): LegacyBookData | null {
        try {
            if (!itemStack) {
                return null;
            }

            // Check if it's a book item
            if (!this.isBookItem(itemStack.id)) {
                return null;
            }

            // Try components first (1.21+)
            if (itemStack.components) {
                const componentData = this.componentExtractor.extractAllBookData(itemStack.components);
                if (componentData) {
                    return this.adaptFromComponents(componentData);
                }
            }

            // Fallback to NBT
            if (itemStack.tag || itemStack.nbt) {
                const nbtData = itemStack.tag || itemStack.nbt;
                return this.adaptFromNBT(nbtData);
            }

            this.logger.warn('Item stack has no book data (components or NBT)');
            return null;

        } catch (error) {
            this.logger.error('Error adapting item stack:', error);
            return null;
        }
    }

    /**
     * Check if item is a book type
     */
    private isBookItem(itemId: string): boolean {
        const bookItems = [
            'minecraft:written_book',
            'minecraft:writable_book',
            'minecraft:knowledge_book'
        ];

        return bookItems.includes(itemId);
    }

    /**
     * Extract dimension data from legacy book data
     */
    public extractDimensionData(legacyBook: LegacyBookData): any {
        try {
            const dimensionData = {
                title: legacyBook.title,
                author: legacyBook.author,
                pages: legacyBook.pages,
                endlessDimension: legacyBook.endlessDimension,
                customData: legacyBook.customData,
                hasDimensionData: this.hasDimensionData(legacyBook)
            };

            return dimensionData;

        } catch (error) {
            this.logger.error('Error extracting dimension data:', error);
            return null;
        }
    }

    /**
     * Check if book contains dimension-related data
     */
    private hasDimensionData(legacyBook: LegacyBookData): boolean {
        try {
            // Check for explicit EndlessDimension data
            if (legacyBook.endlessDimension) {
                return true;
            }

            // Check pages for dimension keywords
            if (legacyBook.pages && Array.isArray(legacyBook.pages)) {
                const dimensionKeywords = [
                    'dimension:', 'realm:', 'world:', 'plane:', 
                    'create dimension', 'new dimension', 'endless dimension',
                    'infinite dimension', 'custom dimension'
                ];

                for (const page of legacyBook.pages) {
                    if (typeof page === 'string') {
                        const lowerPage = page.toLowerCase();
                        if (dimensionKeywords.some(keyword => lowerPage.includes(keyword))) {
                            return true;
                        }
                    }
                }
            }

            // Check title for dimension keywords
            if (legacyBook.title && typeof legacyBook.title === 'string') {
                const titleKeywords = ['dimension:', 'realm:', 'world:', 'plane:'];
                const lowerTitle = legacyBook.title.toLowerCase();
                return titleKeywords.some(keyword => lowerTitle.includes(keyword));
            }

            return false;

        } catch (error) {
            this.logger.error('Error checking dimension data:', error);
            return false;
        }
    }

    /**
     * Validate adapted legacy book data
     */
    public validateLegacyBook(legacyBook: LegacyBookData): boolean {
        try {
            // Check required fields
            if (!legacyBook.title || typeof legacyBook.title !== 'string') {
                return false;
            }

            if (!legacyBook.author || typeof legacyBook.author !== 'string') {
                return false;
            }

            if (!Array.isArray(legacyBook.pages)) {
                return false;
            }

            if (typeof legacyBook.resolved !== 'boolean') {
                return false;
            }

            if (typeof legacyBook.generation !== 'number') {
                return false;
            }

            return true;

        } catch (error) {
            this.logger.error('Error validating legacy book:', error);
            return false;
        }
    }

    /**
     * Get adapter statistics
     */
    public getStatistics(): any {
        return {
            // This would be populated with actual usage statistics
            totalAdaptations: 0,
            componentAdaptations: 0,
            nbtAdaptations: 0,
            unknownFormatAdaptations: 0,
            errors: 0
        };
    }
}

// Singleton instance for global access
let globalUnifiedItemAdapter: UnifiedItemAdapter | null = null;

/**
 * Get global unified item adapter instance
 */
export function getUnifiedItemAdapter(): UnifiedItemAdapter {
    if (!globalUnifiedItemAdapter) {
        globalUnifiedItemAdapter = new UnifiedItemAdapter();
    }
    return globalUnifiedItemAdapter;
}
