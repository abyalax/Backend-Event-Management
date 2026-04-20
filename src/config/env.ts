import 'dotenv/config';
import z from 'zod';

export const envSchema = z.object({
  PORT: z.string({ message: 'PORT Aplication is required' }),
  JWT_SECRET: z.string({ message: 'JWT secret is required' }),
  JWT_PRIVATE_KEY: z.string({ message: 'JWT private key is required' }),
  JWT_PUBLIC_KEY: z.string({ message: 'JWT public key is required' }),
  JWT_EXPIRATION: z.string({ message: 'JWT expiration is required' }),
  JWT_REFRESH_SECRET: z.string({ message: 'JWT refresh secret is required' }),
  JWT_REFRESH_EXPIRATION: z.string({
    message: 'JWT refresh expiration is required',
  }),

  DATABASE_URL: z.string({ message: 'Required Database URL' }),
  DATABASE_TYPE: z.string({ message: 'Required Database Type' }),

  REDIS_HOST: z.string({ message: 'REDIS_HOST is required' }),
  REDIS_PORT: z.coerce.number({ message: 'REDIS_PORT is required' }),
  REDIS_PASSWORD: z.string({ message: 'REDIS_PASSWORD is required' }),

  COOKIE_SECRET: z.string({ message: 'Cookie secret is required' }),
});

export type Environment = z.infer<typeof envSchema>;
