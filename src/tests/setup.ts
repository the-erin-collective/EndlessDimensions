// Jest setup file
import 'jest';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock Moud API types
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidBlock(): R;
      toBeValidDimension(): R;
    }
  }
}

// Custom matchers
expect.extend({
  toBeValidBlock(received: string) {
    const pass = typeof received === 'string' && received.startsWith('minecraft:');
    return {
      message: () =>
        pass
          ? `expected ${received} not to be a valid Minecraft block`
          : `expected ${received} to be a valid Minecraft block starting with 'minecraft:'`,
      pass,
    };
  },
  toBeValidDimension(received: any) {
    const requiredFields = ['id', 'name', 'generatorType', 'defaultBlock', 'defaultFluid'];
    const hasAllFields = requiredFields.every(field => field in received);
    const hasValidGenerator = ['noise', 'flat', 'void', 'floating_islands', 'the_end', 'custom'].includes(received.generatorType);
    
    const pass = hasAllFields && hasValidGenerator;
    return {
      message: () =>
        pass
          ? `expected ${received} not to be a valid dimension configuration`
          : `expected ${received} to be a valid dimension configuration with required fields and valid generator type`,
      pass,
    };
  },
});
