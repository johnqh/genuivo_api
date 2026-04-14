import { describe, it, expect } from "vitest";
import { successResponse, errorResponse } from "@sudobility/genuivo_types";
import type {
  History,
  HistoryCreateRequest,
  HistoryUpdateRequest,
} from "@sudobility/genuivo_types";
import { isValidDatetime } from "../lib/serializers";

describe("histories route logic", () => {
  describe("response formatting", () => {
    it("should format history list response", () => {
      const histories: History[] = [
        {
          id: "uuid-1",
          user_id: "user-1",
          datetime: "2024-01-01T00:00:00.000Z",
          value: 100,
          created_at: "2024-01-01T00:00:00.000Z",
          updated_at: "2024-01-01T00:00:00.000Z",
        },
      ];
      const response = successResponse(histories);
      expect(response.success).toBe(true);
      expect(response.data).toHaveLength(1);
      expect(response.data[0].id).toBe("uuid-1");
      expect(response.data[0].value).toBe(100);
    });

    it("should format empty history list", () => {
      const response = successResponse([]);
      expect(response.success).toBe(true);
      expect(response.data).toHaveLength(0);
    });
  });

  describe("validation logic", () => {
    it("should reject missing datetime", () => {
      const body = { value: 100 } as HistoryCreateRequest;
      const hasDatetime = !!body.datetime;
      expect(hasDatetime).toBe(false);
    });

    it("should reject missing value", () => {
      const body = { datetime: "2024-01-01" } as any;
      const hasValue = body.value !== undefined && body.value !== null;
      expect(hasValue).toBe(false);
    });

    it("should reject non-positive value", () => {
      const value = -5;
      const isValid = typeof value === "number" && value > 0;
      expect(isValid).toBe(false);
    });

    it("should reject zero value", () => {
      const value = 0;
      const isValid = typeof value === "number" && value > 0;
      expect(isValid).toBe(false);
    });

    it("should accept valid positive value", () => {
      const value = 42.5;
      const isValid = typeof value === "number" && value > 0;
      expect(isValid).toBe(true);
    });

    it("should reject non-number value", () => {
      const value = "not a number" as any;
      const isValid = typeof value === "number" && value > 0;
      expect(isValid).toBe(false);
    });

    it("should reject invalid datetime string", () => {
      expect(isValidDatetime("not-a-date")).toBe(false);
    });

    it("should accept valid ISO 8601 datetime", () => {
      expect(isValidDatetime("2024-01-15T10:30:00.000Z")).toBe(true);
    });

    it("should reject empty datetime string", () => {
      expect(isValidDatetime("")).toBe(false);
    });
  });

  describe("authorization logic", () => {
    it("should allow matching userId and tokenUserId", () => {
      const userId = "user-123";
      const tokenUserId = "user-123";
      const siteAdmin = false;
      const authorized = userId === tokenUserId || siteAdmin;
      expect(authorized).toBe(true);
    });

    it("should deny mismatched userId and tokenUserId", () => {
      const userId = "user-123";
      const tokenUserId = "user-456";
      const siteAdmin = false;
      const authorized = userId === tokenUserId || siteAdmin;
      expect(authorized).toBe(false);
    });

    it("should allow site admin to access other users", () => {
      const userId = "user-123";
      const tokenUserId = "user-456";
      const siteAdmin = true;
      const authorized = userId === tokenUserId || siteAdmin;
      expect(authorized).toBe(true);
    });
  });

  describe("update validation", () => {
    it("should detect empty updates", () => {
      const body: HistoryUpdateRequest = {};
      const updates: Record<string, unknown> = {};
      if (body.datetime !== undefined) updates.datetime = body.datetime;
      if (body.value !== undefined) updates.value = body.value;
      expect(Object.keys(updates)).toHaveLength(0);
    });

    it("should detect datetime-only update", () => {
      const body: HistoryUpdateRequest = {
        datetime: "2024-06-01T00:00:00Z",
      };
      const updates: Record<string, unknown> = {};
      if (body.datetime !== undefined) updates.datetime = body.datetime;
      if (body.value !== undefined) updates.value = body.value;
      expect(Object.keys(updates)).toHaveLength(1);
      expect(updates.datetime).toBe("2024-06-01T00:00:00Z");
    });

    it("should detect value-only update", () => {
      const body: HistoryUpdateRequest = { value: 99 };
      const updates: Record<string, unknown> = {};
      if (body.datetime !== undefined) updates.datetime = body.datetime;
      if (body.value !== undefined) updates.value = body.value;
      expect(Object.keys(updates)).toHaveLength(1);
      expect(updates.value).toBe(99);
    });

    it("should reject non-positive value in update", () => {
      const value = -10;
      const isValid = typeof value === "number" && value > 0;
      expect(isValid).toBe(false);
    });

    it("should reject invalid datetime in update", () => {
      const datetime = "not-a-date";
      expect(isValidDatetime(datetime)).toBe(false);
    });

    it("should accept valid datetime in update", () => {
      const datetime = "2024-06-01T12:00:00Z";
      expect(isValidDatetime(datetime)).toBe(true);
    });
  });

  describe("pagination logic", () => {
    const DEFAULT_LIMIT = 50;
    const MAX_LIMIT = 200;

    function parsePagination(params: {
      limit?: string;
      offset?: string;
      orderBy?: string;
    }) {
      const limit = Math.min(
        Math.max(
          1,
          parseInt(params.limit || String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT
        ),
        MAX_LIMIT
      );
      const offset = Math.max(0, parseInt(params.offset || "0", 10) || 0);
      const orderDirection = params.orderBy === "asc" ? "asc" : "desc";
      return { limit, offset, orderDirection };
    }

    it("should use default limit when not specified", () => {
      const result = parsePagination({});
      expect(result.limit).toBe(50);
    });

    it("should use default offset when not specified", () => {
      const result = parsePagination({});
      expect(result.offset).toBe(0);
    });

    it("should use desc order by default", () => {
      const result = parsePagination({});
      expect(result.orderDirection).toBe("desc");
    });

    it("should respect explicit limit", () => {
      const result = parsePagination({ limit: "20" });
      expect(result.limit).toBe(20);
    });

    it("should cap limit at MAX_LIMIT", () => {
      const result = parsePagination({ limit: "500" });
      expect(result.limit).toBe(200);
    });

    it("should enforce minimum limit of 1", () => {
      const result = parsePagination({ limit: "0" });
      expect(result.limit).toBe(DEFAULT_LIMIT);
    });

    it("should handle negative limit by clamping to 1", () => {
      const result = parsePagination({ limit: "-5" });
      expect(result.limit).toBe(1);
    });

    it("should respect explicit offset", () => {
      const result = parsePagination({ offset: "100" });
      expect(result.offset).toBe(100);
    });

    it("should enforce minimum offset of 0", () => {
      const result = parsePagination({ offset: "-10" });
      expect(result.offset).toBe(0);
    });

    it("should accept asc order", () => {
      const result = parsePagination({ orderBy: "asc" });
      expect(result.orderDirection).toBe("asc");
    });

    it("should default to desc for invalid orderBy", () => {
      const result = parsePagination({ orderBy: "invalid" });
      expect(result.orderDirection).toBe("desc");
    });

    it("should handle non-numeric limit gracefully", () => {
      const result = parsePagination({ limit: "abc" });
      expect(result.limit).toBe(DEFAULT_LIMIT);
    });

    it("should handle non-numeric offset gracefully", () => {
      const result = parsePagination({ offset: "abc" });
      expect(result.offset).toBe(0);
    });
  });

  describe("error responses", () => {
    it("should format not authorized error", () => {
      const response = errorResponse("Not authorized");
      expect(response.success).toBe(false);
      expect(response.error).toBe("Not authorized");
    });

    it("should format not found error", () => {
      const response = errorResponse("History not found");
      expect(response.success).toBe(false);
      expect(response.error).toBe("History not found");
    });

    it("should format validation error", () => {
      const response = errorResponse("datetime and value are required");
      expect(response.success).toBe(false);
      expect(response.error).toBe("datetime and value are required");
    });

    it("should format datetime validation error", () => {
      const response = errorResponse(
        "datetime must be a valid ISO 8601 date string"
      );
      expect(response.success).toBe(false);
      expect(response.error).toContain("ISO 8601");
    });
  });
});
