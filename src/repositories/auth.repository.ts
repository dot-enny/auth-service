import { pool } from "../db.js"

export const findUserByEmail = async (email: string) => {
    const result = await pool.query(
        `
            SELECT id FROM users WHERE email = $1
        `,
        [email.toLowerCase()]);

    return result.rows[0] ?? null;
}

export const createUser = async (email: string, passwordHash: string) => {
    const result = await pool.query(
        `
            INSERT INTO users (email, password_hash)
            VALUES ($1, $2)
            RETURNING id, email, role, created_at
        `,
        [email.toLowerCase(), passwordHash]
    );

    return result.rows[0];
}