/// <reference types="@epi-studio/moud-sdk" />
import { Logger } from '../utils/Logger';
import { getPacketInterceptor } from './PacketInterceptor';
import { getUnifiedItemAdapter, LegacyBookData } from '../adapters/UnifiedItemAdapter';

/**
 * BookDataBridge - Integration layer between PacketInterceptor and existing systems
 * Provides the unified interface that InventoryManager.ts and PortalHandler.ts expect
 */
export class BookDataBridge {
    private logger: Logger;
    private packetInterceptor: any;
    private itemAdapter: any;
    private isInitialized: boolean = false;

    constructor() {
        this.logger = new Logger('BookDataBridge');
        this.packetInterceptor = getPacketInterceptor();
        this.itemAdapter = getUnifiedItemAdapter();
    }

    /**
     * Initialize the bridge
     */
    public async initialize(): Promise<void> {
        try {
            // Initialize packet interceptor if not already done
            if (!this.packetInterceptor.isInitialized) {
                this.packetInterceptor.initialize();
            }

            this.isInitialized = true;
            this.logger.info('BookDataBridge initialized successfully');

        } catch (error) {
            this.logger.error('Failed to initialize BookDataBridge:', error);
            throw error;
        }
    }

    /**
     * Get book NBT data for player (replaces InventoryManager.getBookNBT)
     */
    public getBookNBT(playerId: string, slot?: number): LegacyBookData | null {
        try {
            if (!this.isInitialized) {
                this.logger.warn('BookDataBridge not initialized');
                return null;
            }

            // Get last known book data from packet interceptor
            const bookData = this.packetInterceptor.getLastKnownData(playerId, slot);
            
            if (!bookData) {
                this.logger.debug(`No book data found for player ${playerId}${slot ? ` slot ${slot}` : ''}`);
                return null;
            }

            // Adapt to legacy format
            const legacyBook = this.itemAdapter.adaptToLegacy(bookData, 'components');
            
            if (!this.itemAdapter.validateLegacyBook(legacyBook)) {
                this.logger.warn('Invalid legacy book data after adaptation');
                return null;
            }

            this.logger.debug(`Retrieved book: "${legacyBook.title}" by ${legacyBook.author}`);
            return legacyBook;

        } catch (error) {
            this.logger.error(`Error getting book NBT for player ${playerId}:`, error);
            return null;
        }
    }

    /**
     * Get all book data for player
     */
    public getAllBookData(playerId: string): LegacyBookData[] {
        try {
            if (!this.isInitialized) {
                this.logger.warn('BookDataBridge not initialized');
                return [];
            }

            const allBookData = this.packetInterceptor.getAllBookData(playerId);
            const legacyBooks: LegacyBookData[] = [];

            for (const bookData of allBookData) {
                const legacyBook = this.itemAdapter.adaptToLegacy(bookData, 'components');
                if (this.itemAdapter.validateLegacyBook(legacyBook)) {
                    legacyBooks.push(legacyBook);
                }
            }

            this.logger.debug(`Retrieved ${legacyBooks.length} books for player ${playerId}`);
            return legacyBooks;

        } catch (error) {
            this.logger.error(`Error getting all book data for player ${playerId}:`, error);
            return [];
        }
    }

    /**
     * Extract dimension data from book (replaces InventoryManager.extractDimensionData)
     */
    public extractDimensionData(bookNBT: LegacyBookData): any {
        try {
            if (!bookNBT) {
                return null;
            }

            return this.itemAdapter.extractDimensionData(bookNBT);

        } catch (error) {
            this.logger.error('Error extracting dimension data:', error);
            return null;
        }
    }

    /**
     * Check if player has dimension books
     */
    public hasDimensionBooks(playerId: string): boolean {
        try {
            const allBooks = this.getAllBookData(playerId);
            
            for (const book of allBooks) {
                const dimensionData = this.extractDimensionData(book);
                if (dimensionData && dimensionData.hasDimensionData) {
                    return true;
                }
            }

            return false;

        } catch (error) {
            this.logger.error(`Error checking dimension books for player ${playerId}:`, error);
            return false;
        }
    }

