import { Logger } from '../utils/Logger';
import { getCentralizedStateManager } from '../core/CentralizedStateManager';

// Type definitions for user feedback
interface Vec3 {
  x: number;
  y: number;
  z: number;
}

interface FeedbackMessage {
  type: 'chat' | 'actionbar' | 'title' | 'subtitle' | 'toast';
  content: string;
  color?: string;
  style?: string;
  duration?: number;
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

interface DimensionConfig {
  id: string;
  name: string;
  title?: string;
  bookData?: {
    title: string;
    author: string;
    pages: string[];
  };
  generator?: {
    type: string;
  };
  biome?: {
    name: string;
    temperature: number;
    precipitation: string;
  };
}

interface FeedbackTemplate {
  id: string;
  name: string;
  messages: {
    creation: FeedbackMessage[];
    travel: FeedbackMessage[];
    error: FeedbackMessage[];
    info: FeedbackMessage[];
    warning: FeedbackMessage[];
    success: FeedbackMessage[];
  };
  conditions?: {
    dimensionType?: string;
    generatorType?: string;
    biomeType?: string;
  };
}

interface PlayerFeedbackState {
  playerId: string;
  lastMessageTime: number;
  messageQueue: FeedbackMessage[];
  isMuted: boolean;
  preferences: {
    chatMessages: boolean;
    actionbarMessages: boolean;
    titleMessages: boolean;
    particleEffects: boolean;
    soundEffects: boolean;
  };
}

interface FeedbackStatistics {
  totalMessages: number;
  chatMessages: number;
  actionbarMessages: number;
  titleMessages: number;
  toastMessages: number;
  playersMuted: number;
  averageMessageLength: number;
  lastMessageTime: number;
}

/**
 * User Feedback System - Provide chat messages and visual feedback for dimension creation and travel
 * Comprehensive player notification system with multiple feedback channels
 */
export class UserFeedbackSystem {
  private logger: Logger;
  private stateManager: any;
  private feedbackTemplates: Map<string, FeedbackTemplate> = new Map();
  private playerStates: Map<string, PlayerFeedbackState> = new Map();
  private messageQueue: Map<string, FeedbackMessage[]> = new Map();
  private isInitialized: boolean = false;
  private messageCooldown: number = 1000; // 1 second cooldown between messages
  private maxQueueSize: number = 10; // Max messages per player queue
  private statistics: FeedbackStatistics;

  constructor() {
    this.logger = new Logger('UserFeedbackSystem');
    this.stateManager = getCentralizedStateManager();
    this.statistics = {
      totalMessages: 0,
      chatMessages: 0,
      actionbarMessages: 0,
      titleMessages: 0,
      toastMessages: 0,
      playersMuted: 0,
      averageMessageLength: 0,
      lastMessageTime: 0
    };
  }

  /**
   * Initialize user feedback system
   */
  public async initialize(): Promise<void> {
    try {
      // Initialize feedback templates
      this.initializeFeedbackTemplates();

      // Subscribe to state changes
      this.subscribeToStateChanges();

      // Start message queue processing
      this.startMessageProcessing();

      this.isInitialized = true;
      this.logger.info('UserFeedbackSystem initialized successfully');

    } catch (error) {
      this.logger.error('Failed to initialize UserFeedbackSystem:', error);
      throw error;
    }
  }

