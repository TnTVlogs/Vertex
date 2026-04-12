import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@prisma/client";
import * as mariadb from "mariadb";

// Carreguem dades del .env (que ja ha estat carregat a index.ts)
const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'vertex_user',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'vertex',
    connectionLimit: 10
};

console.log("--- [DEBUG] Prisma Driver Adapter Connection ---");
console.log("Timestamp:", new Date().toISOString());
console.log("PID:", process.pid);
console.log("User:", dbConfig.user);
console.log("Database:", dbConfig.database);
console.log("Password defined:", dbConfig.password ? "SÍ" : "NO");
console.log("------------------------------------------------");

const pool = mariadb.createPool(dbConfig);

const adapter = new PrismaMariaDb(pool as any);

export const prisma = new PrismaClient({
    adapter,
    log: ['error', 'warn']
});

export default prisma;