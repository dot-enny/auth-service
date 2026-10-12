# Standalone Authentication Service

An Express, TypeScript, and PostgreSQL authentication service built to make token security and session lifecycle behavior explicit.

The service avoids long-lived access tokens in `localStorage` and uses short-lived access tokens, HTTP-only refresh cookies, refresh-token rotation, and replay detection.

## Architectural Decisions

### Password security

Passwords are hashed with Argon2id using a memory-hard configuration: 64 MB memory cost, three iterations, and one thread of parallelism.

### Dual-token authentication

- **Access token:** A short-lived JWT valid for 15 minutes. Clients send it in an `Authorization: Bearer` header, and protected routes verify it without a database lookup.
- **Refresh token:** A cryptographically random opaque token valid for seven days. Only its SHA-256 hash is stored in PostgreSQL; the raw token is sent to the client in an HTTP-only cookie.

This keeps the access token short-lived while allowing a user to obtain new access tokens without sending a password again.

### Cookie isolation

Refresh tokens use `httpOnly` cookies, so browser JavaScript cannot read them. They are also `SameSite=Strict` and restricted to `/api/auth`. The `secure` flag is enabled when `NODE_ENV=production`, so production deployments must use HTTPS.

### Rotation and token families

Every refresh request revokes the consumed token and creates a successor with the same `family_id`. A `family_id` represents one login session's rotation chain.

If a revoked refresh token is presented again, the service treats it as replay or token theft and revokes every token in that family. The rotated token can no longer be used after the family is marked compromised.

### Token cleanup

The server starts an hourly cleanup job that deletes refresh tokens past their expiration time. Revoked tokens are retained until expiration so reuse detection can still identify replayed tokens.

## Requirements

- Node.js 20+
- Docker Desktop
- npm

## Environment Variables

| Variable | Purpose | Local default |
| --- | --- | --- |
| `NODE_ENV` | Runtime environment and cookie security mode | `development` |
| `PORT` | HTTP server port | `4000` |
| `ACCESS_TOKEN_SECRET` | Secret used to sign access JWTs | Required; set a strong random value |
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_PORT` | PostgreSQL host port | `5433` |
| `POSTGRES_USER` | PostgreSQL username | `auth_user` |
| `POSTGRES_PASSWORD` | PostgreSQL password | `auth_secret_password` |
| `POSTGRES_DB` | PostgreSQL database name | `auth_db` |

## Local Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create the local environment file:

   ```bash
   cp .env.example .env
   ```

   On PowerShell:

   ```powershell
   Copy-Item .env.example .env
   ```

3. Replace `ACCESS_TOKEN_SECRET` in `.env` with a long random value.

4. Start PostgreSQL:

   ```bash
   docker compose up -d postgres
   ```

5. Start the API:

   ```bash
   npm run dev
   ```

The API runs at `http://localhost:4000`.

## Scripts

- `npm run dev` starts the TypeScript server with `tsx`.
- `npm run build` compiles application code to `dist/`.
- `npm start` runs the compiled server from `dist/`.
- `npm test` runs the Vitest integration suite.

## API Endpoints

### Register

```bash
curl -i -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"StrongPassword123!"}'
```

### Login

The access token is returned in JSON. The refresh token is stored in an HTTP-only cookie:

```bash
curl -i -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email":"test@example.com","password":"StrongPassword123!"}'
```

### Protected route

Send the access token as a bearer token:

```bash
curl -i http://localhost:4000/api/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Refresh

The current refresh cookie is consumed and replaced with a rotated cookie:

```bash
curl -i -X POST http://localhost:4000/api/auth/refresh \
  -b cookies.txt \
  -c cookies.txt
```

### Logout

Logout revokes the refresh-token family and clears the client cookie:

```bash
curl -i -X POST http://localhost:4000/api/auth/logout \
  -b cookies.txt \
  -c cookies.txt
```

## Database Schema and Testing

```text
users (id, email, password_hash, role, created_at)
  └── refresh_tokens (id, user_id, token_hash, family_id, is_revoked, expires_at)
```

The `refresh_tokens.user_id` foreign key uses `ON DELETE CASCADE`, so deleting a test user also deletes that user's refresh tokens.

Integration tests live outside `src/` in `tests/`. They create uniquely named users and remove each test user in `afterAll`. Tests currently use the configured local PostgreSQL database; use test-only credentials or a dedicated database before running them against a shared environment.

## Security Notes

- Never commit `.env`, credentials, refresh-token cookies, or production secrets.
- Use HTTPS in production so refresh cookies are transmitted with `secure=true`.
- Set a strong, unique `ACCESS_TOKEN_SECRET` for every environment.
- Replace the local PostgreSQL credentials before deployment.
