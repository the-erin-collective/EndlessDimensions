/// <reference types="@epi-studio/moud-sdk" />

/**
 * Network packet constants for Minecraft 1.21+ Data Component environment
 * Used for direct packet interception to bypass SDK limitations
 */

export const PACKET_IDS = {
    // Clientbound packets (server -> client)
    CLIENTBOUND_CONTAINER_SET_SLOT: 0x17,
    CLIENTBOUND_SET_CREATIVE_MODE_SLOT: 0x2D,
    CLIENTBOUND_ADD_ENTITY: 0x01,
    CLIENTBOUND_UPDATE_INVENTORY: 0x11,
    
    // Serverbound packets (client -> server) - for future use
    SERVERBOUND_USE_ITEM: 0x1F,
    SERVERBOUND_SET_CREATIVE_MODE_SLOT: 0x28,
    SERVERBOUND_CLICK_WINDOW: 0x0F,
} as const;

export const PACKET_NAMES = {
    [PACKET_IDS.CLIENTBOUND_CONTAINER_SET_SLOT]: 'ClientboundContainerSetSlotPacket',
    [PACKET_IDS.CLIENTBOUND_SET_CREATIVE_MODE_SLOT]: 'ClientboundSetCreativeModeSlotPacket',
    [PACKET_IDS.CLIENTBOUND_ADD_ENTITY]: 'ClientboundAddEntityPacket',
    [PACKET_IDS.CLIENTBOUND_UPDATE_INVENTORY]: 'ClientboundUpdateInventoryPacket',
    [PACKET_IDS.SERVERBOUND_USE_ITEM]: 'ServerboundUseItemPacket',
    [PACKET_IDS.SERVERBOUND_SET_CREATIVE_MODE_SLOT]: 'ServerboundSetCreativeModeSlotPacket',
    [PACKET_IDS.SERVERBOUND_CLICK_WINDOW]: 'ServerboundClickWindowPacket',
} as const;

export const MINECRAFT_VERSIONS = {
    V1_21_0: '1.21.0',
    V1_21_1: '1.21.1',
    V1_21_2: '1.21.2',
    V1_21_3: '1.21.3',
    V1_21_4: '1.21.4',
} as const;

export const DATA_COMPONENTS = {
    WRITTEN_BOOK_CONTENT: 'minecraft:written_book_content',
    WRITABLE_BOOK_CONTENT: 'minecraft:writable_book_content',
    CUSTOM_DATA: 'minecraft:custom_data',
    CUSTOM_NAME: 'minecraft:custom_name',
    LORE: 'minecraft:lore',
    ENCHANTMENTS: 'minecraft:enchantments',
    STORED_ENCHANTMENTS: 'minecraft:stored_enchantments',
} as const;

export const ITEM_IDS = {
    WRITTEN_BOOK: 'minecraft:written_book',
    WRITABLE_BOOK: 'minecraft:writable_book',
    KNOWLEDGE_BOOK: 'minecraft:knowledge_book',
} as const;

/**
 * Get packet name from ID
 */
export function getPacketName(packetId: number): string {
    return PACKET_NAMES[packetId as keyof typeof PACKET_NAMES] || `UnknownPacket(${packetId})`;
}

/**
 * Check if packet is relevant for book data interception
 */
export function isBookRelevantPacket(packetId: number): boolean {
    return packetId === PACKET_IDS.CLIENTBOUND_CONTAINER_SET_SLOT ||
           packetId === PACKET_IDS.CLIENTBOUND_SET_CREATIVE_MODE_SLOT ||
           packetId === PACKET_IDS.CLIENTBOUND_ADD_ENTITY;
}

/**
 * Check if item ID is a book type
 */
export function isBookItem(itemId: string): boolean {
    return Object.values(ITEM_IDS).includes(itemId as typeof ITEM_IDS[keyof typeof ITEM_IDS]);
}

/**
 * Get current Minecraft version (for compatibility checks)
 */
export function getCurrentMinecraftVersion(): string {
    // This would need to be implemented based on Moud SDK version detection
    return MINECRAFT_VERSIONS.V1_21_4; // Default to latest supported
}
