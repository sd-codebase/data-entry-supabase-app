"use client";

import type { AuthProvider } from "@refinedev/core";

// The admin app runs only on this Mac (127.0.0.1) against the local dev
// database, so there is no login: everyone using it is the local admin.
export const authProviderClient: AuthProvider = {
  login: async () => ({ success: true, redirectTo: "/" }),
  logout: async () => ({ success: true, redirectTo: "/" }),
  check: async () => ({ authenticated: true }),
  getPermissions: async () => "admin",
  getIdentity: async () => ({ id: "local", name: "Local admin" }),
  onError: async (error) => ({ error }),
};
