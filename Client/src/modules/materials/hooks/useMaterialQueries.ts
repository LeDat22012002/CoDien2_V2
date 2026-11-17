import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  createMaterial,
  deleteMaterial,
  getMaterialLookups,
  getMaterials,
  updateMaterial,
} from "@/modules/materials/api/materialsApi";
import type {
  MaterialFilter,
  MaterialRequest,
} from "@/modules/materials/types/materials";

export const MATERIAL_QUERY_KEYS = {
  all: ["materials"] as const,
  list: (filter: MaterialFilter) => ["materials", "list", filter] as const,
  lookups: ["materials", "lookups"] as const,
};

export const useMaterials = (filter: MaterialFilter) =>
  useQuery({
    queryKey: MATERIAL_QUERY_KEYS.list(filter),
    queryFn: () => getMaterials(filter),
    placeholderData: keepPreviousData,
  });

export const useMaterialLookups = () =>
  useQuery({
    queryKey: MATERIAL_QUERY_KEYS.lookups,
    queryFn: getMaterialLookups,
    staleTime: 10 * 60_000,
  });

/**
 * Ghi xong làm mới danh sách + giá trị lọc, và cả gợi ý mã vật tư ở báo cáo tuần
 * (query key ['workReports', 'materialOptions', …]) để mã vừa thêm/sửa gợi ý được ngay.
 */
const useInvalidateMaterials = () => {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: MATERIAL_QUERY_KEYS.all }),
      queryClient.invalidateQueries({
        queryKey: ["workReports", "materialOptions"],
      }),
    ]);
};

export const useCreateMaterial = () => {
  const invalidate = useInvalidateMaterials();
  return useMutation({ mutationFn: createMaterial, onSuccess: invalidate });
};

export const useUpdateMaterial = () => {
  const invalidate = useInvalidateMaterials();
  return useMutation({
    mutationFn: ({ id, request }: { id: number; request: MaterialRequest }) =>
      updateMaterial(id, request),
    onSuccess: invalidate,
  });
};

export const useDeleteMaterial = () => {
  const invalidate = useInvalidateMaterials();
  return useMutation({ mutationFn: deleteMaterial, onSuccess: invalidate });
};
