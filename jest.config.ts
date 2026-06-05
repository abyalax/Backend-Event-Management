import type { Config } from 'jest';

export const jestConfig: Config = {
  moduleFileExtensions: ['js', 'json', 'ts', 'tsx'],
  rootDir: '.',
  testEnvironment: 'node',
  detectOpenHandles: true,
  forceExit: true,
  transform: {
    '^.+\\.(t|j)sx?$': 'ts-jest',
  },
  moduleNameMapper: {
    '^~/test/(.*)$': '<rootDir>/test/$1',
    '^~/(.*)$': '<rootDir>/src/$1',
  },
  testTimeout: 60000,
};
