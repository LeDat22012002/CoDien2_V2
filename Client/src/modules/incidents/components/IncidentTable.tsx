import { ExclamationCircleFilled } from '@ant-design/icons';
import { Empty, Grid, Pagination, Table, Tag, Tooltip, Typography, type TableColumnsType } from 'antd';
import { COLUMN_WIDTH, getTableScrollX } from '@/shared/constants/tableColumns';
import { useTableScrollY } from '@/shared/hooks/useTableScrollY';
import { EMPTY_TEXT, formatDateTime } from '@/shared/utils/format';
import { INCIDENT_PAGE_SIZE_OPTIONS, INCIDENT_TYPE_COLOR } from '@/modules/incidents/constants/incidentOptions';
import type { Incident } from '@/modules/incidents/types/incidents';
import { getIncidentWarnings } from '@/modules/incidents/utils/incidentWarnings';

interface IncidentTableProps {
  incidents: Incident[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  isLoading: boolean;
  onPageChange: (pageIndex: number, pageSize: number) => void;
}

/**
 * Báo cáo cần đọc thường xuyên nên hiện đầy đủ, không cắt "…" (ngoại lệ của quy tắc bảng 1 dòng):
 * chữ dài tự xuống dòng trong độ rộng cột, giữ xuống dòng người nhập gõ.
 */
const renderFullText = (value: string | null | undefined) =>
  value ? <div className="break-words whitespace-pre-wrap">{value}</div> : EMPTY_TEXT;

const renderDateTime = (value?: string | null) => formatDateTime(value);

/** Cột chữ dài (mô tả, phương án, phân tích…). */
const longTextColumn = (title: string, dataIndex: keyof Incident) => ({
  title,
  dataIndex,
  key: dataIndex,
  width: COLUMN_WIDTH.paragraph,
  render: renderFullText,
});

const dateTimeColumn = (title: string, dataIndex: keyof Incident) => ({
  title,
  dataIndex,
  key: dataIndex,
  width: COLUMN_WIDTH.dateTime,
  align: 'center' as const,
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
}: IncidentTableProps) => {
  const { containerRef, scrollY } = useTableScrollY();
  const screens = Grid.useBreakpoint();
  // Bảng rộng: chỉ ghim cột trái khi màn hình đủ rộng, điện thoại cuộn ngang cả bảng
  const fixedLeft = screens.md ? ('left' as const) : undefined;

  const columns: TableColumnsType<Incident> = [
    {
      title: 'STT',
      key: 'index',
      width: COLUMN_WIDTH.index,
      align: 'center',
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
                <ExclamationCircleFilled className="text-error" aria-label={warnings.join('. ')} />
              </Tooltip>
            )}
          </span>
        );
      },
    },
    {
      title: 'Kíp',
      dataIndex: 'shift',
      key: 'shift',
      width: COLUMN_WIDTH.short,
      align: 'center',
      fixed: fixedLeft,
    },
    {
      title: 'Xưởng',
      dataIndex: 'workshopName',
      key: 'workshopName',
      width: COLUMN_WIDTH.text,
      fixed: fixedLeft,
      render: renderFullText,
    },
    {
      title: 'Mã Equipment',
      dataIndex: 'equipmentCode',
      key: 'equipmentCode',
      width: COLUMN_WIDTH.tag,
      fixed: fixedLeft,
      render: (code: string) => <span className="font-medium">{renderFullText(code)}</span>,
    },
    {
      title: 'Name theo Equipment',
      dataIndex: 'equipmentName',
      key: 'equipmentName',
      width: COLUMN_WIDTH.text,
      render: renderFullText,
    },
    {
      title: 'Tên sự cố',
      dataIndex: 'deviceName',
      key: 'deviceName',
      width: COLUMN_WIDTH.text,
      render: renderFullText,
    },
    dateTimeColumn('Thời điểm nhận thông tin', 'receivedAt'),
    dateTimeColumn('Thời điểm bắt đầu sửa chữa', 'repairStartedAt'),
    dateTimeColumn('Thời điểm sửa chữa xong', 'repairFinishedAt'),
    dateTimeColumn('Thời điểm bàn giao', 'handedOverAt'),
    {
      title: 'Loại sự cố',
      dataIndex: 'incidentType',
      key: 'incidentType',
      width: COLUMN_WIDTH.tag,
      align: 'center',
      render: (type: string) =>
        type ? <Tag color={INCIDENT_TYPE_COLOR[type] ?? 'default'}>{type}</Tag> : EMPTY_TEXT,
    },
    {
      title: 'Gây dừng đến cấp',
      dataIndex: 'stopLevel',
      key: 'stopLevel',
      width: COLUMN_WIDTH.tag,
      render: renderFullText,
    },
    {
      title: <Tooltip title="Có gây dừng sản xuất / Ảnh hưởng đến sản lượng">Ảnh hưởng SX</Tooltip>,
      dataIndex: 'affectsProduction',
      key: 'affectsProduction',
      width: COLUMN_WIDTH.tag,
      align: 'center',
      render: (isAffected: boolean) => (
        <Tag color={isAffected ? 'red' : 'green'}>{isAffected ? 'Có' : 'Không'}</Tag>
      ),
    },
    longTextColumn('Mô tả sự cố - Phỏng đoán nguyên nhân', 'description'),
    longTextColumn('Phương án xử lý / Khắc phục tạm thời', 'solution'),
    longTextColumn('Nguyên nhân', 'cause'),
    longTextColumn('Nguyên nhân gốc sau phân tích', 'rootCause'),
    longTextColumn('Hành động', 'correctiveAction'),
    {
      title: 'Kết quả',
      dataIndex: 'result',
      key: 'result',
      width: COLUMN_WIDTH.short,
      align: 'right',
      render: (result?: number | null) => (result === null || result === undefined ? EMPTY_TEXT : `${result}%`),
    },
    {
      title: 'Số order',
      dataIndex: 'orderNumber',
      key: 'orderNumber',
      width: COLUMN_WIDTH.tag,
      render: renderFullText,
    },
    {
      title: 'Link biên bản sự cố',
      dataIndex: 'reportLink',
      key: 'reportLink',
      width: COLUMN_WIDTH.text,
      render: (link?: string | null) =>
        link ? (
          <Typography.Link href={link} target="_blank" rel="noopener noreferrer" className="break-all">
            {link}
          </Typography.Link>
        ) : (
          EMPTY_TEXT
        ),
    },
    longTextColumn('Ghi chú', 'note'),
  ];

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
          // Ô nhiều dòng: canh trên để đọc theo hàng dễ hơn
          className="[&_.ant-table-tbody_.ant-table-cell]:align-top"
          rowClassName={(incident) =>
            getIncidentWarnings(incident).length > 0 ? '[&>td]:bg-red-50 [&:hover>td]:bg-red-100' : ''
          }
          locale={{
            emptyText: (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có báo cáo sự cố nào phù hợp" />
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