  /**
   * Initialize feedback templates
   */
  private initializeFeedbackTemplates(): void {
    try {
      // Dimension creation template
      this.feedbackTemplates.set('creation', {
        id: 'creation',
        name: 'Dimension Creation',
        messages: {
          creation: [
            {
              type: 'title',
              content: '§6Dimension Created!§r',
              color: 'gold',
              duration: 3000,
              priority: 'high'
            },
            {
              type: 'subtitle',
              content: '§e{dimensionName}§r',
              color: 'yellow',
              duration: 3000,
              priority: 'high'
            },
            {
              type: 'chat',
              content: '§6=== §eDimension Created §6===§r\n§7Dimension: §e{dimensionName}§7\n§7Author: §b{author}§7\n§7Use a nether portal to travel there.§r',
              color: 'green',
              priority: 'medium'
            },
            {
              type: 'actionbar',
              content: '§e{dimensionName} §7created!§r',
              duration: 5000,
              priority: 'medium'
            }
          ],
          travel: [],
          error: [
            {
              type: 'chat',
              content: '§cFailed to create dimension: §4{error}§r',
              color: 'red',
              priority: 'high'
            }
          ],
          info: [
            {
              type: 'chat',
              content: '§7Creating dimension: §e{dimensionName}§7...§r',
              color: 'gray',
              priority: 'low'
            }
          ],
          warning: [],
          success: []
        }
      });

      // Dimension travel template
      this.feedbackTemplates.set('travel', {
        id: 'travel',
        name: 'Dimension Travel',
        messages: {
          creation: [],
          travel: [
            {
              type: 'title',
              content: '§6Dimension Travel§r',
              color: 'aqua',
              duration: 2000,
              priority: 'high'
            },
            {
              type: 'subtitle',
              content: '§e{dimensionName}§r',
              color: 'yellow',
              duration: 2000,
              priority: 'high'
            },
            {
              type: 'actionbar',
              content: '§6Traveling to §e{dimensionName}§6...§r',
              duration: 3000,
              priority: 'medium'
            },
            {
              type: 'chat',
              content: '§6=== §eDimension Travel §6===§r\n§7Destination: §e{dimensionName}§7\n§7Prepare for transfer...§r',
              color: 'aqua',
              priority: 'medium'
            }
          ],
          error: [
            {
              type: 'chat',
              content: '§cFailed to travel to dimension: §4{error}§r',
              color: 'red',
              priority: 'high'
            },
            {
              type: 'actionbar',
              content: '§cTravel failed: §4{error}§r',
              duration: 4000,
              priority: 'high'
            }
          ],
          info: [
            {
              type: 'chat',
              content: '§7Entering portal to §e{dimensionName}§7...§r',
              color: 'gray',
              priority: 'low'
            }
          ],
          warning: [
            {
              type: 'chat',
              content: '§eWarning: §6Dimension §e{dimensionName} §6may be unstable!§r',
              color: 'yellow',
              priority: 'medium'
            }
          ],
          success: [
            {
              type: 'chat',
              content: '§aSuccessfully arrived at §e{dimensionName}§a!§r',
              color: 'green',
              priority: 'medium'
            }
          ]
        }
      });

      // Portal interaction template
      this.feedbackTemplates.set('portal', {
        id: 'portal',
        name: 'Portal Interaction',
        messages: {
          creation: [],
          travel: [],
          error: [
            {
              type: 'chat',
              content: '§cPortal interaction failed: §4{error}§r',
              color: 'red',
              priority: 'high'
            }
          ],
          info: [
            {
              type: 'actionbar',
              content: '§7Portal detected...§r',
              duration: 2000,
              priority: 'low'
            }
          ],
          warning: [
            {
              type: 'chat',
              content: '§eUnstable portal detected! §cProceed with caution.§r',
              color: 'yellow',
              priority: 'medium'
            }
          ],
          success: [
            {
              type: 'chat',
              content: '§aPortal successfully activated!§r',
              color: 'green',
              priority: 'medium'
            }
          ]
        }
      });

      // Book interaction template
      this.feedbackTemplates.set('book', {
        id: 'book',
        name: 'Book Interaction',
        messages: {
          creation: [],
          travel: [],
          error: [
            {
              type: 'chat',
              content: '§cBook error: §4{error}§r',
              color: 'red',
              priority: 'high'
            }
          ],
          info: [
            {
              type: 'actionbar',
              content: '§7Analyzing book...§r',
              duration: 1500,
              priority: 'low'
            }
          ],
          warning: [
            {
              type: 'chat',
              content: '§eWarning: §6Book contains no dimension data!§r',
              color: 'yellow',
              priority: 'medium'
            }
          ],
          success: [
            {
              type: 'chat',
              content: '§aBook contains dimension data: §e{dimensionName}§a!§r',
              color: 'green',
              priority: 'medium'
            }
          ]
        }
      });

      this.logger.info(`Initialized ${this.feedbackTemplates.size} feedback templates`);
    } catch (error) {
      this.logger.error('Failed to initialize feedback templates:', error);
    }
  }

