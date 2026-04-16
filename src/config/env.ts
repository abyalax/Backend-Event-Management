import z from 'zod';
import 'dotenv/config';

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
  /**Database Config */
  DATABASE_URL: z.string({ message: 'Required Database URL' }),
  DATABASE_TYPE: z.string({ message: 'Required Database Type' }),

  COOKIE_SECRET: z.string({ message: 'Cookie secret is required' }),
});

type Environment = z.infer<typeof envSchema>;

let cachedEnv: Environment | undefined;

const getEnvironment = (): Environment => {
  if (cachedEnv === undefined) {
    cachedEnv = envSchema.parse(process.env);
    return cachedEnv;
  }
  return cachedEnv;
};

export const env = getEnvironment();
