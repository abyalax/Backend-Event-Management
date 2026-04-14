import type { Config } from 'jest';

export const jestConfig: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testEnvironment: 'node',
  forceExit: true,
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  moduleNameMapper: {
    '^~/test/(.*)$': '<rootDir>/test/$1',
    '^~/(.*)$': '<rootDir>/src/$1',
  },
};
