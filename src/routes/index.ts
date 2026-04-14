import { Hono } from "hono";
import { firebaseAuthMiddleware } from "../middleware/firebaseAuth";
import usersRouter from "./users";
import historiesRouter from "./histories";
import historiesTotalRouter from "./historiesTotal";

/**
 * Aggregated API routes for the `/api/v1` prefix.
 *
 * Route structure:
 * - **Public** (no auth): `/histories/total` - Global history total
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

// Auth-required routes
const authRoutes = new Hono();
authRoutes.use("*", firebaseAuthMiddleware);
authRoutes.route("/users/:userId", usersRouter);
authRoutes.route("/users/:userId/histories", historiesRouter);
routes.route("/", authRoutes);

export default routes;
