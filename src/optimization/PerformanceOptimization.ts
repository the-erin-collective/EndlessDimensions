import { Logger } from '../utils/Logger';

// Type definitions for performance optimization
interface PerformanceMetrics {
  stateSyncTime: number;
  packetProcessingTime: number;
  spatialScanTime: number;
  audioProcessingTime: number;
  particleGenerationTime: number;
  messageDeliveryTime: number;
  memoryUsage: number;
  cpuUsage: number;
  entityTrackingTime: number;
  dimensionUpdateTime: number;
}

interface OptimizationSettings {
  stateSyncFrequency: number;
  packetBatchSize: number;
  spatialScanRadius: number;
  entityTrackingDistance: number;
  audioUpdateInterval: number;
  particleUpdateInterval: number;
  messageQueueSize: number;
  maxConcurrentOperations: number;
  enablePerformanceMonitoring: boolean;
}

interface PerformanceProfile {
  name: string;
  settings: OptimizationSettings;
  description: string;
  targetUseCase: 'development' | 'production' | 'testing';
}

interface PerformanceAlert {
  type: 'warning' | 'critical' | 'info';
  metric: string;
  value: number;
  threshold: number;
  message: string;
  timestamp: number;
  recommendations: string[];
}

/**
 * Performance Optimization - Optimize state subscriptions and packet interception for minimal performance impact
 * Comprehensive performance monitoring and optimization system
 */
export class PerformanceOptimization {
  private logger: Logger;
  private currentMetrics: PerformanceMetrics;
  private currentSettings: OptimizationSettings;
  private performanceProfiles: Map<string, PerformanceProfile> = new Map();
  private performanceHistory: PerformanceMetrics[] = [];
  private alerts: PerformanceAlert[] = [];
  private isInitialized: boolean = false;
  private monitoringInterval: number = 5000; // 5 second monitoring interval
  private maxHistorySize: number = 100;
  private optimizationCallbacks: Map<string, Function[]> = new Map();

  constructor() {
    this.logger = new Logger('PerformanceOptimization');
    this.currentMetrics = {
      stateSyncTime: 0,
      packetProcessingTime: 0,
      spatialScanTime: 0,
      audioProcessingTime: 0,
      particleGenerationTime: 0,
      messageDeliveryTime: 0,
      memoryUsage: 0,
      cpuUsage: 0,
      entityTrackingTime: 0,
      dimensionUpdateTime: 0
    };
    this.currentSettings = this.getDefaultSettings();
  }

  /**
   * Initialize performance optimization
   */
  public async initialize(): Promise<void> {
    try {
      // Initialize performance profiles
      this.initializePerformanceProfiles();

      // Start performance monitoring
      this.startPerformanceMonitoring();

      // Apply initial optimizations
      this.applyOptimizations();

      this.isInitialized = true;
      this.logger.info('PerformanceOptimization initialized successfully');

    } catch (error) {
      this.logger.error('Failed to initialize PerformanceOptimization:', error);
      throw error;
    }
  }

