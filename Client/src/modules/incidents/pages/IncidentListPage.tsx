import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router';
import { ErrorState } from '@/shared/components/ErrorState';
import { RibbonTitle } from '@/shared/components/RibbonTitle';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { showLoginRequiredAlert } from '@/shared/utils/alert';
import { buildLoginPath } from '@/shared/utils/redirect';
import { useAuthStore } from '@/stores/authStore';
import { IncidentFilterBar, type IncidentFilterValues } from '@/modules/incidents/components/IncidentFilterBar';
import { IncidentFormModal } from '@/modules/incidents/components/IncidentFormModal';
import { IncidentTable } from '@/modules/incidents/components/IncidentTable';
import { INCIDENT_PAGE_SIZE } from '@/modules/incidents/constants/incidentOptions';
import { useIncidents, useIncidentWorkshops } from '@/modules/incidents/hooks/useIncidentQueries';

const SEARCH_DEBOUNCE_MS = 400;

/** Tham số trên URL để F5 / quay lại không mất bộ lọc và trang. */
const PARAMS = {
  shift: 'shift',
  workshopId: 'workshop',
  equipmentCode: 'eq',
  incidentType: 'type',
  stopLevel: 'stop',
  affectsProduction: 'ahsx',
  keyword: 'q',
  page: 'page',
  pageSize: 'limit',
} as const;

type ParamKey = keyof typeof PARAMS;
type TextFilterKey = 'equipmentCode' | 'keyword';

/**
 * Báo cáo sự cố (route /incidents, trang công khai), dựng lại theo BaoCaoSuCo hệ thống cũ:
 * lọc + bảng + phân trang, báo cáo quá hạn bổ sung / phân tích được đánh dấu đỏ.
 * Ai cũng xem được; thêm báo cáo cần đăng nhập (Server kiểm tra).
 */
const IncidentListPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const authStatus = useAuthStore((state) => state.status);
  const [searchParams, setSearchParams] = useSearchParams();

  const getParam = (key: ParamKey) => searchParams.get(PARAMS[key]) ?? undefined;
  const equipmentCode = getParam('equipmentCode') ?? '';
  const keyword = getParam('keyword') ?? '';
  const affectsProduction = getParam('affectsProduction');
  const workshopId = Number(getParam('workshopId')) || undefined;
  const pageIndex = Number(getParam('page')) || 1;
  const pageSize = Number(getParam('pageSize')) || INCIDENT_PAGE_SIZE;

  const [textInputs, setTextInputs] = useState<Record<TextFilterKey, string>>({ equipmentCode, keyword });
  const debouncedEquipmentCode = useDebouncedValue(textInputs.equipmentCode.trim(), SEARCH_DEBOUNCE_MS);
  const debouncedKeyword = useDebouncedValue(textInputs.keyword.trim(), SEARCH_DEBOUNCE_MS);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const workshopsQuery = useIncidentWorkshops();
  const incidentsQuery = useIncidents({
    shift: getParam('shift'),
    workshopId,
    equipmentCode: equipmentCode || undefined,
    incidentType: getParam('incidentType'),
    stopLevel: getParam('stopLevel'),
    affectsProduction: affectsProduction === undefined ? undefined : affectsProduction === 'true',
    keyword: keyword || undefined,
    pageIndex,
    pageSize,
  });

  /** Ghi tham số lên URL; đổi bộ lọc thì về trang 1. */
  const updateParams = (patch: Partial<Record<ParamKey, string | number | undefined>>, resetPage = true) =>
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        Object.entries(patch).forEach(([key, value]) => {
          const param = PARAMS[key as ParamKey];
          if (value === undefined || value === '') next.delete(param);
          else next.set(param, String(value));
        });
        if (resetPage) next.delete(PARAMS.page);
        return next;
      },
      { replace: true },
    );

  // Ô chữ → URL (sau khi ngừng gõ)
  useEffect(() => {
    if (debouncedEquipmentCode !== equipmentCode || debouncedKeyword !== keyword) {
      updateParams({ equipmentCode: debouncedEquipmentCode, keyword: debouncedKeyword });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ chạy khi người dùng ngừng gõ
  }, [debouncedEquipmentCode, debouncedKeyword]);

  const filterValues: IncidentFilterValues = {
    shift: getParam('shift'),
    workshopId,
    equipmentCode: textInputs.equipmentCode,
    incidentType: getParam('incidentType'),
    stopLevel: getParam('stopLevel'),
    affectsProduction,
    keyword: textInputs.keyword,
  };

  const handleFilterChange = (patch: Partial<IncidentFilterValues>) => {
    const { equipmentCode: nextEquipmentCode, keyword: nextKeyword, ...selectPatch } = patch;
    if (nextEquipmentCode !== undefined || nextKeyword !== undefined) {
      setTextInputs((previous) => ({
        equipmentCode: nextEquipmentCode ?? previous.equipmentCode,
        keyword: nextKeyword ?? previous.keyword,
      }));
    }
    if (Object.keys(selectPatch).length > 0) updateParams(selectPatch);
  };

  const handleReset = () => {
    setTextInputs({ equipmentCode: '', keyword: '' });
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  const handlePageChange = (nextPage: number, nextPageSize: number) =>
    updateParams(
      {
        page: nextPage === 1 ? undefined : nextPage,
        pageSize: nextPageSize === INCIDENT_PAGE_SIZE ? undefined : nextPageSize,
      },
      nextPageSize !== pageSize,
    );

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
