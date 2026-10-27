import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  changeAssignment,
  endAssignment,
  getAssignmentHistory,
  getEmployeeAssignments,
  getOrgLookups,
  getOrgUnits,
  getUnitMembers,
  searchActiveEmployees,
} from '@/shared/api/orgStructureApi';
import type { EndAssignmentRequest, OrgUnitFilter } from '@/shared/types/organization';

const CATALOG_STALE_TIME = 5 * 60_000;

export const ORG_QUERY_KEYS = {
  orgUnits: ['org-units'] as const,
  orgUnitList: (filter?: OrgUnitFilter) => ['org-units', filter ?? {}] as const,
  lookups: ['org-chart', 'lookups'] as const,
  members: ['org-chart', 'members'] as const,
  unitMembers: (orgUnitId: number) => ['org-chart', 'members', orgUnitId] as const,
  employeeAssignments: (employeeId: number) => ['employees', 'assignments', employeeId] as const,
  employeeSearch: (keyword: string) => ['employees', 'search', keyword] as const,
  history: (empCode: string) => ['employees', 'history', empCode] as const,
};

/** Key danh sách nhân viên (module employees) — vị trí nhân viên đổi thì danh sách phải tải lại. */
const EMPLOYEES_QUERY_KEY = ['employees'] as const;

// ----- Đọc -----

export const useOrgUnits = (isEnabled = true, filter?: OrgUnitFilter) =>
  useQuery({
    queryKey: ORG_QUERY_KEYS.orgUnitList(filter),
    queryFn: () => getOrgUnits(filter),
    enabled: isEnabled,
    staleTime: CATALOG_STALE_TIME,
  });

export const useOrgLookups = (isEnabled = true) =>
  useQuery({
    queryKey: ORG_QUERY_KEYS.lookups,
    queryFn: getOrgLookups,
    enabled: isEnabled,
    staleTime: CATALOG_STALE_TIME,
  });

export const useUnitMembers = (orgUnitId: number | undefined) =>
  useQuery({
    queryKey: ORG_QUERY_KEYS.unitMembers(orgUnitId ?? 0),
    queryFn: () => getUnitMembers(orgUnitId ?? 0),
    enabled: orgUnitId !== undefined,
  });

export const useEmployeeAssignments = (employeeId: number | undefined) =>
  useQuery({
    queryKey: ORG_QUERY_KEYS.employeeAssignments(employeeId ?? 0),
    queryFn: () => getEmployeeAssignments(employeeId ?? 0),
    enabled: employeeId !== undefined,
    staleTime: 0,
  });

export const useActiveEmployeeSearch = (keyword: string, isEnabled: boolean) =>
  useQuery({
    queryKey: ORG_QUERY_KEYS.employeeSearch(keyword),
    queryFn: () => searchActiveEmployees(keyword),
    enabled: isEnabled,
  });

export const useAssignmentHistory = (empCode: string | undefined) =>
  useQuery({
    queryKey: ORG_QUERY_KEYS.history(empCode ?? ''),
    queryFn: () => getAssignmentHistory(empCode ?? ''),
    enabled: Boolean(empCode),
  });

// ----- Ghi: đổi vị trí thì làm mới người trong đơn vị + danh sách nhân viên -----

export const useInvalidateAssignments = () => {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ORG_QUERY_KEYS.members }),
      queryClient.invalidateQueries({ queryKey: EMPLOYEES_QUERY_KEY }),
    ]);
};

export const useChangeAssignment = () => {
  const invalidate = useInvalidateAssignments();
  return useMutation({ mutationFn: changeAssignment, onSuccess: invalidate });
};

export const useEndAssignment = () => {
  const invalidate = useInvalidateAssignments();
  return useMutation({
    mutationFn: ({ assignmentId, request }: { assignmentId: number; request: EndAssignmentRequest }) =>
      endAssignment(assignmentId, request),
    onSuccess: invalidate,
  });
};
