import { describe, it, expect } from "vitest";
import {
  serializeHistory,
  serializeUser,
  isValidDatetime,
} from "./serializers";

describe("serializers", () => {
  describe("serializeHistory", () => {
    it("should serialize a full history row", () => {
      const row = {
        id: "uuid-1",
        user_id: "user-1",
        datetime: new Date("2024-01-15T10:30:00.000Z"),
        value: "42.50",
        created_at: new Date("2024-01-15T10:30:00.000Z"),
        updated_at: new Date("2024-01-15T11:00:00.000Z"),
      };

      const result = serializeHistory(row);

      expect(result.id).toBe("uuid-1");
      expect(result.user_id).toBe("user-1");
      expect(result.datetime).toBe("2024-01-15T10:30:00.000Z");
      expect(result.value).toBe(42.5);
      expect(result.created_at).toBe("2024-01-15T10:30:00.000Z");
      expect(result.updated_at).toBe("2024-01-15T11:00:00.000Z");
    });

    it("should handle null created_at and updated_at", () => {
      const row = {
        id: "uuid-2",
        user_id: "user-2",
        datetime: new Date("2024-06-01T00:00:00.000Z"),
        value: "100.00",
        created_at: null,
        updated_at: null,
      };

      const result = serializeHistory(row);

      expect(result.created_at).toBeNull();
      expect(result.updated_at).toBeNull();
    });

    it("should convert string value to number", () => {
      const row = {
        id: "uuid-3",
        user_id: "user-3",
        datetime: new Date("2024-01-01T00:00:00.000Z"),
        value: "0.01",
        created_at: null,
        updated_at: null,
      };

      const result = serializeHistory(row);

      expect(result.value).toBe(0.01);
      expect(typeof result.value).toBe("number");
    });
  });

  describe("serializeUser", () => {
    it("should serialize a full user row", () => {
      const row = {
        firebase_uid: "uid-123",
        email: "test@example.com",
        display_name: "Test User",
        created_at: new Date("2024-01-01T00:00:00.000Z"),
        updated_at: new Date("2024-06-01T00:00:00.000Z"),
      };

      const result = serializeUser(row);

      expect(result.firebase_uid).toBe("uid-123");
      expect(result.email).toBe("test@example.com");
      expect(result.display_name).toBe("Test User");
      expect(result.created_at).toBe("2024-01-01T00:00:00.000Z");
      expect(result.updated_at).toBe("2024-06-01T00:00:00.000Z");
    });

    it("should handle null fields", () => {
      const row = {
        firebase_uid: "uid-456",
        email: null,
        display_name: null,
        created_at: null,
        updated_at: null,
      };

      const result = serializeUser(row);

      expect(result.email).toBeNull();
      expect(result.display_name).toBeNull();
      expect(result.created_at).toBeNull();
      expect(result.updated_at).toBeNull();
    });
  });

  describe("isValidDatetime", () => {
    it("should accept valid ISO 8601 datetime", () => {
      expect(isValidDatetime("2024-01-15T10:30:00.000Z")).toBe(true);
    });

    it("should accept valid date-only string", () => {
      expect(isValidDatetime("2024-01-15")).toBe(true);
    });

    it("should accept valid datetime without Z suffix", () => {
      expect(isValidDatetime("2024-01-15T10:30:00")).toBe(true);
    });

    it("should reject invalid date string", () => {
      expect(isValidDatetime("not-a-date")).toBe(false);
    });

    it("should reject empty string", () => {
      expect(isValidDatetime("")).toBe(false);
    });

    it("should reject random text", () => {
      expect(isValidDatetime("hello world")).toBe(false);
    });
  });
});
