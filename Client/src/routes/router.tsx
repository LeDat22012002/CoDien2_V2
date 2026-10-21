import type { ComponentType } from 'react';
import { createBrowserRouter } from 'react-router';
import { FullPageLoading } from '@/shared/components/FullPageLoading';
import RouteErrorPage from '@/shared/pages/RouteErrorPage';
import { GuestRoute } from '@/routes/GuestRoute';
import { PrivateRoute } from '@/routes/PrivateRoute';

/**
 * Khai báo route toàn app. Trang của module tải lazy để tách bundle theo module.
 * - Trang công khai (chỉ gọi API GET [AllowAnonymous]): đặt ngang hàng trang chủ, ngoài PrivateRoute.
 * - Trang cần đăng nhập: đặt trong PrivateRoute. Cần quyền thì bọc thêm route cha
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

const toRoute = (module: { default: ComponentType }) => ({ Component: module.default });

export const router = createBrowserRouter([
  {
    errorElement: <RouteErrorPage />,
    HydrateFallback: FullPageLoading,
    children: [
      {
        element: <GuestRoute />,
        children: [
          { path: 'login', lazy: () => import('@/modules/identity/pages/LoginPage').then(toRoute) },
        ],
      },
      {
        lazy: () => import('@/layouts/MainLayout').then(toRoute),
        children: [
          // Công khai
          { index: true, lazy: () => import('@/modules/home/pages/HomePage').then(toRoute) },

          // Bắt buộc đăng nhập
          {
            element: <PrivateRoute />,
            children: [],
          },

          { path: '*', lazy: () => import('@/shared/pages/NotFoundPage').then(toRoute) },
        ],
      },
    ],
  },
]);
