import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createEquipment,
  deleteEquipment,
  getEquipments,
  importDefaultEquipments,
  importEquipments,
  updateEquipment,
} from '@/modules/equipments/api/equipmentsApi';
import type {
  EquipmentFilter,
  EquipmentImportSheetConfig,
  EquipmentRequest,
} from '@/modules/equipments/types/equipments';

/** Cùng gốc ['equipments'] với ô chọn thiết bị của báo cáo sự cố, ghi xong làm mới cả hai. */
export const EQUIPMENT_QUERY_KEYS = {
  all: ['equipments'] as const,
  list: (filter: EquipmentFilter) => ['equipments', 'list', filter] as const,
};

export const useEquipments = (filter: EquipmentFilter) =>
  useQuery({
    queryKey: EQUIPMENT_QUERY_KEYS.list(filter),
    queryFn: () => getEquipments(filter),
    placeholderData: keepPreviousData,
  });

const useInvalidateEquipments = () => {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: EQUIPMENT_QUERY_KEYS.all });
};

export const useCreateEquipment = () => {
  const invalidate = useInvalidateEquipments();
  return useMutation({ mutationFn: createEquipment, onSuccess: invalidate });
};

export const useUpdateEquipment = () => {
  const invalidate = useInvalidateEquipments();
  return useMutation({
    mutationFn: ({ id, request }: { id: number; request: EquipmentRequest }) => updateEquipment(id, request),
    onSuccess: invalidate,
  });
};

export const useDeleteEquipment = () => {
  const invalidate = useInvalidateEquipments();
  return useMutation({ mutationFn: deleteEquipment, onSuccess: invalidate });
};

/** configs bỏ trống = import file danh mục gốc. */
export const useImportEquipments = () => {
  const invalidate = useInvalidateEquipments();
  return useMutation({
    mutationFn: ({ file, configs }: { file: File; configs?: EquipmentImportSheetConfig[] }) =>
      configs ? importEquipments(file, configs) : importDefaultEquipments(file),
    onSuccess: invalidate,
  });
};
