import { ReloadOutlined } from '@ant-design/icons';
import { App, Button, Card, Empty } from 'antd';
import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { AssignmentChangeModal } from '@/shared/components/AssignmentChangeModal';
import { ErrorState } from '@/shared/components/ErrorState';
import { PageHeader } from '@/shared/components/PageHeader';
import { PERMISSION_CODES } from '@/shared/constants/permissionCodes';
import { ORG_QUERY_KEYS, useOrgLookups, useOrgUnits } from '@/shared/hooks/useOrgStructure';
import type { AssignableEmployee, OrgUnit, OrgUnitFilter, OrgUnitTypeCode } from '@/shared/types/organization';
import { notify } from '@/shared/utils/notify';
import { groupChildren } from '@/shared/utils/orgUnitTree';
import { useHasPermission } from '@/stores/authStore';
import { OrgUnitFormModal, type OrgUnitFormMode } from '@/modules/organization/components/OrgUnitFormModal';
import { OrgUnitTreePanel } from '@/modules/organization/components/OrgUnitTreePanel';
import { UnitDetailPanel } from '@/modules/organization/components/UnitDetailPanel';
import { useDeleteOrgUnit, useReorderOrgUnits } from '@/modules/organization/hooks/useOrganizationQueries';

/** Gồm cả đơn vị đã xóa để gợi ý mã không trùng (mã đã dùng không được dùng lại). */
const UNIT_FILTER: OrgUnitFilter = { includeInactive: true };
const UNIT_PARAM = 'unit';
/** Mở sẵn Nhà máy + các Xưởng. */
const DEFAULT_EXPANDED_TYPES: OrgUnitTypeCode[] = ['FACTORY', 'WORKSHOP'];

interface FormModalState {
  open: boolean;
  mode: OrgUnitFormMode;
  typeCode?: OrgUnitTypeCode;
}

interface AssignState {
  open: boolean;
  employee: AssignableEmployee | null;
}

/**
 * Cơ cấu tổ chức (route /admin/org-units), dựng lại theo ManageCoCau hệ thống cũ:
 * cây đơn vị (trái) + chi tiết đơn vị đang chọn (phải). Thêm / sửa / chuyển / xóa / sắp xếp đơn vị;
 * bổ nhiệm, điều chuyển nhân sự ngay trong đơn vị. Đơn vị đang chọn lưu trên URL (?unit=id).
 */
