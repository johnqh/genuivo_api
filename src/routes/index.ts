import { Hono } from "hono";
import { firebaseAuthMiddleware } from "../middleware/firebaseAuth";
import usersRouter from "./users";
import historiesRouter from "./histories";
import historiesTotalRouter from "./historiesTotal";
import chatRouter from "./chat";

/**
 * Aggregated API routes for the `/api/v1` prefix.
 *
 * Route structure:
 * - **Public** (no auth): `/histories/total` - Global history total
 * - **Public** (optional auth): `/chat` - Chat (web search enabled for authenticated users)
 * - **Authenticated**: `/users/:userId` - User profile
 * - **Authenticated**: `/users/:userId/histories` - User history CRUD with pagination
 *
 * The Firebase auth middleware is applied to all authenticated routes,
 * setting context variables (`firebaseUser`, `userId`, `userEmail`, `siteAdmin`)
 * for downstream handlers.
 */
const routes = new Hono();

// Public routes (no auth required)
routes.route("/histories", historiesTotalRouter);
routes.route("/chat", chatRouter);

// Auth-required routes
const authRoutes = new Hono();
authRoutes.use("*", firebaseAuthMiddleware);
authRoutes.route("/users/:userId", usersRouter);
authRoutes.route("/users/:userId/histories", historiesRouter);
routes.route("/", authRoutes);

export default routes;
