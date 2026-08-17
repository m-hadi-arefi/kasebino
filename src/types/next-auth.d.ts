import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    audience?: "merchant" | "customer";
    merchantId?: string | null;
    roles?: string[];
    role?: "customer";
    permissions?: string[];
    tokenVersion?: number;
    storeId?: string | null;
    storeIds?: string[];
    user: DefaultSession["user"] & {
      id?: string;
      merchantId?: string | null;
      roles?: string[];
      role?: "customer";
      permissions?: string[];
      tokenVersion?: number;
      storeId?: string | null;
      storeIds?: string[];
      audience?: "merchant" | "customer";
    };
  }

  interface User {
    merchantId?: string | null;
    roles?: string[];
    role?: "customer";
    permissions?: string[];
    tokenVersion?: number;
    storeId?: string | null;
    storeIds?: string[];
    audience?: "merchant" | "customer";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    audience?: "merchant" | "customer";
    merchantId?: string | null;
    roles?: string[];
    role?: "customer";
    permissions?: string[];
    tokenVersion?: number;
    storeId?: string | null;
    storeIds?: string[];
  }
}

export {};