const OrgUnitManagementPage = () => {
  const { modal } = App.useApp();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const canManage = useHasPermission(PERMISSION_CODES.orgUnits.manage);
  const canAssign = useHasPermission(PERMISSION_CODES.assignments.manage);

  const unitsQuery = useOrgUnits(true, UNIT_FILTER);
  const lookupsQuery = useOrgLookups();
  const reorderMutation = useReorderOrgUnits();
  const deleteMutation = useDeleteOrgUnit();

  const [keyword, setKeyword] = useState('');
  const [manualExpandedKeys, setManualExpandedKeys] = useState<number[] | null>(null);
  const [formModal, setFormModal] = useState<FormModalState>({ open: false, mode: 'create' });
  const [assign, setAssign] = useState<AssignState>({ open: false, employee: null });

  const units = useMemo(() => unitsQuery.data ?? [], [unitsQuery.data]);
  const unitTypes = lookupsQuery.data?.orgUnitTypes ?? [];
  const levels = lookupsQuery.data?.positionLevels ?? [];
  const disciplines = lookupsQuery.data?.disciplines ?? [];

  const activeUnits = useMemo(() => units.filter((unit) => unit.isActive), [units]);
  const childrenMap = useMemo(() => groupChildren(units), [units]);
  const unitsById = useMemo(() => new Map(activeUnits.map((unit) => [unit.id, unit])), [activeUnits]);

  // Chưa chọn (hoặc đơn vị đã bị xóa) → chọn Nhà máy
  const rootUnit = activeUnits.find((unit) => unit.parentId == null);
  const selected = unitsById.get(Number(searchParams.get(UNIT_PARAM))) ?? rootUnit;

  const defaultExpandedKeys = useMemo(
    () => activeUnits.filter((unit) => DEFAULT_EXPANDED_TYPES.includes(unit.typeCode)).map((unit) => unit.id),
    [activeUnits],
  );
  const expandedKeys = manualExpandedKeys ?? defaultExpandedKeys;

  /** Chọn đơn vị (lưu ?unit=) và mở nhánh cha để thấy trên cây. */
  const selectUnit = (unitId: number | null | undefined, parentId?: number | null) => {
    setSearchParams(unitId ? { [UNIT_PARAM]: String(unitId) } : {}, { replace: true });
    if (parentId) setManualExpandedKeys([...new Set([...expandedKeys, parentId])]);
  };

  // ----- Thao tác -----
  const handleSaved = (saved: OrgUnit) => {
    setFormModal((previous) => ({ ...previous, open: false }));
    selectUnit(saved.id, saved.parentId);
  };

  const handleDelete = (memberCount: number) => {
    if (!selected) return;
    const childCount = childrenMap.get(selected.id)?.length ?? 0;

    if (childCount > 0 || memberCount > 0) {
      modal.warning({
        title: `Chưa xóa được "${selected.name}"`,
        content: (
          <ul className="mb-0 list-disc pl-5">
            {childCount > 0 && <li>Còn {childCount} đơn vị con, cần chuyển sang đơn vị khác hoặc xóa trước.</li>}
            {memberCount > 0 && (
              <li>Còn {memberCount} người đang giữ vị trí, cần điều chuyển hoặc cho thôi giữ vị trí trước.</li>
            )}
          </ul>
        ),
      });
      return;
    }

    modal.confirm({
      title: `Xóa "${selected.name}"?`,
      content: 'Đơn vị sẽ bị ẩn khỏi cơ cấu và sơ đồ. Mã đơn vị vẫn được giữ, không dùng lại được.',
      okText: 'Xóa',
      okButtonProps: { danger: true },
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          await deleteMutation.mutateAsync(selected.id);
          notify.success('Xóa đơn vị thành công.');
          selectUnit(selected.parentId);
        } catch (error) {
          notify.apiError(error);
        }
      },
    });
  };

  /** Đổi chỗ đơn vị con thứ index với đơn vị liền trên / dưới, lưu ngay (cập nhật giao diện trước). */
  const handleMove = (index: number, delta: -1 | 1) => {
    if (!selected) return;
    const list = [...(childrenMap.get(selected.id) ?? [])];
    const target = index + delta;
    if (target < 0 || target >= list.length) return;
    [list[index], list[target]] = [list[target], list[index]];
    const orderedIds = list.map((unit) => unit.id);

    queryClient.setQueryData<OrgUnit[]>(ORG_QUERY_KEYS.orgUnitList(UNIT_FILTER), (previous) =>
      previous?.map((unit) =>
        orderedIds.includes(unit.id) ? { ...unit, sortOrder: orderedIds.indexOf(unit.id) + 1 } : unit,
      ),
    );
    reorderMutation.mutate({ parentId: selected.id, orderedIds }, { onError: (error) => notify.apiError(error) });
  };

  const handleReload = () =>
    Promise.all([unitsQuery.refetch(), queryClient.invalidateQueries({ queryKey: ORG_QUERY_KEYS.members })]);

  // ----- Hiển thị -----
  const renderDetail = () => {
    if (unitsQuery.isError) return <ErrorState error={unitsQuery.error} onRetry={() => unitsQuery.refetch()} />;
    if (!selected) return <Empty description={unitsQuery.isPending ? 'Đang tải…' : 'Chọn 1 đơn vị trong cây'} />;

    return (
      <UnitDetailPanel
        unit={selected}
        parent={selected.parentId ? unitsById.get(selected.parentId) : undefined}
        childUnits={childrenMap.get(selected.id) ?? []}
        unitTypes={unitTypes}
        levels={levels}
        disciplines={disciplines}
        isReordering={reorderMutation.isPending}
        canManage={canManage}
        canAssign={canAssign}
        onEdit={() => setFormModal({ open: true, mode: 'update' })}
        onAddChild={(typeCode) => setFormModal({ open: true, mode: 'create', typeCode })}
        onDelete={handleDelete}
        onSelect={(unitId) => selectUnit(unitId, unitsById.get(unitId)?.parentId)}
        onMove={handleMove}
        onAssign={(employee) => setAssign({ open: true, employee })}
      />
    );
  };

  return (
    // Desktop: trang cao bằng phần còn lại của màn hình, cây và chi tiết cuộn riêng
    <div className="flex flex-col lg:h-[calc(100dvh-104px)]">
      <PageHeader
        title="Cơ cấu tổ chức"
        description="Thêm, sửa, sắp xếp Xưởng / Đội / Ca / Tổ. Thay đổi hiển thị ngay trên sơ đồ tổ chức."
        extra={
          <Button icon={<ReloadOutlined />} onClick={handleReload} loading={unitsQuery.isFetching}>
            Tải lại
          </Button>
        }
      />

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[minmax(320px,400px)_1fr]">
        <Card
          size="small"
          title="Cây đơn vị"
          className="flex min-h-0 flex-col"
          styles={{ body: { padding: 8, flex: 1, minHeight: 0 } }}
        >
          <div className="h-[60dvh] lg:h-full">
            <OrgUnitTreePanel
              childrenMap={childrenMap}
              selectedId={selected?.id}
              keyword={keyword}
              expandedKeys={expandedKeys}
              isLoading={unitsQuery.isPending}
              onKeywordChange={setKeyword}
              onExpand={setManualExpandedKeys}
              onSelect={(unitId) => selectUnit(unitId)}
            />
          </div>
        </Card>

        <Card size="small" className="min-h-0 lg:overflow-auto">
          {renderDetail()}
        </Card>
      </div>

      <OrgUnitFormModal
        open={formModal.open}
        mode={formModal.mode}
        unit={formModal.mode === 'update' ? selected : undefined}
        parent={formModal.mode === 'create' ? selected : undefined}
        defaultTypeCode={formModal.typeCode}
        units={units}
        unitTypes={unitTypes}
        levels={levels}
        disciplines={disciplines}
        onClose={() => setFormModal((previous) => ({ ...previous, open: false }))}
        onSaved={handleSaved}
      />

      <AssignmentChangeModal
        open={assign.open}
        employee={assign.employee}
        defaultUnitCode={selected?.code}
        units={activeUnits}
        levels={levels}
        unitTypes={unitTypes}
        onClose={() => setAssign({ open: false, employee: null })}
      />
    </div>
  );
};

export default OrgUnitManagementPage;
