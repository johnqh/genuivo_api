import type { Context, Next } from "hono";
import type { DecodedIdToken } from "firebase-admin/auth";
import { isSiteAdmin, isAnonymousUser } from "@sudobility/auth_service";
import { verifyIdToken } from "../services/firebase";
import { errorResponse } from "@sudobility/genuivo_types";
import { eq } from "drizzle-orm";
import { db, users } from "../db";

declare module "hono" {
  interface ContextVariableMap {
    /** The full decoded Firebase ID token */
    firebaseUser: DecodedIdToken;
    /** The Firebase UID of the authenticated user */
    userId: string;
    /** The email address of the authenticated user, or null if not available */
    userEmail: string | null;
    /** Whether the authenticated user is a site admin (based on SITEADMIN_EMAILS) */
    siteAdmin: boolean;
  }
}

/**
 * Ensures a user record exists in the database for the given Firebase UID.
 *
 * Checks if a row exists in the `starter.users` table matching the provided
 * Firebase UID. If not, inserts a new row with the UID and email.
 *
 * This function is called in a fire-and-forget pattern from the auth middleware
 * (via `.catch(console.error)`), so failures are logged but do not block the request.
 * This means the first request from a new user may succeed even if user creation
 * fails -- subsequent database queries that require the user FK will fail instead.
 *
 * @param firebaseUid - The Firebase UID to look up or create
 * @param email - The user's email address (optional, may be null for some auth providers)
 */
async function ensureUserExists(
  firebaseUid: string,
  email?: string | null
): Promise<void> {
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.firebase_uid, firebaseUid));

  if (existing.length === 0) {
    await db.insert(users).values({
      firebase_uid: firebaseUid,
      email: email ?? null,
    });
  }
}

/**
 * Hono middleware that verifies Firebase Authentication tokens.
 *
 * Extracts a Bearer token from the `Authorization` header, verifies it via
 * Firebase Admin SDK (with caching provided by `@sudobility/auth_service`),
 * and sets the following context variables for downstream handlers:
 *
 * - `firebaseUser` — The full decoded Firebase ID token ({@link DecodedIdToken})
 * - `userId` — The Firebase UID string
 * - `userEmail` — The user's email (string or null)
 * - `siteAdmin` — Boolean indicating whether the user is a site admin
 *
 * Additionally, triggers a fire-and-forget call to {@link ensureUserExists}
 * to auto-create a database user record on first authenticated request.
 *
 * Anonymous Firebase users are explicitly blocked with a 403 response.
 *
 * @param c - The Hono request context
 * @param next - The next middleware/handler function
 * @returns A 401 response if the token is missing, malformed, or invalid;
 *          a 403 response if the user is anonymous; otherwise proceeds to next handler
 */
export async function firebaseAuthMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");

  if (!authHeader) {
    return c.json(errorResponse("Authorization header required"), 401);
  }

  const [type, token] = authHeader.split(" ");

  if (type !== "Bearer" || !token) {
    return c.json(
      errorResponse("Invalid authorization format. Use: Bearer <token>"),
      401
    );
  }

  try {
    const decodedToken = await verifyIdToken(token);

    if (isAnonymousUser(decodedToken)) {
      return c.json(
        errorResponse("Anonymous users cannot access this resource"),
        403
      );
    }

    const userId = decodedToken.uid;
    const userEmail = decodedToken.email ?? null;

    c.set("firebaseUser", decodedToken);
    c.set("userId", userId);
    c.set("userEmail", userEmail);
    c.set("siteAdmin", isSiteAdmin(userEmail));

    ensureUserExists(userId, userEmail).catch(err =>
      console.error("Failed to ensure user exists:", err)
    );

    await next();
  } catch {
    return c.json(errorResponse("Invalid or expired Firebase token"), 401);
  }
}
