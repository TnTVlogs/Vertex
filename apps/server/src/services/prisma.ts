import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../generated/prisma";
import mariadb from "mariadb";

// Les variables d'entorn ja s'han carregat a index.ts
const url = process.env.DATABASE_URL;

if (!url) {
    throw new Error("❌ DATABASE_URL no definida al fitxer .env");
}

console.log("--- [DEBUG] Prisma MariaDB Connection ---");
console.log("DATABASE_URL carregada:", url ? "SÍ" : "NO");
console.log("------------------------------------------");

// Creem el pool directament amb la URL de connexió
// El driver de MariaDB sap parsejar aquesta URL automàticament
const pool = mariadb.createPool(url);

const adapter = new PrismaMariaDb(pool as any);

export const prisma = new PrismaClient({
    adapter,
    log: ['error', 'warn']
});

export default prisma;