# Genuivo API

Backend API server for the Genuivo application.

**Package**: `genuivo_api` (private, not published)

## Tech Stack

- **Language**: TypeScript
- **Runtime**: Bun
- **Package Manager**: Bun (do not use npm/yarn/pnpm for installing dependencies)
- **Framework**: Hono
- **Database**: PostgreSQL via Drizzle ORM
- **Auth**: Firebase Admin SDK (via @sudobility/auth_service)
- **Test**: Vitest

## Project Structure

```
src/
├── index.ts                        # App entry, Hono setup, port config
├── db/
│   ├── index.ts                    # Lazy DB connection via Proxy pattern
│   └── schema.ts                   # Drizzle schema + raw SQL table creation
├── middleware/
│   └── firebaseAuth.ts             # Firebase token verification middleware
├── routes/
│   ├── index.ts                    # Route aggregator
│   ├── users.ts                    # User routes
│   ├── histories.ts                # CRUD /api/v1/users/:userId/histories
│   └── historiesTotal.ts           # GET /api/v1/histories/total (public)
├── services/
│   └── firebase.ts                 # Firebase Admin initialization
└── lib/
    └── env-helper.ts               # Environment variable helper
```

## Commands

```bash
bun run dev            # Watch mode (bun --watch)
bun run build          # Build (bun build --target bun)
bun run start          # Run built output
bun test               # Run Vitest tests (colocated *.test.ts files)
bun run typecheck      # TypeScript check
bun run lint           # Run ESLint
bun run verify         # All checks + build (use before commit)
```

## API Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/users/:userId/histories` | Required | List user histories |
| POST | `/api/v1/users/:userId/histories` | Required | Create history |
| PUT | `/api/v1/users/:userId/histories/:id` | Required | Update history |
| DELETE | `/api/v1/users/:userId/histories/:id` | Required | Delete history |
| GET | `/api/v1/histories/total` | Public | Get global total |
| GET | `/health` | Public | Health check |

## Database Schema

Schema name: `genuivo`

- **users** — `firebase_uid` (PK), `email`, `display_name`, timestamps
- **histories** — `id` (UUID PK), `user_id` (FK), `datetime`, `value` (numeric), timestamps

Tables are created via raw SQL (no migration files). The DB connection uses a Proxy pattern for lazy initialization.

## Auth Flow

1. Firebase token extracted from `Authorization: Bearer <token>` header
2. Token verified via @sudobility/auth_service (cached)
3. Anonymous users are blocked (403)
4. User auto-created in DB on first authenticated request

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | required |
| `FIREBASE_PROJECT_ID` | Firebase project ID | required |
| `FIREBASE_CLIENT_EMAIL` | Firebase service account email | required |
| `FIREBASE_PRIVATE_KEY` | Firebase service account private key | required |
| `SITEADMIN_EMAILS` | Comma-separated admin emails | optional |
| `PORT` | Server port | `8026` |

## Related Projects

- **genuivo_types** — Shared TypeScript type definitions; this project imports request/response types and helpers from it
- **genuivo_client** — API client SDK that consumes this server's HTTP endpoints
- **genuivo_lib** — Business logic library that uses genuivo_client to talk to this API
- **genuivo_app** — Web frontend that calls this API (both default to port 8026)
- **genuivo_app_rn** — React Native app that calls this API

Uses `@sudobility/auth_service` for Firebase token verification with caching.

## Coding Patterns

- Routes are defined in separate files under `src/routes/` and aggregated in `src/routes/index.ts`
- Firebase auth middleware (`src/middleware/firebaseAuth.ts`) handles token verification with caching via `@sudobility/auth_service`
- DB connection uses a Proxy pattern for lazy initialization (only connects when first queried)
- Database tables are created via raw SQL in `src/db/schema.ts` -- there are no Drizzle migration files
- All API responses must be wrapped in `BaseResponse<T>` using `successResponse()` or `errorResponse()` from `@sudobility/genuivo_types`
- Users are auto-created in the database on their first authenticated request (no separate registration endpoint)
- Route handlers follow the pattern: extract params -> validate -> query DB -> return wrapped response

## Gotchas

- Database tables are created via raw SQL on startup, NOT via Drizzle migrations -- do not create migration files
- The default port is `8026`, matching `genuivo_app`'s default `VITE_API_URL` of `localhost:8026`
- Anonymous Firebase users are blocked with 403 -- only fully authenticated users are allowed
- The `userId` in route paths (`:userId`) is the Firebase UID, not a database-generated ID
- The DB Proxy pattern means connection errors only surface on first actual query, not at startup
- `FIREBASE_PRIVATE_KEY` often needs newline escaping (`\\n` -> `\n`) depending on how it is set in the environment
