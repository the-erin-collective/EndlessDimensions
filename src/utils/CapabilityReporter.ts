import { Logger } from './Logger';

/**
 * Reports the available capabilities of the Moud API environment.
 * This checks for the existence of optional API features and logs them.
 */
export function reportCapabilities(): void {
    const logger = new Logger('CapabilityReporter');
    logger.info('--- Moud API Capability Report ---');

    const capabilities: Record<string, boolean> = {
        'api.server': !!api.server,
        'api.server.executeCommand': !!(api.server && api.server.executeCommand),
        'api.world': !!api.world,
        'api.world.getBlock': !!(api.world && api.world.getBlock),
        'api.events': !!api.events,
        'api.events.on': !!(api.events && api.events.on),
        'api.packets': !!api.packets,
        'api.packets.onIncoming': !!(api.packets && api.packets.onIncoming),
        'api.packets.onOutgoing': !!(api.packets && api.packets.onOutgoing),
        'api.internal.fs': !!(api.internal && api.internal.fs),
        'api.internal.fs.readFile': !!(api.internal && api.internal.fs && api.internal.fs.readFile),
        'api.state': !!api.state,
        'api.state.subscribe': !!(api.state && api.state.subscribe)
    };

    let availableCount = 0;
    for (const [key, available] of Object.entries(capabilities)) {
        if (available) {
            logger.info(`[✓] ${key}`);
            availableCount++;
        } else {
            logger.warn(`[✗] ${key} - Feature unavailable, fallback logic will be used`);
        }
    }

    logger.info(`Capability Check Complete: ${availableCount}/${Object.keys(capabilities).length} features available.`);
    logger.info('----------------------------------');
}
