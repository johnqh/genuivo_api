import { Hono } from "hono";
import { eq, and, desc, asc } from "drizzle-orm";
import { db, histories } from "../db";
import {
  successResponse,
  errorResponse,
  type History,
  type HistoryCreateRequest,
  type HistoryUpdateRequest,
} from "@sudobility/genuivo_types";
import { serializeHistory, isValidDatetime } from "../lib/serializers";

const historiesRouter = new Hono();

/** Default number of history records returned per page */
const DEFAULT_LIMIT = 50;

/** Maximum number of history records that can be requested in a single page */
const MAX_LIMIT = 200;

/**
 * GET / - List all histories for the authenticated user.
 *
 * Requires that the requesting user matches the `:userId` route param,
 * or that the requester is a site admin.
 *
 * Supports pagination via query parameters:
 * - `limit` (number, default 50, max 200) - Number of records to return
 * - `offset` (number, default 0) - Number of records to skip
 * - `orderBy` ("asc" | "desc", default "desc") - Sort order by datetime
 *
 * @returns {BaseResponse<History[]>} Paginated list of serialized history records
 *
 * @example
 * GET /api/v1/users/:userId/histories?limit=20&offset=0&orderBy=desc
 */
historiesRouter.get("/", async c => {
  const userId = c.req.param("userId")!;
  const tokenUserId = c.get("userId");

  if (userId !== tokenUserId && !c.get("siteAdmin")) {
    return c.json(errorResponse("Not authorized"), 403);
  }

  // Parse pagination parameters
  const limitParam = c.req.query("limit");
  const offsetParam = c.req.query("offset");
  const orderByParam = c.req.query("orderBy");

  const limit = Math.min(
    Math.max(
      1,
      parseInt(limitParam || String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT
    ),
    MAX_LIMIT
  );
  const offset = Math.max(0, parseInt(offsetParam || "0", 10) || 0);
  const orderDirection = orderByParam === "asc" ? "asc" : "desc";

  const result = await db
    .select()
    .from(histories)
    .where(eq(histories.user_id, userId))
    .orderBy(
      orderDirection === "asc"
        ? asc(histories.datetime)
        : desc(histories.datetime)
    )
    .limit(limit)
    .offset(offset);

  const data: History[] = result.map(serializeHistory);

  return c.json(successResponse(data));
});

/**
 * POST / - Create a new history record for the authenticated user.
 *
 * Requires that the requesting user matches the `:userId` route param,
 * or that the requester is a site admin.
 *
 * @param {HistoryCreateRequest} body - Request body with `datetime` (ISO 8601 string)
 *   and `value` (positive number)
 * @returns {BaseResponse<History>} The newly created history record (HTTP 201)
 *
 * @throws 400 if `datetime` or `value` is missing
 * @throws 400 if `value` is not a positive number
 * @throws 400 if `datetime` is not a valid date string
 * @throws 403 if the user is not authorized
 */
historiesRouter.post("/", async c => {
  const userId = c.req.param("userId")!;
  const tokenUserId = c.get("userId");

  if (userId !== tokenUserId && !c.get("siteAdmin")) {
    return c.json(errorResponse("Not authorized"), 403);
  }

  const body: HistoryCreateRequest = await c.req.json();
  const { datetime, value } = body;

  if (!datetime || value === undefined || value === null) {
    return c.json(errorResponse("datetime and value are required"), 400);
  }

  if (typeof value !== "number" || value <= 0) {
    return c.json(errorResponse("value must be a positive number"), 400);
  }

  if (typeof datetime !== "string" || !isValidDatetime(datetime)) {
    return c.json(
      errorResponse("datetime must be a valid ISO 8601 date string"),
      400
    );
  }

  const result = await db
    .insert(histories)
    .values({
      user_id: userId,
      datetime: new Date(datetime),
      value: String(value),
    })
    .returning();

  const h = result[0];
  return c.json(successResponse(serializeHistory(h)), 201);
});

/**
 * PUT /:historyId - Update an existing history record.
 *
 * Requires that the requesting user matches the `:userId` route param,
 * or that the requester is a site admin. At least one field (`datetime` or `value`)
 * must be provided.
 *
 * @param {HistoryUpdateRequest} body - Request body with optional `datetime` and/or `value`
 * @returns {BaseResponse<History>} The updated history record
 *
 * @throws 400 if no fields are provided to update
 * @throws 400 if `value` is provided but not a positive number
 * @throws 400 if `datetime` is provided but not a valid date string
 * @throws 403 if the user is not authorized
 * @throws 404 if the history record is not found or does not belong to the user
 */
historiesRouter.put("/:historyId", async c => {
  const userId = c.req.param("userId")!;
  const historyId = c.req.param("historyId")!;
  const tokenUserId = c.get("userId");

  if (userId !== tokenUserId && !c.get("siteAdmin")) {
    return c.json(errorResponse("Not authorized"), 403);
  }

  const body: HistoryUpdateRequest = await c.req.json();
  const updates: Record<string, unknown> = {};

  if (body.datetime !== undefined) {
    if (typeof body.datetime !== "string" || !isValidDatetime(body.datetime)) {
      return c.json(
        errorResponse("datetime must be a valid ISO 8601 date string"),
        400
      );
    }
    updates.datetime = new Date(body.datetime);
  }
  if (body.value !== undefined) {
    if (typeof body.value !== "number" || body.value <= 0) {
      return c.json(errorResponse("value must be a positive number"), 400);
    }
    updates.value = String(body.value);
  }

  if (Object.keys(updates).length === 0) {
    return c.json(errorResponse("No fields to update"), 400);
  }

  updates.updated_at = new Date();

  const result = await db
    .update(histories)
    .set(updates)
    .where(and(eq(histories.id, historyId), eq(histories.user_id, userId)))
    .returning();

  if (result.length === 0) {
    return c.json(errorResponse("History not found"), 404);
  }

  const h = result[0];
  return c.json(successResponse(serializeHistory(h)));
});

/**
 * DELETE /:historyId - Delete a history record.
 *
 * Requires that the requesting user matches the `:userId` route param,
 * or that the requester is a site admin.
 *
 * @returns {BaseResponse<null>} Success response with null data
 *
 * @throws 403 if the user is not authorized
 * @throws 404 if the history record is not found or does not belong to the user
 */
historiesRouter.delete("/:historyId", async c => {
  const userId = c.req.param("userId")!;
  const historyId = c.req.param("historyId")!;
  const tokenUserId = c.get("userId");

  if (userId !== tokenUserId && !c.get("siteAdmin")) {
    return c.json(errorResponse("Not authorized"), 403);
  }

  const result = await db
    .delete(histories)
    .where(and(eq(histories.id, historyId), eq(histories.user_id, userId)))
    .returning();

  if (result.length === 0) {
    return c.json(errorResponse("History not found"), 404);
  }

  return c.json(successResponse<null>(null));
});

export default historiesRouter;
