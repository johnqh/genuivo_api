# Improvement Plans for @sudobility/starter_api

## Priority 1 - High Impact

### 1. Add Input Validation with Schema Validation Library ✅
- Route handlers in `histories.ts` perform manual validation (e.g., `if (!datetime || value === undefined)`) which is error-prone and inconsistent
- The POST handler checks `typeof value !== "number" || value <= 0` but the PUT handler does the same check only when `body.value !== undefined` -- no validation exists for `datetime` format in either route
- Invalid `datetime` strings like `"not-a-date"` are silently passed to `new Date()` which produces `Invalid Date` objects and can corrupt the database
- Consider using Zod or Hono's built-in validator middleware to enforce request schemas at the route level, leveraging the types already defined in starter_types

**Completed:** Added `isValidDatetime()` validation helper in `src/lib/serializers.ts`. Both POST and PUT handlers in `histories.ts` now validate datetime format before passing to `new Date()`, returning a 400 error for invalid datetime strings. Tests added to cover invalid datetime rejection.

### 2. Add Error Handling Middleware for Unhandled Exceptions ✅
- Route handlers in `histories.ts`, `users.ts`, and `historiesTotal.ts` have no try-catch blocks around database operations
- If a database query fails (connection error, constraint violation, etc.), the error propagates as an unhandled exception and results in a 500 with a stack trace
- The `ensureUserExists` function in the auth middleware uses a fire-and-forget pattern (`ensureUserExists().catch(console.error)`) which means user creation failures are silently logged but not surfaced
- Add a global Hono error handler middleware that catches unhandled exceptions and returns a properly formatted `errorResponse`

**Completed:** Added `app.onError()` global error handler in `src/index.ts` that catches all unhandled exceptions, logs them to stderr, and returns a formatted `errorResponse("Internal server error")` with 500 status. Stack traces are no longer exposed to clients.

### 3. Add JSDoc Documentation to Route Handlers and Middleware ✅
- None of the route handler functions have JSDoc comments documenting expected parameters, request body shape, response format, or error conditions
- The `firebaseAuthMiddleware` function lacks documentation about what context variables it sets (`firebaseUser`, `userId`, `userEmail`, `siteAdmin`)
- The `initDatabase` function lacks documentation about what tables it creates and its idempotent behavior
- The `ensureUserExists` fire-and-forget pattern is undocumented and could surprise future maintainers

**Completed:** Added comprehensive JSDoc to all files:
- `src/routes/histories.ts` — All 4 route handlers (GET, POST, PUT, DELETE) with params, return types, and error conditions
- `src/routes/users.ts` — GET handler with authorization and error docs
- `src/routes/historiesTotal.ts` — GET /total with public endpoint note
- `src/routes/index.ts` — Route aggregator with route structure overview
- `src/middleware/firebaseAuth.ts` — `firebaseAuthMiddleware` with context variables, `ensureUserExists` with fire-and-forget warning, and `ContextVariableMap` declarations
- `src/db/index.ts` — `db` proxy pattern, `initDatabase` tables/idempotency, `closeDatabase`, `getClient`
- `src/db/schema.ts` — Table definitions with column details and index documentation
- `src/services/firebase.ts` — `verifyIdToken`, `cachedVerifier`, `isTestMode`
- `src/index.ts` — Root endpoint, health check, and error handler

## Priority 2 - Medium Impact

### 3. Eliminate Duplicated Response Mapping Logic ✅
- The history-to-JSON mapping logic (converting `datetime` to ISO string, `value` to Number, null-safe `created_at`/`updated_at`) is duplicated across all four route handlers in `histories.ts` (GET list, POST create, PUT update, DELETE)
- The same pattern appears in `users.ts` for the user object
- Extract these into reusable mapper functions (e.g., `serializeHistory(h)`, `serializeUser(u)`) to reduce duplication and ensure consistent serialization

**Completed:** Created `src/lib/serializers.ts` with `serializeHistory()` and `serializeUser()` functions. Updated `histories.ts` (all 4 handlers) and `users.ts` to use these shared serializers. Added comprehensive tests in `src/lib/serializers.test.ts` (11 tests).

### 4. Add Pagination to the GET Histories Endpoint ✅
- The GET `/api/v1/users/:userId/histories` endpoint returns all histories for a user with no pagination
- As users accumulate history entries, this query will become increasingly slow and memory-intensive
- The `histories.ts` GET handler performs a full table scan with `eq(histories.user_id, userId)` with no LIMIT or ORDER BY clause
- Add query parameters for `limit`, `offset`, and `orderBy` (defaulting to `datetime DESC`) to support pagination

**Completed:** GET histories endpoint now supports pagination via query parameters:
- `limit` (default 50, max 200) — number of records per page
- `offset` (default 0) — number of records to skip
- `orderBy` ("asc" | "desc", default "desc") — sort order by datetime
- Query uses `ORDER BY datetime DESC/ASC`, `LIMIT`, and `OFFSET` clauses
- Added 13 pagination tests covering defaults, capping, clamping, and edge cases

## Priority 3 - Nice to Have

### 5. Add Rate Limiting to Public Endpoints
- The `/api/v1/histories/total` endpoint is public (no auth required) and performs a database aggregation (`SUM`) on every request
- Without rate limiting, this endpoint is vulnerable to abuse that could degrade database performance
- The `/health` endpoint is also unauthenticated and could similarly be abused
- Consider adding Hono rate limiting middleware, at minimum for public endpoints

**Skipped:** Requires choosing and configuring a rate limiting middleware and backing store (in-memory vs Redis). Better addressed as a separate task when production traffic patterns are better understood.

### 6. Add Request Logging with Structured Output
- The current logging uses Hono's built-in `logger()` middleware which outputs simple request/response logs
- `console.error` is used directly for error logging (e.g., in `ensureUserExists`, `initDatabase`) with no structured format
- Consider adding a structured logging approach with correlation IDs, request timing, and user identification for better observability in production

**Skipped:** Requires selecting a structured logging library (e.g., pino, winston) and establishing conventions for correlation IDs and log levels. Better addressed as a separate infrastructure task.
