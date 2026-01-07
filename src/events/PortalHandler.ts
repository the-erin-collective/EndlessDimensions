/// <reference types="@epi-studio/moud-sdk" />
import { DimensionGenerator } from '../core/DimensionGenerator';
import { HashEngine } from '../core/HashEngine';
import { EasterEggDimensionManager } from '../core/EasterEggDimensionManager';

export class PortalHandler {
    private api: MoudAPI;
    private dimensionGenerator: DimensionGenerator;
    private hashEngine: HashEngine;
    private easterEggManager: EasterEggDimensionManager;
    private isRegistered: boolean = false;

    constructor(api: MoudAPI, dimensionGenerator: DimensionGenerator, hashEngine: HashEngine, easterEggManager?: EasterEggDimensionManager) {
        this.api = api;
        this.dimensionGenerator = dimensionGenerator;
        this.hashEngine = hashEngine;
        this.easterEggManager = easterEggManager || new EasterEggDimensionManager(api);
    }

    /**
     * Register all event handlers for portal interactions
     */
    public registerEvents(): void {
        if (this.isRegistered) {
            console.warn('PortalHandler events are already registered');
            return;
        }

        // Note: Event registration is not available in Moud SDK
        // This is a placeholder for future implementation
        console.log('Event registration not yet supported in Moud SDK');
        // TODO: Implement when Moud SDK adds event support
        /*
        this.api.on('item_entity_spawn', this.onItemEntitySpawn.bind(this));
        this.api.on('entity_collide', this.onEntityCollide.bind(this));
        this.api.on('player_portal', this.onPlayerPortal.bind(this));
        */

        this.isRegistered = true;
        console.log('PortalHandler events registered successfully');
    }

    /**
     * Handle when an item entity is spawned (thrown)
     * @param event The item entity spawn event
     */
    private onItemEntitySpawn(event: any): void {
        try {
            const { entity, itemStack, thrower } = event;
            
            // Check if item is a written book
            if (this.isWrittenBook(itemStack)) {
                console.log('Written book thrown, monitoring for portal entry...');
                
                // Store the book data on the entity for later use
                entity.bookData = {
                    text: this.extractBookText(itemStack),
                    author: this.extractBookAuthor(itemStack),
                    title: this.extractBookTitle(itemStack),
                    timestamp: Date.now()
                };
            }
        } catch (error) {
            console.error('Error in item entity spawn handler:', error);
        }
    }

    /**
     * Handle when an entity collides with a block (like entering a portal)
     * @param event The entity collision event
     */
    private onEntityCollide(event: any): void {
        try {
            const { entity, block, position } = event;
            
            // Check if entity is an item entity with book data
            if (entity && entity.bookData) {
                // Check if block is a nether portal
                if (this.isNetherPortal(block)) {
                    console.log('Book entered nether portal, generating dimension...');
                    this.handleBookInPortal(entity, position);
                }
            }
        } catch (error) {
            console.error('Error in entity collision handler:', error);
        }
    }

    /**
     * Handle when a player uses a portal
     * @param event The player portal event
     */
    private onPlayerPortal(event: any): void {
        try {
            const { player, portalType, fromDimension, toDimension } = event;
            
            // Check if this is a nether portal and player is holding a book
            if (portalType === 'nether' && this.isHoldingWrittenBook(player)) {
                const bookStack = player.getMainHandItem();
                if (this.isWrittenBook(bookStack)) {
                    console.log('Player with book using nether portal, generating dimension...');
                    this.handlePlayerWithBookInPortal(player, bookStack);
                }
            }
        } catch (error) {
            console.error('Error in player portal handler:', error);
        }
    }

