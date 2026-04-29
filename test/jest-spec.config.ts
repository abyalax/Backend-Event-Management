import type { Config } from 'jest';
import { jestConfig } from '../jest.config';

const config: Config = {
  ...jestConfig,
  rootDir: '../',
  testRegex: '.spec.ts$',
  testTimeout: 180000,
};

export default config;
