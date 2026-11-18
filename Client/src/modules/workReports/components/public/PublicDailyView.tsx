import { ReloadOutlined } from "@ant-design/icons";
import {
  Button,
  Card,
  DatePicker,
  Empty,
  Segmented,
  Select,
  Skeleton,
  Table,
  Tag,
  Tooltip,
  Typography,
  type TableColumnsType,
} from "antd";
import type { Dayjs } from "dayjs";
import { useState } from "react";
import { ErrorState } from "@/shared/components/ErrorState";
import dayjs from "@/shared/utils/dayjs";
import { EMPTY_TEXT, formatNumber } from "@/shared/utils/format";
import { WHOLE_UNIT_LABEL } from "@/modules/workReports/constants/workReportOptions";
import { usePublicDailyWork } from "@/modules/workReports/hooks/useWorkReportQueries";
import type {
  DailyUnit,
  DailyWorkshop,
  WorkItemBase,
  WorkPlanItem,
  WorkReportItem,
  WorkReportPhase,
} from "@/modules/workReports/types/workReports";
import {
  formatDateRange,
  wholeGroupLabel,
} from "@/modules/workReports/utils/workReportUtils";

type DailyItem = WorkPlanItem | WorkReportItem;

/** 1 dòng bảng: dòng công việc kèm tổ/kíp; rowSpan gộp ô tổ/kíp. */
interface DailyRow {
  key: number;
  unit: DailyUnit<DailyItem>;
  unitRowSpan: number;
  item: DailyItem;
}

const isReportItem = (item: DailyItem): item is WorkReportItem =>
  "effectiveActualMinutes" in item;

/** Người thực hiện: "Cả tổ" / "Cả tổ Lò cao 1, 2" hoặc tên từng người. */
const workersText = (item: WorkItemBase) => {
  if (!item.isWholeUnit)
    return item.workers.map((worker) => worker.displayName).join(", ");
  return item.wholeGroups.length > 0
    ? item.wholeGroups.map((group) => wholeGroupLabel(group.name)).join(", ")
    : WHOLE_UNIT_LABEL;
};

/** KTV của dòng; dòng cũ chưa lưu KTV theo dòng thì KTV của tổ/kíp. */
const engineersText = (item: WorkItemBase, unit: DailyUnit<DailyItem>) =>
  item.engineers.length > 0
    ? item.engineers.map((engineer) => engineer.fullName).join(", ")
    : (unit.engineerNames ?? "");

const toRows = (workshop: DailyWorkshop<DailyItem>): DailyRow[] =>
  workshop.units.flatMap((unit) =>
    unit.items.map((item, index) => ({
      key: item.id,
      unit,
      unitRowSpan: index === 0 ? unit.items.length : 0,
      item,
    })),
  );

const text = (value?: string | null) =>
  value ? (
    <span className="whitespace-pre-line">{value}</span>
  ) : (
    <span className="text-text-secondary">{EMPTY_TEXT}</span>
  );

const buildColumns = (
  phase: WorkReportPhase,
): TableColumnsType<DailyRow> => [
  {
    title: "Tổ/kíp",
    key: "unit",
    width: 180,
    onCell: (row) => ({ rowSpan: row.unitRowSpan }),
    render: (_, row) => (
      <Typography.Text strong>
        {row.unit.orderLabel}. {row.unit.unitName}
      </Typography.Text>
    ),
  },
  {
    title: "Mã công việc",
    key: "code",
    width: 150,
    render: (_, row) => (
      <div className="flex flex-col items-start gap-0.5">
        <span className="font-mono">{row.item.code}</span>
        {isReportItem(row.item) && row.item.isUnplanned && (
          <Tag color="orange" className="me-0">
            Phát sinh
          </Tag>
        )}
      </div>
    ),
  },
  {
    title: "Đầu mục",
    key: "category",
    width: 160,
    render: (_, row) =>
      text(`${row.item.groupLetter}. ${row.item.categoryName}`),
  },
  {
    title: "Thiết bị",
    key: "equipment",
    width: 180,
    render: (_, row) =>
      text(
        [row.item.equipmentCode, row.item.equipmentName]
          .filter(Boolean)
          .join(" – "),
      ),
  },
  {
    title: "Hạng mục công việc",
    key: "description",
    width: 300,
    render: (_, row) => text(row.item.description),
  },
  {
    title: "Thời gian",
    key: "dates",
    width: 120,
    render: (_, row) => formatDateRange(row.item.startDate, row.item.endDate),
  },
  {
    title: "Người thực hiện",
    key: "workers",
    width: 220,
    render: (_, row) => (
      <span>
        {text(workersText(row.item))}
        <Typography.Text type="secondary"> ({row.item.workerCount} người)</Typography.Text>
      </span>
    ),
  },
  {
    title: "KTV phụ trách",
    key: "engineers",
    width: 160,
    render: (_, row) => text(engineersText(row.item, row.unit)),
  },
  {
    title: "Giờ công KH (phút)",
    key: "planned",
    width: 110,
    align: "right",
    render: (_, row) => formatNumber(row.item.plannedMinutes, 2),
  },
  ...(phase === "REPORT"
    ? ([
        {
          title: "Giờ công TT (phút)",
          key: "actual",
          width: 110,
          align: "right",
          render: (_, row) =>
            isReportItem(row.item)
              ? formatNumber(row.item.effectiveActualMinutes, 2)
              : null,
        },
        {
          title: "% hoàn thành",
          key: "result",
          width: 100,
          align: "right",
          render: (_, row) =>
            isReportItem(row.item) && row.item.resultPercent != null
              ? `${formatNumber(row.item.resultPercent, 0)}%`
              : EMPTY_TEXT,
        },
      ] satisfies TableColumnsType<DailyRow>)
    : []),
  {
    title: "Ghi chú",
    key: "note",
    width: 180,
    render: (_, row) => text(row.item.note),
  },
];

