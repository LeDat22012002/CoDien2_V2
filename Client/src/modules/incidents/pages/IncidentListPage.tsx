import { lazy, Suspense, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router';
import { ErrorState } from '@/shared/components/ErrorState';
import { FullPageLoading } from '@/shared/components/FullPageLoading';
import { RibbonTitle } from '@/shared/components/RibbonTitle';
import { showLoginRequiredAlert } from '@/shared/utils/alert';
import { buildLoginPath } from '@/shared/utils/redirect';
import { useAuthStore } from '@/stores/authStore';
import { IncidentFilterBar } from '@/modules/incidents/components/IncidentFilterBar';
import { IncidentFormModal } from '@/modules/incidents/components/IncidentFormModal';
import { IncidentTable } from '@/modules/incidents/components/IncidentTable';
import { useIncidentFilterParams } from '@/modules/incidents/hooks/useIncidentFilterParams';
import { useIncidents, useIncidentWorkshops } from '@/modules/incidents/hooks/useIncidentQueries';

/** ?view=dashboard: hiện dashboard thay danh sách; năm / xưởng của dashboard nằm ở ?year=&dw=. */
const VIEW_PARAM = 'view';
const DASHBOARD_VIEW = 'dashboard';
const DASHBOARD_PARAMS = [VIEW_PARAM, 'year', 'dw'];

/** Dashboard kéo theo thư viện biểu đồ: tải riêng khi mở. */
const IncidentDashboard = lazy(() => import('@/modules/incidents/components/dashboard/IncidentDashboard'));

/**
 * Báo cáo sự cố (route /incidents, trang công khai), dựng lại theo BaoCaoSuCo hệ thống cũ:
 * lọc + bảng + phân trang, báo cáo quá hạn bổ sung / phân tích được đánh dấu đỏ; nút Dashboard chuyển sang thống kê.
 * Ai cũng xem được; thêm báo cáo cần đăng nhập (Server kiểm tra). Sửa / phân tích / bổ sung ở trang cá nhân.
 */
const IncidentListPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const authStatus = useAuthStore((state) => state.status);
  const [searchParams, setSearchParams] = useSearchParams();
  const { filter, filterValues, pageIndex, pageSize, handleFilterChange, handleReset, handlePageChange } =
    useIncidentFilterParams();
  const [isFormOpen, setIsFormOpen] = useState(false);

  const workshopsQuery = useIncidentWorkshops();
  const incidentsQuery = useIncidents(filter);

  /** Mở / đóng dashboard: thêm lịch sử trình duyệt để nút Back quay lại được; bộ lọc danh sách giữ nguyên. */
  const openDashboard = () =>
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      next.set(VIEW_PARAM, DASHBOARD_VIEW);
      return next;
    });

  const closeDashboard = () =>
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      DASHBOARD_PARAMS.forEach((param) => next.delete(param));
      return next;
    });

  /** Chưa đăng nhập: cảnh báo rồi chuyển sang đăng nhập, xong quay lại đúng trang này. */
  const handleCreate = () => {
    if (authStatus === 'authenticated') {
      setIsFormOpen(true);
      return;
    }
    if (authStatus === 'anonymous') {
      void showLoginRequiredAlert().then(() => navigate(buildLoginPath(`${location.pathname}${location.search}`)));
    }
  };

  if (searchParams.get(VIEW_PARAM) === DASHBOARD_VIEW) {
    return (
      <Suspense fallback={<FullPageLoading />}>
        <IncidentDashboard
          workshops={workshopsQuery.data ?? []}
          isWorkshopsLoading={workshopsQuery.isLoading}
          onBack={closeDashboard}
        />
      </Suspense>
    );
  }

  return (
    // ≥ lg: trang cao bằng phần dưới header (64px) để khung bảng cố định, thân bảng cuộn bên trong
    <div className="flex w-full flex-col gap-3 px-4 py-4 md:px-6 lg:h-[calc(100dvh-64px)] xl:px-10">
      <RibbonTitle title="BÁO CÁO SỰ CỐ" />

      <IncidentFilterBar
        values={filterValues}
        workshops={workshopsQuery.data ?? []}
        isWorkshopsLoading={workshopsQuery.isLoading}
        isRefreshing={incidentsQuery.isFetching}
        onChange={handleFilterChange}
        onReset={handleReset}
        onRefresh={() => incidentsQuery.refetch()}
        onCreate={handleCreate}
        onOpenDashboard={openDashboard}
      />

      {incidentsQuery.isError && !incidentsQuery.data ? (
        <ErrorState error={incidentsQuery.error} onRetry={() => incidentsQuery.refetch()} />
      ) : (
        <IncidentTable
          incidents={incidentsQuery.data?.items ?? []}
          totalCount={incidentsQuery.data?.totalCount ?? 0}
          pageIndex={pageIndex}
          pageSize={pageSize}
          isLoading={incidentsQuery.isFetching}
          onPageChange={handlePageChange}
        />
      )}

      <IncidentFormModal open={isFormOpen} workshops={workshopsQuery.data ?? []} onClose={() => setIsFormOpen(false)} />
    </div>
  );
};

export default IncidentListPage;
