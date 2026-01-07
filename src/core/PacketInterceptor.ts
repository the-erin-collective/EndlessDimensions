/// <reference types="@epi-studio/moud-sdk" />
import { Logger } from '../utils/Logger';
import { 
    PACKET_IDS, 
    PACKET_NAMES, 
    DATA_COMPONENTS, 
    ITEM_IDS,
    isBookRelevantPacket,
    isBookItem,
    getPacketName
} from '../utils/NetworkConstants';

// Type definitions for packet data structures
interface PacketData {
    type: number;
    name: string;
    playerId?: string;
    timestamp: number;
    data: any;
}

interface BookComponentData {
    title?: string;
    author?: string;
    pages?: string[];
    resolved?: boolean;
    generation?: number;
    customData?: any;
}

interface ItemStackData {
    id: string;
    count: number;
    components?: Record<string, any>;
    tag?: any; // Legacy NBT fallback
}

/**
 * Direct Packet Interceptor Hook for 1.21+ Data Component environment
 * Bypasses SDK limitations by reading raw packet data
 */
export class PacketInterceptor {
    private logger: Logger;
    private isInitialized: boolean = false;
    private bookDataCache: Map<string, BookComponentData> = new Map();
    private lastBookInteraction: Map<string, number> = new Map();
    private debounceTime: number = 500; // 500ms debounce
    private packetStats: {
        totalPackets: number;
        bookPackets: number;
        successfulExtractions: number;
        errors: number;
    } = {
        totalPackets: 0,
        bookPackets: 0,
        successfulExtractions: 0,
        errors: 0
    };

    constructor() {
        this.logger = new Logger('PacketInterceptor');
    }

    /**
     * Initialize the packet interceptor
     */
    public initialize(): void {
        if (this.isInitialized) {
            this.logger.warn('PacketInterceptor already initialized');
            return;
        }

        try {
            this.setupPacketListeners();
            this.isInitialized = true;
            this.logger.info('PacketInterceptor initialized successfully');
        } catch (error) {
            this.logger.error('Failed to initialize PacketInterceptor:', error);
            throw error;
        }
    }

    /**
     * Setup global packet listeners for book-relevant packets
     */
    private setupPacketListeners(): void {
        // Hook into Moud's packet system
        if (api.packets && api.packets.onIncoming) {
            api.packets.onIncoming((packet: any) => {
                this.handleIncomingPacket(packet);
            });

            this.logger.debug('Registered incoming packet listeners');
        } else {
            throw new Error('Packet API not available in Moud SDK');
        }

        // Optional: Listen to outgoing packets for future features
        if (api.packets && api.packets.onOutgoing) {
            api.packets.onOutgoing((packet: any) => {
                this.handleOutgoingPacket(packet);
            });

            this.logger.debug('Registered outgoing packet listeners');
        }
    }

    /**
     * Handle incoming packets from server
     */
    private handleIncomingPacket(packet: any): void {
        try {
            this.packetStats.totalPackets++;

            // Filter for book-relevant packets
            if (!isBookRelevantPacket(packet.type)) {
                return;
            }

            this.packetStats.bookPackets++;
            this.logger.debug(`Processing book-relevant packet: ${getPacketName(packet.type)}`);

            switch (packet.type) {
                case PACKET_IDS.CLIENTBOUND_CONTAINER_SET_SLOT:
                    this.handleContainerSetSlot(packet);
                    break;

                case PACKET_IDS.CLIENTBOUND_SET_CREATIVE_MODE_SLOT:
                    this.handleCreativeModeSlot(packet);
                    break;

                case PACKET_IDS.CLIENTBOUND_ADD_ENTITY:
                    this.handleAddEntity(packet);
                    break;

                default:
                    this.logger.warn(`Unhandled book-relevant packet: ${getPacketName(packet.type)}`);
            }

        } catch (error) {
            this.packetStats.errors++;
            this.logger.error(`Error handling packet ${getPacketName(packet.type)}:`, error);
        }
    }

    /**
     * Handle outgoing packets from client (for future features)
     */
    private handleOutgoingPacket(packet: any): void {
        // Future: Handle item use packets for interaction detection
        // Currently not needed for book reading
    }

