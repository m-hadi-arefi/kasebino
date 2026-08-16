/**
 * Feature Flag Evaluator Service (ADR-153).
 */

import {
  DEFAULT_PLAN_FEATURES,
  FEATURE_FLAG_KEYS,
  type FeatureFlagKey,
  type MerchantSubscription,
} from "../domain/subscription.js";
import { MerchantDomainError } from "./errors.js";

/**
 * Evaluates whether a specific feature flag is active for a merchant subscription.
 * If no subscription exists, defaults to the Phase 1 Kerman pilot feature set.
 */
export function evaluateFeatureFlag(
  subscription: MerchantSubscription | null,
  flagKey: FeatureFlagKey,
): boolean {
  if (!subscription) {
    // Default to pilot tier features during Phase 1
    return DEFAULT_PLAN_FEATURES.pilot.includes(flagKey);
  }

  // If subscription has expired, fall back to free tier
  if (subscription.expiresAt && subscription.expiresAt < new Date()) {
    return DEFAULT_PLAN_FEATURES.free.includes(flagKey);
  }

  return subscription.features.includes(flagKey);
}

/**
 * Returns a dictionary of all feature flag evaluations for frontend consumption.
 */
export function getMerchantFeatureFlags(
  subscription: MerchantSubscription | null,
): Record<FeatureFlagKey, boolean> {
  const flags = {} as Record<FeatureFlagKey, boolean>;
  for (const key of FEATURE_FLAG_KEYS) {
    flags[key] = evaluateFeatureFlag(subscription, key);
  }
  return flags;
}

/**
 * Asserts that a feature flag is enabled, throwing MerchantDomainError if disabled.
 */
export function assertFeatureEnabled(
  subscription: MerchantSubscription | null,
  flagKey: FeatureFlagKey,
): void {
  if (!evaluateFeatureFlag(subscription, flagKey)) {
    throw new MerchantDomainError("FEATURE_NOT_ENABLED");
  }
}
