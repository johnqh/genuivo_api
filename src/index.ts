import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { initDatabase } from "./db";
import routes from "./routes";
import {
  successResponse,
  errorResponse,
  type ApiInfoResponse,
  type HealthResponse,
} from "@sudobility/genuivo_types";
import { getEnv } from "./lib/env-helper";

const app = new Hono();

app.use("*", logger());
app.use("*", cors());

/**
 * Global error handler for unhandled exceptions.
 *
 * Catches any errors that propagate from route handlers or middleware
 * (e.g., database connection failures, constraint violations, unexpected runtime errors)
 * and returns a properly formatted `errorResponse` with a 500 status code.
 *
 * This prevents raw stack traces from being exposed in production responses.
 * The original error is logged to stderr for debugging purposes.
 */
app.onError((err, c) => {
  console.error("Unhandled error:", err);
  return c.json(errorResponse("Internal server error"), 500);
});

/**
 * GET / - Root endpoint returning API metadata.
 *
 * Public endpoint that returns the API name, version, and health status.
 * Useful for service discovery and basic connectivity checks.
 */
app.get("/", c => {
  const data: ApiInfoResponse = {
    name: "Starter API",
    version: "1.0.0",
    status: "healthy",
  };
  return c.json(successResponse(data));
});

/**
 * GET /health - Health check endpoint.
 *
 * Public endpoint that returns a simple health status.
 * Used by load balancers, container orchestrators, and monitoring systems
 * to determine if the service is running.
 */
app.get("/health", c => {
  const data: HealthResponse = { status: "ok", version: "1.0.0" };
  return c.json(successResponse(data));
});

app.route("/api/v1", routes);

const port = parseInt(getEnv("PORT", "8026")!);

initDatabase()
  .then(() => {
    console.warn(`Starter API running on http://localhost:${port}`);
  })
  .catch(err => {
    console.error("Failed to initialize database:", err);
    process.exit(1);
  });

export default {
  port,
  fetch: app.fetch,
};

export { app };
