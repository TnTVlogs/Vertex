import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@prisma/client";
import * as mariadb from "mariadb";

// Usem la cadena de connexió però ens assegurem que el protocol sigui mariadb://
// ja que alguns parsers del driver de mariadb no agafen bé el protocol mysql://
let url = process.env.DATABASE_URL || '';
if (url.startsWith('mysql://')) {
    url = url.replace('mysql://', 'mariadb://');
}

console.log("--- [DEBUG] Prisma Driver Adapter Connection ---");
console.log("Timestamp:", new Date().toISOString());
console.log("PID:", process.pid);
console.log("Protocol correcte:", url.startsWith('mariadb://') ? "SÍ" : "NO");
console.log("------------------------------------------------");

if (!url) {
    throw new Error("DATABASE_URL no definida");
}

const pool = mariadb.createPool(url);

const adapter = new PrismaMariaDb(pool as any);

export const prisma = new PrismaClient({
    adapter,
    log: ['error', 'warn']
});

export default prisma;