import { describe, it, expect } from "vitest";
import { successResponse, errorResponse } from "@sudobility/genuivo_types";
import type { User } from "@sudobility/genuivo_types";

describe("users route logic", () => {
  describe("response formatting", () => {
    it("should format user response with all fields", () => {
      const user: User = {
        firebase_uid: "uid-123",
        email: "test@example.com",
        display_name: "Test User",
        created_at: "2024-01-01T00:00:00.000Z",
        updated_at: "2024-01-01T00:00:00.000Z",
      };
      const response = successResponse(user);
      expect(response.success).toBe(true);
      expect(response.data.firebase_uid).toBe("uid-123");
      expect(response.data.email).toBe("test@example.com");
      expect(response.data.display_name).toBe("Test User");
    });

    it("should format user response with null fields", () => {
      const user: User = {
        firebase_uid: "uid-456",
        email: null,
        display_name: null,
        created_at: null,
        updated_at: null,
      };
      const response = successResponse(user);
      expect(response.success).toBe(true);
      expect(response.data.email).toBeNull();
      expect(response.data.display_name).toBeNull();
      expect(response.data.created_at).toBeNull();
      expect(response.data.updated_at).toBeNull();
    });
  });

  describe("authorization logic", () => {
    it("should allow user to view own profile", () => {
      const userId = "user-123";
      const tokenUserId = "user-123";
      const siteAdmin = false;
      const authorized = userId === tokenUserId || siteAdmin;
      expect(authorized).toBe(true);
    });

    it("should deny user from viewing another profile", () => {
      const userId = "user-123";
      const tokenUserId = "user-789";
      const siteAdmin = false;
      const authorized = userId === tokenUserId || siteAdmin;
      expect(authorized).toBe(false);
    });

    it("should allow site admin to view any profile", () => {
      const userId = "user-123";
      const tokenUserId = "admin-001";
      const siteAdmin = true;
      const authorized = userId === tokenUserId || siteAdmin;
      expect(authorized).toBe(true);
    });
  });

  describe("error responses", () => {
    it("should format not authorized error", () => {
      const response = errorResponse("Not authorized to view this user");
      expect(response.success).toBe(false);
      expect(response.error).toContain("Not authorized");
    });

    it("should format not found error", () => {
      const response = errorResponse("User not found");
      expect(response.success).toBe(false);
      expect(response.error).toBe("User not found");
    });
  });
});
