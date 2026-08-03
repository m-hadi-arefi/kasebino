/**
 * Realtime token mint HTTP contract (ADR-039 / ARD-015).
 * `POST /api/v1/realtime/token` — short-lived MQTT creds for browser clients.
 */

import {
  createErrorEnvelope,
  createSuccessEnvelope,
  ensureCorrelationId,
  type ApiErrorEnvelope,
  type ApiSuccessEnvelope,
} from "../api-standards/index.js";
import {
  CLIENT_CREDENTIALS,
  isCredentialExpired,
  mintMqttClientCredentials,
  type MintMqttClientCredentialsInput,
  type MqttClientCredentials,
} from "../emqx-realtime/index.js";
import { toMqttWebSocketUrl } from "./transport.js";

export const REALTIME_TOKEN_API = {
  method: "POST" as const,
  path: CLIENT_CREDENTIALS.tokenApiPathReserved,
  absolutePath: "/api/v1/realtime/token",
  authRequired: true,
  cache: "no-store" as const,
} as const;

export type RealtimeTokenAuthorizer = {
  /** Resolve authenticated merchant from session/JWT. Null → 401. */
  resolveMerchantSession(): Promise<{ merchantId: string } | null>;
};

export type RealtimeTokenResponse = {
  username: string;
  password: string;
  expiresAt: string;
  merchantId: string;
  subscribeAcl: readonly string[];
  /** MQTT-over-WebSocket URL for browsers. */
  brokerUrl: string;
};

export type MintRealtimeTokenDeps = {
  authorizer: RealtimeTokenAuthorizer;
  env: string;
  brokerUrlHint: string;
  ttlSeconds?: number;
  now?: () => Date;
  mint?: (input: MintMqttClientCredentialsInput) => MqttClientCredentials;
};

export type RealtimeTokenHandlerResult =
  | { status: 200; body: ApiSuccessEnvelope<RealtimeTokenResponse> }
  | { status: 401; body: ApiErrorEnvelope }
  | { status: 405; body: ApiErrorEnvelope }
  | { status: 500; body: ApiErrorEnvelope };

/**
 * Application handler for token mint — Route Handler stays thin.
 */
export async function handleRealtimeTokenRequest(
  request: { method: string; headers?: { get(name: string): string | null } },
  deps: MintRealtimeTokenDeps,
): Promise<RealtimeTokenHandlerResult> {
  const correlationId = ensureCorrelationId(
    request.headers?.get("x-correlation-id") ??
      request.headers?.get("X-Correlation-Id"),
  );

  if (request.method.toUpperCase() !== REALTIME_TOKEN_API.method) {
    return {
      status: 405,
      body: createErrorEnvelope({
        code: "VALIDATION_ERROR",
        correlationId,
        messageFa: "فقط درخواست POST مجاز است.",
      }),
    };
  }

  try {
    const session = await deps.authorizer.resolveMerchantSession();
    if (!session?.merchantId?.trim()) {
      return {
        status: 401,
        body: createErrorEnvelope({
          code: "UNAUTHORIZED",
          correlationId,
        }),
      };
    }

    const mint = deps.mint ?? mintMqttClientCredentials;
    const creds = mint({
      merchantId: session.merchantId,
      env: deps.env,
      ...(deps.ttlSeconds !== undefined ? { ttlSeconds: deps.ttlSeconds } : {}),
      ...(deps.now !== undefined ? { now: deps.now } : {}),
      brokerUrlHint: deps.brokerUrlHint,
    });

    if (isCredentialExpired(creds, deps.now ?? (() => new Date()))) {
      return {
        status: 500,
        body: createErrorEnvelope({
          code: "INTERNAL_ERROR",
          correlationId,
          messageFa: "اعتبارنامه لحظه‌ای نامعتبر است. دوباره تلاش کنید.",
        }),
      };
    }

    const data: RealtimeTokenResponse = {
      username: creds.username,
      password: creds.password,
      expiresAt: creds.expiresAt.toISOString(),
      merchantId: creds.merchantId,
      subscribeAcl: creds.subscribeAcl,
      brokerUrl: toMqttWebSocketUrl(
        creds.brokerUrlHint ?? deps.brokerUrlHint,
      ),
    };

    return {
      status: 200,
      body: createSuccessEnvelope(data, { cache: REALTIME_TOKEN_API.cache }),
    };
  } catch {
    return {
      status: 500,
      body: createErrorEnvelope({
        code: "INTERNAL_ERROR",
        correlationId,
      }),
    };
  }
}
