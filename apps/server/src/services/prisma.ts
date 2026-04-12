import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../generated/prisma";
import mariadb from "mariadb";
import dotenv from "dotenv";
import path from "path";

// 1. Carreguem les variables d'entorn el primer de tot
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

let host = process.env.DB_HOST || '127.0.0.1';
let port = Number(process.env.DB_PORT) || 3306;
let user = process.env.DB_USER || 'vertex_user';
let password = process.env.DB_PASSWORD || '';
let database = process.env.DB_NAME || 'vertex';

// 2. Si no s'han carregat les variables individuals, intentem extreure-les de la DATABASE_URL
if (!process.env.DB_USER && process.env.DATABASE_URL) {
    try {
        // Netegem el prefix mysql:// si cal per URL()
        const urlString = process.env.DATABASE_URL.startsWith('mysql://') 
            ? process.env.DATABASE_URL.replace('mysql://', 'http://') // URL() prefereix protocols coneguts per parsejar auth
            : process.env.DATABASE_URL;
            
        const parsedUrl = new URL(urlString);
        host = parsedUrl.hostname || host;
        port = Number(parsedUrl.port) || port;
        user = parsedUrl.username || user;
        password = decodeURIComponent(parsedUrl.password) || password;
        database = parsedUrl.pathname.replace('/', '') || database;
        console.log("ℹ️ Credencials carregades des de DATABASE_URL (fallback)");
    } catch (e) {
        console.warn("⚠️ No s'ha pogut parsejar DATABASE_URL per al fallback.");
    }
}

// 3. Debug logs (apareixeran a pm2 logs)
console.log("--- [DEBUG] Prisma MariaDB Connection ---");
console.log("CWD:", process.cwd());
console.log("DB_HOST:", host);
console.log("DB_PORT:", port);
console.log("DB_USER:", user);
console.log("DB_NAME:", database);
console.log("Contrasenya configurada:", password ? "SÍ" : "NO");
console.log("------------------------------------------");

const pool = mariadb.createPool({
    host,
    port,
    user,
    password,
    database,
    connectionLimit: 10
} as any);

const adapter = new PrismaMariaDb(pool as any);

export const prisma = new PrismaClient({
    adapter,
    log: ['error', 'warn']
});

export default prisma;