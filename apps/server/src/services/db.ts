import mysql from 'mysql2/promise';

const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'vertex_user', // Usuari del .env o el que hem creat
    password: process.env.DB_PASSWORD || '',    // Contrasenya del .env
    database: process.env.DB_NAME || 'vertex',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
});

// Test connection
pool.getConnection()
    .then(conn => {
        console.log('SUCCESS: Direct MariaDB connection established via mysql2');
        conn.release();
    })
    .catch(err => {
        console.error('FAILURE: MariaDB connection via mysql2 failed:', err.message);
    });

export default pool;
