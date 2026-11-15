import { Empty, Table, Typography, type TableColumnsType } from 'antd';
import { ErrorState } from '@/shared/components/ErrorState';
import { COLUMN_WIDTH } from '@/shared/constants/tableColumns';
import { EMPTY_TEXT, formatDate, formatNumber } from '@/shared/utils/format';
import { useWorkshopMaterials } from '@/modules/workReports/hooks/useWorkReportQueries';
import type { WorkMaterial, WorkReportFilter } from '@/modules/workReports/types/workReports';

interface WorkshopMaterialTableProps {
  filter: WorkReportFilter;
}

const text = (value?: string | null, className = '') =>
  value ? (
    <Typography.Text ellipsis={{ tooltip: value }} className={`block ${className}`}>
      {value}
    </Typography.Text>
  ) : (
    <span className="text-text-secondary">{EMPTY_TEXT}</span>
  );

/** Vật tư cả xưởng trong tuần (các tổ/kíp người dùng xem được), theo thứ tự tổ rồi mã công việc. */
export const WorkshopMaterialTable = ({ filter }: WorkshopMaterialTableProps) => {
  const materialsQuery = useWorkshopMaterials(filter);
  const isReport = filter.phase === 'REPORT';

  if (materialsQuery.isError && !materialsQuery.data) {
    return <ErrorState error={materialsQuery.error} onRetry={() => materialsQuery.refetch()} />;
  }

  const columns: TableColumnsType<WorkMaterial> = [
    { title: 'STT', key: 'index', width: COLUMN_WIDTH.index, align: 'center', render: (_, __, index) => index + 1 },
    { title: 'Tổ/kíp', dataIndex: 'unitName', key: 'unitName', width: COLUMN_WIDTH.text, render: (value: string) => text(value) },
    { title: 'Mã CV', dataIndex: 'workItemCode', key: 'workItemCode', width: 150, render: (value: string) => text(value, 'font-mono') },
    { title: 'Mã VT', dataIndex: 'materialCode', key: 'materialCode', width: COLUMN_WIDTH.code, render: (value?: string | null) => text(value, 'font-mono') },
    { title: 'Tên vật tư', dataIndex: 'materialName', key: 'materialName', width: COLUMN_WIDTH.longText, render: (value: string) => text(value) },
    { title: 'ĐVT', dataIndex: 'uom', key: 'uom', width: COLUMN_WIDTH.short, render: (value?: string | null) => text(value) },
    {
      title: isReport ? 'Số lượng thực tế' : 'Số lượng KH',
      key: 'quantity',
      width: COLUMN_WIDTH.number,
      align: 'right',
      render: (_, material) => formatNumber(isReport ? material.effectiveActualQuantity : material.plannedQuantity, 3),
    },
    { title: 'KTV', dataIndex: 'engineerNames', key: 'engineerNames', width: COLUMN_WIDTH.name, responsive: ['md'], render: (value?: string | null) => text(value) },
    { title: 'Ngày dùng', dataIndex: 'usageDate', key: 'usageDate', width: COLUMN_WIDTH.date, render: (value?: string | null) => formatDate(value) },
    { title: 'Mục đích', dataIndex: 'materialPurposeCode', key: 'purpose', width: COLUMN_WIDTH.short, render: (value?: string | null) => text(value) },
    { title: 'Ghi chú', dataIndex: 'note', key: 'note', width: COLUMN_WIDTH.text, responsive: ['lg'], render: (value?: string | null) => text(value) },
  ];

  return (
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
            description="Chưa có vật tư. Thêm vật tư ở nút “Vật tư” của từng tổ/kíp trong Bảng công việc."
          />
        ),
      }}
    />
  );
};
