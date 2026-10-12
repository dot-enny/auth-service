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
      VALUES ($1, $2, $3, $4)
      RETURNING id;
    `;
    const result = await pool.query(insertTokenQuery, [userId, tokenHash, familyId, expiresAt]);

    return result.rows[0]
}

export const fetchRefreshToken = async (incomingHash: string) => {
    const tokenQuery = `
      SELECT rt.id, rt.user_id, rt.family_id, rt.is_revoked, rt.expires_at, u.role
      FROM refresh_tokens rt
      JOIN users u ON u.id = rt.user_id
      WHERE rt.token_hash = $1;
    `;
    const result = await pool.query(tokenQuery, [incomingHash]);
    
    return result.rows[0]
}

export const invalidateTokenFamily = async (familyId: string) => {
    const result = await pool.query('UPDATE refresh_tokens SET is_revoked = TRUE WHERE family_id = $1', [familyId]);
    return result.rows[0] ?? null
}

export const findUserById = async (userId: number) => {
    const result = await pool.query('SELECT id, email, role, created_at FROM users WHERE id = $1', [userId]);
    return result.rows[0] ?? null
}

export const rotateRefreshToken = async (
    tokenId: number,
    userId: number,
    familyId: string,
    tokenHash: string,
    expiresAt: Date
) => {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const consumed = await client.query(
            `
            UPDATE refresh_tokens
            SET is_revoked = TRUE
            WHERE id = $1
              AND is_revoked = FALSE
            RETURNING id;
            `,
            [tokenId]
        );

        // Another request already consumed this token.
        if (consumed.rowCount !== 1) {
            await client.query("ROLLBACK");
            return false;
        }

        await client.query(
            `
            INSERT INTO refresh_tokens
                (user_id, token_hash, family_id, expires_at)
            VALUES ($1, $2, $3, $4);
            `,
            [userId, tokenHash, familyId, expiresAt]
        );

        await client.query("COMMIT");
        return true;
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};