  /**
   * Subscribe to state changes
   */
  private subscribeToStateChanges(): void {
    try {
      // Subscribe to player state changes
      this.stateManager.subscribe('players', (change) => {
        this.handlePlayerStateChange(change);
      }, {
        id: 'user_feedback_system',
        priority: 10
      });

      this.logger.debug('Subscribed to state changes');
    } catch (error) {
      this.logger.error('Failed to subscribe to state changes:', error);
    }
  }

  /**
   * Handle player state changes
   */
  private handlePlayerStateChange(change: any): void {
    try {
      const { key, delta } = change;
      const playerData = delta.newValue;

      if (!playerData) return;

      // Initialize player state if needed
      if (!this.playerStates.has(key)) {
        this.initializePlayerState(key);
      }

      // Update player preferences if changed
      if (playerData.preferences) {
        this.updatePlayerPreferences(key, playerData.preferences);
      }

    } catch (error) {
      this.logger.error('Failed to handle player state change:', error);
    }
  }

  /**
   * Initialize player state
   */
  private initializePlayerState(playerId: string): void {
    try {
      const playerState: PlayerFeedbackState = {
        playerId,
        lastMessageTime: 0,
        messageQueue: [],
        isMuted: false,
        preferences: {
          chatMessages: true,
          actionbarMessages: true,
          titleMessages: true,
          particleEffects: true,
          soundEffects: true
        }
      };

      this.playerStates.set(playerId, playerState);
    } catch (error) {
      this.logger.error(`Failed to initialize player state for ${playerId}:`, error);
    }
  }

  /**
   * Update player preferences
   */
  private updatePlayerPreferences(playerId: string, preferences: any): void {
    try {
      const playerState = this.playerStates.get(playerId);
      if (!playerState) return;

      Object.assign(playerState.preferences, preferences);
    } catch (error) {
      this.logger.error(`Failed to update player preferences for ${playerId}:`, error);
    }
  }

  /**
   * Start message queue processing
   */
  private startMessageProcessing(): void {
    try {
      setInterval(() => {
        this.processMessageQueues();
      }, 500); // Process every 500ms

      this.logger.debug('Started message queue processing');
    } catch (error) {
      this.logger.error('Failed to start message queue processing:', error);
    }
  }

  /**
   * Process message queues
   */
  private processMessageQueues(): void {
    try {
      const now = Date.now();

      for (const [playerId, playerState] of this.playerStates.entries()) {
        if (playerState.isMuted || playerState.messageQueue.length === 0) {
          continue;
        }

        // Check cooldown
        if (now - playerState.lastMessageTime < this.messageCooldown) {
          continue;
        }

        // Process next message
        const message = playerState.messageQueue.shift();
        if (message) {
          this.deliverMessage(playerId, message);
          playerState.lastMessageTime = now;
        }
      }
    } catch (error) {
      this.logger.error('Failed to process message queues:', error);
    }
  }

  /**
   * Deliver message to player
   */
  private deliverMessage(playerId: string, message: FeedbackMessage): void {
    try {
      const playerState = this.playerStates.get(playerId);
      if (!playerState || playerState.isMuted) return;

      // Check player preferences
      if (!this.isMessageEnabled(message.type, playerState.preferences)) {
        return;
      }

      // Format message content
      const formattedContent = this.formatMessage(message);

      // Deliver based on message type
      switch (message.type) {
        case 'chat':
          this.deliverChatMessage(playerId, formattedContent);
          this.statistics.chatMessages++;
          break;
        case 'actionbar':
          this.deliverActionbarMessage(playerId, formattedContent, message.duration);
          this.statistics.actionbarMessages++;
          break;
        case 'title':
          this.deliverTitleMessage(playerId, formattedContent, message.duration);
          this.statistics.titleMessages++;
          break;
        case 'subtitle':
          this.deliverSubtitleMessage(playerId, formattedContent, message.duration);
          break;
        case 'toast':
          this.deliverToastMessage(playerId, formattedContent);
          this.statistics.toastMessages++;
          break;
      }

      this.statistics.totalMessages++;
      this.statistics.lastMessageTime = Date.now();

    } catch (error) {
      this.logger.error(`Failed to deliver message to ${playerId}:`, error);
    }
  }

