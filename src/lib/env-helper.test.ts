import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getEnv, getRequiredEnv } from "./env-helper";

// Mock fs.readFileSync to avoid reading actual .env.local files
vi.mock("fs", () => ({
  readFileSync: vi.fn(() => {
    throw new Error("File not found");
  }),
}));

describe("env-helper", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("getEnv", () => {
    it("should return process.env value when set", () => {
      process.env.TEST_VAR = "hello";
      expect(getEnv("TEST_VAR")).toBe("hello");
    });

    it("should return default value when env var is not set", () => {
      delete process.env.NONEXISTENT_VAR;
      expect(getEnv("NONEXISTENT_VAR", "default")).toBe("default");
    });

    it("should return undefined when env var is not set and no default", () => {
      delete process.env.NONEXISTENT_VAR;
      expect(getEnv("NONEXISTENT_VAR")).toBeUndefined();
    });

    it("should return default when env var is empty string", () => {
      process.env.EMPTY_VAR = "";
      expect(getEnv("EMPTY_VAR", "fallback")).toBe("fallback");
    });
  });

  describe("getRequiredEnv", () => {
    it("should return value when env var is set", () => {
      process.env.REQUIRED_VAR = "value";
      expect(getRequiredEnv("REQUIRED_VAR")).toBe("value");
    });

    it("should throw when env var is not set", () => {
      delete process.env.MISSING_VAR;
      expect(() => getRequiredEnv("MISSING_VAR")).toThrow(
        "Required environment variable MISSING_VAR is not set"
      );
    });

    it("should throw when env var is empty string", () => {
      process.env.EMPTY_REQUIRED = "";
      expect(() => getRequiredEnv("EMPTY_REQUIRED")).toThrow(
        "Required environment variable EMPTY_REQUIRED is not set"
      );
    });
  });
});