    /**
     * Handle ClientboundContainerSetSlotPacket
     */
    private handleContainerSetSlot(packet: any): void {
        try {
            const { windowId, slot, itemStack } = packet.data || {};
            const playerId = this.extractPlayerId(packet);

            if (!itemStack || !isBookItem(itemStack.id)) {
                return;
            }

            this.logger.debug(`Container slot update: window=${windowId}, slot=${slot}, item=${itemStack.id}`);

            // Extract book data from components (1.21+) or NBT (legacy)
            const bookData = this.extractBookData(itemStack);
            if (bookData) {
                this.cacheBookData(playerId, slot, bookData);
                this.triggerBookProcessing(playerId, bookData, 'container_slot');
            }

        } catch (error) {
            this.logger.error('Error handling container set slot packet:', error);
        }
    }

    /**
     * Handle ClientboundSetCreativeModeSlotPacket
     */
    private handleCreativeModeSlot(packet: any): void {
        try {
            const { slot, itemStack } = packet.data || {};
            const playerId = this.extractPlayerId(packet);

            if (!itemStack || !isBookItem(itemStack.id)) {
                return;
            }

            this.logger.debug(`Creative slot update: slot=${slot}, item=${itemStack.id}`);

            const bookData = this.extractBookData(itemStack);
            if (bookData) {
                this.cacheBookData(playerId, slot, bookData);
                this.triggerBookProcessing(playerId, bookData, 'creative_slot');
            }

        } catch (error) {
            this.logger.error('Error handling creative mode slot packet:', error);
        }
    }

    /**
     * Handle ClientboundAddEntityPacket (for thrown books)
     */
    private handleAddEntity(packet: any): void {
        try {
            const { entityId, entityType, position, item } = packet.data || {};

            if (entityType !== 'minecraft:item' || !item || !isBookItem(item.id)) {
                return;
            }

            this.logger.debug(`Entity spawn: entity=${entityId}, type=${entityType}, item=${item.id}`);

            const bookData = this.extractBookData(item);
            if (bookData) {
                // For thrown books, we use position as identifier
                const entityKey = `entity_${entityId}_${position.x}_${position.y}_${position.z}`;
                this.cacheBookData(entityKey, 0, bookData);
                this.triggerBookProcessing(entityKey, bookData, 'thrown_entity');
            }

        } catch (error) {
            this.logger.error('Error handling add entity packet:', error);
        }
    }

    /**
     * Extract book data from item stack (components or NBT)
     */
    private extractBookData(itemStack: ItemStackData): BookComponentData | null {
        try {
            // Try 1.21+ Data Components first
            if (itemStack.components) {
                return this.extractFromComponents(itemStack.components);
            }

            // Fallback to legacy NBT
            if (itemStack.tag) {
                return this.extractFromNBT(itemStack.tag);
            }

            this.logger.warn('Item stack has no components or NBT data');
            return null;

        } catch (error) {
            this.logger.error('Error extracting book data:', error);
            return null;
        }
    }

    /**
     * Extract book data from 1.21+ Data Components
     */
    private extractFromComponents(components: Record<string, any>): BookComponentData | null {
        try {
            const bookContent = components[DATA_COMPONENTS.WRITTEN_BOOK_CONTENT];
            if (!bookContent) {
                return null;
            }

            const bookData: BookComponentData = {
                title: bookContent.title || 'Untitled',
                author: bookContent.author || 'Unknown',
                pages: this.parsePages(bookContent.pages || []),
                resolved: bookContent.resolved !== false,
                generation: bookContent.generation || 0
            };

            // Extract custom data if present
            const customData = components[DATA_COMPONENTS.CUSTOM_DATA];
            if (customData) {
                bookData.customData = customData;
            }

            this.packetStats.successfulExtractions++;
            return bookData;

        } catch (error) {
            this.logger.error('Error extracting from components:', error);
            return null;
        }
    }

    /**
     * Extract book data from legacy NBT
     */
    private extractFromNBT(tag: any): BookComponentData | null {
        try {
            const bookData: BookComponentData = {
                title: tag.title || 'Untitled',
                author: tag.author || 'Unknown',
                pages: this.parsePages(tag.pages || []),
                resolved: tag.resolved !== false,
                generation: tag.generation || 0
            };

            this.packetStats.successfulExtractions++;
            return bookData;

        } catch (error) {
            this.logger.error('Error extracting from NBT:', error);
            return null;
        }
    }

