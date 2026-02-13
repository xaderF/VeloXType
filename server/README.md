# VeloXType Server (Phase 2 foundation)

## Setup

1) Install deps
```
cd server
npm install
```

2) Env
- Create a `.env` file in the project root and fill values.
- Used vars:
  - `PORT` (default 4000)
  - `DATABASE_URL` (Postgres)
  - `AUTH_SECRET` (required, min 32 chars)
  - `CORS_ORIGIN` (required in production; comma-separated allowed origins)
  - `ADMIN_USERNAMES` (optional; comma-separated usernames that should be admin)
  - `OAUTH_GOOGLE_CLIENT_ID` (optional; required only if using Google OAuth login)
  - `DAILY_RESET_TIMEZONE` (IANA tz for daily challenge rollover, default `America/New_York`)

3) Run
```
npm run dev
```

4) Prisma (database schema)
- Update `DATABASE_URL` in the root `.env` to point to Postgres.
- Run migrations: `npm run prisma:migrate -- --name init`
- Generate client: `npm run prisma:generate`

## Endpoints (current)
- GET /health — health check
- POST /auth/register — create account with username/password
- POST /auth/login — login with username/email + password
- POST /auth/oauth — OAuth-style identity login/link
- PATCH /admin/users/:userId/role — admin-only role update (`ADMIN` / `USER`)
- GET /profile — fetch authenticated profile
- PATCH /profile — update username/email/settings
- GET /matches — list authenticated match history
- GET /matches/:matchId — match details for authenticated player
- WS /ws/matchmaking — in-memory queue + MATCH_FOUND payloads
- WS /ws/match — live match updates (join/progress/result)

## Notes
- Server uses Fastify + @fastify/websocket.
- `env.ts` validates env vars with zod.
- Matchmaking pairs by rating, widening search range over time; sends `MATCH_FOUND` with matchId, seed, config, startAt.
- Auth uses signed bearer tokens with `AUTH_SECRET` (no fallback secret).
- If `DATABASE_URL` is set and migrations are applied, user/profile/match data is persisted via Prisma.

## Round Score / Damage Reference

For online rounds, server computes a normalized `roundScore` in `0..100`:

- `damage = max(0, scoreA - scoreB)`
- max round damage is `70`
- score `100` means `100% accuracy` and `WPM >= (rank max + 10)`

| Rank | MMR Range | Max WPM | WPM for score 100 |
|---|---:|---:|---:|
| Iron | 0-299 | 43 | 53 |
| Bronze | 300-599 | 51 | 61 |
| Silver | 600-899 | 59 | 69 |
| Gold | 900-1199 | 67 | 77 |
| Platinum | 1200-1499 | 75 | 85 |
| Diamond | 1500-1799 | 85 | 95 |
| Velocity | 1800-2099 | 97 | 107 |
| Apex | 2100-2399 | 110 | 120 |
| Paragon | 2400+ | 125 | 135 |
