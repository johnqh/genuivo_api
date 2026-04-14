import { describe, it, expect } from "vitest";
import { users, histories, starterSchema } from "./schema";

describe("Database Schema", () => {
  describe("starterSchema", () => {
    it("should use 'genuivo' schema name", () => {
      expect(starterSchema.schemaName).toBe("genuivo");
    });
  });

  describe("users table", () => {
    it("should have firebase_uid as primary key", () => {
      const columns = users[Symbol.for("drizzle:Columns") as any] as any;
      expect(columns.firebase_uid).toBeDefined();
      expect(columns.firebase_uid.primary).toBe(true);
    });

    it("should have expected column names", () => {
      const columns = users[Symbol.for("drizzle:Columns") as any] as any;
      expect(columns.firebase_uid).toBeDefined();
      expect(columns.email).toBeDefined();
      expect(columns.display_name).toBeDefined();
      expect(columns.created_at).toBeDefined();
      expect(columns.updated_at).toBeDefined();
    });
  });

  describe("histories table", () => {
    it("should have id as primary key", () => {
      const columns = histories[Symbol.for("drizzle:Columns") as any] as any;
      expect(columns.id).toBeDefined();
      expect(columns.id.primary).toBe(true);
    });

    it("should have expected column names", () => {
      const columns = histories[Symbol.for("drizzle:Columns") as any] as any;
      expect(columns.id).toBeDefined();
      expect(columns.user_id).toBeDefined();
      expect(columns.datetime).toBeDefined();
      expect(columns.value).toBeDefined();
      expect(columns.created_at).toBeDefined();
      expect(columns.updated_at).toBeDefined();
    });

    it("should have user_id as not null", () => {
      const columns = histories[Symbol.for("drizzle:Columns") as any] as any;
      expect(columns.user_id.notNull).toBe(true);
    });

    it("should have datetime as not null", () => {
      const columns = histories[Symbol.for("drizzle:Columns") as any] as any;
      expect(columns.datetime.notNull).toBe(true);
    });

    it("should have value as not null", () => {
      const columns = histories[Symbol.for("drizzle:Columns") as any] as any;
      expect(columns.value.notNull).toBe(true);
    });
  });
});
