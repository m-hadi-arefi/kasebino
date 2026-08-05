import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    audience?: "merchant" | "customer";
    merchantId?: string | null;
    roles?: string[];
    role?: "customer";
    tokenVersion?: number;
    storeId?: string | null;
    user: DefaultSession["user"] & {
      id?: string;
      merchantId?: string | null;
      roles?: string[];
      role?: "customer";
      tokenVersion?: number;
      storeId?: string | null;
      audience?: "merchant" | "customer";
    };
  }

  interface User {
    merchantId?: string | null;
    roles?: string[];
    role?: "customer";
    tokenVersion?: number;
    storeId?: string | null;
    audience?: "merchant" | "customer";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    audience?: "merchant" | "customer";
    merchantId?: string | null;
    roles?: string[];
    role?: "customer";
    tokenVersion?: number;
    storeId?: string | null;
  }
}

export {};