  /**
   * Check if message type is enabled
   */
  private isMessageEnabled(messageType: string, preferences: PlayerFeedbackState['preferences']): boolean {
    switch (messageType) {
      case 'chat':
        return preferences.chatMessages;
      case 'actionbar':
        return preferences.actionbarMessages;
      case 'title':
      case 'subtitle':
        return preferences.titleMessages;
      default:
        return true;
    }
  }

  /**
   * Format message content
   */
  private formatMessage(message: FeedbackMessage): string {
    try {
      let content = message.content;

      // Apply color formatting
      if (message.color) {
        content = this.applyColor(content, message.color);
      }

      // Apply style formatting
      if (message.style) {
        content = this.applyStyle(content, message.style);
      }

      return content;
    } catch (error) {
      this.logger.error('Failed to format message:', error);
      return message.content;
    }
  }

  /**
   * Apply color formatting
   */
  private applyColor(content: string, color: string): string {
    const colorCodes: Record<string, string> = {
      'black': '§0',
      'dark_blue': '§1',
      'dark_green': '§2',
      'dark_aqua': '§3',
      'dark_red': '§4',
      'dark_purple': '§5',
      'gold': '§6',
      'gray': '§7',
      'dark_gray': '§8',
      'blue': '§9',
      'green': '§a',
      'aqua': '§b',
      'red': '§c',
      'light_purple': '§d',
      'yellow': '§e',
      'white': '§f'
    };

    return `${colorCodes[color] || '§f'}${content}§r`;
  }

  /**
   * Apply style formatting
   */
  private applyStyle(content: string, style: string): string {
    const styleCodes: Record<string, string> = {
      'bold': '§l',
      'italic': '§o',
      'underline': '§n',
      'strikethrough': '§m',
      'obfuscated': '§k',
      'reset': '§r'
    };

    return `${styleCodes[style] || ''}${content}§r`;
  }

  /**
   * Deliver chat message
   */
  private deliverChatMessage(playerId: string, content: string): void {
    try {
      const command = `/tellraw ${playerId} {"text":"${content.replace(/"/g, '\\"')}","color":"white"}`;
      
      if (api.server && api.server.executeCommand) {
        api.server.executeCommand(command);
      }
    } catch (error) {
      this.logger.error('Failed to deliver chat message:', error);
    }
  }

  /**
   * Deliver actionbar message
   */
  private deliverActionbarMessage(playerId: string, content: string, duration?: number): void {
    try {
      const command = `/title ${playerId} actionbar {"text":"${content.replace(/"/g, '\\"')}","color":"white"}`;
      
      if (api.server && api.server.executeCommand) {
        api.server.executeCommand(command);
      }

      // Clear after duration
      if (duration && duration > 0) {
        setTimeout(() => {
          const clearCommand = `/title ${playerId} actionbar {"text":""}`;
          if (api.server && api.server.executeCommand) {
            api.server.executeCommand(clearCommand);
          }
        }, duration);
      }
    } catch (error) {
      this.logger.error('Failed to deliver actionbar message:', error);
    }
  }

  /**
   * Deliver title message
   */
  private deliverTitleMessage(playerId: string, content: string, duration?: number): void {
    try {
      const command = `/title ${playerId} title {"text":"${content.replace(/"/g, '\\"')}","color":"white"}`;
      
      if (api.server && api.server.executeCommand) {
        api.server.executeCommand(command);
      }

      // Clear after duration
      if (duration && duration > 0) {
        setTimeout(() => {
          const clearCommand = `/title ${playerId} title {"text":""}`;
          if (api.server && api.server.executeCommand) {
            api.server.executeCommand(clearCommand);
          }
        }, duration);
      }
    } catch (error) {
      this.logger.error('Failed to deliver title message:', error);
    }
  }

