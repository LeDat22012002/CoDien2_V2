import { Empty, Table, Typography, type TableColumnsType } from 'antd';
import { ErrorState } from '@/shared/components/ErrorState';
import { COLUMN_WIDTH } from '@/shared/constants/tableColumns';
import { EMPTY_TEXT, formatNumber } from '@/shared/utils/format';
import { FormStatusTag } from '@/modules/workReports/components/FormStatusTag';
import { useWorkReportSummary } from '@/modules/workReports/hooks/useWorkReportQueries';
import type { WorkReportFilter, WorkReportSummaryRow } from '@/modules/workReports/types/workReports';

interface WorkSummaryTableProps {
  filter: WorkReportFilter;
}

/**
 * Sheet Tổng hợp: mỗi tổ/kíp 1 dòng — phút công theo đầu mục, tổng, nhân lực quy đổi
 * (= tổng phút ÷ giờ công hiệu dụng/tuần), số đầu mã vật tư. Kế hoạch cộng giờ KH, báo cáo cộng giờ thực tế.
 */
export const WorkSummaryTable = ({ filter }: WorkSummaryTableProps) => {
  const summaryQuery = useWorkReportSummary(filter);
  const summary = summaryQuery.data;

  if (summaryQuery.isError && !summary) {
    return <ErrorState error={summaryQuery.error} onRetry={() => summaryQuery.refetch()} />;
  }

  const columns: TableColumnsType<WorkReportSummaryRow> = [
    { title: 'TT', dataIndex: 'orderLabel', key: 'orderLabel', width: COLUMN_WIDTH.index, align: 'center', fixed: 'left' },
    {
      title: 'Tổ/kíp',
      dataIndex: 'unitName',
      key: 'unitName',
      width: COLUMN_WIDTH.text,
      fixed: 'left',
      render: (value: string) => <Typography.Text ellipsis={{ tooltip: value }}>{value}</Typography.Text>,
    },
    {
      title: 'KTV phụ trách',
      dataIndex: 'engineerNames',
      key: 'engineerNames',
      width: COLUMN_WIDTH.name,
      responsive: ['md'],
      render: (value?: string | null) =>
        value ? <Typography.Text ellipsis={{ tooltip: value }}>{value}</Typography.Text> : EMPTY_TEXT,
    },
    {
      title: 'Số đầu mã VT',
      dataIndex: 'materialCodeCount',
      key: 'materialCodeCount',
      width: COLUMN_WIDTH.short,
      align: 'right',
      render: (value: number) => formatNumber(value),
    },
    ...(summary?.columns ?? []).map((category) => ({
      title: (
        <Typography.Text ellipsis={{ tooltip: category.name }} className="font-medium">
          {category.code}
        </Typography.Text>
      ),
      key: `category-${category.id}`,
      width: 110,
      align: 'right' as const,
      render: (_: unknown, row: WorkReportSummaryRow) => formatNumber(row.minutesByCategory[String(category.id)] ?? 0),
    })),
    {
      title: 'Tổng (phút)',
      dataIndex: 'totalMinutes',
      key: 'totalMinutes',
      width: COLUMN_WIDTH.number,
      align: 'right',
      render: (value: number) => <span className="font-semibold">{formatNumber(value)}</span>,
    },
    {
      title: 'Nhân lực quy đổi',
      dataIndex: 'manpower',
      key: 'manpower',
      width: COLUMN_WIDTH.number,
      align: 'right',
      render: (value: number, row) => (
        <Typography.Text title={row.capacityMinutes ? `Giờ công hiệu dụng: ${formatNumber(row.capacityMinutes, 2)} phút/tuần` : undefined}>
          {formatNumber(value, 2)}
        </Typography.Text>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: COLUMN_WIDTH.status,
      render: (value?: WorkReportSummaryRow['status']) => (value ? <FormStatusTag status={value} /> : null),
    },
  ];

  return (
    <div className="flex flex-col gap-2">
      {summary && (
        <Typography.Text strong className="text-center">
          {summary.title}
        </Typography.Text>
      )}
      <Table<WorkReportSummaryRow>
        rowKey={(row) => row.formId ?? 'total'}
        size="small"
        bordered
        loading={summaryQuery.isFetching}
        columns={columns}
        dataSource={summary?.rows ?? []}
        pagination={false}
        tableLayout="fixed"
        scroll={{ x: 'max-content' }}
        className="[&_.ant-table-cell]:whitespace-nowrap"
        locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có tổ/kíp nào trong tuần này" /> }}
        summary={() =>
          summary && summary.rows.length > 0 ? (
            <Table.Summary fixed="bottom">
              <Table.Summary.Row className="bg-bg-layout font-semibold">
                <Table.Summary.Cell index={0} colSpan={2}>
                  {summary.total.unitName}
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2} className="max-md:hidden" />
                <Table.Summary.Cell index={3} align="right">
                  {formatNumber(summary.total.materialCodeCount)}
                </Table.Summary.Cell>
                {summary.columns.map((category, index) => (
                  <Table.Summary.Cell key={category.id} index={4 + index} align="right">
                    {formatNumber(summary.total.minutesByCategory[String(category.id)] ?? 0)}
                  </Table.Summary.Cell>
                ))}
                <Table.Summary.Cell index={4 + summary.columns.length} align="right">
                  {formatNumber(summary.total.totalMinutes)}
                </Table.Summary.Cell>
                <Table.Summary.Cell index={5 + summary.columns.length} align="right">
                  {formatNumber(summary.total.manpower, 2)}
                </Table.Summary.Cell>
                <Table.Summary.Cell index={6 + summary.columns.length} />
              </Table.Summary.Row>
            </Table.Summary>
          ) : null
        }
      />
    </div>
  );
};
