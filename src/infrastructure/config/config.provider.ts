import { Environment, envSchema } from '~/infrastructure/config/config.schema';

export const ENV = 'ENV';
export const CONFIG_SERVICE = 'CONFIG_SERVICE';

export interface ConfigService {
  get<K extends keyof Environment>(key: K): Environment[K];
  getAll(): Environment;
  isDevelopment(): boolean;
  isProduction(): boolean;
  isTest(): boolean;
}

class ConfigServiceImpl implements ConfigService {
  private readonly config: Environment;

  constructor(config: Environment) {
    this.config = config;
  }

  get<K extends keyof Environment>(key: K): Environment[K] {
    return this.config[key];
  }

  getAll(): Environment {
    return { ...this.config };
  }

  isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development';
  }

  isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  }

  isTest(): boolean {
    return process.env.NODE_ENV === 'test';
  }
}

export const EnvProvider = {
  provide: ENV,
  useFactory: () => {
    const result = envSchema.safeParse(process.env);

    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      const messages = Object.entries(errors)
        .map(([key, value]) => `- ${key}: ${value?.join(', ')}`)
        .join('\n');

      throw new Error(`Invalid environment variables:\n${messages}`);
    }

    return result.data;
  },
};

export const ConfigProvider = {
  provide: CONFIG_SERVICE,
  useFactory: (env: Environment) => new ConfigServiceImpl(env),
  inject: [ENV],
};