    /**
     * Get dimension books for player
     */
    public getDimensionBooks(playerId: string): LegacyBookData[] {
        try {
            const allBooks = this.getAllBookData(playerId);
            const dimensionBooks: LegacyBookData[] = [];

            for (const book of allBooks) {
                const dimensionData = this.extractDimensionData(book);
                if (dimensionData && dimensionData.hasDimensionData) {
                    dimensionBooks.push(book);
                }
            }

            return dimensionBooks;

        } catch (error) {
            this.logger.error(`Error getting dimension books for player ${playerId}:`, error);
            return [];
        }
    }

    /**
     * Subscribe to book data events (for integration with existing systems)
     */
    public subscribeToBookEvents(callback: (playerId: string, bookData: LegacyBookData, source: string) => void): void {
        try {
            // This would integrate with your existing event system
            // For now, we'll set up a polling mechanism as a bridge
            
            const pollInterval = 1000; // 1 second
            const knownBooks = new Map<string, LegacyBookData>();

            const pollBooks = () => {
                try {
                    // Get all players (this would need to be implemented based on your player tracking)
                    const players = this.getAllPlayers(); // Placeholder - implement based on your system
                    
                    for (const playerId of players) {
                        const currentBooks = this.getAllBookData(playerId);
                        
                        for (const book of currentBooks) {
                            const bookKey = `${playerId}_${book.title}_${book.author}`;
                            
                            if (!knownBooks.has(bookKey)) {
                                // New book detected
                                knownBooks.set(bookKey, book);
                                callback(playerId, book, 'packet_interception');
                            }
                        }
                    }
                } catch (error) {
                    this.logger.error('Error in book event polling:', error);
                }
            };

            // Start polling
            setInterval(pollBooks, pollInterval);
            this.logger.info('Started book event subscription polling');

        } catch (error) {
            this.logger.error('Error subscribing to book events:', error);
        }
    }

    /**
     * Get all players (placeholder - implement based on your player tracking system)
     */
    private getAllPlayers(): string[] {
        try {
            // This needs to be implemented based on how you track players
            // Could be from api.state, your player manager, etc.
            
            if (api.state) {
                const players = api.state.get("players") || {};
                return Object.keys(players);
            }

            return [];

        } catch (error) {
            this.logger.error('Error getting all players:', error);
            return [];
        }
    }

    /**
     * Get bridge statistics
     */
    public getStatistics(): any {
        try {
            const packetStats = this.packetInterceptor.getStatistics();
            const adapterStats = this.itemAdapter.getStatistics();

            return {
                isInitialized: this.isInitialized,
                packetInterception: packetStats,
                itemAdapter: adapterStats,
                bridge: {
                    totalBookRequests: 0, // Would be tracked in actual implementation
                    successfulExtractions: 0,
                    errors: 0
                }
            };

        } catch (error) {
            this.logger.error('Error getting statistics:', error);
            return null;
        }
    }

    /**
     * Clear all cached data
     */
    public clearCache(): void {
        try {
            this.packetInterceptor.clearCache();
            this.logger.info('BookDataBridge cache cleared');

        } catch (error) {
            this.logger.error('Error clearing cache:', error);
        }
    }

    /**
     * Shutdown the bridge
     */
    public shutdown(): void {
        try {
            this.clearCache();
            this.packetInterceptor.shutdown();
            this.isInitialized = false;
            this.logger.info('BookDataBridge shutdown complete');

        } catch (error) {
            this.logger.error('Error during shutdown:', error);
        }
    }
}

// Singleton instance for global access
let globalBookDataBridge: BookDataBridge | null = null;

/**
 * Get global book data bridge instance
 */
export function getBookDataBridge(): BookDataBridge {
    if (!globalBookDataBridge) {
        globalBookDataBridge = new BookDataBridge();
    }
    return globalBookDataBridge;
}

/**
 * Convenience function to get book NBT (drop-in replacement for InventoryManager.getBookNBT)
 */
export function getBookNBT(playerId: string, slot?: number): LegacyBookData | null {
    const bridge = getBookDataBridge();
    return bridge.getBookNBT(playerId, slot);
}

/**
 * Convenience function to extract dimension data (drop-in replacement for InventoryManager.extractDimensionData)
 */
export function extractDimensionData(bookNBT: LegacyBookData): any {
    const bridge = getBookDataBridge();
    return bridge.extractDimensionData(bookNBT);
}
