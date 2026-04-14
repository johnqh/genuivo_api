import { Hono } from "hono";
import {
  successResponse,
  errorResponse,
  type ChatRequest,
} from "@sudobility/genuivo_types";
import { getEnv } from "../lib/env-helper";

const chatRouter = new Hono();

/**
 * POST / - Send a chat request to ShapeShyft and return the GenUI response.
 *
 * Proxies the request to the ShapeShyft AI endpoint using the server-side
 * API key. The client never sees the ShapeShyft credentials.
 *
 * @returns {BaseResponse<ChatResponse>} The GenUI IRenderable output
 */
chatRouter.post("/", async c => {
  const userId = c.req.param("userId")!;
  const tokenUserId = c.get("userId");

  if (userId !== tokenUserId && !c.get("siteAdmin")) {
    return c.json(errorResponse("Not authorized"), 403);
  }

  const shapeshyftUrl = getEnv("SHAPESHYFT_API_URL");
  const shapeshyftKey = getEnv("SHAPESHYFT_API_KEY");

  if (!shapeshyftUrl || !shapeshyftKey) {
    return c.json(errorResponse("Chat service not configured"), 503);
  }

  let body: ChatRequest;
  try {
    body = await c.req.json<ChatRequest>();
  } catch {
    return c.json(errorResponse("Invalid JSON body"), 400);
  }

  if (!body.request || typeof body.request !== "string") {
    return c.json(errorResponse("Missing required field: request"), 400);
  }

  try {
    const url = `${shapeshyftUrl}?api_key=${encodeURIComponent(shapeshyftKey)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ request: body.request }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`ShapeShyft error ${res.status}: ${text}`);
      return c.json(errorResponse(`AI service error: ${res.status}`), 502);
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
    console.error("ShapeShyft request failed:", err);
    return c.json(errorResponse("Failed to reach AI service"), 502);
  }
});

export default chatRouter;
