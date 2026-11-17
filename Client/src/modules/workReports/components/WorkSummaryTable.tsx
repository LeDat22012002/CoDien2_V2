import { Empty, Table, Typography, type TableColumnsType } from "antd";
import { ErrorState } from "@/shared/components/ErrorState";
import { COLUMN_WIDTH } from "@/shared/constants/tableColumns";
import { useTableScrollY } from "@/shared/hooks/useTableScrollY";
import { EMPTY_TEXT, formatNumber } from "@/shared/utils/format";
import { FormStatusTag } from "@/modules/workReports/components/FormStatusTag";
import { useWorkReportSummary } from "@/modules/workReports/hooks/useWorkReportQueries";
import type {
  WorkReportFilter,
  WorkReportSummaryRow,
} from "@/modules/workReports/types/workReports";

/** Cao dòng Tổng cộng (bảng size small): khi scroll.y, Table.Summary fixed nằm ngoài thân bảng nên trừ ra. */
const SUMMARY_ROW_HEIGHT = 40;

interface WorkSummaryTableProps {
  filter: WorkReportFilter;
}

/**
 * Sheet Tổng hợp: mỗi tổ/kíp 1 dòng — phút công theo đầu mục, tổng, nhân lực quy đổi
 * (= tổng phút ÷ giờ công hiệu dụng/tuần), số đầu mã vật tư. Kế hoạch cộng giờ KH, báo cáo cộng giờ thực tế.
 * Thân bảng cuộn bên trong khung (scroll.y): hàng tiêu đề cột đứng yên ở trên, dòng Tổng cộng ghim ở dưới.
 */
export const WorkSummaryTable = ({ filter }: WorkSummaryTableProps) => {
  const summaryQuery = useWorkReportSummary(filter);
  const summary = summaryQuery.data;
  // Thân bảng cao hết phần còn lại của tab (div bọc Table flex-1 trong nội dung tab)
  const { containerRef, scrollY } = useTableScrollY();
  const hasTotalRow = !!summary && summary.rows.length > 0;

  if (summaryQuery.isError && !summary) {
    return (
      <ErrorState
        error={summaryQuery.error}
        onRetry={() => summaryQuery.refetch()}
      />
    );
  }

  const columns: TableColumnsType<WorkReportSummaryRow> = [
    {
      title: "TT",
      dataIndex: "orderLabel",
      key: "orderLabel",
      width: COLUMN_WIDTH.index,
      align: "center",
      fixed: "left",
    },
    {
      title: "Tổ/kíp",
      dataIndex: "unitName",
      key: "unitName",
      width: COLUMN_WIDTH.text,
      fixed: "left",
      render: (value: string) => (
        <Typography.Text ellipsis={{ tooltip: value }}>{value}</Typography.Text>
      ),
    },
    {
      title: "KTV phụ trách",
      dataIndex: "engineerNames",
      key: "engineerNames",
      fixed: "left",
      width: COLUMN_WIDTH.name,
      responsive: ["md"],
      render: (value?: string | null) =>
        value ? (
          <Typography.Text ellipsis={{ tooltip: value }}>
            {value}
          </Typography.Text>
        ) : (
          EMPTY_TEXT
        ),
    },
    {
      title: "Số đầu mã VT",
      dataIndex: "materialCodeCount",
      key: "materialCodeCount",
      width: COLUMN_WIDTH.number,
      align: "center",
      render: (value: number) => formatNumber(value),
    },
    ...(summary?.columns ?? []).map((category) => ({
      title: (
        <Typography.Text
          ellipsis={{ tooltip: category.name }}
          className="font-medium"
        >
          {category.code}
        </Typography.Text>
      ),
      key: `category-${category.id}`,
      width: 110,
      align: "center" as const,
      render: (_: unknown, row: WorkReportSummaryRow) =>
        formatNumber(row.minutesByCategory[String(category.id)] ?? 0),
    })),
    {
      title: "Tổng (phút)",
      dataIndex: "totalMinutes",
      key: "totalMinutes",
      width: COLUMN_WIDTH.number,
      align: "center",
      render: (value: number) => (
        <span className="font-semibold">{formatNumber(value)}</span>
      ),
    },
    {
      title: "Nhân lực quy đổi",
      dataIndex: "manpower",
      key: "manpower",
      width: COLUMN_WIDTH.number,
      align: "center",
      render: (value: number, row) => (
        <Typography.Text
          title={
            row.capacityMinutes
              ? `Giờ công hiệu dụng: ${formatNumber(row.capacityMinutes, 2)} phút/tuần`
              : undefined
          }
        >
          {formatNumber(value, 2)}
        </Typography.Text>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 110,
      align: "center",
      render: (value?: WorkReportSummaryRow["status"]) =>
        value ? <FormStatusTag status={value} /> : null,
    },
  ];

  // scroll.y cần scroll.x là số cụ thể để cột tiêu đề và cột thân bảng khớp nhau
  const scrollX = columns.reduce(
    (total, column) =>
      total + (typeof column.width === "number" ? column.width : 0),
    0,
  );
  const bodyHeight =
    scrollY === undefined
      ? undefined
      : Math.max(scrollY - (hasTotalRow ? SUMMARY_ROW_HEIGHT : 0), 120);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      {summary && (
        <Typography.Text strong className="text-center">
          {summary.title}
        </Typography.Text>
      )}
      <div ref={containerRef} className="min-h-72 flex-1 overflow-hidden">
        <Table<WorkReportSummaryRow>
          rowKey={(row) => row.formId ?? "total"}
          size="small"
          bordered
          loading={summaryQuery.isFetching}
          columns={columns}
          dataSource={summary?.rows ?? []}
          pagination={false}
          tableLayout="fixed"
          scroll={{ x: scrollX, y: bodyHeight }}
          className="[&_.ant-table-cell]:whitespace-nowrap"
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Chưa có tổ/kíp nào trong tuần này"
              />
            ),
          }}
          summary={() =>
            summary && hasTotalRow ? (
              <Table.Summary fixed="bottom">
                <Table.Summary.Row className="bg-bg-layout font-semibold">
                  <Table.Summary.Cell index={0} colSpan={2}>
                    {summary.total.unitName}
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={2} className="max-md:hidden" />
                  <Table.Summary.Cell index={3} align="center">
                    {formatNumber(summary.total.materialCodeCount)}
                  </Table.Summary.Cell>
                  {summary.columns.map((category, index) => (
                    <Table.Summary.Cell
                      key={category.id}
                      index={4 + index}
                      align="center"
                    >
                      {formatNumber(
                        summary.total.minutesByCategory[String(category.id)] ??
                          0,
                      )}
                    </Table.Summary.Cell>
                  ))}
                  <Table.Summary.Cell
                    index={4 + summary.columns.length}
                    align="center"
                  >
                    {formatNumber(summary.total.totalMinutes)}
                  </Table.Summary.Cell>
                  <Table.Summary.Cell
                    index={5 + summary.columns.length}
                    align="center"
                  >
                    {formatNumber(summary.total.manpower, 2)}
                  </Table.Summary.Cell>
                  <Table.Summary.Cell
                    index={6 + summary.columns.length}
                    align="center"
                  />
                </Table.Summary.Row>
              </Table.Summary>
            ) : null
          }
        />
      </div>
    </div>
  );
};
