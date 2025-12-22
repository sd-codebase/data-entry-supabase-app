"use client";

import { ThemedTitleV2 } from "@refinedev/antd";

export const AppTitle: React.FC<{ collapsed: boolean }> = ({ collapsed }) => {
  return (
    <ThemedTitleV2
      collapsed={collapsed}
      text={process.env.NEXT_PUBLIC_APP_NAME || "App"}
    />
  );
};