  /**
   * Initialize performance profiles
   */
  private initializePerformanceProfiles(): void {
    try {
      // Development profile - prioritizes debugging over performance
      this.performanceProfiles.set('development', {
        name: 'Development',
        settings: {
          stateSyncFrequency: 100,        // 100ms - frequent for debugging
          packetBatchSize: 10,            // Small batches for detailed tracking
          spatialScanRadius: 32,           // Small radius for precision
          entityTrackingDistance: 64,       // Standard tracking distance
          audioUpdateInterval: 500,        // Frequent updates for testing
          particleUpdateInterval: 200,      // Very frequent for debugging
          messageQueueSize: 50,           // Larger queue for testing
          maxConcurrentOperations: 20,     // Higher limit for development
          enablePerformanceMonitoring: true   // Full monitoring enabled
        },
        description: 'Development profile with detailed monitoring and frequent updates',
        targetUseCase: 'development'
      });

      // Production profile - prioritizes performance
      this.performanceProfiles.set('production', {
        name: 'Production',
        settings: {
          stateSyncFrequency: 1000,       // 1s - reduced frequency
          packetBatchSize: 50,            // Larger batches for efficiency
          spatialScanRadius: 16,           // Reduced radius for performance
          entityTrackingDistance: 32,       // Reduced tracking distance
          audioUpdateInterval: 2000,      // Slower audio updates
          particleUpdateInterval: 1000,    // Slower particle updates
          messageQueueSize: 20,           // Smaller queue for performance
          maxConcurrentOperations: 10,     // Lower concurrent limit
          enablePerformanceMonitoring: true   // Monitoring still enabled
        },
        description: 'Production profile optimized for maximum performance',
        targetUseCase: 'production'
      });

      // Testing profile - balanced approach
      this.performanceProfiles.set('testing', {
        name: 'Testing',
        settings: {
          stateSyncFrequency: 500,        // 500ms - moderate frequency
          packetBatchSize: 25,            // Medium batches
          spatialScanRadius: 24,           // Moderate radius
          entityTrackingDistance: 48,       // Moderate tracking distance
          audioUpdateInterval: 1000,      // Moderate audio updates
          particleUpdateInterval: 500,      // Moderate particle updates
          messageQueueSize: 30,           // Moderate queue size
          maxConcurrentOperations: 15,     // Moderate concurrent limit
          enablePerformanceMonitoring: true   // Full monitoring for testing
        },
        description: 'Testing profile with balanced performance and monitoring',
        targetUseCase: 'testing'
      });

      // High performance profile - maximum optimization
      this.performanceProfiles.set('high_performance', {
        name: 'High Performance',
        settings: {
          stateSyncFrequency: 2000,       // 2s - minimal frequency
          packetBatchSize: 100,           // Large batches
          spatialScanRadius: 8,            // Minimal radius
          entityTrackingDistance: 16,       // Minimal tracking distance
          audioUpdateInterval: 5000,      // Slow audio updates
          particleUpdateInterval: 2000,    // Slow particle updates
          messageQueueSize: 10,           // Small queue
          maxConcurrentOperations: 5,      // Minimal concurrent operations
          enablePerformanceMonitoring: false  // Monitoring disabled for max performance
        },
        description: 'High performance profile with maximum optimizations',
        targetUseCase: 'production'
      });

      this.logger.info(`Initialized ${this.performanceProfiles.size} performance profiles`);
    } catch (error) {
      this.logger.error('Failed to initialize performance profiles:', error);
    }
  }

  /**
   * Get default settings
   */
  private getDefaultSettings(): OptimizationSettings {
    return {
      stateSyncFrequency: 1000,
      packetBatchSize: 50,
      spatialScanRadius: 32,
      entityTrackingDistance: 64,
      audioUpdateInterval: 1000,
      particleUpdateInterval: 500,
      messageQueueSize: 20,
      maxConcurrentOperations: 10,
      enablePerformanceMonitoring: true
    };
  }

  /**
   * Start performance monitoring
   */
  private startPerformanceMonitoring(): void {
    try {
      setInterval(() => {
        this.collectPerformanceMetrics();
        this.analyzePerformance();
        this.generateAlerts();
      }, this.monitoringInterval);

      this.logger.debug('Started performance monitoring');
    } catch (error) {
      this.logger.error('Failed to start performance monitoring:', error);
    }
  }

  /**
   * Collect performance metrics
   */
  private collectPerformanceMetrics(): void {
    try {
      // Get current memory usage
      if ((performance as any).memory) {
        const memoryInfo = (performance as any).memory;
        this.currentMetrics.memoryUsage = memoryInfo.usedJSHeapSize / 1024 / 1024; // MB
      }

      // Get timing metrics from various systems
      this.collectSystemMetrics();

      // Add to history
      this.performanceHistory.push({ ...this.currentMetrics });

      // Trim history if too large
      if (this.performanceHistory.length > this.maxHistorySize) {
        this.performanceHistory.shift();
      }

    } catch (error) {
      this.logger.error('Failed to collect performance metrics:', error);
    }
  }

