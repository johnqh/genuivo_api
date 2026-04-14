import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { db, users } from "../db";
import { successResponse, errorResponse } from "@sudobility/genuivo_types";
import { serializeUser } from "../lib/serializers";

const usersRouter = new Hono();

/**
 * GET / - Get user profile information.
 *
 * Returns the authenticated user's profile. The requesting user must match
 * the `:userId` route param, or be a site admin.
 *
 * The `:userId` param is the user's Firebase UID (not a database-generated ID).
 * Note: this route is mounted at `/api/v1/users/:userId`, so the handler's
 * path is `/` relative to that mount point. The `:userId` param is inherited
 * from the parent route.
 *
 * @returns {BaseResponse<User>} The serialized user profile
 *
 * @throws 403 if the requesting user is not authorized to view this profile
 * @throws 404 if no user record exists for the given Firebase UID
 */
usersRouter.get("/:userId", async c => {
  const userId = c.req.param("userId");
  const tokenUserId = c.get("userId");

  if (userId !== tokenUserId && !c.get("siteAdmin")) {
    return c.json(errorResponse("Not authorized to view this user"), 403);
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.firebase_uid, userId));

  if (result.length === 0) {
    return c.json(errorResponse("User not found"), 404);
  }

  return c.json(successResponse(serializeUser(result[0])));
});

export default usersRouter;
