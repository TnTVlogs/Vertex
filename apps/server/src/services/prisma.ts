import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

// Force absolute path for .env to ensure it's loaded before Prisma initialisation
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error']
});

// Test connection and log successful database URL (masked)
const maskedUrl = (process.env.DATABASE_URL || '').replace(/:[^:@]+@/, ':****@');
console.log(`Connecting to database: ${maskedUrl}`);

export default prisma;
