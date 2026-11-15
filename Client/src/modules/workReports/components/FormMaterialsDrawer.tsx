import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { App, Button, Drawer, Empty, Grid, Table, Tooltip, Typography, type TableColumnsType } from 'antd';
import { useState } from 'react';
import { ErrorState } from '@/shared/components/ErrorState';
import { COLUMN_WIDTH } from '@/shared/constants/tableColumns';
import { EMPTY_TEXT, formatDate, formatNumber } from '@/shared/utils/format';
import { notify } from '@/shared/utils/notify';
import { MaterialFormModal } from '@/modules/workReports/components/MaterialFormModal';
import { PHASE_LABELS } from '@/modules/workReports/constants/workReportOptions';
import { useDeleteWorkMaterial, useFormMaterials } from '@/modules/workReports/hooks/useWorkReportQueries';
import type { WeeklyForm, WorkMaterial, WorkReportPhase, WorkWeek } from '@/modules/workReports/types/workReports';

interface FormMaterialsDrawerProps {
  open: boolean;
  form?: WeeklyForm;
  phase: WorkReportPhase;
  week: WorkWeek;
  onClose: () => void;
}

const text = (value?: string | null) =>
  value ? (
    <Typography.Text ellipsis={{ tooltip: value }} className="block">
      {value}
    </Typography.Text>
  ) : (
    <span className="text-text-secondary">{EMPTY_TEXT}</span>
  );

/** Vật tư sử dụng của 1 tổ/kíp trong tuần (sheet "Vật tư sử dụng"), gắn theo mã công việc. */
export const FormMaterialsDrawer = ({ open, form, phase, week, onClose }: FormMaterialsDrawerProps) => {
  const { modal } = App.useApp();
  const screens = Grid.useBreakpoint();
  const [editing, setEditing] = useState<WorkMaterial>();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const materialsQuery = useFormMaterials(open ? form?.formId : undefined, phase);
  const deleteMutation = useDeleteWorkMaterial();
  const isReport = phase === 'REPORT';
  const canEdit = form?.canEditNow ?? false;

  const openForm = (material?: WorkMaterial) => {
    setEditing(material);
    setIsFormOpen(true);
  };

  const confirmDelete = (material: WorkMaterial) =>
    modal.confirm({
      title: 'Xóa vật tư?',
      content: `"${material.materialName}" của ${material.workItemCode} sẽ bị xóa.`,
      okText: 'Xóa',
      okButtonProps: { danger: true },
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          await deleteMutation.mutateAsync({ id: material.id, phase });
          notify.success('Đã xóa vật tư.');
        } catch (error) {
          notify.apiError(error);
        }
      },
    });

  const columns: TableColumnsType<WorkMaterial> = [
    { title: 'Mã CV', dataIndex: 'workItemCode', key: 'workItemCode', width: 150, render: (value: string) => text(value) },
    { title: 'Mã VT', dataIndex: 'materialCode', key: 'materialCode', width: COLUMN_WIDTH.code, render: text },
    { title: 'Tên vật tư', dataIndex: 'materialName', key: 'materialName', width: COLUMN_WIDTH.text, render: text },
    { title: 'ĐVT', dataIndex: 'uom', key: 'uom', width: COLUMN_WIDTH.short, render: text },
    {
      title: 'SL KH',
      dataIndex: 'plannedQuantity',
      key: 'plannedQuantity',
      width: COLUMN_WIDTH.short,
      align: 'right',
      render: (value?: number | null) => formatNumber(value, 3),
    },
    ...(isReport
      ? ([
          {
            title: 'SL thực tế',
            key: 'actualQuantity',
            width: COLUMN_WIDTH.short,
            align: 'right',
            render: (_, material) =>
              material.actualQuantity === null || material.actualQuantity === undefined ? (
                <span className="text-text-secondary">{formatNumber(material.effectiveActualQuantity, 3)}</span>
              ) : (
                formatNumber(material.actualQuantity, 3)
              ),
          },
        ] satisfies TableColumnsType<WorkMaterial>)
      : []),
    {
      title: 'Ngày dùng',
      dataIndex: 'usageDate',
      key: 'usageDate',
      width: COLUMN_WIDTH.date,
      render: (value?: string | null) => formatDate(value),
    },
    { title: 'Mục đích', dataIndex: 'materialPurposeCode', key: 'purpose', width: COLUMN_WIDTH.short, render: text },
    { title: 'Ghi chú', dataIndex: 'note', key: 'note', width: COLUMN_WIDTH.text, render: text },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 100,
      align: 'center',
      fixed: 'right',
      render: (_, material) => {
        if (!canEdit) return null;
        const canDelete = isReport ? material.isUnplanned : !material.isUnplanned;
        const canModify = isReport || !material.isUnplanned;
        return (
          <div className="flex justify-center gap-1">
            {canModify && (
              <Tooltip title="Sửa">
                <Button
                  type="text"
                  aria-label={`Sửa vật tư ${material.materialName}`}
                  icon={<EditOutlined className="text-primary" />}
                  onClick={() => openForm(material)}
                />
              </Tooltip>
            )}
            {canDelete && (
              <Tooltip title="Xóa">
                <Button
                  type="text"
                  danger
                  aria-label={`Xóa vật tư ${material.materialName}`}
                  icon={<DeleteOutlined />}
                  onClick={() => confirmDelete(material)}
                />
              </Tooltip>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={form ? `Vật tư – ${form.orderLabel} ${form.unitName} (${PHASE_LABELS[phase]})` : 'Vật tư'}
      size={screens.lg ? 1100 : '100%'}
      destroyOnHidden
      extra={
        canEdit && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openForm()}>
            Thêm vật tư
          </Button>
        )
      }
    >
      {materialsQuery.isError && !materialsQuery.data ? (
        <ErrorState error={materialsQuery.error} onRetry={() => materialsQuery.refetch()} />
      ) : (
        <Table<WorkMaterial>
          rowKey="id"
          size="small"
          bordered
          loading={materialsQuery.isFetching}
          columns={columns}
          dataSource={materialsQuery.data ?? []}
          pagination={false}
          tableLayout="fixed"
          scroll={{ x: 'max-content' }}
          className="[&_.ant-table-cell]:whitespace-nowrap"
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={canEdit ? 'Chưa có vật tư. Bấm "Thêm vật tư" để gắn vật tư vào mã công việc.' : 'Chưa có vật tư.'}
              />
            ),
          }}
        />
      )}

      {form && (
        <MaterialFormModal
          open={isFormOpen}
          form={form}
          phase={phase}
          week={week}
          material={editing}
          onClose={() => setIsFormOpen(false)}
        />
      )}
    </Drawer>
  );
};
