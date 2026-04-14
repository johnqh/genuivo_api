import {
  initializeAuth,
  createCachedVerifier,
  getUserInfo as getFirebaseUserInfo,
  isSiteAdmin,
  isAnonymousUser,
} from "@sudobility/auth_service";
import { getRequiredEnv, getEnv } from "../lib/env-helper";

/**
 * Whether the application is running in test mode.
 *
 * In test mode, Firebase Admin SDK is not initialized and token verification
 * will throw an error. This prevents tests from requiring real Firebase credentials.
 */
const isTestMode =
  getEnv("NODE_ENV") === "test" || getEnv("BUN_ENV") === "test";

if (!isTestMode) {
  initializeAuth({
    firebase: {
      projectId: getRequiredEnv("FIREBASE_PROJECT_ID"),
      clientEmail: getRequiredEnv("FIREBASE_CLIENT_EMAIL"),
      privateKey: getRequiredEnv("FIREBASE_PRIVATE_KEY"),
    },
    siteAdminEmails: getEnv("SITEADMIN_EMAILS"),
  });
}

/**
 * Cached Firebase token verifier with a 5-minute (300,000ms) TTL.
 *
 * Wraps the Firebase Admin SDK's `verifyIdToken` with an in-memory cache
 * to reduce latency for repeated verifications of the same token.
 */
const cachedVerifier = createCachedVerifier(300000);

/**
 * Verifies a Firebase ID token and returns the decoded token payload.
 *
 * Uses a cached verifier to avoid redundant verification calls to Firebase.
 * Not available in test mode -- throws an error if called during tests.
 *
 * @param token - The Firebase ID token string (from the Authorization header)
 * @returns The decoded Firebase ID token containing `uid`, `email`, and other claims
 * @throws If in test mode, or if the token is invalid/expired
 */
export async function verifyIdToken(token: string) {
  if (isTestMode) {
    throw new Error("Firebase verification not available in test mode");
  }
  return cachedVerifier.verify(token);
}

export { isSiteAdmin, isAnonymousUser };
export { getFirebaseUserInfo as getUserInfo };
