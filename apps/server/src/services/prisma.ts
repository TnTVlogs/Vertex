import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@prisma/client";
// A la versió 7 no cal importar 'mariadb' nosaltres per fer el pool,
// l'adapter ho gestiona internament amb les opcions que li passem.

// Carreguem dades del .env (que ja ha estat carregat a index.ts)
const options = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'vertex_user',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'vertex',
    connectionLimit: 10
};

console.log("--- [DEBUG] Prisma 7 MariaDB Adapter ---");
console.log("Timestamp:", new Date().toISOString());
console.log("PID:", process.pid);
console.log("User:", options.user);
console.log("Password defined:", options.password ? "SÍ" : "NO");
console.log("----------------------------------------");

// Segons la docu de Prisma 7, passem l'objecte d'opcions directament
const adapter = new PrismaMariaDb(options);

export const prisma = new PrismaClient({
    adapter,
    log: ['error', 'warn']
});

export default prisma;