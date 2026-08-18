import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().min(1).max(65535).default(4000),

  DATABASE_HOST: z.string().min(1),
  DATABASE_PORT: z.coerce.number().min(1).max(65535).default(5432),
  DATABASE_USER: z.string().min(1),
  DATABASE_PASSWORD: z.string().min(1),
  DATABASE_NAME: z.string().min(1),

  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('15m'),

  ROLE_CHANGE_SECRET: z.string().min(8),

  BCRYPT_ROUNDS: z.coerce.number().min(10).max(15).default(12),

  CORS_ORIGINS: z.string().default(''),

  THROTTLE_TTL: z.coerce.number().positive().default(60),
  THROTTLE_LIMIT: z.coerce.number().positive().default(100),
});

export type EnvironmentVariables = z.infer<typeof envSchema>;

export const validateEnvironment = (
  config: Record<string, unknown>,
): EnvironmentVariables => {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    const errors = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join(', ');
    throw new Error(`Environment validation failed: ${errors}`);
  }

  return result.data;
};
