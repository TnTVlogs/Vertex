const mysql = require('mysql2/promise');

async function runQuery() {
    const connection = await mysql.createConnection("mysql://root:admin@127.0.0.1:3306/vertex");
    try {
        console.log('--- ALL USERS ---');
        const [users] = await connection.query('SELECT id, username FROM users');
        console.table(users);

        console.log('\n--- ALL PENDING REQUESTS IN DB ---');
        const [reqs] = await connection.query('SELECT * FROM friend_requests');
        console.table(reqs);

        if (reqs.length > 0) {
            console.log('\n--- VERIFYING JOINS ---');
            for (const r of reqs) {
                const [r1] = await connection.query('SELECT username FROM users WHERE id = ?', [r.from_id]);
                const [r2] = await connection.query('SELECT username FROM users WHERE id = ?', [r.to_id]);
                console.log(`Request ID ${r.id}: from_id (${r.from_id}) exists? ${r1.length > 0}, to_id (${r.to_id}) exists? ${r2.length > 0}`);
            }
        }
    } catch (err) {
        console.error(err);
    } finally {
        await connection.end();
    }
}

runQuery();