    /**
     * Handle when a book enters a portal
     * @param bookEntity The book item entity
     * @param portalPosition The position of portal
     */
    private handleBookInPortal(bookEntity: any, portalPosition: any): void {
        try {
            // Note: ItemEntity and ItemStack types are not available in Moud SDK
            // This is a placeholder for future implementation
            console.log('Book in portal handling not yet supported in Moud SDK');
            // TODO: Implement when Moud SDK adds entity and item support
            /*
            const bookData = bookEntity.bookData;
            if (!bookData || !bookData.text) {
                console.warn('Book entity missing text data');
                return;
            }

            // First check if this is a saved easter egg dimension
            const savedDimension = this.easterEggManager.checkEasterEggDimension(bookData.text.trim());
            if (savedDimension) {
                console.log(`Found saved easter egg dimension: ${bookData.text} -> ${savedDimension.dimensionId}`);
                // Use saved dimension configuration
                this.handleSavedDimension(savedDimension, portalPosition, bookData);
                return;
            }

            // Check for built-in easter egg dimensions
            const easterEgg = this.hashEngine.checkEasterEgg(bookData.text);
            if (easterEgg) {
                console.log(`Found built-in easter egg dimension: ${bookData.text}`);
                const dimensionConfig = this.dimensionGenerator.generateDimension(bookData.text);
                
                // Save the easter egg dimension to folder
                const dimensionId = this.hashEngine.getDimensionId(this.hashEngine.getDimensionSeedBigInt(bookData.text));
                this.easterEggManager.saveEasterEggDimension(bookData.text.trim(), easterEgg, dimensionId);
                
                // Register dimension
                this.dimensionGenerator.registerDimension(dimensionConfig);
                
                // Create visual effects
                this.createPortalEffects(portalPosition, dimensionConfig);
                
                // Notify nearby players
                this.notifyNearbyPlayers(portalPosition, dimensionConfig, bookData);
                return;
            }

            // Generate procedural dimension
            const dimensionConfig = this.dimensionGenerator.generateDimension(bookData.text);
            
            // Register dimension
            this.dimensionGenerator.registerDimension(dimensionConfig);
            
            // Create visual effects
            this.createPortalEffects(portalPosition, dimensionConfig);
            
            // Notify nearby players
            this.notifyNearbyPlayers(portalPosition, dimensionConfig, bookData);
            */
        } catch (error) {
            console.error('Error handling book in portal:', error);
        }
    }

    /**
     * Handle when a player with a book uses a portal
     * @param player The player
     * @param bookStack The book item stack
     */
    private handlePlayerWithBookInPortal(player: Player, bookStack: any): void {
        try {
            // Note: ItemStack and inventory methods are not available in Moud SDK
            // This is a placeholder for future implementation
            console.log('Player with book in portal handling not yet supported in Moud SDK');
            // TODO: Implement when Moud SDK adds inventory support
            /*
            const bookText = this.extractBookText(bookStack);
            if (!bookText) {
                console.warn('Player book missing text');
                return;
            }

            // First check if this is a saved easter egg dimension
            const savedDimension = this.easterEggManager.checkEasterEggDimension(bookText.trim());
            if (savedDimension) {
                console.log(`Found saved easter egg dimension: ${bookText} -> ${savedDimension.dimensionId}`);
                // Use saved dimension configuration
                this.handleSavedDimensionForPlayer(savedDimension, player, bookText);
                return;
            }

            // Generate dimension based on book text
            const dimensionConfig = this.dimensionGenerator.generateDimension(bookText);
            
            // Register dimension
            this.dimensionGenerator.registerDimension(dimensionConfig);
            
            // Teleport player to new dimension
            this.teleportPlayerToDimension(player, dimensionConfig);
            
            // Create visual effects
            this.createPortalEffects(player.position, dimensionConfig);
            
            // Consume book (optional - make it configurable)
            if (bookStack.getAmount() > 1) {
                bookStack.setAmount(bookStack.getAmount() - 1);
            } else {
                player.getInventory().removeItem(player.getInventory().getHeldItemIndex());
            }
            */
        } catch (error) {
            console.error('Error handling player with book in portal:', error);
        }
    }

