const mysql = require('mysql2/promise');

async function checkRequests() {
    const connection = await mysql.createConnection("mysql://root:admin@127.0.0.1:3306/vertex");
    try {
        const [requests] = await connection.query('SELECT * FROM friend_requests');
        console.log('--- ALL FRIEND REQUESTS ---');
        console.log(JSON.stringify(requests, null, 2));

        const [users] = await connection.query('SELECT id, username FROM users');
        console.log('\n--- ALL USERS ---');
        console.log(JSON.stringify(users, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await connection.end();
    }
}

checkRequests();
