# starter_api

Backend API server for the Starter application. Built with Hono, PostgreSQL, and Drizzle ORM.

## Setup

```bash
bun install
cp .env.example .env   # Configure environment variables
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | required |
| `FIREBASE_PROJECT_ID` | Firebase project ID | required |
| `FIREBASE_CLIENT_EMAIL` | Firebase service account email | required |
| `FIREBASE_PRIVATE_KEY` | Firebase service account private key | required |
| `SITEADMIN_EMAILS` | Comma-separated admin emails | optional |
| `SHAPESHYFT_API_URL` | ShapeShyft chat endpoint | required for chat |
| `SHAPESHYFT_API_KEY` | ShapeShyft API key | required for chat |
| `SHAPESHYFT_TIMEOUT_MS` | Upstream chat timeout in milliseconds | `120000` |
| `PORT` | Server port | `8026` |

Note: `FIREBASE_PRIVATE_KEY` often needs newline escaping (`\\n` -> `\n`) depending on your environment.

## Running

```bash
bun run dev            # Watch mode (bun --watch)
bun run build          # Build for production
bun run start          # Run built output
```

## Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/users/:userId/histories` | Required | List user histories |
| POST | `/api/v1/users/:userId/histories` | Required | Create history |
| PUT | `/api/v1/users/:userId/histories/:id` | Required | Update history |
| DELETE | `/api/v1/users/:userId/histories/:id` | Required | Delete history |
| GET | `/api/v1/histories/total` | Public | Get global total |
| GET | `/health` | Public | Health check |

## Development

```bash
bun run dev            # Watch mode
bun run build          # Build (bun build --target bun)
bun run start          # Run built output
bun test               # Run Vitest tests
bun run typecheck      # TypeScript check
bun run lint           # ESLint
bun run verify         # All checks + build (use before commit)
```

## Architecture

- **Auth**: Firebase Admin SDK via `@sudobility/auth_service` (token verification with caching). Anonymous users are blocked (403). Users are auto-created in DB on first authenticated request.
- **Database**: PostgreSQL with Drizzle ORM. Schema `starter` with `users` and `histories` tables. Tables created via raw SQL on startup (no migration files).
- **DB connection**: Lazy initialization via Proxy pattern (connects on first query, not at startup).

## Related Packages

- **starter_types** -- Shared type definitions (request/response types)
- **starter_client** -- API client SDK that consumes this server's endpoints
- **starter_lib** -- Business logic library (talks to this API via starter_client)
- **starter_app** -- Web frontend
- **starter_app_rn** -- React Native mobile app

## License

See package.json (private, not published).
