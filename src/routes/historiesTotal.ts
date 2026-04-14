import { Hono } from "hono";
import { sql } from "drizzle-orm";
import { db, histories } from "../db";
import {
  successResponse,
  type HistoryTotalResponse,
} from "@sudobility/genuivo_types";

const historiesTotalRouter = new Hono();

/**
 * GET /total - Get the global total of all history values.
 *
 * This is a **public** endpoint (no authentication required).
 * It aggregates the sum of all `value` fields across all history records
 * in the database using a SQL `SUM` aggregation.
 *
 * Returns 0 if no history records exist (via `COALESCE`).
 *
 * @returns {BaseResponse<HistoryTotalResponse>} Object with a `total` number field
 */
historiesTotalRouter.get("/total", async c => {
  const result = await db
    .select({
      total: sql<string>`COALESCE(SUM(${histories.value}), 0)`,
    })
    .from(histories);

  const total = Number(result[0].total);
  const data: HistoryTotalResponse = { total };
  return c.json(successResponse(data));
});

export default historiesTotalRouter;
