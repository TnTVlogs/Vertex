import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@prisma/client";
import * as mariadb from "mariadb";

// Carreguem les dades del .env (que ja ha estat carregat a index.ts)
const host = process.env.DB_HOST || '127.0.0.1';
const port = Number(process.env.DB_PORT) || 3306;
const user = process.env.DB_USER || 'vertex_user';
const password = process.env.DB_PASSWORD || '';
const database = process.env.DB_NAME || 'vertex';

console.log("--- [DEBUG] Prisma Standard Connection ---");
console.log("Host:", host);
console.log("Port:", port);
console.log("User:", user);
console.log("Database:", database);
console.log("Password length:", password.length);
console.log("------------------------------------------");

// Creem el pool amb un objecte d'opcions explícit
const pool = mariadb.createPool({
    host,
    port,
    user,
    password,
    database,
    connectionLimit: 10,
    connectTimeout: 10000
});

const adapter = new PrismaMariaDb(pool as any);

export const prisma = new PrismaClient({
    adapter,
    log: ['error', 'warn']
});

export default prisma;