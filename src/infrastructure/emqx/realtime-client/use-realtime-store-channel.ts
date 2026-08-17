"use client";

/**
 * Staff React hook — MQTT store channel + poll fallback (ADR-124).
 * Import only from client components (merchant board / POS / notifications).
 */

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { InMemoryMqttBroker } from "../contracts/in-memory-broker.js";
import type { MerchantTopicChannel } from "../contracts/channels.js";
import { csrfHeadersForBrowserFetch } from "../../security/index.js";
import {
  createRealtimeClient,
  type RealtimeConnectionState,
  type RealtimeUxKey,
} from "./client.js";
import { isMqttClientEnabled, resolveBrowserRealtimeEnv } from "./flags.js";
import { createMqttJsRealtimeTransport } from "./mqtt-js-transport.js";
import type { RealtimeTokenResponse } from "./token.js";
import { createInMemoryRealtimeTransport } from "./transport.js";
import {
  resolveRealtimeUxMessage,
  toastMessageForChannel,
} from "./ux.js";

export type UseRealtimeStoreChannelOptions = {
  merchantId: string | null | undefined;
  storeId: string | null | undefined;
  /** Default: orders, sales, inventory, notifications */
  channels?: readonly MerchantTopicChannel[];
  enabled?: boolean;
  onEventToast?: (message: string) => void;
};

export type UseRealtimeStoreChannelResult = {
  state: RealtimeConnectionState;
  uxKey: RealtimeUxKey;
  uxMessage: string;
  mqttEnabled: boolean;
};

const DEFAULT_CHANNELS: readonly MerchantTopicChannel[] = [
  "orders",
  "sales",
  "inventory",
  "notifications",
];

async function fetchRealtimeToken(
  storeId: string,
): Promise<RealtimeTokenResponse> {
  const res = await fetch("/api/v1/realtime/token", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...csrfHeadersForBrowserFetch(),
    },
    body: JSON.stringify({ storeId }),
  });
  const body = (await res.json()) as {
    data?: RealtimeTokenResponse;
    error?: { message?: string };
  };
  if (!res.ok || !body.data) {
    throw new Error(body.error?.message ?? "realtime_token_failed");
  }
  return body.data;
}

/**
 * Subscribe to store-scoped merchant MQTT topics; poll when MQTT unavailable.
 */
export function useRealtimeStoreChannel(
  options: UseRealtimeStoreChannelOptions,
): UseRealtimeStoreChannelResult {
  const queryClient = useQueryClient();
  const mqttEnabled = isMqttClientEnabled();
  const [state, setState] = useState<RealtimeConnectionState>("idle");
  const [uxKey, setUxKey] = useState<RealtimeUxKey>("idle");

  const merchantId = options.merchantId ?? null;
  const storeId = options.storeId ?? null;
  const enabled = options.enabled !== false;
  const channelsKey = (options.channels ?? DEFAULT_CHANNELS).join(",");
  const onEventToastRef = useRef(options.onEventToast);
  onEventToastRef.current = options.onEventToast;

  useEffect(() => {
    if (!enabled || !merchantId || !storeId) {
      setState("idle");
      setUxKey("idle");
      return;
    }

    const channels = channelsKey.split(",") as MerchantTopicChannel[];
    const transport = mqttEnabled
      ? createMqttJsRealtimeTransport()
      : createInMemoryRealtimeTransport(new InMemoryMqttBroker());

    const client = createRealtimeClient({
      transport,
      queryClient,
      scope: { merchantId, storeId },
      env: resolveBrowserRealtimeEnv(),
      channels,
      mqttEnabled,
      fetchToken: () => fetchRealtimeToken(storeId),
      onStateChange: (next, nextUx) => {
        setState(next);
        setUxKey(nextUx);
      },
      onChannelMessage: (channel) => {
        const toast = toastMessageForChannel(channel);
        if (toast) onEventToastRef.current?.(toast);
      },
    });

    void client.start();

    return () => {
      void client.stop();
    };
  }, [enabled, merchantId, storeId, mqttEnabled, queryClient, channelsKey]);

  return {
    state,
    uxKey,
    uxMessage: resolveRealtimeUxMessage(uxKey),
    mqttEnabled,
  };
}
