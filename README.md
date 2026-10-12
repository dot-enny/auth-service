# Auth Service

A small Express and PostgreSQL authentication service with:

- Argon2 password hashing
- Short-lived JWT access tokens
- HTTP-only refresh-token cookies
- Refresh-token rotation and reuse detection
- Protected routes
- Expired refresh-token cleanup

## Requirements

- Node.js 20+
- Docker Desktop
- npm

## Local Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create the local environment file:

   ```bash
   cp .env.example .env
   ```

   On PowerShell, use:

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

- `npm run dev` starts the TypeScript API with `tsx`.
- `npm run build` compiles the API to `dist`.
- `npm start` runs the compiled API.

## Endpoints

### Register

```bash
curl -i -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"StrongPassword123!"}'
```

### Login

Save the refresh-token cookie for later requests:

```bash
curl -i -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email":"test@example.com","password":"StrongPassword123!"}'
```

The response contains an access token. Send it as a bearer token to protected routes:

```bash
curl -i http://localhost:4000/api/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Refresh

```bash
curl -i -X POST http://localhost:4000/api/auth/refresh \
  -b cookies.txt \
  -c cookies.txt
```

### Logout

```bash
curl -i -X POST http://localhost:4000/api/auth/logout \
  -b cookies.txt \
  -c cookies.txt
```

## Database Cleanup

The service periodically deletes refresh tokens after their expiration time. Revoked tokens are retained until expiration so that reuse detection can identify replayed tokens.

Integration tests create uniquely named users and delete each test user in `afterAll`. Deleting the user also removes its refresh tokens through the database foreign-key cascade.

Tests currently use the configured local PostgreSQL database. Use a dedicated test database or test-only credentials before running the suite against a shared environment.

## Security Notes

- Never commit `.env`, credentials, refresh-token cookies, or production secrets.
- Use HTTPS and secure cookies in production.
- Set a strong, unique `ACCESS_TOKEN_SECRET` in every environment.
- Replace the local PostgreSQL credentials before deploying.
