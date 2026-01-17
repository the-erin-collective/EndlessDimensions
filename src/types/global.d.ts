
declare global {
  namespace MoudAPI {
    interface MoudAPI {
      state: {
        get(key: string): any;
        set(key: string, value: any): void;
      };
      scheduler: {
        runRepeating(ticks: number, task: () => void): void;
      };
      world: {
        getBlock(x: number, y: number, z: number): any;
      };
    }

    interface EntityData {
      dimension?: string;
    }
  }
}

export {};
