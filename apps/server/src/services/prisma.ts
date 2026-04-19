import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '@prisma/client';

const adapter = new PrismaMariaDb({
    host:            process.env.DB_HOST     || '127.0.0.1',
    port:            Number(process.env.DB_PORT) || 3306,
    user:            process.env.DB_USER     || 'vertex_user',
    password:        process.env.DB_PASSWORD || '',
    database:        process.env.DB_NAME     || 'vertex',
    connectionLimit: 10,
});

export const prisma = new PrismaClient({
    adapter,
    log: ['error', 'warn'],
});

export default prisma;
