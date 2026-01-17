import { Logger } from './Logger';
import { DATA_COMPONENTS } from './NetworkConstants';

// Type definitions for 1.21+ Data Components
interface WrittenBookContent {
    title?: string;
    author?: string;
    pages?: (string | ChatComponent)[];
    resolved?: boolean;
    generation?: number;
}

interface ChatComponent {
    text?: string;
    extra?: ChatComponent[];
    [key: string]: any; // Allow other chat component properties
}

interface ComponentData {
    [componentName: string]: any;
}

/**
 * ComponentExtractor utility for 1.21+ Data Component system
 * Handles extraction and parsing of book content from modern Minecraft data structures
 */
export class ComponentExtractor {
    private logger: Logger;

    constructor() {
        this.logger = new Logger('ComponentExtractor');
    }

    /**
     * Extract written book content from item components
     */
    public extractWrittenBookContent(components: ComponentData): WrittenBookContent | null {
        try {
            const bookContent = components[DATA_COMPONENTS.WRITTEN_BOOK_CONTENT];
            
            if (!bookContent) {
                this.logger.debug('No written_book_content component found');
                return null;
            }

            const extracted: WrittenBookContent = {
                title: bookContent.title || 'Untitled',
                author: bookContent.author || 'Unknown',
                pages: this.parsePages(bookContent.pages || []),
                resolved: bookContent.resolved !== false,
                generation: bookContent.generation || 0
            };

            this.logger.debug(`Extracted book: "${extracted.title}" by ${extracted.author} (${extracted.pages.length} pages)`);
            return extracted;

        } catch (error) {
            this.logger.error('Error extracting written book content:', error);
            return null;
        }
    }

    /**
     * Extract writable book content from item components
     */
    public extractWritableBookContent(components: ComponentData): WrittenBookContent | null {
        try {
            const bookContent = components[DATA_COMPONENTS.WRITABLE_BOOK_CONTENT];
            
            if (!bookContent) {
                this.logger.debug('No writable_book_content component found');
                return null;
            }

            const extracted: WrittenBookContent = {
                title: 'Untitled', // Writable books don't have titles until signed
                author: 'Unknown', // Writable books don't have authors until signed
                pages: this.parsePages(bookContent.pages || []),
                resolved: false, // Writable books are always unresolved
                generation: 0
            };

            this.logger.debug(`Extracted writable book (${extracted.pages.length} pages)`);
            return extracted;

        } catch (error) {
            this.logger.error('Error extracting writable book content:', error);
            return null;
        }
    }

    /**
     * Parse pages from component format to raw strings
     */
    public parsePages(pages: (string | ChatComponent)[]): string[] {
        try {
            const parsedPages: string[] = [];

            for (let i = 0; i < pages.length; i++) {
                const page = pages[i];
                const parsedPage = this.parsePage(page);
                parsedPages.push(parsedPage);

                this.logger.debug(`Parsed page ${i + 1}: "${parsedPage.substring(0, 50)}${parsedPage.length > 50 ? '...' : ''}"`);
            }

            return parsedPages;
        } catch (error) {
            this.logger.error('Error parsing pages:', error);
            return [];
        }
    }

    /**
     * Parse individual page from chat component to raw string
     */
    public parsePage(page: string | ChatComponent): string {
        try {
            if (typeof page === 'string') {
                return page;
            }

            if (typeof page === 'object' && page !== null) {
                return this.parseChatComponent(page);
            }

            return String(page);
        } catch (error) {
            this.logger.error('Error parsing page:', error);
            return '';
        }
    }

    /**
     * Parse JSON chat component to raw string with full formatting support
     */
    public parseChatComponent(component: ChatComponent): string {
        try {
            let result = '';

            // Handle text property
            if (component.text) {
                result += component.text;
            }

            // Handle extra content (nested components)
            if (component.extra && Array.isArray(component.extra)) {
                for (const extra of component.extra) {
                    result += this.parseChatComponent(extra);
                }
            }

            // Handle other common chat component properties
            const otherProperties = ['translate', 'keybind', 'score', 'selector', 'nbt'];
            for (const prop of otherProperties) {
                if (component[prop]) {
                    result += this.handleSpecialProperty(prop, component[prop]);
                }
            }

            return result;
        } catch (error) {
            this.logger.error('Error parsing chat component:', error);
            return '';
        }
    }