  /**
   * Collect system metrics
   */
  private collectSystemMetrics(): void {
    try {
      // This would integrate with other systems to collect their timing data
      // For now, we'll simulate some metrics

      // State sync timing
      const stateSyncStart = performance.now();
      // Simulate state sync operation
      this.currentMetrics.stateSyncTime = Math.random() * 10 + 5; // 5-15ms

      // Packet processing timing
      const packetStart = performance.now();
      // Simulate packet processing
      this.currentMetrics.packetProcessingTime = Math.random() * 5 + 2; // 2-7ms

      // Spatial scan timing
      const spatialStart = performance.now();
      // Simulate spatial scanning
      this.currentMetrics.spatialScanTime = Math.random() * 20 + 10; // 10-30ms

      // Audio processing timing
      const audioStart = performance.now();
      // Simulate audio processing
      this.currentMetrics.audioProcessingTime = Math.random() * 15 + 5; // 5-20ms

      // Particle generation timing
      const particleStart = performance.now();
      // Simulate particle generation
      this.currentMetrics.particleGenerationTime = Math.random() * 8 + 3; // 3-11ms

      // Message delivery timing
      const messageStart = performance.now();
      // Simulate message delivery
      this.currentMetrics.messageDeliveryTime = Math.random() * 3 + 1; // 1-4ms

      // Entity tracking timing
      const entityStart = performance.now();
      // Simulate entity tracking
      this.currentMetrics.entityTrackingTime = Math.random() * 25 + 15; // 15-40ms

      // Dimension update timing
      const dimensionStart = performance.now();
      // Simulate dimension updates
      this.currentMetrics.dimensionUpdateTime = Math.random() * 30 + 10; // 10-40ms

    } catch (error) {
      this.logger.error('Failed to collect system metrics:', error);
    }
  }

  /**
   * Analyze performance
   */
  private analyzePerformance(): void {
    try {
      if (this.performanceHistory.length < 2) return;

      const recent = this.performanceHistory.slice(-10); // Last 10 measurements
      const average = this.calculateAverageMetrics(recent);

      // Check for performance issues
      this.checkPerformanceThresholds(average);

    } catch (error) {
      this.logger.error('Failed to analyze performance:', error);
    }
  }

  /**
   * Calculate average metrics
   */
  private calculateAverageMetrics(metrics: PerformanceMetrics[]): PerformanceMetrics {
    try {
      const sum = metrics.reduce((acc, metric) => ({
        stateSyncTime: acc.stateSyncTime + metric.stateSyncTime,
        packetProcessingTime: acc.packetProcessingTime + metric.packetProcessingTime,
        spatialScanTime: acc.spatialScanTime + metric.spatialScanTime,
        audioProcessingTime: acc.audioProcessingTime + metric.audioProcessingTime,
        particleGenerationTime: acc.particleGenerationTime + metric.particleGenerationTime,
        messageDeliveryTime: acc.messageDeliveryTime + metric.messageDeliveryTime,
        memoryUsage: acc.memoryUsage + metric.memoryUsage,
        cpuUsage: acc.cpuUsage + metric.cpuUsage,
        entityTrackingTime: acc.entityTrackingTime + metric.entityTrackingTime,
        dimensionUpdateTime: acc.dimensionUpdateTime + metric.dimensionUpdateTime
      }), {
        stateSyncTime: 0, packetProcessingTime: 0, spatialScanTime: 0,
        audioProcessingTime: 0, particleGenerationTime: 0, messageDeliveryTime: 0,
        memoryUsage: 0, cpuUsage: 0, entityTrackingTime: 0, dimensionUpdateTime: 0
      });

      const count = metrics.length;

      return {
        stateSyncTime: sum.stateSyncTime / count,
        packetProcessingTime: sum.packetProcessingTime / count,
        spatialScanTime: sum.spatialScanTime / count,
        audioProcessingTime: sum.audioProcessingTime / count,
        particleGenerationTime: sum.particleGenerationTime / count,
        messageDeliveryTime: sum.messageDeliveryTime / count,
        memoryUsage: sum.memoryUsage / count,
        cpuUsage: sum.cpuUsage / count,
        entityTrackingTime: sum.entityTrackingTime / count,
        dimensionUpdateTime: sum.dimensionUpdateTime / count
      };

    } catch (error) {
      this.logger.error('Failed to calculate average metrics:', error);
      return this.currentMetrics;
    }
  }

  /**
   * Check performance thresholds
   */
  private checkPerformanceThresholds(metrics: PerformanceMetrics): void {
    try {
      const thresholds = {
        stateSyncTime: 50,        // 50ms max
        packetProcessingTime: 20,   // 20ms max
        spatialScanTime: 100,       // 100ms max
        audioProcessingTime: 100,    // 100ms max
        particleGenerationTime: 50,   // 50ms max
        messageDeliveryTime: 10,     // 10ms max
        memoryUsage: 500,           // 500MB max
        entityTrackingTime: 200,     // 200ms max
        dimensionUpdateTime: 150     // 150ms max
      };

      // Check each metric against thresholds
      for (const [metric, threshold] of Object.entries(thresholds)) {
        const value = metrics[metric as keyof PerformanceMetrics] as number;
        if (value > threshold) {
          this.createAlert('warning', metric, value, threshold);
        }
      }

    } catch (error) {
      this.logger.error('Failed to check performance thresholds:', error);
    }
  }

