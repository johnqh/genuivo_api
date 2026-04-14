import type { History, User } from "@sudobility/genuivo_types";

/**
 * Serializes a raw database history row into the API response format.
 *
 * Converts database-native types to their JSON-safe equivalents:
 * - `datetime` (Date) -> ISO 8601 string
 * - `value` (numeric/string from Drizzle) -> JavaScript number
 * - `created_at` / `updated_at` (nullable Date) -> ISO 8601 string or null
 *
 * @param h - A raw history row from the database (Drizzle select result)
 * @returns A serialized {@link History} object safe for JSON responses
 */
export function serializeHistory(h: {
  id: string;
  user_id: string;
  datetime: Date;
  value: string;
  created_at: Date | null;
  updated_at: Date | null;
}): History {
  return {
    id: h.id,
    user_id: h.user_id,
    datetime: h.datetime.toISOString(),
    value: Number(h.value),
    created_at: h.created_at?.toISOString() ?? null,
    updated_at: h.updated_at?.toISOString() ?? null,
  };
}

/**
 * Serializes a raw database user row into the API response format.
 *
 * Converts database-native types to their JSON-safe equivalents:
 * - `created_at` / `updated_at` (nullable Date) -> ISO 8601 string or null
 *
 * @param u - A raw user row from the database (Drizzle select result)
 * @returns A serialized {@link User} object safe for JSON responses
 */
export function serializeUser(u: {
  firebase_uid: string;
  email: string | null;
  display_name: string | null;
  created_at: Date | null;
  updated_at: Date | null;
}): User {
  return {
    firebase_uid: u.firebase_uid,
    email: u.email,
    display_name: u.display_name,
    created_at: u.created_at?.toISOString() ?? null,
    updated_at: u.updated_at?.toISOString() ?? null,
  };
}

/**
 * Validates that a datetime string is a parseable date.
 *
 * Uses `new Date()` to parse the string and checks that the result is a valid date
 * (not `NaN`). This prevents corrupt data from being inserted into the database
 * when users pass strings like `"not-a-date"`.
 *
 * @param datetime - The datetime string to validate
 * @returns `true` if the string can be parsed into a valid Date, `false` otherwise
 */
export function isValidDatetime(datetime: string): boolean {
  const date = new Date(datetime);
  return !isNaN(date.getTime());
}
