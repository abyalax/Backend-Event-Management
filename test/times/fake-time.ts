/**
 * Mock Clock System for E2E Testing
 *
 * This system provides a dependency-injectable clock abstraction that allows
 * deterministic testing of time-dependent features like reminders.
 */

export interface Clock {
  /**
   * Returns the current time according to this clock
   */
  now(): Date;
}

/**
 * System clock implementation using real system time
 * Used in production environment
 */
export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}

/**
 * Fake clock implementation for testing
 * Allows manual control of time for deterministic tests
 */
export type TimeInput = Date | string | number;

export class FakeClock implements Clock {
  private currentTime: Date;

  constructor(initialTime?: TimeInput) {
    this.currentTime = this.parseTime(initialTime || new Date());
  }

  /**
   * Returns the current fake time
   */
  now(): Date {
    return new Date(this.currentTime);
  }

  /**
   * Sets the current time to a specific value
   */
  setTime(time: TimeInput): void {
    this.currentTime = this.parseTime(time);
  }

  /**
   * Advances the current time by a specified duration
   */
  advanceTime(milliseconds: number): void {
    this.currentTime = new Date(this.currentTime.getTime() + milliseconds);
  }

  /**
   * Advances time by days
   */
  advanceDays(days: number): void {
    this.advanceTime(days * 24 * 60 * 60 * 1000);
  }

  /**
   * Advances time by hours
   */
  advanceHours(hours: number): void {
    this.advanceTime(hours * 60 * 60 * 1000);
  }

  /**
   * Advances time by minutes
   */
  advanceMinutes(minutes: number): void {
    this.advanceTime(minutes * 60 * 1000);
  }

  /**
   * Advances time by seconds
   */
  advanceSeconds(seconds: number): void {
    this.advanceTime(seconds * 1000);
  }

  /**
   * Resets the clock to the initial time or current system time
   */
  reset(initialTime?: TimeInput): void {
    this.currentTime = this.parseTime(initialTime || new Date());
  }

  /**
   * Returns a Date object representing a time relative to current fake time
   */
  fromNow(milliseconds: number): Date {
    return new Date(this.currentTime.getTime() + milliseconds);
  }

  /**
   * Returns a Date object representing days from current fake time
   */
  daysFromNow(days: number): Date {
    return this.fromNow(days * 24 * 60 * 60 * 1000);
  }

  /**
   * Returns a Date object representing hours from current fake time
   */
  hoursFromNow(hours: number): Date {
    return this.fromNow(hours * 60 * 60 * 1000);
  }

  /**
   * Returns a Date object representing minutes from current fake time
   */
  minutesFromNow(minutes: number): Date {
    return this.fromNow(minutes * 60 * 1000);
  }

  /**
   * Helper method to parse various time formats
   */
  private parseTime(time: TimeInput): Date {
    if (time instanceof Date) {
      return new Date(time);
    }
    if (typeof time === 'string') {
      return new Date(time);
    }
    if (typeof time === 'number') {
      return new Date(time);
    }
    throw new Error(`Invalid time format: ${String(time)}`);
  }

  /**
   * Gets the current timestamp in milliseconds
   */
  getTimestamp(): number {
    return this.currentTime.getTime();
  }

  /**
   * Creates a copy of this fake clock
   */
  clone(): FakeClock {
    return new FakeClock(new Date(this.currentTime));
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

/**
 * Test utilities for working with fake clocks
 */
export class ClockTestUtils {
  /**
   * Sets up a fake clock for testing
   */
  static setupFakeClock(initialTime?: TimeInput): FakeClock {
    const fakeClock = new FakeClock(initialTime);
    ClockProvider.setInstance(fakeClock);
    return fakeClock;
  }

  /**
   * Cleans up and resets to system clock
   */
  static cleanup(): void {
    ClockProvider.resetToSystemClock();
  }

  /**
   * Creates a fake clock with a specific starting time
   */
  static createClockAt(date: TimeInput): FakeClock {
    return new FakeClock(date);
  }

  /**
   * Creates a fake clock starting from a specific date string
   */
  static createClockFromString(dateString: string): FakeClock {
    return new FakeClock(new Date(dateString));
  }

  /**
   * Creates a fake clock starting from Unix timestamp
   */
  static createClockFromTimestamp(timestamp: number): FakeClock {
    return new FakeClock(new Date(timestamp));
  }
}