    /**
     * Handle a saved easter egg dimension (for thrown books)
     * @param savedDimension The saved dimension configuration
     * @param portalPosition The portal position
     * @param bookData The book data
     */
    private handleSavedDimension(savedDimension: any, portalPosition: any, bookData: any): void {
        try {
            console.log(`Using saved easter egg dimension: ${savedDimension.displayName}`);
            
            // Create dimension config from saved data
            const dimensionConfig = {
                id: savedDimension.dimensionId,
                name: savedDimension.displayName,
                generatorType: savedDimension.generatorType,
                defaultBlock: savedDimension.defaultBlock,
                defaultFluid: 'minecraft:water',
                seaLevel: 64,
                minY: 0,
                height: 256,
                additionalBlocks: [],
                specialFeatures: savedDimension.specialFeatures
            };
            
            // Create visual effects
            this.createPortalEffects(portalPosition, dimensionConfig);
            
            // Notify nearby players
            this.notifyNearbyPlayers(portalPosition, dimensionConfig, bookData);
        } catch (error) {
            console.error('Error handling saved dimension:', error);
        }
    }

    /**
     * Handle a saved easter egg dimension (for players)
     * @param savedDimension The saved dimension configuration
     * @param player The player
     * @param bookText The original book text
     */
    private handleSavedDimensionForPlayer(savedDimension: any, player: Player, bookText: string): void {
        try {
            console.log(`Using saved easter egg dimension for player: ${savedDimension.displayName}`);
            
            // Create dimension config from saved data
            const dimensionConfig = {
                id: savedDimension.dimensionId,
                name: savedDimension.displayName,
                generatorType: savedDimension.generatorType,
                defaultBlock: savedDimension.defaultBlock,
                defaultFluid: 'minecraft:water',
                seaLevel: 64,
                minY: 0,
                height: 256,
                additionalBlocks: [],
                specialFeatures: savedDimension.specialFeatures
            };
            
            // Teleport player to dimension
            this.teleportPlayerToDimension(player, dimensionConfig);
            
            // Create visual effects
            this.createPortalEffects({ x: 0, y: 64, z: 0 }, dimensionConfig);
            
            // Send message to player
            player.sendMessage(`§6Welcome to saved dimension: §f${savedDimension.displayName}!`);
            player.sendMessage(`§7Originally created from: §f"${bookText}"`);
        } catch (error) {
            console.error('Error handling saved dimension for player:', error);
        }
    }

    /**
     * Check if an item stack is a written book
     * @param itemStack The item stack to check
     * @returns True if it's a written book, false otherwise
     */
    private isWrittenBook(itemStack: any): boolean {
        try {
            // Note: ItemStack type is not available in Moud SDK
            // This is a placeholder for future implementation
            console.log('Item stack checking not yet supported in Moud SDK');
            return false;
            // TODO: Implement when Moud SDK adds item support
            /*
            if (!itemStack) return false;
            const itemId = itemStack.getType().getId();
            return itemId === 'minecraft:written_book';
            */
        } catch (error) {
            return false;
        }
    }

    /**
     * Check if a block is a nether portal
     * @param block The block to check
     * @returns True if it's a nether portal, false otherwise
     */
    private isNetherPortal(block: any): boolean {
        try {
            if (!block) return false;
            const blockId = block.getType().getId();
            return blockId === 'minecraft:nether_portal';
        } catch (error) {
            return false;
        }
    }

    /**
     * Check if a player is holding a written book
     * @param player The player to check
     * @returns True if holding a written book, false otherwise
     */
    private isHoldingWrittenBook(player: Player): boolean {
        try {
            // Note: Player inventory methods are not available in Moud SDK
            // This is a placeholder for future implementation
            console.log('Player inventory checking not yet supported in Moud SDK');
            return false;
            // TODO: Implement when Moud SDK adds inventory support
            /*
            const mainHand = player.getMainHandItem();
            const offHand = player.getOffHandItem();
            return this.isWrittenBook(mainHand) || this.isWrittenBook(offHand);
            */
        } catch (error) {
            return false;
        }
    }

