import { z } from 'zod';

const envSchema = z.object({
    DATABASE_URL:    z.string().min(1, 'DATABASE_URL is required'),
    REDIS_URL:       z.string().min(1, 'REDIS_URL is required'),
    PORT:            z.coerce.number().default(3000),
    JWT_SECRET:      z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
    ADMIN_USER_ID:   z.string().optional().default(''),
    ALLOWED_ORIGINS: z.string().optional().default(''),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    const missing = parsed.error.issues.map((e) => `  • ${e.path.join('.')}: ${e.message}`).join('\n');
    console.error(`\n[Vertex] Invalid environment configuration:\n${missing}\n`);
    process.exit(1);
}

export const env = parsed.data;
