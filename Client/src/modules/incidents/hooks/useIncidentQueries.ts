import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createIncident,
  getEquipmentOptions,
  getIncidents,
  getIncidentWorkshops,
} from '@/modules/incidents/api/incidentsApi';
import type { IncidentFilter } from '@/modules/incidents/types/incidents';

export const INCIDENT_QUERY_KEYS = {
  incidents: ['incidents'] as const,
  list: (filter: IncidentFilter) => ['incidents', 'list', filter] as const,
  workshops: ['incidents', 'workshops'] as const,
  equipmentOptions: (keyword: string) => ['equipments', 'options', keyword] as const,
};

/** Đổi trang / bộ lọc vẫn giữ dữ liệu cũ trong lúc tải để bảng không nháy rỗng. */
export const useIncidents = (filter: IncidentFilter) =>
  useQuery({
    queryKey: INCIDENT_QUERY_KEYS.list(filter),
    queryFn: () => getIncidents(filter),
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

export const useCreateIncident = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createIncident,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: INCIDENT_QUERY_KEYS.incidents }),
  });
};
