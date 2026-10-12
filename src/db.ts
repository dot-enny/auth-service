import pg from 'pg';

const { Pool } = pg;

export const pool = new Pool({
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5433),
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
});

export async function initDb() {
  const schema = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role VARCHAR(50) DEFAULT 'user' NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      token_hash VARCHAR(64) NOT NULL UNIQUE,
      family_id UUID NOT NULL,
      is_revoked BOOLEAN DEFAULT FALSE,
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);
    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_family ON refresh_tokens(family_id);
  `;

  await pool.query(schema);
  console.log('Database schema initialized successfully.');
}

export async function purgeExpiredTokens(): Promise<number> {
  // Delete tokens where expiration date has passed
  const query = `
    DELETE FROM refresh_tokens
    WHERE expires_at < CURRENT_TIMESTAMP;
  `;
  const result = await pool.query(query);
  return result.rowCount ?? 0;
}

export function startTokenCleanupScheduler(intervalMs = 60 * 60 * 1000) {
  // Run every hour (defaults to 3,600,000 ms)
  setInterval(async () => {
    try {
      const deletedCount = await purgeExpiredTokens();
      if (deletedCount > 0) {
        console.log(`[CLEANUP] Purged ${deletedCount} expired refresh token(s).`);
      }
    } catch (err) {
      console.error('[CLEANUP] Failed to purge expired tokens:', err);
    }
  }, intervalMs);
}