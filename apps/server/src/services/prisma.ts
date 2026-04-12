import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../generated/prisma";
import mariadb from "mariadb";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const url = process.env.DATABASE_URL;

if (!url) {
    throw new Error("❌ DATABASE_URL no definida al fitxer .env");
}
console.log("CWD:", process.cwd());
console.log("DATABASE_URL carregada:", process.env.DATABASE_URL ? "SÍ" : "NO");
// Fem un cast a 'any' per evitar l'error de la propietat 'uri'
const pool = mariadb.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'vertex_user',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'vertex',
    connectionLimit: 10
} as any);

// Fem un cast a 'any' aquí també perquè l'adaptador accepti el pool de mariadb
const adapter = new PrismaMariaDb(pool as any);

export const prisma = new PrismaClient({
    adapter,
    log: ['info', 'warn', 'error']
});

export default prisma;