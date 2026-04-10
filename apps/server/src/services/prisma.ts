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
    uri: url,
    connectionLimit: 10
} as any);

// Fem un cast a 'any' aquí també perquè l'adaptador accepti el pool de mariadb
const adapter = new PrismaMariaDb(pool as any);

export const prisma = new PrismaClient({
    adapter,
    log: ['info', 'warn', 'error']
});

export default prisma;