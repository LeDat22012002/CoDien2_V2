import { ExclamationCircleFilled } from "@ant-design/icons";
import {
  Empty,
  Grid,
  Pagination,
  Table,
  Tag,
  Tooltip,
  Typography,
  type TableColumnsType,
} from "antd";
import { COLUMN_WIDTH, getTableScrollX } from "@/shared/constants/tableColumns";
import { useTableScrollY } from "@/shared/hooks/useTableScrollY";
import { formatDateTime } from "@/shared/utils/format";
import {
  INCIDENT_PAGE_SIZE_OPTIONS,
  INCIDENT_TYPE_COLOR,
} from "@/modules/incidents/constants/incidentOptions";
import type { Incident } from "@/modules/incidents/types/incidents";
import { getIncidentWarnings } from "@/modules/incidents/utils/incidentWarnings";

interface IncidentTableProps {
  incidents: Incident[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  isLoading: boolean;
  onPageChange: (pageIndex: number, pageSize: number) => void;
  /** Cột thao tác thêm vào cuối bảng (trang cá nhân); bỏ trống = chỉ xem. */
  actionColumn?: TableColumnsType<Incident>[number];
}

/**
 * Báo cáo cần đọc thường xuyên nên hiện đầy đủ, không cắt "…" (ngoại lệ của quy tắc bảng 1 dòng):
 * chữ dài tự xuống dòng trong độ rộng cột, giữ xuống dòng người nhập gõ.
 * Bảng này để ô trống khi không có dữ liệu (không hiện "—").
 */
const renderFullText = (value: string | null | undefined) =>
  value ? (
    <div className="wrap-break-word whitespace-pre-wrap">{value}</div>
  ) : null;

const renderDateTime = (value?: string | null) =>
  value ? formatDateTime(value) : null;

/** Cột chữ dài (mô tả, phương án, phân tích, ghi chú…): canh trái cho dễ đọc đoạn văn. */
const longTextColumn = (title: string, dataIndex: keyof Incident) => ({
  title,
  dataIndex,
  key: dataIndex,
  width: COLUMN_WIDTH.paragraph,
  align: "left" as const,
  render: renderFullText,
});

/** Người phân tích / bổ sung: họ tên + mã NV, dòng dưới là thời điểm cập nhật gần nhất. */
// const renderActor = (
//   name?: string | null,
//   empCode?: string | null,
//   updatedAt?: string | null,
// ) =>
//   name ? (
//     <div className="flex flex-col">
//       <span className="wrap-break-word">{name}</span>
//       {empCode && <span className="text-text-secondary">{empCode}</span>}
//       {updatedAt && (
//         <span className="text-text-secondary">{formatDateTime(updatedAt)}</span>
//       )}
//     </div>
//   ) : null;

const dateTimeColumn = (title: string, dataIndex: keyof Incident) => ({
  title,
  dataIndex,
  key: dataIndex,
  width: COLUMN_WIDTH.dateTime,
  align: "center" as const,
  render: renderDateTime,
});

/**
 * Danh sách báo cáo sự cố, cột như hệ thống cũ. Báo cáo quá hạn bổ sung / phân tích tô nền đỏ nhạt,
 * icon cảnh báo cạnh STT (hover xem lý do). Nội dung hiện đầy đủ (dòng cao theo nội dung).
 * Bảng chiếm hết chiều cao khung cha, thân bảng cuộn bên trong.
 */
export const IncidentTable = ({
  incidents,
  totalCount,
  pageIndex,
  pageSize,
  isLoading,
  onPageChange,
  actionColumn,
}: IncidentTableProps) => {
  const { containerRef, scrollY } = useTableScrollY();
  const screens = Grid.useBreakpoint();
  // Bảng rộng: chỉ ghim cột trái khi màn hình đủ rộng, điện thoại cuộn ngang cả bảng
  const fixedLeft = screens.md ? ("left" as const) : undefined;

  const baseColumns: TableColumnsType<Incident> = [
    {
      title: "STT",
      key: "index",
      width: COLUMN_WIDTH.index,
      align: "center",
      fixed: fixedLeft,
      render: (_, incident, index) => {
        const warnings = getIncidentWarnings(incident);
        return (
          <span className="inline-flex items-center gap-1">
            {(pageIndex - 1) * pageSize + index + 1}
            {warnings.length > 0 && (
              <Tooltip
                title={
                  warnings.length === 1 ? (
                    warnings[0]
                  ) : (
                    <ul className="m-0 pl-4">
                      {warnings.map((warning) => (
                        <li key={warning}>{warning}</li>
                      ))}
                    </ul>
                  )
                }
              >
                <ExclamationCircleFilled
                  className="text-error"
                  aria-label={warnings.join(". ")}
                />
              </Tooltip>
            )}
          </span>
        );
      },
    },
    {
      title: "Kíp",
      dataIndex: "shift",
      key: "shift",
      width: COLUMN_WIDTH.short,
      align: "center",

      fixed: fixedLeft,
    },
    {
      title: "Xưởng",
      dataIndex: "workshopName",
      key: "workshopName",
      width: COLUMN_WIDTH.text,
      fixed: fixedLeft,
      render: renderFullText,
    },
    {
      title: "Mã Equipment",
      dataIndex: "equipmentCode",
      key: "equipmentCode",
      width: COLUMN_WIDTH.tag,
      fixed: fixedLeft,
      render: (code: string) => (
        <span className="font-medium">{renderFullText(code)}</span>
      ),
    },
    {
      title: "Name theo Equipment",
      dataIndex: "equipmentName",
      key: "equipmentName",
      width: COLUMN_WIDTH.text,
      render: renderFullText,
    },
    {
      title: "Tên sự cố",
      dataIndex: "deviceName",
      key: "deviceName",
      width: COLUMN_WIDTH.text,
      render: renderFullText,
    },
    dateTimeColumn("Thời điểm nhận thông tin", "receivedAt"),
    dateTimeColumn("Thời điểm bắt đầu sửa chữa", "repairStartedAt"),
    dateTimeColumn("Thời điểm sửa chữa xong", "repairFinishedAt"),
    dateTimeColumn("Thời điểm bàn giao", "handedOverAt"),
    {
      title: "Loại sự cố",
      dataIndex: "incidentType",
      key: "incidentType",
      width: COLUMN_WIDTH.tag,
      align: "center",
      render: (type: string) =>
        type ? (
          <Tag color={INCIDENT_TYPE_COLOR[type] ?? "default"}>{type}</Tag>
        ) : null,
    },
    {
      title: "Gây dừng đến cấp",
      dataIndex: "stopLevel",
      key: "stopLevel",
      width: COLUMN_WIDTH.tag,
      render: renderFullText,
    },
    {
      title: (
        <Tooltip title="Có gây dừng sản xuất / Ảnh hưởng đến sản lượng">
          Ảnh hưởng SX
        </Tooltip>
      ),
      dataIndex: "affectsProduction",
      key: "affectsProduction",
      width: COLUMN_WIDTH.tag,
      align: "center",
      render: (isAffected: boolean) => (
        <Tag color={isAffected ? "red" : "green"}>
          {isAffected ? "Có" : "Không"}
        </Tag>
      ),
    },
    longTextColumn("Mô tả sự cố - Phỏng đoán nguyên nhân", "description"),
    longTextColumn("Phương án xử lý / Khắc phục tạm thời", "solution"),
    longTextColumn("Nguyên nhân", "cause"),
    longTextColumn("Nguyên nhân gốc sau phân tích", "rootCause"),
    longTextColumn("Hành động", "correctiveAction"),
    // {
    //   title: "Người phân tích",
    //   key: "analyst",
    //   width: COLUMN_WIDTH.name,
    //   render: (_, incident) =>
    //     renderActor(incident.analystName, incident.analystEmpCode, incident.analyzedAt),
    // },
    {
      title: "Kết quả",
      dataIndex: "result",
      key: "result",
      width: COLUMN_WIDTH.short,
      align: "right",
      render: (result?: number | null) =>
        result === null || result === undefined ? null : `${result}%`,
    },
    {
      title: "Số order",
      dataIndex: "orderNumber",
      key: "orderNumber",
      width: COLUMN_WIDTH.tag,
      render: renderFullText,
    },
    {
      title: "Link biên bản/báo cáo sự cố (nếu có)",
      dataIndex: "reportLink",
      key: "reportLink",
      width: COLUMN_WIDTH.text,
      // Link thường rất dài: chỉ 1 dòng, cắt "…", hover xem đủ
      render: (link?: string | null) =>
        link ? (
          <Tooltip title={link}>
            <Typography.Link
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              ellipsis
              className="block"
            >
              {link}
            </Typography.Link>
          </Tooltip>
        ) : null,
    },
    // {
    //   title: "Người bổ sung",
    //   key: "supplementer",
    //   width: COLUMN_WIDTH.name,
    //   render: (_, incident) =>
    //     renderActor(
    //       incident.supplementerName,
    //       incident.supplementerEmpCode,
    //       incident.supplementedAt,
    //     ),
    // },
    longTextColumn("Ghi chú", "note"),
    ...(actionColumn ? [actionColumn] : []),
  ];
  // Canh giữa theo chiều ngang, trừ các cột chữ dài canh trái; chiều dọc luôn giữa (className của Table)
  const columns = baseColumns.map((column) => ({
    ...column,
    align: column.align === "left" ? ("left" as const) : ("center" as const),
  }));

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div ref={containerRef} className="min-h-72 flex-1 overflow-hidden">
        <Table<Incident>
          rowKey="id"
          size="small"
          bordered
          loading={isLoading}
          columns={columns}
          dataSource={incidents}
          pagination={false}
          tableLayout="fixed"
          scroll={{ x: getTableScrollX(columns, screens), y: scrollY }}
          className="[&_.ant-table-tbody_.ant-table-cell]:align-middle"
          rowClassName={(incident) =>
            getIncidentWarnings(incident).length > 0
              ? "[&>td]:bg-red-50 [&:hover>td]:bg-red-100"
              : ""
          }
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Không có báo cáo sự cố nào phù hợp"
              />
            ),
          }}
        />
      </div>

      <Pagination
        align="end"
        current={pageIndex}
        pageSize={pageSize}
        total={totalCount}
        showSizeChanger
        pageSizeOptions={INCIDENT_PAGE_SIZE_OPTIONS}
        showTotal={(total, [from, to]) => `${from}–${to} / ${total} báo cáo`}
        onChange={onPageChange}
      />
    </div>
  );
};