    /**
     * Parse pages from JSON chat components to raw strings
     */
    private parsePages(pages: any[]): string[] {
        try {
            const parsedPages: string[] = [];

            for (const page of pages) {
                if (typeof page === 'string') {
                    parsedPages.push(page);
                } else if (typeof page === 'object') {
                    // Handle JSON chat component format
                    parsedPages.push(this.parseChatComponent(page));
                } else {
                    parsedPages.push(String(page));
                }
            }

            return parsedPages;
        } catch (error) {
            this.logger.error('Error parsing pages:', error);
            return [];
        }
    }

    /**
     * Parse JSON chat component to raw string
     */
    private parseChatComponent(component: any): string {
        try {
            if (component.text) {
                return component.text;
            }

            if (component.extra && Array.isArray(component.extra)) {
                return component.extra.map((part: any) => this.parseChatComponent(part)).join('');
            }

            // Handle other chat component properties
            if (typeof component === 'object') {
                return Object.values(component).join('');
            }

            return String(component);
        } catch (error) {
            this.logger.error('Error parsing chat component:', error);
            return '';
        }
    }

    /**
     * Extract player ID from packet (implementation depends on Moud SDK)
     */
    private extractPlayerId(packet: any): string {
        // This needs to be implemented based on how Moud SDK provides player context
        return packet.playerId || packet.userId || 'unknown';
    }

    /**
     * Cache book data for retrieval
     */
    private cacheBookData(identifier: string, slot: number, bookData: BookComponentData): void {
        const cacheKey = `${identifier}_${slot}`;
        this.bookDataCache.set(cacheKey, bookData);
        this.lastBookInteraction.set(identifier, Date.now());

        // Clean old entries (keep cache manageable)
        this.cleanupCache();
    }

    /**
     * Trigger book processing with debouncing
     */
    private triggerBookProcessing(identifier: string, bookData: BookComponentData, source: string): void {
        const now = Date.now();
        const lastInteraction = this.lastBookInteraction.get(identifier) || 0;

        // Debounce to prevent multiple triggers
        if (now - lastInteraction < this.debounceTime) {
            this.logger.debug(`Debounced book processing for ${identifier}`);
            return;
        }

        this.logger.info(`Book processing triggered for ${identifier} from ${source}`);
        
        // This would integrate with your existing dimension generation system
        // For now, we'll just log the book data
        this.logger.info(`Book data: title="${bookData.title}", author="${bookData.author}", pages=${bookData.pages.length}`);
    }

    /**
     * Clean up old cache entries
     */
    private cleanupCache(): void {
        const now = Date.now();
        const maxAge = 60000; // 1 minute

        for (const [key, timestamp] of this.lastBookInteraction.entries()) {
            if (now - timestamp > maxAge) {
                this.bookDataCache.delete(key);
                this.lastBookInteraction.delete(key);
            }
        }
    }

    /**
     * Get last known book data for a player/slot
     */
    public getLastKnownData(identifier: string, slot?: number): BookComponentData | null {
        const cacheKey = slot !== undefined ? `${identifier}_${slot}` : identifier;
        return this.bookDataCache.get(cacheKey) || null;
    }

    /**
     * Get all cached book data for a player
     */
    public getAllBookData(identifier: string): BookComponentData[] {
        const results: BookComponentData[] = [];
        
        for (const [key, bookData] of this.bookDataCache.entries()) {
            if (key.startsWith(identifier + '_')) {
                results.push(bookData);
            }
        }

        return results;
    }

    /**
     * Get packet interception statistics
     */
    public getStatistics() {
        return { ...this.packetStats };
    }

    /**
     * Clear all cached data
     */
    public clearCache(): void {
        this.bookDataCache.clear();
        this.lastBookInteraction.clear();
        this.logger.info('PacketInterceptor cache cleared');
    }

    /**
     * Shutdown the packet interceptor
     */
    public shutdown(): void {
        this.clearCache();
        this.isInitialized = false;
        this.logger.info('PacketInterceptor shutdown complete');
    }
}

// Singleton instance for global access
let globalPacketInterceptor: PacketInterceptor | null = null;

/**
 * Get global packet interceptor instance
 */
export function getPacketInterceptor(): PacketInterceptor {
    if (!globalPacketInterceptor) {
        globalPacketInterceptor = new PacketInterceptor();
    }
    return globalPacketInterceptor;
}