  /**
   * Deliver subtitle message
   */
  private deliverSubtitleMessage(playerId: string, content: string, duration?: number): void {
    try {
      const command = `/title ${playerId} subtitle {"text":"${content.replace(/"/g, '\\"')}","color":"white"}`;
      
      if (api.server && api.server.executeCommand) {
        api.server.executeCommand(command);
      }

      // Clear after duration
      if (duration && duration > 0) {
        setTimeout(() => {
          const clearCommand = `/title ${playerId} subtitle {"text":""}`;
          if (api.server && api.server.executeCommand) {
            api.server.executeCommand(clearCommand);
          }
        }, duration);
      }
    } catch (error) {
      this.logger.error('Failed to deliver subtitle message:', error);
    }
  }

  /**
   * Deliver toast message
   */
  private deliverToastMessage(playerId: string, content: string): void {
    try {
      // Toast messages use actionbar as fallback
      this.deliverActionbarMessage(playerId, content, 3000);
    } catch (error) {
      this.logger.error('Failed to deliver toast message:', error);
    }
  }

  /**
   * Queue message for player
   */
  private queueMessage(playerId: string, message: FeedbackMessage): void {
    try {
      const playerState = this.playerStates.get(playerId);
      if (!playerState || playerState.isMuted) return;

      // Check message queue size
      if (playerState.messageQueue.length >= this.maxQueueSize) {
        playerState.messageQueue.shift(); // Remove oldest message
      }

      // Add message to queue
      playerState.messageQueue.push(message);

      // Sort by priority
      playerState.messageQueue.sort((a, b) => {
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return (priorityOrder[b.priority as keyof typeof priorityOrder] || 1) - 
               (priorityOrder[a.priority as keyof typeof priorityOrder] || 1);
      });

    } catch (error) {
      this.logger.error(`Failed to queue message for ${playerId}:`, error);
    }
  }

  /**
   * Notify dimension creation
   */
  public notifyDimensionCreation(playerId: string, dimensionConfig: DimensionConfig): void {
    try {
      const template = this.feedbackTemplates.get('creation');
      if (!template) return;

      // Get dimension name
      const dimensionName = dimensionConfig.title || dimensionConfig.name || 'Unknown Dimension';
      const author = dimensionConfig.bookData?.author || 'Unknown';

      // Queue creation messages
      for (const message of template.messages.creation) {
        const formattedMessage = {
          ...message,
          content: message.content
            .replace('{dimensionName}', dimensionName)
            .replace('{author}', author)
        };
        this.queueMessage(playerId, formattedMessage);
      }

      this.logger.info(`Notified dimension creation to ${playerId}: ${dimensionName}`);
    } catch (error) {
      this.logger.error('Failed to notify dimension creation:', error);
    }
  }

  /**
   * Notify dimension travel
   */
  public notifyDimensionTravel(playerId: string, dimensionName: string): void {
    try {
      const template = this.feedbackTemplates.get('travel');
      if (!template) return;

      // Queue travel messages
      for (const message of template.messages.travel) {
        const formattedMessage = {
          ...message,
          content: message.content.replace('{dimensionName}', dimensionName)
        };
        this.queueMessage(playerId, formattedMessage);
      }

      this.logger.info(`Notified dimension travel to ${playerId}: ${dimensionName}`);
    } catch (error) {
      this.logger.error('Failed to notify dimension travel:', error);
    }
  }

  /**
   * Notify portal interaction
   */
  public notifyPortalInteraction(playerId: string, action: 'enter' | 'exit' | 'error', details?: string): void {
    try {
      const template = this.feedbackTemplates.get('portal');
      if (!template) return;

      const messageKey = action === 'error' ? 'error' : 'success';
      const messages = template.messages[messageKey];

      if (messages && messages.length > 0) {
        for (const message of messages) {
          const formattedMessage = {
            ...message,
            content: details ? message.content.replace('{error}', details) : message.content
          };
          this.queueMessage(playerId, formattedMessage);
        }
      }

      this.logger.info(`Notified portal interaction to ${playerId}: ${action}`);
    } catch (error) {
      this.logger.error('Failed to notify portal interaction:', error);
    }
  }

