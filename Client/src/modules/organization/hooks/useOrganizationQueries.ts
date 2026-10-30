import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ORG_QUERY_KEYS } from '@/shared/hooks/useOrgStructure';
import {
  createOrgUnit,
  deleteOrgUnit,
  getOrgChart,
  getPositionLevels,
  reorderOrgUnits,
  updateOrgUnit,
  updatePositionLevel,
} from '@/modules/organization/api/organizationApi';
import type { UpdateOrgUnitRequest, UpdatePositionLevelRequest } from '@/modules/organization/types/organization';

export const ORGANIZATION_QUERY_KEYS = {
  positionLevels: ['position-levels'] as const,
  orgChart: ['org-chart', 'tree'] as const,
};

/** Cây sơ đồ tổ chức (trang công khai). */
export const useOrgChart = () =>
  useQuery({
    queryKey: ORGANIZATION_QUERY_KEYS.orgChart,
    queryFn: getOrgChart,
  });

/** Đổi đơn vị → làm mới danh sách đơn vị (mọi bộ lọc) và danh sách nhân viên (tên đơn vị hiển thị ở đó). */
const useInvalidateOrgUnits = () => {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ORG_QUERY_KEYS.orgUnits }),
      queryClient.invalidateQueries({ queryKey: ['employees'] }),
    ]);
};

// ----- Đơn vị -----

export const useCreateOrgUnit = () => {
  const invalidate = useInvalidateOrgUnits();
  return useMutation({ mutationFn: createOrgUnit, onSuccess: invalidate });
};

export const useUpdateOrgUnit = () => {
  const invalidate = useInvalidateOrgUnits();
  return useMutation({
    mutationFn: ({ id, request }: { id: number; request: UpdateOrgUnitRequest }) => updateOrgUnit(id, request),
    onSuccess: invalidate,
  });
};

/** Luôn tải lại sau khi gọi (kể cả lỗi) để thứ tự trên màn hình khớp dữ liệu thật. */
export const useReorderOrgUnits = () => {
  const invalidate = useInvalidateOrgUnits();
  return useMutation({ mutationFn: reorderOrgUnits, onSettled: invalidate });
};

export const useDeleteOrgUnit = () => {
  const invalidate = useInvalidateOrgUnits();
  return useMutation({ mutationFn: deleteOrgUnit, onSuccess: invalidate });
};

// ----- Cấp bậc -----

export const usePositionLevels = () =>
  useQuery({ queryKey: ORGANIZATION_QUERY_KEYS.positionLevels, queryFn: getPositionLevels });

/** Đổi cấp bậc → làm mới danh sách cấp bậc và lookups (ô chọn cấp bậc ở các trang khác). */
export const useUpdatePositionLevel = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ code, request }: { code: string; request: UpdatePositionLevelRequest }) =>
      updatePositionLevel(code, request),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ORGANIZATION_QUERY_KEYS.positionLevels }),
        queryClient.invalidateQueries({ queryKey: ORG_QUERY_KEYS.lookups }),
      ]),
  });
};
