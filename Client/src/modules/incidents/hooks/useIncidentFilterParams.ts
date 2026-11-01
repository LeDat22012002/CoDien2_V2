import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import type { IncidentFilterValues } from '@/modules/incidents/components/IncidentFilterBar';
import { INCIDENT_PAGE_SIZE } from '@/modules/incidents/constants/incidentOptions';
import type { IncidentFilter } from '@/modules/incidents/types/incidents';

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
 * Bộ lọc + phân trang danh sách báo cáo sự cố lưu trên URL (dùng chung trang công khai và trang cá nhân).
 * Ô chữ (mã thiết bị, từ khóa) ghi lên URL sau khi ngừng gõ; đổi bộ lọc thì về trang 1.
 */
export const useIncidentFilterParams = () => {
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

  /** Bộ lọc gửi API (trang tự thêm phạm vi riêng như onlyMine). */
  const filter: IncidentFilter = {
    shift: getParam('shift'),
    workshopId,
    equipmentCode: equipmentCode || undefined,
    incidentType: getParam('incidentType'),
    stopLevel: getParam('stopLevel'),
    affectsProduction: affectsProduction === undefined ? undefined : affectsProduction === 'true',
    keyword: keyword || undefined,
    pageIndex,
    pageSize,
  };

  /** Giá trị đang hiện trên thanh lọc (ô chữ là giá trị đang gõ). */
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
      // Đổi số dòng/trang thì về trang 1
      nextPageSize !== pageSize,
    );

  return { filter, filterValues, pageIndex, pageSize, handleFilterChange, handleReset, handlePageChange };
};
