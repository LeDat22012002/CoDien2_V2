import {
  ClockCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  FileSearchOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import { App, Button, Skeleton, Tooltip, type TableColumnsType } from 'antd';
import { useState, type ReactNode } from 'react';
import { ErrorState } from '@/shared/components/ErrorState';
import { PageHeader } from '@/shared/components/PageHeader';
import { COLUMN_WIDTH } from '@/shared/constants/tableColumns';
import { notify } from '@/shared/utils/notify';
import { IncidentAnalysisModal } from '@/modules/incidents/components/IncidentAnalysisModal';
import { IncidentFilterBar } from '@/modules/incidents/components/IncidentFilterBar';
import { IncidentFormModal, type IncidentFormMode } from '@/modules/incidents/components/IncidentFormModal';
import { IncidentSupplementModal } from '@/modules/incidents/components/IncidentSupplementModal';
import { IncidentTable } from '@/modules/incidents/components/IncidentTable';
import { useIncidentFilterParams } from '@/modules/incidents/hooks/useIncidentFilterParams';
import {
  useDeleteIncident,
  useIncidents,
  useIncidentWorkshops,
  useMyIncidentScope,
} from '@/modules/incidents/hooks/useIncidentQueries';
import type { Incident, IncidentScope } from '@/modules/incidents/types/incidents';
import { getIncidentRowPermissions } from '@/modules/incidents/utils/incidentPermissions';

/** Modal đang thao tác: form (thêm / sửa đầy đủ / tiến độ), bổ sung, phân tích. */
type DialogState =
  | { type: 'form'; incident?: Incident; mode: IncidentFormMode }
  | { type: 'supplement'; incident: Incident }
  | { type: 'analysis'; incident: Incident };

interface ActionButtonProps {
  title: string;
  icon: ReactNode;
  onClick: () => void;
  isDanger?: boolean;
}

const ActionButton = ({ title, icon, onClick, isDanger = false }: ActionButtonProps) => (
  <Tooltip title={title}>
    <Button type="text" danger={isDanger} aria-label={title} icon={icon} onClick={onClick} />
  </Tooltip>
);

/** Phạm vi danh sách theo quyền: quản lý xem mọi xưởng; người phân tích xem xưởng mình; còn lại báo cáo mình nhập. */
const getScopeDescription = (scope: IncidentScope) => {
  if (scope.canManage) return 'Quản lý báo cáo sự cố: xem, sửa, phân tích và xóa báo cáo của mọi xưởng.';
  if (scope.canAnalyze && scope.workshopId) {
    return `Báo cáo của ${scope.workshopName}: cập nhật báo cáo mình nhập, bổ sung số order / biên bản và phân tích sự cố của xưởng.`;
  }
  return 'Báo cáo do bạn nhập: cập nhật thời gian, mô tả, phương án xử lý và bổ sung số order / biên bản.';
};

/**
 * Báo cáo sự cố của tôi (route /member/incidents), như BaoCaoSuCoTheoXuong hệ thống cũ.
 * Nút từng dòng theo quyền (getIncidentRowPermissions); Server kiểm tra lại khi lưu.
 */
const MyIncidentsPage = () => {
  const { modal } = App.useApp();
  const { filter, filterValues, pageIndex, pageSize, handleFilterChange, handleReset, handlePageChange } =
    useIncidentFilterParams();
  // Đóng modal chỉ tắt cờ open, giữ dữ liệu dòng để nội dung không chớp trong lúc modal mờ dần
  const [dialog, setDialog] = useState<DialogState>({ type: 'form', mode: 'full' });
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const scopeQuery = useMyIncidentScope();
  const scope = scopeQuery.data;
  const workshopsQuery = useIncidentWorkshops();
  const deleteMutation = useDeleteIncident();

  const isWorkshopLocked = Boolean(scope && !scope.canManage && scope.canAnalyze && scope.workshopId);
  const incidentsQuery = useIncidents(
    {
      ...filter,
      workshopId: isWorkshopLocked ? (scope?.workshopId ?? undefined) : filter.workshopId,
      onlyMine: Boolean(scope && !scope.canManage && !isWorkshopLocked) || undefined,
    },
    Boolean(scope),
  );

  const openDialog = (next: DialogState) => {
    setDialog(next);
    setIsDialogOpen(true);
  };
  const closeDialog = () => setIsDialogOpen(false);

  const handleDelete = (incident: Incident) =>
    modal.confirm({
      title: 'Xóa báo cáo sự cố?',
      content: `${incident.equipmentCode} · ${incident.deviceName || incident.equipmentName}. Không khôi phục được sau khi xóa.`,
      okText: 'Xóa',
      okButtonProps: { danger: true },
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          await deleteMutation.mutateAsync(incident.id);
          notify.success('Xóa báo cáo sự cố thành công.');
        } catch (error) {
          notify.apiError(error);
        }
      },
    });

  const actionColumn: TableColumnsType<Incident>[number] = {
    title: 'Thao tác',
    key: 'actions',
    width: COLUMN_WIDTH.actions,
    align: 'center',
    fixed: 'right',
    render: (_, incident) => {
      if (!scope) return null;
      const permissions = getIncidentRowPermissions(incident, scope);
      return (
        <div className="flex items-center justify-center">
          {permissions.canManage && (
            <ActionButton
              title="Sửa báo cáo"
              icon={<EditOutlined className="text-primary" />}
              onClick={() => openDialog({ type: 'form', incident, mode: 'full' })}
            />
          )}
          {/* Quản lý đã sửa được mọi trường ở "Sửa báo cáo" */}
          {!permissions.canManage && permissions.canUpdateProgress && (
            <ActionButton
              title="Cập nhật thời gian, mô tả sự cố"
              icon={<ClockCircleOutlined className="text-primary" />}
              onClick={() => openDialog({ type: 'form', incident, mode: 'progress' })}
            />
          )}
          {!permissions.canManage && permissions.canSupplement && (
            <ActionButton
              title="Bổ sung số order, link biên bản"
              icon={<LinkOutlined className="text-primary" />}
              onClick={() => openDialog({ type: 'supplement', incident })}
            />
          )}
          {permissions.canAnalyze && (
            <ActionButton
              title="Phân tích sự cố"
              icon={<FileSearchOutlined className="text-success" />}
              onClick={() => openDialog({ type: 'analysis', incident })}
            />
          )}
          {permissions.canManage && (
            <ActionButton
              title="Xóa báo cáo"
              icon={<DeleteOutlined />}
              isDanger
              onClick={() => handleDelete(incident)}
            />
          )}
        </div>
      );
    },
  };

  const renderContent = () => {
    if (scopeQuery.isPending) return <Skeleton active paragraph={{ rows: 8 }} />;
    if (scopeQuery.isError) return <ErrorState error={scopeQuery.error} onRetry={() => scopeQuery.refetch()} />;
    if (incidentsQuery.isError && !incidentsQuery.data) {
      return <ErrorState error={incidentsQuery.error} onRetry={() => incidentsQuery.refetch()} />;
    }
    return (
      <IncidentTable
        incidents={incidentsQuery.data?.items ?? []}
        totalCount={incidentsQuery.data?.totalCount ?? 0}
        pageIndex={pageIndex}
        pageSize={pageSize}
        isLoading={incidentsQuery.isFetching}
        onPageChange={handlePageChange}
        actionColumn={actionColumn}
      />
    );
  };

  return (
    // Trang cao bằng phần còn lại của màn hình (trừ header 56px + padding Content) để khung bảng cố định
    <div className="flex h-[calc(100dvh-88px)] flex-col md:h-[calc(100dvh-104px)]">
      <PageHeader title="Báo cáo sự cố" description={scope ? getScopeDescription(scope) : undefined} />

      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <IncidentFilterBar
          values={isWorkshopLocked ? { ...filterValues, workshopId: scope?.workshopId ?? undefined } : filterValues}
          workshops={workshopsQuery.data ?? []}
          isWorkshopsLoading={workshopsQuery.isLoading}
          isRefreshing={incidentsQuery.isFetching}
          isWorkshopLocked={isWorkshopLocked}
          onChange={handleFilterChange}
          onReset={handleReset}
          onRefresh={() => incidentsQuery.refetch()}
          onCreate={() => openDialog({ type: 'form', mode: 'full' })}
        />
        {renderContent()}
      </div>

      <IncidentFormModal
        open={isDialogOpen && dialog.type === 'form'}
        incident={dialog.type === 'form' ? dialog.incident : undefined}
        mode={dialog.type === 'form' ? dialog.mode : 'full'}
        workshops={workshopsQuery.data ?? []}
        onClose={closeDialog}
      />
      <IncidentSupplementModal
        open={isDialogOpen && dialog.type === 'supplement'}
        incident={dialog.type === 'supplement' ? dialog.incident : null}
        onClose={closeDialog}
      />
      <IncidentAnalysisModal
        open={isDialogOpen && dialog.type === 'analysis'}
        incident={dialog.type === 'analysis' ? dialog.incident : null}
        onClose={closeDialog}
      />
    </div>
  );
};

export default MyIncidentsPage;
