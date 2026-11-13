import type { AuthProvider } from "@refinedev/core";

// Local-only app: always authenticated (see auth-provider.client.ts).
export const authProviderServer: Pick<AuthProvider, "check"> = {
  check: async () => ({ authenticated: true }),
};