    /**
     * Handle special chat component properties
     */
    private handleSpecialProperty(property: string, value: any): string {
        try {
            switch (property) {
                case 'translate':
                    // Handle translation keys
                    if (typeof value === 'string') {
                        return `[translate:${value}]`;
                    } else if (typeof value === 'object' && value.translate) {
                        let result = `[translate:${value.translate}]`;
                        if (value.with && Array.isArray(value.with)) {
                            result += '(' + value.with.map((arg: any) => this.parseChatComponent(arg)).join(', ') + ')';
                        }
                        return result;
                    }
                    break;

                case 'keybind':
                    // Handle keybind references
                    return `[keybind:${value}]`;

                case 'score':
                    // Handle score components
                    if (typeof value === 'object' && value.name && value.objective) {
                        return `[score:${value.name}:${value.objective}]`;
                    }
                    break;

                case 'selector':
                    // Handle entity selectors
                    return `[selector:${value}]`;

                case 'nbt':
                    // Handle NBT references
                    return `[nbt:${value}]`;

                default:
                    // Handle unknown properties
                    return `[${property}:${JSON.stringify(value)}]`;
            }

            return '';
        } catch (error) {
            this.logger.error(`Error handling property ${property}:`, error);
            return '';
        }
    }

    /**
     * Extract custom data from components
     */
    public extractCustomData(components: ComponentData): any {
        try {
            const customData = components[DATA_COMPONENTS.CUSTOM_DATA];
            
            if (!customData) {
                return null;
            }

            this.logger.debug('Extracted custom data from components');
            return customData;

        } catch (error) {
            this.logger.error('Error extracting custom data:', error);
            return null;
        }
    }

    /**
     * Extract all relevant book data from components
     */
    public extractAllBookData(components: ComponentData): WrittenBookContent | null {
        try {
            // Try written book first
            let bookData = this.extractWrittenBookContent(components);
            
            // Fallback to writable book
            if (!bookData) {
                bookData = this.extractWritableBookContent(components);
            }

            if (bookData) {
                // Add custom data if present
                const customData = this.extractCustomData(components);
                if (customData) {
                    (bookData as any).customData = customData;
                }
            }

            return bookData;

        } catch (error) {
            this.logger.error('Error extracting all book data:', error);
            return null;
        }
    }

    /**
     * Validate component structure
     */
    public validateComponents(components: ComponentData): boolean {
        try {
            if (!components || typeof components !== 'object') {
                return false;
            }

            // Check for required component structure
            const hasWrittenBook = components[DATA_COMPONENTS.WRITTEN_BOOK_CONTENT];
            const hasWritableBook = components[DATA_COMPONENTS.WRITABLE_BOOK_CONTENT];

            return !!(hasWrittenBook || hasWritableBook);

        } catch (error) {
            this.logger.error('Error validating components:', error);
            return false;
        }
    }

    /**
     * Get component information for debugging
     */
    public getComponentInfo(components: ComponentData): any {
        try {
            const info: any = {
                hasWrittenBook: !!components[DATA_COMPONENTS.WRITTEN_BOOK_CONTENT],
                hasWritableBook: !!components[DATA_COMPONENTS.WRITABLE_BOOK_CONTENT],
                hasCustomData: !!components[DATA_COMPONENTS.CUSTOM_DATA],
                totalComponents: Object.keys(components).length,
                componentNames: Object.keys(components)
            };

            // Add page count if available
            if (components[DATA_COMPONENTS.WRITTEN_BOOK_CONTENT]?.pages) {
                info.writtenBookPageCount = components[DATA_COMPONENTS.WRITTEN_BOOK_CONTENT].pages.length;
            }
            if (components[DATA_COMPONENTS.WRITABLE_BOOK_CONTENT]?.pages) {
                info.writableBookPageCount = components[DATA_COMPONENTS.WRITABLE_BOOK_CONTENT].pages.length;
            }

            return info;

        } catch (error) {
            this.logger.error('Error getting component info:', error);
            return null;
        }
    }
}

// Singleton instance for global access
let globalComponentExtractor: ComponentExtractor | null = null;

/**
 * Get global component extractor instance
 */
export function getComponentExtractor(): ComponentExtractor {
    if (!globalComponentExtractor) {
        globalComponentExtractor = new ComponentExtractor();
    }
    return globalComponentExtractor;
}
