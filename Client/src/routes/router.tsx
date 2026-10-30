import type { ComponentType } from "react";
import type { PublicRouteHandle } from "@/layouts/PublicLayout";
import { createBrowserRouter, Navigate } from "react-router";
import { FullPageLoading } from "@/shared/components/FullPageLoading";
import { DEFAULT_PUBLIC_PATH } from "@/shared/constants/routes";
import RouteErrorPage from "@/shared/pages/RouteErrorPage";
import { GuestRoute } from "@/routes/GuestRoute";
import { PrivateRoute } from "@/routes/PrivateRoute";
import { PageGuard } from "./PageGuard";

/**
 * Khai báo route toàn app. Trang của module tải lazy để tách bundle theo module.
 * - Trang công khai (chỉ gọi API GET [AllowAnonymous]): con của PublicLayout. Không có trang chủ, "/" chuyển về DEFAULT_PUBLIC_PATH.
 * - Trang sau đăng nhập (quản trị, thông tin cá nhân): con của PrivateLayout (trong PrivateRoute). Cần quyền thì bọc thêm route cha
 *   `element: <PageGuard pagePath="/<path>" />`, pagePath khớp Path của trang trong bảng Page.
 *
 * Ví dụ:
 *   {
 *     element: <PageGuard pagePath="/employees" />,
 *     children: [
 *       { path: 'employees', lazy: () => import('@/modules/employees/pages/EmployeeListPage').then(toRoute) },
 *     ],
 *   },
 */

const toRoute = (module: { default: ComponentType }) => ({
  Component: module.default,
});

export const router = createBrowserRouter([
  {
    errorElement: <RouteErrorPage />,
    HydrateFallback: FullPageLoading,
    children: [
      {
        element: <GuestRoute />,
        children: [
          {
            path: "login",
            lazy: () =>
              import("@/modules/identity/pages/LoginPage").then(toRoute),
          },
        ],
      },
      // Công khai: layout landing page (header ngang)
      {
        lazy: () => import("@/layouts/PublicLayout").then(toRoute),
        children: [
          // Không có trang chủ: "/" chuyển về trang Lấy số văn bản
          {
            index: true,
            element: <Navigate to={DEFAULT_PUBLIC_PATH} replace />,
          },
          {
            path: "documents/issue",
            lazy: () =>
              import("@/modules/documents/pages/DocumentIssuePage").then(
                toRoute,
              ),
          },
          {
            path: "org/organizationalchart",
            // Sơ đồ chiếm toàn màn hình dưới header
            handle: { isFullScreen: true } satisfies PublicRouteHandle,
            lazy: () =>
              import("@/modules/organization/pages/OrgChartPage").then(
                toRoute,
              ),
          },
          {
            path: "incidents",
            // Bảng nhiều cột: dùng hết bề rộng màn hình
            handle: { isFullScreen: true } satisfies PublicRouteHandle,
            lazy: () =>
              import("@/modules/incidents/pages/IncidentListPage").then(
                toRoute,
              ),
          },
          {
            path: "*",
            lazy: () => import("@/shared/pages/NotFoundPage").then(toRoute),
          },
        ],
      },
      // Bắt buộc đăng nhập: layout có Sider (quản trị, thông tin cá nhân)
      {
        element: <PrivateRoute />,
        children: [
          {
            lazy: () => import("@/layouts/PrivateLayout").then(toRoute),
            children: [
              {
                element: <PageGuard pagePath="/admin/dashboard" />, // Hoặc path khớp với DB của bạn
                children: [
                  {
                    path: "admin/dashboard",
                    lazy: () =>
                      import("@/modules/dashboard/pages/DashboardAdminPage").then(
                        toRoute,
                      ),
                  },
                ],
              },
              {
                element: <PageGuard pagePath="/admin/employees" />,
                children: [
                  {
                    path: "admin/employees",
                    lazy: () =>
                      import("@/modules/employees/pages/EmployeeListPage").then(
                        toRoute,
                      ),
                  },
                ],
              },
              {
                element: <PageGuard pagePath="/admin/org-units" />,
                children: [
                  {
                    path: "admin/org-units",
                    lazy: () =>
                      import(
                        "@/modules/organization/pages/OrgUnitManagementPage"
                      ).then(toRoute),
                  },
                ],
              },
              {
                element: <PageGuard pagePath="/admin/position-levels" />,
                children: [
                  {
                    path: "admin/position-levels",
                    lazy: () =>
                      import(
                        "@/modules/organization/pages/PositionLevelPage"
                      ).then(toRoute),
                  },
                ],
              },
              {
                element: <PageGuard pagePath="/admin/users" />,
                children: [
                  {
                    path: "admin/users",
                    lazy: () =>
                      import("@/modules/identity/pages/UserListPage").then(
                        toRoute,
                      ),
                  },
                ],
              },
              {
                element: <PageGuard pagePath="/admin/roles" />,
                children: [
                  {
                    path: "admin/roles",
                    lazy: () =>
                      import("@/modules/identity/pages/RoleListPage").then(
                        toRoute,
                      ),
                  },
                ],
              },
              {
                element: <PageGuard pagePath="/admin/permissions" />,
                children: [
                  {
                    path: "admin/permissions",
                    lazy: () =>
                      import(
                        "@/modules/identity/pages/PermissionAssignmentPage"
                      ).then(toRoute),
                  },
                ],
              },
              {
                element: <PageGuard pagePath="/admin/pages" />,
                children: [
                  {
                    path: "admin/pages",
                    lazy: () =>
                      import("@/modules/identity/pages/PageManagementPage").then(
                        toRoute,
                      ),
                  },
                ],
              },
              // Các route quản trị khác đặt ở đây (nhớ thêm vào APP_ROUTE_PATHS ở shared/constants/routes.ts)
            ],
          },
        ],
      },
    ],
  },
]);
