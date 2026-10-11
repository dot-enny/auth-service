import { pool } from "../db.js"

export const findUserByEmail = async (email: string) => {
    const result = await pool.query(
        `
            SELECT id FROM users WHERE email = $1
        `,
        [email.toLowerCase()]);

    return result.rows[0] ?? null;
}

export const fetchUserByEmail = async (email: string) => {
    const result = await pool.query(
      'SELECT id, email, password_hash, role FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    return result.rows[0];
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

export const storeRefreshToken = async (userId: number, tokenHash: string, familyId: string, expiresAt: Date) => {
    const insertTokenQuery = `
      INSERT INTO refresh_tokens (user_id, token_hash, family_id, expires_at)
      VALUES ($1, $2, $3, $4);
    `;
    const result = await pool.query(insertTokenQuery, [userId, tokenHash, familyId, expiresAt]);

    return result.rows[0]
}