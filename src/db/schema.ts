import {
  pgSchema,
  uuid,
  varchar,
  timestamp,
  numeric,
  index,
} from "drizzle-orm/pg-core";

/**
 * The `starter` PostgreSQL schema.
 *
 * All tables for the Starter application are created under this schema
 * to isolate them from other applications sharing the same database.
 */
export const starterSchema = pgSchema("genuivo");

// =============================================================================
// Users Table
// =============================================================================

/**
 * Drizzle ORM definition for the `starter.users` table.
 *
 * Stores user accounts keyed by Firebase Authentication UID.
 * Users are auto-created on their first authenticated API request
 * (see {@link firebaseAuthMiddleware}).
 *
 * Columns:
 * - `firebase_uid` (VARCHAR 128, PK) - Firebase Authentication UID
 * - `email` (VARCHAR 255, nullable) - User's email address
 * - `display_name` (VARCHAR 255, nullable) - User's display name
 * - `created_at` (TIMESTAMP, default NOW()) - Record creation time
 * - `updated_at` (TIMESTAMP, default NOW()) - Last update time
 */
export const users = starterSchema.table("users", {
  firebase_uid: varchar("firebase_uid", { length: 128 }).primaryKey(),
  email: varchar("email", { length: 255 }),
  display_name: varchar("display_name", { length: 255 }),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// =============================================================================
// Histories Table
// =============================================================================

/**
 * Drizzle ORM definition for the `starter.histories` table.
 *
 * Stores historical data points associated with users. Each record has a
 * datetime and a numeric value. Records are cascade-deleted when their
 * parent user is deleted.
 *
 * Columns:
 * - `id` (UUID, PK, auto-generated) - Unique record identifier
 * - `user_id` (VARCHAR 128, FK -> users.firebase_uid, NOT NULL) - Owning user
 * - `datetime` (TIMESTAMP, NOT NULL) - When the event occurred
 * - `value` (NUMERIC 12,2, NOT NULL) - Numeric value for the record
 * - `created_at` (TIMESTAMP, default NOW()) - Record creation time
 * - `updated_at` (TIMESTAMP, default NOW()) - Last update time
 *
 * Indexes:
 * - `genuivo_histories_user_idx` on `user_id` for efficient user-scoped queries
 */
export const histories = starterSchema.table(
  "histories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    user_id: varchar("user_id", { length: 128 })
      .notNull()
      .references(() => users.firebase_uid, { onDelete: "cascade" }),
    datetime: timestamp("datetime").notNull(),
    value: numeric("value", { precision: 12, scale: 2 }).notNull(),
    created_at: timestamp("created_at").defaultNow(),
    updated_at: timestamp("updated_at").defaultNow(),
  },
  table => ({
    userIdx: index("genuivo_histories_user_idx").on(table.user_id),
  })
);