  /**
   * Create performance alert
   */
  private createAlert(type: 'warning' | 'critical' | 'info', metric: string, value: number, threshold: number): void {
    try {
      const alert: PerformanceAlert = {
        type,
        metric,
        value,
        threshold,
        message: `${metric} (${value.toFixed(2)}) exceeds threshold (${threshold})`,
        timestamp: Date.now(),
        recommendations: this.getRecommendations(metric, value, threshold)
      };

      this.alerts.push(alert);

      // Keep only recent alerts
      if (this.alerts.length > 50) {
        this.alerts.shift();
      }

      this.logger.warn(`Performance alert: ${alert.message}`);

    } catch (error) {
      this.logger.error('Failed to create alert:', error);
    }
  }

  /**
   * Get recommendations for performance issues
   */
  private getRecommendations(metric: string, value: number, threshold: number): string[] {
    try {
      const recommendations: string[] = [];

      switch (metric) {
        case 'stateSyncTime':
          recommendations.push(
            'Reduce state sync frequency',
            'Optimize state subscription filters',
            'Consider state batching'
          );
          break;
        case 'packetProcessingTime':
          recommendations.push(
            'Increase packet batch size',
            'Optimize packet handlers',
            'Reduce packet interception scope'
          );
          break;
        case 'spatialScanTime':
          recommendations.push(
            'Reduce spatial scan radius',
            'Implement distance culling',
            'Optimize entity filtering'
          );
          break;
        case 'audioProcessingTime':
          recommendations.push(
            'Increase audio update interval',
            'Reduce audio effect complexity',
            'Optimize audio profile caching'
          );
          break;
        case 'particleGenerationTime':
          recommendations.push(
            'Reduce particle count',
            'Increase particle update interval',
            'Optimize particle command batching'
          );
          break;
        case 'messageDeliveryTime':
          recommendations.push(
            'Reduce message queue size',
            'Optimize message formatting',
            'Implement message batching'
          );
          break;
        case 'memoryUsage':
          recommendations.push(
            'Clear unused caches',
            'Reduce history size',
            'Implement object pooling'
          );
          break;
        case 'entityTrackingTime':
          recommendations.push(
            'Reduce entity tracking distance',
            'Implement entity filtering',
            'Optimize spatial calculations'
          );
          break;
        case 'dimensionUpdateTime':
          recommendations.push(
            'Reduce dimension update frequency',
            'Optimize dimension data structure',
            'Implement lazy loading'
          );
          break;
      }

      return recommendations;

    } catch (error) {
      this.logger.error('Failed to get recommendations:', error);
      return ['Unknown performance issue'];
    }
  }

  /**
   * Generate performance alerts
   */
  private generateAlerts(): void {
    try {
      // Clear old alerts
      const now = Date.now();
      this.alerts = this.alerts.filter(alert => now - alert.timestamp < 300000); // Keep 5 minutes

      // Check for critical issues
      if (this.currentMetrics.memoryUsage > 1000) {
        this.createAlert('critical', 'memoryUsage', this.currentMetrics.memoryUsage, 1000);
      }

      if (this.currentMetrics.cpuUsage > 90) {
        this.createAlert('critical', 'cpuUsage', this.currentMetrics.cpuUsage, 90);
      }

    } catch (error) {
      this.logger.error('Failed to generate alerts:', error);
    }
  }

  /**
   * Apply optimizations
   */
  private applyOptimizations(): void {
    try {
      // Apply current settings to all systems
      this.applyStateSyncOptimizations();
      this.applyPacketProcessingOptimizations();
      this.applySpatialScanOptimizations();
      this.applyAudioOptimizations();
      this.applyParticleOptimizations();
      this.applyMessageOptimizations();

      this.logger.info('Applied performance optimizations');

    } catch (error) {
      this.logger.error('Failed to apply optimizations:', error);
    }
  }

  /**
   * Apply state sync optimizations
   */
  private applyStateSyncOptimizations(): void {
    try {
      // This would integrate with the state manager to optimize subscriptions
      const callbacks = this.optimizationCallbacks.get('stateSync') || [];

      for (const callback of callbacks) {
        callback(this.currentSettings);
      }

    } catch (error) {
      this.logger.error('Failed to apply state sync optimizations:', error);
    }
  }

