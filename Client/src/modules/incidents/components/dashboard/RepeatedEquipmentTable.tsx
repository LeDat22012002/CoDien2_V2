import { Empty, Grid, Table, Tag, type TableColumnsType } from 'antd';
import { COLUMN_WIDTH, getTableScrollX } from '@/shared/constants/tableColumns';
import { EMPTY_TEXT, formatDateTime } from '@/shared/utils/format';
import type { RepeatedEquipment } from '@/modules/incidents/types/incidents';

interface RepeatedEquipmentTableProps {
  items: RepeatedEquipment[];
  isLoading: boolean;
}

const renderText = (value?: string | null) => value || EMPTY_TEXT;

const columns: TableColumnsType<RepeatedEquipment> = [
  {
    title: 'STT',
    key: 'index',
    width: COLUMN_WIDTH.index,
    align: 'center',
    render: (_, __, index) => index + 1,
  },
  {
    title: 'Mã Equipment',
    dataIndex: 'equipmentCode',
    key: 'equipmentCode',
    width: COLUMN_WIDTH.tag,
    render: (code: string) => <span className="font-medium">{code}</span>,
  },
  { title: 'Name theo Equipment', dataIndex: 'equipmentName', key: 'equipmentName', width: COLUMN_WIDTH.longText, render: renderText },
  { title: 'Tên sự cố', dataIndex: 'deviceName', key: 'deviceName', width: COLUMN_WIDTH.longText, render: renderText },
  { title: 'Xưởng', dataIndex: 'workshopName', key: 'workshopName', width: COLUMN_WIDTH.text, render: renderText },
  {
    title: 'Số lần sự cố',
    dataIndex: 'count',
    key: 'count',
    width: COLUMN_WIDTH.number,
    align: 'center',
    sorter: (a, b) => a.count - b.count,
    defaultSortOrder: 'descend',
    render: (count: number) => <Tag color="red">{count}</Tag>,
  },
  {
    title: 'Lần gần nhất',
    dataIndex: 'lastReportedAt',
    key: 'lastReportedAt',
    width: COLUMN_WIDTH.dateTime,
    align: 'center',
    render: (value?: string | null) => formatDateTime(value),
  },
];

/** Thiết bị xảy ra sự cố vượt ngưỡng trong năm; chữ hiện đầy đủ như bảng báo cáo. */
export const RepeatedEquipmentTable = ({ items, isLoading }: RepeatedEquipmentTableProps) => {
  const screens = Grid.useBreakpoint();
  return (
    <Table<RepeatedEquipment>
      rowKey={(item) => `${item.equipmentCode}-${item.workshopId ?? ''}`}
      size="small"
      bordered
      loading={isLoading}
      columns={columns}
      dataSource={items}
      tableLayout="fixed"
      scroll={{ x: getTableScrollX(columns, screens) }}
      pagination={{
        defaultPageSize: 20,
        showSizeChanger: true,
        hideOnSinglePage: true,
        showTotal: (total) => `Tổng ${total} thiết bị`,
      }}
      locale={{
        emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có thiết bị nào sự cố lặp lại" />,
      }}
    />
  );
};
