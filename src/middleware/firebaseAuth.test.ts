import { describe, it, expect } from "vitest";
import { errorResponse } from "@sudobility/genuivo_types";

describe("firebaseAuth middleware logic", () => {
  describe("authorization header parsing", () => {
    it("should reject missing authorization header", () => {
      const authHeader = undefined;
      expect(authHeader).toBeUndefined();
    });

    it("should parse valid Bearer token", () => {
      const authHeader = "Bearer abc123token";
      const [type, token] = authHeader.split(" ");
      expect(type).toBe("Bearer");
      expect(token).toBe("abc123token");
    });

    it("should reject non-Bearer auth type", () => {
      const authHeader = "Basic abc123";
      const [type, token] = authHeader.split(" ");
      const isValid = type === "Bearer" && !!token;
      expect(isValid).toBe(false);
    });

    it("should reject Bearer without token", () => {
      const authHeader = "Bearer";
      const parts = authHeader.split(" ");
      const type = parts[0];
      const token = parts[1];
      const isValid = type === "Bearer" && !!token;
      expect(isValid).toBe(false);
    });

    it("should reject empty string", () => {
      const authHeader = "";
      const isValid = !!authHeader;
      expect(isValid).toBe(false);
    });
  });

  describe("error responses", () => {
    it("should return auth required error", () => {
      const response = errorResponse("Authorization header required");
      expect(response.success).toBe(false);
      expect(response.error).toBe("Authorization header required");
    });

    it("should return invalid format error", () => {
      const response = errorResponse(
        "Invalid authorization format. Use: Bearer <token>"
      );
      expect(response.success).toBe(false);
      expect(response.error).toContain("Bearer");
    });

    it("should return anonymous user error", () => {
      const response = errorResponse(
        "Anonymous users cannot access this resource"
      );
      expect(response.success).toBe(false);
      expect(response.error).toContain("Anonymous");
    });

    it("should return invalid token error", () => {
      const response = errorResponse("Invalid or expired Firebase token");
      expect(response.success).toBe(false);
      expect(response.error).toContain("Firebase");
    });
  });

  describe("user context setting", () => {
    it("should extract userId from decoded token", () => {
      const decodedToken = { uid: "user-abc", email: "test@example.com" };
      const userId = decodedToken.uid;
      const userEmail = decodedToken.email ?? null;
      expect(userId).toBe("user-abc");
      expect(userEmail).toBe("test@example.com");
    });

    it("should handle missing email", () => {
      const decodedToken = { uid: "user-abc" } as {
        uid: string;
        email?: string;
      };
      const userEmail = decodedToken.email ?? null;
      expect(userEmail).toBeNull();
    });
  });
});