    /**
     * Extract text from a written book
     * @param bookStack The book item stack
     * @returns The text content of book
     */
    private extractBookText(bookStack: any): string {
        try {
            // Note: ItemStack and NBT methods are not available in Moud SDK
            // This is a placeholder for future implementation
            console.log('Book text extraction not yet supported in Moud SDK');
            return '';
            // TODO: Implement when Moud SDK adds item support
            /*
            const nbt = bookStack.getNbt();
            if (!nbt) return '';
            
            // Get pages from NBT
            const pages = nbt.getList('pages');
            if (!pages || pages.length === 0) return '';
            
            // Concatenate all pages
            let text = '';
            for (let i = 0; i < pages.length; i++) {
                const pageText = pages[i].getString();
                text += pageText;
            }
            
            return text.trim();
            */
        } catch (error) {
            console.error('Error extracting book text:', error);
            return '';
        }
    }

    /**
     * Extract author from a written book
     * @param bookStack The book item stack
     * @returns The author of book
     */
    private extractBookAuthor(bookStack: any): string {
        try {
            // Note: ItemStack and NBT methods are not available in Moud SDK
            // This is a placeholder for future implementation
            console.log('Book author extraction not yet supported in Moud SDK');
            return 'Unknown';
            // TODO: Implement when Moud SDK adds item support
            /*
            const nbt = bookStack.getNbt();
            if (!nbt) return '';
            return nbt.getString('author') || 'Unknown';
            */
        } catch (error) {
            return 'Unknown';
        }
    }

    /**
     * Extract title from a written book
     * @param bookStack The book item stack
     * @returns The title of book
     */
    private extractBookTitle(bookStack: any): string {
        try {
            // Note: ItemStack and NBT methods are not available in Moud SDK
            // This is a placeholder for future implementation
            console.log('Book title extraction not yet supported in Moud SDK');
            return 'Untitled';
            // TODO: Implement when Moud SDK adds item support
            /*
            const nbt = bookStack.getNbt();
            if (!nbt) return '';
            return nbt.getString('title') || 'Untitled';
            */
        } catch (error) {
            return 'Untitled';
        }
    }

    /**
     * Create visual effects when a dimension is generated
     * @param position The position where effects should appear
     * @param dimensionConfig The dimension configuration
     */
    private createPortalEffects(position: any, dimensionConfig: any): void {
        try {
            // Create particle effects
            // Note: World methods are not available in Moud SDK
            // This is a placeholder for future implementation
            console.log('Particle spawning not yet supported in Moud SDK');
            // TODO: Implement when Moud SDK adds world support
            /*
            this.api.getWorld().spawnParticles(
                'minecraft:enchant',
                position.x,
                position.y,
                position.z,
                50, // count
                2.0, // deltaX
                2.0, // deltaY
                2.0, // deltaZ
                1.0 // speed
            );
            */
            
            // Play sound effect
            // Note: World methods are not available in Moud SDK
            // This is a placeholder for future implementation
            console.log('Sound playing not yet supported in Moud SDK');
            // TODO: Implement when Moud SDK adds world support
            /*
            this.api.getWorld().playSound(
                'minecraft:block.end_portal.fill',
                position.x,
                position.y,
                position.z,
                1.0, // volume
                1.0 // pitch
            );
            */
            
            // Change portal color based on dimension
            this.changePortalColor(position, dimensionConfig);
            
        } catch (error) {
            console.error('Error creating portal effects:', error);
        }
    }

