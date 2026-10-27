import { PlusOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { AssignmentChangeModal } from '@/shared/components/AssignmentChangeModal';
import { ErrorState } from '@/shared/components/ErrorState';
import { PageHeader } from '@/shared/components/PageHeader';
import { PERMISSION_CODES } from '@/shared/constants/permissionCodes';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { useOrgLookups, useOrgUnits } from '@/shared/hooks/useOrgStructure';
import { useHasPermission } from '@/stores/authStore';
import { AssignmentHistoryDrawer } from '@/modules/employees/components/AssignmentHistoryDrawer';
import { DeactivateEmployeeModal } from '@/modules/employees/components/DeactivateEmployeeModal';
import { EmployeeFilterBar } from '@/modules/employees/components/EmployeeFilterBar';
import { EmployeeFormModal } from '@/modules/employees/components/EmployeeFormModal';
import { EmployeeTable, type EmployeeRowAction } from '@/modules/employees/components/EmployeeTable';
import { EndAssignmentModal } from '@/modules/employees/components/EndAssignmentModal';
import {
  DEFAULT_STATUS_FILTER,
  EMPLOYEE_PAGE_SIZE,
  STATUS_FILTER_OPTIONS,
  type EmployeeStatusFilter,
} from '@/modules/employees/constants/employeeOptions';
import { useEmployees } from '@/modules/employees/hooks/useEmployeeQueries';
import type { Employee } from '@/modules/employees/types/employees';

const SEARCH_DEBOUNCE_MS = 500;

/** Tham số trên URL (?q=&unit=&status=&page=&limit=) để F5 / quay lại không mất bộ lọc và trang. */
const PARAMS = {
  keyword: 'q',
  orgUnitId: 'unit',
  status: 'status',
  page: 'page',
  pageSize: 'limit',
} as const;

type ParamKey = keyof typeof PARAMS;

/** Modal / drawer đang mở cho 1 nhân viên. */
type RowDialog = { type: Exclude<EmployeeRowAction, 'edit'>; employee: Employee } | null;

/** Modal thêm / sửa; employeeId undefined = thêm mới. */
interface FormModalState {
  open: boolean;
  employeeId?: number;
}

/**
 * Quản lý nhân viên (route /admin/employees), dựng lại theo ManageNhanVien hệ thống cũ:
 * danh sách + lọc + phân trang, thêm / sửa, điều chuyển / bổ nhiệm, thôi giữ vị trí, lịch sử công tác, cho nghỉ việc.
 * Ẩn/hiện nút theo quyền chỉ để hiển thị, Server kiểm tra thật.
 */
const EmployeeListPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const keyword = searchParams.get(PARAMS.keyword) ?? '';
  const orgUnitId = Number(searchParams.get(PARAMS.orgUnitId)) || undefined;
  const status =
    STATUS_FILTER_OPTIONS.find((option) => option.value === searchParams.get(PARAMS.status))?.value ??
    DEFAULT_STATUS_FILTER;
  const pageIndex = Number(searchParams.get(PARAMS.page)) || 1;
  const pageSize = Number(searchParams.get(PARAMS.pageSize)) || EMPLOYEE_PAGE_SIZE;

  const canCreate = useHasPermission(PERMISSION_CODES.employees.create);
  const canUpdate = useHasPermission(PERMISSION_CODES.employees.update);
  const canViewOrgChart = useHasPermission(PERMISSION_CODES.orgChart.view);
  const canManageAssignments = useHasPermission(PERMISSION_CODES.assignments.manage);
  const canViewHistory = useHasPermission(PERMISSION_CODES.assignments.view, PERMISSION_CODES.assignments.manage);

  const [keywordInput, setKeywordInput] = useState(keyword);
  const debouncedKeyword = useDebouncedValue(keywordInput.trim(), SEARCH_DEBOUNCE_MS);
  const [formModal, setFormModal] = useState<FormModalState>({ open: false });
  const [rowDialog, setRowDialog] = useState<RowDialog>(null);

  // Danh mục đơn vị (bộ lọc + form) và cấp bậc / loại đơn vị: cần quyền xem sơ đồ tổ chức
  const unitsQuery = useOrgUnits(canViewOrgChart);
  const lookupsQuery = useOrgLookups(canViewOrgChart);
  const units = unitsQuery.data ?? [];
  const levels = lookupsQuery.data?.positionLevels ?? [];
  const unitTypes = lookupsQuery.data?.orgUnitTypes ?? [];
  const canAssign = canManageAssignments && units.length > 0 && levels.length > 0;

  const employeesQuery = useEmployees({
    keyword: keyword || undefined,
    orgUnitId,
    status: status === 'ALL' ? undefined : status,
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

  // Ô tìm kiếm → URL (sau 500ms ngừng gõ)
  useEffect(() => {
    if (debouncedKeyword !== keyword) updateParams({ keyword: debouncedKeyword });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ chạy khi người dùng ngừng gõ
  }, [debouncedKeyword]);

  const handlePageChange = (nextPage: number, nextPageSize: number) =>
    updateParams(
      {
        page: nextPage === 1 ? undefined : nextPage,
        pageSize: nextPageSize === EMPLOYEE_PAGE_SIZE ? undefined : nextPageSize,
      },
      // Đổi số dòng/trang thì về trang 1
      nextPageSize !== pageSize,
    );

  const handleRowAction = (action: EmployeeRowAction, employee: Employee) => {
    if (action === 'edit') setFormModal({ open: true, employeeId: employee.id });
    else setRowDialog({ type: action, employee });
  };

  const closeRowDialog = () => setRowDialog(null);
  const dialogEmployee = (type: Exclude<EmployeeRowAction, 'edit'>) =>
    rowDialog?.type === type ? rowDialog.employee : null;

  return (
    // Trang cao bằng phần còn lại của màn hình (trừ header 56px + padding Content của PrivateLayout)
    // để khung bảng cố định, thân bảng cuộn bên trong
    <div className="flex h-[calc(100dvh-88px)] flex-col md:h-[calc(100dvh-104px)]">
      <PageHeader
        title="Quản lý nhân viên"
        description="Thêm, sửa thông tin, điều chuyển và cho nghỉ việc. Mọi thay đổi có hiệu lực ngay khi lưu."
        extra={
          canCreate && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setFormModal({ open: true })}>
              Thêm nhân viên
            </Button>
          )
        }
      />

      <div className="flex min-h-0 flex-1 flex-col rounded-md bg-bg-container p-3 md:p-4">
        <EmployeeFilterBar
          keyword={keywordInput}
          orgUnitId={orgUnitId}
          status={status}
          units={units}
          isUnitsLoading={unitsQuery.isLoading}
          isRefreshing={employeesQuery.isFetching}
          onKeywordChange={setKeywordInput}
          onOrgUnitChange={(value) => updateParams({ orgUnitId: value })}
          onStatusChange={(value: EmployeeStatusFilter) =>
            updateParams({ status: value === DEFAULT_STATUS_FILTER ? undefined : value })
          }
          onRefresh={() => employeesQuery.refetch()}
        />

        {employeesQuery.isError && !employeesQuery.data ? (
          <ErrorState error={employeesQuery.error} onRetry={() => employeesQuery.refetch()} />
        ) : (
          <EmployeeTable
            employees={employeesQuery.data?.items ?? []}
            totalCount={employeesQuery.data?.totalCount ?? 0}
            pageIndex={pageIndex}
            pageSize={pageSize}
            isLoading={employeesQuery.isFetching}
            permissions={{
              canUpdate,
              canManageAssignments: canManageAssignments && units.length > 0,
              canViewHistory,
            }}
            onPageChange={handlePageChange}
            onAction={handleRowAction}
          />
        )}
      </div>

      <EmployeeFormModal
        open={formModal.open}
        employeeId={formModal.employeeId}
        units={units}
        levels={levels}
        canAssign={canAssign}
        onClose={() => setFormModal((previous) => ({ ...previous, open: false }))}
      />
      <AssignmentChangeModal
        open={rowDialog?.type === 'change'}
        employee={dialogEmployee('change')}
        units={units}
        levels={levels}
        unitTypes={unitTypes}
        onClose={closeRowDialog}
      />
      <EndAssignmentModal employee={dialogEmployee('end')} onClose={closeRowDialog} />
      <AssignmentHistoryDrawer employee={dialogEmployee('history')} onClose={closeRowDialog} />
      <DeactivateEmployeeModal employee={dialogEmployee('deactivate')} onClose={closeRowDialog} />
    </div>
  );
};

export default EmployeeListPage;
