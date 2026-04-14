import type { Config } from 'jest';
import { jestConfig } from '../jest.config';

const config: Config = {
  ...jestConfig,
  rootDir: '../',
  testRegex: '.e2e-spec.ts$',
};

export default config;