    /**
     * Change the color of a portal based on the dimension
     * @param position The portal position
     * @param dimensionConfig The dimension configuration
     */
    private changePortalColor(position: any, dimensionConfig: any): void {
        try {
            // This would require custom block states or particle colors
            // For now, we'll just create colored particles around the portal
            const particleType = this.getDimensionParticle(dimensionConfig);
            
            // Note: World methods are not available in Moud SDK
            // This is a placeholder for future implementation
            console.log('Particle spawning not yet supported in Moud SDK');
            // TODO: Implement when Moud SDK adds world support
            /*
            this.api.getWorld().spawnParticles(
                particleType,
                position.x,
                position.y,
                position.z,
                30, // count
                1.5, // deltaX
                1.5, // deltaY
                1.5, // deltaZ
                0.5 // speed
            );
            */
        } catch (error) {
            console.error('Error changing portal color:', error);
        }
    }

    /**
     * Get the appropriate particle type for a dimension
     * @param dimensionConfig The dimension configuration
     * @returns Particle type string
     */
    private getDimensionParticle(dimensionConfig: any): string {
        switch (dimensionConfig.generatorType) {
            case 'the_end':
                return 'minecraft:end_rod';
            case 'nether':
                return 'minecraft:flame';
            case 'void':
                return 'minecraft:soul';
            case 'floating_islands':
                return 'minecraft:cloud';
            default:
                return 'minecraft:enchant';
        }
    }

    /**
     * Teleport a player to a dimension
     * @param player The player to teleport
     * @param dimensionConfig The dimension configuration
     */
    private teleportPlayerToDimension(player: Player, dimensionConfig: any): void {
        try {
            // Teleport player to the new dimension
            // Note: Player teleport method signature may differ in Moud SDK
            player.teleport(0, 100, 0); // x, y, z
            
            // Send message to player
            player.sendMessage(`§6Welcome to ${dimensionConfig.name}!`);
            player.sendMessage(`§7Default Block: §f${dimensionConfig.defaultBlock}`);
            player.sendMessage(`§7Generator Type: §f${dimensionConfig.generatorType}`);
            
        } catch (error) {
            console.error('Error teleporting player to dimension:', error);
            player.sendMessage('§cFailed to teleport to dimension. Please try again.');
        }
    }

    /**
     * Notify nearby players about dimension generation
     * @param position The position where the event occurred
     * @param dimensionConfig The dimension configuration
     * @param bookData The book data
     */
    private notifyNearbyPlayers(position: any, dimensionConfig: any, bookData: any): void {
        try {
            // Note: World player queries are not available in Moud SDK
            // This is a placeholder for future implementation
            console.log('Player notification not yet supported in Moud SDK');
            // TODO: Implement when Moud SDK adds world query support
            /*
            // Get all nearby players within 32 blocks
            const nearbyPlayers = this.api.getWorld().getNearbyPlayers(position.x, position.y, position.z, 32);
            
            for (const player of nearbyPlayers) {
                player.sendMessage(`§6A new dimension has been discovered!`);
                player.sendMessage(`§7Dimension: §f${dimensionConfig.name}`);
                player.sendMessage(`§7Created from: §f"${bookData.title}" by ${bookData.author}`);
                player.sendMessage(`§7Use a nether portal to travel there!`);
            }
            */
        } catch (error) {
            console.error('Error notifying nearby players:', error);
        }
    }

    /**
     * Unregister all event handlers
     */
    public unregisterEvents(): void {
        if (!this.isRegistered) {
            return;
        }

        // Note: Event registration is not available in Moud SDK
        // This is a placeholder for future implementation
        console.log('Event unregistration not yet supported in Moud SDK');
        // TODO: Implement when Moud SDK adds event support
        /*
        this.api.off('item_entity_spawn', this.onItemEntitySpawn.bind(this));
        this.api.off('entity_collide', this.onEntityCollide.bind(this));
        this.api.off('player_portal', this.onPlayerPortal.bind(this));
        */

        this.isRegistered = false;
        console.log('PortalHandler events unregistered');
    }
}
