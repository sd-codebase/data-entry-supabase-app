import { DevtoolsProvider } from "@providers/devtools";
import { useNotificationProvider } from "@refinedev/antd";
import { GitHubBanner, Refine } from "@refinedev/core";
import { RefineKbar, RefineKbarProvider } from "@refinedev/kbar";
import routerProvider from "@refinedev/nextjs-router";
import { Metadata } from "next";
import { cookies } from "next/headers";
import React, { Suspense } from "react";

import { AntdRegistry } from "@ant-design/nextjs-registry";
import { ColorModeContextProvider } from "@contexts/color-mode";
import { authProviderClient } from "@providers/auth-provider/auth-provider.client";
import { dataProvider } from "@providers/data-provider";
import "@refinedev/antd/dist/reset.css";
import {
  CheckOutlined,
  DatabaseOutlined,
  FileDoneOutlined,
  FilePdfOutlined,
  FormOutlined,
  LayoutOutlined,
  OrderedListOutlined,
  ProfileOutlined,
  TableOutlined,
} from "@ant-design/icons";

export const metadata: Metadata = {
  title: "Fast capture",
  description: "Fast capture app",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = cookies();
  const theme = cookieStore.get("theme");
  const defaultMode = theme?.value === "dark" ? "dark" : "light";

  return (
    <html lang="en">
      <body>
        <Suspense>
          <RefineKbarProvider>
            <AntdRegistry>
              <ColorModeContextProvider defaultMode={defaultMode}>
                {/* <DevtoolsProvider> */}
                <Refine
                  routerProvider={routerProvider}
                  authProvider={authProviderClient}
                  dataProvider={dataProvider}
                  notificationProvider={useNotificationProvider}
                  resources={[
                    {
                      name: "format-solutions",
                      list: "/solutions",
                      meta: {
                        canDelete: true,
                        icon: <CheckOutlined />,
                      },
                    },
                    {
                      name: "format-sections",
                      list: "/formatter",
                      meta: {
                        canDelete: true,
                        icon: <TableOutlined />,
                      },
                    },
                    {
                      name: "chapter-questions",
                      list: "/chapter-questions",
                      meta: {
                        canDelete: true,
                        icon: <LayoutOutlined />,
                      },
                    },
                    {
                      name: "questions",
                      list: "/questions",
                      meta: {
                        canDelete: true,
                        icon: <FileDoneOutlined />,
                      },
                    },
                    {
                      name: "questions-list",
                      list: "/questions-list",
                      meta: {
                        canDelete: true,
                        icon: <ProfileOutlined />,
                      },
                    },
                    {
                      name: "bulk-topics",
                      list: "/bulk-topics",
                      meta: {
                        canDelete: false,
                        icon: <DatabaseOutlined />,
                      },
                    },
                    {
                      name: "neet-chapter-questions",
                      list: "/neet-chapter-questions",
                      meta: {
                        canDelete: false,
                        icon: <FormOutlined />,
                      },
                    },
                    {
                      name: "jee-advanced-chapter-questions",
                      list: "/jee-advanced-chapter-questions",
                      meta: {
                        canDelete: false,
                        icon: <FormOutlined />,
                      },
                    },
                    {
                      name: "mpscgs-chapter-questions",
                      list: "/mpscgs-chapter-questions",
                      meta: {
                        canDelete: false,
                        icon: <FormOutlined />,
                      },
                    },
                    {
                      name: "questions-list-jee-advanced",
                      list: "/questions-list-jee-advanced",
                      meta: {
                        canDelete: false,
                        icon: <OrderedListOutlined />,
                      },
                    },
                    {
                      name: "pdf-viewer",
                      list: "/pdf-viewer",
                      meta: {
                        canDelete: false,
                        icon: <FilePdfOutlined />,
                      },
                    },
                  ]}
                  options={{
                    syncWithLocation: true,
                    warnWhenUnsavedChanges: true,
                    useNewQueryKeys: true,
                    projectId: "jDA0bF-uz4ytg-hbWCCH",
                  }}
                >
                  {children}
                  <RefineKbar />
                </Refine>
                {/* </DevtoolsProvider> */}
              </ColorModeContextProvider>
            </AntdRegistry>
          </RefineKbarProvider>
        </Suspense>
      </body>
    </html>
  );
}
