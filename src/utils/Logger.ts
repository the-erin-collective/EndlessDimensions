export class Logger {
    private prefix: string;

    constructor(prefix: string = 'EndlessDimensions') {
        this.prefix = prefix;
    }

    public info(message: string): void {
        this.log('INFO', message);
    }

    public warn(message: string): void {
        this.log('WARN', message);
    }

    public error(message: string, error?: any): void {
        this.log('ERROR', message);
        if (error) {
            this.log('ERROR', String(error));
        }
    }

    public debug(message: string): void {
        this.log('DEBUG', message);
    }

    private log(level: string, message: string): void {
        const formattedMessage = `[${this.prefix}] [${level}] ${message}`;
        
        // Try different logging methods based on environment
        try {
            // Method 1: Try Moud's logger (if available)
            if (typeof (globalThis as any).moud?.logger?.[level.toLowerCase()] === 'function') {
                (globalThis as any).moud.logger[level.toLowerCase()](formattedMessage);
                return;
            }
        } catch (e) {
            // Continue to next method
        }

        try {
            // Method 2: Try Minecraft's logger (if available)
            if (typeof (globalThis as any).minecraft?.logger?.info === 'function') {
                if (level === 'ERROR') {
                    (globalThis as any).minecraft.logger.error(formattedMessage);
                } else if (level === 'WARN') {
                    (globalThis as any).minecraft.logger.warn(formattedMessage);
                } else {
                    (globalThis as any).minecraft.logger.info(formattedMessage);
                }
                return;
            }
        } catch (e) {
            // Continue to next method
        }

        try {
            // Method 3: Try Java System.out (for Minecraft Java environment)
            if (typeof (globalThis as any).java?.lang?.System?.out?.println === 'function') {
                (globalThis as any).java.lang.System.out.println(formattedMessage);
                return;
            }
        } catch (e) {
            // Continue to fallback
        }

        // Fallback: console.log (for development/testing)
        console.log(formattedMessage);
    }
}
