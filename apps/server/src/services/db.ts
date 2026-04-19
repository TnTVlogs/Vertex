import mysql from 'mysql2/promise';
import logger from '../utils/logger';

const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'vertex_user',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'vertex',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
});

(async () => {
    try {
        const conn = await pool.getConnection();
        logger.info('Direct MariaDB connection established via mysql2');
        conn.release();
    } catch (err: any) {
        logger.error({ err: err.message }, 'MariaDB connection via mysql2 failed');
    }
})();

export default pool;
