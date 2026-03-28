import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import db from './db';

export const authService = {
    async createUser(username: string, email: string, passwordHash: string): Promise<{ id: string; username: string; email: string }> {
        const id = uuidv4();
        await db.query(
            'INSERT INTO users (id, username, email, password_hash) VALUES (?, ?, ?, ?)',
            [id, username, email, passwordHash]
        );
        return { id, username, email };
    },

    async getUserByEmail(email: string): Promise<any> {
        const [rows]: any = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        return rows[0];
    },

    async getUserById(id: string): Promise<{ id: string; username: string; email: string } | null> {
        const [rows]: any = await db.query('SELECT id, username, email FROM users WHERE id = ?', [id]);
        return rows[0] || null;
    }
};