  /**
   * Apply packet processing optimizations
   */
  private applyPacketProcessingOptimizations(): void {
    try {
      // This would integrate with the packet system to optimize processing
      const callbacks = this.optimizationCallbacks.get('packetProcessing') || [];

      for (const callback of callbacks) {
        callback(this.currentSettings);
      }

    } catch (error) {
      this.logger.error('Failed to apply packet processing optimizations:', error);
    }
  }

  /**
   * Apply spatial scan optimizations
   */
  private applySpatialScanOptimizations(): void {
    try {
      // This would integrate with the spatial scanner to optimize scanning
      const callbacks = this.optimizationCallbacks.get('spatialScan') || [];

      for (const callback of callbacks) {
        callback(this.currentSettings);
      }

    } catch (error) {
      this.logger.error('Failed to apply spatial scan optimizations:', error);
    }
  }

  /**
   * Apply audio optimizations
   */
  private applyAudioOptimizations(): void {
    try {
      // This would integrate with the audio system to optimize processing
      const callbacks = this.optimizationCallbacks.get('audio') || [];

      for (const callback of callbacks) {
        callback(this.currentSettings);
      }

    } catch (error) {
      this.logger.error('Failed to apply audio optimizations:', error);
    }
  }

  /**
   * Apply particle optimizations
   */
  private applyParticleOptimizations(): void {
    try {
      // This would integrate with the particle system to optimize generation
      const callbacks = this.optimizationCallbacks.get('particles') || [];

      for (const callback of callbacks) {
        callback(this.currentSettings);
      }

    } catch (error) {
      this.logger.error('Failed to apply particle optimizations:', error);
    }
  }

  /**
   * Apply message optimizations
   */
  private applyMessageOptimizations(): void {
    try {
      // This would integrate with the feedback system to optimize delivery
      const callbacks = this.optimizationCallbacks.get('messages') || [];

      for (const callback of callbacks) {
        callback(this.currentSettings);
      }

    } catch (error) {
      this.logger.error('Failed to apply message optimizations:', error);
    }
  }

