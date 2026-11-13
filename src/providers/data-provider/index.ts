"use client";

import type { DataProvider } from "@refinedev/core";

// Refine needs a data provider, but no page uses Refine data hooks: pages
// query the local dev database through src/utils/db/client.ts.
const notUsed = () => {
  throw new Error("Refine data hooks are not used; use dbClient from @utils/db/client");
};

export const dataProvider: DataProvider = {
  getApiUrl: () => "/api/db",
  getList: notUsed,
  getOne: notUsed,
  create: notUsed,
  update: notUsed,
  deleteOne: notUsed,
};
