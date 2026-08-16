"use client";

import React, { createContext, useContext, useMemo } from "react";
import type { Permission } from "@/rbac";
import { normalizeRoles, ROLE_PERMISSION_MATRIX } from "@/rbac";

export type PermissionsContextValue = {
  roles: readonly string[];
  permissions: readonly string[];
  storeIds: readonly string[];
  merchantId: string | null;
  isOwner: boolean;
  isPlatformAdmin: boolean;
  hasPermission: (permission: Permission | string) => boolean;
  hasAnyPermission: (permissions: (Permission | string)[]) => boolean;
  hasAllPermissions: (permissions: (Permission | string)[]) => boolean;
  canAccessStore: (storeId: string) => boolean;
};

const PermissionsContext = createContext<PermissionsContextValue | null>(null);

export type PermissionsProviderProps = {
  children: React.ReactNode;
  initialRoles?: readonly string[];
  initialPermissions?: readonly string[];
  initialStoreIds?: readonly string[];
  merchantId?: string | null;
};

export function PermissionsProvider({
  children,
  initialRoles = [],
  initialPermissions = [],
  initialStoreIds = [],
  merchantId = null,
}: PermissionsProviderProps) {
  const value = useMemo<PermissionsContextValue>(() => {
    const roles = initialRoles;
    const normalized = normalizeRoles(roles);
    const isOwner = normalized.includes("merchant_owner") || roles.includes("merchant_owner");
    const isPlatformAdmin = normalized.includes("platform_admin") || roles.includes("platform_admin");

    // Pre-calculate permissions set
    const permSet = new Set<string>(initialPermissions);
    for (const role of normalized) {
      if (ROLE_PERMISSION_MATRIX[role]) {
        for (const p of ROLE_PERMISSION_MATRIX[role]) {
          permSet.add(p);
        }
      }
    }

    const hasPermission = (permission: Permission | string) => {
      if (isPlatformAdmin) return true;
      if (isOwner && permission !== "admin.platform" && permission !== "customer.self") return true;
      return permSet.has(permission);
    };

    const hasAnyPermission = (permissions: (Permission | string)[]) => {
      if (permissions.length === 0) return true;
      return permissions.some(hasPermission);
    };

    const hasAllPermissions = (permissions: (Permission | string)[]) => {
      if (permissions.length === 0) return true;
      return permissions.every(hasPermission);
    };

    const canAccessStore = (storeId: string) => {
      if (isPlatformAdmin || isOwner) return true;
      if (initialStoreIds.length === 0) return true; // not constrained
      return initialStoreIds.includes(storeId);
    };

    return {
      roles,
      permissions: Array.from(permSet),
      storeIds: initialStoreIds,
      merchantId,
      isOwner,
      isPlatformAdmin,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      canAccessStore,
    };
  }, [initialRoles, initialPermissions, initialStoreIds, merchantId]);

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions(): PermissionsContextValue {
  const ctx = useContext(PermissionsContext);
  if (!ctx) {
    // Graceful fallback for unauthenticated / isolated components
    return {
      roles: [],
      permissions: [],
      storeIds: [],
      merchantId: null,
      isOwner: false,
      isPlatformAdmin: false,
      hasPermission: () => true, // default permissive in tests/storybooks without provider
      hasAnyPermission: () => true,
      hasAllPermissions: () => true,
      canAccessStore: () => true,
    };
  }
  return ctx;
}
