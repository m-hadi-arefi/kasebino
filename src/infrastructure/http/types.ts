/**
 * ADR-094 — shared HTTP types for App Router handlers (testable without Next).
 */

import type {
  ApiErrorEnvelope,
  ApiSuccessEnvelope,
} from "../../shared/contracts/api-standards/index.js";

export type HttpRequestLike = {
  method: string;
  url: string;
  headers: {
    get(name: string): string | null;
  };
  json(): Promise<unknown>;
  text(): Promise<string>;
};

export type HttpHandlerResult = {
  status: number;
  body: ApiSuccessEnvelope<unknown> | ApiErrorEnvelope;
  headers?: Record<string, string>;
};

export type AuthenticatedMerchant = {
  userId: string;
  merchantId: string;
  roles: string[];
  storeId: string | null;
  tokenVersion: number | null;
};

export type AuthenticatedCustomer = {
  userId: string;
  storeId: string | null;
  roles: string[];
};

export type AuthenticatedAdmin = {
  userId: string;
  roles: string[];
  tokenVersion: number | null;
};
