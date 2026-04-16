import { Injectable, OnModuleInit } from '@nestjs/common';
import { envSchema } from '~/config/env';

@Injectable()
export class EnvValidator implements OnModuleInit {
  onModuleInit() {
    const result = envSchema.safeParse(process.env);

    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      const messages = Object.entries(errors)
        .map(([key, value]) => `- ${key}: ${value?.join(', ')}`)
        .join('\n');
      throw new Error(`Invalid environment variables:\n${messages}`);
    }
  }
}