const PHASE_TEXT: Record<WorkReportPhase, string> = {
  REPORT: "Báo cáo",
  PLAN: "Kế hoạch",
};

/**
 * Trang công khai, tab "Hôm nay": báo cáo của ngày đang chọn (mặc định hôm nay) và kế hoạch ngày kế tiếp
 * (mặc định ngày mai) của các xưởng công khai. Việc kéo dài nhiều ngày hiện ở mọi ngày trong khoảng làm.
 * Mỗi xưởng 1 khung, bảng gộp ô theo tổ/kíp.
 */
export const PublicDailyView = () => {
  const [date, setDate] = useState<Dayjs>(() => dayjs());
  const [phase, setPhase] = useState<WorkReportPhase>("REPORT");
  const [workshopId, setWorkshopId] = useState<number>();

  // Báo cáo: ngày đang chọn; kế hoạch: ngày kế tiếp
  const reportDate = date.format("YYYY-MM-DD");
  const planDate = date.add(1, "day").format("YYYY-MM-DD");
  const reportQuery = usePublicDailyWork("REPORT", reportDate);
  const planQuery = usePublicDailyWork("PLAN", planDate);
  const query = phase === "REPORT" ? reportQuery : planQuery;
  const isToday = date.isSame(dayjs(), "day");

  const countOf = (data?: { workshops: DailyWorkshop<DailyItem>[] }) =>
    data?.workshops.reduce((sum, workshop) => sum + workshop.itemCount, 0);
  const reportCount = countOf(reportQuery.data);
  const planCount = countOf(planQuery.data);

  const reportLabel = `${isToday ? "Báo cáo hôm nay" : "Báo cáo"} ${date.format("DD/MM")}`;
  const planLabel = `${isToday ? "Kế hoạch ngày mai" : "Kế hoạch"} ${date.add(1, "day").format("DD/MM")}`;

  const workshops = (query.data?.workshops ?? []) as DailyWorkshop<DailyItem>[];
  const visibleWorkshops = workshopId
    ? workshops.filter((workshop) => workshop.workshopId === workshopId)
    : workshops;
  const columns = buildColumns(phase);

  const renderContent = () => {
    if (query.isError && !query.data)
      return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
    if (!query.data) return <Skeleton active paragraph={{ rows: 8 }} />;
    if (!query.data.week)
      return (
        <Empty description="Chưa có kỳ tuần cho ngày này." className="py-10" />
      );
    return (
      <div className="flex flex-col gap-3">
        {visibleWorkshops.map((workshop) => (
          <Card
            key={workshop.workshopId}
            size="small"
            title={
              <span>
                {workshop.workshopName}
                <Typography.Text type="secondary" className="ms-2 font-normal">
                  · {workshop.itemCount} việc
                </Typography.Text>
              </span>
            }
          >
            {workshop.itemCount === 0 ? (
              <Typography.Text type="secondary">
                Không có việc {PHASE_TEXT[phase].toLowerCase()} trong ngày.
              </Typography.Text>
            ) : (
              <Table<DailyRow>
                rowKey="key"
                size="small"
                bordered
                columns={columns}
                dataSource={toRows(workshop)}
                pagination={false}
                tableLayout="fixed"
                scroll={{ x: "max-content" }}
              />
            )}
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md bg-bg-container px-3 py-2 md:px-4">
        <Segmented<WorkReportPhase>
          aria-label="Báo cáo hoặc kế hoạch"
          value={phase}
          onChange={setPhase}
          options={[
            {
              value: "REPORT",
              label: `${reportLabel}${reportCount !== undefined ? ` (${reportCount})` : ""}`,
            },
            {
              value: "PLAN",
              label: `${planLabel}${planCount !== undefined ? ` (${planCount})` : ""}`,
            },
          ]}
        />
        <DatePicker
          aria-label="Ngày báo cáo"
          value={date}
          onChange={(value) => setDate(value ?? dayjs())}
          format="DD/MM/YYYY"
          allowClear={false}
        />
        <Button disabled={isToday} onClick={() => setDate(dayjs())}>
          Hôm nay
        </Button>
        <Select
          aria-label="Lọc xưởng"
          allowClear
          placeholder="Tất cả xưởng"
          value={workshopId}
          onChange={setWorkshopId}
          options={workshops.map((workshop) => ({
            value: workshop.workshopId,
            label: workshop.workshopName,
          }))}
          className="w-full sm:w-72"
        />
        <Tooltip title="Tải lại">
          <Button
            aria-label="Tải lại"
            icon={<ReloadOutlined />}
            loading={query.isFetching}
            onClick={() => {
              reportQuery.refetch();
              planQuery.refetch();
            }}
          />
        </Tooltip>
      </div>
      {renderContent()}
    </div>
  );
};
