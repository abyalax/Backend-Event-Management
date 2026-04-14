import type { Config } from 'jest';
import { jestConfig } from '../jest.config';

const config: Config = {
  ...jestConfig,
  rootDir: '../',
  testRegex: '.spec.ts$',
};

export default config;
