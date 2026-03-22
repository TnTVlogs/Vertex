import db from '../services/db';

const setup = async () => {
    try {
        console.log('Starting database schema initialization...');

        // 1. Users table
        await db.query(`
            CREATE TABLE IF NOT EXISTS users (
                id VARCHAR(191) PRIMARY KEY,
                username VARCHAR(191) UNIQUE NOT NULL,
                email VARCHAR(191) UNIQUE NOT NULL,
                password_hash VARCHAR(191) NOT NULL,
                avatar_url VARCHAR(191),
                status VARCHAR(191) DEFAULT 'offline'
            )
        `);
        console.log('- Users table checked/created');

        // 2. Servers table
        await db.query(`
            CREATE TABLE IF NOT EXISTS servers (
                id VARCHAR(191) PRIMARY KEY,
                name VARCHAR(191) NOT NULL,
                icon_url VARCHAR(191),
                owner_id VARCHAR(191) NOT NULL,
                FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        console.log('- Servers table checked/created');

        // 3. Channels table
        await db.query(`
            CREATE TABLE IF NOT EXISTS channels (
                id VARCHAR(191) PRIMARY KEY,
                server_id VARCHAR(191) NOT NULL,
                name VARCHAR(191) NOT NULL,
                type VARCHAR(191) DEFAULT 'text',
                FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE
            )
        `);
        console.log('- Channels table checked/created');

        // 4. Members table (Composite unique key)
        await db.query(`
            CREATE TABLE IF NOT EXISTS members (
                id VARCHAR(191) PRIMARY KEY,
                server_id VARCHAR(191) NOT NULL,
                user_id VARCHAR(191) NOT NULL,
                role VARCHAR(191) DEFAULT 'member',
                UNIQUE KEY server_user_unique (server_id, user_id),
                FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        console.log('- Members table checked/created');

        // 5. Messages table
        await db.query(`
            CREATE TABLE IF NOT EXISTS messages (
                id VARCHAR(191) PRIMARY KEY,
                content TEXT NOT NULL,
                attachment_url VARCHAR(191),
                author_id VARCHAR(191) NOT NULL,
                channel_id VARCHAR(191),
                recipient_id VARCHAR(191),
                created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
                FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE SET NULL,
                FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE SET NULL
            )
        `);
        // 6. Friend Requests table
        await db.query(`
            CREATE TABLE IF NOT EXISTS friend_requests (
                id VARCHAR(191) PRIMARY KEY,
                from_id VARCHAR(191) NOT NULL,
                to_id VARCHAR(191) NOT NULL,
                status ENUM('pending', 'accepted', 'declined') DEFAULT 'pending',
                created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
                FOREIGN KEY (from_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (to_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE KEY from_to_unique (from_id, to_id)
            )
        `);
        console.log('- Friend Requests table checked/created');

        // 7. Friendships table
        await db.query(`
            CREATE TABLE IF NOT EXISTS friendships (
                id VARCHAR(191) PRIMARY KEY,
                user1_id VARCHAR(191) NOT NULL,
                user2_id VARCHAR(191) NOT NULL,
                created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
                FOREIGN KEY (user1_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (user2_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE KEY user_pair_unique (user1_id, user2_id)
            )
        `);
        console.log('- Friendships table checked/created');

        console.log('Database schema initialization completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Error setting up database schema:', error);
        process.exit(1);
    }
};

setup();
