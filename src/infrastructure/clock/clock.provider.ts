/**
 * Clock interface for time abstraction
 */
export interface Clock {
  now(): Date;
}

/**
 * System clock implementation using real time
 */
export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}

/**
 * Clock provider for dependency injection
 */
export class ClockProvider {
  private static instance: Clock;

  /**
   * Sets the global clock instance
   */
  static setInstance(clock: Clock): void {
    ClockProvider.instance = clock;
  }

  /**
   * Gets the current clock instance
   */
  static getInstance(): Clock {
    if (!ClockProvider.instance) {
      ClockProvider.instance = new SystemClock();
    }
    return ClockProvider.instance;
  }

  /**
   * Resets to system clock (useful for cleanup)
   */
  static resetToSystemClock(): void {
    ClockProvider.instance = new SystemClock();
  }

  /**
   * Convenience method to get current time
   */
  static now(): Date {
    return ClockProvider.getInstance().now();
  }
}
