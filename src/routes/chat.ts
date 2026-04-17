import { Hono } from "hono";
import {
  successResponse,
  errorResponse,
  type ChatRequest,
} from "@sudobility/genuivo_types";
import { getEnv } from "../lib/env-helper";
import { verifyIdToken } from "../services/firebase";

const chatRouter = new Hono();
const DEFAULT_CHAT_TIMEOUT_MS = 120000;

type ShapeShyftErrorResponse = {
  success?: boolean;
  error?: string;
  details?: unknown;
  timestamp?: string;
};

/**
 * Check if the request has a valid Firebase auth token.
 * Returns true if authenticated, false if not. Does not reject.
 */
async function isAuthenticated(c: any): Promise<boolean> {
  const authHeader = c.req.header("Authorization");
  if (!authHeader) return false;

  const [type, token] = authHeader.split(" ");
  if (type !== "Bearer" || !token) return false;

  try {
    await verifyIdToken(token);
    return true;
  } catch {
    return false;
  }
}

/**
 * POST / - Chat request. Web search is enabled for authenticated users only.
 */
chatRouter.post("/", async c => {
  let body: ChatRequest;
  try {
    body = await c.req.json<ChatRequest>();
  } catch {
    return c.json(errorResponse("Invalid JSON body"), 400);
  }

  if (!body.request || typeof body.request !== "string") {
    return c.json(errorResponse("Missing required field: request"), 400);
  }

  const shapeshyftUrl = getEnv("SHAPESHYFT_API_URL");
  const shapeshyftKey = getEnv("SHAPESHYFT_API_KEY");
  const shapeshyftTimeoutMs = Number.parseInt(
    getEnv("SHAPESHYFT_TIMEOUT_MS", `${DEFAULT_CHAT_TIMEOUT_MS}`)!,
    10
  );

  if (!shapeshyftUrl || !shapeshyftKey) {
    return c.json(errorResponse("Chat service not configured"), 503);
  }

  const webSearch = await isAuthenticated(c);

  try {
    const url = `${shapeshyftUrl}?api_key=${encodeURIComponent(shapeshyftKey)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ request: body.request, web_search: webSearch }),
      signal: AbortSignal.timeout(
        Number.isFinite(shapeshyftTimeoutMs) && shapeshyftTimeoutMs > 0
          ? shapeshyftTimeoutMs
          : DEFAULT_CHAT_TIMEOUT_MS
      ),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`ShapeShyft error ${res.status}: ${text}`);

      try {
        const json = JSON.parse(text) as ShapeShyftErrorResponse;
        return c.json(
          {
            ...errorResponse(json.error ?? `AI service error: ${res.status}`),
            details: json.details,
            upstream_status: res.status,
            upstream_timestamp: json.timestamp,
          },
          502
        );
      } catch {
        return c.json(
          {
            ...errorResponse(`AI service error: ${res.status}`),
            details: { raw: text },
            upstream_status: res.status,
          },
          502
        );
      }
    }

    const json = (await res.json()) as {
      success: boolean;
      data?: { output: unknown };
      error?: string;
    };
    if (!json.success) {
      return c.json(
        errorResponse(json.error ?? "AI service returned an error"),
        502
      );
    }

    return c.json(successResponse({ output: json.data?.output }));
  } catch (err) {
    if (err instanceof Error && err.name === "TimeoutError") {
      console.error(
        `ShapeShyft request timed out after ${shapeshyftTimeoutMs}ms`
      );
      return c.json(errorResponse("AI service timed out"), 504);
    }

    console.error("ShapeShyft request failed:", err);
    return c.json(errorResponse("Failed to reach AI service"), 502);
  }
});

export default chatRouter;