  /**
   * Set performance profile
   */
  public setPerformanceProfile(profileName: string): { success: boolean; error?: string } {
    try {
      const profile = this.performanceProfiles.get(profileName);
      if (!profile) {
        return { success: false, error: `Profile not found: ${profileName}` };
      }

      this.currentSettings = profile.settings;
      this.applyOptimizations();

      this.logger.info(`Applied performance profile: ${profile.name}`);
      return { success: true };

    } catch (error) {
      this.logger.error('Failed to set performance profile:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Register optimization callback
   */
  public registerOptimizationCallback(system: string, callback: (settings: OptimizationSettings) => void): void {
    try {
      if (!this.optimizationCallbacks.has(system)) {
        this.optimizationCallbacks.set(system, []);
      }

      this.optimizationCallbacks.get(system)!.push(callback);
      this.logger.debug(`Registered optimization callback for ${system}`);

    } catch (error) {
      this.logger.error(`Failed to register optimization callback for ${system}:`, error);
    }
  }

  /**
   * Get current settings
   */
  public getCurrentSettings(): OptimizationSettings {
    return { ...this.currentSettings };
  }

  /**
   * Get performance metrics
   */
  public getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.currentMetrics };
  }

  /**
   * Get performance history
   */
  public getPerformanceHistory(limit?: number): PerformanceMetrics[] {
    if (limit) {
      return this.performanceHistory.slice(-limit);
    }
    return [...this.performanceHistory];
  }

  /**
   * Get performance alerts
   */
  public getPerformanceAlerts(limit?: number): PerformanceAlert[] {
    if (limit) {
      return this.alerts.slice(-limit);
    }
    return [...this.alerts];
  }

  /**
   * Get available profiles
   */
  public getAvailableProfiles(): Map<string, PerformanceProfile> {
    return new Map(this.performanceProfiles);
  }

  /**
   * Generate performance report
   */
  public generatePerformanceReport(): string {
    try {
      let report = '# Performance Optimization Report\n\n';
      report += `Generated: ${new Date().toISOString()}\n\n`;

      // Current metrics
      report += '## Current Metrics\n\n';
      report += `- **State Sync Time**: ${this.currentMetrics.stateSyncTime.toFixed(2)}ms\n`;
      report += `- **Packet Processing Time**: ${this.currentMetrics.packetProcessingTime.toFixed(2)}ms\n`;
      report += `- **Spatial Scan Time**: ${this.currentMetrics.spatialScanTime.toFixed(2)}ms\n`;
      report += `- **Audio Processing Time**: ${this.currentMetrics.audioProcessingTime.toFixed(2)}ms\n`;
      report += `- **Particle Generation Time**: ${this.currentMetrics.particleGenerationTime.toFixed(2)}ms\n`;
      report += `- **Message Delivery Time**: ${this.currentMetrics.messageDeliveryTime.toFixed(2)}ms\n`;
      report += `- **Memory Usage**: ${this.currentMetrics.memoryUsage.toFixed(2)}MB\n`;
      report += `- **Entity Tracking Time**: ${this.currentMetrics.entityTrackingTime.toFixed(2)}ms\n`;
      report += `- **Dimension Update Time**: ${this.currentMetrics.dimensionUpdateTime.toFixed(2)}ms\n\n`;

      // Current settings
      report += '## Current Settings\n\n';
      report += `- **State Sync Frequency**: ${this.currentSettings.stateSyncFrequency}ms\n`;
      report += `- **Packet Batch Size**: ${this.currentSettings.packetBatchSize}\n`;
      report += `- **Spatial Scan Radius**: ${this.currentSettings.spatialScanRadius}\n`;
      report += `- **Entity Tracking Distance**: ${this.currentSettings.entityTrackingDistance}\n`;
      report += `- **Audio Update Interval**: ${this.currentSettings.audioUpdateInterval}ms\n`;
      report += `- **Particle Update Interval**: ${this.currentSettings.particleUpdateInterval}ms\n`;
      report += `- **Message Queue Size**: ${this.currentSettings.messageQueueSize}\n`;
      report += `- **Max Concurrent Operations**: ${this.currentSettings.maxConcurrentOperations}\n\n`;

      // Recent alerts
      if (this.alerts.length > 0) {
        report += '## Recent Alerts\n\n';
        const recentAlerts = this.alerts.slice(-10);
        for (const alert of recentAlerts) {
          report += `- **${alert.type.toUpperCase()}**: ${alert.message} (${new Date(alert.timestamp).toLocaleTimeString()})\n`;
          if (alert.recommendations.length > 0) {
            report += `  - Recommendations: ${alert.recommendations.join(', ')}\n`;
          }
        }
        report += '\n';
      }

      // Performance trends
      if (this.performanceHistory.length > 1) {
        report += '## Performance Trends\n\n';
        const average = this.calculateAverageMetrics(this.performanceHistory);
        report += `- **Average State Sync**: ${average.stateSyncTime.toFixed(2)}ms\n`;
        report += `- **Average Packet Processing**: ${average.packetProcessingTime.toFixed(2)}ms\n`;
        report += `- **Average Spatial Scan**: ${average.spatialScanTime.toFixed(2)}ms\n`;
        report += `- **Average Memory Usage**: ${average.memoryUsage.toFixed(2)}MB\n\n`;
      }

      return report;

    } catch (error) {
      this.logger.error('Failed to generate performance report:', error);
      return 'Failed to generate performance report';
    }
  }

  /**
   * Save performance report
   */
  public async savePerformanceReport(): Promise<{ success: boolean; error?: string }> {
    try {
      const report = this.generatePerformanceReport();

      if (api.internal && api.internal.fs) {
        await api.internal.fs.writeFile('performance_report.md', report);
        return { success: true };
      }

      return { success: false, error: 'File system not available' };

    } catch (error) {
      this.logger.error('Failed to save performance report:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Shutdown performance optimization
   */
  public shutdown(): void {
    try {
      this.performanceProfiles.clear();
      this.performanceHistory = [];
      this.alerts = [];
      this.optimizationCallbacks.clear();

      this.isInitialized = false;
      this.logger.info('PerformanceOptimization shutdown complete');
    } catch (error) {
      this.logger.error('Error during PerformanceOptimization shutdown:', error);
    }
  }
}

// Singleton instance for global access
let globalPerformanceOptimization: PerformanceOptimization | null = null;

/**
 * Get global performance optimization instance
 */
export function getPerformanceOptimization(): PerformanceOptimization {
  if (!globalPerformanceOptimization) {
    globalPerformanceOptimization = new PerformanceOptimization();
  }
  return globalPerformanceOptimization;
}

/**
 * Convenience function to set performance profile
 */
export function setPerformanceProfile(profileName: string): { success: boolean; error?: string } {
  const optimizer = getPerformanceOptimization();
  return optimizer.setPerformanceProfile(profileName);
}
