import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createIncident,
  deleteIncident,
  getEquipmentOptions,
  getIncidentDashboard,
  getIncidents,
  getIncidentWorkshops,
  getMyIncidentScope,
  getRepeatedEquipment,
  updateIncident,
  updateIncidentAnalysis,
  updateIncidentProgress,
  updateIncidentSupplement,
} from '@/modules/incidents/api/incidentsApi';
import type {
  IncidentDashboardFilter,
  IncidentFilter,
  UpdateIncidentAnalysisRequest,
  UpdateIncidentProgressRequest,
  UpdateIncidentRequest,
  UpdateIncidentSupplementRequest,
} from '@/modules/incidents/types/incidents';

export const INCIDENT_QUERY_KEYS = {
  incidents: ['incidents'] as const,
  list: (filter: IncidentFilter) => ['incidents', 'list', filter] as const,
  dashboard: (filter: IncidentDashboardFilter) => ['incidents', 'dashboard', filter] as const,
  repeatedEquipment: (filter: IncidentDashboardFilter) => ['incidents', 'repeated-equipment', filter] as const,
  workshops: ['incidents', 'workshops'] as const,
  /** Ngoài gốc ['incidents'] để ghi báo cáo không tải lại quyền. */
  myScope: ['incident-scope'] as const,
  equipmentOptions: (keyword: string) => ['equipments', 'options', keyword] as const,
};

/** Đổi trang / bộ lọc vẫn giữ dữ liệu cũ trong lúc tải để bảng không nháy rỗng. */
export const useIncidents = (filter: IncidentFilter, isEnabled = true) =>
  useQuery({
    queryKey: INCIDENT_QUERY_KEYS.list(filter),
    queryFn: () => getIncidents(filter),
    placeholderData: keepPreviousData,
    enabled: isEnabled,
  });

export const useIncidentDashboard = (filter: IncidentDashboardFilter) =>
  useQuery({
    queryKey: INCIDENT_QUERY_KEYS.dashboard(filter),
    queryFn: () => getIncidentDashboard(filter),
    placeholderData: keepPreviousData,
  });

export const useRepeatedEquipment = (filter: IncidentDashboardFilter) =>
  useQuery({
    queryKey: INCIDENT_QUERY_KEYS.repeatedEquipment(filter),
    queryFn: () => getRepeatedEquipment(filter),
    placeholderData: keepPreviousData,
  });

export const useIncidentWorkshops = () =>
  useQuery({
    queryKey: INCIDENT_QUERY_KEYS.workshops,
    queryFn: getIncidentWorkshops,
    staleTime: 5 * 60_000,
  });

export const useEquipmentOptions = (keyword: string, isEnabled: boolean) =>
  useQuery({
    queryKey: INCIDENT_QUERY_KEYS.equipmentOptions(keyword),
    queryFn: () => getEquipmentOptions(keyword),
    placeholderData: keepPreviousData,
    enabled: isEnabled,
  });

export const useMyIncidentScope = () =>
  useQuery({
    queryKey: INCIDENT_QUERY_KEYS.myScope,
    queryFn: getMyIncidentScope,
    staleTime: 5 * 60_000,
  });

// ----- Ghi: làm mới danh sách, dashboard, thiết bị lặp lại (cùng gốc ['incidents']) -----

const useInvalidateIncidents = () => {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: INCIDENT_QUERY_KEYS.incidents });
};

export const useCreateIncident = () => {
  const invalidate = useInvalidateIncidents();
  return useMutation({ mutationFn: createIncident, onSuccess: invalidate });
};

export const useUpdateIncident = () => {
  const invalidate = useInvalidateIncidents();
  return useMutation({
    mutationFn: ({ id, request }: { id: number; request: UpdateIncidentRequest }) => updateIncident(id, request),
    onSuccess: invalidate,
  });
};

export const useUpdateIncidentProgress = () => {
  const invalidate = useInvalidateIncidents();
  return useMutation({
    mutationFn: ({ id, request }: { id: number; request: UpdateIncidentProgressRequest }) =>
      updateIncidentProgress(id, request),
    onSuccess: invalidate,
  });
};

export const useUpdateIncidentSupplement = () => {
  const invalidate = useInvalidateIncidents();
  return useMutation({
    mutationFn: ({ id, request }: { id: number; request: UpdateIncidentSupplementRequest }) =>
      updateIncidentSupplement(id, request),
    onSuccess: invalidate,
  });
};

export const useUpdateIncidentAnalysis = () => {
  const invalidate = useInvalidateIncidents();
  return useMutation({
    mutationFn: ({ id, request }: { id: number; request: UpdateIncidentAnalysisRequest }) =>
      updateIncidentAnalysis(id, request),
    onSuccess: invalidate,
  });
};

export const useDeleteIncident = () => {
  const invalidate = useInvalidateIncidents();
  return useMutation({ mutationFn: deleteIncident, onSuccess: invalidate });
};
