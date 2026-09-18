import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(5055),
  DATABASE_URL: z.string().min(1),
  POSTGRES_ADMIN_URL: z.string().optional(),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  CORS_ORIGIN: z.string().optional(),
  LOG_LEVEL: z.string().default('info'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = {
  ...parsed.data,
  /** Prefer CORS_ORIGIN when set (restaurant-style), else FRONTEND_URL */
  corsOrigin: parsed.data.CORS_ORIGIN || parsed.data.FRONTEND_URL,
};
