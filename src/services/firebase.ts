import {
  initializeAuth,
  createCachedVerifier,
  getUserInfo as getFirebaseUserInfo,
  isSiteAdmin,
  isAnonymousUser,
} from "@sudobility/auth_service";
import { getEnv } from "../lib/env-helper";

/**
 * Whether the application is running in test mode.
 *
 * In test mode, Firebase Admin SDK is not initialized and token verification
 * will throw an error. This prevents tests from requiring real Firebase credentials.
 */
const isTestMode =
  getEnv("NODE_ENV") === "test" || getEnv("BUN_ENV") === "test";

const firebaseConfig = {
  projectId: getEnv("FIREBASE_PROJECT_ID"),
  clientEmail: getEnv("FIREBASE_CLIENT_EMAIL"),
  privateKey: getEnv("FIREBASE_PRIVATE_KEY"),
};

let authInitialized = false;

function getMissingFirebaseEnvVars(): string[] {
  const missing: string[] = [];

  if (!firebaseConfig.projectId) {
    missing.push("FIREBASE_PROJECT_ID");
  }

  if (!firebaseConfig.clientEmail) {
    missing.push("FIREBASE_CLIENT_EMAIL");
  }

  if (!firebaseConfig.privateKey) {
    missing.push("FIREBASE_PRIVATE_KEY");
  }

  return missing;
}

function ensureFirebaseInitialized(): void {
  if (isTestMode || authInitialized) {
    return;
  }

  const missingVars = getMissingFirebaseEnvVars();

  if (missingVars.length > 0) {
    throw new Error(
      `Firebase authentication is not configured. Missing environment variables: ${missingVars.join(", ")}`
    );
  }

  initializeAuth({
    firebase: {
      projectId: firebaseConfig.projectId!,
      clientEmail: firebaseConfig.clientEmail!,
      privateKey: firebaseConfig.privateKey!,
    },
    siteAdminEmails: getEnv("SITEADMIN_EMAILS"),
  });

  authInitialized = true;
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

  ensureFirebaseInitialized();

  return cachedVerifier.verify(token);
}

export { isSiteAdmin, isAnonymousUser };
export async function getUserInfo(uid: string) {
  ensureFirebaseInitialized();
  return getFirebaseUserInfo(uid);
}