  /**
   * Notify book interaction
   */
  public notifyBookInteraction(playerId: string, action: 'analyze' | 'success' | 'warning' | 'error', details?: string): void {
    try {
      const template = this.feedbackTemplates.get('book');
      if (!template) return;

      const messages = template.messages[action];
      if (!messages || messages.length === 0) return;

      for (const message of messages) {
        const formattedMessage = {
          ...message,
          content: details ? message.content.replace('{error}', details) : message.content
        };
        this.queueMessage(playerId, formattedMessage);
      }

      this.logger.info(`Notified book interaction to ${playerId}: ${action}`);
    } catch (error) {
      this.logger.error('Failed to notify book interaction:', error);
    }
  }

  /**
   * Send custom message
   */
  public sendMessage(playerId: string, message: FeedbackMessage): void {
    try {
      this.queueMessage(playerId, message);
    } catch (error) {
      this.logger.error(`Failed to send message to ${playerId}:`, error);
    }
  }

  /**
   * Set player mute status
   */
  public setPlayerMuted(playerId: string, muted: boolean): void {
    try {
      const playerState = this.playerStates.get(playerId);
      if (playerState) {
        playerState.isMuted = muted;
        if (muted) {
          this.statistics.playersMuted++;
        }
      }
    } catch (error) {
      this.logger.error(`Failed to set mute status for ${playerId}:`, error);
    }
  }

  /**
   * Update player preferences
   */
  public updatePlayerFeedbackPreferences(playerId: string, preferences: Partial<PlayerFeedbackState['preferences']>): void {
    try {
      const playerState = this.playerStates.get(playerId);
      if (playerState) {
        Object.assign(playerState.preferences, preferences);
      }
    } catch (error) {
      this.logger.error(`Failed to update preferences for ${playerId}:`, error);
    }
  }

  /**
   * Get player state
   */
  public getPlayerState(playerId: string): PlayerFeedbackState | null {
    return this.playerStates.get(playerId) || null;
  }

  /**
   * Get statistics
   */
  public getStatistics(): FeedbackStatistics {
    return { ...this.statistics };
  }

  /**
   * Clear message queue for player
   */
  public clearMessageQueue(playerId: string): void {
    try {
      const playerState = this.playerStates.get(playerId);
      if (playerState) {
        playerState.messageQueue = [];
      }
    } catch (error) {
      this.logger.error(`Failed to clear message queue for ${playerId}:`, error);
    }
  }

  /**
   * Shutdown user feedback system
   */
  public shutdown(): void {
    try {
      // Clear all data
      this.feedbackTemplates.clear();
      this.playerStates.clear();
      this.messageQueue.clear();

      this.isInitialized = false;
      this.logger.info('UserFeedbackSystem shutdown complete');
    } catch (error) {
      this.logger.error('Error during UserFeedbackSystem shutdown:', error);
    }
  }
}

// Singleton instance for global access
let globalUserFeedbackSystem: UserFeedbackSystem | null = null;

/**
 * Get global user feedback system instance
 */
export function getUserFeedbackSystem(): UserFeedbackSystem {
  if (!globalUserFeedbackSystem) {
    globalUserFeedbackSystem = new UserFeedbackSystem();
  }
  return globalUserFeedbackSystem;
}

/**
 * Convenience function to notify dimension creation
 */
export function notifyDimensionCreation(playerId: string, dimensionConfig: DimensionConfig): void {
  const system = getUserFeedbackSystem();
  system.notifyDimensionCreation(playerId, dimensionConfig);
}

/**
 * Convenience function to notify dimension travel
 */
export function notifyDimensionTravel(playerId: string, dimensionName: string): void {
  const system = getUserFeedbackSystem();
  system.notifyDimensionTravel(playerId, dimensionName);
}
